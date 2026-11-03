# Historical commission grace correction

The owner instructed us to preserve the 15 historical credits (₦30,000) and
their assignments unless there is affirmative evidence that the reps did not
contribute. Missing application contact records alone are insufficient.

Use the exact 15-credit repair manifest, not a blanket exception for new or
other payments. Add positive ledger adjustments linked to the original
reversals; retain every old ledger row. Restore the original assignments only
when no conflicting current owner exists. Keep source payments and withdrawals
unchanged. Grace has no automatic expiry or clawback for missing records.

Canonical attribution must expose these as `legacy_grace`, separate from actual
qualifying contact. New calls/WhatsApp still need tracked initiation plus the
awardee's private email-code acknowledgement before payment. Provider-backed
email evidence continues to qualify. Refunds must neutralize grace exactly
once; reconciliation and retries must neither remove grace nor duplicate it.

- Add an additive migration with restricted policy records and append-only restoration.
- Exercise restoration, replay, refund, conflict and future-payment cases in isolated PostgreSQL.
- Show grace counts separately in admin performance and explain the exception to reps.
- Back up, dry-run with financial hash checks, independently review, apply on the Top100 host.
- Push main, verify both deployments, totals, assignments and worker health.
