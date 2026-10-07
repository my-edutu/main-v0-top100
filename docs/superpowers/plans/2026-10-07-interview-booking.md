# Interview Booking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Native execution in this session is recommended; delegation remains subject to user selection.

**Goal:** Implement authenticated interview requests, staff-proposed appointments, member acceptance, and reliable notifications inside Top100.

**Architecture:** Extend the existing interview application queue with a transactional booking service and durable delivery outbox. Member and admin UI consume the same explicit state transitions; direct scheduling patches cannot bypass them.

**Tech Stack:** Next.js App Router, React, TypeScript, Supabase/PostgreSQL, existing Brevo mailer and dashboard notifications.

**Spec:** ../specs/2026-10-07-internal-interview-booking-design.md

## Global Constraints

- Defaults: 30-minute interviews, 15-minute buffer, three active reservations per team-local day; Africa/Lagos team time zone, one shared resource.
- Admin configures working windows before any slots can be proposed. No invented availability.
- Minimum notice 24 hours; proposal expiry min(48 hours after proposal, two hours before start).
- One active request per member; proposed and confirmed bookings reserve capacity.
- Scheduling and event/outbox writes commit atomically. Share no internal notes or service-role keys with members.
- Public application and existing editorial publication workflows remain compatible.
- Reminder worker runs at least once per minute using authenticated infrastructure; deployment configuration is necessary for reminders to work.

## Review Focus

- Legacy email matches must not establish member ownership automatically (Task 1).
- Daylight-saving gaps/repeated hours must not produce ambiguous reservations (Task 1).
- Concurrent approval/reschedule/expiry must preserve a single authoritative revision (Task 1).
- Email timeouts must not lose appointments or claim delivery success (Task 2).
- Mobile keyboard and long member names must not hide the only action (Tasks 3–4).

## Task 1: Transactional scheduling and authorization

Files: create lib/interviews/booking-schema.ts, booking-service.ts, booking-types.ts; create an additive migration using the installed CLI; create app/api/member/interview/route.ts, app/api/member/interview/[id]/actions/route.ts, app/api/admin/interview-bookings/route.ts, app/api/admin/interview-scheduling-settings/route.ts; modify app/api/admin/interview-applications/route.ts; tests/interviews/booking-service.test.ts and booking-concurrency integration tests.

Interfaces: BookingAction discriminated union (approve, decline, propose, accept, request_change, reschedule, cancel, complete); applyInterviewAction(actor, applicationId, revision, action) returns the committed application/booking snapshot. All mutation entry points validate authenticated ownership/admin roles, payloads and same-origin requests. Status read supplies settings, application, current booking, and safe history.

- [ ] Write failing tests: exhausted daily capacity rejects a fourth reservation; overlapping buffer intervals reject; simultaneous slot reservations yield one success; stale acceptance after reschedule returns conflict; proposal past its deadline cannot be accepted; legacy member mismatch is forbidden; DST gaps/repeats are rejected/disambiguated.
- [ ] Run focused Vitest tests and PostgreSQL integration tests; confirm intended failures.
- [ ] Implement versioned booking records, exclusion constraint, active-request uniqueness, resource/day locking, validated settings and transactional transitions/audit/outbox writes. Member identity comes from the server session. All functions are service-scoped and new tables have RLS.
- [ ] Preserve legacy editorial patch fields, but route scheduling/state changes through transitions. Reject direct scheduled_at mutations that bypass reservations.
- [ ] Verify tests pass and run Supabase advisors on the target development database. Commit this unit. Never apply unverified changes to production.

## Task 2: Reliable notifications, reminders and calendar export

Files: create lib/interviews/booking-notifications.ts, booking-worker.ts, booking-calendar.ts; create app/api/internal/interview-bookings/process/route.ts and app/api/member/interview/[id]/calendar/route.ts; extend lib/interviews/emails.ts; tests/interviews/booking-notifications.test.ts, booking-worker.test.ts, booking-calendar.test.ts.

Interfaces: processInterviewJobs(db, mailer, now) claims leased due jobs, expires proposals transactionally and sends email/dashboard notifications; calendarExport(booking, member) returns an authenticated ICS document with stable UID and sequence. ADMIN_NOTIFICATION_EMAIL and verified Brevo settings are deployment requirements.

- [ ] Write failing tests: no duplicate dashboard entry on replay; email failure retains retryable state; old revision reminders skip; cancelled bookings never remind; late jobs after start skip; worker requests without valid secret fail; calendar reschedule retains UID and increments sequence.
- [ ] Run tests and confirm intended failure.
- [ ] Implement event-derived templates for every spec transition; distinguish unscheduled request, approved request, proposal and confirmed appointment. Verify leases/retries, per-recipient/channel/revision keys, due reminders and safe errors. Track provider message IDs; do not promise exactly-once email when Brevo cannot guarantee it.
- [ ] Add worker environment instructions and a concrete one-minute scheduler configuration for the confirmed hosting environment; run an authorized fixture flow without sending real users test messages.
- [ ] Verify tests and commit.

## Task 3: Member request and appointment UX

Files: create app/dashboard/me/interview/page.tsx and its focused form/status components, lib/interviews/booking-client.ts; modify app/dashboard/_components/dashboard-home.tsx and app/dashboard/_lib/navigation.ts; tests/interviews/member-booking-ui.test.tsx and member-booking-api.test.ts.

Interfaces: consume Task 1 read/transition contracts. The browser never decides capacity or ownership. Prefill identity from existing member state; preferences use editable IANA time zone. Send request, accept, change request and cancel require explicit member interaction and show committed results.

- [ ] Write failing tests for all form fields and statuses, restored inputs after failed submission, duplicate-submit protection, own-request access and unscheduled receipt copy.
- [ ] Run tests and confirm failure.
- [ ] Build one short form and a persistent status page with dates in member and team time zones, acceptance deadline, meeting link and authenticated calendar download. Confirmed and proposed states remain visually distinct. Add keyboard focus/error relationships and phone-safe controls.
- [ ] Redirect interview links inside the dashboard; preserve external public application route and clarify written format handling.
- [ ] Verify test/type/lint checks and browser flows at 360px, 768px and desktop; commit.

## Task 4: Admin queue, schedule and release checks

Files: extend app/admin/interviews/_components/InterviewsAdminClient.tsx; create focused interview request detail, schedule and settings components; tests/interviews/admin-booking-ui.test.tsx and admin-booking-api.test.ts; docs/interview-booking-operations.md.

Interfaces: consume Task 1 admin settings/availability/actions and Task 2 delivery status/retry. Preserve existing Interviews publication editing. Requests and Schedule tabs retain filters/context after operations.

- [ ] Write failing tests: non-admin rejects; unavailable/expired slot cannot be proposed; failed conflict preserves draft; capacity reduction preserves existing reservations; internal notes never reach member view; retry actions require admin authorization.
- [ ] Run tests and confirm failure.
- [ ] Implement review/approve/decline/propose/reschedule/cancel/complete controls, mobile day agenda, settings with no default working days, actionable delivery errors and audit history. Require meeting URL for video proposals and member-facing change reasons.
- [ ] Exercise full request → approval → proposal → acceptance → reschedule → reacceptance with authorized test fixtures. Verify simultaneous bookings and email outage/recovery. Document scheduler activation and email sender requirements.
- [ ] Run relevant tests, typecheck, lint and browser checks; record real verification limits. Push the implementation after all required checks pass.
