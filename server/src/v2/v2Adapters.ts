import type admin from 'firebase-admin';
import type { ServerPrivacyConsent } from './agnesV2Router.js';
import type { ServerLedgerEntry, WalletRecord, WalletStoreAdapter } from './walletRouter.js';
import type { EcosystemStoreAdapter } from './ecosystemRouter.js';

export function createFirestoreWalletStore(db: admin.firestore.Firestore | null): WalletStoreAdapter {
  const memWallets = new Map<string, WalletRecord>();
  const memLedgers = new Map<string, ServerLedgerEntry[]>();
  const memWebhooks = new Set<string>();

  const defaultWallet = (uid: string): WalletRecord => ({
    ownerUid: uid,
    balance: 0,
    lifetimeEarned: 0,
    lifetimeRedeemed: 0,
    pendingHold: 0,
    lastLedgerSeq: 0,
    status: 'active',
    dailyEarnedDate: '',
    dailyEarnedCount: 0,
  });

  return {
    async getFeatureFlags() {
      if (!db) return { serverWallet: false, myValueRedemption: false };
      const snap = await db.doc('appConfig/featureFlags').get().catch(() => null);
      const d = snap?.data() || {};
      const serverWallet = Boolean(d.serverWallet);
      return { serverWallet, myValueRedemption: serverWallet && Boolean(d.myValueRedemption) };
    },
    async getWallet(uid) {
      if (!db) return memWallets.get(uid) || defaultWallet(uid);
      const snap = await db.doc(`users/${uid}/wallet/main`).get();
      if (!snap.exists) return defaultWallet(uid);
      const d = snap.data() || {};
      return {
        ownerUid: uid,
        balance: Number(d.balance || 0),
        lifetimeEarned: Number(d.lifetimeEarned || 0),
        lifetimeRedeemed: Number(d.lifetimeRedeemed || 0),
        pendingHold: Number(d.pendingHold || 0),
        lastLedgerSeq: Number(d.lastLedgerSeq || 0),
        status: d.status === 'frozen' ? 'frozen' : 'active',
        dailyEarnedDate: String(d.dailyEarnedDate || ''),
        dailyEarnedCount: Number(d.dailyEarnedCount || 0),
      };
    },
    async getLedgerEntry(uid, eventKey) {
      if (!db) return (memLedgers.get(uid) || []).find((e) => e.eventKey === eventKey) || null;
      const snap = await db.doc(`users/${uid}/walletLedger/${encodeURIComponent(eventKey)}`).get();
      if (!snap.exists) return null;
      return snap.data() as ServerLedgerEntry;
    },
    async listLedger(uid) {
      if (!db) return [...(memLedgers.get(uid) || [])];
      const snap = await db.collection(`users/${uid}/walletLedger`).orderBy('seq', 'asc').get();
      return snap.docs.map((d) => d.data() as ServerLedgerEntry);
    },
    async applyLedgerTransaction(uid, eventKey, mutator) {
      if (!db) {
        const list = memLedgers.get(uid) || [];
        const existing = list.find((e) => e.eventKey === eventKey);
        const curWallet = memWallets.get(uid) || defaultWallet(uid);
        if (existing) return { wallet: curWallet, entry: existing, idempotentReplay: true };
        const { nextWallet, entry } = mutator(curWallet);
        const fullEntry: ServerLedgerEntry = {
          ...entry,
          eventKey,
          ownerUid: uid,
          seq: nextWallet.lastLedgerSeq,
          createdAt: Date.now(),
        };
        memWallets.set(uid, nextWallet);
        memLedgers.set(uid, [...list, fullEntry]);
        return { wallet: nextWallet, entry: fullEntry, idempotentReplay: false };
      }

      const walletRef = db.doc(`users/${uid}/wallet/main`);
      const ledgerRef = db.doc(`users/${uid}/walletLedger/${encodeURIComponent(eventKey)}`);
      const profileRef = db.doc(`users/${uid}/profile/main`);

      return db.runTransaction(async (tx) => {
        const [wSnap, lSnap, pSnap] = await Promise.all([tx.get(walletRef), tx.get(ledgerRef), tx.get(profileRef)]);
        const curWallet: WalletRecord = wSnap.exists ? (wSnap.data() as WalletRecord) : defaultWallet(uid);
        if (lSnap.exists) {
          return { wallet: curWallet, entry: lSnap.data() as ServerLedgerEntry, idempotentReplay: true };
        }
        const { nextWallet, entry } = mutator(curWallet);
        const fullEntry: ServerLedgerEntry = {
          ...entry,
          eventKey,
          ownerUid: uid,
          seq: nextWallet.lastLedgerSeq,
          createdAt: Date.now(),
        };
        tx.set(walletRef, { ...nextWallet, updatedAt: Date.now() });
        tx.set(ledgerRef, fullEntry);
        if (pSnap.exists) {
          tx.update(profileRef, { gold: nextWallet.balance });
        }
        return { wallet: nextWallet, entry: fullEntry, idempotentReplay: false };
      });
    },
    async freezeWallet(uid, reason) {
      if (!db) {
        const w = memWallets.get(uid) || defaultWallet(uid);
        memWallets.set(uid, { ...w, status: 'frozen' });
        return;
      }
      await db.doc(`users/${uid}/wallet/main`).set({ ownerUid: uid, status: 'frozen', freezeReason: reason, updatedAt: Date.now() }, { merge: true });
    },
    async hasProcessedWebhook(eventId) {
      if (!db) return memWebhooks.has(eventId);
      const snap = await db.doc(`integrationEvents/${encodeURIComponent(eventId)}`).get();
      return snap.exists;
    },
    async markWebhookProcessed(eventId, meta) {
      if (!db) {
        memWebhooks.add(eventId);
        return;
      }
      await db.doc(`integrationEvents/${encodeURIComponent(eventId)}`).set({ ...meta, processedAt: Date.now(), status: 'processed' });
    },
  };
}

export function createFirestoreEcosystemStore(db: admin.firestore.Firestore | null): EcosystemStoreAdapter {
  const memEvents = new Map<string, Record<string, unknown>>();
  const memEmails = new Map<string, string>();
  const memEnrollments = new Map<string, Record<string, unknown>>();
  const memVentures = new Map<string, Record<string, unknown>>();

  return {
    async getProcessedEvent(key) {
      if (!db) return memEvents.get(key) || null;
      const snap = await db.doc(`integrationEvents/${encodeURIComponent(key)}`).get();
      return snap.exists ? ((snap.data()?.responsePayload as Record<string, unknown>) || (snap.data() as Record<string, unknown>)) : null;
    },
    async saveProcessedEvent(key, responsePayload) {
      if (!db) {
        memEvents.set(key, responsePayload);
        return;
      }
      await db.doc(`integrationEvents/${encodeURIComponent(key)}`).set({
        idempotencyKey: key,
        status: 'processed',
        responsePayload,
        createdAt: Date.now(),
      });
    },
    async findUidByVerifiedEmail(emailLower) {
      if (!db) return memEmails.get(emailLower) || null;
      const snap = await db.collection('users').where('email', '==', emailLower).limit(1).get();
      return snap.empty ? null : snap.docs[0].id;
    },
    async activateCourseEnrollment({ uid, courseId, cohortId, externalOrderId }) {
      const enrollmentId = `${uid}_${courseId}`;
      const record = {
        uid,
        courseId,
        ...(cohortId ? { cohortId } : {}),
        source: 'sociopreneur_order',
        externalOrderId,
        status: 'active',
        completedLessonIds: [],
        progressPct: 0,
        enrolledAt: Date.now(),
      };
      if (!db) {
        memEnrollments.set(enrollmentId, record);
        return { enrollmentId };
      }
      await db.doc(`enrollments/${enrollmentId}`).set(record, { merge: true });
      return { enrollmentId };
    },
    async savePendingEmailEnrollment({ emailHash, emailLower, courseId, cohortId, externalOrderId }) {
      const pendingId = `${emailHash.slice(0, 24)}_${courseId}`;
      const record = {
        emailHash,
        emailLower,
        courseId,
        ...(cohortId ? { cohortId } : {}),
        externalOrderId,
        status: 'pending_account_claim',
        createdAt: Date.now(),
      };
      if (!db) {
        memEnrollments.set(pendingId, record);
        return { pendingId };
      }
      await db.doc(`pendingEnrollments/${pendingId}`).set(record, { merge: true });
      return { pendingId };
    },
    async revokeCourseEnrollment({ uid, emailHash, courseId, externalOrderId, revokeCertificate }) {
      const enrollmentId = uid ? `${uid}_${courseId}` : `${emailHash.slice(0, 24)}_${courseId}`;
      if (!db) {
        const prev = memEnrollments.get(enrollmentId);
        const prevStatus = String(prev?.status || 'active');
        memEnrollments.set(enrollmentId, { ...(prev || {}), status: 'revoked_refund', externalOrderId, revokedAt: Date.now() });
        return { enrollmentId, previousStatus: prevStatus, certificateRevoked: Boolean(revokeCertificate && prev?.certificateCode) };
      }
      const ref = uid ? db.doc(`enrollments/${enrollmentId}`) : db.doc(`pendingEnrollments/${enrollmentId}`);
      const snap = await ref.get();
      const prevStatus = snap.exists ? String(snap.data()?.status || 'active') : 'not_found';
      const certCode = snap.exists ? String(snap.data()?.certificateCode || '') : '';
      await ref.set({ status: 'revoked_refund', revokedOrderId: externalOrderId, revokedAt: Date.now() }, { merge: true });
      let certificateRevoked = false;
      if (revokeCertificate && certCode) {
        await db.doc(`certificates/${certCode}`).set({ status: 'revoked', revokedReason: 'order_refund', revokedAt: Date.now() }, { merge: true });
        certificateRevoked = true;
      }
      return { enrollmentId, previousStatus: prevStatus, certificateRevoked };
    },
    async updateVentureMarketplaceStatus({ ventureId, externalProductId, status, reviewNotes, requiredFixes }) {
      if (!db) {
        memVentures.set(ventureId, { status, externalProductId, reviewNotes, requiredFixes });
        return { updated: true };
      }
      const snap = await db.collectionGroup('ventures').where('id', '==', ventureId).limit(1).get().catch(() => null);
      if (snap && !snap.empty) {
        await snap.docs[0].ref.set(
          {
            marketplaceStatus: status,
            ...(externalProductId ? { externalProductId } : {}),
            ...(reviewNotes ? { marketplaceReviewNotes: reviewNotes.slice(0, 500) } : {}),
            ...(requiredFixes?.length ? { marketplaceRequiredFixes: requiredFixes } : {}),
            updatedAt: Date.now(),
          },
          { merge: true }
        );
        return { updated: true };
      }
      return { updated: false };
    },
    async recordMarketplaceFeedback({ ventureId, periodKey, eventId, unitsSold, grossRevenueIdr, isRepeatCustomer, customerRating, b2bInquiryCount }) {
      if (!db) return;
      const snap = await db.collectionGroup('ventures').where('id', '==', ventureId).limit(1).get().catch(() => null);
      if (snap && !snap.empty) {
        await snap.docs[0].ref.collection('marketFeedback').doc(`${periodKey}_${eventId}`).set({
          eventId,
          periodKey,
          unitsSold,
          grossRevenueIdr,
          isRepeatCustomer: Boolean(isRepeatCustomer),
          ...(typeof customerRating === 'number' ? { customerRating } : {}),
          b2bInquiryCount: b2bInquiryCount || 0,
          originTag: 'validated_evidence',
          recordedAt: Date.now(),
        });
      }
    },
    async getCohortImpactAggregate(cohortId) {
      if (!db) return null;
      const snap = await db.doc(`cohortImpactSummaries/${cohortId}`).get().catch(() => null);
      if (!snap || !snap.exists) return null;
      const d = snap.data() || {};
      return {
        activeParticipants: Number(d.activeParticipants || 0),
        verifiedCompetenciesAwarded: Number(d.verifiedCompetenciesAwarded || 0),
        certificatesIssued: Number(d.certificatesIssued || 0),
        venturesByStage: (d.venturesByStage as Record<string, number>) || {},
        marketplaceListedProducts: Number(d.marketplaceListedProducts || 0),
        householdsBenefited: Number(d.householdsBenefited || 0),
        jobsSustained: Number(d.jobsSustained || 0),
      };
    },
  };
}

export async function readUserPrivacyConsent(
  db: admin.firestore.Firestore | null,
  uid: string
): Promise<ServerPrivacyConsent> {
  if (!db) return { sharePrivateJournalWithAgnes: false, shareHealthMetricsWithAgnes: false };
  const snap = await db.doc(`users/${uid}/privacy/settings`).get().catch(() => null);
  if (!snap || !snap.exists) return { sharePrivateJournalWithAgnes: false, shareHealthMetricsWithAgnes: false };
  const d = snap.data() || {};
  return {
    sharePrivateJournalWithAgnes: Boolean(d.sharePrivateJournalWithAgnes),
    shareHealthMetricsWithAgnes: Boolean(d.shareHealthMetricsWithAgnes),
  };
}
