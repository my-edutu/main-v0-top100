# Public Content Translation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task.

**Goal:** Translate eligible public long-form content into the visitor's selected locale, cache results, and preserve source text as the fallback.

**Architecture:** Add a server-only translation adapter behind a narrow interface and call it only from explicitly public server-rendered content. Pass text segments rather than raw HTML, preserve the content structure at call sites, and render the original text while translation is pending or unavailable. Cache each segment by source hash and target locale; do not write translations to source records.

**Tech Stack:** Next.js App Router 16.3 server utilities and Data Cache, Google Cloud Translation API, TypeScript, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-09-platform-localization-design.md`

## Global Constraints

- Only public awardee biographies, public member posts, public articles, opportunities, and event descriptions may be sent to the provider.
- Never send private dashboard records, private messages, payment details, or unpublished drafts to the translation provider.
- Keep provider credentials server-side and do not persist machine translation into source records.
- Keep runtime translation disabled unless `GOOGLE_CLOUD_TRANSLATION_ENABLED=true`; before enabling, configure a Cloud Translation quota and a billing budget alert.
- Cache by source-content hash and target/source locale for 30 days; source edits must naturally produce a cache miss.
- Keep each Google Cloud Translation Advanced request at or below 5,000 total Unicode code points, split at paragraph boundaries where possible, and enforce a five-second timeout per request.
- Use streaming/Suspense with source text as the fallback so slow translation does not hold up the rest of a page.
- Limit translation to explicitly allowlisted public fields; no API accepts arbitrary client-provided content for translation.
- On unavailable credentials, provider failure, or unsupported locale, show the original source without blocking the page.
- Preserve unrelated working-tree edits in dashboard profile/onboarding and portfolio-cover files.

## Review Focus

- Private content must not be translatable through this adapter; use a type/interface and call-site review to enforce public-only input.
- Empty or whitespace content must return unchanged without a provider request; test this case.
- Provider timeouts/errors must return the original content; test a mocked provider rejection.
- Source edits must not reuse stale output; test cache-key changes across source hashes.
- Unsupported locale and absent credentials must fail open to source text; test both cases.
- Formatted public content must preserve safe structure and links while translating text nodes only; test reconstruction and escaping.

---

### Task 1: Server-only translation adapter and cache policy

**Files:**
- Create: `lib/i18n/public-content-translation.ts`
- Create: `lib/i18n/google-translation-provider.ts`
- Test: `tests/i18n/public-content-translation.test.ts`
- Modify: `package.json`, `package-lock.json` to add the official server-side `@google-cloud/translate` client

**Interfaces:**
- `translatePublicSegments({ segments, targetLocale, sourceLocale? }): Promise<{ segments: string[]; translated: boolean }>` is server-only and accepts only supported target locales from `lib/i18n/locale.ts`.
- `GoogleTranslationProvider.translate({ segments, targetLocale, sourceLocale? }): Promise<string[]>` is isolated behind the adapter; total request content is capped at 5,000 Unicode code points and five seconds per request.

- [ ] **Step 1: Add failing adapter tests** for blank segments, unsupported locale, disabled flag, missing credentials, provider rejection/timeout, source fallback, safe text-node reconstruction, and different hashes for changed source or target locale.
- [ ] **Step 2: Run the focused test and confirm the adapter cases fail.**
- [ ] **Step 3: Implement the provider adapter** using `@google-cloud/translate` and server-only Application Default Credentials; do not expose credentials in `NEXT_PUBLIC_*` variables.
- [ ] **Step 4: Implement paragraph-aware batching capped at 5,000 total code points per request, the fail-open wrapper, and a 30-day cache** keyed by source hash plus target/source locale; keep cache functions independent of request cookies/headers, time out each request after five seconds, and log failures without text or secrets.
- [ ] **Step 5: Run focused tests, typecheck, and lint for the new files.**
- [ ] **Step 6: Commit only the adapter, provider, and adapter tests.**

### Task 2: Integrate eligible public content call sites

**Files:**
- Modify: `app/awardees/[slug]/page.tsx`
- Modify: `app/awardees/[slug]/AwardeePostsList.tsx`
- Modify: `app/awardees/[slug]/posts/[postSlug]/page.tsx`
- Modify: `app/blog/[slug]/page.tsx` and server page components for any database-backed public article, opportunity, or event descriptions discovered in `docs/i18n-route-inventory.md`
- Test: `tests/i18n/public-content-call-sites.test.ts`

**Interfaces:**
- Call sites obtain the selected locale from the Plan 1 locale provider and pass only fields that are already public and rendered to anonymous visitors.
- Translate narrative fields only; preserve personal names, product names, URLs, emails, and identifiers as source values.
- Source records and API response shapes remain unchanged; no translated values are written to Supabase or source files.

- [ ] **Step 1: Add failing call-site coverage** that identifies eligible public fields and asserts private member/dashboard routes do not call the adapter.
- [ ] **Step 2: Integrate translation into awardee biographies and public awardee posts** using text-node segments, source-text Suspense fallback, and a way to view the original.
- [ ] **Step 3: Integrate translation into public articles, opportunity descriptions, and event descriptions** using explicit public-field allowlists and the same segment/cache policy.
- [ ] **Step 4: Retain a clear way to view original source text** for every translated content type.
- [ ] **Step 5: Run focused tests, full typecheck, and production build; manually inspect translated and fallback rendering.**
- [ ] **Step 6: Commit only public content call-site changes and their tests.**

### Task 3: Production configuration and operational safeguards

**Files:**
- Create: `docs/i18n/google-cloud-translation.md` with `GOOGLE_CLOUD_PROJECT`, `GOOGLE_APPLICATION_CREDENTIALS`, and `GOOGLE_CLOUD_TRANSLATION_ENABLED` names only; no credential values
- Modify: deployment documentation to describe ADC setup for the hosting environment
- Test: `tests/i18n/public-content-translation.test.ts`

**Interfaces:**
- Missing or invalid configuration disables machine translation without affecting rendering. Deployment credentials are configured outside the repository.

- [ ] **Step 1: Document required Google Cloud Translation Advanced API enablement, server-only ADC configuration, and the explicit enable flag** in `docs/i18n/google-cloud-translation.md` and deployment notes.
- [ ] **Step 2: Verify the provider does not receive any call when configuration is absent** and that fallback remains source text.
- [ ] **Step 3: Verify cache key, target locale, and error logging behavior** without logging user text or credentials.
- [ ] **Step 4: Run the focused test, typecheck, and production build with translation configuration absent; verify normal page rendering still succeeds.**
- [ ] **Step 5: Verify the provider remains disabled unless the explicit flag is true, and document project quota/billing-budget setup before enabling it.**
- [ ] **Step 6: Commit only the configuration documentation and safeguards.**
