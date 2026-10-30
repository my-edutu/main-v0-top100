# Sales Worklist Repair Implementation Plan

> Implement inline using the existing checkout; preserve unrelated changes.

**Goal:** Remove duplicate active work items and competing ownership, prevent repeated shuffle duplication, and make the sales and admin workspaces usable.
**Architecture:** Shared transactional PostgreSQL assignment RPCs; primary app admin controls; independent team app sales interface.
**Tech stack:** Existing Next.js 16, React 19, TypeScript, Supabase and PostgreSQL.
**Spec:** `docs/superpowers/specs/2026-10-30-sales-worklist-repair-design.md`

## Constraints

Preserve commission/payment/follow-up history. Never match people by name or shared contact details. Capacity is per active sales rep. Historical money attribution never moves. Keep central-admin and rep permissions intact. Read installed Next.js docs before edits.

## Review focus

Concurrent shuffles; duplicate rows owned by different reps; paid duplicate with activity elsewhere; same email on distinct canonical identities; stale country/page fetches.

## Tasks

- [x] Reproduce duplicate insertion and ownership in a local PostgreSQL integration test. Add a transactional archive repair and a unique active public identity index. Update the pool loader to target this index and make scope/settings atomic. Verify repeated, concurrent, paid and capacity cases.
- [x] Expand central worklist API with owner/assignment visibility and counts; expose atomic assignment controls. Refactor the client request lifecycle, stable paging, pending states and result summary; verify authorization and request validation.
- [x] Fix forced random sales directory sorting and date/contact inconsistencies. Improve overview hierarchy and responsive directory metadata; keep real service data and working destinations.
- [x] Run both test suites/typechecks, team production build, local database integration tests and representative rendered UI checks. Document exact live rollout status and remaining limitations.

## Execution record

Implemented the transactional repair, explicit identity conflict handling, atomic country/capacity distribution, primary-admin reassignment and owner filters. Preserved historical rows and commission attribution; canonical detail views include earlier conversations. The legacy directory view required a source_year upgrade, verified against both the live schema and local PostgreSQL. Sales UI now prioritizes follow-ups and first contacts, supports stable sorting, readable progress and working mobile navigation. Fixed Tailwind variant class extraction.

Both application typechecks, team build, nine team unit tests, four primary admin API tests and six real PostgreSQL tests passed. Full primary application test suite reported 22 failures in unchanged areas; see team-platform/docs/worklist-repair-verification.md for exact names. Desktop and 375px fixture interaction checks passed. The user subsequently applied the repair SQL. Live read-only verification confirms 889 active worklist rows, zero duplicate identity/competing-owner groups, 632 active assignments, 1,774 rows archived by the repair, and all 149 follow-ups/ten commission entries retained. Application deployment and authenticated end-to-end verification remain outstanding.
