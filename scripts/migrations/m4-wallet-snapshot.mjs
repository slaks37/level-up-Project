#!/usr/bin/env node
/**
 * LevelUp 2.0 Migration M4: Server-Authoritative Wallet Snapshot Backfill (Non-Destructive & Idempotent)
 *
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/to/sa.json node scripts/migrations/m4-wallet-snapshot.mjs --dry-run
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/to/sa.json node scripts/migrations/m4-wallet-snapshot.mjs --uid <uid> --commit
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/to/sa.json node scripts/migrations/m4-wallet-snapshot.mjs --commit
 *
 * Guarantees:
 * - Preserves existing profile/main.gold and legacy coinTransactions/* untouched.
 * - Uses deterministic opening entry ID `migration:v3_opening_balance:{uid}` so re-running is 100% idempotent.
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
  console.log(`[M4 Wallet Snapshot] Mode: ${commit ? 'COMMIT (LIVE WRITE)' : 'DRY-RUN (READ-ONLY)'}`);
  const userDocs = singleUid
    ? [await db.doc(`users/${singleUid}`).get()].filter((d) => d.exists)
    : (await db.collection('users').get()).docs;

  let snapshotted = 0;
  let skippedExisting = 0;
  let totalCoinsSnapshotted = 0;

  for (const userSnap of userDocs) {
    const uid = userSnap.id;
    const eventKey = `migration:v3_opening_balance:${uid}`;
    const walletRef = db.doc(`users/${uid}/wallet/main`);
    const ledgerRef = db.doc(`users/${uid}/walletLedger/${encodeURIComponent(eventKey)}`);

    const [profileSnap, existingLedger] = await Promise.all([
      db.doc(`users/${uid}/profile/main`).get(),
      ledgerRef.get(),
    ]);

    if (existingLedger.exists) {
      skippedExisting++;
      continue;
    }

    const openingGold = profileSnap.exists ? Math.max(0, Math.round(Number(profileSnap.data()?.gold) || 0)) : 0;
    snapshotted++;
    totalCoinsSnapshotted += openingGold;

    if (commit) {
      const now = Date.now();
      await db.runTransaction(async (tx) => {
        if ((await tx.get(ledgerRef)).exists) return;
        tx.set(walletRef, {
          ownerUid: uid,
          balance: openingGold,
          lifetimeEarned: openingGold,
          lifetimeRedeemed: 0,
          pendingHold: 0,
          lastLedgerSeq: 1,
          status: 'active',
          dailyEarnedDate: '',
          dailyEarnedCount: 0,
          updatedAt: now,
        });
        tx.set(ledgerRef, {
          eventKey,
          ownerUid: uid,
          seq: 1,
          type: 'migration_opening',
          source: 'migration',
          amount: openingGold,
          balanceBefore: 0,
          balanceAfter: openingGold,
          note: 'Opening coin balance snapshot from v3 profile/main.gold',
          createdAt: now,
        });
      });
    }
  }

  console.log(
    JSON.stringify({
      migration: 'M4_WALLET_SNAPSHOT',
      commit,
      scannedUsers: userDocs.length,
      walletsSnapshotted: snapshotted,
      skippedAlreadyMigrated: skippedExisting,
      totalCoinsSnapshotted,
    }, null, 2)
  );
}

run().catch((err) => {
  console.error('[M4 Wallet Snapshot] Failed:', err);
  process.exit(1);
});
