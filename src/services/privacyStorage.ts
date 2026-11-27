import { DEFAULT_USER_PRIVACY_SETTINGS, type UserPrivacySettings } from '../engine/v2/privacy';

function privacyKey(uid?: string): string {
  return uid ? `levelup_privacy_v1:${uid}` : 'levelup_privacy_v1:guest';
}

export function normalizePrivacySettings(
  raw: Partial<UserPrivacySettings> | null | undefined
): UserPrivacySettings {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_USER_PRIVACY_SETTINGS };
  return {
    shareCoachingProgressWithMentor:
      typeof raw.shareCoachingProgressWithMentor === 'boolean'
        ? raw.shareCoachingProgressWithMentor
        : DEFAULT_USER_PRIVACY_SETTINGS.shareCoachingProgressWithMentor,
    shareBusinessCanvasesWithMentor:
      typeof raw.shareBusinessCanvasesWithMentor === 'boolean'
        ? raw.shareBusinessCanvasesWithMentor
        : DEFAULT_USER_PRIVACY_SETTINGS.shareBusinessCanvasesWithMentor,
    shareWellnessWithCoach: Boolean(raw.shareWellnessWithCoach),
    sharePrivateJournalWithAgnes: Boolean(raw.sharePrivateJournalWithAgnes),
    shareHealthMetricsWithAgnes: Boolean(raw.shareHealthMetricsWithAgnes),
    shareAggregatedImpactWithEcosystem: Boolean(raw.shareAggregatedImpactWithEcosystem),
  };
}

export function loadLocalPrivacySettings(uid?: string): UserPrivacySettings {
  try {
    const raw = localStorage.getItem(privacyKey(uid));
    if (!raw) return { ...DEFAULT_USER_PRIVACY_SETTINGS };
    return normalizePrivacySettings(JSON.parse(raw) as Partial<UserPrivacySettings>);
  } catch {
    return { ...DEFAULT_USER_PRIVACY_SETTINGS };
  }
}

export function saveLocalPrivacySettings(settings: UserPrivacySettings, uid?: string): void {
  try {
    localStorage.setItem(privacyKey(uid), JSON.stringify(normalizePrivacySettings(settings)));
  } catch {
    // Ignore quota/storage errors
  }
}
