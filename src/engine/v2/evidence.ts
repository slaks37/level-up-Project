import type { DevelopmentDimension } from './dimensions';
import type { EvidenceReviewStatus } from './progression';

export type EvidenceTargetType =
  | 'dream_step'
  | 'quest'
  | 'assignment'
  | 'business_milestone'
  | 'competency';

export type EvidenceKind =
  | 'reflection'
  | 'link'
  | 'file'
  | 'canvas_snapshot'
  | 'interview_log'
  | 'sales_proof';

export interface EvidenceRecord {
  id: string;
  ownerUid: string;
  dimension: DevelopmentDimension;
  targetType: EvidenceTargetType;
  targetId: string;
  cohortId?: string | null;
  title: string;
  summary: string;
  evidenceKind: EvidenceKind;
  artifactUrl?: string;
  sourceTag: 'validated_evidence';
  reviewStatus: EvidenceReviewStatus;
  reviewerFeedback?: string;
  rubricScore?: number;
  createdAt: number;
  updatedAt: number;
}

export interface CreateEvidenceInput {
  dimension: DevelopmentDimension;
  targetType: EvidenceTargetType;
  targetId: string;
  title: string;
  summary: string;
  evidenceKind: EvidenceKind;
  artifactUrl?: string;
  submitNow?: boolean;
}

function storageKey(uid?: string): string {
  return uid ? `levelup_evidence_v2:${uid}` : 'levelup_evidence_v2:guest';
}

export function loadLocalEvidence(uid?: string): EvidenceRecord[] {
  try {
    const raw = localStorage.getItem(storageKey(uid));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as EvidenceRecord[]) : [];
  } catch {
    return [];
  }
}

export function saveLocalEvidence(records: EvidenceRecord[], uid?: string): void {
  try {
    localStorage.setItem(storageKey(uid), JSON.stringify(records.slice(0, 200)));
  } catch {
    // Ignore storage errors
  }
}

export function buildEvidenceDraft(ownerUid: string, input: CreateEvidenceInput): EvidenceRecord {
  const now = Date.now();
  const cleanUrl = (input.artifactUrl || '').trim().slice(0, 500);
  return {
    id: `ev_${now}_${Math.random().toString(36).slice(2, 7)}`,
    ownerUid: ownerUid || 'guest',
    dimension: input.dimension,
    targetType: input.targetType,
    targetId: input.targetId.trim().slice(0, 128),
    title: input.title.trim().slice(0, 140),
    summary: input.summary.trim().slice(0, 2000),
    evidenceKind: input.evidenceKind,
    ...(cleanUrl && /^https?:\/\//i.test(cleanUrl) ? { artifactUrl: cleanUrl } : {}),
    sourceTag: 'validated_evidence',
    // Clients can ONLY create 'draft' or 'submitted' — NEVER self-approved!
    reviewStatus: input.submitNow ? 'submitted' : 'draft',
    createdAt: now,
    updatedAt: now,
  };
}
