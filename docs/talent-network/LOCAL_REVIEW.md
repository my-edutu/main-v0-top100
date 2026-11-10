# Talent discovery: local review and release gates

Branch: `feat/talent-discovery-review-20261108` — Draft PR #7\
Original base: `72b56e6430a8f325c5f9877e91a0154a9668b4f6`\
Latest continuation incorporates repair `c68237c064f8e2b8418a736dea41fd531139af5c`.

This is not a production deployment. No production migration or member campaign has been run. Do not merge until real build, database and authenticated browser checks pass. Production remains Dokploy/self-hosted Supabase, not Vercel or the retired hosted database.

## 1. Isolated checkout

From an existing Top100 checkout, create a separate working copy without switching or discarding its work:

```bash
git fetch origin feat/talent-discovery-review-20261108
git worktree add -b review/talent-discovery ../top100-talent-review origin/feat/talent-discovery-review-20261108
cd ../top100-talent-review
npm ci
```

Use Node 22 and the lockfile. Read `AGENTS.md` and installed Next.js guidance. For an existing clean review worktree, fetch and fast-forward that review branch rather than creating another. Preserve uncommitted work before updating.

## 2. Isolated services and flags

Use a separate Supabase instance with the existing Top100 schema/Auth configuration and synthetic accounts. Do not point this workspace at production or copy real applicant files into fixtures, screenshots or logs. Configure existing application variables in private `.env.local` using that instance, and consult `docs/talent-network/review.env.example`.

```dotenv
TALENT_DISCOVERY_ENABLED=true
TALENT_DISCOVERY_LAUNCHED=false
TALENT_UPGRADE_EMAIL_ENABLED=false
```

The last two flags MUST remain false during review. Do not copy production email, payment or courier credentials. Local email sending must be blocked; reading a preview never sends it.

## 3. Review and apply all four SQL files in order

Prerequisites: the existing `profiles`, `awardees`, `opportunities` and `user_notifications` tables, and PostgreSQL with security-invoker views (15+). This extends the existing identities; it does not create another login system.

These are unapplied source SQL files, not a claim that migrations have run. Confirm the connection target before executing anything:

```bash
# Must be the isolated local/staging database, never production.
psql "$LOCAL_DATABASE_URL" -X -v ON_ERROR_STOP=1 -f supabase/schema/talent-discovery.sql
psql "$LOCAL_DATABASE_URL" -X -v ON_ERROR_STOP=1 -f supabase/schema/talent-discovery-constraints.sql
psql "$LOCAL_DATABASE_URL" -X -v ON_ERROR_STOP=1 -f supabase/schema/talent-discovery-privacy-guard.sql
psql "$LOCAL_DATABASE_URL" -X -v ON_ERROR_STOP=1 -f supabase/schema/talent-discovery-review-fixes.sql
```

The fourth file adds independent privacy revisions, strengthens the earlier checked API and permanently withdraws old introduction access after opt-out/unpublication/brief closure. It is mandatory for this candidate. Missing revisions fail closed with setup required. Old tabs must refresh before granting permission.

Do NOT apply any `scripts/talent-network/*.test.sql` harness to the application database; they are for a separate disposable synthetic database.

For eventual release, inspect the installed CLI with `supabase --help` and `supabase migration new --help`, generate a real migration filename, and include these four reviewed files in order. They contain transaction boundaries: do not wrap the concatenation in another unexamined transaction. Verify migration history, grants, RLS and the active Dokploy target. Do not apply this merely to make a local error disappear on production.

## 4. Run checks

```bash
node scripts/talent-network/contract-tests.cjs
node scripts/talent-network/api-tests.cjs
node scripts/talent-network/integration-checks.cjs
node scripts/talent-network/client-regressions.cjs
node scripts/talent-network/privacy-regressions.cjs
node --test scripts/talent-network/audit-regressions.cjs
node scripts/talent-network/audit-api.cjs
npm test
npm run lint
npm run build
npm run typecheck
npm run dev
```

The first two scripts contain the original 40 domain and 19 route/helper assertions. The structural check verifies the original homepage blob after removing the four additive integration lines. The continuation adds 26 domain/navigation and 12 API checks and retains 15 client and 12 privacy checks. Vitest wrappers and the branch workflow run the appropriate suites.

Client checks use actual hook/event-handler source but explicit React scheduling/network doubles. API tests double Auth/database transport/Next responses. None substitute for real browser, database, RLS or provider execution. Compare full-suite failures against the baseline rather than silently ignoring them.

### Disposable database harness

Use an empty throwaway PostgreSQL server that permits creating test roles/databases. Never use the production server:

```bash
createdb talent_network_test
psql -d talent_network_test -X -v ON_ERROR_STOP=1 -f scripts/talent-network/database.test.sql
psql -d talent_network_test -X -v ON_ERROR_STOP=1 -f scripts/talent-network/privacy-guard.test.sql
psql -d talent_network_test -X -v ON_ERROR_STOP=1 -f scripts/talent-network/audit-database.test.sql
```

The first script refuses existing application profile tables. The last refuses unexpected databases or profiles and checks the patch twice for idempotence. These test real SQL privileges, revisions, approvals, consent, introductions and audit rules against a minimal synthetic baseline, not the full application schema. Repeat the user journeys against isolated real Supabase afterward.

## 5. Review the actual screens

| Route | Inspect |
|---|---|
| `/` | Original content/order retained; two added talent/organisation sections. This continuation does not modify the homepage. |
| `/awardees` | Talent/archive modes, shareable filters, old cohort links, pagination, errors and empty states. |
| `/awardees/[slug]` | Existing recognition plus approved/consented portfolio; no draft leakage; return link restores filters. |
| `/dashboard` | Existing dashboard alongside the talent callout/shortcuts. |
| `/dashboard/me/profile` | Five-step editor, checklist, private preview, unfinished drafts, autosave and explicit conflict choices; existing profile tools remain. |
| `/dashboard/me/settings` | Discovery, introductions, promotion and email opt-out are distinct, explicitly saved choices. |
| `/dashboard/discover/members` | Shared discovery service and existing archive. |
| `/dashboard/discover/opportunities` | Real listings and original Edutu section. |
| `/dashboard/applications` | Member-reported stages; a link click never counts as application submission. |
| `/dashboard/introductions` | Accept, decline, withdraw, report and self-reported outcome. |
| `/for-organisations` and `/for-organisations/request` | Service proposition and brief intake with clear terms, duplicate-submit handling and truthful confirmation. |
| `/opportunities` | Published public listings only. |
| `/admin/talent` | Profile/claim review, organisation qualification, introductions, outcomes and blocked email preview/release controls. |

Inspect 320, 375, 390, 768 and 1366 px widths, high zoom, keyboard, reduced motion, long text and image/network failures. Use the actual existing site CSS and authenticated shell, not only isolated components. Check inherited light/dark styles. No fresh full-app browser pass is claimed by the continuation.

## 6. Synthetic acceptance journeys

Use two approved linked members and two administrators, never real people as fixtures.

1. Save a talent draft with discovery off regardless of old default-true preferences. Save an unfinished project, partial year and half-typed URL; submission must still reject incomplete/unsafe public fields.
2. Enable discovery/introduction permission explicitly. The unreviewed draft stays private. An independent admin approves the submitted revision before it appears publicly.
3. Edit an approved profile. The previous approved snapshot remains public; new claims are not automatically checked. Check one academic/project claim with a private reference and bounded public description; revision changes cannot inherit the old check.
4. Delay a save while continuing to type or add work. Keep newer edits and save them next. Do not strip a trailing space from focused typing. Failed saves retain the form and pause automatic retries.
5. Edit separate fields in two tabs, then the same field. Merge independent edits and require a choice for overlap. A privacy response must not advance the editor's unreconciled draft revision. Test unsaved same-tab links, page exits and browser history separately.
6. Withdraw discovery in one tab; a stale grant in another must fail with 409. Emergency withdrawal remains restrictive and preserves the latest email opt-out. Saved checkbox state must be distinguished from unsaved choices.
7. Submit a brief with clear compensation. Admin qualification precedes a proposed introduction. Another member cannot accept it by guessing its ID. Before acceptance contact access is denied; after acceptance authorised access is audited.
8. Mark an introduction delivered only after it occurred. Then withdraw, unpublish or close the brief. Re-enabling, republishing or reopening must not restore that old introduction's contact access. A genuinely new introduction requires fresh permission.
9. Outcomes remain self-reported until independently confirmed; confirmation alone does not grant public-story permission or justify inflated counts.
10. Open `/awardees?year=2024`, share a talent-filter URL, view a profile and return. Keep archive/filter context; reject external return destinations.
11. Preview the member email; no real sending from local review. Disable the feature and regress sign-in/claim, profiles, awards/checkout, delivery, festival admission, groups and administrative roles.

## 7. Member announcement — after a genuine launch only

Subject: **Your Top100 profile now supports talent discovery**.

The message invites members to update skills, experience, projects and interests, optimise their professional presence and choose visibility. Discovery is not automatically enabled and opportunities are not guaranteed. Settings provides discovery/promotion/introduction controls and a separate talent-email opt-out.

Only after reviewed deployment and real signed-in checks on the canonical production site: configure the verified Brevo sender, explicitly enable launch/sending gates, and have a current superadmin review the preview and type the required confirmation. Start with a small batch and reconcile provider receipts. Provider acceptance is not inbox delivery.

Eligible recipients are approved linked members with verified Auth email addresses. Respect opt-outs and relevant existing alert preferences. Recipient/address reservations prevent automatic duplicate attempts. Reconcile failed/unknown attempts with provider evidence; do not clear reservation rows simply to retry. No campaign is automatically scheduled and no email has been sent by this review pass.

## 8. Rollback and deferred work

Disable email sending first, then launched status and talent discovery. Redeploy the previous reviewed image if needed. Preserve additive submissions/consent/audit tables; do not delete them as a rollback shortcut or restore the unversioned privacy setter. Disable any external scheduler deliberately added later. Previously disclosed data and third-party caches cannot be recalled by a flag.

The continuation retains the newer branch repair, including authenticated resource validation, shared mutation locking, unsaved-link guarding and existing regression tests. See `CRITIQUE_AND_FIXES.md` for reconciliation and fresh evidence.

Organisation self-service, AI matching, bulk document access, curated collections, Talent Passport exports, deeper Edutu identity integration and public impact reporting are not claimed complete. No undocumented Edutu API/SSO contract was invented. The managed pilot and its release gates come first.
