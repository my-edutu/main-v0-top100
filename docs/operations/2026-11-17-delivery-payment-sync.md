# Public-link delivery payment synchronization — 17 November 2026

## Cause

Delivery checkout uses public Bachs link `pl_2d4914db4ed0` / product `prod_595bb57045f149429614`. These notifications contain boolean `from_payment_link` metadata and a null provider reference. The legacy parser rejected those notifications with HTTP 400. The older delivery handler also required an already-bound app checkout ID, which public-link reservations do not have.

The live Bachs API key is valid in the production service; the developer machine's saved key was rejected. No key was rotated or exposed during repair.

## Repair

- Retrieve the payment and completed checkout from the authenticated Bachs production API. Require successful statuses, the delivery link and product, no refunds, consistent charge/checkout IDs, matching email, the exact contracted NGN amount and a valid original completion timestamp. For same-currency charges, verify the processing fee explains the gross excess. For FX, use the provider-confirmed original checkout price; never calculate an exchange rate.
- A service-only RPC matches exactly one reserved external delivery by normalized account email and exact price, checks the parent award payment and other active delivery records, then records provider IDs, original paid time and immutable evidence. Its receipt ledger prevents duplicate credit and retains unmatched/ambiguous successful payments for review. Locks and uniqueness constraints protect concurrent replay and competing charges.
- Recognize signed delivery-link webhook payloads before the legacy parser. Existing award-fee webhook URL and secret are reused; Bachs already subscribes it to checkout completion and successful collections. The handler rechecks provider evidence and does not book a courier.
- A protected internal endpoint scans the complete Bachs payment history. A systemd timer on the active Dokploy host runs it every five minutes, with a local lock and bounded timeouts. This catches missed webhooks and retries previously unmatched successful payments.
- Public-link confirmed payments remain `paid` pending fulfillment; member refresh does not automatically purchase GIG service. Members see the paid status and original paid time; staff see the same projection in Award Deliveries.

## Five confirmed payments

The audit reconciled five delivery payments. One was collected in USD against an original NGN quote. Use the provider-confirmed contracted quote for FX validation. Settlement proceeds reflect card costs and cannot replace that quote.

## Release and verification

Migration `20261117083000_public_delivery_payment_sync.sql` was tested in an isolated scratch database with the production paid-award helper and immutable-delivery trigger: exact-price mismatch, replay, competing charges, original timestamp, FX evidence, browser privileges and RLS. The scratch database was dropped. The migration also passed a rollback-only transaction on production before being committed.

Focused delivery tests: 103 passed. Full suite before the final copy correction: 1,975 passed, 27 opt-in database tests skipped. Typecheck and scoped ESLint passed. Repository-wide diff checking reports pre-existing whitespace in `infra/horilla/top100-sidebar.patch`; the delivery changes pass scoped diff checking.

Production image: `top100-delivery-sync:20261117`; source `/var/tmp/top100-delivery-sync-release-20261117`. Built as a narrow overlay on the previous running outreach release, preserving that release and excluding unrelated local edits. Normal Git-based Dokploy redeployment must include these source changes as well as the prior outreach overlay to preserve both repairs.

Timer: `top100-award-delivery-reconciliation.timer`. Runner: `/usr/local/bin/top100-award-delivery-reconciliation`. No credentials are stored in the runner or repository; the runner reads `CRON_SECRET` inside the running frontend container.

Rollout completed successfully on 17 November 2026. Both isolated Docker builds exited 0; the final image includes the updated confirmation instructions. Swarm reports update completed. Rollback image: `top100-delivery-sync:rollback-20261117` (previous outreach release). The database migration is additive; before-image reservations are retained in the root-only `/var/tmp/top100-delivery-sync-before-20261117.json`.

Two real reconciliation runs each returned HTTP 200, scanning 853 payment records and confirming the same five deliveries, with zero errors. Other public-link attempts did not qualify and were left unconfirmed; the worker summary labels those withheld attempts `review`. The database contains exactly five matched receipts and five paid deliveries; all 95 award-fee paid flags remain unchanged. No courier booking or waybill was created.

Bachs replayed the actual previously rejected successful collection event to the production webhook. Its new attempt `wha_288E6abGz4R7ZFJN` succeeded with HTTP 200 and `{ "received": true }`; no duplicate credit was created. Unauthenticated reconciliation returns HTTP 401. The systemd worker exited successfully and its timer is enabled with a five-minute calendar schedule.

Authenticated browser verification at `/admin/award-deliveries` displayed all five awardees as **Paid · booking pending**, with the original paid dates and contracted quote amounts. The live page also continued to show other delivery quotes/payments as unconfirmed. Member-page rendering uses the same tested evidence projection; no member impersonation or new payment was used in verification.
