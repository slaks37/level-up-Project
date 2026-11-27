export type EvidenceOrigin = 'user_input' | 'ai_assumption' | 'validated_evidence';
export type EvidenceReviewStatus = 'draft' | 'submitted' | 'approved' | 'revision_requested';
export type CompetencyTier = 'foundational' | 'practitioner' | 'builder' | 'leader';
export type BusinessStageCode = 'idea' | 'discover' | 'prototype' | 'validate' | 'launch' | 'grow' | 'impact';

export interface VerifiedCompetencyRecord {
  competencyId: string;
  tier: CompetencyTier;
  status: 'in_progress' | 'verified';
  rubricScore: number; // 0..100
  verifiedEvidenceCount: number;
}

export interface BusinessMilestoneRecord {
  stage: BusinessStageCode;
  origin: EvidenceOrigin;
  reviewStatus: EvidenceReviewStatus;
}

export interface ThreeAxisProgressionSummary {
  experienceLevel: number;
  competencyLevel: number;
  competencyPoints: number;
  businessLevel: number;
  businessStage: BusinessStageCode;
}

const COMPETENCY_TIER_POINTS: Record<CompetencyTier, number> = {
  foundational: 10,
  practitioner: 20,
  builder: 35,
  leader: 50,
};

const COMPETENCY_LEVEL_THRESHOLDS = [0, 10, 25, 45, 70, 100, 140, 185, 240, 300] as const;

const BUSINESS_STAGE_ORDER: readonly BusinessStageCode[] = [
  'idea',
  'discover',
  'prototype',
  'validate',
  'launch',
  'grow',
  'impact',
] as const;

/**
 * Computes Competency Level strictly from verified assessments & practical evidence.
 * Time spent and Experience Level (EXP) are NEVER inputs here.
 */
export function computeCompetencyProgression(records: VerifiedCompetencyRecord[]): {
  competencyLevel: number;
  competencyPoints: number;
} {
  let points = 0;
  for (const rec of records) {
    if (rec.status !== 'verified') continue;
    if (rec.verifiedEvidenceCount < 1) continue;
    if (rec.rubricScore < 70) continue;
    points += COMPETENCY_TIER_POINTS[rec.tier] ?? 10;
  }

  let level = 1;
  for (let i = 0; i < COMPETENCY_LEVEL_THRESHOLDS.length; i++) {
    if (points >= COMPETENCY_LEVEL_THRESHOLDS[i]) {
      level = i + 1;
    }
  }
  return { competencyLevel: Math.min(10, level), competencyPoints: points };
}

/**
 * Computes Business Development Level strictly from APPROVED, VALIDATED real-world evidence.
 * Explicitly ignores AI-generated assumptions ('ai_assumption') and unreviewed drafts.
 */
export function computeBusinessProgression(milestones: BusinessMilestoneRecord[]): {
  businessLevel: number;
  businessStage: BusinessStageCode;
} {
  const verified = milestones.filter(
    (m) => m.origin === 'validated_evidence' && m.reviewStatus === 'approved'
  );
  if (verified.length === 0) {
    return { businessLevel: 0, businessStage: 'idea' };
  }

  let highestStageIdx = 0;
  const uniqueStages = new Set<BusinessStageCode>();
  for (const item of verified) {
    const idx = BUSINESS_STAGE_ORDER.indexOf(item.stage);
    if (idx >= 0) {
      uniqueStages.add(item.stage);
      if (idx > highestStageIdx) highestStageIdx = idx;
    }
  }

  // Stage progression maps across levels 1..10 without inflating from EXP
  const stageBaseLevel = highestStageIdx + 1; // discover=2 .. impact=7
  const depthBonus = Math.min(3, Math.floor(Math.max(0, verified.length - uniqueStages.size) / 2));
  const businessLevel = Math.min(10, Math.max(1, stageBaseLevel + depthBonus));

  return {
    businessLevel,
    businessStage: BUSINESS_STAGE_ORDER[highestStageIdx],
  };
}

export function buildThreeAxisProgression(
  experienceLevel: number,
  competencies: VerifiedCompetencyRecord[],
  businessMilestones: BusinessMilestoneRecord[]
): ThreeAxisProgressionSummary {
  const comp = computeCompetencyProgression(competencies);
  const biz = computeBusinessProgression(businessMilestones);
  return {
    experienceLevel: Math.max(1, Math.round(experienceLevel)),
    competencyLevel: comp.competencyLevel,
    competencyPoints: comp.competencyPoints,
    businessLevel: biz.businessLevel,
    businessStage: biz.businessStage,
  };
}
