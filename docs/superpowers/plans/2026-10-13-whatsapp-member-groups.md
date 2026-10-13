# WhatsApp Member Groups Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Replace member-facing in-app Groups with a one-time random WhatsApp group assignment and announce the new flow in the dashboard inbox.

**Architecture:** A Supabase migration adds one unique assignment row per member and an idempotent in-app notification for currently approved profiles. An authenticated server endpoint creates or returns a member's saved assignment; the Groups page animates the first reveal and exposes only that invite as an explicit WhatsApp action.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Supabase Postgres, Vitest, Lucide React, Tailwind CSS.

**Spec:** `docs/superpowers/specs/2026-10-13-whatsapp-member-groups-design.md`

## Global Constraints

- Only authenticated, approved members can receive an assignment or see an invite link.
- Each member receives one random assignment, saved permanently unless a future explicit reassignment workflow is designed.
- Group sizes may differ; do not add balancing logic or a group picker.
- Keep the three supplied invite URLs in server-owned configuration and return only the assigned destination.
- The join action is deliberate and opens the saved invite in a new tab; the app does not track WhatsApp membership.
- Deliver a stable, one-time in-app announcement to the approved members targeted by the campaign; do not send email or push notifications.
- Respect reduced-motion preferences and announce the assignment accessibly.
- Before writing any product code, read the local Next.js App Router guides at `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md` and `node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md`.

## Review Focus

- Two simultaneous first visits for one member must return the same committed assignment; pin uniqueness and conflict recovery in Task 2.
- Pending, suspended, or unauthenticated members must not receive group keys or URLs; pin status and session checks in Task 2.
- Missing migration/schema state must produce a retryable response without a browser-side assignment; pin API error mapping in Task 2 and retry state in Task 3.
- A malformed or unknown saved group key must never resolve to an arbitrary invite; pin allowlist lookup in Task 2.
- Rebuilding/rerunning the notification campaign must not duplicate inbox items; pin stable campaign identity and uniqueness in Task 1.

---

### Task 1: Persist assignments and announce the launch

**Files:**
- Create: `supabase/migrations/20261013120000_whatsapp_member_groups.sql`
- Modify (generated): `supabase/SETUP-ALL.sql`
- Test: `tests/groups/whatsapp-member-groups-migration.test.ts`

**Interfaces:**
- Produces: `public.whatsapp_group_assignments(profile_id uuid primary key, group_key text, assigned_at timestamptz)` with a foreign key to `profiles(id)`, a `group_key` check for `group-1`, `group-2`, or `group-3`, RLS enabled, and service-role-only mutation access.
- Produces: one notification campaign ID `afl-whatsapp-member-groups` with title `Your AFL WhatsApp community is here`, body `Connect with fellow Africa Future Leaders. Open Groups to discover your assigned WhatsApp group.`, CTA label `Discover your group`, and CTA URL `/dashboard/discover/groups`.

- [x] **Step 1: Add migration assertions** for the unique profile assignment, three-key constraint, RLS/service-role policy, approved-only audience, stable campaign ID, correct CTA, and `ON CONFLICT (user_id, campaign_id)` deduplication.
- [x] **Step 2: Run** `npm test -- tests/groups/whatsapp-member-groups-migration.test.ts`; expected: FAIL because the migration is not present.
- [x] **Step 3: Create** the idempotent migration. Backfill the notification for `profiles.role = 'user' AND profiles.membership_status = 'approved'`; use the existing `user_notifications_user_campaign_unique` index to prevent duplicates. Keep the assignment table service-role managed.
- [x] **Step 4: Regenerate** the consolidated bootstrap with `node scripts/build-setup-sql.mjs`; do not edit `SETUP-ALL.sql` manually.
- [x] **Step 5: Run** the migration test and inspect the migration/bootstrap diff; expected: the same migration appears in generated setup SQL and retrying the notification insert is idempotent.
- [x] **Step 6: Commit** as `feat: add WhatsApp group assignment storage`.

### Task 2: Create the authenticated, idempotent assignment endpoint

**Files:**
- Create: `lib/groups/whatsapp.ts`
- Create: `app/api/member/whatsapp-group/route.ts`
- Test: `tests/groups/whatsapp-assignment.test.ts`
- Test: `tests/groups/whatsapp-assignment-route.test.ts`

**Interfaces:**
- Produces: `WhatsAppGroupKey = 'group-1' | 'group-2' | 'group-3'` and a server-owned `WHATSAPP_GROUPS` map from each key to its label and the exact invite URL from the spec.
- Produces: `getWhatsAppGroup(groupKey: unknown): WhatsAppGroup | null` and `resolveWhatsAppGroupAssignment(supabase: SupabaseClient, profileId: string, randomIndex: number): Promise<{ group: WhatsAppGroup; created: boolean }>`; `randomIndex` is in `[0, 3)` so tests can exercise every choice deterministically, and `created` distinguishes the first reveal from later visits.
- Produces: `POST /api/member/whatsapp-group` with no trusted browser input. Success returns `{ group: { key, label, inviteUrl }, created: boolean }`; auth failure is 401, non-approved member is 403, missing table is 503, and unexpected persistence errors are 500.

- [x] **Step 1: Add failing tests** for all three index-to-key mappings, unknown-key rejection, persistence of only the winning concurrent insert, the three exact invite URLs, unauthenticated and non-approved requests, and missing-table handling.
- [x] **Step 2: Run** `npm test -- tests/groups/whatsapp-assignment.test.ts tests/groups/whatsapp-assignment-route.test.ts`; expected: FAIL because the helper or endpoint is incomplete.
- [x] **Step 3: Implement** the server configuration and pure allowlist lookup in `lib/groups/whatsapp.ts`; use Node's `crypto.randomInt(0, 3)` in the route for the first draw.
- [x] **Step 4: Implement** the POST handler using `getCurrentUser`, `createAdminClient`, and `loadProfileForGroups`. Require `membership_status === 'approved'`; attempt an insert with conflict-ignore on `profile_id`, then read the single saved row and resolve its invite through the allowlist. Never accept profile IDs, group keys, or invite URLs from the request body.
- [x] **Step 5: Run** the focused assignment test and inspect the route for authorization, concurrency, and missing-table behavior; expected: every success returns one persisted invite, first creation is marked `created: true`, and repeat calls return the same assignment with `created: false`.
- [x] **Step 6: Commit** as `feat: add persistent WhatsApp group assignment endpoint`.

### Task 3: Replace the member-facing Groups page with the WhatsApp reveal

**Files:**
- Modify: `app/dashboard/discover/groups/page.tsx`
- Create: `app/dashboard/discover/groups/whatsapp-groups-section.tsx`
- Modify: `app/dashboard/discover/groups/[id]/page.tsx`
- Modify or remove if unreferenced: `app/dashboard/groups-section.tsx`
- Modify: `app/dashboard/_components/groups-locked-state.tsx`
- Modify: `app/dashboard/discover/discover-feed.tsx` (remove the old Groups lock)
- Modify: `lib/dev-dashboard/handler.ts` and `lib/dev-dashboard/store.ts` (local preview support)
- Test: `tests/groups/whatsapp-groups-page.test.tsx`
- Test: `tests/dev-dashboard/handler.test.ts`

**Interfaces:**
- Consumes: `POST /api/member/whatsapp-group` from Task 2 and `member.status` from `useDashboardMember()`.
- Produces: a Groups page with loading, retryable error, first-assignment reveal, and saved-assignment states. The reveal uses label `Group 1`, `Group 2`, or `Group 3` and a **Join your WhatsApp group** external action with `target="_blank"` and `rel="noopener noreferrer"`. Use `created` to animate only a new assignment; saved assignments render directly.
- Produces: a group-detail route that redirects to `/dashboard/discover/groups`; dashboard navigation continues to use that Groups destination.

- [x] **Step 1: Add failing tests** for the initial assignment request, stable saved assignment on return, retry after API error, no CTA before a group is resolved, reduced-motion reveal behavior, and the group-detail redirect.
- [x] **Step 2: Run** `npm test -- tests/groups/whatsapp-groups-page.test.tsx`; expected: FAIL because the WhatsApp screen is not implemented.
- [x] **Step 3: Replace** the Groups route's `MEMBER_GROUPS_ENABLED` gate and `GroupsSection` with a focused client component that calls the assignment endpoint once on first load, displays loading/error states, and reveals the returned group. Use a short CSS animation and disable it when `prefers-reduced-motion: reduce` is active.
- [x] **Step 4: Update** the non-approved access state with accurate approved-member copy. Redirect legacy group-detail URLs to the Groups page. Remove `GroupsSection` only after confirming no other imports remain.
- [x] **Step 5: Run** the focused page test and inspect the rendered states for keyboard access, readable announcement of the result, safe external link attributes, and absence of unassigned invites; expected: all acceptance cases pass. Also confirm the existing notification inbox renders the Task 1 campaign and CTA and the bell unread count includes it.
- [x] **Step 6: Commit** as `feat: replace in-app groups with WhatsApp reveal`.

## Final review

- Confirm the SQL bootstrap is generated from the migration and the campaign targets approved member profiles only.
- Confirm concurrent assignment requests converge on one database row per profile and only that row's allowlisted invite is returned.
- Confirm unapproved users cannot obtain an assignment through direct API requests.
- Confirm a repeat Groups visit keeps the same assignment, reduced-motion users get a non-animated reveal, and the WhatsApp link opens only after a deliberate click.
- Confirm the bell badge and Updates card show the launch announcement and route to Groups.
