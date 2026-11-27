export interface UserPrivacySettings {
  shareCoachingProgressWithMentor: boolean;
  shareBusinessCanvasesWithMentor: boolean;
  shareWellnessWithCoach: boolean;
  sharePrivateJournalWithAgnes: boolean;
  shareHealthMetricsWithAgnes: boolean;
  shareAggregatedImpactWithEcosystem: boolean;
}

/**
 * Privacy-by-Default settings (Stage 9 & Stage 10).
 * All sensitive personal journal, health, and external ecosystem sharing flags default to FALSE.
 */
export const DEFAULT_USER_PRIVACY_SETTINGS: UserPrivacySettings = {
  shareCoachingProgressWithMentor: true,
  shareBusinessCanvasesWithMentor: true,
  shareWellnessWithCoach: false,
  sharePrivateJournalWithAgnes: false,
  shareHealthMetricsWithAgnes: false,
  shareAggregatedImpactWithEcosystem: false,
};

export type AgnesExpertiseMode =
  | 'personal_coach'
  | 'career_coach'
  | 'learning_tutor'
  | 'business_mentor'
  | 'marketing_advisor'
  | 'financial_assistant'
  | 'wellness_companion'
  | 'export_assistant'
  | 'impact_advisor'
  | 'daily_planner';

export const AGNES_EXPERTISE_MODES: readonly AgnesExpertiseMode[] = [
  'personal_coach',
  'career_coach',
  'learning_tutor',
  'business_mentor',
  'marketing_advisor',
  'financial_assistant',
  'wellness_companion',
  'export_assistant',
  'impact_advisor',
  'daily_planner',
] as const;

export interface RawAgnesContext {
  goal: string;
  profession: string;
  pathwayId?: string;
  activeDreamStepTitle?: string;
  pendingQuestTitles?: string[];
  courseContext?: string;
  ventureSummary?: string;
  // Tier 1 sensitive fields — strictly gated by explicit mode + consent!
  privateJournalNotes?: string[];
  healthMetrics?: {
    sleepHours?: number | null;
    mood?: string;
    energy?: string;
    hasPainAlert?: boolean;
  };
  calendarEventTitles?: string[];
}

export interface ScopedAgnesContext {
  mode: AgnesExpertiseMode;
  goal: string;
  profession: string;
  pathwayId?: string;
  activeDreamStepTitle?: string;
  pendingQuestTitles?: string[];
  courseContext?: string;
  ventureSummary?: string;
  privateJournalNotes?: string[];
  healthMetrics?: RawAgnesContext['healthMetrics'];
  calendarEventTitles?: string[];
  outputOriginTag: 'ai_assumption';
  piiRedacted: true;
}

const EMAIL_REGEX = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const PHONE_REGEX = /\b(?:\+62|62|0)8[1-9](?:[\s-]?\d){6,11}\b/g;
const NIK_REGEX = /\b\d{16}\b/g;

export function redactPiiText(text: string): string {
  return text
    .replace(EMAIL_REGEX, '[REDACTED_EMAIL]')
    .replace(PHONE_REGEX, '[REDACTED_PHONE]')
    .replace(NIK_REGEX, '[REDACTED_ID]');
}

const MODES_ALLOWED_JOURNAL = new Set<AgnesExpertiseMode>(['personal_coach', 'wellness_companion']);
const MODES_ALLOWED_HEALTH = new Set<AgnesExpertiseMode>(['wellness_companion', 'daily_planner']);
const MODES_ALLOWED_CALENDAR = new Set<AgnesExpertiseMode>(['daily_planner', 'career_coach']);

/**
 * Enforces Agnes AI 2.0 Data-Access Boundaries (Stage 9).
 * Sensitive journals and health metrics are NEVER forwarded unless BOTH:
 * 1) the selected expertise mode permits that domain, AND
 * 2) the user explicitly enabled consent in UserPrivacySettings.
 */
export function buildScopedAgnesContext(
  mode: AgnesExpertiseMode,
  raw: RawAgnesContext,
  privacy: UserPrivacySettings = DEFAULT_USER_PRIVACY_SETTINGS
): ScopedAgnesContext {
  const scoped: ScopedAgnesContext = {
    mode,
    goal: redactPiiText(raw.goal),
    profession: redactPiiText(raw.profession),
    ...(raw.pathwayId ? { pathwayId: raw.pathwayId } : {}),
    ...(raw.activeDreamStepTitle ? { activeDreamStepTitle: redactPiiText(raw.activeDreamStepTitle) } : {}),
    ...(raw.pendingQuestTitles?.length
      ? { pendingQuestTitles: raw.pendingQuestTitles.slice(0, 10).map(redactPiiText) }
      : {}),
    ...(mode === 'learning_tutor' && raw.courseContext
      ? { courseContext: redactPiiText(raw.courseContext) }
      : {}),
    ...([
      'business_mentor',
      'marketing_advisor',
      'financial_assistant',
      'export_assistant',
      'impact_advisor',
    ].includes(mode) && raw.ventureSummary
      ? { ventureSummary: redactPiiText(raw.ventureSummary) }
      : {}),
    outputOriginTag: 'ai_assumption',
    piiRedacted: true,
  };

  if (
    MODES_ALLOWED_JOURNAL.has(mode) &&
    privacy.sharePrivateJournalWithAgnes &&
    raw.privateJournalNotes?.length
  ) {
    scoped.privateJournalNotes = raw.privateJournalNotes.slice(0, 5).map(redactPiiText);
  }

  if (MODES_ALLOWED_HEALTH.has(mode) && privacy.shareHealthMetricsWithAgnes && raw.healthMetrics) {
    scoped.healthMetrics = { ...raw.healthMetrics };
  }

  if (MODES_ALLOWED_CALENDAR.has(mode) && raw.calendarEventTitles?.length) {
    scoped.calendarEventTitles = raw.calendarEventTitles.slice(0, 8).map(redactPiiText);
  }

  return scoped;
}
