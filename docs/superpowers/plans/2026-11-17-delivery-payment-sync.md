# Delivery payment synchronization repair

Restore automatic confirmation for the existing Bachs public delivery link, using the current delivery quote ledger.

1. Add provider verification for public-link payments: retrieve payment and checkout, require completed/succeeded, exact NGN quote price, delivery link/product IDs, matching customer emails, valid completion time and no refunds. Preserve foreign-currency charge details without inventing an exchange rate.
2. Add a service-only atomic reconciliation RPC and receipt ledger. Match exactly one reserved external-link delivery by email and amount, serialize against other order changes, enforce charge/checkout uniqueness, preserve quote history and original payment time, and hold ambiguous/duplicate/unmatched payments for review. Record payment without booking a courier.
3. Route signed public-link webhooks before the older metadata parser, and add a protected reconciliation endpoint plus a five-minute Dokploy-host timer as fallback. Repeated scans/events must be idempotent.
4. Test verification, forged/wrong-purpose/amount/refund cases, webhook routing, replay and SQL concurrency/permissions. Run typecheck and relevant checks.
5. Apply migration on the active self-hosted Supabase. Re-verify and reconcile the five known charges, verify each member/admin projection, deploy an isolated overlay over the currently running production source, enable/check timer and endpoint. Keep rollback image and document results.

No automatic courier purchase or dispatch is part of this repair. Existing unrelated working-tree changes remain outside the production overlay.
