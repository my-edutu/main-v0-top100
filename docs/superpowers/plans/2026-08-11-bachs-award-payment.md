# Bachs Award Payment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace new Paystack award checkout with a secure Bachs-hosted award-fee payment flow charging NGN 20,000 or USD 20, while keeping delivery and GIG Logistics entirely separate.

**Architecture:** Keep `award_orders` as the member-owned aggregate, add an additive payment summary plus one immutable row per checkout attempt, and use a separate webhook event ledger for at-least-once delivery. Bachs-specific HTTP/signature code lives in focused server-only modules; member APIs expose provider-neutral payment views; the dashboard renders unpaid, confirming, and confirmed panels without invoking delivery code.

**Tech Stack:** Next.js 15 App Router, React 18, TypeScript 5, Supabase/Postgres, Zod, Vitest, Bachs REST Checkout Sessions and signed webhooks.

## Global Constraints

- New member award payments use Bachs only; no new Paystack Checkout Session may be created.
- NGN price is exactly `2000000` minor units (`20000.00`); USD price is exactly `2000` cents (`20.00`).
- The browser may send only `NGN` or `USD`; it never sends or controls an amount.
- A redirect is never proof of payment; only a signature-, timestamp-, currency-, and amount-verified Bachs event confirms payment.
- A Bachs payment path must never call GIG Logistics, collect a delivery address, book a shipment, or display tracking.
- Existing Paystack/GIG columns and historical evidence remain intact; legacy Paystack verification is permitted only for existing references.
- Use raw request bytes for webhook signature verification and a 300-second default timestamp tolerance.
- Use exact fixed-decimal parsing; never compare payment amounts with JavaScript floating point arithmetic.
- Bachs secrets and provider configuration remain server-only and must never be logged or committed.
- Preserve unrelated dirty-worktree changes.
- Use test-driven development and commit only the files owned by each task.

## File and dependency map

```text
Wave 1 (parallel)
├── Task 1: SQL payment model + atomic claim RPC
└── Task 2: price/money/config/signature/event primitives

Wave 2 (after Task 2)
└── Task 3: Bachs Checkout Session HTTP adapter

Wave 3 (after Tasks 1 and 3)
└── Task 4: payment repository, member state API, checkout API

Wave 4 (parallel after Task 4)
├── Task 5: Bachs webhook processor + award-only notifications
├── Task 6: dashboard payment UI and callback handling
├── Task 7: local demo payment flow
└── Task 8: admin/legacy Paystack cutover surfaces

Wave 5
└── Task 9: integration verification, setup docs, full regression
```

---

### Task 1: Add the additive award-payment schema

**Files:**
- Create: `supabase/migrations/20260811_bachs_award_payments.sql`
- Create: `tests/awards/bachs-payment-migration.test.ts`
- Modify (generated): `supabase/SETUP-ALL.sql`

**Interfaces:**
- Produces: `award_orders.award_payment_status`, `award_orders.award_paid_at`, `award_orders.award_paid_attempt_id`, `award_orders.award_price_version`.
- Produces: `public.award_payment_attempts`, `public.payment_webhook_events`.
- Produces: `public.claim_bachs_award_payment_success(...) returns text` with result `succeeded` or `duplicate_succeeded`.
- Consumes: existing `public.award_orders(id, profile_id, status, paid_at, paystack_reference, paystack_status)`.

- [ ] **Step 1: Write the migration contract test**

Create a filesystem-level contract test that prevents accidental omission of the high-risk SQL:

```ts
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const sql = readFileSync('supabase/migrations/20260811_bachs_award_payments.sql', 'utf8')

describe('Bachs award payment migration', () => {
  it('keeps payment state separate from legacy delivery status', () => {
    expect(sql).toContain('award_payment_status')
    expect(sql).toContain('award_payment_attempts')
    expect(sql).toContain('payment_webhook_events')
    expect(sql).not.toMatch(/drop\s+column\s+paystack_reference/i)
    expect(sql).not.toMatch(/drop\s+column\s+gig_/i)
  })

  it('enforces one successful award-fee attempt and unique provider evidence', () => {
    expect(sql).toMatch(/provider_reference/i)
    expect(sql).toMatch(/provider_checkout_id/i)
    expect(sql).toMatch(/where[\s\S]+status\s*=\s*'succeeded'/i)
  })

  it('adds an atomic success-claim function', () => {
    expect(sql).toContain('claim_bachs_award_payment_success')
    expect(sql).toContain('duplicate_succeeded')
  })
})
```

- [ ] **Step 2: Run the test and verify it fails because the migration is missing**

Run: `npx vitest run tests/awards/bachs-payment-migration.test.ts`

Expected: FAIL with `ENOENT` for `20260811_bachs_award_payments.sql`.

- [ ] **Step 3: Write the additive migration**

The migration must:

1. Add the four `award_orders` summary columns with a safe default/backfill.
2. Create `award_payment_attempts` with the exact statuses from the approved specification.
3. Create `payment_webhook_events` with event ID as the primary key and admin-only reads.
4. Add service-role write policies and member self-read only where needed.
5. Backfill legacy paid orders without changing `status`, `paystack_reference`, or GIG columns.
6. Insert legacy Paystack attempt rows only when a reference exists, using
   `charge_scope = 'legacy_award_plus_delivery'`.
7. Add a `security definer` claim function with `set search_path = public` that locks the order,
   marks exactly one attempt `succeeded`, marks later successes `duplicate_succeeded`, and never
   writes any GIG column.
8. Revoke claim-function execution from `public`, `anon`, and `authenticated`; grant it only to
   `service_role`.

The core conditional must be equivalent to:

```sql
if current_order.award_payment_status = 'paid' then
  update public.award_payment_attempts
  set status = 'duplicate_succeeded', captured_amount_minor = p_captured_amount_minor,
      provider_status = p_provider_status, provider_charge_id = p_provider_charge_id,
      confirmed_at = p_confirmed_at
  where id = p_attempt_id;
  return 'duplicate_succeeded';
end if;

update public.award_payment_attempts
set status = 'succeeded', captured_amount_minor = p_captured_amount_minor,
    provider_status = p_provider_status, provider_charge_id = p_provider_charge_id,
    confirmed_at = p_confirmed_at
where id = p_attempt_id and status in ('open', 'processing', 'creating');

update public.award_orders
set award_payment_status = 'paid', award_paid_at = p_confirmed_at,
    award_paid_attempt_id = p_attempt_id
where id = current_attempt.order_id and award_payment_status <> 'paid';
```

Use a partial unique index for one `succeeded` `award_fee` row per order; `duplicate_succeeded` is not
covered by that index.

- [ ] **Step 4: Run the migration contract test**

Run: `npx vitest run tests/awards/bachs-payment-migration.test.ts`

Expected: PASS.

- [ ] **Step 5: Regenerate and check the consolidated setup SQL**

Run: `node scripts/build-setup-sql.mjs`

Then run: `git diff --check -- supabase/migrations/20260811_bachs_award_payments.sql supabase/SETUP-ALL.sql`

Expected: no whitespace errors; generated setup includes the new migration exactly once.

- [ ] **Step 6: Commit the schema task**

```bash
git add supabase/migrations/20260811_bachs_award_payments.sql supabase/SETUP-ALL.sql tests/awards/bachs-payment-migration.test.ts
git commit -m "feat(payments): add Bachs award payment records"
```

---

### Task 2: Add currency-aware prices, configuration, signatures, and event validation

**Files:**
- Create: `lib/payments/bachs/types.ts`
- Create: `lib/payments/bachs/money.ts`
- Create: `lib/payments/bachs/config.ts`
- Create: `lib/payments/bachs/signature.ts`
- Create: `lib/payments/bachs/events.ts`
- Create: `tests/payments/bachs-money.test.ts`
- Create: `tests/payments/bachs-config.test.ts`
- Create: `tests/payments/bachs-signature.test.ts`
- Create: `tests/payments/bachs-events.test.ts`
- Modify: `lib/awards/money.ts`
- Modify: `tests/awards/money.test.ts`

**Interfaces:**
- Produces: `type AwardPaymentCurrency = 'NGN' | 'USD'`.
- Produces: `awardFee(currency): AwardFee`, `parseBachsAmount(value, currency): number`, `formatAwardFee(amountMinor, currency): string`.
- Produces: `bachsConfig(env?): BachsConfig`.
- Produces: `verifyBachsSignature(input): boolean`.
- Produces: `parseBachsEvent(input): BachsWebhookEvent` and `isBachsTerminalSuccess(status): boolean`.

- [ ] **Step 1: Write failing money and price tests**

Cover exact defaults, overrides, formatting, and malformed decimals:

```ts
expect(awardFee('NGN')).toEqual({
  currency: 'NGN', amountMinor: 2_000_000, bachsAmount: '20000.00', display: '₦20,000',
  priceVersion: 'afl-award-2026-v1',
})
expect(awardFee('USD').amountMinor).toBe(2_000)
expect(parseBachsAmount('20.00', 'USD')).toBe(2_000)
expect(parseBachsAmount('20000.00', 'NGN')).toBe(2_000_000)
expect(() => parseBachsAmount('20.001', 'USD')).toThrow()
expect(() => parseBachsAmount('NaN', 'USD')).toThrow()
```

- [ ] **Step 2: Write failing config, signature, and event tests**

Include:

```ts
expect(() => bachsConfig({ BACHS_API_KEY: 'sk_live_x', BACHS_API_BASE_URL: 'https://sandbox-api.bachs.io' })).toThrow(/mismatch/i)
expect(verifyBachsSignature({ rawBody, timestampHeader: String(now), signatureHeader: sign(rawBody, now), secret, nowSeconds: now })).toBe(true)
expect(verifyBachsSignature({ rawBody: tampered, timestampHeader: String(now), signatureHeader: sign(rawBody, now), secret, nowSeconds: now })).toBe(false)
expect(verifyBachsSignature({ rawBody, timestampHeader: String(now - 301), signatureHeader: sign(rawBody, now - 301), secret, nowSeconds: now })).toBe(false)
expect(parseBachsEvent(validCollectionSucceeded).type).toBe('collection.succeeded')
expect(() => parseBachsEvent({ type: 'collection.succeeded', data: {} })).toThrow()
```

- [ ] **Step 3: Run the focused tests and verify missing-module failures**

Run: `npx vitest run tests/payments/bachs-money.test.ts tests/payments/bachs-config.test.ts tests/payments/bachs-signature.test.ts tests/payments/bachs-events.test.ts`

Expected: FAIL because `lib/payments/bachs/*` does not exist.

- [ ] **Step 4: Implement the focused modules**

Use strict regex-based two-decimal parsing:

```ts
const DECIMAL_2 = /^(0|[1-9]\d*)\.(\d{2})$/

export function parseBachsAmount(value: string, _currency: AwardPaymentCurrency): number {
  const match = DECIMAL_2.exec(value)
  if (!match) throw new Error('Bachs amount must have exactly two decimal places.')
  const minor = Number(match[1]) * 100 + Number(match[2])
  if (!Number.isSafeInteger(minor)) throw new Error('Bachs amount is outside the supported range.')
  return minor
}
```

Signature verification must reconstruct `${timestamp}.${rawBody}`, reject non-lowercase 64-character
hex signatures, use `crypto.timingSafeEqual`, and reject a timestamp outside the configured tolerance.

`bachsConfig` must allow only the two exact API roots and verify `sk_sandbox_`/`sk_live_` prefixes.
It must parse `BACHS_CHECKOUT_HOSTS` into an exact hostname set and require a valid absolute HTTPS
`NEXT_PUBLIC_SITE_URL` outside local development.

- [ ] **Step 5: Run focused tests**

Run: `npx vitest run tests/payments/bachs-money.test.ts tests/payments/bachs-config.test.ts tests/payments/bachs-signature.test.ts tests/payments/bachs-events.test.ts tests/awards/money.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit the primitives task**

```bash
git add lib/payments/bachs lib/awards/money.ts tests/payments/bachs-*.test.ts tests/awards/money.test.ts
git commit -m "feat(payments): add Bachs payment primitives"
```

---

### Task 3: Add the Bachs Checkout Session adapter

**Files:**
- Create: `lib/payments/bachs/checkout.ts`
- Create: `tests/payments/bachs-checkout.test.ts`

**Interfaces:**
- Consumes: `BachsConfig`, `AwardPaymentCurrency`, `awardFee` from Task 2.
- Produces: `buildCheckoutRequest(input): BachsCheckoutRequest`.
- Produces: `createCheckoutSession(input, options?): Promise<BachsCheckoutSession>`.

- [ ] **Step 1: Write failing request-contract tests**

Assert the exact server-owned payload for NGN and USD:

```ts
expect(buildCheckoutRequest(ngnInput)).toMatchObject({
  pricing: { currency: 'USD', amount: '20.00', currency_options: { NGN: '20000.00' } },
  billing_currency: 'NGN',
  reference: ngnInput.reference,
  metadata: {
    order_id: ngnInput.orderId,
    payment_attempt_id: ngnInput.attemptId,
    purpose: 'afl_award_fee_v1',
  },
  success_url: 'https://top100afl.com/dashboard?section=awards&payment=done',
  cancel_url: 'https://top100afl.com/dashboard?section=awards&payment=cancelled',
  expires_in_minutes: 60,
})
```

Also assert that no address, shipping amount, GIG value, or client amount appears in the payload.

- [ ] **Step 2: Write failing transport and response-validation tests**

Use an injected fake `fetcher` and fake clock. Cover HTTP 201, `Idempotency-Key`, 429/5xx retry with
the same body/key, no retry for 400/401/403, timeout, missing checkout ID, non-OPEN status, expired
session, HTTP checkout URL, and a hostname outside the configured allowlist.

- [ ] **Step 3: Run the focused test and verify it fails**

Run: `npx vitest run tests/payments/bachs-checkout.test.ts`

Expected: FAIL because `checkout.ts` does not exist.

- [ ] **Step 4: Implement request building and bounded retry**

The public contract is:

```ts
export type CreateCheckoutInput = {
  orderId: string
  attemptId: string
  idempotencyKey: string
  reference: string
  currency: AwardPaymentCurrency
  customer: { email: string; name?: string; phoneNumber?: string }
}

export type BachsCheckoutSession = {
  checkoutId: string
  checkoutUrl: string
  status: 'OPEN'
  createdAt: string
  expiresAt: string
  safeProviderResponse: Record<string, unknown>
}
```

Create an `AbortController` per network attempt, retry only network errors/429/5xx, honor a valid
`Retry-After`, cap attempts at three, and reuse the byte-identical JSON body plus idempotency key.

- [ ] **Step 5: Run the checkout adapter tests**

Run: `npx vitest run tests/payments/bachs-checkout.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit the adapter task**

```bash
git add lib/payments/bachs/checkout.ts tests/payments/bachs-checkout.test.ts
git commit -m "feat(payments): add Bachs checkout adapter"
```

---

### Task 4: Add the payment repository and authenticated member APIs

**Files:**
- Create: `lib/awards/payment-types.ts`
- Create: `lib/awards/payment-server.ts`
- Create: `app/api/member/award/payment/route.ts`
- Create: `app/api/member/award/payment/checkout/route.ts`
- Create: `tests/awards/payment-server.test.ts`
- Modify: `lib/awards.ts`
- Modify: `lib/awards/server.ts`
- Modify: `lib/awards/status.ts`
- Modify: `tests/awards/status.test.ts`

**Interfaces:**
- Consumes: Task 1 schema and Task 2/3 Bachs adapter.
- Produces: `AwardPaymentView`, `AwardPaymentStatus`, `getAwardPaymentView(userId)`, `startAwardPaymentCheckout(user)`.
- Produces: `paymentNeedsAction(status): boolean`.
- Produces client functions: `fetchAwardPayment()` and `startAwardPaymentCheckout(currency)`.

- [ ] **Step 1: Write failing payment-state and server-service tests**

Using injected repository/checkout dependencies, cover:

```ts
expect(paymentNeedsAction('unpaid')).toBe(true)
expect(paymentNeedsAction('pending')).toBe(true)
expect(paymentNeedsAction('paid')).toBe(false)

await expect(startCheckout({ currency: 'EUR' as never }, deps)).rejects.toThrow(/currency/i)
await expect(startCheckout({ currency: 'NGN', clientAmount: 1 } as never, deps)).rejects.toThrow()
expect(deps.checkout.create).toHaveBeenCalledWith(expect.objectContaining({ currency: 'NGN' }))
expect(deps.courier).toBeUndefined()
```

Test that an existing paid order is rejected, a still-live open attempt is returned/reused rather
than duplicated, an expired attempt permits a new attempt, and a failed provider call records
`exception` without returning a redirect URL.

- [ ] **Step 2: Run the test and verify it fails**

Run: `npx vitest run tests/awards/payment-server.test.ts tests/awards/status.test.ts`

Expected: FAIL because the payment service/types do not exist.

- [ ] **Step 3: Implement provider-neutral payment types and repository operations**

Define the approved public view exactly:

```ts
export type AwardPaymentView = {
  status: 'unpaid' | 'pending' | 'paid' | 'failed' | 'refunded'
  priceOptions: Array<{ currency: AwardPaymentCurrency; amountMinor: number; display: string }>
  currentAttempt: null | {
    id: string
    currency: AwardPaymentCurrency
    amountMinor: number
    status: string
    expiresAt: string | null
  }
  confirmedPayment: null | {
    currency: AwardPaymentCurrency
    amountMinor: number
    paidAt: string
  }
  needsPayment: boolean
}
```

`ensureAwardOrder` inserts only member/order/payment-summary data. It must not call the quote route or
populate an address/shipping/GIG field. Create a payment attempt before the Bachs call using a random
UUID-derived reference below 128 characters and a stable idempotency key.

- [ ] **Step 4: Implement member GET and checkout POST routes**

Both routes require `getCurrentUser()`. The POST schema is:

```ts
const checkoutSchema = z.object({ currency: z.enum(['NGN', 'USD']) }).strict()
```

Apply the existing per-member checkout rate limiter. Return only:

```ts
{ checkoutUrl: string; attemptId: string }
```

Map provider/config errors to a generic 502 response while logging only safe context.

- [ ] **Step 5: Replace client wrappers with provider-neutral functions**

In `lib/awards.ts`, add:

```ts
export async function fetchAwardPayment(): Promise<AwardPaymentView>
export async function startAwardPaymentCheckout(
  currency: AwardPaymentCurrency,
): Promise<{ checkoutUrl: string; attemptId: string }>
```

Do not import server-only Bachs modules into this client-safe file.

- [ ] **Step 6: Run focused tests and typecheck**

Run: `npx vitest run tests/awards/payment-server.test.ts tests/awards/status.test.ts`

Run: `npx tsc --noEmit`

Expected: PASS.

- [ ] **Step 7: Commit the member API task**

```bash
git add lib/awards/payment-types.ts lib/awards/payment-server.ts lib/awards.ts lib/awards/server.ts lib/awards/status.ts app/api/member/award/payment tests/awards/payment-server.test.ts tests/awards/status.test.ts
git commit -m "feat(awards): add Bachs member checkout API"
```

---

### Task 5: Process Bachs webhooks without courier side effects

**Files:**
- Create: `lib/awards/bachs-webhook.ts`
- Create: `app/api/webhooks/bachs/route.ts`
- Create: `tests/awards/bachs-webhook.test.ts`
- Modify: `lib/awards/notify.ts`
- Modify: `lib/email/award-templates.ts`
- Modify: `tests/awards/notify.test.ts`

**Interfaces:**
- Consumes: Task 1 claim RPC and event table; Task 2 signature/event/money primitives.
- Produces: `handleBachsEvent(rawBody, headers, deps): Promise<WebhookResult>`.
- Produces: public route `POST /api/webhooks/bachs`.

- [ ] **Step 1: Write failing webhook behavior tests**

Cover a table of outcomes:

```ts
it.each([
  ['NGN', '20000.00', 2_000_000],
  ['USD', '20.00', 2_000],
])('confirms exact %s payment once', async (currency, amount, minor) => { /* signed fixture */ })
```

Also cover invalid signature, stale timestamp, wrong organization, wrong purpose, wrong order ID,
wrong attempt ID, wrong checkout ID/reference, amount mismatch, currency mismatch, underpayment,
failed/expired events, duplicate event replay, duplicate successful attempts, null/unmatched charge,
and a transient DB failure.

Every success test must inject a `courier` spy and assert it was never called, or omit courier from
the dependency type entirely.

- [ ] **Step 2: Run the focused tests and verify failure**

Run: `npx vitest run tests/awards/bachs-webhook.test.ts tests/awards/notify.test.ts`

Expected: FAIL because the Bachs webhook service does not exist.

- [ ] **Step 3: Implement the webhook service**

Processing order:

```ts
verify signature/timestamp
parse signed JSON
validate organization
insert-or-load event ledger row
if event already processed/ignored/exception: return 200 duplicate
match attempt by provider checkout/reference + metadata
validate purpose/order/attempt/status/gross amount/currency
call claim_bachs_award_payment_success RPC
mark event processed or exception
notify once only when RPC returns succeeded
```

If an existing event row is still `received`, resume processing; do not treat it as completed. Return
5xx for transient database failures before durable completion. Record and acknowledge valid unmatched
events as `exception` so they remain visible without retrying forever.

- [ ] **Step 4: Implement the thin route**

The route reads `await request.text()` before any JSON parsing, passes
`x-bachs-timestamp`/`x-bachs-signature`, and maps the service result to 2xx/4xx/5xx without exposing
internal error text.

- [ ] **Step 5: Rewrite payment-confirmed notification copy**

The email and in-app notification must say the award fee was confirmed and that delivery/payment is
separate. Remove `being prepared`, `packed`, and shipment language from the paid milestone only.

- [ ] **Step 6: Run focused tests**

Run: `npx vitest run tests/awards/bachs-webhook.test.ts tests/awards/notify.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit the webhook task**

```bash
git add lib/awards/bachs-webhook.ts app/api/webhooks/bachs/route.ts tests/awards/bachs-webhook.test.ts lib/awards/notify.ts lib/email/award-templates.ts tests/awards/notify.test.ts
git commit -m "feat(payments): confirm Bachs award payments"
```

---

### Task 6: Replace the dashboard Awards flow with payment-only panels

**Files:**
- Create: `app/dashboard/award-payment-card.tsx`
- Create: `app/dashboard/award-payment-confirmation.tsx`
- Create: `app/dashboard/award-payment-success.tsx`
- Create: `app/dashboard/award-payment-view.ts`
- Create: `tests/awards/payment-view.test.ts`
- Modify: `app/dashboard/awards-section.tsx`
- Modify: `app/dashboard/page.tsx`

**Interfaces:**
- Consumes: `AwardPaymentView`, `fetchAwardPayment`, `startAwardPaymentCheckout` from Task 4.
- Produces: `AwardsSection` with unpaid, confirming, cancelled, and paid states only.

- [ ] **Step 1: Write failing pure view-state tests**

Extract a pure selector:

```ts
export function awardPaymentScreen(
  view: AwardPaymentView | null,
  returnState: 'none' | 'done' | 'cancelled',
): 'loading' | 'pay' | 'confirming' | 'paid'
```

Test that `done + unpaid/pending` is `confirming`, confirmed paid is `paid`, cancelled unpaid is
`pay`, and no pending-confirmation state exposes an enabled pay action.

- [ ] **Step 2: Run the test and verify it fails**

Run: `npx vitest run tests/awards/payment-view.test.ts`

Expected: FAIL because the selector does not exist.

- [ ] **Step 3: Implement the three focused components**

`award-payment-card.tsx` owns the accessible NGN/USD radio selection and checkout button.
`award-payment-confirmation.tsx` owns polling/timeout copy and has no pay button.
`award-payment-success.tsx` shows exact confirmed amount/date plus:

> Your award fee is paid. Delivery through GIG Logistics and its delivery charge are handled
> separately; we will guide you through that next step.

Reuse the existing orange/cream dashboard language, focus states, touch targets, and loading spinner.
Do not add a new design system or dependency.

- [ ] **Step 4: Reduce `awards-section.tsx` to payment orchestration**

Remove active imports/calls for `submitDeliveryDetails`, `refreshAwardTracking`, GIG totals, address
form, and tracking. Poll every four seconds for at most fifteen attempts after `payment=done`; timed
out copy remains `Still confirming` and does not claim receipt.

- [ ] **Step 5: Make callback handling provider-neutral**

In `app/dashboard/page.tsx`, parse `payment=done|cancelled`, pass a typed return state to
`AwardsSection`, clear the query parameter after capture, and preserve the no-double-pay guard.

- [ ] **Step 6: Run focused tests and typecheck**

Run: `npx vitest run tests/awards/payment-view.test.ts`

Run: `npx tsc --noEmit`

Expected: PASS.

- [ ] **Step 7: Commit the dashboard task**

```bash
git add app/dashboard/award-payment-card.tsx app/dashboard/award-payment-confirmation.tsx app/dashboard/award-payment-success.tsx app/dashboard/award-payment-view.ts app/dashboard/awards-section.tsx app/dashboard/page.tsx tests/awards/payment-view.test.ts
git commit -m "feat(dashboard): add Bachs award payment flow"
```

---

### Task 7: Align the local demo with the Bachs payment contract

**Files:**
- Modify: `lib/dev-dashboard/store.ts`
- Modify: `lib/dev-dashboard/handler.ts`
- Modify: `tests/dev-dashboard/handler.test.ts`
- Modify: `tests/dev-dashboard/routes.test.ts`

**Interfaces:**
- Consumes: `AwardPaymentView` contract from Task 4.
- Produces: deterministic local unpaid -> open attempt -> paid behavior without Bachs network access.

- [ ] **Step 1: Write failing demo payment tests**

Test:

1. GET payment begins unpaid with NGN/USD options.
2. POST checkout accepts only NGN/USD and returns a local dashboard callback URL.
3. The simulated callback/next GET becomes paid exactly once.
4. The stored amount is `2000000` NGN or `2000` USD.
5. No shipping amount/address/GIG status appears.

- [ ] **Step 2: Run the demo tests and verify old combined-flow failures**

Run: `npx vitest run tests/dev-dashboard/handler.test.ts tests/dev-dashboard/routes.test.ts`

Expected: FAIL on the new award-payment route/shape.

- [ ] **Step 3: Implement deterministic demo routes**

Add handler coverage for `/award/payment` and `/award/payment/checkout`. Remove the old demo's
hardcoded NGN 25,000 award plus NGN 7,500 shipping behavior from the active payment response. The
fake checkout URL stays local and sets a pending attempt; the next callback-aware state read marks it
paid once.

- [ ] **Step 4: Run demo tests**

Run: `npx vitest run tests/dev-dashboard/handler.test.ts tests/dev-dashboard/routes.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit the demo task**

```bash
git add lib/dev-dashboard/store.ts lib/dev-dashboard/handler.ts tests/dev-dashboard/handler.test.ts tests/dev-dashboard/routes.test.ts
git commit -m "test(dashboard): simulate Bachs award payments locally"
```

---

### Task 8: Update admin payment visibility and disable new Paystack checkout

**Files:**
- Modify: `app/api/admin/awards/route.ts`
- Modify: `app/admin/awards/page.tsx`
- Modify: `app/api/admin/awards/verify-payment/route.ts`
- Modify or remove: `app/api/member/award/checkout/route.ts`
- Modify: `lib/awards/server.ts`
- Create: `tests/awards/admin-payment-view.test.ts`

**Interfaces:**
- Consumes: Task 1 payment summary/attempt schema.
- Produces: provider-neutral admin payment rows and a legacy-only Paystack verification guard.

- [ ] **Step 1: Write failing admin mapping/cutover tests**

Test that admin mapping exposes provider, selected/captured amount, currency, reference, checkout ID,
status, paid time, and exception status without exposing provider payloads. Test that legacy verify
rejects an order without an existing `paystack_reference` and never accepts a Bachs attempt.

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `npx vitest run tests/awards/admin-payment-view.test.ts`

Expected: FAIL because provider-neutral mapping is missing.

- [ ] **Step 3: Implement admin payment mapping and UI**

Join the successful/current payment attempt from `award_payment_attempts`. Label old rows `Paystack
(legacy)` and new rows `Bachs`. Show underpaid, overpaid, duplicate success, and exception states as
operator warnings. Do not show raw webhook/provider-response JSON to members.

- [ ] **Step 4: Disable the old member Paystack checkout route**

Delete the route only if no internal caller remains; otherwise return HTTP 410 with:

```json
{ "message": "This checkout has moved. Refresh the dashboard to pay with Bachs." }
```

Remove all dashboard/client references to the route. Keep the Paystack webhook and admin verification
only for rows with a pre-existing Paystack reference.

- [ ] **Step 5: Run tests and search for active Paystack creation**

Run: `npx vitest run tests/awards/admin-payment-view.test.ts tests/payments/paystack.test.ts`

Run: `rg -n "initializeTransaction|startAwardCheckout|/api/member/award/checkout" app lib --glob '!app/api/webhooks/paystack/route.ts' --glob '!app/api/admin/awards/verify-payment/route.ts'`

Expected: tests pass; search finds no active member checkout call.

- [ ] **Step 6: Commit the admin/cutover task**

```bash
git add app/api/admin/awards/route.ts app/admin/awards/page.tsx app/api/admin/awards/verify-payment/route.ts app/api/member/award/checkout/route.ts lib/awards/server.ts tests/awards/admin-payment-view.test.ts
git commit -m "feat(awards): cut new payments over to Bachs"
```

---

### Task 9: Document configuration and perform full verification

**Files:**
- Modify: `docs/E2E-TESTING.md`
- Create: `docs/bachs-integration.md`
- Create: `.env.example`
- Modify: any task-owned file only when a failing verification identifies a real integration defect

**Interfaces:**
- Consumes: all previous tasks.
- Produces: operator setup/runbook plus verified build/test state.

- [ ] **Step 1: Write the operator runbook**

Document exact non-secret variables:

```dotenv
BACHS_API_BASE_URL=https://sandbox-api.bachs.io
BACHS_API_KEY=sk_sandbox_replace_me
BACHS_WEBHOOK_SECRET=replace_me
BACHS_ORGANIZATION_ID=org_replace_me
BACHS_WEBHOOK_TOLERANCE_SECONDS=300
BACHS_CHECKOUT_HOSTS=checkout.bachs.io
NEXT_PUBLIC_SITE_URL=https://your-domain.example
AWARD_FEE_NGN_MINOR=2000000
AWARD_FEE_USD_MINOR=2000
AWARD_PRICE_VERSION=afl-award-2026-v1
```

Explain key/base-URL matching, minimum payment scopes, webhook destination
`/api/webhooks/bachs`, selected events, sandbox-host observation, migration order, and production
cutover. State clearly that secrets belong in local/deployment secret storage and must not be pasted
into source control or chat.

- [ ] **Step 2: Update E2E prerequisites**

Replace the statement that Paystack keys are required for new checkout. Keep a legacy note for
pre-cutover verification. Add the NGN/USD sandbox matrix and the assertion that no GIG booking occurs.

- [ ] **Step 3: Run all focused payment/award/demo tests**

Run:

```bash
npx vitest run tests/payments tests/awards tests/dev-dashboard
```

Expected: PASS.

- [ ] **Step 4: Run the full test suite**

Run: `npm test`

Expected: all tests PASS.

- [ ] **Step 5: Run typecheck and production build**

Run: `npx tsc --noEmit`

Run: `npm run build`

Expected: both exit 0.

- [ ] **Step 6: Run security/cutover searches**

Run:

```bash
rg -n "BACHS_API_KEY|BACHS_WEBHOOK_SECRET" app components lib --glob '*.tsx' --glob '*.ts'
rg -n "submitDeliveryDetails|refreshAwardTracking|startAwardCheckout" app/dashboard lib/awards.ts
rg -n "getCourier\(\).*book|\.book\(" app/api/webhooks/bachs lib/awards/bachs-webhook.ts
```

Expected: secrets are read only in server config; active dashboard has no delivery/old checkout call;
Bachs webhook has no courier booking.

- [ ] **Step 7: Perform sandbox acceptance with real credentials when available**

Verify both NGN and USD, event replay, cancellation, expiry, failure/underpayment fixtures, exact
amount/currency storage, one notification, and zero GIG calls. Record only event/attempt IDs in the
test log; never record secrets or full customer payloads.

- [ ] **Step 8: Commit documentation and any verified integration corrections**

```bash
git add docs/E2E-TESTING.md docs/bachs-integration.md .env.example
git commit -m "docs: add Bachs payment setup runbook"
```

## Final review checklist

- [ ] Every specification section maps to at least one task.
- [ ] All new payment-provider modules have one clear responsibility.
- [ ] All client APIs are provider-neutral and import no server secrets.
- [ ] No active Bachs path reads a client amount.
- [ ] No Bachs success path changes legacy delivery `status` or GIG columns.
- [ ] Duplicate events and duplicate successful attempts are separately handled.
- [ ] Historical Paystack evidence remains available and no new Paystack checkout is reachable.
- [ ] Unconfirmed UI copy never claims payment was received.
- [ ] Full tests, typecheck, and production build pass before completion is claimed.
