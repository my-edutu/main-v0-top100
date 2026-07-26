# Member Dashboard — Awards, Posts, Uploads and Community

**Date:** 2026-07-26
**Status:** Approved design, ready for implementation planning

## Context

The member platform already exists and works:

- **Auth** — `/login` (member), `/admin/login` (admin), `/signup` = directory-claim wizard gated by
  admin-issued access codes (`lib/access-codes.ts`, `access_codes` table, `AFL-XXXXX-XXXXX` format).
- **Dashboard** — `/dashboard`, mobile sidebar + sheet nav, warm light theme, welcome celebration on
  first login.
- **Sections** — Home, BIO/profile, Directory, Messages (in-app DM), Opportunities, Get Featured,
  Events, Partnerships, Magazine, Notifications, Settings.
- **APIs** — `/api/member/me`, `/api/member/features`, `/api/member/notifications`,
  `/api/member/conversations`; all enforce auth and membership server-side.

This spec covers the five capabilities that were described but do not exist.

## Goals

1. Every awardee can claim their physical Africa Future Leaders award, pay ₦20,000 plus shipping in
   one transaction, and track delivery — dispatched through GIG Logistics.
2. Awardees can upload a profile photo and post images.
3. Awardees can write a post from the dashboard that reaches `/blog` after admin approval.
4. Workshops, trainings and member-only listings are reachable from the Opportunities feed.
5. A direct message triggers an email notification to the recipient.

## Non-goals

- Rebuilding auth, the directory, or any existing dashboard section.
- Public-facing purchase of awards. The award flow is members-only.
- Multiple awards per member. One award, one order.

---

## 1. Awards, payment and dispatch

The award is **compulsory for every awardee**, priced at **₦20,000**, and the member pays the award
price plus shipping in a single Paystack transaction. Shipping is quoted by GIG Logistics from the
member's delivery address.

### 1.1 Data model

New table `public.award_orders`:

| Group | Columns |
| --- | --- |
| Identity | `id` uuid pk, `profile_id` uuid not null → `profiles(id)`, `awardee_id` text, `cohort_year` integer |
| State | `status` text not null default `'draft'` |
| Recipient | `recipient_name`, `phone`, `email`, `address_line1`, `address_line2`, `city`, `state`, `country`, `postal_code` |
| Money | `award_amount_kobo` integer not null, `shipping_amount_kobo` integer, `total_amount_kobo` integer, `currency` text not null default `'NGN'` |
| Courier | `gig_quote` jsonb, `gig_quote_expires_at` timestamptz, `gig_waybill` text, `gig_tracking_url` text, `gig_last_status` text, `gig_response` jsonb |
| Payment | `paystack_reference` text unique, `paystack_status` text, `paid_at` timestamptz |
| Audit | `created_at`, `updated_at`, `admin_note` text |

**One award per member.** Unique partial index on `profile_id` where `status <> 'cancelled'`.

**All money is stored in kobo as integers.** ₦20,000 = `2000000`. No floating-point arithmetic
touches any payment value at any point in this system.

RLS: members select their own row only; all writes go through the service-role client in API routes.

### 1.2 State machine

```
draft ──▶ quoted ──▶ awaiting_payment ──▶ paid ──▶ dispatched ──▶ in_transit ──▶ delivered
  │         │                                        
  └──▶ quote_failed                        (admin) ──▶ cancelled
```

| Status | Meaning | Set by |
| --- | --- | --- |
| `draft` | Row created, delivery details incomplete | Member |
| `quoted` | GIG returned a shipping price; `gig_quote_expires_at` set | Server, after GIG quote |
| `quote_failed` | GIG cannot serve this destination | Server |
| `awaiting_payment` | Paystack transaction initialised, reference stored | Server |
| `paid` | Payment verified by webhook | Paystack webhook only |
| `dispatched` | GIG shipment booked, waybill stored | Server, after `paid` |
| `in_transit` / `delivered` | From GIG tracking | Tracking refresh |
| `cancelled` | Admin action | Admin |

**A shipment is never booked before `status = paid`.**

### 1.3 Member flow

1. **Prompt.** While the member has no order at `paid` or later, a persistent banner appears on the
   dashboard Home section and a badge on the Awards nav item. It does **not** block access to the
   rest of the dashboard.
2. **Delivery details.** Name, phone and email prefill from the member's profile. Address, city,
   state, country and postal code are collected. All fields validated with `zod` server-side.
3. **Quote.** The server calls GIG, stores the quote, and renders the itemised total:

   ```
   Africa Future Leaders Award      ₦20,000
   Delivery — GIG Logistics         ₦ 3,500
   ─────────────────────────────────────────
   Total                            ₦23,500
   ```

4. **Pay.** Paystack checkout is initialised from the **stored server-side quote**. The browser never
   supplies an amount.
5. **Confirm.** The Paystack webhook verifies the signature and the paid amount, then marks `paid`.
6. **Dispatch.** Only after `paid`, the server books the GIG shipment and stores the waybill and
   tracking URL.
7. **Track.** The Awards section shows current delivery status and the waybill number.

### 1.4 API routes

| Route | Method | Purpose |
| --- | --- | --- |
| `/api/member/award` | GET | Current member's order and status |
| `/api/member/award/quote` | POST | Validate delivery details, call GIG, store quote, → `quoted` |
| `/api/member/award/checkout` | POST | Initialise Paystack from stored quote, → `awaiting_payment` |
| `/api/webhooks/paystack` | POST | Verify signature, mark `paid`, trigger dispatch |
| `/api/member/award/track` | GET | Refresh tracking from GIG |
| `/api/admin/awards` | GET, PATCH | Admin list, status override, cancel, admin notes |

### 1.5 Courier adapter

GIG is reached through an adapter so the concrete HTTP calls are isolated and replaceable:

```ts
// lib/courier/types.ts
export interface CourierAdapter {
  quote(input: QuoteInput): Promise<QuoteResult>   // → shipping cost in kobo
  book(input: BookInput): Promise<BookResult>      // → waybill + tracking URL
  track(waybill: string): Promise<TrackResult>     // → status + history
}
```

`lib/courier/gig.ts` implements it. GIG's auth token is cached in memory with its expiry so every
quote does not re-login.

**Pending input from the product owner:** the GIG API base URL, auth method, and the exact
price / capture-shipment / track endpoint contracts. The adapter interface above is the boundary —
when the docs arrive, only `lib/courier/gig.ts` and the env var names change. Everything else in this
spec is independent of GIG's wire format.

### 1.6 Payment integration

Paystack, server-side initialise + webhook confirm.

**Security requirements — these are not optional:**

- The charged amount is computed on the server from `award_amount_kobo + shipping_amount_kobo`. A
  client-supplied amount is never trusted.
- Quotes expire after **24 hours** (`gig_quote_expires_at`). Checkout against an expired quote
  re-quotes instead of charging the stale price.
- The webhook verifies the `x-paystack-signature` header as HMAC-SHA512 of the **raw request body**
  using the Paystack secret key. The route reads `await request.text()` — not the parsed JSON — so
  the signature is computed over the exact received bytes.
- The webhook re-checks that the amount Paystack reports matches `total_amount_kobo` before marking
  the order paid.
- The webhook is idempotent. Paystack retries; booking a shipment twice must be impossible. Dispatch
  is guarded on `gig_waybill IS NULL` and the status transition is conditional.
- `paystack_reference` is unique.
- The quote endpoint is rate-limited using the existing `lib/rate-limit.ts`.

### 1.7 International delivery

Awardees span 31 countries. If GIG cannot quote a destination, the order moves to `quote_failed` and
the member sees "our team will contact you about delivery for your country" rather than a broken
checkout. Admin sees these in `/admin/awards` and can set a manual shipping amount, which returns the
order to `quoted` so the member can pay.

### 1.8 UI

- New `'awards'` entry in the dashboard's `DashboardSection` type, `dashboardNav`, and
  `dashboardCardStyles`.
- The Awards section is a three-step flow (details → itemised total → pay) plus a tracking view once
  paid, in the existing warm light-theme card language.
- `app/dashboard/page.tsx` is already 1,952 lines. The Awards feature goes in its own
  `app/dashboard/awards-section.tsx`, following how `messages-section.tsx` is already split out.
  No new section code is added to `page.tsx` beyond the nav entry and the render line.

---

## 2. Member uploads

`/api/uploads` is admin-gated via `requireAdmin`, so members cannot use it.

New `/api/member/uploads`:

- Member session required (not admin).
- MIME allowlist: `image/jpeg`, `image/png`, `image/webp`.
- Size cap: 5 MB.
- Files are namespaced per member: `members/<profile_id>/<timestamp>-<name>`, so one member can never
  overwrite another's upload.
- Returns the public URL.

`components/AvatarUpload.tsx` already exists but is unused. It gets wired into the dashboard Profile
section, and the same route serves post cover images.

## 3. Member posts

The `posts` table already has `author`, `author_id`, `status` and `visibility`.

- Migration adds `'pending'` to the `posts_status_check` constraint and a
  `submitted_by_profile_id` uuid column.
- Dashboard composer reuses the TipTap editor already in the repo (`components/editor`,
  `@tiptap/*` dependencies).
- `POST /api/member/posts` creates the post with `status = 'pending'`, byline set from the member's
  profile. Members can list and edit their own pending posts; once published, edits go back to
  pending.
- `/admin/blog` gains a "Pending from members" queue. Approving sets `status = 'published'`, which
  the existing trigger stamps with `published_at`, and it appears on `/blog`.
- Public blog queries already filter `status = 'published'`, so pending posts are never publicly
  visible.

## 4. Opportunities categories

`/api/opportunities` currently proxies an external feed with a hardcoded fallback list. It is not
DB-backed, so AFL-curated and member-only listings need storage.

- New `public.member_opportunities` table: `title`, `type`, `location`, `deadline`, `description`,
  `url`, `member_only` boolean, `published` boolean, timestamps.
- `/api/opportunities` merges the external feed with published rows from this table.
- `member_only` rows are returned **only** to authenticated members. The route checks the session
  before including them; public callers never receive them.
- The dashboard Opportunities section gains filter chips: All / Workshop / Training / Fellowship /
  Grant / Scholarship.
- Admin CRUD at `/admin/opportunities`.

## 5. Direct message email notifications

- `lib/brevo.ts` currently only has newsletter subscribe. A `sendTransactionalEmail` helper is added
  alongside it.
- When a direct message is created, if the recipient's existing `messageAlerts` preference is on,
  they receive an email: "X sent you a message", linking to the dashboard.
- **Throttled per conversation** — at most one notification per recipient per conversation per hour,
  so an active back-and-forth does not flood an inbox.
- The sender's email address is never included in the notification. Contact stays in-app.
- Email failures are logged and never block message delivery.

---

## 6. Database migrations

One consolidated SQL file to run in the Supabase SQL editor, covering:

1. `award_orders` + indexes + RLS policies
2. `member_opportunities` + RLS policies
3. `posts` status constraint update + `submitted_by_profile_id`

**The live database is still missing `supabase/SETUP-MEMBER-HUB.sql`.** That must be run first, or
these migrations will fail on missing columns.

## 7. Environment variables

New variables, all server-side except where noted:

| Variable | Purpose |
| --- | --- |
| `PAYSTACK_SECRET_KEY` | Server-side charge init + webhook signature verification |
| `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` | Client checkout |
| `AWARD_PRICE_KOBO` | Award price, default `2000000` (₦20,000) |
| `GIG_API_BASE_URL` | GIG endpoint root |
| `GIG_API_USERNAME` / `GIG_API_PASSWORD` | GIG auth — exact names confirmed against the docs |
| `GIG_SENDER_*` | Origin address / station for quotes and bookings |
| `SUPABASE_UPLOADS_BUCKET` | Already used by `/api/uploads`; reused for member uploads |

## 8. Verification

The repo has no test runner installed. Rather than pretend otherwise:

- **Unit tests (add `vitest`)** for the pure, high-risk logic: kobo money arithmetic, the order state
  machine's legal transitions, Paystack signature verification, and quote-expiry checks. These are
  the parts where a bug costs real money, and they are all pure functions.
- **Scripted verification** for integration paths, following the existing `scripts/test-*.ts`
  pattern: quote → checkout → simulated webhook → dispatch, run against Paystack test keys.
- **Manual verification** for the UI flows: claim an award end to end on mobile and desktop, submit a
  post and approve it, upload an avatar, send a DM and confirm the email arrives.

## 9. Assumptions

These were decided during design and are stated here explicitly:

1. An unclaimed award prompts persistently but does **not** lock the member out of the dashboard.
2. One award per member, enforced at the database level.
3. Award price is ₦20,000, configurable via `AWARD_PRICE_KOBO` without a code change.
4. Shipping is always quoted live from GIG; there is no hardcoded shipping table.
5. Member posts that are edited after publication return to `pending` review.
6. Member-to-member contact stays in-app; email is notification only, and no member's email address
   is ever disclosed to another member.
