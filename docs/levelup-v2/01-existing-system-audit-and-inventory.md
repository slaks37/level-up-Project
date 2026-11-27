# 01 — Existing System Audit & Feature Inventory

> **Deliverables Covered:** Deliverable #1 (Existing System Audit) & Deliverable #2 (Feature Inventory)
>
> **Audit Date:** 2026-11-27 · **Audited Commit:** `04e4fe9` (`main`) · **Method:** Direct read-only inspection of every file in `src/`, `firestore.rules`, `firebase.json`, `vite.config.ts`, `server/`, `proxy/`, `functions/`, `.github/workflows/`, `scripts/`, `render.yaml`, plus live read-only HTTP checks against deployed Hosting, AI Proxy, and Promo News endpoints.

---

## 1. Existing System Audit

### 1.1 Repository & Codebase Footprint

| Area | Files | Lines | Responsibility |
| --- | --- | --- | --- |
| Frontend Entry & Core | `src/App.tsx`, `src/types.ts`, `src/routes.ts`, `src/main.tsx`, `src/vite-env.d.ts`, `src/index.css` | ~2,251 | SPA entry, domain routing, global state, gameplay mutations, Tailwind v4 styling |
| Frontend Components | `src/components/*.tsx` (12 files) | ~6,593 | Auth, Awakening, Dashboard panels, Journal, Coach panels, Modals, Settings, Admin Console & Participant Inspector |
| Domain Engines | `src/engine/*.ts` (6 files) | ~2,264 | Scientific stat math, coaching & dual-track target capture, journal aggregation, deterministic reflection, habit analytics, RBAC helpers |
| Static Data & i18n | `src/data/brand.ts`, `src/data/i18n.ts`, `src/data/professions.ts` | ~686 | Brand metadata, ID/EN dictionary, 30 profession presets |
| Frontend Services | `src/services/*.ts` (7 files) | ~1,973 | Firebase Auth/Firestore client, AI proxy client, Google Calendar OAuth/`.ics`, localStorage, IndexedDB photo store |
| Firestore Rules & Config | `firestore.rules`, `firebase.json`, `firestore.indexes.json`, `vite.config.ts` | ~995 | Security rules (856 lines), Hosting config, empty composite indexes, PWA build config |
| Backend Target A (Vercel — **LIVE**) | `proxy/gateway.mjs`, `proxy/api/**/*.mjs`, `proxy/vercel.json` | ~194 | Scoped Firebase REST AI gateway deployed at `level-up-agnes-proxy.vercel.app` (`sin1`) |
| Backend Target B (Express/Render) | `server/src/index.ts`, `server/Dockerfile`, `render.yaml` | ~756 | Full Express 5 proxy server with optional Firebase Admin SDK or local `.secrets/` vault |
| Backend Target C (Functions v2) | `functions/src/index.ts` | ~224 | Legacy Firebase Cloud Functions v2 Express wrapper (divergent & unsafe — see §1.4) |
| Automation & Scripts | `.github/workflows/daily-promo-news.yml`, `scripts/refresh-promo-news.py` | ~179 | Daily 07:23 WIB scraper publishing Indomaret & Alfagift metadata to `promo-news` orphan branch |

**Build & Runtime Stack (Verified from `package.json` & `npm run build`):**
- React `19.3.1`, TypeScript `7.0.2` (`strict: true`, `noUnusedLocals: true`, `noUnusedParameters: true`), Vite `8.3.8`, Tailwind CSS `4.3.5`, `vite-plugin-pwa` `2.0.0`, Firebase JS SDK `13.4.0`, `ical.js` `2.2.1`, `lucide-react` `1.80.0`.
- Production bundle size (verified): `dist/assets/index-*.js` = **630.41 kB** (184.87 kB gzip), `dist/assets/firebase-*.js` = **663.81 kB** (198.00 kB gzip), `dist/assets/ical-*.js` = **77.13 kB** (lazy-loaded on `.ics` import), `dist/assets/index-*.css` = **48.00 kB** (9.46 kB gzip).

### 1.2 Live Production Topology (Empirically Checked)

| Endpoint / Surface | Observed Status | Evidence |
| --- | --- | --- |
| `https://levelup.sociopreneur.online/` | **LIVE (Firebase Hosting `level-up-os-sl26`)** | Serves current `index.html` with Open Graph tags (`og:title="Level Up System"`, `og:description="Awaken Your Entrepreneurial Spirit"`). Redirects `/admin` → `ADMIN_URL` in `src/main.tsx`. |
| `https://go-levelup.sociopreneur.online/` | **LIVE (Same Firebase Hosting bundle)** | Detected via `window.location.hostname === ADMIN_HOST` in `src/App.tsx`; disables PWA Service Worker registration (`src/main.tsx:13`) and forces `adminOnly` AuthView. |
| `https://level-up-agnes-proxy.vercel.app/api/health` | **LIVE (Vercel `sin1`)** | Returned `{"ok":true,"proxyMode":"firebase-scoped-proxy","sharedAiConfigured":true,"enabled":true,"model":"agnes-3.0-flash","dailyLimit":20}`. |
| `raw.githubusercontent.com/.../promo-news/promo-news.json` | **LIVE (GitHub Actions)** | Latest snapshot dated `2026-11-26` (`Indomaret: true`, `Alfagift: true`). Because `PromoNewsPanel.tsx:72-74` treats `snapshot.date !== today` as `stale`, `kind: 'promo'` cards hide whenever the 07:23 WIB workflow hasn't updated for the current date. |
| Firebase Firestore (`asia-southeast2`) | **LIVE (Rules deployed)** | `firestore.rules` (856 lines) compiled and released; `firestore.indexes.json` currently has **0 composite indexes**. |
| Render Express Server & Cloud Functions v2 | **NOT ACTIVE IN PRODUCTION CLIENT** | `.env.local` points `VITE_AI_PROXY_URL` to Vercel (`level-up-agnes-proxy.vercel.app`); `firebase.json` has no `functions` section. |

### 1.3 Current Firestore Data Model (Audited from `firestore.rules` & `src/services/firebaseService.ts`)

1. `admins/{uid}` — Legacy admin grant docs (`uid`, `email`, `grantedBy`, `createdAt`).
2. `adminEmails/{email}` — Current RBAC email grant docs (`email`, `role` in `['admin','operator','auditor']`, `grantedBy`, `createdAt`, `updatedBy`, `updatedAt`).
3. `appConfig/aiPublic` — Non-secret AI status (`enabled`, `providerName`, `model`, `dailyLimit`, `proxyConfigured`, `maintenanceNotice`, `updatedAt`, `updatedBy`).
4. `appConfig/coinEconomy` — Public coin economy & MyValue settings (18 fields; default `1` coin per action, `startingCoins: 0`, `partnerEnabled: false`).
5. `adminSecrets/aiProvider` — Admin & `levelup-ai-proxy-v1` readable AI key vault.
6. `adminSecrets/coinPartner` — Admin-only partner credentials (`partnerName`, `merchantId`, `apiEndpoint`, `apiKey`, `webhookSecret`).
7. `users/{uid}` — Account directory + AI quota counters + optional 17-field `telemetry` summary map.
8. `users/{uid}/profile/main` — Monolithic 37-required + 10-optional field player profile document (`quests<=100`, `shadows<=200`, `dreamSteps<=50`, `rewards<=50`, `stats`, `career`, `gym`, streaks, `gold`).
9. `users/{uid}/journal/{entryId}` — Check-ins (`{dateKey}-{phase}`) and completed activities/workouts (`{dateKey}-task-{id}`).
10. `users/{uid}/dailyLogs/{dateKey}` — Closed-day summaries (`YYYY-MM-DD`).
11. `users/{uid}/coinTransactions/{txId}` — Append-only coin ledger (currently client-writable for `earn`/`redeem`).
12. `users/{uid}/calendar/latest` — Up to 50 synced/imported calendar events.
13. `aiUsageLogs/{logId}` — Proxy-written AI audit trail.

Local-only device storage (never synced to Firestore):
- IndexedDB `level-up-avatar/photos` (`src/services/avatarStorage.ts`): user profile portrait & meal photos (resized JPEG <=900px via `src/services/localPhoto.ts`).
- `localStorage`: guest/cached profiles (`levelup_studio_os_player_v3`), cached logs, journal cache (`levelup_journal_v1:*`), `.ics` calendar cache (`levelup_calendar_import:*`), promo news cache (`levelup_promo_news_v1`), personal BYOK AI key (`levelup_studio_os_ai_config_v3`), SFX mute & language.

### 1.4 Critical Technical Debt, Security Findings & Incomplete Implementations

| ID | Severity | Finding (Code-Verified) | Location |
| --- | --- | --- | --- |
| **SEC-01** | **CRITICAL** | **Client-authoritative coin minting & profile self-editing:** Regular users can write any `gold` (`0..10M`), `level`, `exp`, `streak`, or `earn` `coinTransactions` directly via Firestore SDK without server verification or idempotency. Blocks real-value / MyValue redemption. | `firestore.rules:762-765, 804-810`; `src/App.tsx:642-660` |
| **SEC-02** | **CRITICAL** | **Over-broad staff access to private health/mood journals & calendars:** `isStaff()` grants `admin`, `operator`, AND `auditor` full read access to `profile/main`, `journal`, `dailyLogs`, `coinTransactions`, and `calendar/latest` (private moods, sleep, meals, pain, calendar titles), exceeding operator/auditor job boundaries. Also `users/{uid}.telemetry` exposes `lastMood`/`lastSleepHours` to `isAIProxy()`. | `firestore.rules:257, 722, 757, 778, 823`; `src/engine/analytics.ts:138-142` |
| **SEC-03** | **HIGH** | **Unsafe & divergent `functions/src/index.ts`:** Reflects arbitrary `cors({ origin: true })`, proxies raw user-supplied `req.body.messages` (arbitrary LLM abuse), allows SSRF via unvalidated `req.body.baseUrl` in `/api/admin/test-ai`, lacks atomic quota reservation, ignores `adminEmails/{email}`, and uses an outdated request schema incompatible with `aiService.ts`. | `functions/src/index.ts:24, 56-59, 85, 138-167` |
| **SEC-04** | **HIGH** | **3-way backend drift & silent 404s:** Vercel `proxy/gateway.mjs` (live) lacks `/api/admin/config` and `/api/admin/usage-logs`, yet `AdminDashboard.tsx:227-240` calls both on load. `server/src/index.ts` ignores `adminEmails/{email}` and `render.yaml:22` omits both custom domains (`levelup.sociopreneur.online`, `go-levelup.sociopreneur.online`) from `ALLOWED_ORIGINS`. | `proxy/gateway.mjs`; `server/src/index.ts:266-269`; `render.yaml:22`; `src/components/AdminDashboard.tsx:227-240` |
| **SEC-05** | **MEDIUM** | **Hardcoded bootstrap admin email across 4 files:** `stefenlaksana.sl@gmail.com` is embedded in rules, frontend, server, and functions; legacy `admins/{uid}` coexists with `adminEmails/{email}`. | `firestore.rules:235, 261`; `src/services/firebaseService.ts:59`; `server/src/index.ts:17`; `functions/src/index.ts:12` |
| **DEBT-01** | **HIGH** | **Zero automated test suite & zero CI code gates:** `package.json:7` has `"test": "echo ... && exit 1"`. No GitHub Action runs `tsc`, `vite build`, unit tests, or Firestore rules tests on PR/push. | `package.json:7`; `.github/workflows/` |
| **DEBT-02** | **HIGH** | **Monolithic `App.tsx` (1,697 lines) & eager Admin bundle:** All Admin console code (2,504 lines) ships inside the main participant JS bundle (`630.41 kB`), causing Vite >500 kB chunk warnings and blocking modular feature growth (Academy, Business Studio). | `src/App.tsx`; `vite.config.ts:90-100` |
| **DEBT-03** | **MEDIUM** | **Stale/dead legacy fields on `PlayerProfile` & `dailyLogs`:** `sleepCondition` and `nutritionCondition` are never mutated in UI anymore (always `'moderate'` / `'balanced'` in `dailyLogs`); `discoveredPerks`, `growthNews`, and `groundingSources` arrays are dead legacy fields with zero UI writers/readers. | `src/types.ts:184-195`; `src/App.tsx:694-695`; `src/engine/science.ts:680-690` |
| **DEBT-04** | **MEDIUM** | **Client-side `adminSecrets/coinPartner` credentials have no consuming backend:** Admin can save MyValue `merchantId`/`apiKey`/`webhookSecret` into `adminSecrets/coinPartner`, but no backend endpoint yet processes partner redemptions or incoming webhooks. | `src/services/firebaseService.ts:567-598`; `proxy/gateway.mjs` |
| **DEBT-05** | **MEDIUM** | **Calendar OAuth public verification unconfirmed:** Direct OAuth UI is enabled in `.env.local`, but Google Cloud Console verification status for `calendar.events.owned.readonly` across arbitrary public Gmail users is not empirically verified in repo. | `src/services/googleCalendar.ts:2, 127`; `.env.local:18-19` |
| **DEBT-06** | **LOW** | **Empty `firestore.indexes.json` & no URL routing:** No client router (`react-router` or lightweight hash/path router) for deep links into courses, canvases, or participant records; composite indexes will be needed for v2 queries. | `firestore.indexes.json`; `src/App.tsx:147-214` |

---

## 2. Complete Feature Inventory

Classification legend:
- **Implemented and verified** — Code complete, compiled, and empirically verified (build, live HTTP, or emulator tests).
- **Implemented but not verified** — Code exists and builds, but live external/end-to-end runtime verification is pending.
- **Partially implemented** — Core UI/storage exists, but key backend, data, or security pieces are missing or stale.
- **Missing** — Does not exist in the current repository (required for LevelUp 2.0).
- **Requires improvement** — Works today, but has security, privacy, scalability, or UX gaps needing upgrade in v2.0.

| # | Feature Area | Status | Code Evidence & Audit Notes |
| --- | --- | --- | --- |
| 1 | Awakening & Initial Onboarding | **Implemented and verified** | `src/components/AwakeningView.tsx`, `createInitialPlayerProfile` (`science.ts:615`). Captures biometrics, city, reward interest, 30 presets/custom role, dream goal, target level, daily budget, basic career & gym fields. Needs Awakening 2.0 extension. |
| 2 | Profession Presets (30) & Career Ranks (`E`→`S`) | **Implemented and verified** | `src/data/professions.ts` (30 presets across `AGRI`, `BIZ`, `TECH`, `EDU`), `getActiveStage` (`science.ts:212`). |
| 3 | Player Profile, 5 Scientific Stats (`STR/VIT/INT/AGI/CHA`) & Status HUD | **Implemented and verified** | `src/components/DashboardPanels.tsx` (`StatusPanel`), `computeScientificStatGains` (`science.ts:120`), `EditBioModal`. |
| 4 | EXP, Level Progression & Core Overdrive (4/4) | **Requires improvement** | `applyExpAndLevelUp` (`science.ts:185`), `App.tsx:705`. Works smoothly, but EXP is currently client-writable and conflated with overall progress rather than separated from Competency & Business levels. |
| 5 | Daily Quests (`STUDY`, `CAREER`, `FITNESS`) & RPE Verification | **Implemented and verified** | `DailyTasksPanel`, `CompleteQuestModal`, `AddQuestModal`, `applyQuestCompletion`. Includes automatic Career + Dream dual-track indicator. |
| 6 | Check-In Daily Target Auto-Capture → To-Do List | **Implemented and verified** | `buildCapturedTargetPlan` (`coaching.ts:227`), `DailyCheckInModal`, `App.tsx:1146`. Unit-tested via `tsx` script & built cleanly. |
| 7 | Dream Map (5-Phase General Roadmap + Small Steps) | **Implemented and verified** | `DreamRoadmapPanel`, `createDefaultDreamSteps`, `getRoadmapActions`, archive on goal change, anti-farming `rewarded` flag. Needs pathway-specific templates (10-stage Sociopreneur) & evidence gates. |
| 8 | Permanent Skills & Auto Skill Arsenal | **Implemented and verified** | Auto-unlocks at >=3 sessions or >=120 mins (`science.ts:285-336`), manual skill addition (`AddSkillModal`), rank upgrades (`Knight Grade`, `Master Grade`). |
| 9 | Daily Journal (Morning/Day/Evening Check-in, Mood, Sleep, Meals, Energy) | **Requires improvement** | `JournalPanels.tsx`, `useJournal.ts`, `engine/journal.ts`. Works offline + Firestore sync; local-only meal/avatar photos in IndexedDB. **Gap:** legacy `sleepCondition`/`nutritionCondition` in `dailyLogs` are stale; privacy rules expose full journal to all staff. |
| 10 | Workout Coaching & Readiness Program | **Implemented and verified** | `GymCoach` (`CoachPanels.tsx`), `workoutPlan` (`coaching.ts:440`), pain/fatigue tracking, direct "Selesai latihan" trigger. |
| 11 | Streak Tracking (Daily, Task, Workout + Longest) | **Implemented and verified** | `advanceStreakCounter` & `getEffectiveStreak` (`science.ts:36-74`), displayed in Status, Daily Tasks, Gym Coach, and Admin Inspector. |
| 12 | Google Calendar Direct OAuth & `.ics` Import | **Implemented but not verified** | `src/services/googleCalendar.ts`, `CalendarPanel` (`CoachPanels.tsx`), `.env.local` has `CLIENT_ID` & `VITE_CALENDAR_OAUTH_ENABLED=true`. `.ics` parsing works locally; live Google OAuth consent approval for non-test public users needs external Google Cloud verification. |
| 13 | Deterministic Daily Reflection & Prayer | **Implemented and verified** | `src/engine/reflection.ts`, `DailyReflectionCard`. Local deterministic engine using mood, sleep, meals, calendar, active dream step — zero AI calls. |
| 14 | Agnes AI Integration (Roadmap Task Breakdown) | **Implemented and verified** | `src/services/aiService.ts`, live Vercel `proxy/gateway.mjs` (`/api/health` verified live with `agnes-3.0-flash`). Scoped strictly to roadmap breakdown & connection test; supports optional local BYOK fallback. |
| 15 | Coin Economy (1-Point Default, Editable Rules, Ledger) | **Partially implemented** | `appConfig/coinEconomy`, `adminSecrets/coinPartner`, `coinTransactions`, Admin editor UI all exist and rules pass emulator tests. **Critical Gap:** Client-authoritative earning & no backend partner/MyValue transaction processor yet. |
| 16 | Self-Rewards & Promo News (Indomaret / Alfagift) | **Implemented and verified** | `RewardsAndGrowth`, `PromoNewsPanel.tsx`, `.github/workflows/daily-promo-news.yml`. Note: stale-date check hides promos if daily workflow lags past midnight WIB. |
| 17 | PWA, Offline Persistence & Open Graph Share Tags | **Implemented and verified** | `vite.config.ts` (`VitePWA` Workbox SW), Firestore `persistentLocalCache` + multi-tab manager, verified live `og:*` tags on both custom domains. Not yet regression-tested via automated offline suite. |
| 18 | Firebase Auth (Google, Email/Pass, Register, Forgot Password) | **Implemented and verified** | `AuthView.tsx`, `SettingsModal.tsx`, `firebaseService.ts`. Forgot password exists in both AuthView and SettingsModal. |
| 19 | Admin Control Center, RBAC (`owner/admin/operator/auditor`) & Habit Analytics | **Requires improvement** | `AdminDashboard.tsx`, `AdminParticipantInspector.tsx`, `engine/analytics.ts`, `engine/access.ts`. Rich 5-tab participant inspector & habit analytics live, **but** needs code-splitting, privacy scoping for `operator`/`auditor`, and new `mentor`/`trainer`/`institution` roles. |
| 20 | AI Audit Logs | **Implemented and verified** | Written by `proxy/gateway.mjs` to `aiUsageLogs`, read by `admin`/`auditor` in `AdminDashboard.tsx`. |
| 21 | 7 Development Dimensions & 6 Pathways | **Missing** | Required in LevelUp 2.0 (Stage 3). |
| 22 | Awakening 2.0 Assessment | **Missing** | Required in LevelUp 2.0 (Stage 4). |
| 23 | 3-Axis Progression (Experience / Competency / Business) | **Missing** | Required in LevelUp 2.0 (Stage 6). |
| 24 | LevelUp Academy (Integrated LMS, Cohorts, Certificates, Mentor Reviews) | **Missing** | Required in LevelUp 2.0 (Stage 7). |
| 25 | Business Studio (16 Canvases, HPP/Cashflow/BEP Calculators, Experiment Tracker) | **Missing** | Required in LevelUp 2.0 (Stage 8). |
| 26 | Agnes AI 2.0 (10 Expertise Modes + Consent Data Boundaries) | **Missing** | Required in LevelUp 2.0 (Stage 9). |
| 27 | Sociopreneur.online & Socioline Ecosystem Integration Contracts | **Missing** | Required in LevelUp 2.0 (Stage 11). |
| 28 | Automated Unit, Integration, E2E & Offline Test Suites | **Missing** | Required in LevelUp 2.0 (Stage 12); only ad-hoc Firestore Emulator rules testing exists. |
