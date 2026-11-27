import crypto from 'node:crypto';
import { Router, type Request, type Response, type NextFunction } from 'express';
import { verifyHmacSha256 } from './walletRouter.js';

export const IMPACT_K_ANONYMITY_MIN = 5;

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

export function findForbiddenPrivacyFields(payload: unknown): string[] {
  const violations: string[] = [];
  const walk = (node: unknown, path: string) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) {
      node.forEach((v, i) => walk(v, `${path}[${i}]`));
      return;
    }
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
      const next = path ? `${path}.${k}` : k;
      if (FORBIDDEN_PRIVACY_KEYS.has(k)) violations.push(next);
      walk(v, next);
    }
  };
  walk(payload, '');
  return violations;
}

export interface EcosystemStoreAdapter {
  getProcessedEvent: (idempotencyKey: string) => Promise<Record<string, unknown> | null>;
  saveProcessedEvent: (idempotencyKey: string, meta: Record<string, unknown>) => Promise<void>;
  findUidByVerifiedEmail: (emailLower: string) => Promise<string | null>;
  activateCourseEnrollment: (params: {
    uid: string;
    courseId: string;
    cohortId?: string;
    externalOrderId: string;
  }) => Promise<{ enrollmentId: string }>;
  savePendingEmailEnrollment: (params: {
    emailHash: string;
    emailLower: string;
    courseId: string;
    cohortId?: string;
    externalOrderId: string;
  }) => Promise<{ pendingId: string }>;
  revokeCourseEnrollment: (params: {
    uid: string | null;
    emailHash: string;
    courseId: string;
    externalOrderId: string;
    revokeCertificate: boolean;
  }) => Promise<{ enrollmentId: string; previousStatus: string; certificateRevoked: boolean }>;
  updateVentureMarketplaceStatus: (params: {
    ventureId: string;
    externalProductId?: string;
    status: string;
    reviewNotes?: string;
    requiredFixes?: string[];
  }) => Promise<{ updated: boolean }>;
  recordMarketplaceFeedback: (params: {
    ventureId: string;
    periodKey: string;
    eventId: string;
    unitsSold: number;
    grossRevenueIdr: number;
    isRepeatCustomer?: boolean;
    customerRating?: number;
    b2bInquiryCount?: number;
  }) => Promise<void>;
  getCohortImpactAggregate: (cohortId: string, period: string) => Promise<{
    activeParticipants: number;
    verifiedCompetenciesAwarded: number;
    certificatesIssued: number;
    venturesByStage: Record<string, number>;
    marketplaceListedProducts: number;
    householdsBenefited: number;
    jobsSustained: number;
  } | null>;
}

export interface EcosystemRouterDeps {
  requireAuth: (req: Request, res: Response, next: NextFunction) => void | Promise<void>;
  ecosystemSharedSecret: () => string;
  store: EcosystemStoreAdapter;
}

/**
 * All 5 Sociopreneur.online & Socioline Ecosystem Integration API Contracts (Stage 11).
 * Independent deployments, no shared DB, HMAC-SHA256 + timestamp replay protection,
 * idempotency keys, strict buyer-PII & Tier 1 journal firewall, and k-anonymity (k >= 5).
 */
export function createEcosystemRouter(deps: EcosystemRouterDeps): Router {
  const router = Router();

  const requireSignedEcosystemCaller = (req: Request, res: Response, next: NextFunction): void => {
    const rawBody =
      req.method === 'GET'
        ? req.originalUrl
        : (req as Request & { rawBody?: string }).rawBody ?? JSON.stringify(req.body || {});
    const ts = Number(req.headers['x-socio-timestamp'] || 0);
    const sig = String(req.headers['x-socio-signature'] || '');
    const client = String(req.headers['x-socio-client'] || '');
    if (!client) {
      res.status(401).json({ error: { code: 'MISSING_CLIENT_HEADER', message: 'X-Socio-Client header required.' } });
      return;
    }
    const verified = verifyHmacSha256(deps.ecosystemSharedSecret(), ts, rawBody, sig);
    if (!verified.ok) {
      res.status(401).json({ error: { code: verified.reason, message: 'Invalid ecosystem HMAC signature.' } });
      return;
    }
    const violations = findForbiddenPrivacyFields(req.body);
    if (violations.length > 0) {
      res.status(400).json({
        error: {
          code: 'PRIVACY_FIREWALL_VIOLATION',
          message: `Forbidden sensitive/PII fields rejected: ${violations.join(', ')}`,
        },
      });
      return;
    }
    next();
  };

  // CONTRACT 1: Verified Course Purchase -> LevelUp Enrollment (supports pending claim if not signed up yet)
  router.post('/enrollments', requireSignedEcosystemCaller, async (req: Request, res: Response) => {
    const idempKey = String(req.headers['x-socio-idempotency-key'] || req.body?.eventId || '').trim();
    if (!idempKey) {
      res.status(400).json({ error: { code: 'MISSING_IDEMPOTENCY_KEY', message: 'X-Socio-Idempotency-Key required.' } });
      return;
    }

    const cached = await deps.store.getProcessedEvent(idempKey);
    if (cached) {
      res.status(200).json({ ...cached, idempotentReplay: true });
      return;
    }

    const body = req.body as {
      externalOrderId?: string;
      buyer?: { email?: string; displayName?: string };
      course?: { levelupCourseId?: string; cohortId?: string };
    };
    const emailLower = String(body.buyer?.email || '').trim().toLowerCase();
    const courseId = String(body.course?.levelupCourseId || '').trim();
    const orderId = String(body.externalOrderId || '').trim();
    if (!emailLower || !courseId || !orderId) {
      res.status(400).json({ error: { code: 'INVALID_ENROLLMENT_PAYLOAD', message: 'buyer.email, course.levelupCourseId, and externalOrderId required.' } });
      return;
    }

    const uid = await deps.store.findUidByVerifiedEmail(emailLower);
    let responsePayload: Record<string, unknown>;
    if (uid) {
      const { enrollmentId } = await deps.store.activateCourseEnrollment({
        uid,
        courseId,
        cohortId: body.course?.cohortId,
        externalOrderId: orderId,
      });
      responsePayload = {
        status: 'enrolled',
        enrollmentId,
        activationState: 'active',
        levelupUid: uid,
        deepLinkUrl: `https://levelup.sociopreneur.online/academy/${encodeURIComponent(courseId)}`,
        processedAt: new Date().toISOString(),
      };
    } else {
      const emailHash = crypto.createHash('sha256').update(emailLower).digest('hex');
      const { pendingId } = await deps.store.savePendingEmailEnrollment({
        emailHash,
        emailLower,
        courseId,
        cohortId: body.course?.cohortId,
        externalOrderId: orderId,
      });
      responsePayload = {
        status: 'pending_account_claim',
        enrollmentId: pendingId,
        activationState: 'pending_email_verification',
        levelupUid: null,
        deepLinkUrl: `https://levelup.sociopreneur.online/?claim=${encodeURIComponent(orderId)}`,
        processedAt: new Date().toISOString(),
      };
    }

    await deps.store.saveProcessedEvent(idempKey, responsePayload);
    res.status(201).json(responsePayload);
  });

  // CONTRACT 2: Refund & Access Revocation (preserves personal profile, journals & non-course progress)
  router.post('/enrollments/revoke', requireSignedEcosystemCaller, async (req: Request, res: Response) => {
    const idempKey = String(req.headers['x-socio-idempotency-key'] || req.body?.eventId || '').trim();
    if (!idempKey) {
      res.status(400).json({ error: { code: 'MISSING_IDEMPOTENCY_KEY', message: 'X-Socio-Idempotency-Key required.' } });
      return;
    }

    const cached = await deps.store.getProcessedEvent(idempKey);
    if (cached) {
      res.status(200).json({ ...cached, idempotentReplay: true });
      return;
    }

    const body = req.body as {
      externalOrderId?: string;
      levelupCourseId?: string;
      buyerEmail?: string;
      revokeCertificate?: boolean;
    };
    const emailLower = String(body.buyerEmail || '').trim().toLowerCase();
    const courseId = String(body.levelupCourseId || '').trim();
    const orderId = String(body.externalOrderId || '').trim();
    if (!emailLower || !courseId || !orderId) {
      res.status(400).json({ error: { code: 'INVALID_REVOKE_PAYLOAD', message: 'buyerEmail, levelupCourseId, and externalOrderId required.' } });
      return;
    }

    const uid = await deps.store.findUidByVerifiedEmail(emailLower);
    const emailHash = crypto.createHash('sha256').update(emailLower).digest('hex');
    const result = await deps.store.revokeCourseEnrollment({
      uid,
      emailHash,
      courseId,
      externalOrderId: orderId,
      revokeCertificate: Boolean(body.revokeCertificate),
    });

    const responsePayload = {
      status: 'revoked',
      enrollmentId: result.enrollmentId,
      previousStatus: result.previousStatus,
      certificateRevoked: result.certificateRevoked,
      personalDataPreserved: true,
      processedAt: new Date().toISOString(),
    };
    await deps.store.saveProcessedEvent(idempKey, responsePayload);
    res.status(200).json(responsePayload);
  });

  // CONTRACT 3A: Outbound Product Submission (Founder -> Sociopreneur.online, explicit consent + privacy check)
  router.post('/products/submit', deps.requireAuth, async (req: Request, res: Response) => {
    const body = (req.body || {}) as {
      venture?: { levelupVentureId?: string; businessName?: string };
      product?: { title?: string; suggestedRetailPriceIdr?: number };
      consentRecord?: { founderConsentedAt?: string; consentVersion?: string };
    };
    if (!body.consentRecord?.founderConsentedAt) {
      res.status(400).json({ error: { code: 'CONSENT_REQUIRED', message: 'Explicit founder consent required for marketplace submission.' } });
      return;
    }
    const violations = findForbiddenPrivacyFields(body);
    if (violations.length > 0) {
      res.status(400).json({ error: { code: 'PRIVACY_FIREWALL_VIOLATION', message: `Forbidden fields: ${violations.join(', ')}` } });
      return;
    }
    const ventureId = String(body.venture?.levelupVentureId || '').trim();
    if (!ventureId || !body.product?.title) {
      res.status(400).json({ error: { code: 'INVALID_PRODUCT_SUBMISSION', message: 'venture.levelupVentureId and product.title required.' } });
      return;
    }
    await deps.store.updateVentureMarketplaceStatus({ ventureId, status: 'submitted' });
    res.status(202).json({
      ok: true,
      submissionId: `sub_${ventureId}_${Date.now().toString(36)}`,
      status: 'submitted',
      privacyVerified: true,
    });
  });

  // CONTRACT 3B: Inbound Product Review Status Callback (Sociopreneur.online -> LevelUp)
  router.post('/products/status', requireSignedEcosystemCaller, async (req: Request, res: Response) => {
    const idempKey = String(req.headers['x-socio-idempotency-key'] || `${req.body?.submissionId}:${req.body?.status}` || '').trim();
    const cached = idempKey ? await deps.store.getProcessedEvent(idempKey) : null;
    if (cached) {
      res.status(200).json({ ...cached, idempotentReplay: true });
      return;
    }

    const body = req.body as {
      levelupVentureId?: string;
      externalProductId?: string;
      status?: string;
      reviewNotes?: string;
      requiredFixes?: string[];
    };
    const allowedStatuses = new Set(['under_review', 'changes_requested', 'approved', 'listed', 'rejected', 'delisted']);
    if (!body.levelupVentureId || !body.status || !allowedStatuses.has(body.status)) {
      res.status(400).json({ error: { code: 'INVALID_PRODUCT_STATUS', message: 'Valid levelupVentureId and status required.' } });
      return;
    }

    await deps.store.updateVentureMarketplaceStatus({
      ventureId: body.levelupVentureId,
      externalProductId: body.externalProductId,
      status: body.status,
      reviewNotes: body.reviewNotes,
      requiredFixes: Array.isArray(body.requiredFixes) ? body.requiredFixes.slice(0, 10) : [],
    });

    const responsePayload = {
      ok: true,
      levelupVentureId: body.levelupVentureId,
      marketplaceStatus: body.status,
      milestoneEvidenceEligible: body.status === 'approved' || body.status === 'listed',
      processedAt: new Date().toISOString(),
    };
    if (idempKey) await deps.store.saveProcessedEvent(idempKey, responsePayload);
    res.status(200).json(responsePayload);
  });

  // CONTRACT 4: Marketplace Order & B2B Inquiry Feedback (Stripped of buyer PII -> validated_evidence)
  router.post('/marketplace/orders/webhook', requireSignedEcosystemCaller, async (req: Request, res: Response) => {
    const idempKey = String(req.headers['x-socio-idempotency-key'] || req.body?.eventId || '').trim();
    if (!idempKey) {
      res.status(400).json({ error: { code: 'MISSING_IDEMPOTENCY_KEY', message: 'X-Socio-Idempotency-Key required.' } });
      return;
    }
    const cached = await deps.store.getProcessedEvent(idempKey);
    if (cached) {
      res.status(200).json({ ...cached, idempotentReplay: true });
      return;
    }

    const body = req.body as {
      eventId?: string;
      levelupVentureId?: string;
      periodKey?: string;
      metrics?: {
        unitsSold?: number;
        grossRevenueIdr?: number;
        isRepeatCustomer?: boolean;
        customerRating?: number;
        b2bInquiryCount?: number;
      };
    };
    if (!body.levelupVentureId || !body.periodKey || !body.metrics) {
      res.status(400).json({ error: { code: 'INVALID_ORDER_FEEDBACK', message: 'levelupVentureId, periodKey, and metrics required.' } });
      return;
    }

    await deps.store.recordMarketplaceFeedback({
      ventureId: body.levelupVentureId,
      periodKey: body.periodKey,
      eventId: body.eventId || idempKey,
      unitsSold: Math.max(0, Math.round(Number(body.metrics.unitsSold) || 0)),
      grossRevenueIdr: Math.max(0, Math.round(Number(body.metrics.grossRevenueIdr) || 0)),
      isRepeatCustomer: Boolean(body.metrics.isRepeatCustomer),
      customerRating: typeof body.metrics.customerRating === 'number' ? body.metrics.customerRating : undefined,
      b2bInquiryCount: Math.max(0, Math.round(Number(body.metrics.b2bInquiryCount) || 0)),
    });

    const responsePayload = {
      ok: true,
      levelupVentureId: body.levelupVentureId,
      periodKey: body.periodKey,
      originTag: 'validated_evidence',
      processedAt: new Date().toISOString(),
    };
    await deps.store.saveProcessedEvent(idempKey, responsePayload);
    res.status(200).json(responsePayload);
  });

  // CONTRACT 5: Consented & k-Anonymized Business Performance & Social Impact Telemetry
  router.get('/impact/summary', requireSignedEcosystemCaller, async (req: Request, res: Response) => {
    const cohortId = String(req.query.id || '').trim();
    const period = String(req.query.period || new Date().toISOString().slice(0, 7)).trim();
    if (!cohortId) {
      res.status(400).json({ error: { code: 'MISSING_COHORT_ID', message: 'Query parameter id is required.' } });
      return;
    }

    const agg = await deps.store.getCohortImpactAggregate(cohortId, period);
    if (!agg) {
      res.status(404).json({ error: { code: 'COHORT_NOT_FOUND', message: 'Cohort impact snapshot not found.' } });
      return;
    }
    if (agg.activeParticipants < IMPACT_K_ANONYMITY_MIN) {
      res.status(403).json({
        error: {
          code: 'BELOW_K_ANONYMITY_THRESHOLD',
          message: `Cohort impact requires at least ${IMPACT_K_ANONYMITY_MIN} active participants to protect learner privacy.`,
        },
      });
      return;
    }

    res.json({
      snapshotId: `imp_${period}_${cohortId}`,
      scope: 'cohort',
      scopeId: cohortId,
      period,
      kAnonymityThreshold: IMPACT_K_ANONYMITY_MIN,
      aggregates: agg,
      dataProvenance: {
        validatedEvidenceOnly: true,
        excludesAiAssumptions: true,
        excludesPrivateJournals: true,
      },
      generatedAt: new Date().toISOString(),
    });
  });

  return router;
}
