# Workstream 1 — Awardee groups (peer-to-peer communities)

Read `docs/plans/00-SHARED-CONVENTIONS.md` first. It is binding.

## Goal
Awardees can join topic groups and talk to each other inside them. Today nothing exists: no table,
no API, no UI. Direct 1:1 messaging already exists (`lib/dm-server.ts`,
`app/api/member/conversations/`, `app/dashboard/messages-section.tsx`) — read those first and mirror
their shape; groups are the many-to-many counterpart, not a replacement.

## Files you own
- `supabase/migrations/20260728_member_groups.sql`
- `lib/groups/types.ts`, `lib/groups/server.ts`, `lib/groups/client.ts`
- `app/api/member/groups/route.ts`
- `app/api/member/groups/[id]/route.ts`
- `app/api/member/groups/[id]/membership/route.ts`
- `app/api/member/groups/[id]/messages/route.ts`
- `app/api/admin/groups/route.ts`
- `app/dashboard/groups-section.tsx`
- `tests/groups/*.test.ts`

## Schema — `20260728_member_groups.sql`
`public.member_groups`
- `id uuid pk default gen_random_uuid()`
- `slug text not null unique` (lowercase, hyphenated)
- `name text not null`, `description text`, `topic text`, `cover_url text`
- `visibility text not null default 'open' check (visibility in ('open','request','private'))`
  - `open` — any approved member joins instantly
  - `request` — join creates a `pending` membership an admin/owner approves
  - `private` — invitation only; never listed to non-members
- `created_by uuid references public.profiles(id) on delete set null`
- `is_archived boolean not null default false`
- `member_count integer not null default 0` (maintained by trigger, see below)
- `created_at`, `updated_at timestamptz not null default now()`

`public.member_group_members`
- `id uuid pk`, `group_id uuid not null references member_groups(id) on delete cascade`
- `profile_id uuid not null references public.profiles(id) on delete cascade`
- `role text not null default 'member' check (role in ('member','moderator','owner'))`
- `status text not null default 'active' check (status in ('pending','active','banned'))`
- `joined_at timestamptz not null default now()`
- `last_read_at timestamptz` — drives the unread badge
- `unique (group_id, profile_id)`

`public.member_group_messages`
- `id uuid pk`, `group_id uuid not null references member_groups(id) on delete cascade`
- `profile_id uuid not null references public.profiles(id) on delete cascade`
- `body text not null check (char_length(body) between 1 and 4000)`
- `is_deleted boolean not null default false`, `deleted_by uuid`
- `created_at timestamptz not null default now()`
- index on `(group_id, created_at desc)`

Triggers: `updated_at` touch on `member_groups`; an `after insert/update/delete` trigger on
`member_group_members` recomputing `member_count` as the count of `status = 'active'` rows. Do the
recount with a single `update ... set member_count = (select count(*) ...)` so it is correct under
concurrency rather than an increment that can drift.

RLS: enable on all three. Members read groups they belong to plus any non-`private` group; they
insert messages only into groups where they hold an `active` membership; admins
(`profiles.role in ('admin','superadmin')`) do everything. Seed 3 starter open groups
(`founders-and-builders`, `climate-and-sustainability`, `policy-and-advocacy`) with
`on conflict (slug) do nothing`.

## API
All member routes require a session and a `profiles.status = 'approved'` member for **writes**
(pending members may read). Enforce that in `lib/groups/server.ts` with a single
`assertCanPost(supabase, profileId, groupId)` helper so the rule lives in one place.

- `GET /api/member/groups` → `{ groups: GroupSummary[] }` — every non-private group plus private
  groups the caller belongs to. Each summary carries `membership` (`null | { role, status,
  unreadCount }`). Compute `unreadCount` as messages newer than `last_read_at`.
- `POST /api/member/groups` → create a group. Only `profiles.status = 'approved'`. zod-validated
  (`name` 3–80, `description` ≤ 500, `topic` ≤ 60, `visibility` enum). Auto-slug from name with a
  numeric suffix on collision. Creator gets `role: 'owner', status: 'active'`. Rate limit
  `RATE_LIMITS.CONTACT`-style — a member may create at most 3 groups per day.
- `GET /api/member/groups/[id]` → group + membership + most recent 50 messages (author name,
  avatar initials, `created_at`), oldest-first for rendering. 403 if `private` and not a member.
- `POST /api/member/groups/[id]/membership` → join. `open` ⇒ `active`; `request` ⇒ `pending`;
  `private` ⇒ 403. Idempotent — re-joining an existing `active` membership is a 200 no-op, not a
  duplicate-key 500. `DELETE` on the same route ⇒ leave. **An `owner` may not leave while they are
  the only owner** — 409 with a message telling them to promote someone first, otherwise the group
  becomes unadministrable.
- `PATCH /api/member/groups/[id]/membership` → owner/moderator approves a `pending` member or bans
  one. Body `{ profileId, status }`. 403 unless the caller is owner/moderator of *that* group.
- `GET /api/member/groups/[id]/messages?before=<iso>` → paginated 50 at a time, and stamps
  `last_read_at = now()` for the caller.
- `POST /api/member/groups/[id]/messages` → post. zod `body` 1–4000 chars. Rate limit per member.
  Reject if membership is missing, `pending`, or `banned`, or the group `is_archived`.
- `DELETE /api/member/groups/[id]/messages?messageId=` → soft-delete (`is_deleted = true`). Allowed
  for the author, a group moderator/owner, or a site admin. Never hard-delete.
- `GET/PATCH /api/admin/groups` (`requireAdmin`) → list all groups incl. private, archive/unarchive,
  and delete a message.

## UI — `app/dashboard/groups-section.tsx`
Default-exported client component `GroupsSection({ member }: { member: MemberProfile })`.
Two-pane on `lg`, stacked on mobile:
- Left: "Your groups" then "Discover", each row showing name, topic chip, member count, and an
  unread pill. A "New group" button opens a dialog (`components/ui/dialog`).
- Right: the selected group — header with name/description/member count, a scrollable message list
  (own messages right-aligned in `bg-orange-500 text-[#fffaf0]`, others left in `bg-[#f5f4f0]`), and
  a composer with `Textarea` + send button. Enter sends, Shift+Enter newlines.
- Pending-membership state shows "Your request is waiting for approval" instead of the composer.
- Owner/moderator sees a "Requests (n)" tab listing pending members with approve/decline.
- Poll `GET /api/member/groups/[id]/messages` every 15s while a group is open; stop on unmount.
- Handle the 503 setup message by rendering it as a calm inline notice, not an error toast loop.

## Tests — `tests/groups/`
Pure-logic only, no DB: slug generation + collision suffixing; the `assertCanPost` permission matrix
(active/pending/banned/non-member × open/request/private × archived); unread-count computation;
last-owner-cannot-leave rule; zod schema acceptance and rejection. Aim for ~25 focused cases.

## Report back
State clearly: files created, `npm test` result, `npx tsc --noEmit` result, the exact migration file
that must be run against Supabase before the feature works, and anything you could not verify.
