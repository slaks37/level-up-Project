import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import type { AddressInfo } from 'node:net';
import express, { type Request, type Response, type NextFunction } from 'express';
import { createAgnesV2Router, isAllowedUpstreamAiUrl } from './agnesV2Router.js';
import { createWalletRouter, type ServerLedgerEntry, type WalletRecord, type WalletStoreAdapter } from './walletRouter.js';
import { createEcosystemRouter, type EcosystemStoreAdapter } from './ecosystemRouter.js';

function sign(secret: string, ts: number, raw: string): string {
  return `v1=${crypto.createHmac('sha256', secret).update(`${ts}.${raw}`).digest('hex')}`;
}

async function startTestServer() {
  const app = express();
  app.use(
    express.json({
      verify: (req, _res, buf) => {
        (req as Request & { rawBody?: string }).rawBody = buf.toString('utf8');
      },
    })
  );

  let consent = { sharePrivateJournalWithAgnes: false, shareHealthMetricsWithAgnes: false };
  let flags = { serverWallet: false, myValueRedemption: false };
  let lastUpstreamPrompt = '';

  const wallets = new Map<string, WalletRecord>();
  const ledgers = new Map<string, ServerLedgerEntry[]>();
  const processedWebhooks = new Set<string>();
  const defaultWallet = (uid: string): WalletRecord => ({
    ownerUid: uid,
    balance: 0,
    lifetimeEarned: 0,
    lifetimeRedeemed: 0,
    pendingHold: 0,
    lastLedgerSeq: 0,
    status: 'active',
    dailyEarnedDate: '',
    dailyEarnedCount: 0,
  });

  const walletStore: WalletStoreAdapter = {
    getFeatureFlags: async () => ({ ...flags }),
    getWallet: async (uid) => wallets.get(uid) || defaultWallet(uid),
    getLedgerEntry: async (uid, key) => (ledgers.get(uid) || []).find((e) => e.eventKey === key) || null,
    listLedger: async (uid) => [...(ledgers.get(uid) || [])],
    applyLedgerTransaction: async (uid, key, mutator) => {
      const list = ledgers.get(uid) || [];
      const existing = list.find((e) => e.eventKey === key);
      const cur = wallets.get(uid) || defaultWallet(uid);
      if (existing) return { wallet: cur, entry: existing, idempotentReplay: true };
      const { nextWallet, entry } = mutator(cur);
      const full: ServerLedgerEntry = { ...entry, eventKey: key, ownerUid: uid, seq: nextWallet.lastLedgerSeq, createdAt: Date.now() };
      wallets.set(uid, nextWallet);
      ledgers.set(uid, [...list, full]);
      return { wallet: nextWallet, entry: full, idempotentReplay: false };
    },
    freezeWallet: async (uid) => {
      const cur = wallets.get(uid) || defaultWallet(uid);
      wallets.set(uid, { ...cur, status: 'frozen' });
    },
    hasProcessedWebhook: async (id) => processedWebhooks.has(id),
    markWebhookProcessed: async (id) => {
      processedWebhooks.add(id);
    },
  };

  const ecoEvents = new Map<string, Record<string, unknown>>();
  const enrollments = new Map<string, Record<string, unknown>>();
  const feedbackLogs: Array<Record<string, unknown>> = [];
  const ecosystemStore: EcosystemStoreAdapter = {
    getProcessedEvent: async (k) => ecoEvents.get(k) || null,
    saveProcessedEvent: async (k, payload) => {
      ecoEvents.set(k, payload);
    },
    findUidByVerifiedEmail: async (email) => (email === 'budi@example.com' ? 'uid_budi' : null),
    activateCourseEnrollment: async ({ uid, courseId, externalOrderId }) => {
      const enrollmentId = `${uid}_${courseId}`;
      enrollments.set(enrollmentId, { uid, courseId, externalOrderId, status: 'active' });
      return { enrollmentId };
    },
    savePendingEmailEnrollment: async ({ emailHash, courseId, externalOrderId }) => {
      const pendingId = `${emailHash.slice(0, 12)}_${courseId}`;
      enrollments.set(pendingId, { status: 'pending', externalOrderId });
      return { pendingId };
    },
    revokeCourseEnrollment: async ({ uid, emailHash, courseId, revokeCertificate }) => {
      const id = uid ? `${uid}_${courseId}` : `${emailHash.slice(0, 12)}_${courseId}`;
      const prev = enrollments.get(id);
      enrollments.set(id, { ...(prev || {}), status: 'revoked_refund' });
      return { enrollmentId: id, previousStatus: String(prev?.status || 'active'), certificateRevoked: revokeCertificate };
    },
    updateVentureMarketplaceStatus: async () => ({ updated: true }),
    recordMarketplaceFeedback: async (fb) => {
      feedbackLogs.push(fb);
    },
    getCohortImpactAggregate: async (cohortId) =>
      cohortId === 'coh_small'
        ? { activeParticipants: 3, verifiedCompetenciesAwarded: 4, certificatesIssued: 1, venturesByStage: {} as Record<string, number>, marketplaceListedProducts: 1, householdsBenefited: 5, jobsSustained: 1 }
        : cohortId === 'coh_batch4'
          ? { activeParticipants: 32, verifiedCompetenciesAwarded: 80, certificatesIssued: 25, venturesByStage: { launch: 10 } as Record<string, number>, marketplaceListedProducts: 8, householdsBenefited: 140, jobsSustained: 34 }
          : null,
  };

  const fakeAuth = (req: Request, _res: Response, next: NextFunction) => {
    const role = String(req.headers['x-test-role'] || 'user');
    (req as Request & { user?: { uid: string; email: string; emailVerified: boolean; isAdmin: boolean } }).user = {
      uid: String(req.headers['x-test-uid'] || 'uid_budi'),
      email: 'budi@example.com',
      emailVerified: true,
      isAdmin: role === 'admin',
    };
    next();
  };
  const fakeAdmin = (req: Request, res: Response, next: NextFunction) => {
    if (!(req as Request & { user?: { isAdmin: boolean } }).user?.isAdmin) {
      res.status(403).json({ error: 'Admin required' });
      return;
    }
    next();
  };

  app.use(
    '/v1/ai',
    createAgnesV2Router({
      requireAuth: fakeAuth,
      getPrivacyConsent: async () => ({ ...consent }),
      getAiConfig: async () => ({ baseUrl: 'https://apihub.agnes-ai.com/v1', model: 'agnes-3.0-flash', apiKey: 'test_key', enabled: true, dailyLimit: 20 }),
      consumeQuota: async () => ({ allowed: true, usedToday: 1, dailyLimit: 20 }),
      recordAudit: async () => {},
      callUpstream: async (_ep, _key, _model, _sys, userPrompt) => {
        lastUpstreamPrompt = userPrompt;
        return 'Mock Agnes reply';
      },
    })
  );

  app.use(
    '/v1/wallet',
    createWalletRouter({
      requireAuth: fakeAuth,
      requireAdmin: fakeAdmin,
      store: walletStore,
      partnerWebhookSecret: () => 'partner_secret_123',
      maxDailyCoins: 2,
    })
  );

  app.use(
    '/v1/integrations',
    createEcosystemRouter({
      requireAuth: fakeAuth,
      ecosystemSharedSecret: () => 'eco_secret_456',
      store: ecosystemStore,
    })
  );

  const server = await new Promise<ReturnType<typeof app.listen>>((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

  return {
    baseUrl,
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
    setConsent: (c: typeof consent) => { consent = c; },
    setFlags: (f: typeof flags) => { flags = f; },
    getLastUpstreamPrompt: () => lastUpstreamPrompt,
    tamperWalletBalance: (uid: string, balance: number) => {
      const cur = wallets.get(uid) || defaultWallet(uid);
      wallets.set(uid, { ...cur, balance });
    },
    getWalletDirect: (uid: string) => wallets.get(uid),
    feedbackLogs,
  };
}

test('Stage 9: Agnes AI 2.0 enforces SSRF allowlist, PII redaction, and server-side privacy boundaries', async () => {
  assert.equal(isAllowedUpstreamAiUrl('https://apihub.agnes-ai.com/v1'), true);
  assert.equal(isAllowedUpstreamAiUrl('http://169.254.169.254/latest/meta-data'), false);
  assert.equal(isAllowedUpstreamAiUrl('http://localhost:8787'), false);

  const srv = await startTestServer();
  try {
    const res1 = await fetch(`${srv.baseUrl}/v1/ai/assist`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'wellness_companion',
        prompt: 'Hubungi 081234567890 atau budi@example.com',
        context: {
          goal: 'Sehat',
          profession: 'Founder',
          privateJournalNotes: ['RAHASIA_JURNAL_PRIBADI'],
          healthMetrics: { sleepHours: 4.5 },
        },
      }),
    });
    assert.equal(res1.status, 200);
    const data1 = (await res1.json()) as { origin: string; authoritative: boolean; boundaries: { journalIncluded: boolean; healthIncluded: boolean } };
    assert.equal(data1.origin, 'ai_assumption');
    assert.equal(data1.authoritative, false);
    assert.equal(data1.boundaries.journalIncluded, false);
    assert.equal(data1.boundaries.healthIncluded, false);
    assert.equal(srv.getLastUpstreamPrompt().includes('RAHASIA_JURNAL_PRIBADI'), false);
    assert.equal(srv.getLastUpstreamPrompt().includes('081234567890'), false);

    // Even when user enables consent, business_mentor MUST NEVER receive private journal or health metrics
    srv.setConsent({ sharePrivateJournalWithAgnes: true, shareHealthMetricsWithAgnes: true });
    const res2 = await fetch(`${srv.baseUrl}/v1/ai/assist`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'business_mentor',
        prompt: 'Cek BMC',
        context: { goal: 'Kopi', profession: 'Founder', privateJournalNotes: ['RAHASIA_JURNAL_PRIBADI'], healthMetrics: { sleepHours: 4.5 } },
      }),
    });
    const data2 = (await res2.json()) as { boundaries: { journalIncluded: boolean; healthIncluded: boolean } };
    assert.equal(data2.boundaries.journalIncluded, false);
    assert.equal(data2.boundaries.healthIncluded, false);
  } finally {
    await srv.close();
  }
});

test('Stage 10: Server Wallet enforces idempotency, daily cap, locked MyValue gate, HMAC settlement & reconciliation freeze', async () => {
  const srv = await startTestServer();
  try {
    // 1. Idempotent claim: 2 identical calls only mint ONCE
    const claimBody = JSON.stringify({ source: 'quest', targetId: 'q_1', dateKey: '2026-11-27' });
    const c1 = await fetch(`${srv.baseUrl}/v1/wallet/claim-reward`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: claimBody });
    const c2 = await fetch(`${srv.baseUrl}/v1/wallet/claim-reward`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: claimBody });
    assert.equal(c1.status, 201);
    assert.equal(c2.status, 200);
    const d2 = (await c2.json()) as { balance: number; idempotentReplay: boolean };
    assert.equal(d2.idempotentReplay, true);
    assert.equal(d2.balance, 1);

    // 2. Daily cap enforcement (maxDailyCoins = 2)
    const c3 = await fetch(`${srv.baseUrl}/v1/wallet/claim-reward`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source: 'workout', targetId: 'w_1', dateKey: '2026-11-27' }),
    });
    assert.equal(c3.status, 201);
    const c4 = await fetch(`${srv.baseUrl}/v1/wallet/claim-reward`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source: 'lesson', targetId: 'l_1', dateKey: '2026-11-27' }),
    });
    assert.equal(c4.status, 429);

    // 3. Monetary MyValue redemption MUST be 403 LOCKED by default
    const lockedRes = await fetch(`${srv.baseUrl}/v1/wallet/redeem-partner`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ partnerId: 'myvalue', amount: 1, idempotencyKey: 'red_1' }),
    });
    assert.equal(lockedRes.status, 403);

    // 4. Enable both flags -> two-phase hold -> signed webhook settles hold cleanly
    srv.setFlags({ serverWallet: true, myValueRedemption: true });
    const holdRes = await fetch(`${srv.baseUrl}/v1/wallet/redeem-partner`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ partnerId: 'myvalue', amount: 1, idempotencyKey: 'red_1' }),
    });
    assert.equal(holdRes.status, 202);
    const holdData = (await holdRes.json()) as { balance: number; pendingHold: number };
    assert.equal(holdData.balance, 1);
    assert.equal(holdData.pendingHold, 1);

    const whBody = JSON.stringify({ eventId: 'mv_evt_1', uid: 'uid_budi', partnerTxId: 'MV-99', amount: 1, status: 'settled' });
    const ts = Math.floor(Date.now() / 1000);
    const badWh = await fetch(`${srv.baseUrl}/v1/wallet/webhooks/partner/myvalue`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-socio-timestamp': String(ts), 'x-socio-signature': 'v1=bad' },
      body: whBody,
    });
    assert.equal(badWh.status, 401);

    const okWh = await fetch(`${srv.baseUrl}/v1/wallet/webhooks/partner/myvalue`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-socio-timestamp': String(ts), 'x-socio-signature': sign('partner_secret_123', ts, whBody) },
      body: whBody,
    });
    assert.equal(okWh.status, 200);
    assert.equal(((await okWh.json()) as { pendingHold: number }).pendingHold, 0);

    // 5. Reconciliation passes when clean, then detects tampered balance & auto-freezes wallet!
    const recOk = await fetch(`${srv.baseUrl}/v1/wallet/reconcile/uid_budi`, {
      method: 'POST',
      headers: { 'x-test-role': 'admin' },
    });
    assert.equal(((await recOk.json()) as { ok: boolean }).ok, true);

    srv.tamperWalletBalance('uid_budi', 999);
    const recDrift = await fetch(`${srv.baseUrl}/v1/wallet/reconcile/uid_budi`, {
      method: 'POST',
      headers: { 'x-test-role': 'admin' },
    });
    const driftData = (await recDrift.json()) as { ok: boolean; frozenTriggered: boolean };
    assert.equal(driftData.ok, false);
    assert.equal(driftData.frozenTriggered, true);
    assert.equal(srv.getWalletDirect('uid_budi')?.status, 'frozen');
  } finally {
    await srv.close();
  }
});

test('Stage 11: All 5 Ecosystem Integration Contracts verify HMAC, replay, idempotency, privacy firewall & k-anonymity', async () => {
  const srv = await startTestServer();
  const secret = 'eco_secret_456';
  const ts = Math.floor(Date.now() / 1000);

  try {
    // Contract 1: Verified Course Purchase -> Enrollment + Idempotent replay
    const enrollBody = JSON.stringify({
      eventId: 'evt_ord_1',
      externalOrderId: 'SO-2026-100',
      buyer: { email: 'budi@example.com', displayName: 'Budi' },
      course: { levelupCourseId: 'crs_export_legal_03', cohortId: 'coh_batch4' },
    });
    const e1 = await fetch(`${srv.baseUrl}/v1/integrations/enrollments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-socio-client': 'sociopreneur-web',
        'x-socio-timestamp': String(ts),
        'x-socio-idempotency-key': 'enroll:SO-2026-100:crs_export_legal_03',
        'x-socio-signature': sign(secret, ts, enrollBody),
      },
      body: enrollBody,
    });
    assert.equal(e1.status, 201);
    assert.equal(((await e1.json()) as { status: string }).status, 'enrolled');

    const eReplay = await fetch(`${srv.baseUrl}/v1/integrations/enrollments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-socio-client': 'sociopreneur-web',
        'x-socio-timestamp': String(ts),
        'x-socio-idempotency-key': 'enroll:SO-2026-100:crs_export_legal_03',
        'x-socio-signature': sign(secret, ts, enrollBody),
      },
      body: enrollBody,
    });
    assert.equal(eReplay.status, 200);
    assert.equal(((await eReplay.json()) as { idempotentReplay: boolean }).idempotentReplay, true);

    // Contract 2: Refund & Access Revocation (preserves personal data)
    const revBody = JSON.stringify({
      eventId: 'evt_ref_1',
      externalOrderId: 'SO-2026-100',
      externalRefundId: 'REF-1',
      levelupCourseId: 'crs_export_legal_03',
      buyerEmail: 'budi@example.com',
      revokeCertificate: true,
    });
    const revRes = await fetch(`${srv.baseUrl}/v1/integrations/enrollments/revoke`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-socio-client': 'sociopreneur-web',
        'x-socio-timestamp': String(ts),
        'x-socio-idempotency-key': 'revoke:SO-2026-100',
        'x-socio-signature': sign(secret, ts, revBody),
      },
      body: revBody,
    });
    assert.equal(revRes.status, 200);
    const revJson = (await revRes.json()) as { status: string; personalDataPreserved: boolean };
    assert.equal(revJson.status, 'revoked');
    assert.equal(revJson.personalDataPreserved, true);

    // Contract 3: Product submission (requires explicit consent) & inbound status callback
    const prodSub = await fetch(`${srv.baseUrl}/v1/integrations/products/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        venture: { levelupVentureId: 'vnt_882', businessName: 'Kopi Lestari' },
        product: { title: 'Kopi Garut 250g', suggestedRetailPriceIdr: 85000 },
        consentRecord: { founderConsentedAt: new Date().toISOString(), consentVersion: 'marketplace_publish_v1' },
      }),
    });
    assert.equal(prodSub.status, 202);

    const prodStatusBody = JSON.stringify({ submissionId: 'sub_1', levelupVentureId: 'vnt_882', status: 'approved' });
    const prodStatusRes = await fetch(`${srv.baseUrl}/v1/integrations/products/status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-socio-client': 'sociopreneur-web',
        'x-socio-timestamp': String(ts),
        'x-socio-idempotency-key': 'prod_status:sub_1:approved',
        'x-socio-signature': sign(secret, ts, prodStatusBody),
      },
      body: prodStatusBody,
    });
    assert.equal(prodStatusRes.status, 200);
    assert.equal(((await prodStatusRes.json()) as { milestoneEvidenceEligible: boolean }).milestoneEvidenceEligible, true);

    // Contract 4: Marketplace order feedback REJECTS buyer PII & ACCEPTS clean validated_evidence
    const piiBody = JSON.stringify({ eventId: 'ord_bad', levelupVentureId: 'vnt_882', periodKey: '2026-12', buyerPhone: '0812', metrics: { unitsSold: 2, grossRevenueIdr: 170000 } });
    const piiRes = await fetch(`${srv.baseUrl}/v1/integrations/marketplace/orders/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-socio-client': 'sociopreneur-web',
        'x-socio-timestamp': String(ts),
        'x-socio-idempotency-key': 'ord_bad',
        'x-socio-signature': sign(secret, ts, piiBody),
      },
      body: piiBody,
    });
    assert.equal(piiRes.status, 400);

    const cleanOrderBody = JSON.stringify({ eventId: 'ord_ok_1', levelupVentureId: 'vnt_882', periodKey: '2026-12', metrics: { unitsSold: 12, grossRevenueIdr: 1020000, isRepeatCustomer: true } });
    const cleanOrderRes = await fetch(`${srv.baseUrl}/v1/integrations/marketplace/orders/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-socio-client': 'sociopreneur-web',
        'x-socio-timestamp': String(ts),
        'x-socio-idempotency-key': 'ord_ok_1',
        'x-socio-signature': sign(secret, ts, cleanOrderBody),
      },
      body: cleanOrderBody,
    });
    assert.equal(cleanOrderRes.status, 200);
    assert.equal(srv.feedbackLogs.length, 1);

    // Contract 5: Impact telemetry enforces k-anonymity (k >= 5) and excludes private journals
    const smallUrl = '/v1/integrations/impact/summary?id=coh_small&period=2026-12';
    const smallRes = await fetch(`${srv.baseUrl}${smallUrl}`, {
      headers: { 'x-socio-client': 'socioline-platform', 'x-socio-timestamp': String(ts), 'x-socio-signature': sign(secret, ts, smallUrl) },
    });
    assert.equal(smallRes.status, 403);

    const batchUrl = '/v1/integrations/impact/summary?id=coh_batch4&period=2026-12';
    const batchRes = await fetch(`${srv.baseUrl}${batchUrl}`, {
      headers: { 'x-socio-client': 'socioline-platform', 'x-socio-timestamp': String(ts), 'x-socio-signature': sign(secret, ts, batchUrl) },
    });
    assert.equal(batchRes.status, 200);
    const batchJson = (await batchRes.json()) as { dataProvenance: { excludesPrivateJournals: boolean; validatedEvidenceOnly: boolean } };
    assert.equal(batchJson.dataProvenance.excludesPrivateJournals, true);
    assert.equal(batchJson.dataProvenance.validatedEvidenceOnly, true);
  } finally {
    await srv.close();
  }
});
