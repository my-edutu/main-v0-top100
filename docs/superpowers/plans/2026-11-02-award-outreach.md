# Award Outreach Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Give staff accurate awardee audiences, reusable outreach and SMTP exports/delivery with follow-up evidence.
**Architecture:** Pure audience/template functions, paginated service-role loaders, protected admin endpoints, service-only outreach tables, durable worker, and a dedicated client panel embedded in the awards screen.
**Tech Stack:** Next.js 16, React 19, Supabase/PostgreSQL, existing SMTP sender, Vitest.
**Spec:** docs/superpowers/specs/2026-11-02-award-outreach-design.md

## Global Constraints
- Default to 2026; directory supplies eligibility and verified evidence supplies payment truth.
- Preserve unrelated changes; no production email during verification.
- No historical click inference, client supplied email audiences, invented offer terms, or automatic retries of uncertain SMTP delivery.
- Authenticate admin reads and writes; protect mutations against cross-origin requests.

## Review Focus
- A paid person with duplicate directory rows or a different old order must never receive a payment request.
- Missing/truncated source data must fail visibly rather than inflate unpaid totals.
- Contacts without profiles need a working claim path and invite-code guidance.
- Exported contacts and queued recipients must respect suppression and unresolved payments.
- Concurrent workers and stale leases must never automatically redeliver an uncertain message.

### Task 1: Audience and templates
- [x] Write failing audience/CSV/template tests, run them, implement pure logic, rerun.
- [x] Add paginated directory/profile/order/payment loaders and safe unavailable states.

### Task 2: Persistence and APIs
- [x] Add isolated SQL tests before creating the service-only contact/template/campaign queue migration.
- [x] Add protected list, export, notes, template and campaign endpoints, tracked visit/stop routes and bounded worker.
- [x] Verify authorization, suppression, changing payment state and uncertain delivery.

### Task 3: Admin workspace
- [x] Add cohort metrics to the current metric grid and a responsive audience worklist, templates, preview, notes and campaign progress.
- [x] Verify types, scoped lint, full test suite and mobile/desktop rendering.
- [x] Request independent review, fix substantive findings, record deployment requirements.

## Execution ledger
- User explicitly requested implementation of the recommendations; continuing directly within that scope.
- Existing main checkout contains unrelated work. Created paul/award-outreach without moving or overwriting it. No commits requested.
- Existing aggregate funnel cannot identify individual clicks. New link visits are observational and historical status remains unknown.
- Task 1 complete: audience tests include explicit awardee identity, active/refunded verification, duplicate contact cooldowns and uncertainty holds. Pagination tested with 1,201 records and a later-page error.
- Task 2 complete: four real PostgreSQL tests pass in isolated top100_outreach_test_20261102. Admin/origin/export/SMTP/worker regression tests pass; no production email or schema mutation occurred.
- Review: independent reviewer identified five substantive issues. All accepted and addressed with regressions: active/refunded payments, explicit awardee identity, duplicate cooldowns, copy-only tracking and SMTP failure classification/resolution.
- Ruling: new delivery request is an independent domain, delegated through dispatching-parallel-agents. Keep genuine award-fee payment separate from delivery. Supplied public Bachs link has an editable amount and no order reference; preserve a pending/manual-verification state instead of inferring settlement.
- Live read-only evidence: directory contains 1,341 eligible 2026 people, 419 from 2025 and 46 from 2024; no 2023 entries. Migration is not installed in production. Delivery named by user is quoted at 904285 kobo without payment; its award fee has canonical successful USD20 evidence.
- Visual verification: actual outreach components bundled into an isolated local fixture after Next/Turbopack failed; inspected at 390px and desktop widths, including focus-managed notes and keyboard dismissal. Temporary source routes removed.
- Initial full suite had resource-related image/bulk-update timeouts. Stop-page OG metadata/temporary preview coverage was fixed; the fresh pre-merge full-suite run passed without those timeouts.
- Final independent review identified a stale-worker lease boundary. Added a conditional token/status/expiry lease refresh immediately before SMTP, with a regression observed failing before the fix.
- Typecheck and scoped ESLint pass. Removed stale generated type entries for the temporary visual route; no product preview route ships.
- Final verification: 124 focused tests across 13 files passed, four isolated PostgreSQL tests passed, npm run typecheck passed, all changed application TypeScript files passed scoped ESLint, and git diff --check passed.
- Final read-only 2026 audience: 1,341 eligible, 56 confirmed paid, 1,285 without verified payment, 292 without profiles, 1,000 without orders, 280 recovery cases and five verification cases. Counts are a point-in-time read, not committed product constants.
- Pre-merge verification: npm test -- --maxWorkers=2 passed 1,819 tests in 295 files (24 opt-in database tests skipped); the four outreach database tests passed separately. Typecheck, scoped lint and staged diff check passed. User explicitly authorized pushing and merging to main; unrelated working changes remain excluded.
