# Team payment attribution

Production is self-hosted Top100 through https://console.top100afl.com.

## Eligibility

For new credit, assignment alone earns nothing. A payment must be verified, and its rep must
have qualifying contact during the assignment interval, before payment. The
record must also have been saved before payment: backdating a note after a
member pays cannot earn credit. New evidence uses a database-controlled
recording timestamp, and its contact details remain immutable.

- Email requires the matching successful provider message/recipient and a
  matching email timeline record. Failed sends and manual claims of sending an
  email do not count. Use the application's Send email action.
- Calls and WhatsApp require an application-tracked action and independent
  awardee confirmation, both before payment. The awardee signs into the matching
  account and enters a fresh code sent to the database-owned recipient email.
  Opening the dialer or WhatsApp, manual notes and claimed outcomes earn nothing
  alone. The app cannot inspect personal WhatsApp or ordinary phone call history.
  This is recipient acknowledgement, not a provider-certified call/message log.
- Codes expire in ten minutes, allow five guesses, and are limited to three sends
  per recipient per hour with a sixty-second cooldown. Failed or ambiguous sends
  cannot activate a challenge. Reps cannot self-confirm; decisions and evidence
  timestamps are database-controlled and immutable. Declining contact and
  continuing to the award are always available.

Rep workflow: use **Call** or **WhatsApp** in the assigned worklist. WhatsApp
opens a draft containing the optional confirmation link; the rep sends it
through their existing app. After a phone conversation, copy and share the
confirmation link shown by the call action. The awardee opens the link, signs
in, requests their private email code and chooses Yes or No. Reps must never
request or enter that code for the awardee. Contact confirmation does not gate
award checkout. Notes remain useful for handover, but cannot establish credit.

The main API uses `CONTACT_CONFIRMATION_SECRET` when configured, otherwise the
existing server-only `SUPABASE_SERVICE_ROLE_KEY`. A dedicated key needs at least
32 characters; changing the signing key invalidates outstanding codes. The
team app always points confirmation links at the main Top100 site.

`team_qualifying_contacts` and the service-only `team_payment_attributions` view
provide the shared eligibility result. Payment application stores the evidence
reference in the earning snapshot. The admin card read model consumes that
same result and fails visibly if attribution cannot be read.

## Historical grace correction

The owner's instruction on 3 November 2026 preserves the specific 15 historical
credits (₦30,000) removed by the earlier repair. Missing contact records do not
establish that the reps made no effort. These credits and original assignments
remain under legacy grace pending review, with no automatic expiry or clawback
merely because records are missing. This is an exact allowlist, not a blanket
exception for new or other payments.

Grace is labelled `legacy_grace` in canonical attribution and separately counted
in admin totals. It is an owner-authorized historical policy, not verified
contact evidence. The strict contact-proof helper stays unchanged. Positive
ledger adjustments restore the prior credits without editing or deleting any
historical earning or reversal. Valid refunds still neutralize restored grace
exactly once. Reconciliation must retain grace and must not recreate a refunded
grant. No payout or external notification is part of restoration.

## Independent payments and corrections

Payments without qualifying outreach or an explicit historical grace grant remain paid for the member, appear to
administrators for reconciliation, and are removed from rep assignments.
Historical earnings are retained. Incorrect earnings receive linked negative
reversals; corrections never delete genuine payments or rewrite settled
withdrawals. Reconciliation must remain idempotent and must not resend agent
notifications. A later note cannot establish new contact proof; legacy grace is
an explicit owner-authorized exception.
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
followed by `team-platform/supabase/migrations/20261103120001_team_contact_confirmation_proof.sql`
to the active self-hosted database. The second migration removes manual-note
eligibility and reconciles existing paid attributions using the stricter rule.
Keep a protected schema and team-data backup on the Top100 host.
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

## Recipient confirmation release — 3 November 2026

Applied `20261103120001_team_contact_confirmation_proof.sql` on the active
self-hosted database. SHA-256:
`b77e9c77a066d191641d11a7385e4792980fe4308ad05fc0281be7e659ce2cba`.
Protected schema/team-data backups and transaction logs are in
`/root/top100-repair-backups/recipient-contact-proof-20261103/`.
The final dry run rolled back in 0.61 seconds; application took 0.63 seconds.
The reconciler examined 23 team-linked paid orders and needed no additional
reversal entries. Payment rows, withdrawals and historical ledger rows were
verified unchanged. The 15 earlier reversals remain intact; net naira commission
remains zero for these independent payments.

Verification: 11 recipient-proof PostgreSQL cases, 20 prior accounting/worklist
cases, 16 team unit tests and 1,848 main tests passed (24 unrelated database
tests require their separate fixtures and were skipped). Both typechecks passed;
independent final review found no remaining release blockers. The confirmation
form was inspected at 390px and 1280px using synthetic recipient data, including
code request and decline. No real confirmation email, call, WhatsApp message or
payout was sent as a test. Production SMTP and signing-key configuration were
checked without exposing their values.

## Owner-directed historical grace restoration — 3 November 2026

The owner clarified that missing records are not sufficient evidence that reps
made no effort. Applied `20261103120002_team_legacy_contact_grace.sql`, SHA-256
`19e2020f21930755f66d06e91c1ceda0af6445c3e62e59c84c32825e9abe4a5f`,
using the scoped fifteen-row runner and the protected backups in
`/root/top100-repair-backups/legacy-credit-grace-20261103/`.
The final dry run rolled back in 0.94 seconds; application took 0.83 seconds.

Fifteen linked positive adjustments restored ₦30,000 and fifteen original
assignments, with no ownership conflicts. Source payments, withdrawals,
historical ledger rows and unrelated payment projections were verified
unchanged. No notifications or payouts were issued. Scoped repeat application
preserved grace without duplicating or removing credits. The live dashboard
showed 15 credited payments and ₦30,000 confirmed commission after restoration.

Grace is an exact historical exception pending affirmative review, with no
automatic expiry. It is separately labelled and is not contact proof. New
payment attribution remains strict. Verified nine grace PostgreSQL cases
(including assignment concurrency and trigger-driven refunds), eleven contact
proof cases with grace installed, twenty prior worklist/accounting cases,
sixteen team unit tests, 1,849 main tests and both typechecks. Independent review
approved the exact migration SHA and scoped release checks before application.
