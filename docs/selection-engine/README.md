# Top100 Selection Engine

The Selection Engine is an admin-only workspace for importing Top100 Africa Future Leaders applicants, verifying submitted academic PDFs, processing applicants in logical batches of 100, reviewing uncertain cases, generating detailed PDF reports, and publishing private applicant-safe result links.

## Product boundary

The engine manages **applicants**, not public awardees.

- `selection_*` tables contain private pre-selection data.
- `awardees` remains the destination for people who have already received committee approval.
- This foundation does not automatically insert any person into `awardees`.
- AI assists extraction and bounded merit scoring; it does not make an irreversible winner decision.

## Admin routes

| Route | Purpose |
|---|---|
| `/admin/selection` | Jobs, integrations, Google import, direct PDF uploads, batches, reports and result publication |
| `/admin/selection/review` | Human review queue for unreadable, conflicting, duplicate or uncertain cases |
| `/selection-results/[token]` | Opaque private applicant result page; only published results resolve |

## Processing flow

1. An admin creates a selection cycle and job.
2. The source is either:
   - a Google Form plus its linked response spreadsheet; or
   - direct admin PDF uploads.
3. Google Form responses are imported using stable `responseId` values in pages of at most 100.
4. Uploaded Google Drive PDFs are snapshotted into the private `selection-evidence` bucket before OCR.
5. The admin starts the next logical batch of at most 100 applications.
6. workers claim a small number of retryable tasks with `FOR UPDATE SKIP LOCKED`.
7. Google Document AI extracts text and academic fields.
8. Optional OpenAI structured output assesses only redacted leadership and evidence text against bounded rubric criteria.
9. Deterministic rules create one of three results:
   - `qualified`
   - `not_qualified`
   - `needs_review`
10. Each logical batch has a downloadable PDF report.
11. A reviewer resolves uncertain cases through the review queue.
12. A final result may be published through an opaque private link.

## Logical batches versus worker claims

A selection batch contains at most **100 applicants**. A worker invocation claims at most 10 tasks and defaults to 3–5. This distinction prevents a server request from attempting OCR on 100 PDFs at once while preserving the admin requirement that results are grouped and reported 100 applicants at a time.

A new logical batch cannot be queued while the previous batch has pending, processing or retry tasks. This prevents applicants from being skipped or mixed across batch reports.

## Required migrations

Apply these migrations in order:

```text
supabase/migrations/20260824090000_create_selection_engine_foundation.sql
supabase/migrations/20260824091000_add_selection_processing_tasks.sql
supabase/migrations/20260824092000_allow_pending_google_document_size.sql
```

The migrations create:

- private RLS-enabled applicant and assessment tables;
- service-role-only grants;
- append-only audit events;
- a private PDF-only `selection-evidence` bucket;
- retryable processing tasks;
- atomic task claims with row locking;
- a hard 100-record logical batch ceiling.

Do not expose `selection_*` tables to `anon` or `authenticated` browser roles.

## Server-only environment variables

```bash
# Existing Supabase server access
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=

# Google service account or delegated Workspace access
GOOGLE_SELECTION_SERVICE_ACCOUNT_EMAIL=
GOOGLE_SELECTION_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Optional. Required when the service account uses Workspace domain-wide delegation.
GOOGLE_SELECTION_IMPERSONATED_USER=selection-admin@your-domain.org

# Google Document AI processor
GOOGLE_DOCUMENT_AI_PROJECT_ID=
GOOGLE_DOCUMENT_AI_LOCATION=eu
GOOGLE_DOCUMENT_AI_PROCESSOR_ID=

# Optional AI-assisted leadership/impact assessment
OPENAI_API_KEY=
OPENAI_SELECTION_MODEL=gpt-5-mini

# Protects /api/cron/selection-worker
CRON_SECRET=
```

Never prefix service-account keys, private keys, service-role keys, OpenAI keys or cron secrets with `NEXT_PUBLIC_`.

## Google setup

1. Create or choose a Google Cloud project.
2. Enable:
   - Google Forms API
   - Google Sheets API
   - Google Drive API
   - Document AI API
3. Create a service account.
4. Give the service account read access to:
   - the owner/editable Google Form;
   - the linked response spreadsheet;
   - the Google Drive folder that stores file-upload answers.
5. Where the files belong to a managed Google Workspace domain, configure domain-wide delegation and set `GOOGLE_SELECTION_IMPERSONATED_USER` to an authorised account.
6. Create a Document OCR processor and configure its project, location and processor ID.
7. In the admin workspace, paste the **owner/editor Form URL**, not only the public `/d/e/.../viewform` responder URL.

The engine fetches the Form metadata and refuses import when the configured spreadsheet ID does not equal the Form's reported `linkedSheetId`.

## Existing 2025 Google Form

The known 2025 response form contains fields for name, two email sources, phone, country of residence, institution, graduation year, CGPA, department, Best Graduating Student claim, academic proof, verification contact, leadership/impact narrative, declaration and a convocation photograph.

Important interpretation rules:

- Automatically collected email is primary when present; a different typed email is retained as secondary.
- “Country” is country of residence, not necessarily citizenship.
- CGPA is not compared across institutions until its scale is confirmed.
- First Class and Best Graduating Student are separate claims.
- Convocation photographs never affect merit scores.
- Non-PDF academic proof is recorded as unsupported and routed for replacement or human review.

## Direct PDF upload

The browser does not send the PDF through a Next.js API body.

1. The admin submits applicant metadata and file metadata.
2. The server creates private database records and a short-lived signed upload token.
3. The browser uploads directly to the private Supabase bucket.
4. The server downloads the object, verifies `%PDF-` magic bytes, enforces the 25 MB limit, and calculates SHA-256.
5. Only confirmed files can be processed.

## Academic extraction

Document AI extracts:

- document text;
- token confidence;
- page count;
- First Class classification;
- other explicit degree classification;
- CGPA and scale where present;
- Best Graduating Student wording;
- institution candidates.

Extraction confidence below the configured safe threshold routes the application to review. The engine does not infer First Class from an unknown CGPA scale.

## Optional AI merit assessment

The OpenAI request receives only:

- leadership and impact narrative;
- text extracted from supporting evidence.

It does not receive the applicant's name, email, phone, country or institution field for merit scoring. The prompt expressly treats applicant text as untrusted data and ignores embedded instructions.

Structured output is validated against fixed limits:

| Criterion | Maximum |
|---|---:|
| Leadership responsibility | 25 |
| Measurable impact | 25 |
| Initiative and service | 10 |
| Communication and clarity | 10 |

Academic scoring is handled separately. Malformed, unavailable or insufficient AI output fails closed into human review.

## Academic and total rubric

| Criterion | Maximum |
|---|---:|
| Academic excellence | 30 |
| Leadership responsibility | 25 |
| Measurable impact | 25 |
| Initiative and service | 10 |
| Communication and clarity | 10 |
| **Total** | **100** |

The default merit threshold is 60 and is versioned inside each selection cycle.

## Human review

A reviewer must provide:

- bounded criterion scores;
- a final verdict;
- one or more applicant-facing reasons;
- a private reviewer note explaining the evidence checked.

Saving a new review automatically unpublishes any older result. A reviewed result must be checked and explicitly published again.

A `needs_review` assessment cannot be published as a final applicant result.

## Applicant result safety

Published result links use random UUID access tokens and are marked no-index/no-archive.

Applicants may see:

- final verdict;
- overall merit score;
- criterion breakdown;
- published threshold;
- respectful reasons;
- next step;
- appeal deadline where configured.

Applicants never see:

- another applicant's identity;
- duplicate matches;
- certificate similarity thresholds;
- internal integrity flags;
- reviewer private notes;
- hidden model prompts or provider output.

## Background operation

The protected endpoint is:

```text
GET /api/cron/selection-worker
Authorization: Bearer <CRON_SECRET>
```

A scheduler may invoke it periodically. The admin workspace also has a manual worker loop so processing can be started without a scheduler.

Do not add a high-frequency Vercel cron schedule until the deployment plan is confirmed to support it. An external scheduler or Supabase Cron may call the same authenticated endpoint.

## Batch reports

For job `JOB_ID` and logical batch `N`:

```text
/api/admin/selection/jobs/JOB_ID/reports/N
```

The generated PDF includes:

- cycle and source;
- batch number;
- total and processed counts;
- verdict totals;
- applicant names and countries;
- scores;
- applicant-safe reasons.

The detailed evidence viewer remains private inside the admin panel.

## Safety rules

1. Certificate visual differences are review signals, never automatic rejection.
2. Exact duplicate documents create an internal review signal.
3. Low OCR confidence is uncertainty, not fraud.
4. Institution prestige never adds merit points.
5. Country never changes the merit score.
6. AI output cannot exceed rubric maximums.
7. Missing AI configuration routes merit scoring to review.
8. A final result is published only through an explicit admin action.
9. This foundation does not automatically promote applicants into `awardees`.
10. Real applicant PDFs must never enter Git history, test fixtures, logs or CI artifacts.

## Verification commands

```bash
npm test
npm run lint
npm run build
```

Environment-backed verification additionally requires a preview Supabase project, shared Google test Form/Sheet/files, Document AI processor and synthetic applicant PDFs.
