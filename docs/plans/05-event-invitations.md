# Workstream 5 — Event invitations and RSVP for awardees

Read `docs/plans/00-SHARED-CONVENTIONS.md` first. It is binding.

## Goal
The dashboard's Events section is read-only: it fetches `/api/events` and renders cards with an
external registration link. Awardees are never *invited* to anything and cannot RSVP. Add targeted
invitations with RSVP, so an admin can invite all members / a cohort / named awardees, and each
member sees "You're invited" with Attending / Not attending / Maybe.

## Files you own
- `supabase/migrations/20260728_event_invitations.sql`
- `lib/events/invitations.ts`, `lib/events/invitations-client.ts`
- `app/api/member/event-invitations/route.ts`
- `app/api/member/event-invitations/[id]/route.ts`
- `app/api/admin/event-invitations/route.ts`
- `app/dashboard/event-invitations-section.tsx`
- `tests/events/*.test.ts`

You may add one tab/panel to `app/admin/events/page.tsx` for sending invitations — read it first,
keep the edit self-contained and in its existing style. **Do not edit** `app/api/events/route.ts` or
`app/dashboard/page.tsx`.

## Schema — `20260728_event_invitations.sql`
Read `supabase/migrations/005_create_events_table.sql` (and `003_create_upcoming_events_table.sql`)
first and reference **the table the live `/api/events` route actually reads**, which you must confirm
by reading `app/api/events/route.ts` and `lib/homepage-feed.ts`. Getting this FK wrong makes the
whole feature inert.

`public.event_invitations`
- `id uuid pk default gen_random_uuid()`
- `event_id uuid not null references <the events table>(id) on delete cascade`
- `profile_id uuid not null references public.profiles(id) on delete cascade`
- `invited_by uuid references public.profiles(id) on delete set null`
- `message text` — optional personal note from the admin
- `rsvp text not null default 'pending' check (rsvp in ('pending','attending','declined','maybe'))`
- `rsvp_at timestamptz`, `seen_at timestamptz`
- `created_at`, `updated_at timestamptz not null default now()` + touch trigger
- `unique (event_id, profile_id)` — re-inviting is an update, never a duplicate row
- index `(profile_id, rsvp)`

RLS: a member selects and updates only their own invitations, and may only change `rsvp`, `rsvp_at`,
`seen_at` — never `event_id` or `profile_id`. Admins do everything.

## API
- `GET /api/member/event-invitations` → the caller's invitations joined to their event (title,
  summary, `start_at`, location, cover, `registration_url`), upcoming first, past events last.
  Include `{ pendingCount }` in the response for the nav badge.
- `PATCH /api/member/event-invitations/[id]` → `{ rsvp: 'attending'|'declined'|'maybe' }`. 404 if the
  invitation is not the caller's — **404, not 403**, so the endpoint does not confirm the existence
  of other members' invitations. Reject an RSVP for an event whose `start_at` has passed (409,
  "This event has already taken place."). Set `rsvp_at`. Changing an existing RSVP is allowed.
- `POST /api/member/event-invitations/[id]` (or a `?seen=1` PATCH) → stamp `seen_at`.
- `POST /api/admin/event-invitations` (`requireAdmin`) → `{ eventId, audience, profileIds?, cohortYear?,
  message? }` where `audience` is `'all' | 'approved' | 'cohort' | 'selected'`.
  - Resolve the recipient list server-side from `profiles` (`'approved'` ⇒ `status = 'approved'`).
  - Insert with `on conflict (event_id, profile_id) do nothing` — re-sending must never reset an RSVP
    a member already gave.
  - Chunk the insert in batches of 500; return `{ invited, skipped }` counts.
  - Guard against an empty resolved audience (400 with a clear message) rather than silently
    "succeeding" with zero invitations.
- `GET /api/admin/event-invitations?eventId=` → the RSVP roster with counts per status, for the admin
  events page.

## UI — `app/dashboard/event-invitations-section.tsx`
Default-exported client component `EventInvitationsSection({ member }: { member: MemberProfile })`.
- Top: "Your invitations" — cards with the event cover, title, date (format with the same helper the
  dashboard already uses for dates), location, the admin's personal message when present, and a
  three-button RSVP segmented control showing the current choice as selected. Optimistic update with
  rollback and an error toast on failure.
- A pending invitation gets an orange "New invitation" pill; stamp `seen_at` when it scrolls into
  view or on first render of the section.
- Below: "All events" — keep the existing public events listing (copy the fetch + card markup from
  the `EventsSection` function inside `app/dashboard/page.tsx` so nothing is lost) with a link to
  `/events`.
- Loading / error+retry / empty ("No invitations yet — you'll see summit and programme invites here")
  states are all required.

## Tests — `tests/events/`
Audience resolution for each of the four `audience` values; the `do nothing` conflict semantics
preserving an existing RSVP; rejecting an RSVP on a past event; rejecting an RSVP on someone else's
invitation (404 shape); `pendingCount` computation; upcoming-first ordering with past events last.

## Report back
Files created, which events table you FK'd to and how you confirmed it, `npm test` and
`npx tsc --noEmit` results, the migration to run, the edit made to `app/admin/events/page.tsx`.
