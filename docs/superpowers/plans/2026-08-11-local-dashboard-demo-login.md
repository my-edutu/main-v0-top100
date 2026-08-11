# Local Dashboard Demo Login Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an interactive temporary member account that works only on a loopback development server and never touches Supabase or external providers.

**Architecture:** A small server-only auth boundary issues an HTTP-only demo cookie after validating fixed credentials and the request host. Middleware uses that cookie to admit `/dashboard` and rewrite existing `/api/member/*` calls to a catch-all in-memory demo API, leaving the dashboard UI and production Supabase routes unchanged.

**Tech Stack:** Next.js 15 App Router and middleware, TypeScript, Vitest, React 18.

## Global Constraints

- Credentials are `demo@top100.local` / `Top100Demo!2026`.
- Demo behavior requires both `NODE_ENV=development` and a loopback hostname: `localhost`, `127.0.0.1`, or `[::1]`.
- Admin routes are excluded.
- Payments, email delivery, and database writes are simulated.
- Existing uncommitted changes in `app/login/page-content.tsx`, `app/admin/login/page-content.tsx`, and `lib/auth-utils.ts` must be preserved.

---

### Task 1: Development session boundary

**Files:**
- Create: `lib/dev-dashboard/auth.ts`
- Create: `tests/dev-dashboard/auth.test.ts`

**Interfaces:**
- Produces: `DEV_DASHBOARD_COOKIE`, `isLoopbackDevelopment(requestLike)`, `classifyDemoCredentials(email, password)`, and `hasValidDemoSession(requestLike)`.

- [ ] **Step 1: Write failing boundary tests**

Test literal loopback hosts, a production environment argument, exact credentials, wrong-password handling for the demo email, non-demo fall-through, and cookie recognition. Each assertion exercises an exported function; no framework behavior is mocked.

- [ ] **Step 2: Verify the tests fail**

Run: `npm test -- tests/dev-dashboard/auth.test.ts`

Expected: FAIL because `@/lib/dev-dashboard/auth` does not exist.

- [ ] **Step 3: Implement the boundary**

Implement pure functions that accept the environment explicitly where needed. Normalize host headers by removing ports without breaking bracketed IPv6. Return credential classifications `'authenticated'`, `'invalid-demo-password'`, or `'not-demo'` so normal member credentials can continue to Supabase.

- [ ] **Step 4: Verify the tests pass**

Run: `npm test -- tests/dev-dashboard/auth.test.ts`

Expected: PASS.

### Task 2: Interactive in-memory member backend

**Files:**
- Create: `lib/dev-dashboard/store.ts`
- Create: `lib/dev-dashboard/handler.ts`
- Create: `tests/dev-dashboard/handler.test.ts`

**Interfaces:**
- Consumes: `hasValidDemoSession(requestLike)` from Task 1.
- Produces: `handleDemoMemberRequest(request, pathSegments)` returning a standard `Response` and a `DemoDashboardStore` retained on `globalThis`.

- [ ] **Step 1: Write failing API behavior tests**

Create real `Request` objects with a loopback URL and valid cookie. Cover `GET me`, `PATCH me`, post create/update/delete, conversation send, notification read, group create/join/message, opportunity save, invitation RSVP, award quote, and unsupported-path `501`. Assert response payloads and subsequent reads so mutations—not internal calls—prove persistence.

- [ ] **Step 2: Verify the tests fail**

Run: `npm test -- tests/dev-dashboard/handler.test.ts`

Expected: FAIL because the handler does not exist.

- [ ] **Step 3: Add realistic fixtures and routing**

Seed one approved demo profile plus representative notifications, posts, conversations/messages, groups/messages, opportunities, invitations, and award state. Route by HTTP method plus path segments and keep response field names identical to the existing client wrappers. Validate required mutation fields and return `400`, `404`, or `501` as appropriate. Payment checkout returns a local dashboard URL rather than contacting Paystack.

- [ ] **Step 4: Verify mutation tests pass**

Run: `npm test -- tests/dev-dashboard/handler.test.ts`

Expected: PASS with every read-after-write assertion green.

### Task 3: Session route and transparent API rewrite

**Files:**
- Create: `app/api/dev/dashboard-session/route.ts`
- Create: `app/api/dev-dashboard/[...path]/route.ts`
- Modify: `utils/supabase/middleware.ts`
- Modify: `middleware.ts`
- Test: `tests/dev-dashboard/routes.test.ts`

**Interfaces:**
- Consumes: auth boundary and demo handler from Tasks 1–2.
- Produces: `POST` and `DELETE /api/dev/dashboard-session`; demo rewrite for `/api/member/:path*`; dashboard admission for a valid demo cookie.

- [ ] **Step 1: Write failing route tests**

Call the route functions with real `NextRequest` objects. Assert successful login sets the exact cookie attributes, wrong demo password returns `401`, a non-loopback request returns `404`, logout expires the cookie, and the catch-all rejects missing sessions.

- [ ] **Step 2: Verify the tests fail**

Run: `npm test -- tests/dev-dashboard/routes.test.ts`

Expected: FAIL because the routes do not exist.

- [ ] **Step 3: Implement routes and middleware**

Set the demo cookie `httpOnly`, `sameSite=lax`, `secure=false`, `path=/`, and a short max age. In middleware, check the demo guard before creating or calling Supabase. Admit only `/dashboard`; rewrite authenticated `/api/member/*` to `/api/dev-dashboard/*`. Add `/api/member/:path*` to the matcher while retaining the existing static-asset exclusions.

- [ ] **Step 4: Verify route tests pass**

Run: `npm test -- tests/dev-dashboard/routes.test.ts`

Expected: PASS.

### Task 4: Login and logout integration

**Files:**
- Modify: `app/login/page-content.tsx`
- Modify: `app/dashboard/dashboard-header.tsx`
- Modify: `app/dashboard/sign-out-button.tsx`
- Test: `tests/dev-dashboard/login-flow.test.ts`

**Interfaces:**
- Consumes: `/api/dev/dashboard-session` from Task 3.
- Produces: demo-first credential handling and cookie-clearing logout without changing normal Supabase authentication.

- [ ] **Step 1: Write failing flow tests for the extracted decision helper**

Test that an authenticated demo response redirects to a sanitized dashboard path, invalid demo password displays `Invalid email or password.`, and a `not-demo` response continues to Supabase. The production change that breaks each test is the wrong branch selection.

- [ ] **Step 2: Verify the tests fail**

Run: `npm test -- tests/dev-dashboard/login-flow.test.ts`

Expected: FAIL because the helper/integration does not exist.

- [ ] **Step 3: Integrate the login form and both sign-out controls**

Before CAPTCHA/Supabase, post the submitted credentials to the demo-session route. Redirect immediately only when `demo: true`; show the route error only for handled invalid demo credentials; otherwise continue the current code unchanged. On sign-out, delete the demo session before calling Supabase sign-out.

- [ ] **Step 4: Verify focused tests pass**

Run: `npm test -- tests/dev-dashboard`

Expected: PASS.

### Task 5: Full verification and browser walkthrough

**Files:**
- Modify only files required by failures found during verification.

- [ ] **Step 1: Run static and automated verification**

Run: `npm test`

Run: `npx tsc --noEmit`

Run: `npm run build`

Expected: every command exits `0` with no new errors.

- [ ] **Step 2: Walk through the localhost flow**

Using the running development server, log in with the temporary credentials, confirm the member name appears, edit and save a profile field, create a post, send a message, toggle an opportunity bookmark, RSVP to an event, refresh, and confirm the in-memory changes remain. Sign out and confirm `/dashboard` redirects to `/login`.

- [ ] **Step 3: Confirm the production guard**

Run the boundary tests with the production environment argument and confirm no demo credential or cookie is accepted. Review `git diff --check` and the final diff to ensure unrelated user changes remain intact.
