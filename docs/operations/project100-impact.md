# Project100 impact groups

## What is implemented

Member entry: `/dashboard/me/project100-scholarship`. Admin workspace: `/admin/project100-scholarship`.

The member journey is overview → geographic group → local plan → contribution review → Bachs checkout → verified confirmation → supporters and impact journal. Nigeria has 36 state groups plus FCT. International members choose among six country destinations. Members join without paying. New member contributions must belong to their joined group; authoritative admins may top up any group. Previous reservations and contributions retain their original destination when a membership changes.

One-click grouping preserves current memberships and assigns approved Nigerian members only when country and state are unambiguous in a submitted, consenting Project100 application. Members without a programme opt-in, missing locations and international destination preferences are reported for members to resolve. Draft or non-consenting applications are not used for automatic grouping. Grouping never reallocates money.

Admins can refresh the six-country recommendation from current-cohort awardee data and choose six different African country destinations. Changing destinations closes retired country groups to new contributions while preserving membership, contribution and delivery history.

## Country evidence, 31 October 2026

A read-only query inspected all 1,808 `awardees` records. There were 47 records without a country. Country spelling/language aliases and unambiguous city entries were combined in analysis; ambiguous entries were excluded. Counts are awardee records, not funded students. Nigeria is handled separately.

| Country | 2026 cohort | All cohorts |
| --- | ---: | ---: |
| Ethiopia | 63 | 83 |
| Ghana | 42 | 43 |
| Cameroon | 39 | 39 |
| Kenya | 32 | 34 |
| Benin | 27 | 27 |
| Democratic Republic of the Congo | 27 | 27 |

## Activation

1. Review/apply `supabase/migrations/20261031012629_project100_impact_groups.sql` through the existing database release process. This adds separate support tables and leaves previous application/grouping records intact. It seeds the geographic groups and creates a private Supabase `project100-images` bucket when the storage schema is available.
2. When `MEDIA_STORAGE_PROVIDER=r2`, the existing private R2 bucket is used for the logical `project100-images` bucket. The application stores logical image paths and returns short-lived signed URLs. Confirm the existing R2 credentials can upload/read the private bucket. With Supabase storage, confirm the private bucket exists with the 5MB/WebP restriction. Original JPG/PNG/WebP uploads are decoded, resized, stripped of metadata and re-encoded as WebP on the server.
3. Reuse the configured Bachs API key, API base URL, checkout host allowlist and trusted site origin. Register a **dedicated** destination at `/api/webhooks/bachs-project100`. Subscribe to `checkout.completed`, `collection.succeeded`, `refund.created`, `refund.paid`, `dispute.created` and `dispute.updated`. Store its signing secret in `BACHS_PROJECT100_WEBHOOK_SECRET`; do not reuse another destination's secret. The key needs checkout create/read and payment read permissions.
4. Verify with sandbox credentials and signed events before setting `PROJECT100_CHECKOUT_ENABLED=true`. Default is disabled. Group participation, plans and journals can operate before collections open. Never put a secret in a `NEXT_PUBLIC_` variable.
5. Deploy the application using the normal release process. This implementation session does not apply the migration to production, create a live hosted checkout, send a payment, or configure a live webhook destination.

NGN contributions have a programme minimum of ₦1,000. USD contributions have a $1 minimum and use Bachs' adaptive currency checkout. Original contribution amount/currency, purpose, reference, checkout and successful charge must match authenticated provider evidence. NGN and USD totals remain separate; the app invents no exchange rate. These rules follow [Bachs checkout pricing and confirmation](https://docs.bachs.io/guides/checkout/checkout-sessions) and [signed webhook delivery](https://docs.bachs.io/guides/webhooks/overview).

## Financial operations

Raised totals include confirmed contribution allocations. Pending and review records do not contribute. A refund or dispute conservatively freezes the affected contribution for admin/provider review, including partial refunds; late success cannot automatically release it. If support had already been delivered, the remaining allocation can show a shortfall and further spending is blocked until funding is sufficient. Use the contribution reference in the admin table to investigate in Bachs; do not manually mark a payment paid.

Remaining amounts are programme allocations, not a bank's withdrawable balance. Processing/FX/settlement costs must be covered or reconciled by the programme operator before real delivery; they are not fabricated from gross payments. There is no automatic bank payout. “Record support delivered” records a delivery already made, with an admin-only receipt/document reference. Spending is append-only through the app, idempotent and checked under a group lock against confirmed same-currency funding. A group/project foreign key prevents attaching spending to another group's project.

Member photos and captions are visible to signed-in approved members. Members can post only to their joined group and remove their own updates; admins can publish and moderate across groups. Deleted updates disappear from the journal; already issued image URLs expire within 15 minutes. Supporter lists respect anonymity and organisation attribution; donor contact details, provider identifiers and receipt references are not disclosed to other members.

Supporter, contribution, journal and delivery lists show the latest 100 records; total funding uses all records. Country ranking reads the full awardee table with pagination. The current API deliberately does not send notifications or messages during joins or grouping.

## Verification

Run `TOP100_IMPACT_TEST_DB=top100_impact_test_<suffix> npx vitest run tests/project100/impact-*.test.ts tests/payments/bachs-checkout.test.ts` against a disposable local Postgres database on `/tmp`. The opt-in DB suite refuses database names outside this prefix and recreates only that test database's public schema. Existing cluster roles `anon`, `authenticated` and `service_role` must be available. Without the opt-in variable, database integration tests are skipped; pure/route/provider-boundary tests still run.

Browser evidence under `output/playwright/` uses the explicit local dashboard demo and intercepted sample API fixtures. It demonstrates layout and interaction, not production data connectivity or live payment acceptance.

The initial full-suite run found 11 failures in 10 files, all reproduced in an untouched `git archive HEAD` baseline: `admin/nav-config`, `admin/password-recovery`, `admin-social/generate-route`, `awards/payment-api` (two tests), `dashboard/award-copy`, `dashboard/profile-editor`, `events/live-calendar`, `groups/whatsapp-assignment-route`, `dev-dashboard/handler`, and `magazine/webhook`. These are separate from Project100 verification.

Final focused verification: **86 tests passed** across 16 files, including the opt-in local database suite. The final production build, type checking and scoped lint passed. The full repository run had 13 failures: the 11 baseline failures above and two existing demo cover-render tests timing out at 5 seconds; those two passed with a 30-second diagnostic timeout. Member screens were checked at 430px and 1440px; a separate local component harness checked the admin forms and operations using sample data. Browser tests stopped at contribution review and used no real checkout.

Independent review fixes include explicit participation before bulk grouping, strict state matching, provider reconciliation before replacing an expired checkout, and retryable resolution of reference-only/early webhooks. Duplicate distinct charges freeze a contribution for review and retain both charge identifiers in the audit trail. Private photo failures retain the journal caption and do not hide confirmed funding. Normal image deletion removes the object; failed insert cleanup is attempted and a private storage path is logged for operator cleanup only if storage is also unavailable.
