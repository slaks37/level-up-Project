import { describe, expect, it } from 'vitest';
import {
  DEFAULT_FEATURE_FLAGS,
  isFeatureEnabled,
  normalizeFeatureFlags,
} from '../../services/featureFlags';
import { DEVELOPMENT_DIMENSIONS, inferQuestDimension } from './dimensions';
import { createPathwayDreamSteps, DEVELOPMENT_PATHWAYS } from './pathways';
import {
  buildThreeAxisProgression,
  computeBusinessProgression,
  computeCompetencyProgression,
} from './progression';
import {
  calculateBreakEven,
  calculateCashFlowProjection,
  calculateHppAndPricing,
} from './studioCalculators';
import {
  AGNES_EXPERTISE_MODES,
  buildScopedAgnesContext,
  DEFAULT_USER_PRIVACY_SETTINGS,
  redactPiiText,
} from './privacy';
import { buildUserTelemetrySummary } from '../analytics';
import { createInitialPlayerProfile, DEFAULT_COIN_ECONOMY, normalizePlayerProfile } from '../science';
import { PROFESSIONS_DB } from '../../data/professions';
import type { CheckIn } from '../journal';

describe('LevelUp 2.0 — feature flags & safety gates', () => {
  it('defaults all v2 modules to false and blocks myValueRedemption unless serverWallet is enabled', () => {
    expect(DEFAULT_FEATURE_FLAGS.myValueRedemption).toBe(false);
    expect(DEFAULT_FEATURE_FLAGS.serverWallet).toBe(false);

    // Even if Firestore doc mistakenly sets myValueRedemption: true without serverWallet, guard keeps it false
    const unsafeFlags = normalizeFeatureFlags({ myValueRedemption: true, serverWallet: false });
    expect(unsafeFlags.myValueRedemption).toBe(false);
    expect(isFeatureEnabled(unsafeFlags, 'myValueRedemption', { userCohortIds: ['pilot'], isInternalStaff: true })).toBe(false);

    // Pilot cohort allowlist enables non-monetary v2 features safely
    const pilotFlags = normalizeFeatureFlags({ cohortAllowlist: ['coh_pilot_1'] });
    expect(isFeatureEnabled(pilotFlags, 'academy', { userCohortIds: ['coh_pilot_1'] })).toBe(true);
    expect(isFeatureEnabled(pilotFlags, 'academy', { userCohortIds: ['coh_other'] })).toBe(false);
  });
});

describe('LevelUp 2.0 — 7 dimensions & 6 pathways (Stage 3 & 5)', () => {
  it('exposes all 7 development dimensions and maps legacy quests backward-compatibly', () => {
    expect(DEVELOPMENT_DIMENSIONS).toHaveLength(7);
    expect(inferQuestDimension({ category: 'FITNESS', title: 'Lari pagi', skillTag: 'Stamina' })).toBe('HEALTH');
    expect(inferQuestDimension({ category: 'CAREER', title: 'Hitung HPP dan margin produk', skillTag: 'Keuangan' })).toBe('FINANCIAL');
    expect(inferQuestDimension({ category: 'CAREER', title: 'Pemetaan dampak sosial petani desa', skillTag: 'Komunitas' })).toBe('IMPACT');
    expect(inferQuestDimension({ category: 'STUDY', title: 'Belajar TypeScript dasar', skillTag: 'Coding' })).toBe('SKILLS');
  });

  it('preserves 5-phase personal_growth roadmap and generates 10-stage Sociopreneur roadmap', () => {
    expect(DEVELOPMENT_PATHWAYS).toHaveLength(6);

    const classic = createPathwayDreamSteps('personal_growth', 'Jadi Tech Lead', 'Software Engineer', 15, undefined, 'id');
    expect(classic).toHaveLength(5);

    const socio = createPathwayDreamSteps('sociopreneur', 'Kopi Lestari Tani', 'Agripreneur', 20, undefined, 'en');
    expect(socio).toHaveLength(10);
    expect(socio[0].phase).toContain('Awakening');
    expect(socio[5].phase).toContain('Prototype');
    expect(socio[9].phase).toContain('Impact');
    expect(socio.every((s) => Boolean(s.evidenceRequirement))).toBe(true);
  });
});

describe('LevelUp 2.0 — 3-axis gamification (Stage 6)', () => {
  it('separates Experience Level from Competency and Business Levels and rejects AI assumptions', () => {
    // High EXP level (50) with zero verified evidence MUST stay Competency Level 1 and Business Level 0
    const unverified = buildThreeAxisProgression(
      50,
      [{ competencyId: 'c1', tier: 'builder', status: 'in_progress', rubricScore: 95, verifiedEvidenceCount: 1 }],
      [
        { stage: 'launch', origin: 'ai_assumption', reviewStatus: 'approved' },
        { stage: 'validate', origin: 'validated_evidence', reviewStatus: 'draft' },
      ]
    );
    expect(unverified.experienceLevel).toBe(50);
    expect(unverified.competencyLevel).toBe(1);
    expect(unverified.businessLevel).toBe(0);
    expect(unverified.businessStage).toBe('idea');

    // Verified competencies & approved validated_evidence advance accurately
    const comp = computeCompetencyProgression([
      { competencyId: 'c1', tier: 'foundational', status: 'verified', rubricScore: 85, verifiedEvidenceCount: 1 },
      { competencyId: 'c2', tier: 'practitioner', status: 'verified', rubricScore: 90, verifiedEvidenceCount: 2 },
      { competencyId: 'c3', tier: 'builder', status: 'verified', rubricScore: 65, verifiedEvidenceCount: 1 }, // below 70 pass threshold!
    ]);
    expect(comp.competencyPoints).toBe(30);
    expect(comp.competencyLevel).toBe(3);

    const biz = computeBusinessProgression([
      { stage: 'discover', origin: 'validated_evidence', reviewStatus: 'approved' },
      { stage: 'prototype', origin: 'validated_evidence', reviewStatus: 'approved' },
      { stage: 'validate', origin: 'validated_evidence', reviewStatus: 'approved' },
    ]);
    expect(biz.businessStage).toBe('validate');
    expect(biz.businessLevel).toBe(4);
  });
});

describe('LevelUp 2.0 — deterministic Business Studio financial calculators (Stage 8)', () => {
  it('calculates HPP, selling price, gross margin, and markup deterministically', () => {
    const res = calculateHppAndPricing({
      batchUnits: 100,
      directMaterials: [{ name: 'Biji kopi', amountIdr: 2_000_000 }, { name: 'Kemasan', amountIdr: 500_000 }],
      directLabor: [{ name: 'Roasting & packing', amountIdr: 1_000_000 }],
      overheadCosts: [{ name: 'Listrik & gas', amountIdr: 500_000 }],
      sellingPriceIdr: 60_000,
    });
    expect(res.totalBatchCostIdr).toBe(4_000_000);
    expect(res.hppPerUnitIdr).toBe(40_000);
    expect(res.grossProfitPerUnitIdr).toBe(20_000);
    expect(res.grossMarginPct).toBe(33.33);
    expect(res.markupPct).toBe(50);
    expect(res.warnings).toHaveLength(0);
  });

  it('computes Break-Even Point and flags unreachable BEP when price <= variable cost', () => {
    const ok = calculateBreakEven({
      fixedCostsPerMonthIdr: 5_000_000,
      sellingPricePerUnitIdr: 60_000,
      variableCostPerUnitIdr: 40_000,
      projectedMonthlyUnits: 320,
    });
    expect(ok.reachable).toBe(true);
    expect(ok.breakEvenUnits).toBe(250);
    expect(ok.breakEvenRevenueIdr).toBe(15_000_000);
    expect(ok.marginOfSafetyUnits).toBe(70);

    const impossible = calculateBreakEven({
      fixedCostsPerMonthIdr: 5_000_000,
      sellingPricePerUnitIdr: 35_000,
      variableCostPerUnitIdr: 40_000,
    });
    expect(impossible.reachable).toBe(false);
    expect(impossible.breakEvenUnits).toBeNull();
    expect(impossible.warning).toMatch(/unreachable/i);
  });

  it('tracks multi-month cash flow and flags negative cash balance months', () => {
    const cf = calculateCashFlowProjection(3_000_000, [
      { monthLabel: 'Jan', cashInflowsIdr: 2_000_000, cashOutflowsIdr: 4_000_000 },
      { monthLabel: 'Feb', cashInflowsIdr: 1_000_000, cashOutflowsIdr: 2_500_000 },
      { monthLabel: 'Mar', cashInflowsIdr: 6_000_000, cashOutflowsIdr: 3_000_000 },
    ]);
    expect(cf.months[0].closingBalanceIdr).toBe(1_000_000);
    expect(cf.months[1].closingBalanceIdr).toBe(-500_000);
    expect(cf.months[2].closingBalanceIdr).toBe(2_500_000);
    expect(cf.negativeCashMonths).toEqual(['Feb']);
    expect(cf.lowestBalanceIdr).toBe(-500_000);
  });
});

describe('LevelUp 2.0 — privacy firewall & Agnes AI 2.0 boundaries (Stage 9 & 10)', () => {
  it('enforces 10 modes, strips private journals/health by default, and redacts PII', () => {
    expect(AGNES_EXPERTISE_MODES).toHaveLength(10);
    expect(DEFAULT_USER_PRIVACY_SETTINGS.sharePrivateJournalWithAgnes).toBe(false);
    expect(DEFAULT_USER_PRIVACY_SETTINGS.shareHealthMetricsWithAgnes).toBe(false);

    const raw = {
      goal: 'Scale Kopi Lestari (hubungi budi@example.com / 081234567890 / 3201010101010001)',
      profession: 'Agripreneur',
      ventureSummary: 'Kopi organik Garut',
      privateJournalNotes: ['Hari ini merasa sangat cemas soal keluarga'],
      healthMetrics: { sleepHours: 4.5, mood: 'anxious', hasPainAlert: true },
      calendarEventTitles: ['Meeting supplier kopi'],
    };

    // Default privacy (all sensitive OFF): wellness_companion MUST NOT receive journals or health
    const defaultWellness = buildScopedAgnesContext('wellness_companion', raw);
    expect(defaultWellness.privateJournalNotes).toBeUndefined();
    expect(defaultWellness.healthMetrics).toBeUndefined();
    expect(defaultWellness.outputOriginTag).toBe('ai_assumption');
    expect(defaultWellness.goal).not.toContain('budi@example.com');
    expect(defaultWellness.goal).not.toContain('081234567890');
    expect(defaultWellness.goal).not.toContain('3201010101010001');

    // Business Mentor MUST NOT receive journals or health EVEN IF user opted in for wellness!
    const optedInPrivacy = {
      ...DEFAULT_USER_PRIVACY_SETTINGS,
      sharePrivateJournalWithAgnes: true,
      shareHealthMetricsWithAgnes: true,
    };
    const bizCtx = buildScopedAgnesContext('business_mentor', raw, optedInPrivacy);
    expect(bizCtx.privateJournalNotes).toBeUndefined();
    expect(bizCtx.healthMetrics).toBeUndefined();
    expect(bizCtx.ventureSummary).toBe('Kopi organik Garut');

    // Wellness Companion receives health + journal ONLY when explicitly consented
    const consentedWellness = buildScopedAgnesContext('wellness_companion', raw, optedInPrivacy);
    expect(consentedWellness.privateJournalNotes).toHaveLength(1);
    expect(consentedWellness.healthMetrics?.sleepHours).toBe(4.5);

    expect(redactPiiText('WA 0812-3456-7890 email a@b.co')).toBe('WA [REDACTED_PHONE] email [REDACTED_EMAIL]');
  });

  it('strips mood, sleep, energy, and pain alerts from global user telemetry unless participant opts in (SEC-02)', () => {
    const player = createInitialPlayerProfile(
      {
        name: 'Dina',
        gender: 'female',
        age: 25,
        height: 160,
        weight: 54,
        city: 'Malang',
        rewardInterest: 'Buku',
        goal: 'Usaha kerajinan',
        targetLevel: 15,
        dailyBudget: 120,
        gym: { goal: 'general', level: 'beginner', equipment: 'home', days: 3, limitations: '', currentPain: true },
        selectedPreset: PROFESSIONS_DB[0],
        lang: 'id',
      },
      DEFAULT_COIN_ECONOMY
    );
    const checkIn: CheckIn = {
      id: '2026-11-27-morning',
      dateKey: '2026-11-27',
      phase: 'morning',
      kind: 'checkin',
      sleepHours: 4.5,
      meal: 'skipped',
      mealNote: '',
      energy: 'tired',
      mood: 'anxious',
      note: 'Private note',
      extraMinutes: 0,
      updatedAt: Date.now(),
    };

    const defaultTelemetry = buildUserTelemetrySummary(player, [checkIn], [], '2026-11-27');
    expect(defaultTelemetry.lastMood).toBe('');
    expect(defaultTelemetry.lastEnergy).toBe('');
    expect(defaultTelemetry.lastSleepHours).toBeNull();
    expect(defaultTelemetry.hasPainAlert).toBe(false);

    const optedInTelemetry = buildUserTelemetrySummary(player, [checkIn], [], '2026-11-27', {
      ...DEFAULT_USER_PRIVACY_SETTINGS,
      shareWellnessWithCoach: true,
    });
    expect(optedInTelemetry.lastMood).toBe('anxious');
    expect(optedInTelemetry.lastSleepHours).toBe(4.5);
    expect(optedInTelemetry.hasPainAlert).toBe(true);

    // Schema v4 normalization keeps v3 untouched when no v4 fields exist, upgrades cleanly when present
    const v4Normalized = normalizePlayerProfile(
      { ...player, pathwayId: 'sociopreneur', awakeningV2Completed: true, purposeStatement: 'Dampak petani lokal' },
      'id'
    );
    expect(v4Normalized.schemaVersion).toBe(4);
    expect(v4Normalized.pathwayId).toBe('sociopreneur');
    expect(v4Normalized.awakeningV2Completed).toBe(true);
  });
});
