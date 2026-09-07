# Selection hardening verification — 7 September 2026

This records observed runs, not an unconditional production-readiness claim. See `ASSURANCE_AUDIT_2026-09-07.md` for remaining critical release blockers.

## Initial hardening commit: b252c2447cb91d364a9ddd9f2833c0825d4ba2d5

- Selection Engine Diagnostics, run 34132433598 / #30: **success**. The real Vitest suite passed **638 tests across 56 files**. Changed-line lint and Next.js production build / TypeScript passed.
- Selection assurance database checks, run 34132433738 / #1: **success**. Applied all six selection migrations to disposable PostgreSQL 17.6 and executed **22 passing assertions** covering verification, stale revision rejection, independent publication, committee gates, transaction rollback after an injected audit failure, token/ranking invalidation, current-policy counts and browser-role permissions.
- Repository Quality Gate, run 34132433648 / #142: **failure overall**. Tests, changed-line lint, migration checks and build passed. The dependency regression gate correctly failed on the newly recognized vulnerable Browserslist resolution. This was not hidden or added to the exception list.
- The measured pre-existing repository lint debt was 162 errors and 453 warnings in 189 files. Changed-line success is not a globally clean lint result.

These runs build against the PR #3 base, not the latest main branch. Database scaffolding is a minimal Supabase-compatible test environment, not hosted Supabase/Storage/Auth/Google integration validation. It starts empty and does not prove migration safety for existing live records. The SQL checks are not concurrent load or crash-recovery stress tests.

## Dependency repair

The maintainer advisories GHSA-73wf-gq98-2v4g and GHSA-c83g-rgw3-j3cx identify 4.28.7 as the patched floor. A temporary branch-scoped job regenerated the lockfile using npm rather than manually inventing package checksums:

- Preparation run: 34133325322, job 101778410243, source commit 43c64a9fa7a832d3688c5c4f2ec57e5f884d874d.
- Browserslist: **4.28.6 -> 4.28.9**.
- Supporting resolutions: baseline-browser-mapping, caniuse-lite, electron-to-chromium, node-releases and update-browserslist-db.
- Only `package-lock.json` changed during resolution: 23 lines added and 23 removed. Root package requirements did not change.
- `npm ci --ignore-scripts` validated lockfile resolution and integrity. The existing dependency regression script passed without modifying its policy.
- Generated lockfile blob: `9d65205b650b945bf23cbe7c125c37cbf015989d`.
- The temporary write-enabled maintenance workflow is removed in the commit that adopts the reviewed lockfile. No branch was automatically advanced by that workflow.
- A lockfile regression test now checks all Browserslist resolutions against the patched version floor.

**Security debt remains:** the preparation audit reported 31 total findings (28 moderate and 3 high), with the existing high baseline linked to GHSA-ggr8-5vv4-36mx through deepmerge-ts / @prisma/config / prisma. A passing regression gate means no new high/critical findings relative to the existing policy, not zero vulnerabilities. The deepmerge-ts advisory requires a major-version fix (8.0.0); compatibility and actual reachable exposure need a separate evidence-backed dependency change, not a blind force upgrade.

Fresh test/build/database results for the commit adopting this lockfile must be checked on that exact SHA and recorded in PR #4. Earlier successful results are not transferable by assertion.

## Release status

**Still draft / NO-GO for real-applicant production decisions.** No hosted migration, production activation, real issuer verification, browser accessibility evaluation, independent code review, or 120+ synthetic provider-backed pilot is claimed. Current-main integration, complete-cohort ranking, all-document reconciliation, fenced workers, neutral cutoff ties, multilingual equivalence calibration and a working appeal/retention process remain mandatory.
