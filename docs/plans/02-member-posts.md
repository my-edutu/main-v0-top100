# Workstream 2 — Member-authored posts on the public profile

Read `docs/plans/00-SHARED-CONVENTIONS.md` first. It is binding.

## Goal
An awardee can write a post from their dashboard and have it appear on their public profile at
`/awardees/<their-slug>/posts/<post-slug>`, listed on the profile page itself.

Today this is impossible: `app/api/posts/route.ts` calls `requireAdmin` on every write, and the only
member-facing path is the "Get featured" request form which just emails the admin team. The existing
`posts` table is the editorial blog and **must not be reused** — member posts need separate
moderation, ownership, and a different URL space.

## Files you own
- `supabase/migrations/20260728_member_posts.sql`
- `lib/member-posts/types.ts`, `lib/member-posts/server.ts`, `lib/member-posts/client.ts`
- `app/api/member/posts/route.ts`
- `app/api/member/posts/[id]/route.ts`
- `app/api/admin/member-posts/route.ts`
- `app/admin/member-posts/page.tsx`
- `app/dashboard/posts-section.tsx`
- `app/awardees/[slug]/posts/[postSlug]/page.tsx`
- `app/awardees/[slug]/AwardeePostsList.tsx`
- `tests/member-posts/*.test.ts`

You may make **one** small addition to `app/awardees/[slug]/page.tsx`: render `<AwardeePostsList
slug={...} />` near the bottom of the profile. Read that file, keep the edit minimal and in its
existing style, and change nothing else in it.

## Schema — `20260728_member_posts.sql`
`public.member_posts`
- `id uuid pk default gen_random_uuid()`
- `profile_id uuid not null references public.profiles(id) on delete cascade`
- `slug text not null` — unique **per author**: `unique (profile_id, slug)`, not globally, so two
  awardees can each have a `my-story` post.
- `title text not null check (char_length(title) between 3 and 160)`
- `excerpt text check (char_length(excerpt) <= 320)`
- `body text not null check (char_length(body) between 20 and 40000)` — markdown
- `cover_url text`
- `tags text[] not null default '{}'`
- `status text not null default 'draft' check (status in ('draft','published','flagged','removed'))`
- `moderation_note text`, `moderated_by uuid references public.profiles(id) on delete set null`
- `published_at timestamptz`, `view_count integer not null default 0`
- `created_at`, `updated_at timestamptz not null default now()` + touch trigger

Index `(profile_id, status)` and `(status, published_at desc)`.

RLS: public/anon may `select` rows where `status = 'published'`; a member may select and mutate their
own rows; admins may do anything. A member may **not** set `status` to `flagged` or `removed`, and
may not clear a `removed` status — enforce that in the API, not just in RLS.

## Moderation model
Publish-immediately, moderate-after. A member publishes without waiting; an admin can `flag` (hidden
from public, member sees why) or `remove` (hidden permanently, member cannot re-publish it). This is
the right call for a curated invite-only awardee network — but it means the public route must always
filter on `status = 'published'` server-side and never trust a client-supplied filter.

## API
- `GET /api/member/posts` → the caller's own posts, all statuses, newest first.
- `POST /api/member/posts` → create. zod: `title` 3–160, `body` 20–40000, `excerpt` ≤ 320 optional,
  `tags` ≤ 6 strings of ≤ 24 chars, `coverUrl` optional valid URL, `status` in `draft|published`.
  Slug auto-generated from title, uniquified per author with `-2`, `-3`, … Set `published_at` when
  first published. **Only `profiles.status = 'approved'` members may publish**; a pending member may
  save drafts. Rate limit: at most 10 posts/day per member.
- `PATCH /api/member/posts/[id]` → update own post. Reject if the row's `status = 'removed'` (403,
  "This post was removed by the admin team."). Re-slug only if the title changed and the post has
  never been published — changing the slug of a live post breaks its public URL.
- `DELETE /api/member/posts/[id]` → hard-delete own post, but only when `status != 'removed'`
  (a removed post is a moderation record).
- `GET /api/admin/member-posts` (`requireAdmin`) → all posts + author name/email, filterable by
  status. `PATCH` → set `status` to `published|flagged|removed` with a `moderationNote`, recording
  `moderated_by`.

Sanitise markdown on render, not on write: store the raw body, and render with the escaping the
project already uses. Check how `app/blog/[slug]/page.tsx` renders post bodies and **use the same
approach** — do not introduce a new markdown or HTML-sanitiser dependency, and never
`dangerouslySetInnerHTML` unsanitised member input.

## Public pages
- `app/awardees/[slug]/posts/[postSlug]/page.tsx` — server component. Resolve the awardee by `slug`
  via the existing helpers in `lib/awardees.ts`, then load the post by `(profile_id, slug)` with
  `status = 'published'`; `notFound()` otherwise. Export `generateMetadata` with title, excerpt as
  description, and `openGraph` (mirror `app/blog/[slug]/page.tsx`). Increment `view_count`
  best-effort and never let that failure break the page.
- `app/awardees/[slug]/AwardeePostsList.tsx` — server component listing that awardee's published
  posts as cards linking to the above. Render nothing at all when there are none (no empty state on
  a public profile).

## UI — `app/dashboard/posts-section.tsx`
Default-exported client component `PostsSection({ member }: { member: MemberProfile })`:
list of the member's posts with status chips (`draft` amber, `published` emerald, `flagged` red with
the moderation note shown, `removed` grey), a "Write a post" button opening a full-width editor
(title, excerpt, tags, cover URL, markdown body with a live character count), Save draft / Publish /
Update / Delete actions, and a "View live" link to the public URL for published posts.

## Tests — `tests/member-posts/`
Per-author slug uniquification; the status-transition permission matrix (member vs admin × every
status pair, especially that a member cannot leave `removed`); zod validation bounds; the
`published_at` set-once rule; that the public query always constrains `status = 'published'`.

## Report back
Files created, `npm test` and `npx tsc --noEmit` results, the migration file to run, the exact edit
made to `app/awardees/[slug]/page.tsx`, and anything unverified.
