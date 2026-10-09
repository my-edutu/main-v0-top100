# 2026 Participant Handbook Onboarding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish the supplied 2026 handbook in the member inbox, a one-time nonblocking dashboard prompt, and the awardee onboarding checklist.

**Architecture:** Serve one versioned same-origin PDF from `public/handbooks`. Extend the existing awardee journey progress row/RPC/API for prompt-seen and read acknowledgement, and reuse the existing member notification inbox and admin broadcast route with a server-resolved 2026 approved audience and campaign deduplication.

**Tech Stack:** Next.js 16 App Router, React, TypeScript, Supabase Postgres/RPC, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-09-participant-handbook-onboarding-design.md`

## Global Constraints

- The initial audience is current approved 2026 awardees. Do not target pending claims, applicants, or unrelated members.
- Publish the asset at `/handbooks/2026-participant-handbook.pdf` and keep the path in one shared configuration.
- Notification read state, popup dismissal, and handbook acknowledgement are distinct states.
- Extend the existing `awardee_onboarding_progress` table; do not create another database, Supabase project, table, or storage service.
- Keep the dashboard accessible when the PDF fails or a member defers the prompt.
- Do not send email. Do not perform the one-time notification broadcast during implementation.
- Do not modify awardee or applicant records to make them eligible.

## Review Focus

- Missing or ambiguous cohort/year values must exclude a profile from the audience; test mixed and incomplete audience records in Task 4.
- A dismissed prompt must not count as handbook completion; test independent prompt/read timestamps in Tasks 2 and 3.
- Failed acknowledgement persistence must not show a completed checklist; test save failure UI in Task 3.
- Retried campaign delivery must not duplicate a member notification; test idempotent campaign filtering in Task 4.
- An unsupported or external CTA URL must not be accepted for handbook delivery; test URL validation in Task 4.

---

### Task 1: Handbook asset and shared metadata

**Files:**
- Create: `public/handbooks/2026-participant-handbook.pdf`
- Create: `lib/handbook/participant-handbook.ts`
- Test: `tests/handbook/participant-handbook.test.ts`

**Interfaces:**
- Produces: `PARTICIPANT_HANDBOOK` with `year`, `path`, `notificationTitle`, `notificationMessage`, `notificationCta`, `popupTitle`, and checklist copy; all surfaces use its `path`.

- [ ] **Step 1: Write failing tests** for the stable local PDF path, distinct notification/popup/checklist copy, and the year `2026`.
- [ ] **Step 2: Run** `npm test -- tests/handbook/participant-handbook.test.ts`; expected: FAIL because the config module does not exist.
- [ ] **Step 3: Implement** the typed shared configuration and copy the supplied PDF to the versioned public path without changing its contents.
- [ ] **Step 4: Run** the focused test and verify the copied PDF with `pdfinfo`; expected: PASS and a valid 10-page PDF.
- [ ] **Step 5: Commit** as `feat: add 2026 participant handbook asset`.

### Task 2: Persist handbook prompt and acknowledgement progress

**Files:**
- Create: timestamped migration extending `awardee_onboarding_progress` and existing journey RPCs.
- Modify: `lib/dashboard/awardee-journey.ts`
- Modify: `lib/dashboard/awardee-journey-server.ts`
- Modify: `app/api/member/onboarding-journey/route.ts`
- Test: `tests/dashboard/awardee-journey.test.ts`
- Test: `tests/dashboard/awardee-journey-api.test.ts`
- Test: `tests/dashboard/awardee-journey-server.test.ts`

**Interfaces:**
- Consumes: `PARTICIPANT_HANDBOOK` from Task 1.
- Produces: `handbookPromptSeenAt` and `handbookReadAt` in journey state; authenticated PATCH accepts only `handbookPromptSeen: true` and `handbookRead: true` and writes through the existing service-role boundary.

- [ ] **Step 1: Add tests** that prompt-seen is independent of read completion, read completion adds one core step, and API rejects false/unknown values while always using the authenticated member id.
- [ ] **Step 2: Run** focused journey/API/server tests; expected: FAIL on missing fields and unsupported patch keys.
- [ ] **Step 3: Create** the migration using `supabase migration new participant_handbook_onboarding_progress`; add nullable timestamps and preserve service-role-only RPC access.
- [ ] **Step 4: Implement** the TypeScript journey derivation and API/server persistence without changing existing acknowledgement semantics.
- [ ] **Step 5: Run** the three focused test files and inspect the migration diff; expected: PASS, existing table only.
- [ ] **Step 6: Commit** as `feat: track participant handbook onboarding progress`.

### Task 3: Checklist item and queued one-time prompt

**Files:**
- Modify: `app/dashboard/_components/awardee-onboarding-journey.tsx`
- Modify: `app/dashboard/_components/top100-moment.tsx`
- Create: `lib/dashboard/handbook-onboarding.ts`
- Test: `tests/dashboard/handbook-onboarding.test.ts`

**Interfaces:**
- Consumes: handbook config and progress API from Tasks 1–2.
- Produces: a checklist item with explicit “I’ve read it” save behavior and a dismissible one-time prompt shown only after the existing Top100 Moment is completed or dismissed.

- [ ] **Step 1: Add tests** for the one-time prompt queue, independent dismiss/read state, and acknowledgement persistence failure; the repository's Vitest setup is Node-only and has no React DOM testing library, so exercise the UI's pure state/save helpers directly.
- [ ] **Step 2: Run** focused helper tests; expected: FAIL because the handbook prompt helpers are absent.
- [ ] **Step 3: Implement** the checklist row and prompt using the shared PDF path and copy; opening the PDF alone does not mark it read.
- [ ] **Step 4: Run** focused component tests and existing onboarding journey tests; expected: PASS with the dashboard usable after dismissal.
- [ ] **Step 5: Commit** as `feat: add handbook prompt and checklist step`.

### Task 4: Admin notification audience preview and deduplicated delivery

**Files:**
- Modify: `app/api/admin/notifications/broadcast/route.ts`
- Modify: `app/admin/member-hub/page.tsx`
- Modify: existing member notification insertion/query helpers as needed.
- Test: `tests/admin/notifications-broadcast.test.ts`
- Test: `tests/dashboard/notifications.test.ts`

**Interfaces:**
- Consumes: handbook metadata and path from Task 1.
- Produces: an admin-only audience preview resolving approved 2026 awardees by both cohort and linked awardee year; a separately confirmed send action creates one in-app notification per eligible member, with CTA `/handbooks/2026-participant-handbook.pdf` and a stable campaign key.

- [ ] **Step 1: Add tests** for cohort/year intersection, exclusion of ambiguous rows, local-path validation, count preview without inserts, and campaign retry deduplication.
- [ ] **Step 2: Run** focused broadcast and notification tests; expected: FAIL because preview/campaign semantics do not exist.
- [ ] **Step 3: Implement** server-side audience resolution and a preview response; add an explicit admin send control that displays the count, but do not invoke the send.
- [ ] **Step 4: Implement** allowlisted local CTA validation and deduplication on the existing notifications data model; keep push optional and do not add email.
- [ ] **Step 5: Run** focused admin/notification tests plus the full test suite, typecheck, and lint; inspect the 2026 cohort filter and migration for unintended data/table creation.
- [ ] **Step 6: Commit** as `feat: add handbook notification audience preview`.
