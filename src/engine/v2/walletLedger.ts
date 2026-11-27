/**
 * Server-Authoritative Coin Economy Ledger & Reconciliation Primitives (Stage 10).
 * Pure deterministic utilities shared between client display checks, tests,
 * and future unified server runtime (Cloud Run / Functions v2).
 */

export type WalletLedgerType =
  | 'migration_opening'
  | 'earn'
  | 'redeem_hold'
  | 'redeem_settled'
  | 'hold_release'
  | 'admin_adjust'
  | 'reversal';

export interface WalletLedgerEntry {
  eventKey: string;
  ownerUid: string;
  seq: number;
  type: WalletLedgerType;
  source: string;
  amount: number; // Positive for credit, negative for debit/hold, 0 for settlement of existing hold
  balanceBefore: number;
  balanceAfter: number;
  note: string;
  partnerRef?: string;
  createdAt: number;
}

export interface WalletSnapshot {
  ownerUid: string;
  balance: number;
  pendingHold: number;
  lastLedgerSeq: number;
  status: 'active' | 'frozen';
}

export interface ReconciliationReport {
  ok: boolean;
  expectedAvailablePlusHold: number;
  recordedAvailablePlusHold: number;
  drift: number;
  sequenceGaps: number[];
  duplicateEventKeys: string[];
  shouldFreezeWallet: boolean;
}

/**
 * Deterministic idempotency keys preventing double-minting or double-spending on retries.
 */
export function buildRewardIdempotencyKey(params: {
  source: 'quest' | 'workout' | 'lesson' | 'milestone' | 'checkin' | 'day_clear' | 'migration';
  uid: string;
  targetId: string;
  dateKey?: string;
}): string {
  const cleanUid = params.uid.replace(/[^a-zA-Z0-9_-]/g, '');
  const cleanTarget = params.targetId.replace(/[^a-zA-Z0-9_:-]/g, '').slice(0, 80);
  if (params.source === 'migration') {
    return `migration:v3_opening_balance:${cleanUid}`;
  }
  if (params.dateKey) {
    return `earn:${params.source}:${cleanUid}:${params.dateKey}:${cleanTarget}`;
  }
  return `earn:${params.source}:${cleanUid}:${cleanTarget}`;
}

export function buildPartnerRedeemIdempotencyKey(
  partnerId: string,
  uid: string,
  clientRequestId: string
): string {
  const p = partnerId.toLowerCase().replace(/[^a-z0-9_-]/g, '');
  const u = uid.replace(/[^a-zA-Z0-9_-]/g, '');
  const r = clientRequestId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64);
  return `redeem:${p}:${u}:${r}`;
}

/**
 * Deterministic ledger reconciliation check (Gate 4 of Pre-Monetary Checklist).
 * Any drift != 0, duplicate eventKey, or sequence gap triggers immediate wallet freeze.
 */
export function reconcileWalletLedger(
  wallet: WalletSnapshot,
  ledger: WalletLedgerEntry[]
): ReconciliationReport {
  const sorted = [...ledger].sort((a, b) => a.seq - b.seq);
  const seenKeys = new Set<string>();
  const duplicateEventKeys: string[] = [];
  const sequenceGaps: number[] = [];

  let computedBalance = 0;
  let computedHold = 0;
  let expectedSeq = 1;

  for (const entry of sorted) {
    if (seenKeys.has(entry.eventKey)) {
      duplicateEventKeys.push(entry.eventKey);
    }
    seenKeys.add(entry.eventKey);

    if (entry.seq !== expectedSeq) {
      sequenceGaps.push(expectedSeq);
      expectedSeq = entry.seq + 1;
    } else {
      expectedSeq++;
    }

    if (entry.type === 'redeem_hold') {
      const holdAmt = Math.abs(entry.amount);
      computedBalance -= holdAmt;
      computedHold += holdAmt;
    } else if (entry.type === 'redeem_settled') {
      const settledAmt = Math.abs(entry.amount);
      computedHold -= settledAmt;
    } else if (entry.type === 'hold_release') {
      const releaseAmt = Math.abs(entry.amount);
      computedHold -= releaseAmt;
      computedBalance += releaseAmt;
    } else {
      computedBalance += entry.amount;
    }
  }

  const expectedAvailablePlusHold = computedBalance + computedHold;
  const recordedAvailablePlusHold = wallet.balance + wallet.pendingHold;
  const drift = recordedAvailablePlusHold - expectedAvailablePlusHold;
  const holdDrift = wallet.pendingHold - computedHold;
  const balanceDrift = wallet.balance - computedBalance;
  const ok =
    drift === 0 &&
    holdDrift === 0 &&
    balanceDrift === 0 &&
    sequenceGaps.length === 0 &&
    duplicateEventKeys.length === 0 &&
    wallet.lastLedgerSeq === sorted.length;

  return {
    ok,
    expectedAvailablePlusHold,
    recordedAvailablePlusHold,
    drift: drift !== 0 ? drift : balanceDrift !== 0 ? balanceDrift : holdDrift,
    sequenceGaps,
    duplicateEventKeys,
    shouldFreezeWallet: !ok,
  };
}
