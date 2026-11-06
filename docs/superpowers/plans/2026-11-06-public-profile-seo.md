# Public profile technical SEO

Approved scope: implement technical fixes from the SEO plan for existing public user profiles. Preserve public visibility and contact consent. Use existing awardee URLs and bio redirects. No database migration or hosting change.

- Add canonical metadata, readable descriptions, and ProfilePage/Person markup with factual fields only.
- Use notFound for absent/private profiles; avoid static fallback when a successful lookup finds no public record.
- Paginate the public-profile sitemap query with deterministic ordering and fail on query errors rather than publishing partial coverage.
- Escape user text in JSON-LD to prevent script termination.
- Verify metadata, unavailable profiles, pagination and escaping with regression tests; run typecheck and focused lint.

Production validation after deployment: inspect public and missing URLs, rendered canonical/JSON-LD, sitemap coverage and Google Search Console. Production remains Dokploy and self-hosted Supabase.

## Pre-deployment review improvements

- Removed the workbook fallback entirely from public profile lookup: query and transport failures propagate, while authoritative missing records remain missing. Bumped the shared cache key.
- Pagination advances by actual returned rows and ends only on an empty response, supporting a self-hosted PostgREST cap below the requested page size.
- Contact-consent query errors abort rendering; a linked account with no profile row cannot expose legacy social links.
- Structured data resolves relative images to absolute HTTP(S) URLs, rejects unsafe URLs and credentials, and deduplicates identity links.
- Changed StructuredData's payload type to unknown rather than any.

Validation: 17 focused regression checks passed; focused ESLint and git diff --check passed. Includes database query/transport failures, contact-consent query failures, low row caps, invalid dates, image URLs, duplicate links and script escaping. Live HTTP status/streaming, Search Console, and production sitemap verification remain post-deployment checks. No deployment performed.
