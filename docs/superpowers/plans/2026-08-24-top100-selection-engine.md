# Top100 Selection Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an admin-only engine that imports Top100 applicants, verifies private academic PDFs, processes and reports applicants in logical groups of 100, supports human review, and publishes applicant-safe decision explanations.

**Architecture:** The existing Next.js admin console owns orchestration and reviewer UI. Supabase is the private source of truth and durable work queue; Google Forms/Drive provide intake; Google Document AI extracts PDFs; optional OpenAI structured output assists bounded merit scoring. Deterministic rules and human review remain authoritative.

**Tech Stack:** Next.js App Router, TypeScript, Supabase/Postgres/Storage, Google Forms API, Google Drive API, Google Document AI, optional OpenAI Responses API, Vitest.

**Spec:** `docs/selection-engine/README.md`

## Global Constraints

- Logical processing batches contain 1–100 applications.
- Browser workers never receive service-role or Google credentials.
- Applicant PDFs remain in private storage.
- AI output is bounded and fails closed.
- `needs_review` results cannot be published as final.
- Certificate-template difference alone never rejects an applicant.
- Applicant-facing explanations never expose integrity rules or other applicants.
- No automatic promotion into `awardees` in the foundation release.

---

### Task 1: Private selection data model

**Files:**
- Create: `supabase/migrations/20260824090000_create_selection_engine_foundation.sql`
- Create: `supabase/migrations/20260824091000_add_selection_processing_tasks.sql`
- Create: `supabase/migrations/20260824092000_allow_pending_google_document_size.sql`
- Test: `tests/security/selection-engine-schema.test.ts`

- [x] Create isolated applicant, document, assessment, public-result and audit tables.
- [x] Enable RLS and revoke browser-role access.
- [x] Add private PDF-only storage bucket.
- [x] Add append-only audit enforcement.
- [x] Add 100-record batch limit and `SKIP LOCKED` task claims.
- [ ] Apply migrations to a preview Supabase project.
- [ ] Run Supabase security and performance advisors against the preview schema.

### Task 2: Deterministic assessment contracts

**Files:**
- Create: `lib/selection/contracts.ts`
- Create: `lib/selection/verdict.ts`
- Create: `lib/selection/ranking.ts`
- Create: `lib/selection/public-result.ts`
- Test: `tests/selection/verdict.test.ts`
- Test: `tests/selection/ranking.test.ts`
- Test: `tests/selection/public-result.test.ts`

- [x] Separate eligibility, evidence status, merit score and final verdict.
- [x] Clamp all scores to published maximums.
- [x] Produce applicant-safe and internal reasons separately.
- [x] Rank qualified applicants deterministically and assign country ranks.
- [ ] Freeze ranking inputs and results in versioned ranking-run tables before committee selection.

### Task 3: Google Form and linked Sheet intake

**Files:**
- Create: `lib/selection/google/forms.ts`
- Create: `app/api/admin/selection/jobs/[jobId]/sync-google/route.ts`
- Test: `tests/selection/google-form.test.ts`

- [x] Authenticate with a server-only Google service account.
- [x] Fetch Form metadata and stable question IDs.
- [x] Verify the configured response Sheet matches `linkedSheetId`.
- [x] Import at most 100 responses per request.
- [x] Reconcile by stable `responseId`.
- [x] Record unsupported non-PDF proof files without silently discarding the application.
- [ ] Run a synthetic Google Form integration test with shared PDF upload evidence.
- [ ] Backtest field mapping against a redacted copy of the 2025 response form.

### Task 4: Direct PDF applicant upload

**Files:**
- Create: `lib/selection/upload.ts`
- Create: `app/api/admin/selection/jobs/[jobId]/applications/route.ts`
- Create: `app/api/admin/selection/jobs/[jobId]/applications/[applicationId]/confirm-upload/route.ts`
- Test: `tests/selection/source.test.ts`
- Test: `tests/selection/upload.test.ts`

- [x] Create short-lived signed upload tokens.
- [x] Upload directly from browser to private storage.
- [x] Enforce PDF extension, MIME, magic bytes and 25 MB maximum.
- [x] Calculate SHA-256 after upload.
- [x] Keep server-controlled storage paths.
- [ ] Exercise upload and confirmation against preview Storage.

### Task 5: OCR and academic extraction

**Files:**
- Create: `lib/selection/extraction/google-auth.ts`
- Create: `lib/selection/extraction/document-ai.ts`
- Test: `tests/selection/document-extraction.test.ts`

- [x] Call the regional Document AI processor endpoint.
- [x] Extract text, page count and confidence.
- [x] Extract explicit First Class, other classification, CGPA, scale, BGS and institution candidates.
- [x] Route low-confidence extraction to review.
- [ ] Evaluate extraction accuracy on a redacted golden set from multiple institutions and years.

### Task 6: Optional AI-assisted merit assessment

**Files:**
- Create: `lib/selection/merit/openai.ts`
- Test: `tests/selection/merit-provider.test.ts`

- [x] Send only redacted leadership narrative and supporting evidence text.
- [x] Use strict JSON Schema structured output.
- [x] Disable response storage.
- [x] Validate scores and explanations with Zod.
- [x] Fail closed when the provider is missing or output is invalid.
- [ ] Calibrate AI-assisted scores against blinded human reviewer scores before production use.

### Task 7: Durable processing workers

**Files:**
- Create: `lib/selection/worker.ts`
- Create: `lib/selection/worker-policy.ts`
- Create: `app/api/admin/selection/worker/route.ts`
- Create: `app/api/cron/selection-worker/route.ts`
- Create: `app/api/admin/selection/jobs/[jobId]/enqueue/route.ts`
- Test: `tests/selection/worker-policy.test.ts`
- Test: `tests/selection/processor.test.ts`

- [x] Queue one logical batch of up to 100.
- [x] Claim a small worker-safe subset atomically.
- [x] Snapshot Google Drive PDFs to private storage.
- [x] Retry transient failures with bounded backoff.
- [x] Route permanent and exhausted failures to review.
- [ ] Connect the protected worker route to an approved scheduler.
- [ ] Load-test 1,000 synthetic applicants with multiple PDFs.

### Task 8: Admin workspace and human review

**Files:**
- Create: `app/admin/selection/page.tsx`
- Create: `app/admin/selection/selection-engine-client.tsx`
- Create: `app/admin/selection/review/page.tsx`
- Create: `app/admin/selection/review/review-queue-client.tsx`
- Create: `app/admin/selection/human-review-form.tsx`
- Create: `app/api/admin/selection/applications/[applicationId]/review/route.ts`
- Modify: `app/admin/components/nav-config.ts`
- Test: `tests/admin/nav-config.test.ts`
- Test: `tests/selection/review.test.ts`

- [x] Add Selection Engine to the existing admin sidebar.
- [x] Add source creation, Google import, PDF upload and job controls.
- [x] Show progress and batch reports.
- [x] Add governed human review with bounded scores and private notes.
- [x] Unpublish stale results when a review changes.
- [ ] Add role-scoped reviewer permissions beyond the current admin/superadmin boundary.

### Task 9: PDF reports and applicant result portal

**Files:**
- Create: `lib/selection/report/pdf.ts`
- Create: `app/api/admin/selection/jobs/[jobId]/reports/[batchNumber]/route.ts`
- Create: `app/selection-results/[token]/page.tsx`
- Create: `app/api/admin/selection/applications/[applicationId]/publish-result/route.ts`
- Test: `tests/selection/report-pdf.test.ts`

- [x] Generate multi-page batch PDF reports.
- [x] Include applicant-safe reasons and batch summaries.
- [x] Use opaque result tokens and no-index metadata.
- [x] Block publication while human review remains open.
- [ ] Add email delivery and appeal submission after notification copy and operations policy are approved.

### Task 10: Verification and release governance

**Files:**
- Modify: `.github/workflows/quality.yml` only if the existing hardened gate cannot cover the new tests.
- Document: `docs/selection-engine/README.md`

- [ ] Pass all Vitest tests.
- [ ] Pass regression-scoped lint.
- [ ] Pass Next.js production build.
- [ ] Verify migrations against preview Supabase.
- [ ] Verify Google Form, Drive and Document AI with synthetic data.
- [ ] Review privacy logs and confirm no raw applicant document content is logged.
- [ ] Measure reviewer agreement and false-positive integrity flags.
- [ ] Keep PR draft until all software gates pass and external integration evidence is attached.
- [ ] Build frozen ranking runs, committee approvals and transactional winner promotion as a separate gated PR.
