# Public profile content audit — 6 November 2026

Read-only audit of 1,524 public directory records on the active self-hosted Supabase instance. Private fields, contact details, and private profiles were excluded from the input. No profile rows were rewritten.

The public template now derives a factual introduction, readable biography sections, visible background details, and search metadata from current public facts. Original narrative paragraphs and numbers remain unchanged; recognised form labels become headings. Empty biographies receive only a directory/cohort/background introduction. Members' later edits continue to take precedence automatically.

## Coverage

- 1,524 original narrative records preserved by source-span and paragraph coverage checks.
- 1,523 profiles eligible for an introduction using their recorded name; the placeholder identity retains its original text.
- 94 missing biographies receive factual introductory text.
- 499 form-style biographies become labelled sections.
- Numeric-string cohort years are handled without a guessed 2025 fallback.
- Repeated legacy course/school values appear once as background; no graduation, institution, nationality or expertise is inferred.

## Facts requiring review

- `awardee-274`: placeholder name; no identity guessed.
- `benedicta-okainemhen-otoibhu` and `ogunka-bright-ebuka`: differing academic figures appear in existing submissions. These can include historical results; the audit flags them without declaring which value is correct or rewriting the claims.
- 595 profiles lack a specific headline (including generic recognition headlines); no career title generated.
- 45 lack country/location; no location inferred.

The detailed before/after report is stored as a protected local JSON artifact outside the repository. It is generated with:

```sh
npx tsx scripts/audit-public-profile-content.ts --input <public-field-snapshot.json> --output <review-report.json>
```

No external enrichment, generative model calls, new personal details, or database migration is used.
