# 06 — Migration, Rollback, Backlog, Sprints, Testing, Risks & GO/NO-GO

> **Deliverables Covered:**
> - Deliverable #15 (Migration and Rollback Plan — Stage 12)
> - Deliverable #16 (Prioritized Development Backlog)
> - Deliverable #17 (Sprint Planning)
> - Deliverable #18 (Testing and Acceptance Criteria)
> - Deliverable #19 (Risks, Dependencies, Blockers & Phase-by-Phase GO/NO-GO)

---

## 15. Migration & Rollback Plan (Stage 12)

### 15.1 Core Migration Principles
1. **Zero Destructive Production Migrations:** Never drop, rename, or overwrite existing collections (`users/{uid}`, `profile/main`, `journal/*`, `dailyLogs/*`, `coinTransactions/*`, `calendar/latest`).
2. **100% Preservation Guarantee:** Every existing Firebase UID, login method, level, EXP, rank, quest history, 5-phase Dream Map, permanent skill, journal record, streak, and coin balance survives unchanged.
3. **Versioned, Idempotent & Dry-Run First:** Every data migration script lives in `scripts/migrations/` with `--dry-run`, `--uid <single-test-uid>`, and `--commit` flags, tested first on Firebase Local Emulator and Staging before production execution.
4. **Automated Pre-Migration Backup:** Before any Phase 0/1/5 production migration or rule change, export Firestore (`gcloud firestore export gs://level-up-os-sl26-backups/pre-v2-<date>`) and verify PITR (Point-in-Time Recovery) status.

---

### 15.2 Four Versioned Migration Tracks

#### Track M1 — Profile Schema `v3 → v4` (Lazy Read-Time, Zero Downtime)
- **Target:** `users/{uid}/profile/main` (`PLAYER_SCHEMA_VERSION: 3 → 4`).
- **Execution Strategy:**
  - All new v4 fields (`pathwayId`, `purposeStatement`, `awakeningV2Completed`, `competencyLevel`, `businessLevel`, `activeVentureId`, `Quest.dimension`, `DreamStep.stageCode`) are **strictly optional** in `types.ts` and `firestore.rules`.
  - `normalizeProfile()` in client code transparently defaults missing v4 fields in-memory (`pathwayId: 'personal_growth'`, `competencyLevel: 1`, `businessLevel: 0`, `awakeningV2Completed: false`).
  - Existing users see a non-intrusive opt-in banner: *"Upgrade ke Awakening 2.0 (opsional — progres lama 100% aman)"*. Users who dismiss it keep their exact v1 experience forever.
  - Because no existing v3 required field is removed or renamed, an older cached PWA tab (v3.3.0) will not crash while Service Worker updates roll out.

#### Track M2 — Privacy & Telemetry Hygiene Migration (Phase 0)
- **Target:** `users/{uid}/privacy/settings` (new) + `users/{uid}.telemetry` (strip sensitive wellness keys).
- **Execution Steps:**
  1. Deploy frontend update removing `lastMood`, `lastSleepHours`, and `hasPainAlert` writes to global `users/{uid}.telemetry` and updating Admin Participant Inspector to respect Tier 1 privacy boundaries.
  2. Run idempotent backfill `scripts/migrations/2026_m2_privacy_backfill.ts`:
     - Creates `users/{uid}/privacy/settings` for every existing user with all sensitive sharing toggles explicitly set to **`false`** (`shareWellnessWithCoach: false`, `sharePrivateJournalWithAgnes: false`, `shareHealthMetricsWithAgnes: false`, `shareAggregatedImpactWithEcosystem: false`).
     - Strips `telemetry.lastMood`, `telemetry.lastSleepHours`, and `telemetry.hasPainAlert` from `users/{uid}` while preserving `level`, `exp`, `streak`, `activeQuestsCount`, and `lastActiveDate`.
  3. Deploy hardened `firestore.rules` revoking `isStaff()` reads on `journal/*`, `dailyLogs/*`, and `calendar/latest`.

#### Track M3 — RBAC Unification (`admins/{uid}` + `adminEmails/{email}` → `staffRoles/{uid}` + Custom Claims)
- **Target:** Admin & staff authorization across Frontend, Backend API, and Firestore Rules.
- **Execution Steps:**
  1. Deploy `staffRoles/{uid}` schema and server-side claim-sync utility (`syncStaffCustomClaims(uid)`).
  2. Run idempotent migration `scripts/migrations/2026_m3_rbac_claims.ts` reading active `admins/{uid}` and `adminEmails/{email}` records, creating canonical `staffRoles/{uid}` documents, and setting Firebase Auth Custom Claims (`roles: ['admin']` or `['super_admin']`, `rbacVersion: 1`).
  3. Run a **7-day dual-read transition window** where rules accept Auth Custom Claims (primary) OR verified legacy `adminEmails` (fallback), verifying zero staff lockouts.
  4. Only **after explicit approval** and verified break-glass Super Admin CLI recovery runbook: remove hardcoded `stefenlaksana.sl@gmail.com` literals and legacy `admins/{uid}` rule paths.

#### Track M4 — Server-Authoritative Coin Economy Cutover (Phase 5)
- **Target:** `users/{uid}/profile/main.gold` + `coinTransactions/*` → `users/{uid}/wallet/main` + `users/{uid}/walletLedger/{eventKey}`.
- **Execution Steps:**
  1. **Snapshot Backfill (`scripts/migrations/2026_m4_wallet_snapshot.ts`):** For every user, atomically create `wallet/main` with `balance = profile.gold`, `lastLedgerSeq = 1`, and opening ledger entry `walletLedger/migration:v3_opening_balance:{uid}` with `amount = profile.gold`. (Preserves legacy `coinTransactions/*` as read-only historical archive.)
  2. **Shadow Mode (14 days):** Route new reward claims through `POST /v1/wallet/claim-reward`; server updates `wallet/main` + `walletLedger` + mirrors `profile/main.gold`. Run daily reconciliation job verifying 100% parity (`drift == 0`).
  3. **Rule Lock Cutover:** Deploy Phase 5 `firestore.rules` blocking all client writes to `profile/main.gold` and `coinTransactions/*`.
  4. **Monetary Gate:** Keep `appConfig/featureFlags.myValueRedemption = false` until all 10 Pre-Monetary Gates in Doc 05 pass.

---

### 15.3 Feature Flag Rollout Strategy (`appConfig/featureFlags`)

Every LevelUp 2.0 capability ships behind a runtime feature flag read by the PWA and enforced by the backend API:

| Flag Key | Default (Launch) | Rollout Progression | Instant Kill-Switch Impact |
| --- | --- | --- | --- |
| `awakeningV2` | `false` | Internal → Pilot Cohort → 100% GA | Hides Awakening 2.0 upgrade prompt; keeps v1 onboarding active |
| `pathways` | `false` | Internal → Pilot Cohort → 100% GA | Hides pathway selector; preserves existing 5-phase Dream Map |
| `academy` | `false` | Internal → Pilot Cohort → 100% GA | Hides `/academy` tab & routes; preserves enrollments in DB |
| `businessStudio` | `false` | Internal → Pilot Cohort → 100% GA | Hides `/studio` tab & routes; preserves saved canvases in DB |
| `agnesV2` | `false` | Internal → Pilot Cohort → 100% GA | Falls back cleanly to v1 roadmap breakdown / deterministic coach |
| `ecosystemSync` | `false` | Staging → Partner Pilot → GA | Pauses outbound product submission & impact push; queues webhooks |
| `serverWallet` | `false` | Shadow → 100% GA (Phase 5) | Controls client claim route cutover |
| `myValueRedemption` | **`false`** | **LOCKED until all 10 Security Gates pass** | Instantly halts all partner redemption requests without deploy |

`cohortAllowlist: string[]` allows enabling any flag exclusively for named pilot cohorts before public rollout.

---

### 15.4 Concrete Rollback Runbooks

| Layer | Rollback Trigger | Rollback Procedure | Target RTO |
| --- | --- | --- | --- |
| **Feature UI / New Module** | UX bug, high error rate, or negative pilot feedback | Flip corresponding flag in `appConfig/featureFlags` to `false` via Admin Console or CLI. | **< 1 minute** (zero deploy) |
| **Frontend PWA (Firebase Hosting)** | Broken build, routing bug, or hydration failure | `firebase hosting:rollback` (or clone previous verified release channel) + increment SW cache version if asset corruption occurred. | **< 3 minutes** |
| **Backend API (Cloud Run / Functions v2)** | Elevated 5xx rate, latency spike, or AI gateway failure | Shift 100% Cloud Run traffic back to prior tagged immutable revision (`gcloud run services update-traffic levelup-api --to-revisions=<prev>=100`). | **< 2 minutes** |
| **Firestore Security Rules** | Legitimate participant/mentor queries denied (`permission-denied`) | Redeploy last tagged `firestore.rules` commit from git (`git checkout <tag> -- firestore.rules && firebase deploy --only firestore:rules`). | **< 3 minutes** |
| **Data Migration Anomaly** | Unexpected field corruption detected in dry-run or canary | Because all migrations are additive (new subcollections / optional v4 fields), disable feature flag and leave v3 fields untouched; restore specific documents from pre-migration GCS export only if needed. | **< 15 minutes** |

---

## 16. Prioritized Development Backlog

| Epic | Priority | Story ID & Scope | Dependencies | Est. Effort |
| --- | --- | --- | --- | --- |
| **E0: Foundation, Modularization & CI** | **P0** | **E0.1** Setup Vitest + Testing Library + GitHub Actions CI (`tsc`, `build`, unit, emulator rules).<br>**E0.2** Extract `AuthContext`, `PlayerContext`, `ConfigContext`, and lightweight router from `src/App.tsx` (1,697 lines).<br>**E0.3** `React.lazy()` code-split `AdminDashboard` + `AdminParticipantInspector` out of participant bundle (target <250 kB gzip).<br>**E0.4** Implement `appConfig/featureFlags` reader + cohort allowlist helper.<br>**E0.5** Fix stale `sleepCondition`/`nutritionCondition` writes in `dailyLogs` and audit Google Calendar OAuth scope. | None | 18 pts |
| **E1: Security, Privacy & RBAC Hardening** | **P0** | **E1.1** Decommission unsafe `functions/src/index.ts` (with approval) & select unified backend runtime (Cloud Run / Functions v2 in `asia-southeast2`).<br>**E1.2** Implement `users/{uid}/privacy/settings` UI + Migration M2 (strip health/mood from `users/{uid}.telemetry`).<br>**E1.3** Implement 8-role `staffRoles/{uid}` + Firebase Custom Claims sync (Migration M3).<br>**E1.4** Author & emulator-test v4 privacy-scoped `firestore.rules` (via `firestore-rules-author`, 200+ tests).<br>**E1.5** Refactor Admin Participant Inspector to respect Tier 1 privacy boundaries & role views. | E0.1, E0.4 | 21 pts |
| **E2: 7 Dimensions, Pathways & Awakening 2.0** | **P1** | **E2.1** Add backward-compatible `schemaVersion: 4` types, `DevelopmentDimension` (7), `PathwayId` (6), and lazy normalizer (M1).<br>**E2.2** Build Awakening 2.0 optional wizard (identity, purpose, condition, skill self-rating, resources, time budget, pathway selection) without mandatory sensitive health/finance fields.<br>**E2.3** Build non-disruptive v1→v2 opt-in upgrade banner for existing participants.<br>**E2.4** Add 7-Dimension HUD balance widget on `/today` preserving existing EXP/Rank/Streak feel. | E0.2, E1.4 | 16 pts |
| **E3: Dream Map 2.0, Quest Engine 2.0 & 3-Axis Gamification** | **P1** | **E3.1** Preserve 5-phase general Dream Map; add Pathway Roadmap Templates including 10-stage Sociopreneur roadmap (`Awakening → Impact`).<br>**E3.2** Expand Quest Engine across all 7 dimensions while keeping `STUDY`/`CAREER`/`FITNESS` 100% compatible.<br>**E3.3** Build Evidence Vault (`users/{uid}/evidence/*`) with submission flow and `validated_evidence` tagging.<br>**E3.4** Implement 3-Axis Progression display & deterministic rules: Experience Level (EXP), Competency Level (verified assessments/rubrics), Business Development Level (verified business milestones). | E2.1, E1.4 | 21 pts |
| **E4: LevelUp Academy (Integrated LMS)** | **P1** | **E4.1** Declare `firestore.indexes.json` composite indexes & Academy collections (`courses`, `modules`, `lessons`, `cohorts`, `enrollments`, `submissions`, `certificates`, `competencies`, server-only `quizKeys`).<br>**E4.2** Build Course Catalog, Course Detail & Lesson Player (article, video, studio-action) lazy-loaded at `/academy`.<br>**E4.3** Build server-graded Quiz Engine (answer keys never exposed to client) & Practical Assignment submission linked to Evidence Vault.<br>**E4.4** Build Cohort Management & Mentor/Trainer Review Queue (`/admin/reviews`) with rubric scoring and revision loops.<br>**E4.5** Wire Academy → Dream Map, Daily Quests (`autoQuestTemplate`), Competency verification, and verifiable Certificate issuer (`/verify/:code`). | E1.3, E1.4, E3.3, E3.4 | 34 pts |
| **E5: Business Studio (16 Tools) & Venture Portfolio** | **P1** | **E5.1** Build Venture Workspace shell (`/studio`) + `users/{uid}/ventures/*` with 4 wings (Discovery, Product & Validation, Finance & Ops, Growth & Impact).<br>**E5.2** Implement Strategy & Discovery Canvases (Personal Dev, Social Problem, Community Potential, Customer Research, VPC, BMC).<br>**E5.3** Implement Product Prototyping & Experiment Tracker (`hypothesis → evidence → validated/pivoted`) with strict `ai_assumption` vs `validated_evidence` badges.<br>**E5.4** Implement **deterministic** Financial Calculators (HPP & Pricing, Cash Flow, Break-Even Analysis) with full unit test coverage.<br>**E5.5** Implement Operational, Legal Readiness, Export Readiness, Marketing Plan & Social Impact Measurement tools.<br>**E5.6** Wire Canvas outputs → automatic Dream Map milestone & Daily Quest recommendations + Public/Mentor Venture Portfolio view. | E3.3, E3.4 | 34 pts |
| **E6: Agnes AI 2.0 (10 Expertise Modes)** | **P2** | **E6.1** Build unified server AI Gateway (`POST /v1/ai/assist`) with strict mode DTOs, SSRF allowlist, atomic quotas, and Firebase App Check.<br>**E6.2** Implement Consent & PII Redaction Middleware enforcing the Data-Access Boundary Matrix (journal/health excluded unless explicitly opted in).<br>**E6.3** Implement 10 Mode Prompt Builders (Personal Coach, Career Coach, Learning Tutor, Business Mentor, Marketing Advisor, Financial Assistant, Wellness Companion, Export Assistant, Impact Advisor, Daily Planner) with deterministic output schemas.<br>**E6.4** Tag every AI suggestion in Business Studio / Dream Map as `origin: 'ai_assumption'` (never auto-grants EXP/Competency/Coins).<br>**E6.5** Build `/hub` Agnes Copilot UI + Admin AI Ops & Usage Dashboard (reconnecting the currently dead `/api/admin/config` & `/api/admin/usage-logs`). | E1.1, E1.2, E4.2, E5.1 | 24 pts |
| **E7: Sociopreneur Ecosystem API Integrations** | **P2** | **E7.1** Implement HMAC-SHA256 signing/verification middleware, timestamp skew check, idempotency store (`integrationEvents`), and retry/DLQ worker.<br>**E7.2** Build Contract 1 (Course Purchase → Enrollment + pending email claim) & Contract 2 (Refund → Revocation).<br>**E7.3** Build Contract 3 (Founder Product Submission → `sociopreneur.online` + Inbound Approval Webhook → Business Level / revision quests).<br>**E7.4** Build Contract 4 (Marketplace Order & B2B Feedback Webhook → `marketFeedback` validated evidence).<br>**E7.5** Build Contract 5 (Consented & k-anonymized Impact Telemetry for `sociopreneur.online` & `socioline.sociopreneur.online`). | E1.1, E4.1, E5.1 | 22 pts |
| **E8: Server-Authoritative Coin Economy & MyValue Prep** | **P2 (Build) / P0 Gate (Monetary)** | **E8.1** Build `POST /v1/wallet/claim-reward`, `wallet/main`, and append-only `walletLedger/{eventKey}` with deterministic idempotency keys & daily caps.<br>**E8.2** Execute Migration M4 (snapshot v1 balances) + 14-day shadow-mode reconciliation.<br>**E8.3** Build automated daily Balance Reconciliation Job + anomaly auto-freeze + Auditor reconciliation screen.<br>**E8.4** Lock `profile/main.gold` & `coinTransactions` from client writes in `firestore.rules`.<br>**E8.5** Build MyValue two-phase redemption adapter (`pendingHold` + signed webhooks + Secret Manager) kept **disabled (`myValueRedemption: false`)** pending Gates 1–10. | E1.1, E1.4, E7.1 | 26 pts |
| **E9: E2E, PWA Offline & Scale Polish** | **P1/P2** | **E9.1** Playwright E2E suite (Mobile 390px + Desktop 1440px) across v1 regression + v2 journeys.<br>**E9.2** PWA offline/reconnect regression test suite (Workbox + Firestore persistent cache + IndexedDB).<br>**E9.3** Institutional Cohort Dashboard (`institution_viewer`) & self-service GDPR/UU PDP data export/deletion. | Parallel across Phases 2–5 | 16 pts |

---

## 17. Sprint Planning (8 Sprints / 16 Weeks)

Assumes a compact, high-leverage delivery team (**1 Tech Lead / Architect, 1–2 Full-Stack Engineers, 1 Product/LXD Designer, 1 QA/Security Reviewer**; 2-week sprints):

| Sprint | Phase | Sprint Goal | Key Deliverables (Stories) | Exit Criteria / Demo Gate |
| --- | --- | --- | --- | --- |
| **Sprint 1** (Wk 1–2) | **Phase 0** | Stabilize foundation, split monolith, establish automated CI & backend decision | `E0.1`, `E0.2`, `E0.3`, `E0.4`, `E0.5`, `E1.1` (backend architecture sign-off & retire unsafe `functions/src/index.ts`) | CI green on PRs; participant JS bundle < 250 kB gzip; Admin lazy-loaded; Vitest running engine tests; backend runtime approved. |
| **Sprint 2** (Wk 3–4) | **Phase 0 → 1** | Privacy-by-default RBAC live; Schema v4 & Awakening 2.0 foundations | `E1.2`, `E1.3`, `E1.4`, `E1.5` (M2 + M3 migrations); `E2.1` | 200+ Firestore Emulator security tests passing; Tier 1 journals owner-only; `staffRoles` claims active; zero v1 regression. |
| **Sprint 3** (Wk 5–6) | **Phase 1** | Launch 7 Dimensions, 6 Pathways, Awakening 2.0 & Dream/Quest 2.0 (Pilot) | `E2.2`, `E2.3`, `E2.4`, `E3.1`, `E3.2`, `E3.3`, `E3.4` | Existing v1 user upgrades smoothly to Awakening 2.0 with 0% data loss; 10-stage Sociopreneur roadmap + Evidence Vault live for pilot cohort. |
| **Sprint 4** (Wk 7–8) | **Phase 2** | LevelUp Academy Core (Catalog, Lessons, Quizzes, Enrollments) | `E4.1`, `E4.2`, `E4.3` | Composite indexes deployed; server-graded quiz passes without leaking answers; lessons generate Daily Quests cleanly. |
| **Sprint 5** (Wk 9–10) | **Phase 2 → 3** | Academy Cohorts, Mentor Reviews & Certificates; Business Studio Shell | `E4.4`, `E4.5`; `E5.1`, `E5.2` | Cohort Mentor reviews assignment + awards Competency + issues verifiable certificate; Discovery Canvases live in `/studio`. |
| **Sprint 6** (Wk 11–12) | **Phase 3** | Complete 16 Business Studio Tools, Deterministic Calculators & Portfolio | `E5.3`, `E5.4`, `E5.5`, `E5.6` | All 16 tools functional; HPP/Cashflow/BEP math 100% unit-tested; `ai_assumption` vs `validated_evidence` strictly enforced; Business Level updates via evidence. |
| **Sprint 7** (Wk 13–14) | **Phase 4** | Launch Agnes AI 2.0 (10 Modes) & Sociopreneur Ecosystem APIs | `E6.1`–`E6.5`, `E7.1`–`E7.5` | All 10 Agnes modes enforce privacy boundaries; `sociopreneur.online` staging purchase→enrollment, refund→revocation, product submission, order feedback, and impact telemetry pass contract tests. |
| **Sprint 8** (Wk 15–16) | **Phase 5** | Server-Authoritative Coin Economy, Reconciliation & Full QA Sign-off | `E8.1`–`E8.5`, `E9.1`–`E9.3` | Server-only wallet live in shadow/cutover; client `gold` writes blocked; 14-day reconciliation timer started; Playwright mobile/desktop + PWA offline tests green. *(Monetary MyValue redemption activates ONLY post-Sprint 8 once Gates 1–10 pass!)* |

---

## 18. Testing & Acceptance Criteria

### 18.1 Automated Verification Pyramid & CI/CD Gates

Every pull request targeting `main` must pass these automated GitHub Actions checks before merge:
1. **Static & Build Gate:** `npm run lint` (add ESLint) + `npx tsc --noEmit` + `npm run build` + bundle budget check (`participant initial chunk <= 250 kB gzip`).
2. **Unit Test Suite (Vitest — target >= 85% coverage on `src/engine/` & calculators):**
   - `science.ts`: EXP curve, rank transitions (`E → S`), quest reward calculation, streak edge cases (midnight rollover, skipped day reset, double-claim idempotency).
   - `coaching.ts`, `reflection.ts`, `analytics.ts`: daily check-in target capture (Career + Dream dual-track), habit trend calculation, deterministic reflection generation.
   - **Business Studio Deterministic Calculators:** HPP unit cost, margin %, markup %, multi-month cash flow net balance, Break-Even Point units & rupiah (including zero-margin / negative contribution margin guardrails).
   - **Schema Normalizer (`v3 → v4`):** Fixtures of real v1/v2/v3 profiles verifying 100% lossless migration.
   - **Security Utilities:** HMAC-SHA256 signing/verification, timestamp skew rejection, PII scrubber regexes.
3. **Firebase Emulator Security Test Suite (200+ assertions via `@firebase/rules-unit-testing`):**
   - **Privacy Isolation:** `admin`, `operator`, `auditor`, `mentor`, `trainer`, `institution_viewer`, and other `learner` accounts are **DENIED** reads/writes on `users/{uid}/journal/*`, `calendar/latest`, and `dailyLogs/*`.
   - **Cohort Scoping:** `mentor` for `cohortA` can read `submissions` & `evidence` of `cohortA` learners, and is **DENIED** on `cohortB` learners.
   - **Assessment Integrity:** `learner` is **DENIED** read on `quizKeys/*` and **DENIED** direct writes to `enrollments/*`, `certificates/*`, `users/{uid}/competencies/*`, and `submissions.score`.
   - **Wallet Immutability:** `learner` is **DENIED** all writes to `wallet/main`, `walletLedger/*`, and (in Phase 5) `profile/main.gold` mutations.
4. **Backend & Ecosystem Contract Test Suite (Supertest / Vitest against Emulator):**
   - Agnes AI 2.0: verifies journal/health data is **absent** from constructed upstream prompts when consent flags are `false`; verifies SSRF blocked URLs return `400`; verifies atomic quota caps enforce exact daily limits under parallel requests.
   - Ecosystem Contracts 1–5: valid HMAC succeeds; tampered body fails `401`; timestamp > 300s old fails `401`; duplicate `X-Socio-Idempotency-Key` returns cached response with zero duplicate DB mutations; refund revokes course access without touching journals/profile; impact endpoint refuses cohort aggregates where `n < 5`.
   - Wallet Concurrency: 50 parallel duplicate `claim-reward` calls mint exactly 1 coin; reconciliation detects synthetic 1-coin drift and auto-freezes wallet.
5. **End-to-End Verification (Playwright — Mobile `390x844` & Desktop `1440x900`):**
   - **v1 Regression Flow:** Login → complete daily check-in with daily target → verify target added to daily quests + Career/Dream dual-track EXP + streak increment → log workout → complete journal → reload & verify cloud sync.
   - **Awakening 2.0 Flow:** Existing v1 user opts into Awakening 2.0 → picks `Sociopreneur` pathway → verifies existing EXP/quests/skills untouched and 10-stage roadmap active.
   - **Academy Flow:** Enroll in free course → read lesson → trigger linked daily quest → submit quiz → submit assignment evidence → Mentor approves in Review Queue → Competency Level increments + Certificate URL verifies publicly.
   - **Business Studio Flow:** Create venture → draft BMC with Agnes (tagged `ai_assumption`) → compute HPP & BEP → log customer interview evidence (tagged `validated_evidence`) → verify Business Level progression.
6. **PWA Offline & Reconnect Regression Tests:**
   - Load `/today` and `/studio` → go offline (Playwright `context.setOffline(true)`) → complete quest, write journal, edit Business Studio canvas draft → reload page offline (verify app shell loads from Service Worker & drafts persist in IndexedDB/Firestore cache) → verify online-only actions (Agnes AI, Quiz Submit, Coin Claim) show clear queued/offline guidance rather than crashing → reconnect → verify clean Firestore sync with zero duplicate entries or lost data.

### 18.2 Stage-by-Stage Acceptance Criteria Summary

| Stage | Measurable Acceptance Criteria |
| --- | --- |
| **Stage 1–2 (Preserve v1)** | 100% of audited v1 features pass Playwright regression; existing v3 profiles load without migration errors; zero UID/balance/journal loss. |
| **Stage 3–4 (Dimensions, Pathways & Awakening 2.0)** | All 7 dimensions and 6 pathways selectable; all 30 profession presets intact; Awakening 2.0 collects zero mandatory sensitive health/financial fields; existing users upgrade opt-in safely. |
| **Stage 5–6 (Dream Map 2.0 & 3-Axis Gamification)** | 5-phase general roadmap + 10-stage Sociopreneur roadmap both work; `STUDY`/`CAREER`/`FITNESS` quests backward-compatible; EXP never auto-increments Competency Level or Business Level without verified assessment/evidence. |
| **Stage 7 (LevelUp Academy)** | Full Course → Module → Lesson → Quiz → Assignment → Mentor Review → Competency → Certificate lifecycle verified; quiz keys inaccessible to client; Academy connects to Dream Map & Daily Quests. |
| **Stage 8 (Business Studio)** | All 16 interactive tools live; HPP/Cashflow/BEP computed deterministically in code (not LLM); every canvas block clearly distinguishes `ai_assumption` vs `validated_evidence`; outputs generate milestone & quest recommendations. |
| **Stage 9 (Agnes AI 2.0)** | All 10 expertise modes live on unified server gateway; consent boundary tests prove zero leakage of private journals/health metrics when unconsented; AI never directly mutates coins, levels, or competencies. |
| **Stage 10 (Security & Coin Economy)** | SEC-01 through SEC-05 resolved; 8 least-privilege roles verified in Emulator; server-authoritative wallet + ledger + daily reconciliation pass stress tests; monetary redemption remains gated (`false`) until all 10 Go-Live Gates pass. |
| **Stage 11 (Ecosystem Integration)** | All 5 contracts pass staging integration tests with `sociopreneur.online` & `socioline.sociopreneur.online`; independent repos/DBs preserved; zero private journal fields exposed in any API schema. |
| **Stage 12 (Technical Quality)** | CI green (unit + emulator + E2E + offline); participant initial JS < 250 kB gzip; rollback runbooks rehearsed in staging. |

---

## 19. Risks, Dependencies, Blockers & Phase-by-Phase GO / NO-GO Recommendations

### 19.1 Risk Register

| Risk ID | Risk Description | Likelihood | Impact | Mitigation & Contingency |
| --- | --- | --- | --- | --- |
| **R-01** | **Premature MyValue / Monetary Coin Activation** while client writes or reconciliation gaps remain, enabling coin farming/financial loss. | Medium | **Critical** | Hard architectural kill-switch (`myValueRedemption: false`); enforce all 10 Pre-Monetary Gates + external security sign-off before enabling. |
| **R-02** | **Scope Bloat Turning LevelUp Into a Heavy LMS** that slows down mobile participants and dilutes the daily gamified habit loop. | High | High | Keep `/today` as default landing HUD (<250 kB gzip); lazy-load Academy & Business Studio; ensure every LMS/Studio action loops back into 1-tap Daily Quests & streaks. |
| **R-03** | **Firebase Spark vs Blaze Plan / Compute Budget Blocker** preventing Cloud Run / Functions v2 deployment in `asia-southeast2`. | Medium | High | Confirm GCP/Firebase Blaze billing cap & budget alerts in Week 1; contingency: keep Phase 0–3 on Firestore + Vercel proxy temporarily, while gating Phase 4–5 server-authoritative APIs until unified backend is funded. |
| **R-04** | **Firestore Security Rules 1,000-Expression Limit** triggered again as v4 fields grow. | Medium | High | Keep new v2 domains in separate subcollections (`evidence`, `ventures`, `wallet`, `privacy`); keep `profile/main` lean; run Emulator stress tests on every rule edit. |
| **R-05** | **AI Hallucination Treated as Business Truth** (e.g., fabricated market sizes or wrong HPP/BEP pricing). | High | High | Compute HPP, Cash Flow, and BEP strictly in deterministic TypeScript functions; visually badge all Agnes outputs as *"Asumsi AI — Belum Tervalidasi"* until backed by Evidence Vault proof. |
| **R-06** | **Sociopreneur.online Integration Schedule Mismatch** delaying Phase 4 end-to-end testing. | Medium | Medium | Publish OpenAPI/JSON schemas from Doc 05 in Sprint 1; build mock `sociopreneur.online` webhook simulator for CI so LevelUp Phase 4 isn't blocked waiting on partner dev cycles. |
| **R-07** | **Staff Resistance to Tier 1 Privacy Restrictions** (staff previously able to inspect raw participant journals/moods in Admin). | Medium | Medium | Provide a clean **consented coaching summary** + cohort habit/completion KPIs (streaks, quests, lessons, evidence milestones) so Mentors/Admins retain actionable visibility without violating participant privacy / UU PDP. |
| **R-08** | **Google Calendar OAuth "Unverified App" Warning** blocking new public participants from direct Calendar connect. | Medium | Medium | Audit Google Cloud Console OAuth Verification status in Sprint 1; keep `.ics` import as zero-friction fallback while completing Google verification if pending. |
| **R-09** | **PWA Stale Service Worker Cache During Schema v3 → v4 Cutover** causing chunk-load errors on mobile devices. | Medium | Medium | Additive-only v4 schema + Vite hashed assets + graceful `updatefound` reload prompt + `vite-plugin-pwa` `cleanupOutdatedCaches: true`. |
| **R-10** | **Mentor Review Bottleneck** stalling learners from advancing Competency / Business Levels during large cohorts. | Medium | Medium | Support clear rubric checklists, batch mentor queue filters, SLA indicators (>72h overdue highlight), and automated quiz/self-check gates for foundational tiers while reserving Mentor reviews for key practitioner/builder milestones. |

---

### 19.2 Key External Dependencies & Stakeholder Decisions Required

Before starting implementation sprints, leadership/stakeholders should confirm these **6 decisions**:

1. **Unified Backend Hosting Approval (Needed by Sprint 1):** Approve upgrading/provisioning **Cloud Run or Firebase Cloud Functions v2 (`asia-southeast2`) + Secret Manager** with monthly budget alerts (eliminates Vercel/Render/Functions 3-way drift and unblocks Phases 4–5).
2. **Legacy Cleanup Approvals (Needed by Sprint 1–2):** Explicit sign-off to retire unsafe `functions/src/index.ts`, unused `render.yaml`/`server/` duplication, dead profile fields (`discoveredPerks`, `growthNews`, `groundingSources`), and hardcoded `stefenlaksana.sl@gmail.com` after M3 Custom Claims bootstrap.
3. **Evidence File Storage Policy (Needed by Sprint 3):** Approve enabling **Firebase Cloud Storage (`asia-southeast2`)** with strict per-UID size/MIME limits (e.g., max 5 MB PDF/JPG/PNG) for Evidence Vault uploads, OR start Phase 2–3 with link-only evidence (Google Drive/YouTube/URLs) to minimize storage cost.
4. **Ecosystem Partner Alignment (Needed by Sprint 4):** Confirm technical counterpart for `sociopreneur.online` and `socioline.sociopreneur.online`, exchange staging HMAC signing keys, and map `externalProductId ↔ levelupCourseId`.
5. **MyValue Partner Technical & Commercial Spec (Needed by Sprint 6+):** Obtain MyValue API documentation, sandbox credentials, webhook signing spec, conversion rate policy, and Finance/Legal sign-off.
6. **Privacy Policy / Consent Notice Update (Needed by Sprint 2):** Update Terms & Privacy Notice on `levelup.sociopreneur.online` to reflect UU PDP No. 27/2022 consent controls (`users/{uid}/privacy/settings`) and ecosystem data boundaries.

---

### 19.3 Detailed Phase-by-Phase GO / NO-GO Recommendations

| Phase | Sprints | Verdict | Rationale & Mandatory Entry/Exit Conditions |
| --- | --- | --- | --- |
| **Phase 0: Foundation, Security, Privacy & Testing** | Sprint 1–2 | **GO** | **Immediate Green Light.** Zero external blockers; resolves critical privacy (`SEC-02`), proxy security (`SEC-03`/`SEC-04`), bundle bloat (`DEBT-02`), and zero-test risk (`DEBT-01`). **Exit Gate:** CI green, participant bundle < 250 kB gzip, 200+ Emulator security tests passing, Tier 1 journals owner-only, unified backend runtime approved. |
| **Phase 1: 7 Dimensions, Pathways, Awakening 2.0 & Dream/Quest 2.0** | Sprint 2–3 | **GO** | **Green Light upon Phase 0 exit.** Purely additive `schemaVersion: 4` evolution; zero risk to existing accounts/data when shipped behind `awakeningV2` & `pathways` feature flags. **Exit Gate:** Existing v1 regression suite 100% pass; opt-in Awakening 2.0 + 10-stage Sociopreneur roadmap verified on mobile & desktop. |
| **Phase 2: LevelUp Academy (Integrated LMS)** | Sprint 4–5 | **CONDITIONAL GO** | **Proceed ONLY when:** (1) Phase 0 `mentor`/`trainer` cohort-scoped RBAC is verified in Emulator, (2) `firestore.indexes.json` composite indexes are deployed, and (3) server-side quiz grading endpoint is live (never ship quiz answer keys to the browser). **Exit Gate:** Full Course → Assignment → Mentor Review → Competency → Certificate flow passes E2E. |
| **Phase 3: Business Studio (16 Tools) & Venture Portfolio** | Sprint 5–6 | **CONDITIONAL GO** | **Proceed ONLY when:** (1) Evidence Vault storage decision (Firebase Storage vs link-only) is signed off, and (2) Phase 1 3-axis progression rules are active so `ai_assumption` vs `validated_evidence` is strictly enforced. **Exit Gate:** All 16 tools shipped; deterministic HPP/Cashflow/BEP unit tests 100% pass; canvas outputs generate Daily Quests. |
| **Phase 4: Agnes AI 2.0 (10 Modes) & Ecosystem API Integrations** | Sprint 7 | **CONDITIONAL GO** | **Proceed ONLY when:** (1) Unified backend service (`asia-southeast2` + Secret Manager + App Check) is live, (2) Privacy consent middleware passes zero-leakage tests, and (3) `sociopreneur.online` staging partner endpoints & HMAC keys are exchanged. **Exit Gate:** All 10 Agnes modes & all 5 API contracts pass automated contract + replay/security tests. |
| **Phase 5: Server-Authoritative Coin Economy & MyValue Redemption** | Sprint 8+ | **NO-GO for Monetary Activation Today**<br>*(CONDITIONAL GO for Engineering Build in Sprint 8)* | **Hard Security Red Line:** Do **NOT** enable MyValue or any real-value coin redemption against v1 client-writable coins (`SEC-01`). Engineering build of server-authoritative `wallet/main`, append-only `walletLedger`, Migration M4, and daily reconciliation is **CONDITIONAL GO** in Sprint 8 once unified backend is live. **Live Monetary Activation remains NO-GO** until all **10 Pre-Monetary Go-Live Gates** (Doc 05 §13.5) — including client write lockdown, 14-day clean reconciliation, concurrency tests, adversarial security review, and written Finance/Ops approval — are 100% passed. |
