import crypto from 'node:crypto';
import { Router, type Request, type Response, type NextFunction } from 'express';

export interface WalletRecord {
  ownerUid: string;
  balance: number;
  lifetimeEarned: number;
  lifetimeRedeemed: number;
  pendingHold: number;
  lastLedgerSeq: number;
  status: 'active' | 'frozen';
  dailyEarnedDate: string;
  dailyEarnedCount: number;
}

export interface ServerLedgerEntry {
  eventKey: string;
  ownerUid: string;
  seq: number;
  type: 'migration_opening' | 'earn' | 'redeem_hold' | 'redeem_settled' | 'hold_release' | 'admin_adjust';
  source: string;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  note: string;
  partnerRef?: string;
  createdAt: number;
}

export interface WalletStoreAdapter {
  getFeatureFlags: () => Promise<{ serverWallet: boolean; myValueRedemption: boolean }>;
  getWallet: (uid: string) => Promise<WalletRecord>;
  getLedgerEntry: (uid: string, eventKey: string) => Promise<ServerLedgerEntry | null>;
  listLedger: (uid: string) => Promise<ServerLedgerEntry[]>;
  applyLedgerTransaction: (
    uid: string,
    eventKey: string,
    mutator: (wallet: WalletRecord) => { nextWallet: WalletRecord; entry: Omit<ServerLedgerEntry, 'eventKey' | 'ownerUid' | 'seq' | 'createdAt'> }
  ) => Promise<{ wallet: WalletRecord; entry: ServerLedgerEntry; idempotentReplay: boolean }>;
  freezeWallet: (uid: string, reason: string) => Promise<void>;
  hasProcessedWebhook: (eventId: string) => Promise<boolean>;
  markWebhookProcessed: (eventId: string, meta: Record<string, unknown>) => Promise<void>;
}

export interface WalletRouterDeps {
  requireAuth: (req: Request, res: Response, next: NextFunction) => void | Promise<void>;
  requireAdmin: (req: Request, res: Response, next: NextFunction) => void;
  store: WalletStoreAdapter;
  partnerWebhookSecret: () => string;
  maxDailyCoins?: number;
}

const VALID_EARN_SOURCES = new Set(['quest', 'workout', 'lesson', 'milestone', 'checkin', 'day_clear']);

export function verifyHmacSha256(secret: string, timestampSec: number, rawBody: string, headerSig: string, nowSec = Math.floor(Date.now() / 1000)): { ok: boolean; reason?: string } {
  if (!secret) return { ok: false, reason: 'WEBHOOK_SECRET_UNCONFIGURED' };
  if (!Number.isFinite(timestampSec) || Math.abs(nowSec - timestampSec) > 300) {
    return { ok: false, reason: 'TIMESTAMP_EXPIRED' };
  }
  const expected = `v1=${crypto.createHmac('sha256', secret).update(`${timestampSec}.${rawBody}`).digest('hex')}`;
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(headerSig.trim(), 'utf8');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return { ok: false, reason: 'INVALID_SIGNATURE' };
  }
  return { ok: true };
}

export function createWalletRouter(deps: WalletRouterDeps): Router {
  const router = Router();
  const maxDailyCoins = Math.max(1, deps.maxDailyCoins ?? 20);

  // 1. Server-Authoritative Idempotent Reward Claim (Stage 10)
  router.post('/claim-reward', deps.requireAuth, async (req: Request, res: Response) => {
    const user = (req as Request & { user?: { uid: string; email: string } }).user!;
    const body = (req.body || {}) as {
      source?: string;
      targetId?: string;
      dateKey?: string;
      note?: string;
    };

    const source = String(body.source || '').trim();
    const targetId = String(body.targetId || '').replace(/[^a-zA-Z0-9_:-]/g, '').slice(0, 80);
    const dateKey = String(body.dateKey || new Date().toISOString().slice(0, 10)).slice(0, 10);

    if (!VALID_EARN_SOURCES.has(source) || !targetId) {
      res.status(400).json({ error: { code: 'INVALID_REWARD_CLAIM', message: 'Valid source and targetId required.' } });
      return;
    }

    const eventKey = `earn:${source}:${user.uid}:${dateKey}:${targetId}`;
    const existing = await deps.store.getLedgerEntry(user.uid, eventKey);
    if (existing) {
      const currentWallet = await deps.store.getWallet(user.uid);
      res.status(200).json({
        ok: true,
        idempotentReplay: true,
        eventKey,
        balance: currentWallet.balance,
        ledgerSeq: existing.seq,
      });
      return;
    }

    const wallet = await deps.store.getWallet(user.uid);
    if (wallet.status === 'frozen') {
      res.status(403).json({ error: { code: 'WALLET_FROZEN', message: 'Wallet is temporarily frozen pending reconciliation.' } });
      return;
    }

    const earnedToday = wallet.dailyEarnedDate === dateKey ? wallet.dailyEarnedCount : 0;
    const rewardAmount = 1; // Server-authoritative 1-coin disciplined reward unit
    if (earnedToday + rewardAmount > maxDailyCoins) {
      res.status(429).json({
        error: { code: 'DAILY_EARN_CAP_REACHED', message: `Daily coin cap (${maxDailyCoins}) reached.` },
      });
      return;
    }

    const tx = await deps.store.applyLedgerTransaction(user.uid, eventKey, (w) => {
      const nextDaily = w.dailyEarnedDate === dateKey ? w.dailyEarnedCount + rewardAmount : rewardAmount;
      const nextBalance = w.balance + rewardAmount;
      return {
        nextWallet: {
          ...w,
          balance: nextBalance,
          lifetimeEarned: w.lifetimeEarned + rewardAmount,
          lastLedgerSeq: w.lastLedgerSeq + 1,
          dailyEarnedDate: dateKey,
          dailyEarnedCount: nextDaily,
        },
        entry: {
          type: 'earn',
          source,
          amount: rewardAmount,
          balanceBefore: w.balance,
          balanceAfter: nextBalance,
          note: String(body.note || `${source}:${targetId}`).slice(0, 240),
        },
      };
    });

    res.status(tx.idempotentReplay ? 200 : 201).json({
      ok: true,
      idempotentReplay: tx.idempotentReplay,
      eventKey,
      amount: rewardAmount,
      balance: tx.wallet.balance,
      ledgerSeq: tx.entry.seq,
    });
  });

  // 2. Balance Reconciliation & Auto-Freeze Audit Endpoint (Admin)
  router.post('/reconcile/:uid', deps.requireAuth, deps.requireAdmin, async (req: Request, res: Response) => {
    const targetUid = String(req.params.uid || '').trim();
    const wallet = await deps.store.getWallet(targetUid);
    const ledger = await deps.store.listLedger(targetUid);
    const sorted = [...ledger].sort((a, b) => a.seq - b.seq);

    let computedBal = 0;
    let computedHold = 0;
    let seqOk = true;
    for (let i = 0; i < sorted.length; i++) {
      const e = sorted[i];
      if (e.seq !== i + 1) seqOk = false;
      if (e.type === 'redeem_hold') {
        computedBal -= Math.abs(e.amount);
        computedHold += Math.abs(e.amount);
      } else if (e.type === 'redeem_settled') {
        computedHold -= Math.abs(e.amount);
      } else if (e.type === 'hold_release') {
        computedHold -= Math.abs(e.amount);
        computedBal += Math.abs(e.amount);
      } else {
        computedBal += e.amount;
      }
    }

    const balanceDrift = wallet.balance - computedBal;
    const holdDrift = wallet.pendingHold - computedHold;
    const ok = balanceDrift === 0 && holdDrift === 0 && seqOk && wallet.lastLedgerSeq === sorted.length;

    if (!ok) {
      await deps.store.freezeWallet(targetUid, `Reconciliation drift detected (balanceDrift=${balanceDrift}, holdDrift=${holdDrift})`);
    }

    res.json({
      ok,
      uid: targetUid,
      recordedBalance: wallet.balance,
      computedBalance: computedBal,
      recordedPendingHold: wallet.pendingHold,
      computedPendingHold: computedHold,
      balanceDrift,
      holdDrift,
      sequenceValid: seqOk,
      frozenTriggered: !ok,
    });
  });

  // 3. Two-Phase Partner Redemption (MyValue) — STRICTLY LOCKED behind feature flags!
  router.post('/redeem-partner', deps.requireAuth, async (req: Request, res: Response) => {
    const user = (req as Request & { user?: { uid: string; emailVerified: boolean } }).user!;
    const flags = await deps.store.getFeatureFlags();
    if (!flags.serverWallet || !flags.myValueRedemption) {
      res.status(403).json({
        error: {
          code: 'MONETARY_REDEMPTION_LOCKED',
          message: 'Monetary partner redemption is locked until Phase 5 security gates & operational sign-off pass.',
        },
      });
      return;
    }

    if (!user.emailVerified) {
      res.status(403).json({ error: { code: 'EMAIL_VERIFICATION_REQUIRED', message: 'Verify email before redeeming coins.' } });
      return;
    }

    const body = (req.body || {}) as { partnerId?: string; amount?: number; idempotencyKey?: string; rewardSku?: string };
    const partnerId = String(body.partnerId || 'myvalue').toLowerCase().replace(/[^a-z0-9_-]/g, '');
    const amount = Math.round(Number(body.amount) || 0);
    const reqKey = String(body.idempotencyKey || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64);

    if (amount < 1 || !reqKey) {
      res.status(400).json({ error: { code: 'INVALID_REDEMPTION', message: 'Positive amount and idempotencyKey required.' } });
      return;
    }

    const eventKey = `redeem:${partnerId}:${user.uid}:${reqKey}`;
    const existing = await deps.store.getLedgerEntry(user.uid, eventKey);
    if (existing) {
      const currentWallet = await deps.store.getWallet(user.uid);
      res.status(200).json({ ok: true, idempotentReplay: true, holdEventKey: eventKey, balance: currentWallet.balance, pendingHold: currentWallet.pendingHold });
      return;
    }

    const wallet = await deps.store.getWallet(user.uid);
    if (wallet.status === 'frozen') {
      res.status(403).json({ error: { code: 'WALLET_FROZEN', message: 'Wallet is frozen.' } });
      return;
    }
    if (wallet.balance < amount) {
      res.status(409).json({ error: { code: 'INSUFFICIENT_BALANCE', message: 'Insufficient coin balance.' } });
      return;
    }

    const tx = await deps.store.applyLedgerTransaction(user.uid, eventKey, (w) => ({
      nextWallet: {
        ...w,
        balance: w.balance - amount,
        pendingHold: w.pendingHold + amount,
        lastLedgerSeq: w.lastLedgerSeq + 1,
      },
      entry: {
        type: 'redeem_hold',
        source: 'partner',
        amount: -amount,
        balanceBefore: w.balance,
        balanceAfter: w.balance - amount,
        note: `Hold for ${partnerId} (${body.rewardSku || 'voucher'})`.slice(0, 240),
        partnerRef: reqKey,
      },
    }));

    res.status(202).json({
      ok: true,
      status: 'pending_partner_settlement',
      holdEventKey: eventKey,
      balance: tx.wallet.balance,
      pendingHold: tx.wallet.pendingHold,
    });
  });

  // 4. Verified Partner Settlement / Hold-Release Webhook (HMAC-SHA256 + Replay Guard)
  router.post('/webhooks/partner/myvalue', async (req: Request, res: Response) => {
    const rawBody = (req as Request & { rawBody?: string }).rawBody ?? JSON.stringify(req.body || {});
    const ts = Number(req.headers['x-socio-timestamp'] || 0);
    const sig = String(req.headers['x-socio-signature'] || '');
    const verified = verifyHmacSha256(deps.partnerWebhookSecret(), ts, rawBody, sig);
    if (!verified.ok) {
      res.status(401).json({ error: { code: verified.reason, message: 'Webhook signature verification failed.' } });
      return;
    }

    const body = (req.body || {}) as {
      eventId?: string;
      uid?: string;
      partnerTxId?: string;
      amount?: number;
      status?: 'settled' | 'failed';
    };
    const eventId = String(body.eventId || '').trim();
    const uid = String(body.uid || '').trim();
    const amount = Math.round(Number(body.amount) || 0);
    if (!eventId || !uid || amount < 1 || (body.status !== 'settled' && body.status !== 'failed')) {
      res.status(400).json({ error: { code: 'INVALID_WEBHOOK_PAYLOAD', message: 'Missing required webhook fields.' } });
      return;
    }

    if (await deps.store.hasProcessedWebhook(eventId)) {
      res.status(200).json({ ok: true, idempotentReplay: true, eventId });
      return;
    }

    const ledgerKey = `partner:myvalue:${eventId}`;
    const isSettled = body.status === 'settled';
    const tx = await deps.store.applyLedgerTransaction(uid, ledgerKey, (w) => {
      const holdDeduction = Math.min(w.pendingHold, amount);
      return {
        nextWallet: {
          ...w,
          balance: isSettled ? w.balance : w.balance + holdDeduction,
          pendingHold: w.pendingHold - holdDeduction,
          lifetimeRedeemed: isSettled ? w.lifetimeRedeemed + holdDeduction : w.lifetimeRedeemed,
          lastLedgerSeq: w.lastLedgerSeq + 1,
        },
        entry: {
          type: isSettled ? 'redeem_settled' : 'hold_release',
          source: 'partner',
          amount: isSettled ? -holdDeduction : holdDeduction,
          balanceBefore: w.balance,
          balanceAfter: isSettled ? w.balance : w.balance + holdDeduction,
          note: isSettled ? `Partner settled ${body.partnerTxId || eventId}` : `Partner hold released ${body.partnerTxId || eventId}`,
          partnerRef: String(body.partnerTxId || eventId).slice(0, 120),
        },
      };
    });

    await deps.store.markWebhookProcessed(eventId, { type: 'partner_myvalue', uid, status: body.status });
    res.status(200).json({ ok: true, status: body.status, balance: tx.wallet.balance, pendingHold: tx.wallet.pendingHold });
  });

  return router;
}
