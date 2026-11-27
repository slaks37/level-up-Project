import { describe, expect, it } from 'vitest';
import {
  buildQuestFromLesson,
  gradeAcademyQuiz,
  STARTER_ACADEMY_COURSES,
} from './academy';
import {
  buildQuestFromStudioTool,
  BUSINESS_STUDIO_TOOLS,
  computeChecklistPct,
} from './businessStudio';
import { buildEvidenceDraft } from './evidence';
import {
  buildPartnerRedeemIdempotencyKey,
  buildRewardIdempotencyKey,
  reconcileWalletLedger,
  type WalletLedgerEntry,
  type WalletSnapshot,
} from './walletLedger';
import {
  assertNoForbiddenPrivacyFields,
  computeSocioWebhookSignature,
  sanitizeCohortImpactForEcosystem,
  verifySocioWebhookSignature,
} from './ecosystemContracts';

describe('LevelUp 2.0 — Academy LMS & Evidence Vault (Stage 5 & 7)', () => {
  it('grades quizzes deterministically with 70% pass gate and links lessons to Daily Quests', () => {
    const quizLesson = STARTER_ACADEMY_COURSES[0].modules[0].lessons[1];
    expect(quizLesson.quizQuestions).toHaveLength(2);

    const pass = gradeAcademyQuiz(quizLesson.quizQuestions!, { q1: 1, q2: 1 });
    expect(pass).toEqual({ correctCount: 2, total: 2, scorePct: 100, passed: true });

    const fail = gradeAcademyQuiz(quizLesson.quizQuestions!, { q1: 0, q2: 1 });
    expect(fail.passed).toBe(false);
    expect(fail.scorePct).toBe(50);

    const articleLesson = STARTER_ACADEMY_COURSES[0].modules[0].lessons[0];
    const quest = buildQuestFromLesson(articleLesson, 'id', 'step_123');
    expect(quest).not.toBeNull();
    expect(quest?.dreamStepId).toBe('step_123');
    expect(quest?.dimension).toBe('IMPACT');
    expect(quest?.gold).toBe(1);
  });

  it('builds evidence drafts strictly as draft/submitted (never client self-approved)', () => {
    const draft = buildEvidenceDraft('uid_1', {
      dimension: 'BUSINESS',
      targetType: 'dream_step',
      targetId: 'ds_1',
      title: '5 Wawancara Pelanggan',
      summary: 'Hasil wawancara nyata di pasar lokal',
      evidenceKind: 'interview_log',
      artifactUrl: 'javascript:alert(1)', // malicious URL must be stripped!
      submitNow: true,
    });
    expect(draft.sourceTag).toBe('validated_evidence');
    expect(draft.reviewStatus).toBe('submitted');
    expect(draft.artifactUrl).toBeUndefined();
  });
});

describe('LevelUp 2.0 — Business Studio 16 Tools (Stage 8)', () => {
  it('includes all 16 required tools across 4 wings, checklist scoring, and quest generation', () => {
    expect(BUSINESS_STUDIO_TOOLS).toHaveLength(16);
    const ids = new Set(BUSINESS_STUDIO_TOOLS.map((t) => t.id));
    expect(ids.size).toBe(16);
    expect(ids.has('personal_development')).toBe(true);
    expect(ids.has('social_problem')).toBe(true);
    expect(ids.has('community_potential')).toBe(true);
    expect(ids.has('customer_research')).toBe(true);
    expect(ids.has('value_proposition')).toBe(true);
    expect(ids.has('business_model')).toBe(true);
    expect(ids.has('product_prototyping')).toBe(true);
    expect(ids.has('experiment_tracker')).toBe(true);
    expect(ids.has('hpp_pricing')).toBe(true);
    expect(ids.has('cash_flow')).toBe(true);
    expect(ids.has('bep')).toBe(true);
    expect(ids.has('marketing_plan')).toBe(true);
    expect(ids.has('operational_planning')).toBe(true);
    expect(ids.has('legal_readiness')).toBe(true);
    expect(ids.has('export_readiness')).toBe(true);
    expect(ids.has('social_impact')).toBe(true);

    const legalTool = BUSINESS_STUDIO_TOOLS.find((t) => t.id === 'legal_readiness')!;
    expect(computeChecklistPct(legalTool, { nib: true, npwp: true, halal: true })).toBe(50);

    const quest = buildQuestFromStudioTool(legalTool, 'en', 'step_launch');
    expect(quest.dimension).toBe('BUSINESS');
    expect(quest.dreamStepId).toBe('step_launch');
  });
});

describe('LevelUp 2.0 — Server-Authoritative Wallet Ledger & Reconciliation (Stage 10)', () => {
  it('generates deterministic idempotency keys and verifies clean vs drifted ledger balances', () => {
    const key1 = buildRewardIdempotencyKey({ source: 'quest', uid: 'u1', targetId: 'q_1', dateKey: '2026-11-27' });
    const key2 = buildRewardIdempotencyKey({ source: 'quest', uid: 'u1', targetId: 'q_1', dateKey: '2026-11-27' });
    expect(key1).toBe(key2);
    expect(buildPartnerRedeemIdempotencyKey('MyValue', 'u1', 'req-99')).toBe('redeem:myvalue:u1:req-99');

    const ledger: WalletLedgerEntry[] = [
      { eventKey: 'migration:v3_opening_balance:u1', ownerUid: 'u1', seq: 1, type: 'migration_opening', source: 'migration', amount: 10, balanceBefore: 0, balanceAfter: 10, note: 'Opening', createdAt: 1 },
      { eventKey: 'earn:quest:u1:2026-11-27:q1', ownerUid: 'u1', seq: 2, type: 'earn', source: 'quest', amount: 1, balanceBefore: 10, balanceAfter: 11, note: 'Quest', createdAt: 2 },
      { eventKey: 'redeem:myvalue:u1:r1', ownerUid: 'u1', seq: 3, type: 'redeem_hold', source: 'partner', amount: -5, balanceBefore: 11, balanceAfter: 6, note: 'Hold', createdAt: 3 },
      { eventKey: 'redeem:myvalue:u1:r1:settled', ownerUid: 'u1', seq: 4, type: 'redeem_settled', source: 'partner', amount: -5, balanceBefore: 6, balanceAfter: 6, note: 'Settled', createdAt: 4 },
    ];
    const cleanWallet: WalletSnapshot = { ownerUid: 'u1', balance: 6, pendingHold: 0, lastLedgerSeq: 4, status: 'active' };
    const cleanReport = reconcileWalletLedger(cleanWallet, ledger);
    expect(cleanReport.ok).toBe(true);
    expect(cleanReport.drift).toBe(0);
    expect(cleanReport.shouldFreezeWallet).toBe(false);

    // Tampered balance (+1 drift) MUST trigger immediate freeze
    const driftedReport = reconcileWalletLedger({ ...cleanWallet, balance: 7 }, ledger);
    expect(driftedReport.ok).toBe(false);
    expect(driftedReport.drift).toBe(1);
    expect(driftedReport.shouldFreezeWallet).toBe(true);
  });
});

describe('LevelUp 2.0 — Ecosystem Integration HMAC, Replay & Privacy Firewalls (Stage 11)', () => {
  it('verifies HMAC-SHA256 webhook signatures, blocks tampered/stale payloads, and enforces k-anonymity + zero journal leak', async () => {
    const secret = 'test_shared_hmac_secret_v1';
    const nowSec = 1_800_000_000;
    const rawBody = JSON.stringify({ eventId: 'evt_1', externalOrderId: 'SO-1' });
    const sig = await computeSocioWebhookSignature(secret, nowSec - 10, rawBody);

    const ok = await verifySocioWebhookSignature({ secret, timestampSec: nowSec - 10, rawBody, signatureHeader: sig, nowSec });
    expect(ok).toEqual({ valid: true });

    const tampered = await verifySocioWebhookSignature({ secret, timestampSec: nowSec - 10, rawBody: rawBody + ' ', signatureHeader: sig, nowSec });
    expect(tampered).toEqual({ valid: false, reason: 'INVALID_SIGNATURE' });

    const stale = await verifySocioWebhookSignature({ secret, timestampSec: nowSec - 600, rawBody, signatureHeader: sig, nowSec });
    expect(stale).toEqual({ valid: false, reason: 'TIMESTAMP_EXPIRED' });

    // Privacy firewall blocks forbidden Tier 1 journal/health/buyer PII fields
    const unsafeCheck = assertNoForbiddenPrivacyFields({ venture: 'Kopi', nested: { sleepHours: 5, buyerPhone: '0812' } });
    expect(unsafeCheck.safe).toBe(false);
    expect(unsafeCheck.violations).toContain('nested.sleepHours');
    expect(unsafeCheck.violations).toContain('nested.buyerPhone');

    // k-anonymity enforces activeParticipants >= 5
    const tooSmall = sanitizeCohortImpactForEcosystem({
      cohortId: 'coh_small', period: '2026-12', activeParticipants: 3,
      verifiedCompetenciesAwarded: 5, certificatesIssued: 2, householdsBenefited: 10, jobsSustained: 2,
    });
    expect(tooSmall.allowed).toBe(false);

    const safeCohort = sanitizeCohortImpactForEcosystem({
      cohortId: 'coh_batch4', period: '2026-12', activeParticipants: 25,
      verifiedCompetenciesAwarded: 60, certificatesIssued: 18, householdsBenefited: 120, jobsSustained: 30,
    });
    expect(safeCohort.allowed).toBe(true);
    expect(safeCohort.payload?.dataProvenance.excludesPrivateJournals).toBe(true);
  });
});
