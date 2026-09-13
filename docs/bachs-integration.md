# Bachs award payments

New award payments use Bachs hosted checkout. The NGN award fee is ₦25,000 (2,500,000 minor units); the existing international USD option is $20 (2,000 cents). Delivery is arranged and charged separately. Paying the award fee does not create a shipment.

## Configuration

Store credentials in the deployment's secret environment and in an untracked `.env.local` for local testing. Never use a `NEXT_PUBLIC_` prefix for Bachs secrets.

```dotenv
AWARD_CHECKOUT_ENABLED=false
BACHS_API_BASE_URL=https://sandbox-api.bachs.io
BACHS_API_KEY=sk_sandbox_replace_me
BACHS_WEBHOOK_SECRET=replace_me
BACHS_ORGANIZATION_ID=replace_me
BACHS_WEBHOOK_TOLERANCE_SECONDS=300
BACHS_CHECKOUT_HOSTS=checkout.bachs.io
NEXT_PUBLIC_SITE_URL=https://your-app.example
AWARD_FEE_NGN_MINOR=2500000
AWARD_FEE_USD_MINOR=2000
AWARD_PRICE_VERSION=afl-award-2026-v1
```

The optional price variables may only repeat the fixed values above. Changing prices requires a versioned application/database change so checkout and settlement agree.

Production uses `https://api.bachs.io` and an `sk_live_` key. Mixing sandbox and production is rejected. Confirm the exact HTTPS checkout hostname returned in sandbox and add only trusted Bachs checkout hosts to the allowlist.

## Database and webhook

Apply the additive `supabase/migrations/20260908113639_bachs_award_payments.sql` migration after the existing award order and member hub migrations. It preserves historical payment and delivery records, adds the payment attempt/event ledger, and restricts payment mutation RPCs to the service role.

Register `https://your-app.example/api/webhooks/bachs` in Bachs and subscribe to `collection.succeeded`, `collection.failed`, `collection.underpaid`, and `checkout.expired`. Use the endpoint's signing secret for `BACHS_WEBHOOK_SECRET`.

Enable `AWARD_CHECKOUT_ENABLED=true` only after configuration and migration are present. New checkout is `/api/member/award/payment/checkout`; the former Paystack checkout endpoint returns HTTP 410. Historical Paystack verification is retained only to reconcile previously issued references.

## Verification before live activation

- Complete sandbox NGN and USD checkouts; confirm the exact gross amount and currency.
- Confirm a success redirect alone never marks an award paid.
- Replay the same signed event: only one payment claim and notification should exist.
- Exercise failed, underpaid, expired, wrong-signature, mismatched-currency and duplicate-success events.
- Confirm paid members have no payment prompt and no GIG shipment is created.
- Verify interrupted checkout creation remains recoverable without creating a second charge.
- Inspect `/admin/awards` for selected/captured amounts, provider reference and exceptions.

Keep underpaid, overpaid, duplicate and ambiguous attempts for support reconciliation. Do not manually overwrite them with a paid status. Existing unpaid Paystack sessions must be reconciled before another provider session can safely be opened.

## Provider references

The adapter follows the current [Bachs documentation](https://docs.bachs.io), including lowercase checkout status `open`; see the [Checkout Sessions guide](https://docs.bachs.io/guides/checkout/checkout-sessions), [idempotency guide](https://docs.bachs.io/guides/idempotency), and [webhook guide](https://docs.bachs.io/guides/webhooks/overview). Hosted payment is confirmed by a raw-body, timestamp-checked HMAC webhook, never by a browser callback.

## Local verification (2026-09-08)

- Full Vitest suite: 999 tests passed across 132 files.
- Production build: passed, including TypeScript validation.
- Local PostgreSQL migration: applied and reapplied; reservation, successful claims, replay, legacy-payment handling and delivery isolation checked.
- Browser demo: confirmed the simulated ₦25,000 paid view with separate-delivery wording.

## Rollout status

No live deployment or real Bachs transaction was performed. Bachs credentials were not present in the checked local environment files; the production migration and provider webhook still need configuration.

Code verification and sandbox activation are separate. Real sandbox acceptance requires configured Bachs credentials and an externally reachable registered webhook. Do not treat mocked tests or the local demo as evidence of a real payment.
