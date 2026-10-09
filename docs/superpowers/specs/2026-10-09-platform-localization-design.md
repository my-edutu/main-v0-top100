# Platform localization design

**Date:** 2026-10-09
**Status:** Approved for planning
**Scope:** Public Top100 Africa Future Leaders website and signed-in member dashboard

## Goal

Make the platform usable in the language a visitor prefers. Detect a supported browser language on first visit, allow the visitor to choose another language, remember that choice, and translate both interface text and eligible public content. English remains the fallback.

## Evidence and launch locales

The repository does not currently contain an internationalization framework or translation service. The local 2025 awardee workbook contains 418 rows; after normalizing recognizable country labels, it includes awardees from Nigeria, Ethiopia, Kenya, Ghana, Malawi, Morocco, Rwanda, Sierra Leone, The Gambia, Uganda, and Zimbabwe, as well as France, Turkey, the United Kingdom, and the United States. The workbook also has malformed and non-country values, and the public directory reports 31 countries, so it is a directional snapshot rather than a complete live distribution.

Launch locales:

- English (`en`) — default and source language
- French (`fr`)
- Arabic (`ar`)
- Swahili (`sw`)

The locale list should be configuration-driven so Portuguese or other languages can be added when audience and data support it.

## User experience

1. On first visit, choose a supported locale from the browser's `Accept-Language` preferences. If there is no supported match, use English.
2. Show a language switcher on public pages and in the member dashboard. A deliberate selection takes precedence over browser detection and persists in a first-party locale cookie across routes and future visits.
3. Translate interface messages into the selected locale. Format dates, numbers, and other locale-sensitive values accordingly.
4. For eligible public long-form content, translate into the selected locale on first display when no cached translation exists. Keep the original available and do not overwrite source content.
5. When Arabic is selected, set the document language and right-to-left direction. Layouts, navigation, forms, and common dashboard controls must support RTL. The excluded admin shell remains English and LTR even when the visitor's public locale is Arabic.

The initial rollout covers public marketing and content pages, public awardee pages and posts, public opportunity/event pages, public application and authentication flows, and the signed-in member dashboard. Internal staff/admin tools and transactional email are out of scope. The dashboard's private-message interface may be localized, but private message bodies and private member data are never sent to the translation provider.

## Technical approach

### Locale detection and persistence

Use `next-intl` for locale context, message lookup, formatting, and switching. Keep existing URL paths unchanged in the first rollout to avoid breaking existing links, authentication redirects, payment callbacks, and dashboard route assumptions. Resolve locale from the saved cookie first; only when absent, negotiate the request's `Accept-Language` header against the supported locales. The switcher writes the cookie and refreshes the current route in the selected locale.

The locale is a presentation preference and must not be inferred from awardee nationality or IP geolocation. Unsupported browser languages fall back to English. Missing message keys also fall back to English and should be visible in development diagnostics.

### Interface translations

Move user-facing interface copy into locale message catalogs grouped by shared, public, auth, and dashboard namespaces. Translate the shared navigation and common controls first, then public routes, forms/authentication, and dashboard route groups. Use AI-assisted initial translation with review for important member-facing flows, names, legal content, and safety/payment wording. Keep message IDs stable and keep source English as the fallback.

### Public content translations

Use Google Cloud Translation behind a server-side translation adapter for eligible public dynamic content (for example, awardee biographies, public member posts, public articles, opportunities, and event descriptions). The target locale comes from the selected platform locale. Detect source language when the source is not known. Translate text segments while preserving structured content; never submit arbitrary client input or raw unsanitized markup. Keep request sizes within provider limits, cache translations by source-content hash and target locale, and invalidate them when source content changes. Bound provider latency so a slow translation returns the original text without blocking the page.

Keep provider credentials server-side and leave runtime machine translation disabled until an explicit server-side feature flag is enabled and provider quotas/budget alerts are configured. Never send private dashboard records, private messages, payment details, or unpublished drafts to the translation provider. Do not persist machine translations into source records.

### Routing, SEO, and rendering cache

The first rollout keeps the existing path for every locale and varies rendered messages by the locale cookie or `Accept-Language`. This preserves links and auth/payment return paths, but it does not create separately crawlable locale URLs or `hreflang` variants. Locale-dependent rendering must not be served from a shared cache under another visitor's locale. If multilingual search indexing becomes a requirement, add locale-prefixed URLs in a separate migration rather than changing this first rollout implicitly.

### Arabic and RTL

Set `lang` and `dir` at the document root from the resolved locale; isolate the excluded admin shell as English/LTR. Use logical CSS properties in shared navigation, form, and dashboard shell styles where directional positioning is required. Preserve LTR rendering for URLs, email addresses, phone numbers, and other inherently LTR values.

## Alternatives considered

1. **Browser translation widget only:** fastest initial coverage, but the application cannot reliably control translation quality, layout behavior, or which content is sent to a third party. Not recommended as the platform foundation.
2. **`next-intl` message catalogs only:** gives a reliable switcher, reviewed interface translations, and locale-aware formatting, but it does not translate dynamic content by itself. Suitable foundation, incomplete for the requested public content coverage.
3. **`next-intl` plus server-side machine translation for eligible public content (recommended):** keeps interface copy controlled and extends translations to dynamic public content. Requires provider setup, caching, quotas, and graceful fallback; private content remains excluded.

## Dependencies and configuration

- Add and configure `next-intl` for the existing Next.js App Router without changing route paths.
- Add a server-only Google Cloud Translation adapter; do not expose provider credentials to browser code.
- Configure Google Cloud project credentials and API enablement through deployment secrets before live machine translation can operate. Until configured, interface catalogs still work and public content remains in its source language.
- No browser translation extension or client-side translator script is required.

## Rollout and acceptance criteria

1. Establish locale configuration, request detection, cookie persistence, root `lang`/`dir`, and shared switcher.
2. Localize shared public chrome, entry/auth flows, and dashboard navigation/common controls in all launch locales.
3. Localize remaining in-scope route groups and common form messages.
4. Add cached translation for eligible public content and verify graceful fallback when the provider is unavailable.
5. Review Arabic RTL across shared site and dashboard layouts before enabling Arabic as a selectable locale.

The rollout is complete when a supported browser language is selected automatically on a first visit, an explicit switch persists across navigation and sessions, interface messages are available in all launch locales across the in-scope routes, public content can be translated and cached without altering its source, and Arabic pages render with correct direction. Existing route URLs and auth/payment flows must continue to work.

## Risks and mitigations

- **Uneven source country data:** launch locales are a reasonable initial set, not an exhaustive inference. Keep locales configurable and review against current live directory coverage before release.
- **Machine translation errors:** keep source text accessible, prioritize review of fixed UI messages and legally/financially sensitive wording, and do not machine-translate private member or payment data.
- **Cost, quotas, and latency:** only translate eligible public text when requested by locale, batch and cache responses, and fall back immediately to the source text when translation fails.
- **Unbounded provider spend:** keep runtime translation disabled by default and require provider quota/budget controls before enabling it.
- **RTL layout regressions:** Arabic requires layout review and logical CSS updates in shared components; it must not be considered complete from text translation alone.
- **Large UI surface:** migrate in route groups while keeping English fallback so untranslated pages remain usable during rollout.
- **Same-URL locale trade-off:** this rollout does not provide language-specific URLs for search engines; locale-specific rendering must remain isolated in server/CDN caches.

## User-data and working-tree notes

This feature does not change awardee records or infer preferences from a person's country. The current working tree already contains unrelated edits in dashboard profile/onboarding and portfolio-cover files; those edits are outside this specification and must be preserved during implementation.
