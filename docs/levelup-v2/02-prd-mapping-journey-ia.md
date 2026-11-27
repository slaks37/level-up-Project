# 02 — Product Requirements, Feature Mapping, User Journeys & Information Architecture

> **Deliverables Covered:** Deliverable #3 (PRD), Deliverable #5 (Existing-to-New Feature Mapping), Deliverable #6 (User Journey), Deliverable #7 (Navigation & Information Architecture)

---

## 3. Product Requirements Document (PRD) — LevelUp 2.0

### 3.1 Product Identity & Vision
- **Preserved Brand:** **Level Up System** — *Awaken Your Entrepreneurial Spirit*
- **Extended Positioning:** *Level Up Yourself. Level Up Your Business. Level Up Your Impact.*
- **Core Product Principle:** Evolve the existing gamified human-development OS into a full **Human & Sociopreneur Development Operating System** without turning it into a conventional, passive LMS. Every lesson, canvas, experiment, and mentor review connects directly to the participant's **Dream Map**, **Daily Quests**, **Skill Tree**, and **Real-World Portfolio**.

### 3.2 Seven Development Dimensions (Stage 3)
Every quest, course module, canvas, skill, and milestone maps cleanly to one primary (and optional secondary) dimension:

| # | Dimension Code | Label (ID / EN) | Core Outcomes Measured |
| --- | --- | --- | --- |
| 1 | `PURPOSE` | Makna & Tujuan / Purpose | Values clarity, life/social mission, daily reflection consistency |
| 2 | `HEALTH` | Kesehatan & Energi / Health | Sleep, nutrition, workouts, pain-free sustainability (`STR`, `VIT`) |
| 3 | `SKILLS` | Kompetensi & Skill / Skills | Deliberate practice, Academy quizzes/assignments, verified permanent skills (`INT`) |
| 4 | `CAREER` | Karier & Profesional / Career | Work projects, role execution, leadership, career rank (`AGI`, `CHA`) |
| 5 | `BUSINESS` | Bisnis & Produk / Business | Customer discovery, prototypes, validated experiments, market traction |
| 6 | `FINANCIAL` | Finansial & Unit Ekonomi / Financial | HPP accuracy, pricing margins, cash flow discipline, break-even health |
| 7 | `IMPACT` | Dampak Sosial & Komunitas / Social Impact | Community benefit, sustainability metrics, beneficiary outcomes |

### 3.3 Six Optional Development Pathways (Extending All 30 Profession Presets)
Pathways **never replace** the existing 30 profession presets (`src/data/professions.ts`) or custom roles. A user keeps their profession (e.g., *Petani Modern & Hidroponik* or *Full-Stack Developer*) and optionally selects a **Primary Pathway** (switchable anytime without deleting progress):

1. **`personal_growth`** — Personal Growth (default for general users; uses existing 5-phase Dream Map)
2. **`career_accelerator`** — Career Accelerator (focus on role mastery, sprint/project leadership, portfolio)
3. **`entrepreneur`** — Entrepreneur (commercial venture creation, Business Studio, revenue validation)
4. **`sociopreneur`** — Sociopreneur (10-stage Sociopreneur roadmap, social problem → community impact + sustainable business)
5. **`community_agriculture`** — Community & Agriculture (rural/agri value chain, farmer/community potential mapping, cooperative readiness)
6. **`global_business`** — Global Business (product standardization, legal/certification, export readiness, B2B inquiry preparation)

### 3.4 Awakening 2.0 — Expanded Privacy-Respecting Onboarding (Stage 4)
- **Step 1 — Identity & Purpose Discovery:** Name, city/region, profession preset or custom role, primary life/career/impact purpose statement (optional prompts, never forced religious/personal confession).
- **Step 2 — Development Pathway Selection:** Choose one of the 6 pathways (or keep *Personal Growth*). Shows a live preview of the roadmap template it unlocks.
- **Step 3 — Condition, Skills & Resources Snapshot (Privacy-Minimized):**
  - *Time Availability:* Daily commitment budget (60–240 min/day) & preferred active days.
  - *Current Skills Self-Rating:* Lightweight 1–5 readiness self-check across key skills (explicitly stored as `self_assessment`, never treated as verified competency).
  - *Available Resources (Optional):* Existing team/community access, workspace/equipment, starting tools — **do NOT require** sensitive medical diagnoses, exact personal income/bank balances, or national ID numbers.
  - *Body Metrics (Optional / Skippable):* Height/weight/age remain optional for workout calibration with clear "Lewati / Skip" support.
- **Step 4 — Personalized Dream Map Generation:** Generates pathway-appropriate roadmap milestones + first day's Dual-Track tasks (Career + Pathway/Dream).
- **Existing User Migration Path:** Existing v1 users see a non-blocking banner *"Upgrade ke Awakening 2.0 (Pilih Jalur & Tujuan Baru)"* that preserves 100% of existing `level`, `exp`, `gold`, `streaks`, `quests`, `dreamSteps`, `shadows`, and `journal`.

### 3.5 Dream Map 2.0 & Expanded Quest Engine (Stage 5)
- **General Roadmap (Preserved):** Existing 5-phase Dream Map (`Fondasi → Skill Inti → Hasil Nyata → Evaluasi → Target Tercapai`).
- **Pathway-Specific Roadmap Templates:**
  - **Sociopreneur Pathway (10 Stages):** `1. Awakening` → `2. Discover` → `3. Understand` → `4. Learn` → `5. Design` → `6. Prototype` → `7. Validate` → `8. Launch` → `9. Grow` → `10. Impact`.
  - **Entrepreneur / Global Business / Community & Agriculture / Career Accelerator:** Tailored 6–8 stage templates sharing the same `DreamStep` schema (extended additively with `pathwayId`, `stageCode`, `dimension`, `evidenceRequirement`, `evidenceStatus`, `linkedCourseIds`, `linkedCanvasIds`).
- **Expanded Quest Categories (Backward-Compatible):**
  - Existing `QuestCategory` (`'STUDY' | 'CAREER' | 'FITNESS'`) stays valid forever so existing documents and UI filters never break.
  - Add optional `dimension?: DevelopmentDimension` (`PURPOSE | HEALTH | SKILLS | CAREER | BUSINESS | FINANCIAL | IMPACT`) and `questSource?: 'manual' | 'checkin_capture' | 'dual_track' | 'academy' | 'studio' | 'mentor'` + optional `evidenceRequired?: boolean` and `evidenceId?: string`.
- **Real-World Evidence Gates:** Selected milestones (e.g., *Validate*, *Launch*, *Impact*, or Academy practical assessments) require submitting an evidence item (structured reflection + link/artifact/canvas snapshot + customer/beneficiary proof) before transitioning from `in_progress` to `verified`.

### 3.6 Functional & Non-Functional Requirements Summary
- **Offline-First PWA:** Journaling, task completion drafts, Business Studio canvas drafting, and cached lessons must work offline and reconcile cleanly on reconnect (server-authoritative coin minting queues idempotent claim events on reconnect).
- **Bilingual (ID / EN):** All new v2 modules ship with complete Indonesian (`id`) and English (`en`) copy.
- **Performance Budget:** Initial participant JS payload `< 250 kB` gzipped (achieved by code-splitting Admin, Academy, and Business Studio routes).
- **Privacy & Security:** Zero exposure of private health/mood journals to external ecosystems or unauthorized staff roles; zero client-minted monetizable coins.

---

## 5. Existing-to-New Feature Mapping & Governance Ledger

| Existing v1 Feature | v2.0 Disposition | How It Evolves in LevelUp 2.0 |
| --- | --- | --- |
| `AwakeningView.tsx` | **Improve** | Becomes **Awakening 2.0** multi-step wizard adding Purpose, Pathway selector, optional Skill/Resource check, and skippable biometrics; existing users get non-destructive opt-in upgrade. |
| `PROFESSIONS_DB` (30 presets) | **Preserve** | Kept intact; Pathways layer on top via `pathwayId` without overwriting `profession`, `classTitle`, or `stages`. |
| `StatusPanel` (`level`, `exp`, `stats`, `streak`) | **Improve** | Preserves Experience Level, Career Rank, 5 stats, and 3 streaks; adds compact indicators for **Competency Level** and **Business Level**. |
| `DailyTasksPanel` + Check-in Target Capture | **Improve** | Preserves `STUDY`/`CAREER`/`FITNESS` + Career/Dream dual-track; adds `dimension` badge, Academy lesson quests, Business Studio action quests, and evidence upload trigger for gated quests. |
| `DreamRoadmapPanel` (5 phases) | **Improve** | Preserves existing 5-phase plans; adds 10-stage Sociopreneur & pathway templates, linked Academy modules, linked Business Studio canvases, and evidence-gated verification badges. |
| `SkillArsenalPanel` (`shadows` & `skillProgress`) | **Improve** | Separates **Habit-Formed Skills** (existing 3-session/120m routine unlock) from **Verified Competencies** (Academy assessment + mentor/evidence sign-off). |
| `JournalPanels` (`DailyCheckInModal`, `NutritionPanel`, `BodyConditionPanel`) | **Improve** | Preserves private journaling, meal/sleep/mood/energy logs, and local IndexedDB photos; adds explicit **Privacy Scope** toggle (default: Strictly Private) and removes stale `sleepCondition`/`nutritionCondition` drift in `dailyLogs`. |
| `CareerCoach` & `GymCoach` | **Preserve & Extend** | Preserves project/meeting coaching, Google Calendar direct OAuth/`.ics`, and workout readiness; integrates with Agnes 2.0 `Career Coach` & `Wellness Companion` modes. |
| `DailyReflectionCard` | **Preserve** | Remains 100% local deterministic reflection aligned with the `PURPOSE` dimension. |
| `aiService.ts` + `proxy/gateway.mjs` | **Improve** | Evolves into **Agnes AI 2.0** with 10 expertise modes, explicit consent-checked context builder, and consolidated server gateway. |
| `coinEconomy` + `coinTransactions` | **Improve (Critical)** | Keeps 1-coin default & Admin configurability, but migrates reward issuance & MyValue redemption to **server-authoritative idempotent endpoints**. |
| `RewardsAndGrowth` & `PromoNewsPanel` | **Preserve & Improve** | Preserves self-rewards & official Indomaret/Alfagift feed; improves stale-feed fallback so active promos stay visible until `end` date even if cron runs late. |
| `AdminDashboard` & `AdminParticipantInspector` | **Improve** | Code-split to `/admin` route; splits broad `isStaff()` into least-privilege roles (`mentor`, `trainer`, `institution_viewer`, `operator`, `auditor`, `admin`, `super_admin`); adds Academy CMS, Cohort Management, Mentor Review Queue, and Integration Health monitor. |
| `discoveredPerks`, `growthNews`, `groundingSources` (dead fields) | **Remove Only With Approval** | Keep ignored in v4 schema during transition; remove only after explicit approval & migration cleanup. |
| `functions/src/index.ts` & duplicate `server/` | **Remove Only With Approval** | Retire duplicate/unsafe proxy codebases only after unified production backend runtime is approved and verified. |

---

## 6. End-to-End User Journeys

### Journey A — New Sociopreneur Participant (Day 1 to Impact)
1. **Signup & Awakening 2.0:** Signs up on `levelup.sociopreneur.online` (or lands via course-purchase enrollment link from `sociopreneur.online`). Selects profession (e.g., *Agribisnis, Kopi & Ekspor Komoditas*) + **Sociopreneur Pathway**. Completes optional purpose/skills/resources snapshot.
2. **Instant Personalized OS:** Lands on **Today HUD** with their 10-stage Sociopreneur Dream Map initialized at Stage 1 (`Awakening`), Day 1 morning check-in ready, and Dual-Track tasks (Career + Stage 1 Discover micro-step).
3. **Daily Loop:** Checks in → types daily targets → system captures targets to To-Do list + pairs a Dream/Academy/Studio step → completes tasks & workouts → earns **EXP + Streaks + 1 Coin (server-issued)**.
4. **Learn & Build Loop:** Opens **LevelUp Academy** → completes Lesson + Quiz → assignment links directly to **Business Studio** (*Social Problem Canvas* & *Customer Research*) → logs 5 real customer interviews as **Validated Evidence** → submits for **Mentor Review**.
5. **Progression & Ecosystem Graduation:** Mentor approves evidence → unlocks **Competency Badge** & advances **Business Development Level** (`Prototype → Validate → Launch`) → completes **HPP/Pricing**, **Legal Readiness**, and **Export Readiness** → submits product via **Product Readiness** contract to `sociopreneur.online` marketplace → receives live order & impact telemetry back in LevelUp!

### Journey B — Existing LevelUp v1 User Upgrading Without Friction
1. Opens `levelup.sociopreneur.online`; all existing quests, streaks, level, skills, journal, and coin balance load identically (`schemaVersion: 3` auto-compatible).
2. Sees optional top banner: *"LevelUp 2.0 tersedia: Pilih Jalur Pengembangan (Sociopreneur / Karier / Bisnis) atau tetap di mode saat ini."*
3. If opted in, completes a 2-minute Awakening 2.0 delta step (Pathway + Purpose) without resetting their active Dream Map or history.

### Journey C — Cohort Mentor / Trainer Workflow
1. Signs in with verified `mentor` or `trainer` account scoped strictly to assigned `cohortIds`.
2. Views **Cohort Overview** (aggregated progress, Academy submissions, Business Studio canvases, and evidence pending review) — **never** sees participants' private health, sleep, or mood journals unless the participant explicitly opted into wellness coaching sharing.
3. Reviews submitted prototype/canvas evidence using structured rubric → marks `Approved` or `Revision Requested` with actionable feedback → triggers participant Competency progression and a revision/next-step quest automatically.

---

## 7. Navigation & Information Architecture

Design principle: **Keep the Blender Studio Tactical HUD aesthetic & gamified OS feel** — integrate Academy, Business Studio, and Agnes 2.0 as native OS workspaces, NOT a dry sidebar LMS.

### 7.1 Primary Participant Navigation (5 Core Workspaces)

| # | Workspace Route | Mobile Bottom Tab | Desktop Top-Bar / Rail Module | Contents |
| --- | --- | --- | --- | --- |
| 1 | `/today` (default `/`) | **Today** (`Hari Ini`) | **Command Center (Today HUD)** | Daily Reflection, Status/3-Level HUD, Dual-Track Daily Quests (with pending badge), Energy/Meal Check-in, Work & Workout Coaches, Calendar |
| 2 | `/roadmap` | **Dream** (`Impian`) | **Dream Map & Skills** | Pathway Roadmap (5-phase or 10-stage Sociopreneur), Milestone Evidence Gates, Habit Skills vs Verified Competencies, Portfolio & Certificates |
| 3 | `/academy` | **Academy** (`Belajar`) | **LevelUp Academy** | Course Catalog, Enrolled Courses, Modules/Lessons, Quizzes, Assignments, Cohort Feed, Mentor Feedback |
| 4 | `/studio` | **Studio** (`Bisnis`) | **Business Studio** | Venture Selector + 16 Interactive Tools grouped into 4 Studio Wings: *Discovery (1-4)*, *Design & Prototype (5-8)*, *Finance & Ops (9-13)*, *Scale & Impact (14-16)* |
| 5 | `/hub` | **More / Hub** (`Lainnya`) | **Agnes Copilot, Rewards & Ecosystem** | Agnes AI 2.0 (10 Expertise Modes), Coin Wallet & History, Self-Rewards, Promo News, Sociopreneur.online Product/Marketplace Bridge, Privacy & Consent Settings |

*(Desktop keeps the crisp sticky header with quick workspace switcher pills, Sync status, Language `ID/EN`, Settings, and Role-based Console shortcut; Mobile keeps the familiar 5-tab fixed bottom bar so thumb ergonomics never regress!)*

### 7.2 Staff / Admin / Mentor Information Architecture (`go-levelup.sociopreneur.online`)
Lazy-loaded separate bundle (`AdminApp`), dynamically showing only tabs authorized for the signed-in role:
- **Cohort & Mentor Desk** (`mentor`, `trainer`, `admin`): Assigned cohorts, pending evidence/assignment reviews, rubric grading, course authoring (`trainer`/`admin`).
- **Participant Directory & Consented Analytics** (`admin`, `operator` limited, `auditor` read-only): Aggregated cohort analytics, consented coaching telemetry, account status/quota management.
- **Economy & Partner Console** (`admin`, `super_admin`): Coin economy config, MyValue/partner vault, ledger reconciliation monitor, anomaly alerts.
- **Agnes AI & Audit Console** (`admin`, `auditor`): Shared AI config, per-mode quota limits, prompt safety status, real-time AI usage logs.
- **Ecosystem Integrations & Feature Flags** (`admin`, `super_admin`): `sociopreneur.online` webhook status, enrollment sync logs, product submission approvals, feature flag rollout toggles.
- **Access & Roles (RBAC)** (`super_admin`, `admin`): Staff role grants, cohort assignments, institution viewer scopes.
