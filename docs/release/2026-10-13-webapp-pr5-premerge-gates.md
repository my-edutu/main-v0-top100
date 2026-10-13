# Top100 web app — PR #5 pre-merge release gates

**Target:** `main` | **Branch:** `audit/webapp-stabilization-2026-10-13` | **State:** Draft / NO-GO until every blocking item below is verified.

This is a review and release checklist, **not** an indication that the listed validations passed. Run all mutating tests in staging/test accounts. Do not use production payment charges or send real bulk messages while testing.

## 1. Security and privileges — blocking

- [ ] Confirm anonymous requests to `/api/awardees`, `/api/awardees/:id`, and `/api/awardees/search?q=...` return only public records and no private fields.
- [ ] Anonymous `scope=admin` access to events, announcements, sections, settings, and feature requests is rejected.
- [ ] User, editor, admin, and superadmin test accounts cannot elevate privileges outside their authorized roles.
- [ ] Suspend and reactivate a member; verify login, dashboard, **all** authenticated API routes, refresh tokens, and recovery behavior. Existing JWTs must not bypass a ban.
- [ ] Simulate a failed profile write after Supabase Auth ban/unban, and a failed Auth operation after a profile update; reconcile any partial state.
- [ ] Ensure setting an account inactive does not accidentally change public directory visibility, and deactivating a hidden profile does not reopen it.
- [ ] Audit PostgREST grants, service-role usage and cross-origin mutation controls for remaining older routes.
- [ ] Rotate credentials that appeared in committed `.env.example` history and rotate previously committed WhatsApp links; only place fresh credentials in the relevant deployment's secret store.
- [ ] Verify admin access to private settings remains correct without exposing secrets in public API responses, browser logs or page HTML.

## 2. Database and configuration — blocking

- [ ] Back up the database and verify staging is a representative copy with secrets removed.
- [ ] Apply `supabase/migrations/20261013160000_account_access_status.sql` to staging **before** deploying this branch.
- [ ] Confirm `profiles.account_status` defaults to `active`; check appropriate indexes, constraints and permission grants.
- [ ] Apply all earlier migrations in order; test rolling forward twice and rehearsing recovery.
- [ ] Set `WHATSAPP_GROUP_1_INVITE_URL`, `WHATSAPP_GROUP_2_INVITE_URL`, and `WHATSAPP_GROUP_3_INVITE_URL` as **server-only** deployment variables after rotating invitations.
- [ ] Confirm missing group configuration returns a friendly retryable error, then verify assigned groups remain stable and existing assignment rows retain their meaning.
- [ ] Confirm production environment settings align with `https://supabase.top100afl.com` and all preview deployments use correctly scoped credentials.

## 3. CI and preview deployments — blocking

- [ ] All unit, integration, lint and TypeScript checks pass for the **exact PR head**.
- [ ] Resolve high/critical dependency audit findings with vetted package/lockfile updates; don't mute the release gate.
- [ ] Vercel and Netlify preview checks pass or the intended platform is explicitly chosen and the unused check intentionally retired.
- [ ] Verify the preview build does not silently pre-render empty dynamic data using placeholder Supabase credentials.
- [ ] Confirm the live production domain continues to point to the previous stable deployment until go-live.

## 4. Member and payment end-to-end — blocking

- [ ] New signup, OTP/email verification, sign-in, lost password, approval, onboarding and return-to-dashboard.
- [ ] Awardee claim and profile editing: own data only, correct directory visibility and public caching.
- [ ] Award payment in NGN and USD: create checkout, provider redirect, success/failure, delayed webhooks, duplicate webhooks, interrupted checkout, pending reconciliation, under/overpayment, retry, refunds.
- [ ] Verify failed/unconfirmed payments never present as paid, and paid awards are never charged twice during retries.
- [ ] Magazine feature: guest and logged-in submissions; verify price/currency server-side, application recovery, paid/unpaid state, Turnstile and refund paths.
- [ ] Email, notification, WhatsApp and calendar links work with real accounts. Test expired and unavailable external links.

## 5. Admin at campaign scale — blocking

- [ ] Import a staging cohort larger than 1,800 records; verify deduplication, names, non-Latin text, partial import recovery and exports beyond 1,000.
- [ ] Admin award orders: verify all records and attempts beyond PostgREST limits, data accuracy, sorting, filters, pagination and no disappearing paid orders.
- [ ] Feature requests: approve/reject/edit, price/payment verification, correct role restrictions and no client-forged paid status.
- [ ] Admin user management: suspend/reactivate, role changes, protected superadmin accounts, error recovery, no accidental self-lockout.
- [ ] Broadcast test to a **small, safe staging audience**, then verify batching or capacity for 1,800+ inbox rows, partial failure handling, duplicate protection and correct recipient totals.
- [ ] Admin content workflows: drafts, publish, unpublish, scheduling, events, speakers, resources, metrics, reports and feedback.

## 6. Mobile, accessibility, speed and availability — blocking

- [ ] Browser tests at 320, 375, 390, 428, 768, 1024 and 1366px; cover Safari iOS and Chrome Android.
- [ ] Test admin tables, forms, dialogs, menus, keyboard focus, screen-reader labels, zoom, reduced motion and touch target sizes.
- [ ] Test under slow 3G/high latency, failed requests, expired cookies and stale/cached responses. Verify loading, empty, retry and offline states.
- [ ] Record p75 LCP, INP, CLS and API response times on meaningful member and admin journeys; fix regressions relative to baseline, not screenshots alone.
- [ ] Run bounded load tests with expected onboarding/concurrent access, database connection and provider rate limits.
- [ ] Verify error monitoring for frontend exceptions, HTTP 5xx, payment retries, OTP email deliverability and member support escalations.

## 7. Go-live and recovery

- [ ] Reviewer independently approves the final diff; all checks green on the exact commit and blockers documented.
- [ ] Apply migrations first, configure private env vars and verify staging before production release.
- [ ] Capture before/after screenshots and test accounts' outcomes; no production private data in artifacts.
- [ ] Release behind controlled promotion and check major flows immediately afterward.
- [ ] Assign a rollback owner and establish whether application rollback remains compatible with additive schema changes.
- [ ] Monitor error rates, payment webhook failures, sign-ins and checkout completion following release.

**Decision:** NO-GO until the release owner confirms every critical item; do not treat passing unit tests alone as proof of full functionality.
