# Project100 Scholarship Design

## Goal

Add a member-facing Project100 Scholarship experience to the awardee dashboard and an admin workspace for reviewing, filtering, randomly grouping, and contacting applicants.

## Member experience

The new `/dashboard/me/project100-scholarship` route is reachable from the member navigation and the Me index. It opens with a cinematic image-led overview using existing authorised Top100 assets, a readable scrim, concise programme information, key dates, and a single “Get started” action. The overview remains available after the application deadline, but the form becomes read-only and the action changes to an explicit closed state.

The application is a client-side stepper backed by authenticated API routes. Each step saves a draft so a member can leave and resume. Required fields are name, phone, country/location, interest, area of function, team-lead preference, resource/support needs, and consent. Submission is a server-validated transition from `draft` to `submitted`; submitted answers are read-only to the member. The page shows progress, field-level errors, submitting state, success state, and an application-closed state.

## Schedule and locking

Schedule values live in a single `project100_settings` row and are editable by admins. The default application deadline is November 7, 2026 and the default kickoff is January 1, 2027. The member view calculates the countdown from the server-provided ISO timestamp; it does not hardcode a browser clock or allow a client to bypass the deadline.

## Admin experience

Add `/admin/project100-scholarship` to the staff navigation. The page has a spreadsheet-style application table with search, country/location, application status, consent, interest, and area-of-function filters. The table exposes the contact and grouping fields needed by programme staff while keeping the full application detail available in a row drawer or detail panel.

Admins can choose a filtered population and a group size (a positive integer no larger than the selected population), then shuffle once. The server stores a grouping run with the selected filters, group size, random seed, creator, and timestamp. It creates durable groups and membership rows, preserving the exact membership for later review. Re-running creates a new run and does not mutate earlier groups. Each group shows names, country/location, email, phone, WhatsApp link, interests, team-lead preference, resources, and consent, with CSV export for the group and the full run.

## Data and access

The Supabase migration adds `project100_settings`, `project100_applications`, `project100_grouping_runs`, `project100_groups`, and `project100_group_members`. Row-level policies permit an authenticated member to read/write only their own draft and read their own submitted application; admin routes use the existing server-side admin guard and service client. Grouping and schedule mutations are server-only and validate all filters against stored application data.

The feature is independent of award payments and delivery. No payment, shipment, notification, or existing award status is changed by an application or grouping action.

## Verification

Unit and route tests cover deadline enforcement, draft resume, submission validation, member isolation, admin filtering, group-size validation, seeded grouping, repeated runs, export shape, and schedule updates. Browser verification covers the member overview and stepper at narrow and desktop widths plus the admin table and group detail state.
