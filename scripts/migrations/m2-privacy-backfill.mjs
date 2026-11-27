#!/usr/bin/env node
/**
 * LevelUp 2.0 Migration M2: Privacy Settings Backfill & Telemetry Hygiene (Non-Destructive)
 *
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/to/sa.json node scripts/migrations/m2-privacy-backfill.mjs --dry-run
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/to/sa.json node scripts/migrations/m2-privacy-backfill.mjs --uid <uid> --commit
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/to/sa.json node scripts/migrations/m2-privacy-backfill.mjs --commit
 *
 * Guarantees:
 * - Never deletes any user document, journal, profile, or coin transaction.
 * - Creates users/{uid}/privacy/settings with sensitive toggles explicitly FALSE if absent.
 * - Clears unconsented health/mood fields (lastMood, lastEnergy, lastSleepHours, hasPainAlert)
 *   from users/{uid}.telemetry unless shareWellnessWithCoach === true.
 */

import admin from 'firebase-admin';

const args = new Set(process.argv.slice(2));
const commit = args.has('--commit');
const uidArgIdx = process.argv.indexOf('--uid');
const singleUid = uidArgIdx >= 0 ? process.argv[uidArgIdx + 1] : null;

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: process.env.FIREBASE_PROJECT_ID || 'level-up-os-sl26',
  });
}

const db = admin.firestore();

async function run() {
  console.log(`[M2 Privacy Backfill] Mode: ${commit ? 'COMMIT (LIVE WRITE)' : 'DRY-RUN (READ-ONLY)'}`);
  const userDocs = singleUid
    ? [await db.doc(`users/${singleUid}`).get()].filter((d) => d.exists)
    : (await db.collection('users').get()).docs;

  let privacyCreated = 0;
  let telemetryCleaned = 0;

  for (const userSnap of userDocs) {
    const uid = userSnap.id;
    const privacyRef = db.doc(`users/${uid}/privacy/settings`);
    const privacySnap = await privacyRef.get();
    const shareWellness = privacySnap.exists ? Boolean(privacySnap.data()?.shareWellnessWithCoach) : false;

    if (!privacySnap.exists) {
      privacyCreated++;
      if (commit) {
        await privacyRef.set({
          ownerUid: uid,
          shareCoachingProgressWithMentor: true,
          shareBusinessCanvasesWithMentor: true,
          shareWellnessWithCoach: false,
          sharePrivateJournalWithAgnes: false,
          shareHealthMetricsWithAgnes: false,
          shareAggregatedImpactWithEcosystem: false,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    }

    const telemetry = userSnap.data()?.telemetry;
    const hasUnconsentedWellness =
      !shareWellness &&
      telemetry &&
      (telemetry.lastMood || telemetry.lastEnergy || telemetry.lastSleepHours !== null || telemetry.hasPainAlert);

    if (hasUnconsentedWellness) {
      telemetryCleaned++;
      if (commit) {
        await userSnap.ref.update({
          'telemetry.lastMood': '',
          'telemetry.lastEnergy': '',
          'telemetry.lastSleepHours': null,
          'telemetry.hasPainAlert': false,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    }
  }

  console.log(
    JSON.stringify({
      migration: 'M2_PRIVACY_BACKFILL',
      commit,
      scannedUsers: userDocs.length,
      privacyDocsToCreateOrCreated: privacyCreated,
      telemetryDocsToCleanOrCleaned: telemetryCleaned,
    }, null, 2)
  );
}

run().catch((err) => {
  console.error('[M2 Privacy Backfill] Failed:', err);
  process.exit(1);
});
