# Top100 AFL Launch Runbook — September 5, 2026

## Current decision

**AMBER — code is release-candidate ready, production configuration and a real preview smoke run are not complete.**

Do not promote to production until every item in the launch sequence below is green. If the payment and courier credentials cannot be verified before launch, launch the member portal with award checkout disabled and enable fulfilment in a later release.

## Verified locally

- 64 Vitest files and 670 tests pass.
- TypeScript typecheck passes.
- ESLint completes with no errors under the repository policy.
- Next.js production build completes successfully.
- Production server smoke checks return the expected results for public, protected, admin, retired, and claim-directory routes.
- Browser checks cover member sign-in, password recovery, responsive cookie consent, dashboard updates, upcoming opportunities, BIO edit and public BIO, Impact Project submission, and award address/review/payment handoff.
- No live payment or shipment was initiated.

## Launch sequence

1. Free at least 5 GiB on the deployment workstation. The current volume is at 99% capacity; generated caches have already failed when the free space fell below 1 GiB.
2. Configure the baseline production variables in the Vercel project:
   - `NEXT_PUBLIC_SITE_URL`
   - `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
   - `TURNSTILE_SECRET_KEY`
   - `BREVO_API_KEY`
   - `BREVO_SENDER_EMAIL`
   - `ADMIN_NOTIFICATION_EMAIL`
3. Run `npm run check:production`. It must exit successfully without missing-key output.
4. Choose the award scope:
   - Controlled member launch: keep `AWARD_CHECKOUT_ENABLED=false` and do not advertise award delivery as live.
   - Full award launch: set `AWARD_CHECKOUT_ENABLED=true`, configure Paystack and GIG below, and complete a provider sandbox/test transaction before enabling production checkout.
5. For the full award scope, configure:
   - `PAYSTACK_SECRET_KEY`
   - `GIG_ENABLED=true`
   - `GIG_API_BASE_URL`
   - `GIG_API_USERNAME`
   - `GIG_API_PASSWORD`
   - `GIG_SENDER_NAME`
   - `GIG_SENDER_PHONE`
   - `GIG_SENDER_ADDRESS`
   - `GIG_SENDER_CITY`
6. Run `npm run check:launch`. It must exit successfully for a full member-plus-award launch.
7. Supply an approved test-only address as `LAUNCH_SMOKE_EMAIL`. Do not use a real member address without explicit consent.
8. Preview the intended records without writing them:

   ```bash
   LAUNCH_SMOKE_EMAIL='approved+launch-smoke@example.com' npm run launch:smoke -- --phase=prepare
   ```

9. Prepare the labelled invite and opportunity only after confirming the address and target Supabase project:

   ```bash
   LAUNCH_SMOKE_EMAIL='approved+launch-smoke@example.com' npm run launch:smoke -- --phase=prepare --apply
   ```

   The one-time code is written with mode `0600` to `.launch-smoke/credentials.json`; it is not printed to the terminal or committed.
10. Deploy a Vercel preview from an authenticated Vercel account. Do not promote it yet.
11. On the preview, use the approved test member to complete: claim profile → sign in → dashboard update → BIO edit/public BIO → opportunity save/apply → Impact Project submission → award quote. Stop before a live payment unless test-mode provider credentials are confirmed.
12. After signup, create the labelled welcome notification:

   ```bash
   LAUNCH_SMOKE_EMAIL='approved+launch-smoke@example.com' npm run launch:smoke -- --phase=finalize --apply
   ```

13. Confirm Turnstile rejection and success, password-reset email delivery, admin notification delivery, Paystack webhook signature handling (if enabled), and GIG quote response (if enabled).
14. Record the deployed commit SHA and current environment-variable revision, then promote the verified preview to production.
15. Repeat the read-only smoke checks on production. Watch authentication failures, API 5xx rates, email delivery, payment webhooks, and courier errors for the first hour.

## Rollback

- Keep the previous Vercel production deployment available for instant rollback.
- If only award fulfilment fails, set `AWARD_CHECKOUT_ENABLED=false` and redeploy; keep the member portal online.
- If authentication, profile persistence, or authorization fails, roll back the entire deployment rather than accepting new claims.
- Do not delete member, payment, or shipment records during rollback. Reconcile them by provider reference after service is stable.

## Stop conditions

- Either readiness command exits non-zero.
- Preview claim/signup cannot be completed with a test-only record.
- A private dashboard route is accessible without authentication.
- Turnstile or transactional email is unavailable in production.
- Award checkout is enabled without verified Paystack webhook and GIG quote behavior.
