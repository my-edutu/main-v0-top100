# Talent discovery: local review and release gates

Review branch: `feat/talent-discovery-review-20261108`
Base inspected: `72b56e6430a8f325c5f9877e91a0154a9668b4f6`

This branch is not a production deployment. No production migration or member campaign has been run. Do not merge until the real build, database and authenticated browser checks below pass.

## 1. Open an isolated working copy

Run from your existing Top100 checkout. These commands leave its current branch and uncommitted changes alone:

```bash
git fetch origin feat/talent-discovery-review-20261108
git worktree add -b review/talent-discovery ../top100-talent-review origin/feat/talent-discovery-review-20261108
cd ../top100-talent-review
npm ci
```

Use Node 22 and the committed lockfile. Read `AGENTS.md` and the installed Next.js guidance before changing framework code. Do not switch production hosting: this project uses Dokploy and self-hosted Supabase.

## 2. Configure a local or isolated staging database

Use a separate Supabase instance with the existing Top100 schema, Auth configuration and synthetic accounts. Do not point a review workspace at production. Keep real applicant documents and member data out of test fixtures, screenshots and logs.

Configure the existing application variables in a private `.env.local`, using the local instance URL and keys. Add the flags from `docs/talent-network/review.env.example`. Never copy production email, payment or courier credentials to the review workspace.

Required feature flags for review:

```dotenv
TALENT_DISCOVERY_ENABLED=true
TALENT_DISCOVERY_LAUNCHED=false
TALENT_UPGRADE_EMAIL_ENABLED=false
```

The last two flags MUST remain false. The email API also requires production mode, a fresh superadmin role, an approved canonical origin and sender configuration; it cannot release a campaign from localhost.

## 3. Review and apply the additive schema only to that isolated instance

Prerequisites: existing `profiles`, `awardees`, `opportunities` and `user_notifications`; Postgres with security-invoker views (15+). The code uses the same profile IDs and recognition records, not a second login system.

The new SQL is intentionally not installed or given a fake applied migration number. Review all three files, in this order:

1. `supabase/schema/talent-discovery.sql`
2. `supabase/schema/talent-discovery-constraints.sql`
3. `supabase/schema/talent-discovery-privacy-guard.sql`

For a disposable local database, apply them using your local database connection. Confirm the connection target yourself before running any SQL:

```bash
# LOCAL_DATABASE_URL must refer to the isolated local/staging database, not production.
psql "$LOCAL_DATABASE_URL" -X -v ON_ERROR_STOP=1 -f supabase/schema/talent-discovery.sql
psql "$LOCAL_DATABASE_URL" -X -v ON_ERROR_STOP=1 -f supabase/schema/talent-discovery-constraints.sql
psql "$LOCAL_DATABASE_URL" -X -v ON_ERROR_STOP=1 -f supabase/schema/talent-discovery-privacy-guard.sql
```

Do not apply `scripts/talent-network/database.test.sql` to the app database: that script builds its own synthetic baseline and refuses existing profile tables.

For the eventual release, use the installed Supabase CLI (`supabase --help`, then `supabase migration new --help`) to generate a real migration filename. Put all three reviewed SQL files into that one release migration in the order above. They contain explicit transaction boundaries, so do not wrap their concatenation in another unexamined transaction. Verify migration history and database grants/RLS before deployment. No hosted Supabase project or Vercel environment should be used for this production project.

## 4. Run the checks

```bash
node scripts/talent-network/contract-tests.cjs
node scripts/talent-network/api-tests.cjs
node scripts/talent-network/integration-checks.cjs
node scripts/talent-network/client-regressions.cjs
node scripts/talent-network/privacy-regressions.cjs
npm test
npm run build
npm run typecheck
npm run dev
```

The first script executes 40 domain assertions. The second executes 19 real route/helper assertions with explicit authentication, database and framework doubles. Those are useful unit checks, not a replacement for real authentication, RLS or provider verification. The structural script checks the added paths and verifies that removing the four talent additions from `app/page.tsx` produces the exact original homepage blob.

The existing Vitest wrapper runs the original three scripts as part of `npm test`. The two additional regression scripts are explicit blocking steps in the talent review workflow. They execute actual client/controller and route code using declared transport/hook doubles; they are not full browser or database verification.

The privacy guard is required by the revised member API. A missing guard returns an unavailable response; there is deliberately no unsafe fallback to the old unguarded consent write. Apply and test it before enabling the candidate. A normal settings save must include the confirmed visibility snapshot; emergency withdrawal carries no permission grants and preserves the current saved email preference. See `REVIEW_2026-11-08.md` for observed regressions and validation limits.

### Disposable SQL harness

Use an empty throwaway PostgreSQL server with permission to create test roles/databases. The harness uses synthetic data only and requires a fresh database named `talent_network_test`:

```bash
createdb talent_network_test
psql -d talent_network_test -X -v ON_ERROR_STOP=1 -f scripts/talent-network/database.test.sql
psql -d talent_network_test -X -v ON_ERROR_STOP=1 -f scripts/talent-network/privacy-guard.test.sql
```

Never run these commands on the production server. The harness checks real table/RPC privileges, stale writes, snapshot approval, claim scoping, introduction ownership, withdrawal, outcome confirmation and campaign reservations. Its minimal baseline is not the real application schema; run the same review journey against a real isolated Supabase instance afterward.

## 5. Review the screens

| Route | What to inspect |
|---|---|
| `/` | Existing sections unchanged, plus two new orange/amber talent and organisation sections when enabled. |
| `/awardees` | Discover Talent and Awardee Archive; filters, empty states, pagination and keyboard access. |
| `/awardees/[slug]` | Existing recognition page plus an approved, consented talent portfolio. No unreviewed changes should appear. |
| `/dashboard` | Talent update callout and shortcuts alongside the existing dashboard. |
| `/dashboard/me/profile` | Five-step talent editor, saved draft, stale-save recovery, existing profile tools retained. |
| `/dashboard/me/settings` | Discovery, introductions, promotion and email opt-out are separate choices. |
| `/dashboard/discover/members` | Same discovery service with the existing cohort directory preserved as archive. |
| `/dashboard/discover/opportunities` | Real opportunity listings plus the original Edutu section preserved verbatim. |
| `/dashboard/applications` | Member-reported application stages; clicking an external link must not mark an application submitted. |
| `/dashboard/introductions` | Accept, decline, withdraw, report and record an outcome. |
| `/for-organisations` | Organisation offer, process and existing partnership link. |
| `/for-organisations/request` | Two-step brief, clear compensation, duplicate-submit handling and truthful confirmation. |
| `/opportunities` | Public listings only; member-only rows never appear anonymously. |
| `/admin/talent` | Profile reviews, claim checks, organisation qualification, introductions, outcomes and email preview. |

Test 320, 375, 390, 768 and 1366-pixel widths, keyboard-only navigation, high zoom and reduced motion. Check the actual existing site CSS, not only isolated components. Test light/dark inherited styles, error/retry states, empty datasets and long names/text.

## 6. Walk through a complete synthetic journey

Use two ordinary approved, linked members and two administrators. Do not use real people as test fixtures.

1. Member A saves a talent draft. Discovery remains off despite any old recruiter-visible default.
2. Member A explicitly enables discovery and introductions. The unreviewed draft still stays private.
3. Admin B reviews the submitted revision. The reviewed snapshot appears in public discovery.
4. Member A edits it. The old reviewed snapshot remains public; unreviewed changes do not leak.
5. Check one academic/project claim with a private source reference and a safe public description. Changing the published revision must not carry the old check forward.
6. Submit an organisation brief with clear terms. An admin must qualify it before proposing a member introduction.
7. Member B must not be able to respond to Member A's introduction, even by changing request IDs.
8. Before Member A accepts, contact access is denied. After accepting, authorised admin access is recorded. Withdraw consent and verify that access is denied again.
9. Mark an introduction delivered only after it actually occurred. A member outcome starts self-reported; an independent admin confirmation does not automatically publish it.
10. Preview the member email. Local sending must be blocked. No real email should leave the review workspace.
11. Disable `TALENT_DISCOVERY_ENABLED`. Existing awards, delivery, events, Edutu and member functions must remain available.

For the revised editor, also test: type during a deliberately delayed save; change steps with unsaved privacy choices; cause a failed refresh; open two settings tabs, withdraw in one and attempt to save stale grants in the other. The stale write must return 409. Turning off discovery from that stale form must still remove discovery/introduction/promotion permission without undoing the saved email opt-out. Check same-tab link cancellation and browser Back separately: the unsaved-link guard does not claim to intercept every browser-history transition.

Also regression-test existing sign-in, account claim, profile updates, award checkout, delivery, festival admission, admin roles and member groups. This change does not certify every legacy route as secure.

## 7. Member email release — only after a real launch

Email subject: **Your Top100 profile now supports talent discovery**.

The message invites members to update skills, experience, projects and interests, review their visibility choices, and optimise their professional presence. It explicitly says discovery is not automatically enabled and that opportunities are not guaranteed. Settings provides discovery/promotion/introductions controls and a separate talent-email opt-out.

After reviewed deployment and a real signed-in end-to-end check on the canonical production website:

- Configure the existing verified Brevo sender and server-only API key.
- Set the two launch/sending gates explicitly, in addition to the feature flag.
- In Admin → Talent Network → Member email, a current superadmin reviews the preview and types the required confirmation.
- Send a small batch first. Reconcile provider receipts before continuing. Provider acceptance is not proof of inbox delivery.
- Only approved, linked members with verified Auth email addresses are eligible. Opt-outs and relevant existing alert preferences are respected.
- Reserved accounts and recipient address hashes prevent automatic duplicate attempts. Failed/unknown attempts require explicit provider reconciliation; do not clear rows just to retry.

No campaign is scheduled automatically. Viewing the page never sends email.

## 8. Rollback and later work

First turn `TALENT_UPGRADE_EMAIL_ENABLED=false`, then `TALENT_DISCOVERY_LAUNCHED=false`, then `TALENT_DISCOVERY_ENABLED=false`. Redeploy the prior reviewed code if needed. Preserve additive tables and audit records; do not drop member submissions as a rollback shortcut. Disable any external scheduler if one is deliberately added later. Previously delivered contact information, email and third-party search caches cannot be recalled by a feature flag.

This branch is the managed-discovery release. Organisation self-service accounts, AI matching, bulk CV/document access, curated promotional collections, automated Edutu account linking and public impact reports are not claimed complete here. The existing Edutu content is retained; no undocumented Edutu API or SSO contract has been invented. They remain separate, later reviewable work after the managed pilot.
