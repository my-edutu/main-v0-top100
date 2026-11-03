# Team payment attribution

Production is self-hosted Top100 through https://console.top100afl.com.

## Eligibility

Assignment alone earns nothing. A payment must be verified, and its rep must
have qualifying contact during the assignment interval, before payment. The
record must also have been saved before payment: backdating a note after a
member pays cannot earn credit. New evidence uses a database-controlled
recording timestamp, and its contact details remain immutable.

- Email requires the matching successful provider message/recipient and a
  matching email timeline record. Failed sends and manual claims of sending an
  email do not count. Use the application's Send email action.
- Calls and WhatsApp require a substantive logged outcome and useful notes.
  These are staff-recorded audit evidence, not independent provider proof.
  Opening WhatsApp, unavailable numbers and non-action records earn nothing.

`team_qualifying_contacts` and the service-only `team_payment_attributions` view
provide the shared eligibility result. Payment application stores the evidence
reference in the earning snapshot. The admin card read model consumes that
same result and fails visibly if attribution cannot be read.

## Independent payments and corrections

Payments without qualifying outreach remain paid for the member, appear to
administrators for reconciliation, and are removed from rep assignments.
Historical earnings are retained. Incorrect earnings receive linked negative
reversals; corrections never delete genuine payments or rewrite settled
withdrawals. Reconciliation must remain idempotent and must not resend agent
notifications. A later note cannot restore a reversed unearned credit.
Approval, processing and payout recording must recheck the current ledger;
an existing withdrawal request does not preserve access to reversed earnings.

## Naira display

Team cards display **award value** at the current standard **₦25,000 per
credited award**. This is a product-value measure, not converted cash revenue.
Original NGN/USD payment evidence remains unchanged. Commission balances use
the actual naira ledger; foreign commission entries require a real settlement
policy and cannot simply be relabelled as naira.

## Release and verification

Apply `team-platform/supabase/migrations/20261103120000_team_commission_attribution.sql`
to the active self-hosted database before the updated card read model is
released. Keep a protected schema and team-data backup on the Top100 host.
First exercise the migration in a transaction ending in rollback against the
live schema, inspect correction counts, then apply the reviewed file.

Use the isolated team-platform PostgreSQL integration suite for eligibility,
reconciliation, assignment release and withdrawal cases. Never point its
fixture setup at production. Verify main/team typechecks, main performance API
tests, narrow/wide rendered cards, provider evidence access permissions and
successful Top100 frontend/team deployments. No real email or withdrawal is
needed for release verification.

## Production record — 3 November 2026

Applied migration SHA-256 (before final trailing-blank-line cleanup):
`5e4db175ab2933a9d21bfe0e3637eb0296d700e2d5b728bbe9b73538ebde84c6`.
The final rollback check completed in 0.45 seconds; application completed in
0.63 seconds under a repeatable-read transaction, a 60-second statement timeout
and a 10-second lock timeout. Protected backups and release logs are in
`/root/top100-repair-backups/team-contact-credit-20261103/` on the Top100 host.

The release examined 23 paid orders. None had qualifying pre-payment outreach
evidence. Fifteen existing earning entries (₦30,000) received linked negative
reversals, and 15 active independent-payment assignments were released. All
original payment rows, withdrawal requests and historical ledger rows were
verified unchanged by transaction-level hashes. Three timely contact records
were found separately: two unavailable-number outcomes and one WhatsApp awaiting
response record without substantive notes. These do not satisfy the evidence
rule. No payment was changed to unpaid, and no email or withdrawal was sent.

Verification: 20 isolated PostgreSQL integration cases, 11 team unit tests,
17 final main performance/API tests, both application typechecks and scoped
lint passed. The broader main suite passed 1,826 tests before the final targeted
checks. Independent review covered refunds, replay, immutable recording times,
pending reversal release, source identity, NGN constraints and withdrawal
solvency. Cards were inspected with synthetic data at 390px and 1280px.
