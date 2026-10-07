# Internal interview requests and scheduling

Date: 7 October 2026. Status: design for review; no booking code or database changes implemented.

## Purpose and decisions

Awardees request an interview inside Top100. Staff approve the request and propose a time; members accept before the appointment is confirmed. Both receive dashboard notifications and email for material changes. Limited team capacity must be protected even when two admins act simultaneously.

Selected approach: extend the existing interview application queue with a separate booking lifecycle. Do not import a second scheduling application or create a second editorial application queue. Hosted scheduling would be quicker for automatic self-booking but conflicts with the selected internal approval process. Importing a full open-source scheduler introduces another deployment and database.

Starting defaults, explicitly editable: 30-minute interview, 15-minute buffer after each interview, maximum three active reservations per interview day, one shared interview resource, team time zone Africa/Lagos. No working days or hours are assumed: an admin must configure availability before proposing slots. A proposal expires after 48 hours or two hours before its start, whichever is earlier. Start times require at least 24 hours' notice. Publication/recording consent is separate from appointment acceptance.

## Member experience

Route: /dashboard/me/interview. Change the dashboard link from an external Google Form to this route. Keep the existing public interview application intact.

Initial page: title “Request an interview”; explanation “Tell us what you would like to share. Our team will review your request and propose a time.” Display the signed-in name/email from the profile, with a link to update profile rather than retyping identity.

Fields: short interview topic (required, 10–160 characters); impact story (required, 80–2,000 characters); preferred format (video/written/either); IANA time zone (detected, editable); preferred days/time windows (optional, explicitly preferences); optional additional note (500 characters). Link to the recording/publication consent terms and require the applicable consent for the selected format. No new photo or mandatory long BIO is needed to request a time.

Primary CTA: “Send interview request”. Preserve values on failure and prevent duplicate submission. Success: “Request received. Your interview is not scheduled yet.” Replace the form with a persistent status page and activity history.

Status page:
- Under review: request summary; edit preferences or withdraw request.
- Approved, waiting for a time: explain that the team is arranging a slot.
- Time proposed: prominent date/time, member time zone, duration, team time zone as secondary detail, acceptance deadline. CTA “Accept this time”; secondary “Request another time”. Declining releases the reservation and returns the request to waiting for a time.
- Confirmed: date/time, meeting link, “Add to calendar”, “Request a change”, “Cancel interview”. Written interviews remain editorial requests; staff only propose a live slot if a call is needed.
- Rescheduled: explain that the previous appointment is no longer active; show the new proposed time and require acceptance again.
- Expired proposal: “The proposed time has expired. The team will arrange another time.” No stale acceptance button.
- Completed, declined, or cancelled: show clear final status and permitted next action. Do not treat completion as publication.

Email buttons open the authenticated status page; they never accept, cancel, or reschedule through a GET link. Members can only act on their own request.

## Admin experience

Extend /admin/interviews with Requests and Schedule tabs. Preserve existing published-interview editing and queue context.

Requests: filters for Under review, Approved, Awaiting response, Confirmed, Needs a new time, Completed and Closed. Desktop queue columns: member, topic, format, status, next action, last update. On mobile show stacked summaries and an obvious primary action.

Request detail: story and preferences, member time zone, lifecycle history, internal notes, notification delivery status. Actions: approve, decline with a member-facing explanation, propose time, reschedule, cancel, complete. Internal notes must never appear in member notifications.

Schedule: day/week view plus a mobile day agenda. Show remaining capacity from real reservations (held proposals plus confirmed bookings). Choose an available slot, enter the meeting URL and optional member-facing note, then “Propose time”. Show “This reserves a slot while the member responds”. Another admin taking the slot returns a conflict error with refreshed availability, preserving the draft.

Settings: working windows, excluded dates, team time zone, duration, buffer, daily limit, lead time and proposal expiry. Reducing capacity never silently cancels existing reservations; show existing over-capacity days and block additional reservations. All proposals are constrained by server rules, not just disabled UI controls.

## State and concurrency model

Keep editorial approval separate from booking state. Existing interview_applications statuses remain compatible; add a member identity link for new signed-in applications. A legacy email match alone must not grant ownership of an existing application: staff must verify linking.

Booking states: proposed, confirmed, declined, expired, cancelled, completed. Applications can be pending, approved, declined/closed independent of publication.

Proposed schema: interview_scheduling_settings; interview_bookings (application, member, shared resource, UTC start/end, reserved-until including buffer, team local date, state, proposal expiry, meeting URL, revision); interview_booking_events (actor, transition, previous/new time and reason); interview_notification_outbox (event, recipient, channel, revision, due_at, delivery state, attempts).

One active application per member and one active booking per application enforced with database constraints. Enforce overlapping UTC reservation intervals for the same interview resource using a PostgreSQL exclusion constraint; both proposed and confirmed rows reserve capacity. Buffer is part of the reserved interval. Use a consistent resource/day lock inside the scheduling transaction to enforce the daily cap, expire overdue proposals and validate availability before inserting or moving a booking. Cross-midnight occupied intervals lock all affected dates in a stable order. Daily quota is counted by start date in the team's time zone; overlap prevention covers the whole occupied interval.

Proposal creation, revision check, reservation, audit event and notification outbox writes happen in one transaction. Concurrent acceptance/expiry/reschedule are conditional on the current state, revision, deadline and authenticated actor. At most one transition wins. Repeated identical requests are idempotent.

Rescheduling atomically replaces the old reservation with a new proposed reservation. If validation or reservation fails, the old confirmed booking remains intact. If it succeeds, the old time is cancelled, old reminder jobs become obsolete, and the member must accept the new time. Show both times in the change notification. Cancelling/declining/expiring releases the reservation. Never show successful booking confirmation before the database commits.

Store timestamps in UTC and time zones as IANA identifiers. Use team-local dates for caps and render both member-local and team-local times. Reject nonexistent local times; explicitly disambiguate daylight-saving repeated times before converting to UTC.

## Notifications and email

| Event | Member | Admin |
|---|---|---|
| Request received | Email + dashboard receipt, explicitly unscheduled | Email + admin queue notification |
| Approved | Email + dashboard: awaiting a time | Activity recorded; notify configured interview team |
| Declined | Email + dashboard with member-facing explanation | Activity recorded; notify configured interview team |
| Time proposed | Email + dashboard with accept/change CTA and expiry | Email + admin notification: awaiting acceptance |
| Member accepts | Email + dashboard confirmation and calendar link | Email + admin confirmation |
| Another time requested / member cancels | Email + dashboard receipt | Email + actionable admin notification |
| Admin reschedules / cancels | Email + dashboard with reason, old/new times where applicable | Email + admin notification |
| Proposal expires | Email + dashboard: new time needed | Queue notification and email |
| 24-hour and 1-hour reminders | Email + dashboard reminder | Email + admin reminder |

Existing interview emails use lib/email/brevo.ts; preserve that provider contract initially. Configure a verified sender, BREVO_API_KEY, BREVO_SENDER_EMAIL and ADMIN_NOTIFICATION_EMAIL (or a dedicated interview recipient setting). Existing Resend credentials alone do not configure this current interview mailer. Reuse user_notifications for members; admin notification entries are scoped to authorized interview staff and link into /admin/interviews.

Use a durable outbox worker with retries and an idempotency key per event/recipient/channel/revision. Email failure does not roll back an accepted booking. Display “email pending/failed” to staff with a retry action. Claim jobs with a lease to avoid parallel sends. If the email provider cannot guarantee idempotency, acknowledge that a crash after sending can cause a duplicate email; do not promise exactly-once delivery. Dashboard entries are deduplicated by database unique keys.

A protected scheduled worker runs at least once per minute to expire proposals and deliver due notifications. Before sending reminders, check the current booking revision and confirmed state. Rescheduled/cancelled reminder jobs are skipped. Send late reminders once only if the interview is still upcoming; do not send old reminders after the interview has started. Confirmation creates a calendar event with a stable UID and sequence; changes update the same event, cancellation carries a cancellation state. Calendar download alone is not two-way calendar sync.

## Scope boundaries and rollout

No external calendar conflict checking, automatic host rotation, payments, automatic meeting creation, or open self-booking in version one. Staff provide the meeting URL before proposing a video appointment. The shared resource and cap protect Top100 bookings only; staff must block outside commitments manually.

Use additive migrations and keep historical applications readable. Member APIs derive identity from the authenticated session; admin endpoints use the existing requireAdmin guard and explicit state transition validation. Apply RLS/privilege scoping to new tables; expose no provider secrets. Replace the current unconstrained scheduled_at/status patch path for scheduling with the transition service, so old admin controls cannot bypass reservations or notifications.

Launch order: schema and transition service; member request/status UI; admin queue and schedule; outbox/reminder worker; configured sender and staff availability; concurrency and notification checks; replace dashboard links. No Google Form data is imported automatically.

Acceptance checks: request receipt without false scheduled status; ownership/authentication; duplicate requests; two admins racing for one slot; overlapping buffered slots; fourth daily reservation; expired proposal acceptance; stale reschedule/accept races; cancellation capacity release; old reminder suppression; email outage/retry; local-time conversion; keyboard and narrow-screen flows. Test scheduled-job authentication and delivery leases. Demonstrate a full request → approval → proposal → acceptance → reschedule → reacceptance flow before rollout.
