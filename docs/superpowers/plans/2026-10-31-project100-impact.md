# Project100 Impact Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. User authorised proceeding with implementation; implement inline and obtain a final independent review.

**Goal:** Connect geographic support groups, verified contributions, local plans and impact updates.

**Architecture:** Add a separate impact domain under `lib/project100/impact`, preserving existing applications. Authenticated member and admin routes call constrained database operations. Bachs checkout and settlement reuse the current provider boundary with a dedicated purpose.

**Tech Stack:** Next.js 16, React 19, Supabase Postgres/storage, Bachs, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-31-project100-impact-design.md`

## Global Constraints

- Nigeria uses state groups and local projects. Six countries: Ethiopia, Ghana, Cameroon, Kenya, Benin, DR Congo.
- Preserve old allocations and explicit joins; no random destination guesses.
- Integer minor units; separate NGN/USD totals; provider-confirmed contributions only.
- No production mutation, live checkout, payment or broadcast during verification.
- Existing unrelated edits in `lib/events/live-calendar.ts` and `lib/sessions.ts` remain untouched.

## Review Focus

- An ambiguous imported location must remain unassigned.
- Retried or concurrent checkout must preserve its original destination and attribution.
- Late success cannot release funds frozen by refunds/disputes.
- Concurrent expenditure records must not overspend a group.
- Photos and attribution must not expose private contact/payment data.

### Task 1: Domain and database

Files: `lib/project100/impact/{types,grouping,validation}.ts`, additive migration, `tests/project100/impact-domain.test.ts`, database integration tests.

- [x] Write/run failing tests for state matching, aliases, ambiguous/international cases, preserved joins and integer amounts.
- [x] Implement `planImpactGroups(applications, memberships, groups)` and validated join/contribution/admin input schemas.
- [x] Create additive tables, seeded state/country groups, RLS/grants and transactional RPCs for settlement, snapshot and expenditure.
- [x] Run domain tests and isolated PostgreSQL integration tests for repeat events and concurrent spending.

### Task 2: Services and APIs

Files: `lib/project100/impact/{server,payments}.ts`, member/admin impact routes, dedicated Bachs webhook; current Bachs checkout types/builder.

- [x] Write/run failing tests for contribution purpose, amount/currency evidence and permission boundaries.
- [x] Implement authenticated snapshots, explicit join, one-click grouping report, projects, spending and owned image updates.
- [x] Implement stable contribution reservations, Bachs checkout, reconciliation and signed webhook handling with terminal review state.
- [x] Run project/payment/route regressions.

### Task 3: Member and admin experience

Files: scholarship page, impact components/CSS, admin Project100 page/nav, dashboard card copy.

- [x] Build overview → group → contribution → confirmation with genuine empty/error/loading states.
- [x] Build group plans, supporters and member/admin photo updates.
- [x] Build admin totals, grouping report, projects and evidence-backed spending; link top-up to the member journey.
- [x] Check narrow and wide rendering, keyboard navigation and form errors.

### Task 4: Verification and handoff

- [x] Run typecheck, scoped lint, relevant regression tests and full Vitest suite.
- [x] Obtain independent review and fix material findings with regression tests.
- [x] Document migration/webhook/flag activation steps and observed verification limits.


## Execution evidence

- 86 tests passed across 16 targeted files, including 9 opt-in PostgreSQL integration tests. Type checking and scoped ESLint completed cleanly.
- The final production build passed, including compilation, TypeScript and generation of 256 static pages.
- Local member browser fixtures exercised joining Kaduna, supporters, a photo/caption update and review of a ₦1 million organisation contribution. A local admin component harness exercised grouping, project publishing and delivery recording. Narrow (430px) and desktop (1440px) rendering were inspected; measured document width matched viewport width. No live provider checkout, production mutation or message was sent.
- Independent review findings were fixed: no inferred Project100 consent; canonical state matching with ambiguity rejection; provider reconciliation before expired-checkout replacement; reference/metadata resolution and retryable early webhooks. Additional checks freeze duplicate charge evidence without overwriting the original charge and keep funding visible when a private photo is unavailable.
- The full repository suite remains red outside this feature: 11 failures reproduced from untouched HEAD, plus two pre-existing demo cover-render tests exceeding their 5-second limit. Both cover tests passed with a 30-second diagnostic timeout. No unrelated source was changed to suppress those failures.
- Work remains in the current checkout for review. Production migration, private storage verification, dedicated Bachs webhook configuration and deployment are release steps, documented in the operations guide.
