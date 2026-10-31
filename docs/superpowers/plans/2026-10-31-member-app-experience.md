# Member App Experience Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Implement the user-approved first pass of member onboarding, loading, navigation, responsiveness and safe caching improvements.

**Architecture:** Preserve the existing dashboard providers and Next.js App Router. Render stable loading placeholders, use Next's link pending state, and cache only successful same-origin fingerprinted static assets in the worker. Account data stays network-backed.

**Tech Stack:** Next.js 16, React 19, Tailwind, existing Radix primitives, native Cache API and Vitest.

**Spec:** User-approved first-pass design in this chat: onboarding clarity and saved progress; meaningful loading; responsive navigation; mobile forms; safe asset caching; retained errors and duplicate submission prevention.

## Global Constraints

- Preserve other ongoing changes in this checkout; no redesign of the public site.
- No artificial minimum loading delay, no persistent member/payment response caching.
- Preserve OTA detection, push notifications, authentication and onboarding validation.
- Maintain keyboard access, reduced motion and approximately 44px touch targets.

## Review Focus

- Offline or failed requests must not become cached success responses.
- Cache eviction must be bounded and must not remove the current offline fallback.
- Onboarding must retain answers and unlock submission after failed saves.
- Navigation feedback must not move surrounding content or retain a false pending state.
- Small screens and on-screen keyboards must leave form actions reachable.

### Task 1: Loading and navigation

- [x] Replace spinner-only page and startup states with accessible layout placeholders.
- [x] Add a fixed-position pending hint under Next Link in both navigation variants.
- [x] Preserve existing prefetch and persistent dashboard state.
- [x] Check narrow, tablet and desktop layouts and reduced motion.

### Task 2: Onboarding and forms

- [x] Add synchronous duplicate-save protection, request timeout and busy fieldset.
- [x] Improve step progress semantics, heading focus after successful steps, error association and mobile touch targets.
- [x] Preserve the server's resumable steps and existing welcome-seen state.
- [x] Add a tested keyboard detection helper and hide bottom navigation only while an editable control and software keyboard are active.

### Task 3: Static asset caching

- [x] Write and run failing behavioral worker tests for cache hits, misses, failures and private response exclusion.
- [x] Cache fingerprinted same-origin Next scripts, CSS and fonts only; cap cache size at 60 entries.
- [x] Preserve network-first navigation and offline fallback, push handlers and OTA freshness.

### Task 4: Verification

- [x] Run relevant tests, TypeScript, targeted ESLint and production build.
- [x] Check the rendered app with local preview data; verify loading, onboarding, keyboard behaviour and nav.
- [x] Request a fresh review of this feature's diff, resolve material findings, and report local versus deployed status.

## Execution notes

Ruling: Work in the existing checkout because it contains the approved OTA foundation and concurrent member work. Modify only the scoped shared components; preserve existing changes.

Verification: production build and TypeScript passed; targeted lint has no errors (existing raw logo image warning). Browser previews at 390, 768 and 1280px had no horizontal overflow. Onboarding and loading screenshots are under output/. Production-mode browser populated 24 immutable static assets. Keyboard detection is covered by automated logic tests; a physical Android keyboard check remains a release check. Review findings on initial keyboard measurement, onboarding progress and worker storage failure were resolved. Optional handbook prompts now wait for required setup completion. No production deployment was performed.
