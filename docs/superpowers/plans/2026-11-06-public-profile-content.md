# Public profile content improvements

User-authorized scope: improve every public biography and profile detail for SEO using only existing facts.

Approach: derive the published biography and search summary from an explicit allowlist of public fields. Preserve original biography text and member edits in the database. Structure imported application labels as readable sections. Supply a modest factual introduction when a biography is missing, using only name and recorded directory/cohort/background fields. Do not infer employment, graduation, nationality, expertise, institutional status, or impact counts. Preserve unresolved conflicts and report them for review.

Tasks:
- Add a pure content builder with fact provenance and quality flags; support numeric-string years without a guessed default year.
- Render biography sections and visible background details; share content between page metadata and structured data.
- Add a read-only coverage report against a protected public-field snapshot, including missing facts and before/after examples.
- Test preservation of every original claim, missing/placeholder data, labels, dates, privacy allowlisting and page integration.
- Run the report across all public profiles, verify build/typecheck/lint/tests and publish only this phase's changes through Dokploy.

Audit baseline: 1,524 public profiles, 94 empty biographies, 372 missing headlines, one placeholder name. Legacy directory fields coalesce course into school/study, so repeated values must not be asserted as an institution. Conflicting academic figures remain as submitted and are flagged, never reconciled automatically. No external enrichment or paid generation is required.
