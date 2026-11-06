# Editorial features and device sharing

**Current workflow:** Generate four editable third-person previews, then use
**Share from device** for the selected caption. No social account tokens or Meta
developer app are needed. The device chooses the destination; publishing is
completed externally and cannot be verified by the app. Copy caption and download
image remain available when native sharing is unsupported. AI generation still
requires a valid server-side OpenAI key.

The direct-publishing implementation described below is retained for future use;
it is not exposed by the current feature composer.

Admin → Social Sharing → select a public awardee → **Generate feature** → edit
four third-person captions → review the Instagram image →
**Publish to all platforms**. The original single-platform manual sharing tools
remain available below the feature composer.

Generation uses public profile facts only, includes the canonical profile URL,
and connects the story to Top100 Africa Future Leaders. X has a conservative
280-character weighted limit (URLs count as 23); Instagram allows 2,200 and
LinkedIn 3,000. Editors can shorten generated copy before publication. Instagram
caption links are plain text, not clickable links.

LinkedIn, Facebook, and X publish text plus the profile URL. Instagram publishes
an image and caption. Its public image endpoint converts artwork from Top100's
media/storage/site domains to a 1080 × 1350 JPEG with white padding, preserving
all artwork. It rejects arbitrary hosts, redirects, oversized downloads and
nonpublic or changed profiles. Preview displays this same converted image.

## Dokploy setup

This feature is implemented locally; installing it does not authorize a test
post. Deploy to the existing Dokploy application, not Vercel. Apply migration
`supabase/migrations/20261106101025_admin_social_publications.sql` on the active
self-hosted Supabase at `https://supabase.top100afl.com` before enabling publishing.
Do not apply it to the retired hosted project. No worker or cron is required:
publication runs during the admin's explicit request.

Set these **server-only** variables in Dokploy's application environment, then
redeploy. Never put credentials in NEXT_PUBLIC variables or source control.

| Variable | Value |
| --- | --- |
| `OPENAI_API_KEY` | Existing key for caption generation |
| `SOCIAL_LINKEDIN_ACCESS_TOKEN` | Authorized organization publisher token with `w_organization_social` |
| `SOCIAL_LINKEDIN_ORGANIZATION_ID` | Numeric Top100 organization ID |
| `SOCIAL_LINKEDIN_VERSION` | Supported YYYYMM API version, e.g. `202607`; maintain as versions sunset |
| `SOCIAL_META_PAGE_ACCESS_TOKEN` | Authorized Page access token with required Facebook/Instagram publishing permissions |
| `SOCIAL_FACEBOOK_PAGE_ID` | Numeric Top100 Facebook Page ID |
| `SOCIAL_INSTAGRAM_USER_ID` | Numeric ID of the professional Instagram account linked to that Page |
| `SOCIAL_META_VERSION` | Supported version for the approved Meta app, e.g. `v24.0` |
| `SOCIAL_X_USER_ACCESS_TOKEN` | OAuth user-context token for the Top100 X account with write access; an app-only bearer token will not work |

The setup badges indicate presence of configuration, not verified token validity.
Tokens and provider permissions must be provisioned by an account administrator.
This implementation does not include OAuth connection/refresh screens. Rotate
expired tokens in Dokploy. Each provider's developer access/approval requirements
still apply. Keep the frontend HTTP request timeout long enough for Instagram
media processing (up to several minutes). Leaving the browser does not provide a
background-job guarantee; refresh publication status after an interruption.

## Delivery and recovery

The service-role-only `admin_social_publications` table stores reviewed captions,
source signatures, claim IDs, provider post IDs and URLs, and per-platform results.
A unique `(awardee_id, platform)` record permits one feature per person/platform.
An atomic conditional update claims only `ready` or definitely `failed` rows.
Concurrent administrators and repeated clicks cannot claim a successful or
in-progress row. All account configuration and caption validation happens before
any platform is contacted. The source signature rejects stale previews.

A definite provider rejection becomes `failed` and can be retried. Confirmed
posts are skipped on retry. Network errors, ambiguous server responses, missing
receipts and failure to save a receipt are **not** automatically retried. A crash
may leave `publishing`; the UI explicitly says delivery requires confirmation.

For `uncertain` or abandoned `publishing` records, an operator must inspect the
actual account. If live, reconcile the row to `published` with its provider post
ID and URL. Only after establishing no post exists and no request is still in
flight may an operator set it to `failed`. Never reset ambiguous records by age
alone. Repeated editorial campaigns for the same person are not included.

Preview edits are held in the current page until publication; leaving the page
loses unsent edits. The existing manual composer still supports saved drafts.
The broadcast flow currently selects public awardees from the existing directory,
not private member profiles.

## Verification

Tests mock external APIs: no live social posts or AI calls are made. The migration
was executed in an isolated local Postgres instance, including privilege checks,
duplicate prevention and claim transitions. Live account tokens, production
migration and successful end-to-end publication still require deployment setup.

Provider references: [LinkedIn Posts API](https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/posts-api),
[Meta Instagram API](https://www.postman.com/meta/instagram/documentation/6yqw8pt/instagram-api),
[X create post](https://docs.x.com/x-api/posts/create-post).
