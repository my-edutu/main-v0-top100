# Bachs Award Payment — Phase One

**Date:** 2026-08-11
**Status:** Approved specification, ready for implementation planning

## Context

The member dashboard already has an Awards section backed by `award_orders`, Paystack checkout,
signed Paystack webhooks, payment notifications, and GIG Logistics quoting/dispatch. That flow
collects the award fee and delivery fee together, then treats payment confirmation as permission to
book the shipment.

The product decision is now different:

- Bachs completely replaces Paystack for all new member award payments.
- The award fee is paid before delivery is arranged.
- The award costs **NGN 20,000** when paying in NGN and **USD 20** when paying in USD.
- Every member outside the NGN path pays the USD price. The application supports only NGN and USD
  price selection in phase one; Bachs handles the payment methods available for the selected
  currency.
- GIG Logistics, the delivery address, the delivery quote, and delivery payment are a separate
  later step. A successful Bachs payment must not quote, book, or update a GIG shipment.

This is a payment cutover, not a visual redesign of the dashboard.

## Goals

1. Let an authenticated awardee pay the award fee from the Awards section through Bachs hosted
   checkout.
2. Charge only a server-owned price: NGN 20,000 or USD 20.
3. Confirm payment only from a valid, signed, amount-checked Bachs webhook.
4. Keep a durable, auditable record of every checkout attempt and webhook delivery.
5. Separate award payment state from delivery state so later GIG work can evolve independently.
6. Preserve historical Paystack and courier data without allowing Paystack to start new payments.
7. Keep the implementation focused, testable, and maintainable through small payment-specific
   modules and APIs.

## Non-goals

- Collecting delivery details or delivery fees.
- Calling GIG Logistics for a quote, booking, or tracking update after Bachs payment.
- Implementing the future delivery-payment flow.
- Supporting arbitrary client-selected prices or currencies.
- Subscriptions, instalments, coupons, or public award purchases.
- Migrating, deleting, or rewriting historical Paystack transactions.
- Building a custom card-entry form. Bachs owns the hosted checkout and sensitive payment input.

## 1. User flow

### 1.1 Unpaid

The Awards section opens directly on an award-payment card. It does not ask for a delivery address.
The card contains:

- Africa Future Leaders Award;
- a short explanation that the award fee and delivery are paid separately;
- a two-option currency selector:
  - `NGN — ₦20,000`
  - `USD — $20`;
- a primary action such as `Pay ₦20,000 with Bachs` or `Pay $20 with Bachs`;
- reassurance that available payment methods are shown securely on Bachs checkout.

NGN is the initial selection. The member can explicitly switch to USD. No automatic country
inference is used because the current profile stores a free-form location rather than a reliable
country code.

### 1.2 Starting checkout

The button sends only the selected ISO currency (`NGN` or `USD`) to the member checkout API. The
browser never sends an amount.

The API creates the member's `award_orders` row if one does not already exist, then creates a local
payment-attempt row. It creates a Bachs Checkout Session using the attempt's stable reference and
idempotency key, records the validated Bachs response, and returns a validated hosted checkout URL.
The browser performs a full-page navigation to that URL.

### 1.3 Returning from Bachs

- Success URL: `/dashboard?section=awards&payment=done`
- Cancel URL: `/dashboard?section=awards&payment=cancelled`

A redirect is never proof of payment.

After a successful return, the Awards section hides the payment button and polls the member payment
API briefly. It displays `We're confirming your payment` until the signed webhook changes the
server-owned payment state to paid. While confirmation is pending, the UI cannot create another
attempt.

If the confirmation window expires, the copy remains truthful: `Still confirming — please don't
retry payment. Contact support if this does not update shortly.` It must not say `Payment received`
until the server reports a confirmed payment.

A cancelled return restores the unpaid card and shows a non-error cancellation message. The member
may start a new attempt.

### 1.4 Paid

Once confirmed, the Awards section displays:

- `Award payment confirmed`;
- the exact confirmed amount and currency;
- the confirmation date;
- a clear notice that delivery through GIG Logistics and its delivery charge are separate;
- no tracking or `On its way` message in phase one.

The persistent dashboard award-payment prompt and nav badge disappear only after confirmed payment.

## 2. Domain model

Payment and delivery must not share one state machine. The existing `award_orders.status` and GIG
columns remain in place for legacy compatibility, but they are not the source of truth for new Bachs
award payments.

### 2.1 `award_orders` additions

Add payment-summary columns to the existing member-owned order:

| Column | Type | Purpose |
| --- | --- | --- |
| `award_payment_status` | text not null default `unpaid` | `unpaid`, `pending`, `paid`, `failed`, `refunded` |
| `award_paid_at` | timestamptz nullable | Canonical award-payment confirmation time |
| `award_paid_attempt_id` | uuid nullable | Successful attempt; foreign key added after the attempts table exists |
| `award_price_version` | text not null | Price contract used, initially `afl-award-2026-v1` |

`award_orders.status` stays untouched during the phase-one Bachs flow. This avoids tripping the
legacy database rule that a `paid` order has an award-plus-shipping total, and prevents the current
GIG dispatch path from interpreting an award-fee payment as a delivery-paid order.

`needsClaim` becomes payment-specific for the member prompt: it is true until
`award_payment_status = 'paid'`. Legacy paid orders are backfilled to `paid`, so existing members are
not asked to pay again.

### 2.2 `award_payment_attempts`

Create one immutable business record for every provider checkout attempt:

| Column | Type | Purpose |
| --- | --- | --- |
| `id` | uuid primary key | Internal attempt ID |
| `order_id` | uuid not null | References `award_orders(id)` with delete restrict |
| `provider` | text not null | `bachs`; `paystack` is allowed only for historical backfill |
| `charge_scope` | text not null | `award_fee`; legacy backfill uses `legacy_award_plus_delivery` |
| `status` | text not null | `creating`, `open`, `processing`, `succeeded`, `duplicate_succeeded`, `failed`, `expired`, `cancelled`, `underpaid`, `overpaid`, `refunded`, `exception` |
| `price_version` | text not null | `afl-award-2026-v1` |
| `requested_amount_minor` | bigint not null | `2000000` for NGN or `2000` for USD |
| `captured_amount_minor` | bigint nullable | Exact gross amount confirmed by Bachs |
| `currency` | char(3) not null | `NGN` or `USD` |
| `provider_reference` | text not null | Unique `AFL-AWARD-<order>-<attempt>` reference |
| `provider_checkout_id` | text nullable | Bachs checkout ID |
| `provider_charge_id` | text nullable | Bachs charge ID when present |
| `provider_status` | text nullable | Original Bachs status |
| `idempotency_key` | text not null | Stable key for retries of this exact create request |
| `checkout_expires_at` | timestamptz nullable | Bachs session expiry |
| `confirmed_at` | timestamptz nullable | Terminal success timestamp |
| `failure_reason` | text nullable | Safe operational reason, no secrets |
| `provider_response` | jsonb nullable | Redacted/safe init response for reconciliation |
| `created_at`, `updated_at` | timestamptz | Audit timestamps |

Required unique indexes:

- `(provider, provider_reference)`;
- `(provider, provider_checkout_id)` when checkout ID is not null;
- `idempotency_key`;
- at most one terminal successful `award_fee` attempt per order.

Multiple abandoned or failed attempts are retained. They are never overwritten by a later attempt.
If two different attempts somehow succeed, exactly one may use status `succeeded` and claim the order
as paid; the other uses `duplicate_succeeded` and stays recorded as a duplicate-charge exception
requiring manual reconciliation/refund.

### 2.3 `payment_webhook_events`

Create an append-only Bachs event ledger:

| Column | Type | Purpose |
| --- | --- | --- |
| `id` | text primary key | Bachs event ID; the deduplication key |
| `provider` | text not null | `bachs` |
| `event_type` | text not null | Original event type |
| `organization_id` | text nullable | Checked against configuration when configured |
| `payment_attempt_id` | uuid nullable | Matched local attempt |
| `processing_status` | text not null | `received`, `processed`, `ignored`, `exception` |
| `payload` | jsonb not null | Signed event body for restricted operational audit |
| `error` | text nullable | Safe reconciliation detail |
| `received_at`, `processed_at` | timestamptz | Audit timestamps |

The event row is service-role writable and admin-readable only. Members never read webhook payloads.
The event ID is inserted before payment side effects. A duplicate delivery returns success without
repeating notifications or state transitions.

### 2.4 Backfill and legacy preservation

- Existing rows at legacy `paid`, `dispatched`, `in_transit`, or `delivered` are backfilled to
  `award_payment_status = 'paid'` and `award_paid_at = paid_at`.
- Existing Paystack evidence (`paystack_reference`, `paystack_status`, `paid_at`) and GIG fields stay
  unchanged.
- Where sufficient data exists, a historical `award_payment_attempts` row is created with provider
  `paystack` and scope `legacy_award_plus_delivery`.
- Existing Paystack references that were overwritten by old retries cannot be reconstructed from the
  local row; provider exports remain the source for that missing history.
- No migration drops or renames old financial columns.

## 3. Price and money handling

The price contract is server-side and versioned:

| Selected currency | Display | Stored minor units | Bachs decimal string |
| --- | --- | --- | --- |
| NGN | `₦20,000` | `2000000` | `20000.00` |
| USD | `$20` | `2000` | `20.00` |

`lib/awards/money.ts` gains currency-aware helpers for fixed-decimal parsing and formatting. Bachs
amounts are decimal strings in major units; they must never be compared with JavaScript floating
point arithmetic.

The checkout API allowlists `NGN` and `USD`. Any other request value is rejected. The selected
currency is trusted only as a price-selector key; the server supplies the associated amount.

The Bachs pricing request contains a USD base price and exact NGN override:

```json
{
  "pricing": {
    "currency": "USD",
    "amount": "20.00",
    "currency_options": {
      "NGN": "20000.00"
    }
  },
  "billing_currency": "NGN_OR_USD_FROM_SERVER_ALLOWLIST"
}
```

Setting `billing_currency` prevents an unsupported third currency from creating an amount the
application cannot reconcile exactly. Bachs chooses the payment methods available to the merchant
and selected currency; the application does not hardcode card/bank/crypto/mobile-money availability.

## 4. Bachs adapter

All Bachs-specific HTTP, authentication, validation, and signature logic lives under
`lib/payments/bachs/`:

- `config.ts` — validates environment, key prefix, base URL, trusted site origin, and organization;
- `money.ts` — Bachs decimal conversion and exact comparisons;
- `checkout.ts` — request/response types and Checkout Session creation;
- `signature.ts` — timestamped HMAC-SHA256 verification;
- `events.ts` — runtime event-envelope validation and success-state helpers;
- `types.ts` — narrow provider contracts shared by server-only modules.

Client components never import these modules or receive the secret key.

### 4.1 Environment selection

- Sandbox: `https://sandbox-api.bachs.io` with an `sk_sandbox_...` key.
- Production: `https://api.bachs.io` with an `sk_live_...` key.

The configuration rejects a key/base-URL mismatch. Neither the API base URL nor credentials can be
supplied by a browser request.

### 4.2 Checkout request

`POST /v1/checkout-sessions` uses:

- server-owned `pricing` and allowlisted `billing_currency`;
- member name/email loaded from the authenticated profile;
- a unique reference shorter than 128 characters;
- metadata containing only `order_id`, `payment_attempt_id`, and purpose
  `afl_award_fee_v1`;
- the stable attempt ID as the `Idempotency-Key` basis;
- trusted `success_url` and `cancel_url` from `NEXT_PUBLIC_SITE_URL`;
- a 60-minute expiry.

Metadata contains no secrets, address, or unnecessary personal information.

The create request has a bounded timeout. Network failures, HTTP 429, and retryable 5xx responses may
retry with the exact same body and idempotency key using bounded backoff. Validation/authentication
4xx responses do not retry blindly.

### 4.3 Response validation

Before persisting and returning the redirect URL, require:

- a successful response;
- a non-empty checkout ID;
- status `OPEN`;
- valid created/expiry timestamps with a future expiry;
- an HTTPS Bachs checkout URL.

The checkout hostname is configurable through a server-side allowlist because the current Bachs
documentation does not clearly state whether sandbox uses a different checkout hostname. The
sandbox response must be observed and pinned before production activation.

If Bachs creates a session but the application cannot persist its checkout ID/reference, the API
does not return the URL. The attempt is recorded as an exception for reconciliation.

## 5. API boundaries

### 5.1 Member payment state

`GET /api/member/award/payment`

Returns only the authenticated member's payment view:

```ts
type AwardPaymentView = {
  status: 'unpaid' | 'pending' | 'paid' | 'failed' | 'refunded'
  priceOptions: Array<{ currency: 'NGN' | 'USD'; amountMinor: number; display: string }>
  currentAttempt: null | {
    id: string
    currency: 'NGN' | 'USD'
    amountMinor: number
    status: string
    expiresAt: string | null
  }
  confirmedPayment: null | {
    currency: 'NGN' | 'USD'
    amountMinor: number
    paidAt: string
  }
  needsPayment: boolean
}
```

It never returns provider payloads, secret data, or another member's row.

### 5.2 Create checkout

`POST /api/member/award/payment/checkout`

Request:

```json
{ "currency": "NGN" }
```

Response:

```json
{ "checkoutUrl": "https://checkout.bachs.io/c/...", "attemptId": "..." }
```

The route requires an authenticated member, rate-limits per member, rejects an already-paid order,
prevents concurrent open-attempt creation, and never reads an amount from the request.

### 5.3 Webhook

`POST /api/webhooks/bachs`

The webhook is the only automatic path that can confirm a new Bachs payment. It:

1. reads the raw body;
2. validates `X-Bachs-Timestamp` and rejects timestamps outside a 300-second tolerance;
3. validates `X-Bachs-Signature` as the HMAC-SHA256 hex digest of
   `timestamp + '.' + rawBody` using a timing-safe comparison;
4. parses and validates the signed event envelope;
5. checks `organization_id` when `BACHS_ORGANIZATION_ID` is configured;
6. inserts/deduplicates the event ID;
7. matches the pending attempt using checkout ID/reference plus metadata order/attempt/purpose;
8. for `collection.succeeded`, requires provider status `SUCCEEDED` or `ACCEPTED`, an exact currency
   match, and an exact gross amount match;
9. atomically marks one attempt succeeded and claims the order's award payment;
10. sends the existing payment-confirmed notification once, with award-only wording;
11. performs no courier action.

Subscribe to:

- `collection.succeeded`;
- `collection.failed`;
- `collection.underpaid`;
- `checkout.expired`.

Failed, expired, and underpaid events update the attempt but never confirm the award. Overpayment or
a second successful attempt is stored as an exception for manual reconciliation rather than silently
granting a second success.

Transient database failures return a retryable 5xx. Invalid signatures/payloads return 4xx. A valid
but unmatched event is durably recorded as an exception and acknowledged so it cannot disappear or
retry forever.

## 6. Dashboard component boundaries

Refactor `app/dashboard/awards-section.tsx` into focused pieces:

- `awards-section.tsx` — loads the payment view and selects a state panel;
- `award-payment-card.tsx` — currency choice and checkout action;
- `award-payment-confirmation.tsx` — pending/polling state with no payment button;
- `award-payment-success.tsx` — confirmed amount/date and separate-delivery notice.

The existing delivery, totals, and tracking components are removed from the active phase-one member
flow. Their GIG APIs remain server-side for later delivery work but cannot be reached through the
new award-payment UI.

`app/dashboard/page.tsx` retains its query-parameter handling and duplicate-payment guard, with
provider-neutral naming and both `done` and `cancelled` outcomes.

The local demo dashboard must follow the same contract: unpaid -> open Bachs-style attempt ->
simulated confirmed payment. It must not quote shipping or claim an award is on its way.

## 7. Notifications and administration

The existing paid email/in-app notification is retained but rewritten to confirm the award fee only.
It must not say the award is being packed, prepared, dispatched, or shipped.

The admin Awards screen gains provider-neutral payment information:

- payment status;
- provider;
- attempt reference and checkout ID;
- selected/captured amount and currency;
- paid timestamp;
- exceptions such as underpayment or duplicate success.

The current `Verify payment with Paystack` action remains available only for a historical order that
already has a Paystack reference. It cannot create new Paystack sessions. A future Bachs manual
verification action is out of scope unless sandbox testing shows the Checkout Session retrieval API
is necessary as a webhook recovery fallback.

## 8. Paystack cutover

- `POST /api/member/award/checkout` no longer initiates Paystack and is removed or returns a clear
  gone/migration response after all clients use the new route.
- No dashboard action exposes Paystack.
- The old Paystack webhook and admin verification remain temporarily for pre-cutover pending
  references only. They cannot process or create a Bachs attempt.
- `lib/payments/paystack.ts` remains only while that legacy recovery path exists.
- Historical Paystack fields are preserved. Their removal requires a separate, audited data-retention
  decision.

For all new member payments, Bachs is the sole payment provider.

## 9. Security and concurrency invariants

1. The browser chooses only `NGN` or `USD`; it never chooses the amount.
2. Secrets, provider base URLs, callback origins, and organization IDs are server-owned.
3. The Bachs secret key is never exposed through a `NEXT_PUBLIC_` variable.
4. Webhooks are verified over the original raw body before JSON parsing.
5. Webhook timestamps older/newer than the tolerance are rejected to limit replay.
6. Event IDs and provider references are unique.
7. Checkout creation uses one stable idempotency key per attempt.
8. An order can have only one successful award-fee payment claim.
9. Conditional database updates prevent a slower request from overwriting a paid/refunded state.
10. A redirect cannot mark an order paid.
11. Underpayment, currency mismatch, amount mismatch, null/unmatched charge data, and duplicate
    successful charges never trigger fulfilment automatically.
12. A Bachs event never calls the courier adapter.
13. Webhook payloads and operational payment logs are admin-only.
14. Logs and user-visible errors never include credentials or raw provider secrets.

## 10. Environment variables

Server-side configuration:

| Variable | Purpose |
| --- | --- |
| `BACHS_API_KEY` | Sandbox or production secret API key |
| `BACHS_API_BASE_URL` | Exact sandbox or live API root; checked against key prefix |
| `BACHS_WEBHOOK_SECRET` | HMAC signing secret for the registered endpoint |
| `BACHS_ORGANIZATION_ID` | Expected event organization; strongly recommended |
| `BACHS_WEBHOOK_TOLERANCE_SECONDS` | Defaults to `300` |
| `BACHS_CHECKOUT_HOSTS` | HTTPS hostname allowlist observed in sandbox/live |
| `NEXT_PUBLIC_SITE_URL` | Trusted absolute application origin used for redirects |
| `AWARD_FEE_NGN_MINOR` | Defaults to `2000000` |
| `AWARD_FEE_USD_MINOR` | Defaults to `2000` |
| `AWARD_PRICE_VERSION` | Defaults to `afl-award-2026-v1` |

Keys are created in the Bachs Developer Portal with the minimum scope required to create/read
payments. Sandbox credentials are used until the complete flow passes. Credentials are placed in the
deployment secret store and local untracked environment file, never committed.

The Bachs portal webhook destination is:

`https://<production-domain>/api/webhooks/bachs`

with the four phase-one events selected.

## 11. Testing and verification

### 11.1 Pure unit tests

- exact decimal-string <-> minor-unit conversion for NGN and USD;
- rejection of negative, fractional-minor, malformed, or wrong-scale amounts;
- payment price lookup and formatting;
- reference length/uniqueness;
- correct Bachs HMAC and timestamp acceptance;
- wrong secret, tampered body, malformed timestamp, stale timestamp, future timestamp, missing
  headers, and differently cased signature rejection;
- Bachs event-envelope and success-state validation.

### 11.2 Route/service tests

- authenticated NGN and USD checkout payloads use server prices;
- unsupported currency and client amount injection are rejected;
- already-paid and concurrent-open checkouts are rejected;
- retry uses the same idempotency key/body;
- create response URL/ID/status/expiry validation;
- `collection.succeeded` confirms exactly once;
- repeated event delivery is a no-op;
- exact amount and currency mismatches do not confirm;
- underpaid, failed, expired, unmatched, null-charge, overpaid, and duplicate-success behavior;
- database failure before durable processing returns retryable failure;
- successful Bachs payment never calls GIG;
- legacy Paystack rows remain recognized and are not charged again.

### 11.3 UI/demo tests

- unpaid NGN and USD selection and display;
- checkout loading disables duplicate clicks;
- pending confirmation has no pay button;
- timeout copy does not claim unconfirmed success;
- confirmed state displays the correct amount/currency and separate-delivery notice;
- cancelled return permits a fresh attempt;
- dashboard badge disappears only after confirmed payment;
- local demo transitions deterministically from unpaid to paid without GIG.

### 11.4 Sandbox acceptance

1. Apply migrations in a non-production Supabase project.
2. Configure Bachs sandbox key, base URL, organization ID, webhook secret, and observed checkout host.
3. Register the sandbox webhook endpoint and four events.
4. Complete NGN and USD test checkouts.
5. Confirm signed webhooks, exact amounts, one notification, and no courier call.
6. Replay a webhook event and confirm no duplicate state change/notification.
7. Exercise cancel, failure, expiry, underpayment, and wrong-signature cases.
8. Verify mobile and desktop dashboard states.
9. Run the full Vitest suite and production build.

Production credentials are not enabled until sandbox acceptance passes.

## 12. Bachs documentation ambiguities to pin in sandbox

The implementation must explicitly test these rather than guess:

1. The quickstart uses `return_url`, while the current API reference prefers `success_url`.
   Phase one uses `success_url` unless the sandbox rejects it.
2. Examples vary between `chk_...` and UUID-looking checkout IDs. Treat checkout IDs as opaque
   strings.
3. The response schema does not consistently promise the original reference. Persist the request
   reference locally before the API call.
4. The documented hosted hostname is `checkout.bachs.io`; observe and allowlist the sandbox hostname
   before enforcing the final production list.
5. Confirm the minimum API-key scopes required for Checkout Session creation/read access.
6. Confirm the exact `collection.succeeded` payload fields available in sandbox, especially
   reference, metadata, status, gross amount, currency, and nullable `charge_id`.

## 13. Completion criteria

Phase one is complete when:

- every new dashboard award payment uses Bachs;
- NGN checkout charges exactly NGN 20,000 and USD checkout charges exactly USD 20;
- only a verified, exact-match Bachs event marks the award fee paid;
- the dashboard confirms payment without claiming delivery has started;
- no Bachs payment path calls GIG Logistics;
- payment attempts and webhook events are auditable and idempotent;
- legacy Paystack records remain intact but no new Paystack checkout can start;
- unit/integration tests, the full test suite, and the production build pass;
- sandbox acceptance has been completed before live keys are configured.
