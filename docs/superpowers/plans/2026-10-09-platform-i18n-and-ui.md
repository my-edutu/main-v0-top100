# Platform i18n and interface localization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task.

**Goal:** Add automatic locale selection, a persistent language switcher, and translated interface messages across the public site, user entry flows, and member dashboard.

**Architecture:** Keep existing URLs and Supabase session middleware. Resolve locale from a validated first-party cookie, then the browser `Accept-Language` header, using English as fallback. Provide `next-intl` at both root layouts and migrate interface messages in route groups; set document language and direction from the resolved locale.

**Tech Stack:** Next.js App Router 16.3, React 19, TypeScript, `next-intl`, message JSON, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-09-platform-localization-design.md`

## Global Constraints

- English (`en`) is the source and fallback locale; French (`fr`), Arabic (`ar`), and Swahili (`sw`) are launch locales.
- Keep current route URLs unchanged and preserve existing auth redirects and payment callbacks.
- Locale-dependent server output must not enter a shared cache without locale isolation; same-path locale variants do not receive `hreflang` URLs in this rollout.
- Resolve a saved locale cookie before negotiating `Accept-Language`; never infer locale from IP or awardee country.
- Public marketing/content pages, public awardee pages/posts, public opportunity/event pages, public application/auth flows, and the signed-in member dashboard are in scope.
- Internal staff/admin interface text and transactional email remain English/out of scope. Private message interface controls may be translated; private message bodies and private member data are never sent to the provider.
- Arabic documents use RTL; URLs, emails, phone numbers, and inherently LTR values remain LTR.
- Preserve unrelated working-tree edits in dashboard profile/onboarding and portfolio-cover files.

## Review Focus

- A saved valid locale must override a different browser preference; test cookie precedence.
- A regional browser tag such as `fr-CA` must resolve to supported `fr`; test supported base-language matching.
- Unsupported or malformed locale values must safely resolve to English; test both cookie and header input.
- A language change must persist when navigating and refreshing an existing non-localized URL; cover with switcher behavior verification.
- Two requests to the same URL with different locale cookies must receive the correct `lang`, `dir`, and message values; verify no locale response leaks across requests.
- Arabic must set document direction without reversing LTR values; review shared navigation, forms, and dashboard shell in RTL.
- The excluded admin shell must remain visually English/LTR when an Arabic locale cookie is present; verify the existing admin shell directly.

---

### Task 1: Locale configuration, request resolution, and root providers

**Files:**
- Create: `lib/i18n/locale.ts`
- Create: `i18n/request.ts`
- Create: `messages/{en,fr,ar,sw}/{common,public,auth,dashboard}.json`
- Modify: `package.json`, `package-lock.json` to add `next-intl`, `negotiator`, `@types/negotiator`, and `@formatjs/intl-localematcher` as direct locale-negotiation dependencies
- Modify: `next.config.mjs` to compose the `next-intl` plugin around the existing config without replacing custom deployment, redirect, image, or security-header settings
- Modify: `app/layout.tsx`
- Modify: `app/(standalone)/layout.tsx`
- Test: `tests/i18n/locale.test.ts`

**Interfaces:**
- Produces `type Locale = 'en' | 'fr' | 'ar' | 'sw'`, `SUPPORTED_LOCALES`, `DEFAULT_LOCALE`, `LOCALE_COOKIE_NAME`, `LOCALE_COOKIE_MAX_AGE_SECONDS = 31536000`, `isLocale(value)`, `resolveLocale({ cookieLocale, acceptLanguage })`, `localeCookieValue(locale)`, and `localeDirection(locale)` in `lib/i18n/locale.ts`.
- Request configuration loads the selected locale catalog for `NextIntlClientProvider` and server translation calls.
- Request configuration deep-merges English message namespaces with the selected locale so a missing value never breaks rendering; development reports the missing key.

- [ ] **Step 1: Add failing locale resolver tests** for cookie precedence, regional matching, unsupported input, and English fallback; add a request-config test for missing-message English fallback.
- [ ] **Step 2: Run the focused Vitest file and confirm the resolver tests fail.**
- [ ] **Step 3: Implement the pure locale helpers, request configuration, and `next-intl` config wrapper** using the documented Next 16.3 APIs; load the four namespace catalogs for the chosen locale; do not modify `middleware.ts` or route paths.
- [ ] **Step 4: Add the two root providers** so the selected locale supplies messages and `<html>` gets the matching `lang` and `dir` in both root layouts.
- [ ] **Step 5: Run the focused Vitest file and typecheck; confirm cookie/header cases pass and both layouts compile.**
- [ ] **Step 6: Verify two requests to one URL with different locale cookies render isolated language/direction metadata and message values.**

### Task 2: Persistent locale switcher and shared chrome

**Files:**
- Create: `components/language-switcher.tsx`
- Modify: `app/components/Header.tsx`
- Modify: `app/components/Footer.tsx`
- Modify: `app/dashboard/_components/dashboard-app-bar.tsx`
- Modify: `app/(standalone)/layout.tsx`, `app/login/layout.tsx`, and user-facing auth/entry pages that hide the public header
- Test: `tests/i18n/language-switcher.test.tsx`
- Test: `tests/i18n/catalog-parity.test.ts`

**Interfaces:**
- `LanguageSwitcher` consumes `useLocale`, lists the four configured locales by endonym, writes a root-scoped one-year SameSite=Lax locale cookie (Secure on HTTPS), and calls `router.refresh()` without changing the current pathname.

- [ ] **Step 1: Add a failing locale-cookie helper test** for a valid selection and an SSR rendering test that confirms the switcher lists all configured locales by endonym.
- [ ] **Step 2: Run the focused test and confirm it fails.**
- [ ] **Step 3: Implement the accessible switcher** with keyboard operation, focus visibility, an explicit accessible label, and an option label in its own language.
- [ ] **Step 4: Place the switcher in desktop/mobile public navigation and the dashboard app bar**, respecting compact/full-screen routes; add it to standalone user entry flows without exposing it in admin.
- [ ] **Step 5: Translate shared navigation, footer, switcher, and dashboard shell labels** in `common.json` and add `tests/i18n/catalog-parity.test.ts` to require identical keys across all launch locale namespaces.
- [ ] **Step 6: Run the focused test, catalog parity check, and typecheck.**
- [ ] **Step 7: Manually switch language on a deep route, refresh, and navigate to another route; confirm the cookie persists and the pathname stays unchanged.**
- [ ] **Step 8: Commit only this task's localization files** so unrelated existing work remains outside the commit.

### Task 3: Public site shell and general information routes

**Files:**
- Modify: `app/page.tsx` and user-facing components under `app/components/`
- Modify: `app/[slug]/page.tsx`, `app/not-found.tsx`, and user-facing pages/components under `app/afl2026/`, `app/africa-future-leaders/`, `app/ambassadors/`, `app/announcements/`, `app/events/`, `app/impacts/`, `app/impactseries/`, `app/initiatives/`, `app/partners/`, and `app/partnership/`
- Modify: `messages/{en,fr,ar,sw}/public.json`
- Create: `docs/i18n-route-inventory.md`
- Test: `tests/i18n/public-shell-messages.test.tsx`
- Test: `tests/i18n/route-inventory.test.ts`

**Interfaces:**
- Public pages consume namespaced `next-intl` messages. English source keys are stable across locales; untranslated values fall back to English.

- [ ] **Step 1: Inventory every in-scope App Router page** in `docs/i18n-route-inventory.md`, mark excluded admin/diagnostic routes, add a test that flags new unclassified or missing page files, and add failing rendering checks for the home page, shared navigation, not-found page, and one representative general-information route.
- [ ] **Step 2: Move shared shell and general-information interface strings and localized page metadata** into `common.json` or `public.json` while preserving routes, links, canonical URLs, and metadata generation behavior.
- [ ] **Step 3: Translate only interface copy** to French, Arabic, and Swahili; preserve proper names and URLs.
- [ ] **Step 4: Run focused route checks, catalog parity, and typecheck; commit only this task's localization files.**

### Task 4: Awardee directory and editorial interface messages

**Files:**
- Modify: user-facing interface components under `app/awardees/`, `app/awardees-list/`, `app/bio/`, `app/hall-of-fame/`, `app/blog/`, `app/interviews/`, and `app/magazine/`
- Modify: `messages/{en,fr,ar,sw}/public.json`
- Modify: `docs/i18n-route-inventory.md`
- Test: `tests/i18n/directory-editorial-messages.test.tsx`

**Interfaces:**
- This task translates page controls and fixed interface copy only; public biographies, article bodies, and posts are translated by Plan 2.

- [ ] **Step 1: Add failing rendering checks** for awardee filters, editorial cards, pagination, and primary page actions.
- [ ] **Step 2: Move those interface strings and locale-dependent metadata into the public namespace** without changing search parameters, profile slugs, directory filters, or content data.
- [ ] **Step 3: Add French, Arabic, and Swahili message values**, preserving awardee names and source content.
- [ ] **Step 4: Run focused rendering checks, catalog parity, and typecheck; update route inventory coverage; commit only this task's localization files.**

### Task 5: Signup, applications, and legal interface messages

**Files:**
- Modify: user-facing pages/components under `app/apply/`, `app/auth/`, `app/edit-profile/`, `app/get-started/`, `app/join/`, `app/legal/`, `app/login/`, `app/signup/`, and `app/waitlist/`; exclude admin setup, admin repair, debug, and status diagnostics
- Modify: `messages/{en,fr,ar,sw}/{auth,public}.json`
- Modify: `docs/i18n-route-inventory.md`
- Test: `tests/i18n/account-flow-messages.test.tsx`

**Interfaces:**
- Form field names, validation schemas, API payloads, authentication callbacks, payment values, and existing URLs remain unchanged. Localize labels, instructions, and user-facing validation copy.

- [ ] **Step 1: Add failing rendering checks** for signup/login, application, and legal consent entry points.
- [ ] **Step 2: Move user-facing account, application, and legal strings into `auth.json` or `public.json`** while preserving validation behavior and callback URLs.
- [ ] **Step 3: Add French, Arabic, and Swahili translations; obtain review for legal and payment-adjacent wording before enabling those strings.**
- [ ] **Step 4: Localize metadata where page titles/descriptions are request-generated; run focused rendering checks, existing auth/application tests, catalog parity, typecheck, and update route inventory coverage; commit only this task's localization files.**

### Task 6: Member dashboard interface messages

**Files:**
- Modify: `app/dashboard/_components/*` navigation, shell, onboarding, and shared controls
- Modify: `app/dashboard/_sections/*` shared section labels and forms
- Modify: in-scope member-facing pages under `app/dashboard/`
- Modify: `messages/{en,fr,ar,sw}/dashboard.json`
- Modify: `docs/i18n-route-inventory.md`
- Test: `tests/i18n/dashboard-messages.test.ts`

**Interfaces:**
- Dashboard Server Components use server-side translations; Client Components use `useTranslations`. Private member values are interpolated as supplied and are never machine-translated by this plan.

- [ ] **Step 1: Add failing coverage checks** for dashboard navigation, settings, profile, notifications, opportunities, and award-flow controls; classify all in-scope dashboard page files in the route inventory.
- [ ] **Step 2: Localize dashboard navigation, app bar, bottom navigation, shell, membership status, and common empty/loading/error states.**
- [ ] **Step 3: Localize member-facing forms and route sections** while preserving validation logic, API payloads, form field names, payment values, and accessibility labels; map known server error codes to localized copy without changing API contracts, and keep unknown errors as English fallback.
- [ ] **Step 4: Translate new dashboard messages in all launch locales and run dashboard message tests plus typecheck.**
- [ ] **Step 5: Commit only this task's localization files.**

### Task 7: RTL layout and locale formatting pass

**Files:**
- Modify: `app/globals.css`, `app/dashboard/dashboard.css`
- Modify: `app/admin/layout.tsx` only to isolate the excluded admin shell as English/LTR
- Modify: shared public navigation, shared forms, and dashboard shell/components where directional styles are used
- Test: `tests/i18n/rtl.test.tsx`

**Interfaces:**
- Root `dir` is `rtl` only for Arabic; all other launch locales are `ltr`. Use `Intl`/`next-intl` formatting APIs for locale-sensitive numbers and dates touched by this rollout.

- [ ] **Step 1: Add an RTL smoke test** for the root language/direction and a representative dashboard form.
- [ ] **Step 2: Replace directional left/right styles with logical properties** in shared navigation, forms, and dashboard chrome; explicitly retain LTR direction for URLs, email, phone, and numeric payment identifiers.
- [ ] **Step 3: Review representative public, auth, form, and dashboard screens in all locales**, correcting overflow, alignment, truncation, and focus-order issues; verify admin stays English/LTR.
- [ ] **Step 4: Run the RTL smoke test, full typecheck, and production build; verify existing route URLs and Supabase middleware behavior remain intact.**
- [ ] **Step 5: Commit only this task's RTL and localization files.**
