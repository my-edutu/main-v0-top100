# Bachs payments

New award payments use Bachs hosted checkout. The NGN award fee is ₦25,000 (2,500,000 minor units); the existing international USD option is $20 (2,000 cents). Delivery is arranged and charged separately. Paying the award fee does not create a shipment.

Magazine feature applications use a separate Bachs checkout and payment ledger. The default campaign fee is ₦10,000/$10. Paying that fee enables editorial review only; it does not guarantee publication. The award and magazine switches and webhook secrets are independent.

## Configuration

Store credentials in the deployment's secret environment and in an untracked `.env.local` for local testing. Never use a `NEXT_PUBLIC_` prefix for Bachs secrets.

```dotenv
AWARD_CHECKOUT_ENABLED=false
MAGAZINE_CHECKOUT_ENABLED=false
BREVO_SMTP_HOST=smtp-relay.brevo.com
BREVO_SMTP_PORT=587
BREVO_SMTP_LOGIN=your_brevo_smtp_login
BREVO_SMTP_KEY=your_brevo_smtp_key
BREVO_SENDER_EMAIL=payments@top100afl.com
BREVO_SENDER_NAME=Top100 Africa Future Leaders
BACHS_API_BASE_URL=https://sandbox-api.bachs.io
BACHS_API_KEY=sk_sandbox_replace_me
BACHS_AWARD_WEBHOOK_SECRET=replace_with_award_endpoint_secret
BACHS_MAGAZINE_WEBHOOK_SECRET=replace_with_magazine_endpoint_secret
BACHS_ORGANIZATION_ID=replace_me
BACHS_WEBHOOK_TOLERANCE_SECONDS=300
BACHS_CHECKOUT_HOSTS=checkout.bachs.io
NEXT_PUBLIC_SITE_URL=https://www.top100afl.com
AWARD_FEE_NGN_MINOR=2500000
AWARD_FEE_USD_MINOR=2000
AWARD_PRICE_VERSION=afl-award-2026-v1
```

The optional price variables may only repeat the fixed values above. Changing prices requires a versioned application/database change so checkout and settlement agree.

Production uses `https://api.bachs.io` and an `sk_live_` key. Mixing sandbox and production is rejected. Confirm the exact HTTPS checkout hostname returned in sandbox and add only trusted Bachs checkout hosts to the allowlist.

## Database and webhook

Apply pending migrations in order, including `supabase/migrations/20261015120000_magazine_payment_email_log.sql`, after the existing award order and member hub migrations. The payment migrations preserve historical payment and delivery records, add the payment attempt/event ledger and notification retry log, and restrict payment mutation RPCs to the service role.

Register both webhook destinations in Bachs. Subscribe the award destination to `checkout.completed`, `collection.succeeded`, `collection.failed`, `collection.underpaid`, and `checkout.expired`. Subscribe the magazine destination to `collection.succeeded`, `collection.failed`, `collection.underpaid`, and `checkout.expired`:

- Award payments: `https://www.top100afl.com/api/webhooks/bachs`; store its signing secret as `BACHS_AWARD_WEBHOOK_SECRET`.
- Magazine payments: `https://www.top100afl.com/api/webhooks/bachs-magazine`; store its distinct signing secret as `BACHS_MAGAZINE_WEBHOOK_SECRET`.

Payment lifecycle emails are sent for both award and magazine checkouts: a secure checkout link after the provider session is created, a receipt only after the signed webhook confirms payment, and a recovery message when payment fails or the checkout expires. Ambiguous or mismatched captures tell the customer not to pay again until support verifies the transaction. Award confirmation and failure handling use the existing award notification and reminder logs. Magazine status emails are recorded in `magazine_feature_payment_email_log` so Bachs webhook retries can retry a failed message without duplicating a delivered email.

Configure Brevo SMTP with `BREVO_SMTP_LOGIN` and `BREVO_SMTP_KEY`, plus a verified `BREVO_SENDER_EMAIL`. Use `smtp-relay.brevo.com` on port `587`; the app also supports the existing Brevo API key as a fallback when SMTP credentials are absent. Email secrets must remain server-only. Payment status messages use stable message IDs and durable delivery logs where the payment flow supports retry.

Bachs issues a signing secret per destination. Do not reuse one endpoint's secret for the other. Keep both checkout switches false until their corresponding endpoint is registered, secrets are deployed, and sandbox verification has passed. Either checkout can be activated without enabling the other.

Enable `AWARD_CHECKOUT_ENABLED=true` only after award configuration and migration are present. Enable `MAGAZINE_CHECKOUT_ENABLED=true` separately after magazine configuration and migration are present. New checkout routes are `/api/member/award/payment/checkout` and `/api/member/magazine/payment/checkout`; the former Paystack award checkout endpoint returns HTTP 410. Historical Paystack verification is retained only to reconcile previously issued references.

## Verification before live activation

- Complete sandbox NGN and USD checkouts for each enabled product; confirm the exact gross amount and currency.
- Verify each webhook destination accepts only its own endpoint secret and routes events to the corresponding payment ledger.
- Confirm a success redirect alone never marks an award paid.
- Replay the same signed event: only one payment claim and notification should exist.
- Confirm checkout-started, paid, failed, expired, and ambiguous-payment emails reach the matching customer; replay events to check delivery recovery and deduplication.
- Exercise failed, underpaid, expired, wrong-signature, mismatched-currency and duplicate-success events.
- Confirm paid members have no payment prompt and no GIG shipment is created.
- Verify interrupted checkout creation remains recoverable without creating a second charge.
- Inspect `/admin/awards` for selected/captured amounts, provider reference and exceptions.

Keep underpaid, overpaid, duplicate and ambiguous attempts for support reconciliation. Do not manually overwrite them with a paid status. Existing unpaid Paystack sessions must be reconciled before another provider session can safely be opened.

## Recovering award checkouts

Apply `20261030174333_bachs_award_late_success_recovery.sql` with the matching application release. A signed exact-price success may now recover an earlier failed or expired collection on the same checkout. The service-only reconciliation function can also recover failed, expired, overpaid and exception attempts after fresh provider verification. Refunds and duplicate payment claims remain protected. Recovery checks older attempts on a member's order as well as the latest one.

For USD cards, Bachs `fees.amount` may include an additional merchant international-card fee. Verify the customer processing component in `fees.breakdown` when `merchant_bears_cost=false`; the gross charge minus that component must equal the original checkout price. An authenticated completed checkout with successful payment status may use a charge status of `accepted` or `succeeded`. An `OVERPAID` callback is only a signal to verify the checkout; it never grants payment access by itself.

The five-minute worker includes failed, expired and exception attempts, rotating unresolved cases through its queue. Watch its error count and inspect unresolved successful callbacks in `payment_webhook_events`. A provider verification outage must leave payment history intact for retry.

Apply `20261013215353_bachs_award_checkout_reconciliation.sql` before deploying the checkout recovery routes. In Dokploy, schedule a POST every five minutes to `/api/internal/award-payment-reconciliation`, with `Authorization: Bearer <CRON_SECRET>`; configure the existing `CRON_SECRET` as a protected application environment variable. The worker verifies each saved Bachs checkout by API before recording a payment or expiry. It also retries an interrupted checkout creation only when the original request body, idempotency key, API key fingerprint, and API endpoint are unchanged and the idempotency window is still safe.

For one-off incident repair, run `npx tsx scripts/reconcile-award-payments.ts` to inspect at most 100 pending award attempts. Add `--limit=500` to inspect a larger batch. The script is read-only by default; `--apply` records only provider-verified paid/open/expired outcomes through the atomic reconciliation RPC. It never creates a replacement checkout, refunds a payment, changes delivery, or sends email. Preserve ambiguous attempts for support review.

Bachs may report the original checkout price in USD while settling a successful local-currency charge. The award webhook handler verifies the checkout and charge against Bachs, then records the reserved award fee in the order currency. `checkout.completed` is handled as a success signal alongside `collection.succeeded`; both callback forms retain their original payloads in the webhook ledger.

## Provider references

The adapter follows the current [Bachs documentation](https://docs.bachs.io), including lowercase checkout status `open`; see the [Checkout Sessions guide](https://docs.bachs.io/guides/checkout/checkout-sessions), [idempotency guide](https://docs.bachs.io/guides/idempotency), and [webhook guide](https://docs.bachs.io/guides/webhooks/overview). Hosted payment is confirmed by a raw-body, timestamp-checked HMAC webhook, never by a browser callback.

## Local verification (2026-09-08)

- Run `npm run check:launch` for award activation and `npm run check:magazine-launch` for magazine activation; these independently verify the relevant feature flag, shared Bachs credentials, and that product's webhook secret.
- Production build: passed, including TypeScript validation.
- Local PostgreSQL migration: applied and reapplied; reservation, successful claims, replay, legacy-payment handling and delivery isolation checked.
- Browser demo: confirmed the simulated ₦25,000 paid view with separate-delivery wording.

## Rollout status

No live deployment or real Bachs transaction was performed. Bachs credentials were not present in the checked local environment files; deployment secrets and both production webhook destinations still need configuration.

Code verification and sandbox activation are separate. Real sandbox acceptance requires configured Bachs credentials and an externally reachable registered webhook. Do not treat mocked tests or the local demo as evidence of a real payment.
