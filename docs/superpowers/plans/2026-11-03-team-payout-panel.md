# Payout requests on Team Operations

Show commission withdrawal requests on `/admin/team-operations`, scoped to the
selected team, with requester, naira amount, bank/account name, full account
number, status and inline actions. Reuse `team_transition_withdrawal` so approval,
solvency checks, self-payment protection, payout records and audit history stay
authoritative. This records a completed external transfer; it does not send money.

Use a separate paginated read endpoint and a strict same-origin mutation route.
Platform admin access is required for reads; an active team super-admin is also
required for mutation. An administrator cannot manage their own withdrawal.
Approval precedes payment confirmation. Confirmation requires a transfer reference
and uses the database-owned request amount. Show errors and retain form input.

Add a responsive inline panel with pending/paid/all filters, real empty/error
states, and clear bank details. Test auth, cross-team scope, self-payment,
validation, stale status, amount tampering and the existing RPC mapping. Verify
responsive UI with fixtures and production read-only checks; never approve or
mark a real payout during verification. Publish through the Top100 Dokploy host.

## Validation

- Root suite: 1,860 tests passed; 24 database integration tests skipped without
  dedicated database fixtures. The focused payout route suite has 13 passing
  tests, including two additional approval/error outcome cases.
- TypeScript and scoped application ESLint checks passed.
- An isolated browser fixture completed approval, mandatory reference entry,
  confirmation, removal from the open list and display in the paid list.
  Responsive checks at 390 and 1,280 pixels showed no horizontal overflow.
- Production was inspected read-only: two requested NGN payouts, both with
  complete bank details. No real request was approved, rejected or paid.
- This feature reuses existing database tables and RPCs; no migration is needed.

## Rep dashboard follow-up

A submitted request already reserves its amount. Confirming payment moves it
from pending withdrawals to paid withdrawals, keeping the amount deducted from
available commission without deducting it twice. The existing SQL functions
serialize concurrent requests and confirmations. No database change is needed.

Show recent payout requests, Paid status, payment date/reference, pending
withdrawals and total paid on the agent overview. Reuse the existing refresh
control on Earnings and Withdrawals so those pages also refresh on focus and
every minute while visible. Preserve form input during route refreshes.

Financial verification uses an explicitly named local disposable database:
`TEAM_PAYOUT_TEST_DATABASE_URL=postgresql://localhost/top100_team_payout_test_20261103 node --test team-platform/tests/integration/payout-settlement.test.mjs`.
The test resets that database's schemas. Its six integration cases cover
reservation, settlement/dashboard/notification, reuse prevention, concurrent
requests, concurrent confirmations, partial settlements and connection URL safety. The four tested SQL function definitions
match the active self-hosted production database. No real payout is changed.
