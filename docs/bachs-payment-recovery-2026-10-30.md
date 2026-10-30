# Award payment recovery — 30 October 2026

Six orders were verified directly against Bachs production checkout sessions and recovered through `reconcile_bachs_award_checkout`. Each now has a successful attempt linked by `award_paid_attempt_id` and `award_payment_status=paid`. Delivery state remains draft.

## Causes and prevention

- A failure callback made the attempt terminal; an exact success arriving later was forced into an exception. The database now permits an identified, exact-price late success under the existing order lock and duplicate/refund protection.
- USD card charges were $21.40 for a $20 checkout. The total fee field was $1.72, including a separate $0.32 international-card fee. Verification now checks the $1.40 customer processing component where Bachs says the merchant does not bear that processing cost.
- Cavin's completed checkout had payment status `succeeded` and charge status `accepted`. Both supported terminal charge states are now recognized. An `OVERPAID` callback requires fresh checkout verification.
- Failed and exception attempts were excluded from automatic and admin reconciliation. They are now eligible for fresh provider verification. Member recovery also checks earlier attempts, rather than only the newest one.

The enabled Dokploy reconciliation schedule runs every five minutes. No new charge or refund was created during repair. Original callback evidence is retained and recovery has separate v2 audit events. Payment mutation functions are restricted to the service role.

## Verification

- 56 focused payment tests passed, including 11 tests against an isolated PostgreSQL database: concurrency, replay, failed/expired/exception recovery, refund preservation, identity mismatch and permission denial.
- TypeScript checking and `git diff --check` passed.
- The complete suite reported 1,513 passes, 16 failures and 11 skips. It is not green. Failures occurred in password recovery, magazine webhook response shape, WhatsApp assignment, signup code consumption, admin navigation/social generation, dashboard award copy/profile editor, event calendar, legacy award checkout API fixtures, and local demo/image processing (including timeouts). These areas require separate investigation; this repair does not claim to fix them.
- The legacy award checkout API fixture failures were reproduced separately: they send `{currency}` while the current route requires billing country and email. The checkout route was not modified by this repair.

Deploy the application changes together with migration `20261030174333_bachs_award_late_success_recovery.sql`. The migration and six order repairs have already been applied to the production database.
