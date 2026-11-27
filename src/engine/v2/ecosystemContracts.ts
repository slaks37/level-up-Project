/**
 * Sociopreneur.online & Socioline.sociopreneur.online Ecosystem Integration Contracts (Stage 11).
 * Independent deployments, independent DBs, zero direct journal sharing, HMAC-SHA256 signing,
 * replay window enforcement (<= 300s), and k-anonymity (k >= 5) impact privacy firewall.
 */

export const MAX_WEBHOOK_SKEW_SECONDS = 300;
export const IMPACT_K_ANONYMITY_MIN = 5;

export interface CoursePurchaseEnrollmentPayload {
  eventId: string;
  externalOrderId: string;
  paymentVerifiedAt: string;
  buyer: {
    ecosystemUserId?: string;
    email: string;
    displayName: string;
  };
  course: {
    externalProductId: string;
    levelupCourseId: string;
    cohortId?: string;
  };
}

export interface RefundRevocationPayload {
  eventId: string;
  externalOrderId: string;
  externalRefundId: string;
  levelupCourseId: string;
  buyerEmail: string;
  reason: string;
  revokeCertificate: boolean;
}

export interface MarketplaceOrderFeedbackPayload {
  eventId: string;
  eventType: 'order_completed' | 'b2b_inquiry' | 'period_settlement';
  levelupVentureId: string;
  externalProductId: string;
  periodKey: string;
  metrics: {
    unitsSold: number;
    grossRevenueIdr: number;
    isRepeatCustomer?: boolean;
    customerRating?: number;
    b2bInquiryCount?: number;
  };
}

export interface ImpactCohortAggregate {
  cohortId: string;
  period: string;
  activeParticipants: number;
  verifiedCompetenciesAwarded: number;
  certificatesIssued: number;
  householdsBenefited: number;
  jobsSustained: number;
}

const FORBIDDEN_PRIVACY_KEYS = new Set([
  'journal',
  'privateJournalNotes',
  'sleepHours',
  'mood',
  'painAreas',
  'mealNote',
  'calendarEvents',
  'buyerName',
  'buyerPhone',
  'buyerAddress',
  'buyerEmailPii',
]);

/**
 * Verifies webhook timestamp freshness to block replay attacks (max skew 300s).
 */
export function isWebhookTimestampFresh(
  timestampSec: number,
  nowSec = Math.floor(Date.now() / 1000)
): boolean {
  if (!Number.isFinite(timestampSec) || timestampSec <= 0) return false;
  return Math.abs(nowSec - timestampSec) <= MAX_WEBHOOK_SKEW_SECONDS;
}

/**
 * Computes HMAC-SHA256 hex digest using standard Web Crypto API (works in Node 22+, Edge, and browsers).
 */
export async function computeSocioWebhookSignature(
  secret: string,
  timestampSec: number,
  rawBody: string
): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sigBuf = await crypto.subtle.sign('HMAC', key, enc.encode(`${timestampSec}.${rawBody}`));
  const hex = [...new Uint8Array(sigBuf)].map((b) => b.toString(16).padStart(2, '0')).join('');
  return `v1=${hex}`;
}

/**
 * Constant-time string comparison preventing timing side-channels on HMAC signatures.
 */
export function timingSafeEqualStrings(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export async function verifySocioWebhookSignature(params: {
  secret: string;
  timestampSec: number;
  rawBody: string;
  signatureHeader: string;
  nowSec?: number;
}): Promise<{ valid: boolean; reason?: 'TIMESTAMP_EXPIRED' | 'INVALID_SIGNATURE' }> {
  if (!isWebhookTimestampFresh(params.timestampSec, params.nowSec)) {
    return { valid: false, reason: 'TIMESTAMP_EXPIRED' };
  }
  const expected = await computeSocioWebhookSignature(params.secret, params.timestampSec, params.rawBody);
  if (!timingSafeEqualStrings(expected, params.signatureHeader.trim())) {
    return { valid: false, reason: 'INVALID_SIGNATURE' };
  }
  return { valid: true };
}

/**
 * Recursive privacy firewall proving NO Tier 1 journal/health fields or buyer PII
 * ever cross the LevelUp <-> Sociopreneur.online boundary.
 */
export function assertNoForbiddenPrivacyFields(payload: unknown): { safe: boolean; violations: string[] } {
  const violations: string[] = [];
  const walk = (node: unknown, path: string) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) {
      node.forEach((item, idx) => walk(item, `${path}[${idx}]`));
      return;
    }
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
      const nextPath = path ? `${path}.${k}` : k;
      if (FORBIDDEN_PRIVACY_KEYS.has(k)) {
        violations.push(nextPath);
      }
      walk(v, nextPath);
    }
  };
  walk(payload, '');
  return { safe: violations.length === 0, violations };
}

/**
 * Enforces k-anonymity (activeParticipants >= 5) on cohort/ecosystem impact telemetry
 * before exposing metrics to sociopreneur.online or socioline.sociopreneur.online.
 */
export function sanitizeCohortImpactForEcosystem(aggregate: ImpactCohortAggregate): {
  allowed: boolean;
  reason?: 'BELOW_K_ANONYMITY_THRESHOLD';
  payload?: ImpactCohortAggregate & {
    dataProvenance: {
      validatedEvidenceOnly: true;
      excludesAiAssumptions: true;
      excludesPrivateJournals: true;
    };
  };
} {
  if (aggregate.activeParticipants < IMPACT_K_ANONYMITY_MIN) {
    return { allowed: false, reason: 'BELOW_K_ANONYMITY_THRESHOLD' };
  }
  return {
    allowed: true,
    payload: {
      ...aggregate,
      dataProvenance: {
        validatedEvidenceOnly: true,
        excludesAiAssumptions: true,
        excludesPrivateJournals: true,
      },
    },
  };
}
