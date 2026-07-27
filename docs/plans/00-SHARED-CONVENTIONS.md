# Shared conventions — awardee platform workstreams

Every workstream plan in this directory assumes these. Read this first.

## Stack
Next.js App Router (`app/`), TypeScript, Supabase (Postgres + auth), Tailwind, shadcn/ui in
`components/ui/`, `sonner` for toasts, `lucide-react` icons, `zod` for validation, `vitest` for tests.

## Auth / data access in API routes
```ts
import { getCurrentUser } from '@/lib/auth-server'       // member session -> { id, ... } | null
import { requireAdmin } from '@/lib/api/require-admin'    // admin routes: returns { error } | { user }
import { createAdminClient } from '@/lib/supabase/server' // service-role client
import { checkRateLimit, RATE_LIMITS, createRateLimitResponse } from '@/lib/rate-limit'
export const runtime = 'nodejs'
```
- `user.id` **is** `profiles.id`. Join member data via `public.profiles`.
- Member routes: 401 `{ message: 'Authentication required.' }` when no user.
- Rate limit per-member (`identifier: \`thing:${user.id}\``), never per-IP, for authenticated routes.
- Every route returns JSON `{ message }` on error. Never leak raw Postgres errors to the client;
  `console.error('[route-name] ...', error)` server-side instead.

## Member status — CORRECTION, read carefully
The individual plan files say "`profiles.status = 'approved'`". **That column does not exist.** The
real column is:

```
public.profiles.membership_status  text not null default 'pending'
  -- values: 'pending' | 'approved' | 'rejected' | 'suspended'
```

Added by `supabase/migrations/20260706_access_codes_and_membership.sql` /
`supabase/SETUP-MEMBER-HUB.sql`. See `lib/member-hub-server.ts:49`,
`app/api/member/conversations/route.ts:122`, and
`app/api/admin/notifications/broadcast/route.ts:76` for how the app already reads it. Wherever a plan
says `profiles.status`, use `profiles.membership_status`.

Note also that `MemberProfile.status` (the *client* type in `lib/member-hub.ts`) is the mapped form of
`membership_status`, so `member.status` in a React component is correct — it is only the **SQL column
name** that differs.

## Live database state — assume nothing is applied
Verified against the live Supabase project on 2026-07-27: `profiles`, `awardees`, `posts`, `events`,
and `upcoming_events` exist. **`access_codes`, `user_notifications`, `member_features`,
`dm_conversations`, `dm_messages`, `award_orders`, `feature_requests`, `interviews`, and
`interview_applications` all return 404 — they have never been created.** `profiles` also lacks
`membership_status`, `bio_update_count`, `organization`, and `field`.

So your migration will run on a database where its prerequisites may be missing. This makes the
missing-table degradation rule below mandatory, not optional — write it for every new table.

## Missing-table degradation (important)
This project's live DB frequently lags behind `supabase/migrations/`. Follow the existing pattern in
`lib/awards/server.ts`: detect the "relation does not exist" error (Postgres code `42P01`, and
PostgREST's `PGRST205` / message containing `does not exist`) and return **503** with a human message
telling the admin which SQL file to run. Never 500 and never crash a dashboard section because a
migration has not been applied. Export an `isMissing<Thing>Table(error)` helper and a
`<THING>_SETUP_MESSAGE` constant from your lib, mirroring `lib/awards/server.ts`.

## Migrations
- New file in `supabase/migrations/`, named `20260728_<topic>.sql`. Never edit an existing migration.
- Idempotent: `create table if not exists`, `create index if not exists`, `drop policy if exists`
  before `create policy`.
- Enable RLS on every new table and write explicit policies. Server routes use the service-role
  client so they bypass RLS, but RLS must still be correct as defence in depth.
- Money is always integer **kobo**. Timestamps `timestamptz`. UUID PKs via `gen_random_uuid()`.
- Add an `updated_at` trigger following `public.touch_award_orders_updated_at()` in
  `supabase/migrations/20260726_award_orders.sql`.

## Dashboard UI
- The dashboard is `app/dashboard/page.tsx`. **DO NOT EDIT `app/dashboard/page.tsx`.** The lead agent
  wires navigation. Ship a self-contained default-exported client component in
  `app/dashboard/<your>-section.tsx` that takes `{ member: MemberProfile }` (type from
  `@/lib/member-hub`) and nothing else it cannot fetch itself.
- Match the existing visual language exactly — study `app/dashboard/awards-section.tsx` and
  `app/dashboard/messages-section.tsx` before writing any JSX:
  - Cream page surface `#fffaf4`, white cards, `border-orange-100`, radii `rounded-[28px]` /
    `rounded-[24px]` / `rounded-2xl`, primary button `rounded-full bg-orange-500 text-[#fffaf0]
    hover:bg-orange-600`.
  - Body copy `text-black/60`, eyebrow `text-xs font-semibold uppercase tracking-[0.18em]
    text-orange-600`.
  - **Never use `text-white`** — `app/globals.css` rewrites dark utilities under `html.light` and
    `text-white` is broken site-wide. Use `text-[#fffaf0]`.
- Always handle four states: loading (skeleton or spinner), error (with a retry button), empty
  (dashed-border placeholder), and populated.

## Testing
- `npm test` runs vitest (`vitest.config.ts`). Put tests in `tests/<topic>/`.
- Test pure logic directly (state machines, validators, mappers, permission checks). For anything
  touching `fetch`, use `vi.stubGlobal('fetch', ...)`. Do not write tests that require a live DB.
- Before you report done, run: `npm test` and `npx tsc --noEmit`. Both must pass. `npx tsc --noEmit`
  is slow (~2 min) — run it once at the end.

## Hard rules
- **Never run `npm run dev`, `npm start`, or `next build`.** The user owns port 3000 and `.next`;
  starting a server corrupts their running instance.
- Never run migrations against the live database. Never make a real Paystack or courier call.
- Never `git commit`, `git checkout`, or `git stash`. Leave changes in the working tree.
- Do not add a `Co-Authored-By: Claude` trailer anywhere.
- Only create/edit files inside your workstream's declared file list. If you need a change outside
  it, say so in your final report instead of making it.
