export type HomepageAnalyticsEvent =
  | 'homepage_view'
  | 'hero_cta_clicked'
  | 'journey_cta_clicked'
  | 'feature_clicked'
  | 'persona_selected'
  | 'ecosystem_clicked'
  | 'partnership_cta_clicked'
  | 'final_cta_clicked'
  | 'registration_started'
  | 'registration_completed';

export interface HomepageEventPayload {
  [key: string]: string | number | boolean | undefined;
}

const PERSONA_STORAGE_KEY = 'levelup_selected_persona_v1';

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
  }
}

/**
 * Lightweight, zero-external-dependency event dispatcher.
 * Emits a standard DOM CustomEvent and forwards to window.dataLayer only if already configured.
 */
export function trackHomepageEvent(
  event: HomepageAnalyticsEvent,
  payload: HomepageEventPayload = {}
): void {
  if (typeof window === 'undefined') return;
  const detail = {
    event,
    timestamp: Date.now(),
    path: window.location.pathname,
    ...payload,
  };
  try {
    window.dispatchEvent(new CustomEvent('levelup:analytics', { detail }));
    if (Array.isArray(window.dataLayer)) {
      window.dataLayer.push(detail);
    }
  } catch {
    // Non-blocking telemetry
  }
}

export function saveSelectedPersona(personaId: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(PERSONA_STORAGE_KEY, personaId);
  } catch {
    // Ignore storage restrictions
  }
}

export function getSelectedPersona(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage.getItem(PERSONA_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function clearSelectedPersona(): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(PERSONA_STORAGE_KEY);
  } catch {
    // Ignore storage restrictions
  }
}
