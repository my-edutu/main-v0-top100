# Africa Future Leaders October 2026 Virtual Programme Events

**Date:** 2026-09-22  
**Status:** Approved for implementation planning  
**Programme window:** 10–31 October 2026  
**Canonical timezone:** `Africa/Lagos` (West Africa Time, UTC+1)  
**Session duration:** 60 minutes

## 1. Objective

Turn the member dashboard's existing events route into a polished, responsive programme schedule for the Africa Future Leaders October 2026 virtual programme. Members must be able to discover each session, open a dedicated event page, view the assigned speaker when unveiled, and add the session to their own calendar. Administrators must be able to edit all event, speaker, schedule, artwork, meeting-link, and reminder information through the existing Events admin area.

The programme comprises one onboarding event and ten topic sessions. Onboarding occurs on the Saturday before the second Sunday of October. The ten sessions then run from the second Sunday through the final Saturday of October, with recovery days between sessions and no more than one session per day.

## 2. Existing System

- `/dashboard/discover/events` already combines published public events with member invitations.
- `app/dashboard/event-invitations-section.tsx` renders event cards but links directly to an optional registration URL and has no event detail route.
- `/admin/events` already supports event CRUD, publishing, visibility, images, virtual status, registration links, and invitations.
- `public.events` already stores title, descriptions, start/end timestamps, location, image, registration link, status, visibility, tags, and metadata.
- Event invitations and RSVP workflows already exist and must continue to function.
- Existing Hall of Fame speaker content is static and is not suitable for admin-managed programme speakers.

## 3. Programme Schedule

All events use `Africa/Lagos`; member-facing date formatting may additionally show the viewer's local timezone where the browser can determine it reliably.

| Session | Date | Time (WAT) | Title |
| --- | --- | --- | --- |
| Onboarding | Sat, 10 Oct 2026 | 4:00–5:00 PM | Africa Future Leaders 2026: Cohort Onboarding |
| 01 | Sun, 11 Oct 2026 | 4:00–5:00 PM | The Global Talent Playbook: How to Become Competitive Beyond Africa |
| 02 | Tue, 13 Oct 2026 | 6:00–7:00 PM | Beyond the Paycheck: Building Career Capital and Financial Power |
| 03 | Thu, 15 Oct 2026 | 6:00–7:00 PM | From Expertise to Authority: Becoming a Voice People Listen To |
| 04 | Sat, 17 Oct 2026 | 4:00–5:00 PM | The Leadership Multiplier: How to Build People, Teams and Movements |
| 05 | Tue, 20 Oct 2026 | 6:00–7:00 PM | Africa's Hard Problems: Turning Complexity Into Opportunity |
| 06 | Thu, 22 Oct 2026 | 6:00–7:00 PM | AI-Native Leadership: Leading in a World Built Around AI |
| 07 | Sat, 24 Oct 2026 | 4:00–5:00 PM | From Knowledge to Ideas: How to Produce Thinking That Matters |
| 08 | Tue, 27 Oct 2026 | 6:00–7:00 PM | The Collaboration Advantage: Building Across Borders, Sectors and Industries |
| 09 | Thu, 29 Oct 2026 | 6:00–7:00 PM | Beyond the Initiative: Building Solutions That Actually Scale |
| 10 | Sat, 31 Oct 2026 | 4:00–5:00 PM | The 10-Year Question: What Will Your Leadership Have Changed? |

The admin form must prevent an end time earlier than the start time and prevent a programme session duration from exceeding 60 minutes. The seeded schedule uses exactly 60 minutes per event.

## 4. Session Editorial Briefs

### Onboarding — Africa Future Leaders 2026: Cohort Onboarding

Orient members to the programme rhythm, participation expectations, digital community, session access, and the outcomes they should carry into the month.

### 01 — The Global Talent Playbook

Help African professionals understand the skills, evidence, networks, communication, and positioning required to compete for international opportunities without losing local relevance.

### 02 — Beyond the Paycheck

Show members how to build career capital, financial resilience, negotiating power, portable skills, and long-term optionality rather than relying on salary alone.

### 03 — From Expertise to Authority

Turn practical knowledge into a credible public voice through clear ideas, consistent publishing, useful contribution, and trust earned over time.

### 04 — The Leadership Multiplier

Move leadership beyond personal performance by teaching delegation, coaching, culture, team development, and the conditions that allow other people to lead.

### 05 — Africa's Hard Problems

Use systems thinking to understand complexity, locate leverage points, and convert persistent African challenges into responsible opportunities for innovation and institution-building.

### 06 — AI-Native Leadership

Prepare leaders to use AI as a strategic capability while maintaining human judgement, accountability, ethics, and a clear understanding of where automation should stop.

### 07 — From Knowledge to Ideas

Teach members to move from consuming information to forming original questions, synthesising evidence, developing arguments, and producing thinking that changes decisions.

### 08 — The Collaboration Advantage

Build the ability to form effective partnerships across countries, sectors, disciplines, and institutions through aligned incentives, clear ownership, and earned trust.

### 09 — Beyond the Initiative

Help leaders distinguish activity from durable impact and design solutions with repeatable operations, evidence, governance, funding logic, and pathways to scale.

### 10 — The 10-Year Question

Close the programme with a long-term leadership lens: the institutions, people, systems, and measurable changes each member intends to leave behind over the next decade.

## 5. Member Experience

### Events index

`/dashboard/discover/events` becomes a programme timeline rather than a generic empty-state grid.

- A compact hero identifies the Africa Future Leaders October 2026 virtual programme and shows its date range.
- The nearest future session receives a prominent `Next session` treatment.
- Remaining upcoming sessions appear chronologically; completed sessions move to a subdued `Completed` group.
- Every card contains the session number, exact title, artwork, date, WAT time, 60-minute duration, virtual status, speaker state, and calendar action.
- The card itself opens `/dashboard/discover/events/[slug]`.
- `Add to calendar` is a separate accessible control and must not be nested inside the card link.
- Invitation messaging and RSVP information remain visible when the member has a targeted invitation.
- Loading, partial failure, empty, draft-hidden, and completed states must remain understandable.

### Event detail

The detail page contains:

- Branded event artwork and programme/session label.
- Exact title, summary, full description, and learning outcomes.
- Date, start/end time, WAT timezone, viewer-local time where available, and `60 minutes`.
- Virtual session state and meeting/join link when published.
- Add-to-calendar control.
- One speaker block.
- Related previous and next sessions.
- Invitation message and RSVP state when applicable.

If an event has no published speaker, the speaker block reads `Speaker to be unveiled` and does not link anywhere. When a speaker is published, the block shows portrait, name, role, organisation, and a link to the speaker profile.

### Speaker profile

Programme speakers use an admin-managed model separate from the static Hall of Fame registry. `/dashboard/discover/speakers/[slug]` shows portrait, name, role, organisation, biography, approved links, and the associated programme session. Each event can reference zero or one speaker; a speaker can be reused for another event if required later.

## 6. Responsive and Visual Direction

The programme should feel like a premium editorial learning series within the existing warm member-dashboard design.

- Mobile first at 360px, 390px, and 430px without horizontal scrolling.
- One-column event feed on mobile, two columns when useful on tablet, and a wider editorial grid on desktop.
- Minimum 44px touch targets and visible keyboard focus rings.
- Titles wrap naturally; no title may be truncated on the detail page.
- Cards use restrained motion, with reduced-motion support.
- Orange and amber gradients provide identity; warm black, cream, and white preserve contrast.
- Status is always communicated with text or icon plus color.
- Calendar and join controls remain reachable above the mobile bottom navigation and device safe area.

## 7. Artwork System

Produce eleven coordinated 16:9 master covers: onboarding plus ten topic sessions.

AI image generation creates title-free visual backgrounds. A deterministic renderer adds all text so titles, dates, punctuation, and programme numbering remain accurate across the set.

Shared composition:

- Deep orange-to-amber gradient with warm-black contrast.
- Subtle contemporary African geometric texture without stereotyped imagery.
- Africa Future Leaders 2026 programme mark.
- Session number, exact session title, date, `Virtual`, and `60 minutes`.
- Shared typography, spacing, hierarchy, and safe zones.
- Accessible alt text stored separately from the image.

Topic motifs progress through global pathways, compounding value, signal and authority, multiplying networks, systems complexity, human-centred AI, knowledge becoming ideas, cross-border bridges, scalable systems, and a ten-year horizon. Onboarding uses an opening-pathway motif that introduces the set.

Artwork assets must be replaceable from admin. Generated defaults are seeded as normal event image URLs rather than embedded in components.

## 8. Admin Experience

Extend the existing `/admin/events` workflow rather than creating a parallel console.

### Event editor

The editor supports:

- Programme label and session number.
- Title, subtitle, short summary, full description, and learning outcomes.
- Date picker and imported clock-style time picker.
- Canonical timezone, defaulting to `Africa/Lagos`.
- Duration, with a programme maximum of 60 minutes.
- Virtual meeting/join URL and member-facing button label.
- Calendar reminder interval.
- Artwork URL/upload and preview.
- One speaker selection.
- Draft, published, archived, visibility, and featured states.
- Existing invitation controls and RSVP roster.

Use `react-time-picker` for the requested clock-style time input. Keep date and time visually separate in the form while converting them into canonical timezone-aware start/end timestamps before persistence. The form must be fully usable by keyboard and on narrow mobile admin screens.

### Speaker editor

Administrators can create, edit, publish, unpublish, and select speakers without leaving event management. Speaker fields are name, slug, portrait, role, organisation, biography, website, LinkedIn URL, additional approved social URL, and publication state.

Unpublishing a speaker immediately returns associated member-facing events to the `Speaker to be unveiled` state without deleting the speaker or event relationship.

## 9. Calendar Behaviour

Use an Add-to-Calendar integration for provider selection and a first-party `.ics` endpoint for deterministic event data and reminder alarms.

Calendar payloads include:

- Stable UID derived from the event ID.
- Exact title, summary, and virtual location.
- Start/end timestamps with timezone information.
- Join link when published.
- Speaker name when published.
- One admin-selected reminder.

Reminder options are off, 15 minutes, 30 minutes, 60 minutes, and 24 hours. Seeded programme events default to 24 hours.

Calendar additions are snapshots. Admin edits update the dashboard, detail pages, API responses, and all calendar additions made after the edit. They do not silently rewrite copies that members previously saved to personal calendars. The UI must not claim ongoing synchronization.

## 10. Data Model

Extend `public.events` with focused programme fields rather than placing the feature in unvalidated metadata:

- `programme_label text`
- `session_number integer`
- `learning_outcomes jsonb` containing an array of non-empty strings
- `timezone text not null default 'Africa/Lagos'`
- `reminder_minutes integer` constrained to `NULL`, `15`, `30`, `60`, or `1440`
- `speaker_id uuid null` referencing `public.programme_speakers(id)`

Create `public.programme_speakers` with:

- `id`, `slug`, `name`, `portrait_url`, `role`, `organisation`, `biography`
- `website_url`, `linkedin_url`, `social_url`
- `status` constrained to `draft`, `published`, or `archived`
- `created_at`, `updated_at`

The service role manages speakers. Member-facing APIs return only published speakers. Events without a published speaker return `speaker: null`.

## 11. API and Component Boundaries

- Keep `/api/events` backward compatible while extending its public/admin projections.
- Add a slug-based member event read path that enforces publication/visibility rules.
- Add admin speaker CRUD behind the existing admin authorization boundary.
- Add `/api/events/[id]/calendar.ics` for calendar downloads.
- Keep calendar serialization in a small pure library with escaping and timezone tests.
- Keep schedule formatting in shared event presentation helpers.
- Split the current event card, programme header, speaker block, calendar action, and event detail into focused components.
- Preserve invitation APIs and RSVP behavior; enrich their event projection rather than replacing them.

## 12. Error Handling and Safety

- Invalid or missing dates return validation errors in admin and never publish malformed calendar payloads.
- End time must be after start time and no more than 60 minutes later for programme events.
- Invalid external URLs are rejected before persistence.
- Missing artwork uses the existing event-cover fallback.
- Missing or unpublished speakers produce the intentional placeholder.
- Calendar generation returns a clear not-found response for inaccessible events.
- Public/member responses never expose draft speaker biographies or hidden admin fields.
- Existing event records continue to render when new programme fields are null.

## 13. Verification

Automated coverage must include:

- Exact October 2026 seeded schedule and 60-minute durations.
- WAT storage/formatting and viewer-local display fallbacks.
- Duration and end-before-start validation.
- Public/admin API projection differences.
- Published, missing, draft, and archived speaker states.
- Event-to-speaker cardinality.
- Calendar escaping, UID stability, timezone, end time, join link, and each reminder option.
- Invitation merging, ordering, RSVP behavior, and completed-event presentation.
- Responsive event cards and admin forms at 360px, 390px, 430px, tablet, and desktop widths.
- Keyboard focus, touch targets, reduced motion, semantic headings, and accessible labels.

Manual verification uses the local dashboard demo account and the admin Events workflow. It includes adding an event to Apple/ICS, Google Calendar, and Outlook paths, while verifying that the interface describes calendar entries as snapshots.

## 14. Delivery Sequence

1. Add migrations, event/speaker types, validation, and pure calendar utilities.
2. Extend event APIs and add speaker/admin/calendar endpoints.
3. Upgrade the admin event editor and add speaker management.
4. Build the responsive member programme index and event detail route.
5. Build the speaker profile route and published/placeholder states.
6. Generate the eleven title-free backgrounds and deterministic branded covers.
7. Seed onboarding and all ten topic sessions as editable event records.
8. Verify tests, type checking, production build, responsive browser behavior, admin edits, and calendar downloads.

## 15. Acceptance Criteria

- The dashboard lists onboarding and all ten sessions in the approved October 2026 order.
- Every seeded event lasts exactly one hour.
- Cards are fully responsive, clickable, visually consistent, and expose a separate calendar control.
- Every event has a dedicated member detail page.
- Every event shows one published speaker or `Speaker to be unveiled`.
- Published speaker information links to a complete profile.
- Administrators can edit dates and times through date and clock-style controls.
- Administrators can edit all event content, artwork, meeting links, reminders, and speaker data.
- The calendar action supports the planned providers and includes the latest saved event data.
- New calendar additions include the selected reminder; the product does not claim previously saved copies auto-update.
- Eleven coordinated orange-gradient event covers use exact deterministic titles.
- Existing invitations, RSVP handling, public events, and non-programme events continue to work.
- The experience passes functional, accessibility, responsive, type-check, test, and production-build verification.

## 16. Out of Scope

- Automatic synchronization of admin changes into calendar copies a member already saved.
- Multiple speakers or panelists on one event.
- Replacing the existing Hall of Fame system.
- A video replay library, attendance certification, or session recordings.
- Redesigning unrelated public-site event surfaces beyond compatibility with the enriched event data.
