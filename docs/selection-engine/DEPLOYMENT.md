# Top100 Selection Engine Deployment and Pilot Runbook

This runbook is the operational gate between a green repository build and real applicant processing. Complete the preview pilot with synthetic data before the Selection Engine is marked ready for production use.

## Release sequence

1. Confirm the admin-hardening base has been merged into `main`.
2. Retarget the Selection Engine pull request to `main`.
3. Require fresh GitHub Actions results against the updated base:
   - dependency-audit regression gate;
   - distributed rate-limit migration check;
   - complete automated test suite;
   - changed-line lint gate;
   - Next.js production build;
   - Selection Engine diagnostics.
4. Deploy the pull-request branch to an isolated preview environment.
5. Apply the Selection Engine migrations to the preview Supabase project.
6. configure server-only integration credentials in the preview environment.
7. Run the synthetic pilot described below.
8. Record the pilot evidence and unresolved risks in the pull request.
9. Keep the pull request in draft until the pilot passes and a human reviewer approves production rollout.

## Required migrations

Apply these files in order:

```text
supabase/migrations/20260824090000_create_selection_engine_foundation.sql
supabase/migrations/20260824091000_add_selection_processing_tasks.sql
supabase/migrations/20260824092000_allow_pending_google_document_size.sql
supabase/migrations/20260824093000_create_selection_ranking_runs.sql
supabase/migrations/20260824094000_create_selection_ranking_rpc.sql
```

After applying them, verify that:

- every `selection_*` table has row-level security enabled;
- `anon` and `authenticated` have no direct table access;
- the `selection-evidence` bucket is private and accepts only PDFs;
- task-claim and ranking RPCs are executable only by the service role;
- audit events cannot be updated or deleted;
- ranking entries become immutable after a run is frozen.

## Preview environment variables

All values below are server-only unless the name already starts with `NEXT_PUBLIC_`.

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

GOOGLE_SELECTION_SERVICE_ACCOUNT_EMAIL=
GOOGLE_SELECTION_SERVICE_ACCOUNT_PRIVATE_KEY=
GOOGLE_SELECTION_IMPERSONATED_USER=

GOOGLE_DOCUMENT_AI_PROJECT_ID=
GOOGLE_DOCUMENT_AI_LOCATION=
GOOGLE_DOCUMENT_AI_PROCESSOR_ID=

# Optional merit assistance
OPENAI_API_KEY=
OPENAI_SELECTION_MODEL=gpt-5-mini

CRON_SECRET=
```

Do not place service-role keys, private keys, OpenAI keys or cron secrets in source control, browser-visible variables, application logs, screenshots or pilot reports.

## Google access preparation

Create a dedicated synthetic test package containing:

- one owner/editable Google Form;
- its actual linked response spreadsheet;
- a Drive folder containing only synthetic PDF evidence;
- at least 120 synthetic responses so two logical batches are exercised.

Give the configured service account or delegated Workspace user read access to the Form, linked Sheet and evidence files. The public responder URL alone is not sufficient; use the owner/editor Form URL in the admin workspace.

## Synthetic applicant matrix

The pilot should include at least the following cases. Use invented people and documents only.

| Case | Expected outcome |
|---|---|
| Clear First Class evidence and strong supported leadership record | Qualified when the score reaches the configured threshold |
| Clear academic evidence but merit score below threshold | Not qualified with respectful applicant-safe reasons |
| Missing academic PDF | Needs human review |
| Non-PDF evidence upload | Blocked or routed for replacement/review |
| PDF with invalid magic bytes | Rejected as an invalid document |
| PDF larger than 25 MB | Rejected before processing |
| Low-confidence OCR | Needs human review, never automatic fraud language |
| Unknown CGPA scale with no explicit classification | Needs human review |
| Contradictory academic fields | Needs human review |
| Exact duplicate PDF used by two synthetic applicants | Internal duplicate signal and human review |
| Repeated leadership claim with no additional evidence | No score inflation |
| Sparse leadership narrative | Conservative score and human review where evidence is insufficient |
| Narrative containing prompt-injection instructions | Instructions ignored; bounded structured output only |
| Narrative containing email, phone and URL | Contact details redacted before optional AI processing |
| Google Form response imported twice | Reconciled by stable response ID without duplicate application rows |
| Worker temporarily fails | Retried according to policy without duplicating assessments |
| Worker permanently fails | Final `needs_review` assessment with safe public wording |
| `needs_review` result publication attempt | Blocked |
| Reviewer override | Previous public result automatically unpublished pending explicit republish |
| Two equal merit scores | Deterministic documented tie-breakers applied |

## Pilot procedure

### 1. Admin access

- Sign in with a database-authorised administrator.
- Confirm a non-admin account receives `403` from Selection Engine admin APIs.
- Demote a synthetic admin in the database and confirm stale JWT claims do not preserve access.

### 2. Create the cycle and job

- Open **Admin → Selection Engine**.
- Create a preview-only selection cycle with a clearly versioned policy.
- Connect the synthetic Form and its linked Sheet.
- Confirm that a deliberately mismatched Sheet ID is rejected.

### 3. Import responses

- Import the first Forms API page.
- Confirm no page exceeds 100 responses.
- Import the remaining responses.
- Repeat the sync and confirm no duplicates are created.
- Check names, primary/secondary emails, countries, institutions and evidence references against the synthetic source data.

### 4. Process logical batch 1

- Enqueue the first batch.
- Confirm its size is between 1 and 100.
- Run the worker repeatedly until the batch has no pending, processing or retry tasks.
- Confirm a second batch cannot mix with unresolved work from the first.
- Review qualified, not-qualified and human-review counts.

### 5. Human review

- Open **Admin → Selection Engine → Review**.
- Resolve every uncertain synthetic case using bounded scores, applicant-safe reasons and a private reviewer note.
- Confirm private notes never appear on the applicant result page or batch PDF.

### 6. Reports and applicant results

- Download the batch PDF and verify totals, names, countries, scores and safe reasons.
- Publish one qualified and one not-qualified synthetic result.
- Confirm opaque URLs resolve only published results and include `noindex`/`noarchive` behavior.
- Confirm a `needs_review` result cannot be published.

### 7. Process logical batch 2

- Enqueue the remaining synthetic applicants.
- Repeat processing and review.
- Confirm batch reports do not mix applicants across logical batches.

### 8. Ranking freeze

- Create an overall/country ranking snapshot only after every application has a final assessment under the current policy version.
- Verify its checksum is stable for unchanged inputs.
- Confirm duplicate overall, country or application ranks are rejected.
- Confirm frozen entries cannot be edited.
- Record independent approval entries using different reviewer identities.

### 9. Background worker

- Call `/api/cron/selection-worker` without authorization and confirm rejection.
- Call it with `Authorization: Bearer <CRON_SECRET>` and confirm bounded task claims.
- Verify the scheduler cannot expose the cron secret in logs or client code.

## Acceptance criteria

The preview pilot passes only when all of the following are true:

- Fresh CI against `main` is green.
- The preview deployment builds and serves `/admin/selection`.
- All five migrations are applied successfully.
- Browser roles cannot read private Selection Engine tables or evidence.
- At least 120 synthetic applications are imported without duplication.
- Processing occurs in logical groups of no more than 100.
- Retry, permanent-failure and human-review paths behave as designed.
- Applicant explanations are respectful and contain no internal integrity signals.
- Optional AI receives neither uploaded PDFs nor Document AI OCR text.
- Reports reconcile exactly with database counts.
- Ranking output is deterministic and frozen entries are immutable.
- No real applicant data is used during the pilot.
- A named human reviewer signs off on the recorded evidence.

## Rollback plan

If the preview pilot fails:

1. Keep the pull request in draft.
2. Disable the scheduler and remove its preview secret.
3. Stop creating or processing jobs.
4. Preserve audit records and synthetic evidence needed for diagnosis.
5. Fix the smallest isolated defect with a regression test.
6. Rerun the complete CI and synthetic pilot from a clean preview cycle.

Do not run destructive cleanup against production data. Preview-only synthetic cycles may be removed after the evidence and defect analysis have been retained safely.

## Production activation

Production activation remains a separate decision. Before activation:

- obtain programme-owner approval for the published policy and threshold;
- name the human review and appeal owners;
- confirm data-retention and deletion periods;
- configure operational monitoring and alerting;
- verify Google and Document AI quotas for the expected applicant volume;
- confirm that final winner promotion into `awardees` remains an explicit committee-controlled action.