# Opportunity Categories and DM Email Notifications Implementation Plan (Plan C)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Workshops, trainings and member-only listings are reachable from the Opportunities feed, and a direct message sends the recipient an email notification.

**Architecture:** `/api/opportunities` currently proxies an external Edutu feed with a hardcoded fallback and is not DB-backed, so AFL-curated and member-only listings need storage: a small `member_opportunities` table, merged into the same response. `member_only` rows are returned only to an authenticated member, so they can never leak to a public caller. Separately, `lib/brevo.ts` gains a transactional send helper, and the two DM write paths fire a throttled "you have a new message" email that never discloses the sender's address.

**Tech Stack:** Next.js 15.5.20 App Router, TypeScript, Supabase, Brevo transactional email, Tailwind, Radix/shadcn UI, `zod`, Vitest.

**Spec:** `docs/superpowers/specs/2026-07-26-member-dashboard-awards-and-community-design.md` sections 4 and 5.

## Global Constraints

Every task's requirements implicitly include this section.

- Route handlers declare `export const runtime = 'nodejs'`.
- Member auth: `getCurrentUser()` from `@/lib/auth-server`. Admin auth: `requireAdmin(request)` from `@/lib/api/require-admin`.
- DB access uses `createAdminClient()` from `@/lib/supabase/server` (service role — it bypasses RLS, so scope every query explicitly).
- **Every Supabase call returns `{ data, error }` and does not throw.** Check `error` on every call; an unchecked one is invisible.
- Next 15 dynamic route params are Promises: `{ params }: { params: Promise<{ id: string }> }`.
- **`member_only` listings must never appear in an unauthenticated response.** This is the security property of Plan C — an anonymous caller to `/api/opportunities` must receive only public rows.
- **Email must never disclose one member's address to another.** Notifications are sent to the recipient only, are about the sender, and never include the sender's address or put it in reply-to.
- **Email failures must never block message delivery.** A DM is saved first; the notification is best-effort and its failure is logged, not surfaced.
- **Do not use the `text-white` Tailwind utility.** `app/globals.css` rewrites dark utilities with `!important` under `html.light`. Use the literal `text-[#fffaf0]`.
- **Commit messages must NOT include a `Co-Authored-By` trailer.**
- **Another developer works in this repo concurrently.** Stage only your own files by explicit path. Never `git add -A` or `git add .`.

## File Structure

**Created**

| File | Responsibility |
| --- | --- |
| `supabase/migrations/20260727_member_opportunities.sql` | AFL-curated + member-only listings |
| `lib/opportunities-server.ts` | Row mapping, merge of DB rows with the external feed |
| `app/api/admin/opportunities/route.ts` | Admin CRUD |
| `app/admin/opportunities/page.tsx` | Admin console |
| `lib/email/send.ts` | Brevo transactional send helper |
| `lib/email/dm-notification.ts` | Throttle + template for the new-message email |
| `tests/opportunities/merge.test.ts` | Merge and member-only gating tests |
| `tests/email/throttle.test.ts` | Throttle-window tests |

**Modified**

| File | Change |
| --- | --- |
| `app/api/opportunities/route.ts` | Merge DB rows, gate `member_only`, support a `type` filter |
| `app/api/member/conversations/route.ts` | Fire the notification on first message |
| `app/api/member/conversations/[id]/route.ts` | Fire the notification on subsequent messages |
| `app/dashboard/page.tsx` | Filter chips in the Opportunities section |

---

### Task 1: `member_opportunities` migration

**Files:**
- Create: `supabase/migrations/20260727_member_opportunities.sql`

**Interfaces:**
- Produces: table `public.member_opportunities`

- [ ] **Step 1: Write the migration**

`supabase/migrations/20260727_member_opportunities.sql`:

```sql
-- AFL-curated opportunities, including member-only listings that must never
-- reach a public caller.
create extension if not exists "pgcrypto";

create table if not exists public.member_opportunities (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  type text not null default 'Opportunity' check (type in (
    'Workshop','Training','Fellowship','Grant','Scholarship','Mentorship','Residency','Opportunity'
  )),
  location text not null default 'Online',
  deadline text not null default 'Rolling',
  description text,
  url text,
  member_only boolean not null default false,
  published boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists member_opportunities_published_idx
  on public.member_opportunities (published, member_only);
create index if not exists member_opportunities_type_idx on public.member_opportunities (type);

create or replace function public.touch_member_opportunities_updated_at()
returns trigger language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists member_opportunities_set_updated_at on public.member_opportunities;
create trigger member_opportunities_set_updated_at
  before update on public.member_opportunities
  for each row execute function public.touch_member_opportunities_updated_at();

alter table public.member_opportunities enable row level security;

-- Anonymous/public readers get published, non-member-only rows. The API also
-- enforces this; the policy is defence in depth for any direct client read.
do $$ begin
  create policy "Public reads published open opportunities" on public.member_opportunities
    for select using (published = true and member_only = false);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Members read published opportunities" on public.member_opportunities
    for select using (published = true and auth.uid() is not null);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Service role manages opportunities" on public.member_opportunities
    for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
exception when duplicate_object then null; end $$;
```

- [ ] **Step 2: Verify by reading**

Confirm: the `type` CHECK lists all eight categories; the public policy excludes `member_only`; every statement is idempotent; the trigger function pins `search_path`.

**Do not attempt to apply this** — there is no database connection here.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260727_member_opportunities.sql
git commit -m "feat(opportunities): member_opportunities table with member-only gating"
```

---

### Task 2: Merge module

**Files:**
- Create: `lib/opportunities-server.ts`, `tests/opportunities/merge.test.ts`

**Interfaces:**
- Consumes: `HubOpportunity` from `@/lib/member-hub`
- Produces:
  - `OPPORTUNITY_TYPES: readonly string[]`
  - `CuratedOpportunity = HubOpportunity & { description: string | null; url: string | null; memberOnly: boolean; source: 'afl' }`
  - `mapCuratedOpportunity(row): CuratedOpportunity`
  - `mergeOpportunities(curated: CuratedOpportunity[], external: HubOpportunity[], opts: { isMember: boolean; type?: string }): (HubOpportunity | CuratedOpportunity)[]`

- [ ] **Step 1: Write the failing test**

`tests/opportunities/merge.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { mergeOpportunities, type CuratedOpportunity } from '@/lib/opportunities-server'
import type { HubOpportunity } from '@/lib/member-hub'

const curated = (over: Partial<CuratedOpportunity>): CuratedOpportunity => ({
  id: 'c1',
  title: 'AFL Leadership Workshop',
  type: 'Workshop',
  location: 'Lagos',
  deadline: 'Aug 20',
  description: null,
  url: null,
  memberOnly: false,
  source: 'afl',
  ...over,
})

const external: HubOpportunity[] = [
  { id: 'e1', title: 'Climate Fellowship', type: 'Fellowship', location: 'Remote', deadline: 'Sep 01' },
]

describe('mergeOpportunities', () => {
  it('puts curated listings ahead of the external feed', () => {
    const result = mergeOpportunities([curated({})], external, { isMember: true })
    expect(result[0].id).toBe('c1')
    expect(result[1].id).toBe('e1')
  })

  it('hides member-only listings from a public caller', () => {
    const result = mergeOpportunities([curated({ memberOnly: true })], external, { isMember: false })
    expect(result.map((o) => o.id)).toEqual(['e1'])
  })

  it('shows member-only listings to a member', () => {
    const result = mergeOpportunities([curated({ memberOnly: true })], external, { isMember: true })
    expect(result.map((o) => o.id)).toEqual(['c1', 'e1'])
  })

  it('never leaks a member-only listing even when its type is requested', () => {
    const result = mergeOpportunities([curated({ memberOnly: true, type: 'Workshop' })], [], {
      isMember: false,
      type: 'Workshop',
    })
    expect(result).toEqual([])
  })

  it('filters by type across both sources', () => {
    const result = mergeOpportunities([curated({ type: 'Workshop' })], external, {
      isMember: true,
      type: 'Fellowship',
    })
    expect(result.map((o) => o.id)).toEqual(['e1'])
  })

  it('treats the type filter case-insensitively', () => {
    const result = mergeOpportunities([curated({ type: 'Workshop' })], [], { isMember: true, type: 'workshop' })
    expect(result.map((o) => o.id)).toEqual(['c1'])
  })

  it('returns everything when no type is given', () => {
    expect(mergeOpportunities([curated({})], external, { isMember: true })).toHaveLength(2)
  })

  it('drops an external item whose id collides with a curated one', () => {
    const collide: HubOpportunity[] = [{ id: 'c1', title: 'Dupe', type: 'Grant', location: 'X', deadline: 'Y' }]
    const result = mergeOpportunities([curated({})], collide, { isMember: true })
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('AFL Leadership Workshop')
  })

  it('handles empty inputs', () => {
    expect(mergeOpportunities([], [], { isMember: true })).toEqual([])
  })
})
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `npm test -- tests/opportunities/merge.test.ts`
Expected: FAIL — `Failed to resolve import "@/lib/opportunities-server"`

- [ ] **Step 3: Write the implementation**

`lib/opportunities-server.ts`:

```ts
// lib/opportunities-server.ts
// Merges AFL-curated listings with the external Edutu feed.
// The member-only filter here is the security boundary: it runs before any
// type filtering so a `type` query can never be used to surface a gated row.
import type { HubOpportunity } from '@/lib/member-hub'

export const OPPORTUNITY_TYPES = [
  'Workshop',
  'Training',
  'Fellowship',
  'Grant',
  'Scholarship',
  'Mentorship',
  'Residency',
  'Opportunity',
] as const

export type CuratedOpportunity = HubOpportunity & {
  description: string | null
  url: string | null
  memberOnly: boolean
  source: 'afl'
}

export function mapCuratedOpportunity(row: any): CuratedOpportunity {
  return {
    id: row.id,
    title: row.title ?? '',
    type: row.type ?? 'Opportunity',
    location: row.location ?? 'Online',
    deadline: row.deadline ?? 'Rolling',
    description: row.description ?? null,
    url: row.url ?? null,
    memberOnly: Boolean(row.member_only),
    source: 'afl',
  }
}

export function mergeOpportunities(
  curated: CuratedOpportunity[],
  external: HubOpportunity[],
  opts: { isMember: boolean; type?: string },
): (HubOpportunity | CuratedOpportunity)[] {
  // Gate first, filter second. Doing this in the other order would let a
  // crafted `type` parameter reach a member-only row.
  const visible = curated.filter((item) => opts.isMember || !item.memberOnly)

  const seen = new Set(visible.map((item) => item.id))
  const deduped = external.filter((item) => !seen.has(item.id))

  const combined: (HubOpportunity | CuratedOpportunity)[] = [...visible, ...deduped]

  if (!opts.type) return combined

  const wanted = opts.type.trim().toLowerCase()
  return combined.filter((item) => item.type.trim().toLowerCase() === wanted)
}
```

- [ ] **Step 4: Run the test and verify it passes**

Run: `npm test -- tests/opportunities/merge.test.ts`
Expected: PASS — 9 tests passed

- [ ] **Step 5: Commit**

```bash
git add lib/opportunities-server.ts tests/opportunities/merge.test.ts
git commit -m "feat(opportunities): merge curated listings with the external feed"
```

---

### Task 3: Wire the merge into `/api/opportunities`

**Files:**
- Modify: `app/api/opportunities/route.ts`

**Interfaces:**
- Consumes: `mergeOpportunities`, `mapCuratedOpportunity` from `@/lib/opportunities-server`; `getCurrentUser`
- Produces: `GET /api/opportunities?type=` → `{ mode, source, opportunities, types }`

- [ ] **Step 1: Modify the route**

Keep the existing external-feed logic and its fallback list exactly as they are. Add around them:

- Determine membership: `const user = await getCurrentUser()`, `const isMember = Boolean(user?.id)`. **A failure to resolve the session must be treated as not-a-member**, never as a member.
- Load curated rows: `supabase.from('member_opportunities').select('*').eq('published', true).order('sort_order', { ascending: true })`. Check `error`; on failure log it and continue with an empty curated list — a broken curated table must not take down the public feed.
- Call `mergeOpportunities(curated, externalOrFallback, { isMember, type })` where `type` is `request.nextUrl.searchParams.get('type') ?? undefined`.
- Include `types: OPPORTUNITY_TYPES` in the response so the UI can build filter chips without hardcoding.
- Keep `mode` and `source` in the response shape — the dashboard already reads them.

- [ ] **Step 2: Verify the security property by reading**

Confirm by tracing the code: with `isMember === false`, no row where `member_only` is true can appear in the response, on any path — including the `type` filter path and the external-feed-failure path.

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit 2>&1 | grep -E "app/api/opportunities|lib/opportunities-server"`
Expected: no output

Run: `npm test`
Expected: all passing

- [ ] **Step 4: Commit**

```bash
git add app/api/opportunities/route.ts
git commit -m "feat(opportunities): merge curated listings and gate member-only rows"
```

---

### Task 4: Admin opportunities console

**Files:**
- Create: `app/api/admin/opportunities/route.ts`, `app/admin/opportunities/page.tsx`

**Interfaces:**
- Produces: `GET|POST|PATCH|DELETE /api/admin/opportunities`

- [ ] **Step 1: Write the API route**

Admin-gate every method with `requireAdmin(request)`. Validate the body with `zod`: `title` (required, 4–180), `type` (must be one of `OPPORTUNITY_TYPES`), `location`, `deadline`, `description`, `url` (a valid URL when present), `memberOnly` and `published` (booleans), `sortOrder` (integer). Check `error` on every Supabase call and return 503 with a message naming `supabase/migrations/20260727_member_opportunities.sql` when the table is missing. `DELETE` takes `{ id }`.

- [ ] **Step 2: Write the admin page**

Create `app/admin/opportunities/page.tsx` following the conventions of `app/admin/feature-requests/page.tsx` — read it first and match its loading, empty and error states, its table styling and its toast usage.

It needs: a list of all listings with type, location, deadline, published and member-only flags; a create form; inline edit; a publish/unpublish toggle; a member-only toggle; and delete with confirmation. Make the member-only flag visually obvious — an admin must be able to see at a glance which listings are hidden from the public.

- [ ] **Step 3: Add the console to the admin navigation**

Add an Opportunities entry to `app/admin/components/AdminSidebar.tsx`, matching the existing entries' shape and icon convention. A console nobody can navigate to does not exist.

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit 2>&1 | grep -E "app/admin/opportunities|app/api/admin/opportunities|app/admin/components"`
Expected: no output

Run: `npx next build`
Expected: completes, `/admin/opportunities` in the route table

- [ ] **Step 5: Commit**

```bash
git add app/api/admin/opportunities app/admin/opportunities app/admin/components/AdminSidebar.tsx
git commit -m "feat(opportunities): admin console for curated listings"
```

---

### Task 5: Brevo transactional send helper

**Files:**
- Create: `lib/email/send.ts`

**Interfaces:**
- Produces: `sendTransactionalEmail(input: { to: string; toName?: string; subject: string; html: string; text?: string }): Promise<{ ok: boolean; reason?: string }>`

- [ ] **Step 1: Write the helper**

`lib/email/send.ts`:

```ts
// lib/email/send.ts
// Brevo transactional send. `lib/brevo.ts` is a 'use server' module for the
// newsletter contact API; this is a separate plain module so it can be called
// from route handlers without server-action semantics.

const BREVO_ENDPOINT = 'https://api.brevo.com/v3/smtp/email'

export type SendInput = {
  to: string
  toName?: string
  subject: string
  html: string
  text?: string
}

/**
 * Never throws. Callers are notification paths where an email failure must not
 * fail the underlying action, so the result is returned rather than raised.
 */
export async function sendTransactionalEmail(input: SendInput): Promise<{ ok: boolean; reason?: string }> {
  const apiKey = process.env.BREVO_API_KEY
  if (!apiKey) return { ok: false, reason: 'BREVO_API_KEY is not configured' }

  const senderEmail = process.env.BREVO_SENDER_EMAIL ?? 'info@top100afl.com'
  const senderName = process.env.BREVO_SENDER_NAME ?? 'Top100 Africa Future Leaders'

  try {
    const response = await fetch(BREVO_ENDPOINT, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify({
        sender: { email: senderEmail, name: senderName },
        to: [{ email: input.to, ...(input.toName ? { name: input.toName } : {}) }],
        subject: input.subject,
        htmlContent: input.html,
        ...(input.text ? { textContent: input.text } : {}),
      }),
      signal: AbortSignal.timeout(10_000),
    })

    if (!response.ok) {
      const detail = await response.text().catch(() => '')
      return { ok: false, reason: `Brevo returned ${response.status}: ${detail.slice(0, 200)}` }
    }

    return { ok: true }
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : 'Unknown email failure' }
  }
}
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit 2>&1 | grep -E "lib/email"`
Expected: no output

- [ ] **Step 3: Commit**

```bash
git add lib/email/send.ts
git commit -m "feat(email): brevo transactional send helper"
```

---

### Task 6: DM notification with throttle

**Files:**
- Create: `lib/email/dm-notification.ts`, `tests/email/throttle.test.ts`
- Modify: `app/api/member/conversations/route.ts`, `app/api/member/conversations/[id]/route.ts`

**Interfaces:**
- Produces: `DM_NOTIFY_WINDOW_MS: number`, `shouldNotify(lastNotifiedAt: string | null, now?: number): boolean`, `buildDmNotification(input: { recipientName: string; senderName: string; siteUrl: string }): { subject: string; html: string; text: string }`, `notifyNewMessage(supabase, input): Promise<void>`

- [ ] **Step 1: Write the failing throttle test**

`tests/email/throttle.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { DM_NOTIFY_WINDOW_MS, buildDmNotification, shouldNotify } from '@/lib/email/dm-notification'

const NOW = Date.parse('2026-07-27T12:00:00.000Z')

describe('DM_NOTIFY_WINDOW_MS', () => {
  it('is one hour', () => {
    expect(DM_NOTIFY_WINDOW_MS).toBe(60 * 60 * 1000)
  })
})

describe('shouldNotify', () => {
  it('notifies when there is no prior notification', () => {
    expect(shouldNotify(null, NOW)).toBe(true)
  })

  it('suppresses inside the window', () => {
    expect(shouldNotify(new Date(NOW - 60_000).toISOString(), NOW)).toBe(false)
  })

  it('notifies once the window has elapsed', () => {
    expect(shouldNotify(new Date(NOW - DM_NOTIFY_WINDOW_MS - 1).toISOString(), NOW)).toBe(true)
  })

  it('notifies exactly at the window boundary', () => {
    expect(shouldNotify(new Date(NOW - DM_NOTIFY_WINDOW_MS).toISOString(), NOW)).toBe(true)
  })

  it('notifies when the stored timestamp is unparseable', () => {
    expect(shouldNotify('not-a-date', NOW)).toBe(true)
  })
})

describe('buildDmNotification', () => {
  const built = buildDmNotification({
    recipientName: 'Ada',
    senderName: 'Kwame Mensah',
    siteUrl: 'https://top100afl.com',
  })

  it('names the sender in the subject', () => {
    expect(built.subject).toContain('Kwame Mensah')
  })

  it('links back to the dashboard messages section', () => {
    expect(built.html).toContain('https://top100afl.com/dashboard')
  })

  it('never includes a raw email address', () => {
    expect(built.html).not.toMatch(/[\w.+-]+@[\w-]+\.[\w.]+/)
    expect(built.text).not.toMatch(/[\w.+-]+@[\w-]+\.[\w.]+/)
  })

  it('does not include the message body', () => {
    expect(built.html.toLowerCase()).not.toContain('message body')
  })
})
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `npm test -- tests/email/throttle.test.ts`
Expected: FAIL — `Failed to resolve import "@/lib/email/dm-notification"`

- [ ] **Step 3: Write the notification module**

`lib/email/dm-notification.ts`:

```ts
// lib/email/dm-notification.ts
// "You have a new message" email. Deliberately contains neither the message
// body nor either party's address — the conversation stays in the dashboard.
import type { createAdminClient } from '@/lib/supabase/server'
import { sendTransactionalEmail } from './send'

export const DM_NOTIFY_WINDOW_MS = 60 * 60 * 1000

/** At most one notification per recipient per conversation per hour. */
export function shouldNotify(lastNotifiedAt: string | null, now: number = Date.now()): boolean {
  if (!lastNotifiedAt) return true
  const timestamp = Date.parse(lastNotifiedAt)
  if (Number.isNaN(timestamp)) return true
  return now - timestamp >= DM_NOTIFY_WINDOW_MS
}

export function buildDmNotification(input: {
  recipientName: string
  senderName: string
  siteUrl: string
}): { subject: string; html: string; text: string } {
  const dashboard = `${input.siteUrl.replace(/\/$/, '')}/dashboard`
  const firstName = input.recipientName.split(' ')[0] || 'there'

  const subject = `${input.senderName} sent you a message`
  const text =
    `Hi ${firstName},\n\n${input.senderName} sent you a message on the Africa Future Leaders member platform.\n\n` +
    `Read and reply here: ${dashboard}\n\n` +
    `You can turn these emails off in your dashboard settings.`

  const html = `
    <div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;color:#111;line-height:1.6">
      <p>Hi ${escapeHtml(firstName)},</p>
      <p><strong>${escapeHtml(input.senderName)}</strong> sent you a message on the Africa Future Leaders member platform.</p>
      <p>
        <a href="${dashboard}" style="display:inline-block;background:#f97316;color:#fffaf0;padding:12px 24px;border-radius:9999px;text-decoration:none;font-weight:600">
          Read and reply
        </a>
      </p>
      <p style="color:#666;font-size:14px">You can turn these emails off in your dashboard settings.</p>
    </div>
  `.trim()

  return { subject, html, text }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * Best-effort notification. Never throws and never returns a failure to the
 * caller — a message must be delivered even when email is broken.
 */
export async function notifyNewMessage(
  supabase: ReturnType<typeof createAdminClient>,
  input: { conversationId: string; recipientId: string; senderName: string },
): Promise<void> {
  try {
    const { data: recipient, error } = await supabase
      .from('profiles')
      .select('email, full_name, notification_prefs')
      .eq('id', input.recipientId)
      .maybeSingle()

    if (error || !recipient?.email) return

    const prefs = (recipient.notification_prefs ?? {}) as Record<string, unknown>
    // Respect the member's existing messageAlerts preference; default on.
    if (prefs.messageAlerts === false) return

    const { data: conversation } = await supabase
      .from('dm_conversations')
      .select('last_notified_at')
      .eq('id', input.conversationId)
      .maybeSingle()

    if (!shouldNotify((conversation as any)?.last_notified_at ?? null)) return

    const built = buildDmNotification({
      recipientName: recipient.full_name ?? 'there',
      senderName: input.senderName,
      siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://top100afl.com',
    })

    const result = await sendTransactionalEmail({
      to: recipient.email,
      toName: recipient.full_name ?? undefined,
      subject: built.subject,
      html: built.html,
      text: built.text,
    })

    if (!result.ok) {
      console.error('[dm-notify] send failed', input.conversationId, result.reason)
      return
    }

    // Stamp only after a successful send, so a failure retries on the next message.
    const { error: stampError } = await supabase
      .from('dm_conversations')
      .update({ last_notified_at: new Date().toISOString() })
      .eq('id', input.conversationId)

    if (stampError) console.error('[dm-notify] could not stamp last_notified_at', input.conversationId, stampError)
  } catch (error) {
    console.error('[dm-notify] unexpected failure', input.conversationId, error)
  }
}
```

- [ ] **Step 4: Add the throttle column**

Append to `supabase/migrations/20260727_member_opportunities.sql` (or create `supabase/migrations/20260727_dm_notifications.sql` — either is fine, but say which in your report):

```sql
alter table public.dm_conversations
  add column if not exists last_notified_at timestamptz;
```

- [ ] **Step 5: Fire the notification from both DM write paths**

In `app/api/member/conversations/route.ts` (first message) and `app/api/member/conversations/[id]/route.ts` (subsequent messages), after the message row has been inserted **successfully**, call `notifyNewMessage(...)`.

Two requirements:
- It must run **after** the insert succeeds — never before, and never in a way that can fail the request.
- Do **not** `await` it in a way that delays the response beyond what is reasonable; if you do await it, the call is already guaranteed not to throw, so the only cost is latency. Prefer awaiting it for correctness on serverless (a floating promise may be killed when the response returns), and note that choice in your report.

The sender's display name comes from the profile data those routes already load.

- [ ] **Step 6: Run the tests and verify they pass**

Run: `npm test -- tests/email/throttle.test.ts`
Expected: PASS — 10 tests passed

Run: `npm test`
Expected: all passing

Run: `npx tsc --noEmit 2>&1 | grep -E "lib/email|app/api/member/conversations"`
Expected: no output

- [ ] **Step 7: Commit**

```bash
git add lib/email/dm-notification.ts tests/email/throttle.test.ts app/api/member/conversations supabase/migrations
git commit -m "feat(email): throttled new-message notifications for direct messages"
```

---

### Task 7: Opportunities filter chips

> **Serialized task.** This file is also touched by Plan B. Do not run this task concurrently with Plan B's dashboard task.

**Files:**
- Modify: `app/dashboard/page.tsx`

- [ ] **Step 1: Add filter chips to the Opportunities section**

Locate `OpportunitiesSection` **by content, not line number**.

- Add a `selectedType` state, default `'all'`.
- Render a chip row above the cards: **All**, then one chip per type returned in the response's `types` array. Style them exactly like the existing cohort chips in `DirectorySection` — `rounded-full px-4 py-2.5 text-sm font-semibold`, active `bg-[#050505] text-[#fffaf0]`, inactive `bg-orange-50 text-black hover:bg-orange-100` — and set `aria-pressed` on each.
- Pass the selection to the API as `?type=` and refetch on change, or filter client-side from a single fetch. Either is acceptable; server-side keeps the member-only gate authoritative in one place, so prefer it.
- Show a "member only" badge on any listing whose `memberOnly` is true, so members can see what is exclusive to them.
- Keep the existing refresh button, the fallback behaviour and the error panel exactly as they are.

- [ ] **Step 2: Verify**

Run: `npx next build`
Expected: completes, `/dashboard` in the route table

Run: `npx tsc --noEmit 2>&1 | grep -E "app/dashboard"`
Expected: no output

- [ ] **Step 3: Commit**

```bash
git add app/dashboard/page.tsx
git commit -m "feat(opportunities): category filter chips in the member dashboard"
```

---

## Environment variables

| Variable | Purpose |
| --- | --- |
| `BREVO_API_KEY` | Already used by the newsletter; now also transactional sends |
| `BREVO_SENDER_EMAIL` | Defaults to `info@top100afl.com` |
| `BREVO_SENDER_NAME` | Defaults to `Top100 Africa Future Leaders` |
| `NEXT_PUBLIC_SITE_URL` | Dashboard link in the notification email |

## Verification

- **Unit tests** cover the two places a bug would be invisible and costly: the member-only gate in the merge, and the notification throttle.
- **Typecheck and build** gate every task.
- **Manual, required before shipping** (impossible here — no database or Brevo key): confirm an anonymous `curl /api/opportunities` returns no member-only listing while a signed-in member sees it; confirm a DM sends exactly one email and a second message within the hour sends none; confirm turning `messageAlerts` off in dashboard settings stops them.

## Assumptions

1. Members do not create opportunities — the table is admin-curated only.
2. The external Edutu feed stays the primary source; curated listings are prepended.
3. The notification carries no message body, by design — it is a nudge back to the dashboard, not a mail client.
4. The throttle is per conversation, not per recipient, so two different people messaging the same member both get through.
5. Rejecting an email send does not retry; the next message in that conversation notifies instead.
