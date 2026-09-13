# Project100 Scholarship Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a persisted Project100 Scholarship application flow for members and a secure admin workspace that filters and saves random applicant cohorts.

**Architecture:** Add one Supabase migration and focused server modules for schedule, applications, grouping, and exports. Keep member and admin pages thin: they load through authenticated route handlers and render isolated client components for the stepper, table, filters, and group results.

**Tech Stack:** Next.js App Router 16, React client components, Supabase server client, PostgreSQL functions/constraints, Vitest, existing Tailwind/shadcn primitives.

**Spec:** `docs/superpowers/specs/2026-09-09-project100-scholarship-design.md`

## Global Constraints

- Default application deadline is `2026-11-07T23:59:59.000Z` and default kickoff is `2027-01-01T00:00:00.000Z`.
- Member access is scoped to the authenticated member; admin mutations use the existing admin authorization guard.
- Submitted applications are immutable to members; drafts remain resumable until the deadline.
- Grouping is saved as a run with filters, group size, seed, and durable membership rows; previous runs are never mutated.
- Do not change award payment, delivery, notification, or existing award status behavior.

---

### Task 1: Persist scholarship applications and schedule

**Files:**
- Create: `supabase/migrations/20260909120000_project100_scholarship.sql`
- Create: `lib/project100/types.ts`
- Create: `lib/project100/validation.ts`
- Create: `tests/project100/schema-contract.test.ts`

**Interfaces:**
- Produces `Project100ApplicationStatus`, `Project100Application`, `Project100Schedule`, and shared validation helpers for route handlers and UI.
- Tables: `project100_settings`, `project100_applications`, `project100_grouping_runs`, `project100_groups`, `project100_group_members`.

- [ ] Write contract tests for default schedule, enum values, required application fields, and group membership uniqueness.
- [ ] Add the migration with constraints, indexes, defaults, the one-row settings seed, and RLS policies for member-owned application access.
- [ ] Implement pure validation and serialization helpers for phone, location, consent, and editable schedule values.
- [ ] Apply the migration to an isolated local PostgreSQL database and rerun it to prove idempotent setup generation.

### Task 2: Member application API

**Files:**
- Create: `lib/project100/server.ts`
- Create: `app/api/member/project100/route.ts`
- Create: `app/api/member/project100/submit/route.ts`
- Create: `tests/project100/member-api.test.ts`

**Interfaces:**
- `GET /api/member/project100` returns schedule, the current member’s application, and a server-derived `canEdit` flag.
- `PUT /api/member/project100` accepts one validated draft payload and preserves existing answers not included in the request.
- `POST /api/member/project100/submit` validates the complete application, checks the deadline again server-side, and returns the submitted record.

- [ ] Write route tests for unauthenticated access, member isolation, draft saves, missing required fields, deadline closure, duplicate submit, and successful submission.
- [ ] Implement server reads/writes through the authenticated Supabase client and use the admin client only for schedule reads that must bypass member RLS.
- [ ] Return safe response shapes without internal ids beyond the application id needed for resume.

### Task 3: Member overview and stepper

**Files:**
- Modify: `app/dashboard/_lib/navigation.ts`
- Modify: `app/dashboard/me/page.tsx`
- Create: `app/dashboard/me/project100-scholarship/page.tsx`
- Create: `app/dashboard/project100-scholarship-section.tsx`
- Create: `app/dashboard/project100-application-stepper.tsx`
- Modify: `app/dashboard/dashboard.css`
- Create: `tests/project100/member-ui.test.tsx`

**Interfaces:**
- `Project100ScholarshipSection` consumes the route response and exposes overview, countdown, closed, draft, submitted, and error states.
- `Project100ApplicationStepper` emits validated draft updates and a single submit action; it never marks a record submitted from the browser alone.

- [ ] Write component tests for all step labels, draft resume, next/back transitions, inline errors, closed state, and submitted state.
- [ ] Add the navigation item and Me index description without disturbing existing routes.
- [ ] Build the image-led overview using authorised local assets, a reliable scrim, and reduced-motion-safe crossfade rotation.
- [ ] Build the form with visible labels, mobile-safe controls, progress, saved status, and accessible error descriptions.
- [ ] Verify member screens at 360px and desktop widths with no horizontal overflow.

### Task 4: Admin schedule and application API

**Files:**
- Create: `lib/project100/admin-server.ts`
- Create: `app/api/admin/project100/route.ts`
- Create: `app/api/admin/project100/settings/route.ts`
- Create: `app/api/admin/project100/export/route.ts`
- Create: `tests/project100/admin-api.test.ts`

**Interfaces:**
- `GET /api/admin/project100` accepts query filters and returns paginated applications plus filter options.
- `PATCH /api/admin/project100/settings` updates deadline/kickoff and returns the normalized schedule.
- `GET /api/admin/project100/export` returns a CSV with the approved contact and application fields.

- [ ] Write admin authorization, filtering, pagination, settings-validation, and export-shape tests.
- [ ] Implement server-side filter parsing for country, location, status, consent, interest, area, and search.
- [ ] Add schedule updates with audit metadata and reject deadlines that are malformed or kickoff dates before the deadline.
- [ ] Build CSV escaping that safely handles commas, quotes, newlines, and phone numbers.

### Task 5: Grouping API and admin workspace

**Files:**
- Create: `lib/project100/grouping.ts`
- Create: `app/api/admin/project100/group/route.ts`
- Create: `app/api/admin/project100/groups/route.ts`
- Create: `app/admin/project100/page.tsx`
- Create: `app/admin/project100/project100-admin-workspace.tsx`
- Modify: `app/admin/nav-config.ts`
- Create: `tests/project100/grouping.test.ts`

**Interfaces:**
- `POST /api/admin/project100/group` accepts `{ filters, groupSize, seed? }` and returns a saved grouping run with groups and members.
- `GET /api/admin/project100/groups` returns prior runs and their durable group membership.
- `groupApplications(applications, groupSize, seed)` returns reproducible groups and leaves a remainder group when the population is not divisible by the selected size.

- [ ] Write tests for positive group sizes, oversized groups, seeded reproducibility, remainder handling, no duplicate membership, consent filtering, and repeated runs.
- [ ] Implement a cryptographic/random seed path that is recorded with every run and deterministic shuffling when a seed is supplied for audit/replay.
- [ ] Insert a run and all membership rows transactionally through a server-only RPC or transaction-safe SQL function.
- [ ] Build the admin table, filter controls, schedule editor, group-size selector, shuffle action, saved-run list, group detail panel, WhatsApp links, email links, and CSV buttons.
- [ ] Add the Project100 item to the admin sidebar and verify the existing admin shell remains intact on mobile.

### Task 6: Integration verification and setup documentation

**Files:**
- Modify: `supabase/SETUP-ALL.sql`
- Modify: `scripts/build-setup-sql.mjs`
- Modify: `docs/E2E-TESTING.md`
- Modify: `docs/bachs-integration.md` only if setup instructions need cross-linking

- [ ] Regenerate setup SQL and confirm the new migration appears exactly once.
- [ ] Run `npm test`, `npm run typecheck`, and `npm run build`.
- [ ] Exercise the member draft/submit path and admin filter/group/export path locally with non-production data.
- [ ] Record any unavailable external verification, especially live Supabase or email/WhatsApp delivery, without claiming it was tested.
