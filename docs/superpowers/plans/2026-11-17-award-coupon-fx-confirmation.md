# Award coupon foreign-currency confirmation repair

Keep the reserved coupon contract at NGN 20,000. Remove only the rule that rejects a different provider collection currency after Bachs' authenticated checkout verification proves exact identity, amount, terminal payment and no refund.

1. Reproduce the webhook and worker failures with coupon fixtures collected in USD, KES, XAF, GHS and XOF. Keep negative checks for wrong contract currency/amount/identity, incomplete checkout and refunds.
2. Remove the redundant charge-currency restrictions in webhook, worker and service-only SQL reconciliation. Preserve coupon snapshots, price guard, locking, refund and duplicate protections, original FX audit evidence and notification deduplication.
3. Verify focused tests, isolated PostgreSQL concurrency/permissions tests, full suite, typecheck and production build.
4. Apply the additive function migration to self-hosted production. Build the latest active production source with a narrow overlay, carrying forward the previously deployed public-link delivery synchronization that a later Git deploy omitted.
5. Exercise real Bachs coupon checkout evidence through the changed adapters, suppressing outbound notification functions during verification. Confirm canonical payment counts, duplicate handling, service permissions and scheduled workers.
