# LevelUp 2.0 — Sociopreneur Development Operating System

> **Brand Identity (Preserved):** Level Up System — *Awaken Your Entrepreneurial Spirit*
>
> **Extended Positioning (v2.0):** *Level Up Yourself. Level Up Your Business. Level Up Your Impact.*
>
> **Planning Stage Notice:** Read-only repository audit & architecture planning complete. No production application code, Firestore records, authentication settings, DNS records, or deployments were modified in this stage.

---

## Executive Summary

**Level Up System** (`level-up-Project`, currently v3.3.0 / `PLAYER_SCHEMA_VERSION = 3`, ~16,611 lines across frontend, rules, and three proxy targets) is a live, offline-first React + TypeScript + Vite + Tailwind + Firebase PWA serving participants at `https://levelup.sociopreneur.online` and staff at `https://go-levelup.sociopreneur.online`.

It already has a strong gamified personal-growth core: 30 profession presets, daily quests with automatic check-in target capture (Career + Dream dual-track), 5-phase Dream Map, automatic permanent skills, morning/day/evening journaling with mood/sleep/meal/energy tracking, workout coaching, Google Calendar direct OAuth + `.ics`, deterministic daily reflection, scoped Agnes AI roadmap breakdown via Vercel proxy, streak tracking, a configurable 1-coin reward economy, and an Admin Control Center with RBAC and participant habit analytics.

However, our code-level audit uncovered **three critical blockers** that must be resolved before evolving into **LevelUp 2.0** (integrated LMS Academy, Business Studio, Agnes AI 2.0, Sociopreneur.online ecosystem integration, and real-value MyValue coin redemption):

1. **Client-Authoritative Coin Economy (Critical Financial Risk):** Clients can currently write `profile/main.gold` and create `earn` entries in `users/{uid}/coinTransactions` directly from the browser. Monetary or MyValue redemption is a **strict NO-GO** until server-authoritative issuance, idempotency keys, and balance reconciliation are live.
2. **Over-Broad Staff Access to Private Health/Mood Journals (Critical Privacy Risk):** `firestore.rules` currently allows all verified staff (`admin`, `operator`, `auditor`) to read every participant's private mood/sleep/meal/pain journal and synced Google Calendar events. LevelUp 2.0 must introduce consent-scoped privacy boundaries and least-privilege cohort roles (`mentor`, `trainer`, `institution_viewer`) before onboarding cohorts or institutional partners.
3. **Backend Fragmentation & Monolithic Frontend Bundle (High Technical Debt):** Three divergent AI proxy codebases exist (`proxy/gateway.mjs` live on Vercel, `server/src/index.ts` for Render, and `functions/src/index.ts` with unresolved SSRF/CORS/arbitrary-prompt vulnerabilities), while `src/App.tsx` (1,697 lines) and `AdminDashboard.tsx` + `AdminParticipantInspector.tsx` (2,504 lines combined) are eagerly bundled into the 630 kB participant JS chunk with zero automated unit/E2E tests.

LevelUp 2.0 evolves the existing system **incrementally without a rewrite**, preserving every existing account, UID, quest, journal, skill, streak, and coin balance while adding the 7 Development Dimensions, 6 optional Pathways, Awakening 2.0, 3-tier gamification (Experience / Competency / Business), LevelUp Academy, Business Studio (16 interactive tools), Agnes AI 2.0 (10 expertise modes), and clean API contracts with `sociopreneur.online` and `socioline.sociopreneur.online`.

---

## Documentation Map (All 19 Required Deliverables)

| Document | Deliverables Covered |
| --- | --- |
| [01-existing-system-audit-and-inventory.md](./01-existing-system-audit-and-inventory.md) | **#1** Existing System Audit · **#2** Feature Inventory |
| [02-prd-mapping-journey-ia.md](./02-prd-mapping-journey-ia.md) | **#3** Product Requirements Document · **#5** Existing-to-New Feature Mapping · **#6** User Journey · **#7** Navigation & Information Architecture |
| [03-architecture-and-data-model.md](./03-architecture-and-data-model.md) | **#4** Current vs Target Architecture · **#8** Data Model & Firestore Schema Plan |
| [04-gamification-lms-studio-ai.md](./04-gamification-lms-studio-ai.md) | **#9** AI Architecture (Agnes 2.0) · **#10** Gamification Architecture · **#11** LMS Architecture (LevelUp Academy) · **#12** Business Studio Architecture |
| [05-security-privacy-economy-and-integration.md](./05-security-privacy-economy-and-integration.md) | **#13** Security, Privacy & Coin Economy Improvement Plan · **#14** Ecosystem Integration API Contracts |
| [06-migration-backlog-sprints-testing-risks.md](./06-migration-backlog-sprints-testing-risks.md) | **#15** Migration & Rollback Plan · **#16** Prioritized Development Backlog · **#17** Sprint Planning · **#18** Testing & Acceptance Criteria · **#19** Risks, Dependencies, Blockers & GO/NO-GO |

---

## Scope Governance: Preserve / Improve / New / Defer / Remove-With-Approval

| Decision | Scope Items |
| --- | --- |
| **Preserve (100% Backward Compatible)** | Brand identity; all 30 profession presets & E→S ranks; all existing Firebase UIDs, profiles, `STUDY`/`CAREER`/`FITNESS` quests, 5-phase Dream Map, permanent skills, daily journal/check-ins, workout coaching, calendar OAuth/`.ics`, reflection, promo news, PWA offline cache, existing coin balances & historical logs. |
| **Improve (Refactor / Harden)** | Split `src/App.tsx` & lazy-load Admin bundle; consolidate backend into single authoritative API runtime; replace blanket `isStaff()` journal reads with consent-scoped least-privilege RBAC; fix stale `sleepCondition`/`nutritionCondition` writes in `dailyLogs`; establish Vitest + Firestore Emulator + Playwright CI suite; verify Google Calendar OAuth scope for public users. |
| **Newly Implement (v2.0 Core)** | 7 Development Dimensions & 6 optional Pathways; Awakening 2.0 optional assessment; 10-stage Sociopreneur Roadmap + evidence gates; 3-axis progression (Experience / Competency / Business); LevelUp Academy (Courses, Modules, Lessons, Quizzes, Assignments, Cohorts, Mentor Reviews, Certificates); Business Studio (16 canvases & deterministic calculators with AI-assumption vs validated-evidence tags); Agnes AI 2.0 (10 modes with explicit data boundaries); Server-Authoritative Coin Wallet & Ledger; `sociopreneur.online` integration webhooks/APIs. |
| **Defer (Post-v2.0 / Phase 6+)** | Real-money / MyValue live redemption (deferred until Phase 5 security & reconciliation gates pass); live mobile native app wrappers; multi-tenant white-label institutional billing; automated B2B buyer matching inside LevelUp (stays on `sociopreneur.online`). |
| **Remove Only With Explicit Approval** | Deprecated `functions/src/index.ts` (divergent unsafe proxy) and unused `render.yaml`/`server/` duplication once single backend runtime is chosen; dead `PlayerProfile` fields (`discoveredPerks`, `growthNews`, `groundingSources`); legacy `admins/{uid}` collection once migrated to unified RBAC + Custom Claims; hardcoded `stefenlaksana.sl@gmail.com` literals after super-admin claim bootstrap. |

---

## Executive Phase-by-Phase GO / NO-GO Summary

| Phase | Target Sprints | Primary Scope | Recommendation | Key Gate / Blocker |
| --- | --- | --- | --- | --- |
| **Phase 0: Foundation, Security, Privacy & Testing** | Sprint 1–2 | Modularize `App.tsx`, code-split Admin, Vitest + Emulator CI, privacy-scoped RBAC, feature flags, unified backend selection | **GO** | Immediate start; zero external blockers; unblocks all subsequent phases. |
| **Phase 1: 7 Dimensions, Pathways, Awakening 2.0 & Dream/Quest 2.0** | Sprint 2–3 | Schema v4 additive fields, 6 pathways, Awakening 2.0 opt-in upgrade, 10-stage Sociopreneur Dream Map, evidence-gated milestones, 3-tier gamification skeleton | **GO** | Depends on Phase 0 feature flags & schema v4 emulator rule tests. |
| **Phase 2: LevelUp Academy (Integrated LMS)** | Sprint 4–5 | Courses, modules, lessons, quizzes, assignments, cohorts, mentor review queue, competency levels, verifiable certificates, Quest/Dream links | **CONDITIONAL GO** | Requires Phase 0 cohort-scoped `mentor`/`trainer` RBAC & `firestore.indexes.json` composite indexes. |
| **Phase 3: Business Studio (16 Tools) & Portfolio** | Sprint 5–6 | Venture workspace, 16 canvases, deterministic HPP/Cashflow/BEP calculators, experiment tracker, AI-assumption vs validated-evidence engine, Business Level progression | **CONDITIONAL GO** | Requires Phase 1 3-tier progression & Evidence Vault storage policy (Firebase Storage or link-only decision). |
| **Phase 4: Agnes AI 2.0 (10 Modes) & Ecosystem APIs** | Sprint 7 | Unified server AI gateway (10 modes + PII/consent filter), `sociopreneur.online` course enrollment/refund, product submission, order feedback, impact summary APIs | **CONDITIONAL GO** | Requires unified backend runtime decision (Cloud Run / Functions v2 / Vercel) + shared HMAC secret exchange with `sociopreneur.online` team. |
| **Phase 5: Server-Authoritative Coin Economy & MyValue Redemption** | Sprint 8+ | Server-only reward minting, idempotent wallet ledger, daily reconciliation, fraud guardrails, partner webhook integration, security pen-test | **NO-GO (for Monetary Activation Today) / CONDITIONAL GO (for Engineering Build in Sprint 8)** | **Hard Gate:** Monetary/MyValue redemption MUST remain disabled (`partnerEnabled: false`) until server-only issuance, reconciliation tests, adversarial security audit, and operational sign-off are 100% passed. |
