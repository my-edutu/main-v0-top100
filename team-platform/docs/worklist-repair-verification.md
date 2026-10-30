# Worklist repair verification — 30 October 2026

## Live audit before repair (read only)

The configured shared API is self-hosted at `supabase.top100afl.com`. It has 3,550 worklist rows, 2,663 active rows and 887 archived rows. Active rows represent 889 public awardees. There are 888 duplicate identity groups, 1,774 extra active projections and 152 identities with competing active owners. 144 duplicate groups have follow-ups; ten have commission entries. These counts were obtained by paginating all records, rather than relying on the REST 1,000-row default.

The directory view also lacks `source_year` in the live schema. The migration repairs that legacy view and the duplicate identity constraint together.

## Local verification

- Team Vitest: 9 tests passed.
- Primary admin worklist API: 4 tests passed (authorization, scope/capacity validation, atomic distribution contract, correct reassignment RPC arguments).
- Real PostgreSQL 16 integration: 6 tests passed, covering history/commission preservation, competing-owner repair, repeated and concurrent loads, missing emails, shared emails on different canonical identities, verified-order exclusion, capacity enforcement, unauthorized actors, manual reassignment, legacy view upgrade, idempotent repair, integer/text year compatibility and case-insensitive country scope.
- Both applications' TypeScript checks passed.
- Team production build passed. The existing multiple-lockfile workspace-root warning remains.
- Rendered the actual dashboard and admin worklist components in an isolated local fixture harness. Tested desktop and 375px layouts, pagination, payment filter resets, reassignment form submission, repeated distribution feedback and mobile Follow-Ups navigation. Both screens had no page-level overflow at 375px. These are fixture interaction checks, not authenticated live end-to-end testing.

An independent code review identified integer-year and country-casing compatibility gaps. Both were fixed and are covered by the sixth PostgreSQL test; follow-up review found no remaining blocker. Targeted lint completed with zero errors and three warnings (the request-loading effect and existing generic query/image patterns).

## Main application full test suite

The full run reported 238 passing test files, 14 failing files and one skipped file: 1,508 passed tests, 22 failures and 11 skipped tests. The failures are in unchanged application areas; several are timeout failures. The worklist API tests were subsequently added and passed separately. No claim is made that the entire repository suite is green.

Failing tests from that run:

-  tests/admin/nav-config.test.ts > navGroups > gives every item a distinct icon, so no two sections look alike
-  tests/admin/password-recovery.test.ts > password recovery > implements both recovery Supabase operations
-  tests/admin-social/generate-route.test.ts > /api/admin/social/generate > reloads public profile server-side and returns generated text only as a draft
-  tests/awards/payment-api.test.ts > Bachs member routes > passes verified member and currency to the server service
-  tests/awards/payment-api.test.ts > Bachs member routes > does not expose provider errors or secrets
-  tests/awardees/bulk-update.test.ts > updates a large selection without exceeding 100 IDs per gateway query
-  tests/dashboard/award-copy.test.tsx > award payment copy > labels the physical award fee and starts checkout for the selected currency
-  tests/dashboard/profile-editor.test.tsx > complete profile editor > renders every text field and the current BIO together
-  tests/dev-dashboard/handler.test.ts > interactive local dashboard demo API > simulates the Bachs award-fee contract without delivery data
-  tests/dev-dashboard/handler.test.ts > interactive local dashboard demo API > creates a template cover without changing the original member avatar
-  tests/dev-dashboard/handler.test.ts > interactive local dashboard demo API > renders valid demo portraits through the shared cover renderer
-  tests/groups/whatsapp-assignment-route.test.ts > POST /api/member/whatsapp-group > returns a retryable setup response when the assignment table is missing
-  tests/events/live-calendar.test.ts > live AFL calendar > uses edited Google event details, including its conference link and time
-  tests/magazine/webhook.test.ts > isolated magazine Bachs webhook > processes only a fully matching signed magazine attempt through the magazine RPC
-  tests/portfolio-cover/create-cover-route.test.ts > POST /api/member/portfolio-cover/generations (template cover upload) > lets an unpaid member render and save the AFL cover
-  tests/portfolio-cover/render-cover.test.ts > deterministic Top100 magazine cover renderer > renders the supplied 2026 banner at its original 4:5 dimensions
-  tests/portfolio-cover/render-cover.test.ts > deterministic Top100 magazine cover renderer > places the uploaded portrait inside the template image area and keeps the banner outside it
-  tests/uploads/image-processing.test.ts > processUpload > downscales an oversized photo to the preset's longest edge
-  tests/uploads/image-processing.test.ts > processUpload > caps the longest edge regardless of orientation
-  tests/uploads/image-processing.test.ts > processUpload > re-encodes to webp and reports a matching content type and extension
-  tests/uploads/image-processing.test.ts > processUpload > produces meaningfully fewer bytes than the original upload
-  tests/uploads/image-processing.test.ts > processUpload > strips EXIF, which carries GPS coordinates on phone uploads

## Rollout status

The user applied the complete repair SQL through the self-hosted SQL editor. A subsequent read-only audit confirmed:

- 889 active worklist rows and zero duplicate canonical awardee groups.
- Zero competing owner groups and zero active assignments on archived records.
- 632 active assignments after conflicting assignments were closed.
- The repair audit records 1,774 duplicate rows archived; all 3,550 worklist rows remain stored (2,661 archived in total).
- All 149 follow-ups and ten commission ledger entries remain present, matching the pre-repair audit.
- The directory now exposes source_year successfully.

Application code remains in the local checkout; deployment of the admin and team applications and an authenticated end-to-end workflow check remain outstanding. The database repair itself is applied and verified.

## Reproducing PostgreSQL tests

Use a dedicated disposable database with no existing public/auth schema:

```sh
WORKLIST_TEST_DATABASE_URL=postgresql://USER@localhost:PORT/worklist_test node --test team-platform/tests/integration/worklist.test.mjs
```

The test creates real base team schema and functions, seeds duplicate identities and history, then executes the repair and assignment RPCs. It does not connect to the live Supabase API.
