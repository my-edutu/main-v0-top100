# Workstream 4 — "Your award has been sent" notifications

Read `docs/plans/00-SHARED-CONVENTIONS.md` first. It is binding.

## Goal
Right now an award order moves `paid → dispatched → in_transit → delivered` in total silence. There
is no email and no in-app notification anywhere in `app/api/webhooks/paystack/route.ts`,
`app/api/admin/awards/route.ts`, or `lib/awards/`. The member must be told, by email and in the
dashboard, at each milestone.

## Files you own
- `lib/awards/notify.ts` (new — the whole feature lives here)
- `lib/email/award-templates.ts` (new)
- `supabase/migrations/20260728_award_notification_log.sql` (new)
- `tests/awards/notify.test.ts` (new)
- Minimal call-site edits to `app/api/webhooks/paystack/route.ts`,
  `app/api/admin/awards/route.ts`, `app/api/member/award/track/route.ts`

**Do not touch** `lib/courier/*` (workstream 3 owns it) or `lib/awards/status.ts` /
`lib/awards/money.ts` (stable, already tested).

## Milestones
| Status reached | Subject | Body carries |
|---|---|---|
| `paid` | Payment confirmed — your award is being prepared | amount paid, delivery address, what happens next |
| `dispatched` | Your award has been sent | waybill/parcel number, courier, tracking link, address |
| `in_transit` | Your award is on the way | waybill, tracking link |
| `delivered` | Your award has been delivered | waybill, a line inviting them to share a photo |

## `lib/awards/notify.ts`
Export one function:
```ts
export async function notifyAwardStatus(
  supabase: SupabaseClient,
  order: AwardOrderRow,
  status: AwardStatus,
): Promise<void>
```

Requirements:
- **Never throws.** Every failure is caught and `console.error('[award-notify] ...', error)`. A
  bounced email must never fail a Paystack webhook (Paystack would retry and risk a double-charge
  path) and must never fail an admin's dispatch action.
- **Exactly-once per (order, status).** Insert into `award_notification_log` *before* sending, with
  `unique (order_id, status)`. A unique-violation (Postgres `23505`) means an earlier attempt already
  claimed this milestone — return silently, send nothing. Paystack retries webhooks; without this the
  member gets the same "payment confirmed" email repeatedly.
- Writes both channels, independently, so one failing does not block the other:
  1. **In-app** — insert a row the dashboard's notifications section already reads. Read
     `app/api/member/notifications/route.ts` and `lib/member-hub-server.ts` first and use the exact
     table and column names they read from, targeted at this one member. If that store has no
     per-member targeting, add the narrowest column needed and say so in your report.
  2. **Email** — via the existing Brevo helper in `lib/email/brevo.ts`. Read it and follow its
     signature; do not add a new mail dependency. If `BREVO_API_KEY` is unset, log and skip — a
     missing key is a config gap, not an error state.
- After a successful send, update the log row with `sent_at` and `channels`. After a failure, record
  `error` on the row so `/admin/awards` has a trail.
- Money in the email is formatted from integer kobo — use `lib/awards/money.ts` helpers; never do
  arithmetic on kobo inline in a template.

## `lib/email/award-templates.ts`
One pure function per milestone returning `{ subject, html, text }` from a typed input. Keep them
pure and side-effect free so they are directly testable. Escape every interpolated member-supplied
value (`recipient_name`, address lines) — these are user input landing in HTML. Style to match the
brand: cream `#fffaf4` background, orange `#f97316` accent, dark text. Include a plain-text
alternative for every email.

## Migration — `20260728_award_notification_log.sql`
```
id uuid pk, order_id uuid not null references public.award_orders(id) on delete cascade,
profile_id uuid, status text not null, channels text[] not null default '{}',
sent_at timestamptz, error text, created_at timestamptz not null default now(),
unique (order_id, status)
```
RLS enabled; admin-only select. Follow the missing-table degradation rule from the shared
conventions — if this table does not exist yet, `notifyAwardStatus` must log and send nothing rather
than throw, because the award flow itself must keep working.

## Call sites (keep each edit to a few lines)
- `app/api/webhooks/paystack/route.ts` — after the order is successfully marked `paid`, `await
  notifyAwardStatus(supabase, updatedOrder, 'paid')`. Place it after the DB write so a notification
  never precedes the state it announces.
- `app/api/admin/awards/route.ts` — in `PATCH`, after a successful status update, call it with the
  new status when that status is one of the four milestones. Note that route also records the waybill
  in the same PATCH, so pass the **updated** row, not the pre-update one, or the dispatch email will
  have no waybill.
- `app/api/member/award/track/route.ts` — after a courier-driven status advance is persisted.

## Tests — `tests/awards/notify.test.ts`
Mock the Supabase client and the Brevo helper. Cover: each milestone sends once; a second call for
the same `(order, status)` sends nothing (simulate a `23505`); a Brevo throw is swallowed and the
function still resolves; a missing `BREVO_API_KEY` skips email but still writes the in-app
notification; a missing log table degrades silently; templates escape `<script>` in a recipient name;
kobo formatting is correct for 2000000 → "₦20,000.00"; the dispatch template includes the waybill.

## Report back
Files created and the exact diff summary for each call site, `npm test` and `npx tsc --noEmit`
results, the migration to run, the in-app notification table/columns you targeted, and whether
`BREVO_API_KEY` is required for the emails to actually leave.
