# Workstream 6 — Exclusive, member-only opportunities

Read `docs/plans/00-SHARED-CONVENTIONS.md` first. It is binding.

## Goal
`app/api/opportunities/route.ts` is a public, unauthenticated proxy over an external feed with two
hardcoded fallback entries. Nothing is exclusive to awardees and admins cannot post an opportunity at
all. Add an admin-managed opportunities store with member-only visibility, so awardees genuinely get
something outsiders do not.

## Files you own
- `supabase/migrations/20260728_opportunities.sql`
- `lib/opportunities/types.ts`, `lib/opportunities/server.ts`, `lib/opportunities/client.ts`
- `app/api/member/opportunities/route.ts`
- `app/api/member/opportunities/[id]/route.ts`
- `app/api/admin/opportunities/route.ts`
- `app/api/admin/opportunities/[id]/route.ts`
- `app/admin/opportunities/page.tsx`
- `app/dashboard/opportunities-section.tsx`
- `tests/opportunities/*.test.ts`

**Do not edit** `app/api/opportunities/route.ts` (the public feed stays as-is) or
`app/dashboard/page.tsx`.

## Schema — `20260728_opportunities.sql`
`public.opportunities`
- `id uuid pk default gen_random_uuid()`
- `title text not null check (char_length(title) between 3 and 200)`
- `slug text not null unique`
- `type text not null` — Scholarship / Fellowship / Grant / Internship / Job / Mentorship / Programme
- `organization text`, `location text`, `summary text`, `description text` (markdown),
  `application_url text`, `contact_email text`
- `deadline date`, `amount_note text`
- `visibility text not null default 'members' check (visibility in ('public','members','approved'))`
  - `public` — anyone, `members` — any signed-in member, `approved` — `profiles.status = 'approved'`
- `is_featured boolean not null default false`
- `status text not null default 'draft' check (status in ('draft','published','closed','archived'))`
- `created_by uuid references public.profiles(id) on delete set null`
- `created_at`, `updated_at timestamptz not null default now()` + touch trigger
- index `(status, deadline)`, `(visibility, status)`

`public.opportunity_saves` — `id`, `opportunity_id` (cascade), `profile_id` (cascade),
`created_at`, `unique (opportunity_id, profile_id)`. Lets a member bookmark one.

RLS: anon selects only `status = 'published' and visibility = 'public'`; authenticated members select
published rows their tier allows; admins do everything. A member may only insert/delete their own
`opportunity_saves`.

## Visibility is the whole point — get it right
Put the tier check in **one** exported function in `lib/opportunities/server.ts`:
```ts
export function visibleTiersFor(member: { status?: string } | null): OpportunityVisibility[]
```
returning `['public']` for no session, `['public','members']` for a signed-in non-approved member,
and `['public','members','approved']` for an approved member. Every read path must go through it, and
the member route must apply it as a server-side `.in('visibility', tiers)` filter — never accept a
visibility filter from the client, and never fetch everything and filter in JS.

## API
- `GET /api/member/opportunities?type=&q=&saved=1` → published, non-expired-first, ordered by
  `is_featured desc, deadline asc nulls last`. Each row carries `isSaved` for the caller. Respects
  `visibleTiersFor`. Degrade per the shared missing-table rule (503 with the setup message) so the
  dashboard section explains itself instead of erroring.
- `POST /api/member/opportunities/[id]` → save/bookmark (idempotent). `DELETE` → unsave.
- `GET/POST /api/admin/opportunities` (`requireAdmin`) → list all / create. zod-validated; slug from
  title with collision suffixing; `deadline` must parse as a date and is rejected if in the past on
  create (400) — a listing that is already closed helps nobody.
- `PATCH/DELETE /api/admin/opportunities/[id]` → update / delete. Publishing requires a `title`,
  `type`, and either an `application_url` or a `contact_email`, otherwise 400 — a published
  opportunity with no way to apply is the most common failure mode here.

## UI
`app/dashboard/opportunities-section.tsx` — default-exported `OpportunitiesSection({ member })`.
This **replaces** the inline `OpportunitiesSection` currently living in `app/dashboard/page.tsx`;
the lead agent swaps it in, so build it standalone and do not edit that file.
- Filter chips by type, a search input, and a "Saved" toggle.
- Cards: type eyebrow, title, organization, location and deadline chips, an "Exclusive" orange badge
  when `visibility != 'public'`, a save (bookmark) icon button, and an "Apply" button linking out
  with `target="_blank" rel="noopener noreferrer"`.
- Show a deadline countdown ("Closes in 6 days", "Closes today", "Closed") computed from `deadline`.
- Loading / error+retry / empty states required. Keep the existing card colour rotation
  (`index % 3` between `bg-orange-500`, `bg-[#f5f4f0]`, `bg-[#fff2e2]`) so it looks unchanged in
  spirit, but ensure text on the orange card is `text-black`, never `text-white`.

`app/admin/opportunities/page.tsx` — table of all opportunities with status/visibility chips, a
create/edit dialog covering every field, publish/close/archive actions, and a delete confirm. Match
the styling of `app/admin/awards/page.tsx`.

## Tests — `tests/opportunities/`
`visibleTiersFor` for all three caller kinds; that a `members`/`approved` row is excluded for a
signed-out caller; slug collision suffixing; past-deadline rejection on create; the
publish-requires-a-way-to-apply rule; deadline-countdown formatting including today, tomorrow, and
past; save/unsave idempotency.

## Report back
Files created, `npm test` and `npx tsc --noEmit` results, the migration to run, and confirmation that
the public `/api/opportunities` route is untouched.
