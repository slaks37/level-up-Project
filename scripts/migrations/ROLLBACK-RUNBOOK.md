# LevelUp 2.0 — Deployment & Rollback Runbook (Stage 12)

## 1. Safe Zero-Downtime Deployment Sequence
1. **Pre-Deploy Backup (Mandatory before first v4 cutover):**
   ```bash
   gcloud firestore export gs://level-up-os-sl26-backups/pre-v2-$(date +%Y%m%d-%H%M) --project=level-up-os-sl26
   ```
2. **Verify Local & CI Quality Gates:**
   ```bash
   npm run typecheck && npm test && npm run build
   npm --prefix server run build && npm --prefix server test
   ```
3. **Deploy Firestore Rules & Composite Indexes First:**
   ```bash
   firebase deploy --only firestore:rules,firestore:indexes --project level-up-os-sl26
   ```
4. **Run Non-Destructive Privacy Migration (`M2`) in Dry-Run, then Commit:**
   ```bash
   node scripts/migrations/m2-privacy-backfill.mjs --dry-run
   node scripts/migrations/m2-privacy-backfill.mjs --commit
   ```
5. **Deploy Web App (Direct Live Web App — No PWA / No Offline Guest Trial):**
   ```bash
   firebase deploy --only hosting --project level-up-os-sl26
   ```
6. **Progressive Feature Flag Rollout (`appConfig/featureFlags` in Admin Control Center):**
   - Step A: Keep all v2 flags `false` for general users; add `__staff__` to `cohortAllowlist` for internal verification.
   - Step B: Add pilot cohort IDs to `cohortAllowlist`.
   - Step C: Flip `awakeningV2`, `pathways`, `academy`, `businessStudio`, `agnesV2` to `true` for GA.
   - **Hard Rule:** Keep `myValueRedemption: false` until ALL 10 Pre-Monetary Security Gates in `docs/levelup-v2/05-security-privacy-economy-and-integration.md` pass.

---

## 2. Emergency Rollback Procedures

| Failure Layer | Immediate Action | Target RTO |
| --- | --- | --- |
| **New v2 Feature Bug** | Toggle the affected flag to `false` inside Admin Control Center (`appConfig/featureFlags`). Zero redeploy needed. | < 1 min |
| **Web Frontend Regression** | `firebase hosting:rollback --project level-up-os-sl26` (restores previous Hosting release). | < 3 min |
| **Firestore Rules Permission Error** | `git checkout <previous-known-good-tag> -- firestore.rules && firebase deploy --only firestore:rules --project level-up-os-sl26` | < 3 min |
| **Backend API Revision Issue** | Shift 100% traffic to prior immutable Cloud Run / Render revision. | < 2 min |
| **Wallet Drift Detected** | `POST /v1/wallet/reconcile/:uid` automatically sets `wallet.status = 'frozen'` and halts redemptions pending ledger audit. | Instant |
