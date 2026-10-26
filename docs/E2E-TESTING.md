# End-to-end test: admin invite → signup → dashboard → award payment

How to actually walk the awardee journey, and what will and will not work.

## 0. The blocker you must clear first

Verified against the live Supabase project on **2026-07-27**:

```
node scripts/verify-db.mjs
```

…reported **17 missing tables and 6 missing `profiles` columns**. `access_codes` does not exist, so
an admin cannot generate an invite code, so nobody can sign up, so nothing downstream of step 1 is
reachable. The code is fine; the database was never migrated.

Fix it once:

```bash
node scripts/build-setup-sql.mjs      # regenerates supabase/SETUP-ALL.sql
```

Then open the Supabase dashboard → SQL Editor → paste the whole of `supabase/SETUP-ALL.sql` → Run.
It is idempotent, so re-running it after adding a migration is safe.

Confirm:

```bash
node scripts/verify-db.mjs            # expect: all present
```

**Prerequisite:** `SETUP-ALL.sql` assumes `public.messages` already exists (it re-hardens that
table's RLS policies). It does exist in the live project. On a genuinely fresh database, run
`supabase/migrations/create_messages_table.sql` first — note that file is *not* idempotent and its
two permissive policies are deliberately replaced by `SETUP-MEMBER-HUB.sql`.

## 1. Environment

`.env.local` currently contains **only** the three Supabase keys. Each block below is optional and
degrades safely, but the feature it powers is inert without it.

| Variable | Without it |
|---|---|
| `BACHS_API_KEY`, `BACHS_API_BASE_URL`, `BACHS_CHECKOUT_HOSTS`, `AWARD_CHECKOUT_ENABLED=true` | New award checkout cannot start. Use sandbox credentials first. |
| `MAGAZINE_CHECKOUT_ENABLED=true` | Magazine feature checkout cannot start until the independent Bachs configuration and magazine webhook secret are present. |
| `BACHS_AWARD_WEBHOOK_SECRET`, `BACHS_MAGAZINE_WEBHOOK_SECRET`, `BACHS_ORGANIZATION_ID` | The corresponding signed Bachs confirmation cannot be accepted safely. See [Bachs setup](bachs-integration.md). |
| `GIG_API_BASE_URL`, `GIG_API_USERNAME`, `GIG_API_PASSWORD` | `getCourier()` returns the manual adapter: every quote fails and every order lands in `quote_failed` for manual admin pricing. |
| `GEOAPIFY_API_KEY` | Home-delivery quotes cannot resolve a street address and fail safely to `quote_failed`. Service-centre quotes still work from GIG's verified centre coordinates. |
| `GIG_ENABLED=true` | **Required in addition to the credentials.** Without it the GIG adapter stays off even when fully configured — see the warning below. |
| `BREVO_API_KEY` | Award milestone emails are skipped (logged, not sent). In-app notifications still write. |
| `TURNSTILE_SECRET_KEY` | Signup CAPTCHA is skipped entirely (`verifyCaptchaToken` returns `true` when unset). Fine for testing. |

**Use Bachs sandbox keys first.** The new award fee is ₦25,000 or $20; delivery is separate. Apply the Bachs payment migration before testing. Paystack keys are needed only for historical reconciliation.

### The GIG kill switch — read before setting `GIG_ENABLED`

Quoting now follows GIG's published Price V3 OpenAPI definition
(`POST /price/v3` with mandatory `SenderLocation`, `ReceiverLocation`,
`PickUpOptions` and `ShipmentItems`). Home addresses are geocoded server-side by
Geoapify with a Nigeria-only filter; service centres use GIG's verified
`serviceCentresByStation` coordinates. There is no fallback to guessed
coordinates and no call to the undocumented `getaddressdetails` endpoint.

The response amount field and currency are still account-specific. The adapter
tries the documented fields and refuses a non-NGN amount, but before enabling
live members you must:

1. Quote a known route (e.g. Lagos → Abuja) against the production account.
2. Pin `GIG_FIELD_QUOTE_AMOUNT` to the field your account actually returns.
3. Confirm the figure is naira, not kobo, and matches GIG's own calculator.
4. Book one controlled shipment and confirm exactly one waybill.

Manual pricing is slower. It cannot overcharge anyone. Prefer it until those
checks pass.

## 2. The walkthrough

### Step 1 — Admin generates the invite code
`/admin/login` → `/admin/invites` → generate. Optionally bind it to an email and set uses/expiry.
Codes look like `AFL-K3M9Q-7VZ2R` (Crockford base32, 50 bits, no ambiguous characters).

Backed by `POST /api/admin/access-codes` → `lib/access-codes.ts`. Redemption is a compare-and-swap
loop, so two people racing a 1-use code cannot both redeem it.

### Step 2 — Awardee signs up
`/signup`. This is a **directory claim**, not open registration. The awardee must:
1. Pick their existing record from the `awardees` directory,
2. Use an email matching the one on file (when one is on file),
3. Enter the invite code.

The record must be unclaimed (`awardees.profile_id is null`). On any post-user failure the route
deletes the just-created auth user so no orphan is left. New profiles start at
`membership_status = 'pending'`.

### Step 3 — Log in and land on the dashboard
`/login` → `/dashboard`. First visit shows the welcome balloons. A pending member sees the
"pending review" banner; approve them at `/admin/members` to unlock approved-only broadcasts.

Sections: Home, BIO, Directory, Messages, Opportunities, My Award, Get featured, Events,
Partnerships, Magazine, Notifications, Settings — plus Groups and Posts (see the plans in
`docs/plans/`).

### Step 4 — Pay the award fee
Dashboard → **My Award**. The prompt remains until payment is confirmed.

1. Choose NGN (₦25,000) or USD ($20). No delivery address or shipping quote is required.
2. Pay → `POST /api/member/award/payment/checkout` → Bachs hosted checkout.
3. Return to `/dashboard/me/award?payment=done`. The redirect does not confirm payment.
4. The dashboard polls while `/api/webhooks/bachs` receives the signed event. There is no second pay button while confirmation is pending.
5. Confirmed payment shows the captured amount/currency and a separate-delivery notice. The payment prompt disappears.
6. Replay the event; it must not duplicate the successful payment or notification.

Also test cancellation, expiry, failed payment, underpayment, currency mismatch and invalid signatures. See [Bachs integration](bachs-integration.md).

### Step 5 — Delivery remains separate
A Bachs award-fee payment must not quote, book, or claim dispatch of a GIG shipment. Historical delivery records and admin recovery remain available for old Paystack orders; delivery payment for new awards is a later step.

### Step 6 — The rest of the network
Events + invitations/RSVP, exclusive opportunities, groups, and member posts — see `docs/plans/`.

## 3. What you cannot test in this environment

Be clear-eyed about these:

- **Sandbox acceptance requires Bachs credentials** and an externally reachable registered webhook. Local demo payments are explicitly simulated. Without verified confirmation the dashboard continues to say it is confirming, never that payment was received.
- **No real courier.** No GIG credentials exist and no API docs are in the repo. The adapter's field
  mapping is written against the documented public shape and is **unverified against a live
  account** — see `docs/gig-integration.md` for the first-call checklist. Every path and field name
  is env-overridable so a wrong guess is a config change, not a code change.
- **No email delivery** without `BREVO_API_KEY`.

## 4. Unit tests

```bash
npm test            # vitest — pure logic: status machine, money, quotes, permissions, adapters
npx tsc --noEmit    # type check
```

These need no database and no network. They are the only automated verification the payment and
courier paths get, so treat a failure there as blocking.

## 5. Handy checks

```bash
node scripts/verify-db.mjs         # which tables/columns the live DB actually has (read-only)
node scripts/build-setup-sql.mjs   # regenerate the bootstrap after adding a migration
```
