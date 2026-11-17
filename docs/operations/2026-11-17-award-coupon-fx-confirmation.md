# Automatic confirmation of coupon FX payments

A coupon reserves NGN 20,000; Bachs can collect the completed checkout in a different currency. The old webhook, recovery adapter and SQL function rejected that collection currency even after Bachs verified the exact NGN contract. All three now distinguish the original checkout price from the actual charge currency.

Identity, coupon eligibility/snapshot, exact contracted principal, signature, provider verification, fee, refund, order locking and duplicate protections remain in place. No app-computed exchange rate is used. Raw FX charge evidence remains in the event audit, while the canonical captured principal stays in the reserved NGN currency.

The release also includes the earlier public-link delivery reconciliation. A subsequent normal Git deployment omitted that unmerged overlay; keeping both repairs in the repository prevents another omission.

## Validation

- 1,988 tests passed; 27 opt-in database tests skipped in the full run.
- 14 tests passed separately in a disposable local PostgreSQL database, including converted coupon settlement, concurrency, amount/currency mismatch, refund preservation and service-role-only execution.
- Typecheck passed. Scoped ESLint reports no errors and existing `any` warnings in the adapters.
- Both changed adapters accepted fresh authenticated Bachs evidence for the six previously recovered coupon checkouts, collected in KES, XAF, USD, GHS and XOF. Worker reconciliation replayed the existing canonical claims; the signed-webhook dry-run asserted exact normalization before suppressing its event write. Outbound notification callbacks were replaced for verification; none were invoked.
- Function migration `20261117120846_award_coupon_verified_fx_confirmation.sql` passed rollback validation on the active self-hosted Supabase and was applied. Browser roles cannot execute it; service_role can.

## Deployment

Use the active Dokploy service `top100-frontend-hymlzt`, with the self-hosted Supabase database. The application already has an enabled five-minute Dokploy award reconciliation schedule. The delivery reconciliation timer runs every five minutes on the same host.

Build from the current production Git revision, carrying the payment-only patch. Preserve the previous running image before swapping. Confirm both protected reconciliation endpoints return 401 without credentials, the delivery timer succeeds, the database still has 101 canonical paid awards and five paid deliveries, and neither verification path initiates a new charge or courier booking.

The production Docker build exited 0 and Swarm completed rollout of `top100-coupon-fx:20261117`. The prior running image is preserved as `top100-coupon-fx:rollback-20261117`; the former function definition is retained in the root-only `/var/tmp/top100-coupon-fx-db-rollback.sql`.

The exact release patch on the current main branch passed 2,047 tests (28 opt-in database tests skipped) and 15 additional isolated PostgreSQL tests. This preserved the newer time-only coupon eligibility rules present in main, rather than replacing them with the older local test fixture.

Both production reconciliation endpoints returned 401 without credentials. The restored delivery worker completed with HTTP 200 and zero errors; its timer is enabled. The Dokploy award schedule remains enabled every five minutes. Production reads showed 102 paid awards and five paid deliveries after rollout; six coupon FX reconciliation audit events identify the already-confirmed real checkouts. The six-adapter verification created no duplicate award claims and invoked no outbound notification callback.

Source build directory and logs: `/var/tmp/top100-coupon-fx-release-20261117` and `/var/tmp/top100-coupon-fx-build.log`. Normal Git deployments must include the focused repository patch to retain both payment repairs.
