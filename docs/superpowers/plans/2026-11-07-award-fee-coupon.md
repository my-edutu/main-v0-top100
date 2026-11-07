# Award Fee Coupon Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan. Steps use checkbox syntax for tracking.

**Goal** — Let an eligible awardee enter a coupon and reduce the physical award fee from ₦25,000 to ₦20,000 before payment.

**Architecture** — Validate the code on the server, snapshot the discount when reserving the payment attempt, and use that attempt to create and verify the Bachs checkout.

**Stack** — Next.js App Router, self-hosted Supabase, Bachs, and Vitest.

---

## Proposed launch rules

- Use one shared code with a per-profile allowlist for awardees with an unpaid physical award. The server requires both an approved profile and the correct code. Normalize case and surrounding whitespace. Allow one ₦5,000 discount per order, with no stacking. Keep the code and its start, expiry, and enabled state in a service-role-only campaign record. Set the actual code and dates when launching.
- Offer the discount on a dedicated NGN checkout. The ordinary award checkout continues to offer adaptive currency pricing. A fixed NGN base price gives a precise ₦5,000 reduction without setting a foreign-currency discount. [Bachs raw checkout pricing](https://docs.bachs.io/guides/checkout/checkout-sessions#charge-a-raw-amount)
- The awardee sees the original fee, coupon deduction, and discounted award fee before proceeding. Bachs displays any applicable payment charges. Delivery is priced in its existing separate checkout.
- Existing live payment links keep their reserved price. If one exists, show its amount and offer to resume it. Once the existing payment flow determines a new attempt is safe, the awardee can apply the code to that attempt. Paid and refunded orders follow existing payment rules.
- A coupon-paid award is a valid Top100 payment and is excluded from `sales.top100afl.com`. It earns zero sales credit or commission, even if a rep was assigned and had qualifying outreach. Keep the payment and discount in Top100's award records for receipts, delivery, refunds, and finance reconciliation.

### Task 1 — Store and reserve the discount

**Files** — Add `supabase/migrations/20261107120000_award_fee_coupon.sql`. Extend `tests/awards/bachs-payment-migration.test.ts` and the database-backed award reconciliation tests.

- [x] Add the service-role-only campaign record with a normalized code digest, active window, enabled state, and a profile allowlist. The award coupon contract applies the fixed NGN discount of 500,000 kobo. Add nullable coupon ID, base amount, and discount amount to `award_payment_attempts`. Constrain a coupon snapshot to `award_fee`, NGN, a 2,500,000 kobo base, a 500,000 kobo discount, and a 2,000,000 kobo requested amount. Historical rows keep their existing amounts.
- [x] Add `reserve_bachs_award_coupon_checkout` as a wrapper around the existing reservation, with its original RPC signature unchanged. Reuse the existing eligibility checks, order lock, and attempt reuse rules. Validate the campaign under the reservation transaction and derive the requested amount in SQL. Return the persisted attempt ID, currency, and amount for either a new or reused attempt. Prevent changes to its price snapshot after creation.
- [x] Verify that direct client roles cannot read codes or reserve a discounted payment, invalid or inactive codes create no attempt, and concurrent requests for one order reuse a single payable attempt.

### Task 2 — Apply the code in the award payment screen

**Files** — Add `app/api/member/award/payment/coupon/route.ts`. Update `app/api/member/award/payment/checkout/route.ts`, `lib/awards/payment.ts`, `lib/awards/payment-server.ts`, `app/dashboard/award-payment-card.tsx`, and `lib/payments/bachs/checkout.ts`.

- [x] Add an authenticated, rate-limited preview endpoint accepting `{ code: string }` and returning `{ currency: 'NGN', baseAmountMinor: 2500000, discountAmountMinor: 500000, amountMinor: 2000000 }` after checking eligibility and campaign state. Accept an optional `couponCode` in the existing checkout request. Revalidate it during reservation and reject it if eligibility or campaign state changed before submission.
- [x] Add **Have a coupon?**, **Apply**, and **Remove** controls to the payment card. Show the breakdown beside **Proceed**. Editing or removing the code clears the preview. Explain expired or invalid codes inline and let the awardee remove the code to continue at the standard price. When an earlier attempt blocks a new one, show its stored amount and state.
- [x] Build the coupon checkout with raw Bachs pricing of `{ currency: 'NGN', amount: '20000.00' }` using the stored attempt. Use the same reserved amount in checkout emails and payment views. Preserve the saved provider request body and idempotency key on retry and recovery, even if the campaign has since expired or been disabled.
- [x] Extend `tests/awards/payment-api.test.ts`, `tests/awards/payment-server.test.ts`, and `tests/payments/bachs-checkout.test.ts`. Cover checkout after preview expiry, rejection of client-supplied amounts, the exact NGN request, and recovery of a discounted attempt with the original request. Verify the standard adaptive request still works.

### Task 3 — Confirm payment and unlock delivery

**Files** — Update `lib/awards/bachs-webhook.ts`, `lib/awards/payment-reconciliation.ts`, the migration in Task 1, and the admin payment view in `lib/awards/admin-payment-view.ts`.

- [x] Update the webhook, `reconcile_bachs_award_checkout`, and `award_delivery_order_is_paid` to recognize the valid coupon snapshot alongside the existing full-price and legacy evidence paths. Verify the Bachs identity, currency, and expected principal against the reserved attempt. Use the existing processing-fee checks and notification deduplication. Campaign expiry affects new reservations only.
- [x] Show original fee, discount, and paid fee on the admin payment record. Use the verified fee in member confirmations and receipts.
- [x] Extend the award webhook, reconciliation, and delivery tests. Assert that a verified ₦20,000 coupon payment unlocks delivery once, that ₦20,000 against a full-price attempt is underpaid, and that wrong currency, mismatched references, duplicate webhooks, and late success follow the existing verification and duplicate-payment rules.

### Task 4 — Exclude coupon payments from the sales portal

**Files** — Add a follow-up migration under `team-platform/supabase/migrations/` after the coupon columns exist. Review the report and reconciliation readers in `team-platform/lib/data.ts`, the admin sales-performance readers in `lib/team-operations/`, and add regressions in `team-platform/tests/integration/worklist.test.mjs`.

- [x] Base the exclusion on the immutable coupon snapshot on the order's canonical `award_paid_attempt_id`. A code preview or abandoned coupon attempt has no effect on a later full-price payment.
- [x] Exclude coupon payments from `team_payment_attributions` before selecting contact or legacy-grace attribution. In `team_apply_verified_payment`, handle the exclusion before writing the paid sales projection or inserting a commission. Route award-order sync, later identity linking, and manual or scheduled `team_reconcile_payments` through the same exclusion. Repeated callbacks and refunds must not create sales entries, earnings, or rep payment notifications.
- [x] Close any active sales assignment idempotently and remove the awardee from active payment follow-up using the canonical paid order. Preserve contact history and prevent the paid award from being assigned again. The worklist action must not copy the payment amount or reference into the sales portal.
- [x] Exclude coupon payments from the sales portal's `team_payment_reconciliation` view and from paid counts, conversion totals, revenue, reports, and exports. Check the country report in `getReportData`, which currently counts directory rows marked paid independently of commission.
- [x] Verify that a coupon payment on an assigned award with qualifying contact marks the award paid and unlocks delivery while producing zero sales payment rows, zero paid count, zero sales revenue, and zero commission. Repeat via reconciliation, delayed identity linking, and duplicate delivery of the payment event. Verify a standard payment after an abandoned coupon attempt follows ordinary attribution rules, and historical credits remain intact.

### Task 5 — Verify and release on Dokploy

Local verification covered the checkout adapter, authenticated preview, concurrent reservation, payment settlement, delivery eligibility, and sales reporting and commission exclusion. Both application typechecks passed. Bachs sandbox and Dokploy release are pending.

- [ ] Run `npm test -- tests/awards tests/payments`, both applications' typechecks, and the award and sales database-backed checks against a disposable database with both migrations applied. In Bachs sandbox, run a standard checkout and a coupon checkout through webhook confirmation, reconciliation, and delivery unlock. Confirm the member breakdown and hosted price agree before payment and that the coupon payment is absent from sales records and totals.
- [ ] Apply the coupon schema migration and then the sales exclusion migration to Top100's active self-hosted Supabase. Deploy on Dokploy with the campaign disabled. Enable it only after the award and sales checks pass. To halt new coupon checkouts, disable the campaign and keep the verification and sales exclusion deployed so issued checkouts can settle correctly.

## Campaign activation

Apply the award migration and then `team-platform/supabase/migrations/20261107120001_team_exclude_award_coupon_payments.sql` on the shared Top100 database. The checkout refuses to reserve a coupon until the sales exclusion migration is present.

1. Choose a code containing letters, digits, or hyphens. Use a randomly generated code and keep it private. Compute SHA-256 of its trimmed uppercase form and supply the lowercase hex digest as `code_digest`.
2. Insert an `award_coupons` row with the digest and a future `expires_at`. Leave `enabled` false. Set `starts_at` if the campaign should open later.
3. Insert one `award_coupon_eligibility` row for each approved `profiles.id`, tied to that campaign ID. Review those IDs before enabling the campaign. A checkout billing email does not grant eligibility.
4. Enable the campaign and share the code with the approved awardees. To withdraw access before checkout, remove the profile's grant or disable the campaign. Already issued checkouts keep the price they were created with.

Generate the digest on your computer. The prompt hides the code and the command prints its digest.

```sh
python3 -c 'from getpass import getpass; from hashlib import sha256; print(sha256(getpass("Coupon code: ").strip().upper().encode()).hexdigest())'
```

Run these statements in the production Supabase SQL Editor as an administrator. Replace the sample emails, IDs, digest, and date with the campaign values. The example expiry uses Lagos time (WAT, UTC+1).

```sql
insert into public.award_coupons (code_digest, expires_at)
values ('REPLACE_WITH_SHA256_DIGEST', '2026-11-30 23:59:59+01')
returning id, enabled, expires_at;

select id, email, full_name
from public.profiles
where lower(email) in ('approved-awardee@example.com', 'another-awardee@example.com');

insert into public.award_coupon_eligibility (coupon_id, profile_id)
values
  ('CAMPAIGN_UUID', 'FIRST_PROFILE_UUID'),
  ('CAMPAIGN_UUID', 'SECOND_PROFILE_UUID')
on conflict do nothing;

select p.id, p.email, p.full_name
from public.award_coupon_eligibility e
join public.profiles p on p.id = e.profile_id
where e.coupon_id = 'CAMPAIGN_UUID';

update public.award_coupons
set enabled = true
where id = 'CAMPAIGN_UUID' and expires_at > now()
returning id, enabled, expires_at;
```

To change the expiry, update `expires_at` on that campaign. To remove someone's access, delete their specific `(coupon_id, profile_id)` row. Set `enabled = false` on the campaign to stop new coupon checkouts.
