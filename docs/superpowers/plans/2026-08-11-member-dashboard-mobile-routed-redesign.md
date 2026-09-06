# Member Dashboard Mobile-First Routed Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the dashboard's fourteen-section client switcher with a responsive routed member app whose mobile navigation is exactly Home, Discover, Messages, and Me while retaining brightly colored cards.

**Architecture:** A persistent App Router layout owns the dashboard shell, member bootstrap, and scalar unread/award badges. Each feature becomes a route-local client page that reuses the existing working section components, with list/detail URLs for messages and groups and compatibility redirects for legacy `?section=` links. Pure navigation, legacy-route, and form-patch helpers are test-driven before the UI is migrated.

**Tech Stack:** Next.js 15 App Router, React 18, TypeScript, Tailwind CSS 3, Framer Motion, Lucide React, Sonner, Vitest 3.

## Global Constraints

- Mobile primary navigation is exactly `Home`, `Discover`, `Messages`, `Me`.
- Discover contains members, groups, opportunities, saved opportunities, events, and magazine.
- Me contains profile, award, posts, feature submission, settings, partnership link, and sign-out.
- Notifications remain in the top app bar and route to `/dashboard/updates`.
- Retain confident brightly colored cards using stable saffron, forest, cobalt, ember, and burgundy category families with WCAG 2.2 AA foreground contrast.
- Mobile controls are at least 44px; the bottom bar respects `env(safe-area-inset-bottom)` and content is never obscured by it.
- Award checkout returns to `/dashboard/me/award?payment=done` and preserves existing polling and anti-double-charge behavior.
- Saving profile fields must not change settings absent from the submitted form.
- Pending, rejected, and suspended members receive explicit gated states; existing server authorization remains authoritative.
- Existing unrelated worktree changes must be preserved; every commit stages only the exact files listed in that task.

---

## File Structure

```text
app/dashboard/
  _components/
    dashboard-app-bar.tsx          # compact header, notification button, avatar
    dashboard-bottom-nav.tsx       # four mobile primary routes
    dashboard-card.tsx             # bright, accessible category card primitive
    dashboard-desktop-nav.tsx      # icon rail / expanded desktop sidebar
    dashboard-shell.tsx            # provider loading/error states and responsive shell
    membership-status-banner.tsx   # compact status treatment outside Home
    route-section.tsx              # shared title, description, action layout
  _lib/
    navigation.ts                  # route configuration, active-state and title helpers
    legacy-sections.ts             # old section query to routed URL mapping
    profile-patches.ts             # narrow FormData-to-patch builders
  _providers/
    dashboard-badges.tsx           # unread message/update and award-attention scalars
    dashboard-member.tsx           # current member and refreshMember only
  _sections/
    directory-section.tsx          # extracted directory
    feature-section.tsx            # extracted submission workflow
    magazine-section.tsx           # extracted magazine entry
    notifications-section.tsx      # extracted updates inbox
    profile-section.tsx            # extracted BIO editor
    settings-sections.tsx          # routed settings forms
  discover/
    page.tsx
    members/page.tsx
    groups/page.tsx
    groups/[id]/page.tsx
    opportunities/page.tsx
    opportunities/saved/page.tsx
    events/page.tsx
    magazine/page.tsx
  messages/
    page.tsx
    [id]/page.tsx
  me/
    page.tsx
    profile/page.tsx
    award/page.tsx
    award/address/page.tsx
    award/review/page.tsx
    award/payment/page.tsx
    award/tracking/page.tsx
    posts/page.tsx
    posts/new/page.tsx
    posts/[id]/edit/page.tsx
    feature/page.tsx
    settings/page.tsx
    settings/visibility/page.tsx
    settings/notifications/page.tsx
    settings/privacy/page.tsx
  updates/page.tsx
  layout.tsx
  page.tsx
public/dashboard/award/
  address.webp                     # delivery setup illustration
  review.webp                      # award review / secure payment illustration
  tracking.webp                    # dispatched package illustration
```

Existing `awards-section.tsx`, `event-invitations-section.tsx`, `groups-section.tsx`, `messages-section.tsx`, `opportunities-section.tsx`, and `posts-section.tsx` remain in place during the first migration and are adapted behind route wrappers.

---

### Task 1: Dashboard navigation and legacy URL contract

**Files:**
- Create: `app/dashboard/_lib/navigation.ts`
- Create: `app/dashboard/_lib/legacy-sections.ts`
- Create: `tests/dashboard/navigation.test.ts`

**Interfaces:**
- Produces: `primaryDashboardNav`, `discoverNav`, `meNav`, `isDashboardNavActive(pathname, href)`, `resolveDashboardTitle(pathname)`, and `legacySectionDestination(section)`.
- Primary item shape: `{ id: 'home' | 'discover' | 'messages' | 'me'; label: string; href: string; icon: LucideIcon; color: DashboardColor }`.
- `DashboardColor` is `'ember' | 'saffron' | 'forest' | 'cobalt' | 'burgundy' | 'charcoal'`.

- [ ] **Step 1: Write failing navigation tests**

```ts
import { describe, expect, it } from 'vitest'
import {
  primaryDashboardNav,
  discoverNav,
  meNav,
  isDashboardNavActive,
  resolveDashboardTitle,
} from '@/app/dashboard/_lib/navigation'
import { legacySectionDestination } from '@/app/dashboard/_lib/legacy-sections'

describe('dashboard navigation', () => {
  it('exposes exactly the approved four mobile destinations', () => {
    expect(primaryDashboardNav.map(({ label }) => label)).toEqual([
      'Home', 'Discover', 'Messages', 'Me',
    ])
  })

  it('groups discovery and account work without duplicate hrefs', () => {
    expect(discoverNav.map(({ label }) => label)).toEqual([
      'Members', 'Groups', 'Opportunities', 'Saved', 'Events', 'Magazine',
    ])
    expect(meNav.map(({ label }) => label)).toEqual([
      'Profile', 'My award', 'Posts', 'Get featured', 'Settings',
    ])
    const hrefs = [...primaryDashboardNav, ...discoverNav, ...meNav].map(({ href }) => href)
    expect(new Set(hrefs).size).toBe(hrefs.length)
  })

  it('matches descendants without activating Home everywhere', () => {
    expect(isDashboardNavActive('/dashboard', '/dashboard')).toBe(true)
    expect(isDashboardNavActive('/dashboard/discover/events', '/dashboard/discover')).toBe(true)
    expect(isDashboardNavActive('/dashboard/messages/abc', '/dashboard/messages')).toBe(true)
    expect(isDashboardNavActive('/dashboard/me/profile', '/dashboard')).toBe(false)
  })

  it('resolves nested titles and every legacy section', () => {
    expect(resolveDashboardTitle('/dashboard/me/award')).toBe('My award')
    expect(legacySectionDestination('directory')).toBe('/dashboard/discover/members')
    expect(legacySectionDestination('awards')).toBe('/dashboard/me/award')
    expect(legacySectionDestination('partnerships')).toBe('/partnership')
    expect(legacySectionDestination('unknown')).toBe('/dashboard')
  })
})
```

- [ ] **Step 2: Run the focused test and verify failure**

Run: `npm test -- tests/dashboard/navigation.test.ts`

Expected: FAIL because both dashboard helper modules are absent.

- [ ] **Step 3: Implement the pure route configuration**

Define the four primary items with `Home`, `Compass`, `MessageCircle`, and `UserRound` icons. Define Discover and Me arrays with the exact labels and routed hrefs asserted above. Implement active matching with exact matching for `/dashboard` and `pathname === href || pathname.startsWith(href + '/')` for every other route. Resolve the most-specific configured href first so `/dashboard/me/award` returns `My award` rather than `Me`.

Define the legacy mapping:

```ts
const destinations: Record<string, string> = {
  home: '/dashboard',
  profile: '/dashboard/me/profile',
  directory: '/dashboard/discover/members',
  messages: '/dashboard/messages',
  groups: '/dashboard/discover/groups',
  posts: '/dashboard/me/posts',
  opportunities: '/dashboard/discover/opportunities',
  awards: '/dashboard/me/award',
  featured: '/dashboard/me/feature',
  events: '/dashboard/discover/events',
  magazine: '/dashboard/discover/magazine',
  notifications: '/dashboard/updates',
  settings: '/dashboard/me/settings',
  partnerships: '/partnership',
}
```

- [ ] **Step 4: Run the focused test and verify success**

Run: `npm test -- tests/dashboard/navigation.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit the navigation contract**

```bash
git add app/dashboard/_lib/navigation.ts app/dashboard/_lib/legacy-sections.ts tests/dashboard/navigation.test.ts
git commit -m "test: define routed dashboard navigation"
```

---

### Task 2: Narrow profile and settings mutations

**Files:**
- Create: `app/dashboard/_lib/profile-patches.ts`
- Create: `tests/dashboard/profile-patches.test.ts`
- Modify: `app/dashboard/page.tsx`

**Interfaces:**
- Produces: `buildBioPatch(form: FormData): Pick<MemberProfile, 'headline' | 'bio' | 'location' | 'organization' | 'field' | 'emailVisible' | 'recruiterVisible'>`.
- Produces: `buildVisibilityPatch(form: FormData)`, `buildNotificationPatch(form: FormData)`, and `buildPrivacyPatch(form: FormData)` with disjoint preference keys.

- [ ] **Step 1: Write failing patch-isolation tests**

```ts
import { describe, expect, it } from 'vitest'
import {
  buildBioPatch,
  buildNotificationPatch,
  buildPrivacyPatch,
  buildVisibilityPatch,
} from '@/app/dashboard/_lib/profile-patches'

describe('dashboard profile patches', () => {
  it('does not reset settings that are absent from the BIO form', () => {
    const form = new FormData()
    form.set('headline', 'Climate founder')
    form.set('emailVisible', 'on')
    expect(buildBioPatch(form)).toEqual({
      headline: 'Climate founder', bio: '', location: '', organization: '', field: '',
      emailVisible: true, recruiterVisible: false,
    })
    expect(buildBioPatch(form)).not.toHaveProperty('messageAlerts')
    expect(buildBioPatch(form)).not.toHaveProperty('securityEmails')
  })

  it('keeps settings groups disjoint', () => {
    expect(Object.keys(buildVisibilityPatch(new FormData())).sort()).toEqual([
      'allowDirectMessages', 'showInDirectory',
    ])
    expect(Object.keys(buildNotificationPatch(new FormData())).sort()).toEqual([
      'eventReminders', 'magazineAlerts', 'messageAlerts', 'opportunityAlerts',
    ])
    expect(Object.keys(buildPrivacyPatch(new FormData())).sort()).toEqual([
      'hideEmailFromRecruiters', 'requireProfileApproval', 'securityEmails',
    ])
  })
})
```

- [ ] **Step 2: Run the focused test and verify failure**

Run: `npm test -- tests/dashboard/profile-patches.test.ts`

Expected: FAIL because `profile-patches.ts` does not exist.

- [ ] **Step 3: Implement the four pure builders**

Use one local `checked(form, name)` helper returning `form.get(name) === 'on'`. Each exported builder returns only the keys owned by its corresponding form. Do not spread default preference objects into a patch.

- [ ] **Step 4: Replace the monolith's broad patch before routing forms**

Change the current BIO submit handler to call `buildBioPatch(form)` so the known preference-reset bug is fixed while the old dashboard still operates. Leave the server's `buildProfileUpdate` merge behavior unchanged.

- [ ] **Step 5: Run focused and member-hub tests**

Run: `npm test -- tests/dashboard/profile-patches.test.ts tests/dev-dashboard/handler.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit the isolated mutation behavior**

```bash
git add app/dashboard/_lib/profile-patches.ts tests/dashboard/profile-patches.test.ts app/dashboard/page.tsx
git commit -m "fix: isolate dashboard profile preferences"
```

---

### Task 3: Persistent member shell and four-tab responsive navigation

**Files:**
- Create: `app/dashboard/_providers/dashboard-member.tsx`
- Create: `app/dashboard/_providers/dashboard-badges.tsx`
- Create: `app/dashboard/_components/dashboard-card.tsx`
- Create: `app/dashboard/_components/dashboard-app-bar.tsx`
- Create: `app/dashboard/_components/dashboard-bottom-nav.tsx`
- Create: `app/dashboard/_components/dashboard-desktop-nav.tsx`
- Create: `app/dashboard/_components/dashboard-shell.tsx`
- Create: `app/dashboard/_components/membership-status-banner.tsx`
- Create: `app/dashboard/_components/route-section.tsx`
- Create: `app/dashboard/layout.tsx`
- Modify: `app/dashboard/dashboard-header.tsx`
- Test: `tests/dashboard/navigation.test.ts`

**Interfaces:**
- `DashboardMemberProvider` exposes `{ member: MemberProfile; refreshMember(): Promise<void> }` through `useDashboardMember()`.
- `DashboardBadgeProvider` exposes `{ unreadMessages; unreadUpdates; awardNeedsAttention; setUnreadMessages; setUnreadUpdates; setAwardNeedsAttention; refreshBadges(): Promise<void> }`.
- `DashboardCard` accepts `{ href; title; description; icon; color; badge?; compact? }`.
- `DashboardShell` renders `children` inside the responsive app bar, bottom nav, and desktop rail.

- [ ] **Step 1: Extend navigation tests with color and accessibility contracts**

Assert that every primary item has a label, unique href, icon, and allowed category color, and that Home, Discover, Messages, and Me use ember, saffron, cobalt, and burgundy respectively.

- [ ] **Step 2: Run the test and verify the new assertions fail**

Run: `npm test -- tests/dashboard/navigation.test.ts`

Expected: FAIL until the primary color assignments are complete.

- [ ] **Step 3: Implement member and scalar badge providers**

The member provider calls `fetchMemberHubState()` once, stores only `state.members.find((member) => member.id === state.currentMemberId)`, and exposes an awaited refresh. Its loading UI uses a labeled spinner; its error UI contains a Retry button. The badge provider may derive summaries from the existing APIs but stores scalar values only—never conversations, notifications, features, opportunities, groups, or award orders—and exposes `refreshBadges()` for mutation pages.

- [ ] **Step 4: Implement the brightly colored card primitive**

Use this stable class map:

```ts
export const dashboardColorClasses = {
  ember: 'border-orange-200 bg-[#FFE7D5] text-[#6C2600]',
  saffron: 'border-amber-200 bg-[#FFE49A] text-[#563700]',
  forest: 'border-emerald-200 bg-[#CFF3DF] text-[#064C36]',
  cobalt: 'border-blue-200 bg-[#DCE8FF] text-[#123A78]',
  burgundy: 'border-rose-200 bg-[#F8DCE6] text-[#6E1636]',
  charcoal: 'border-slate-200 bg-[#E8EBF0] text-[#252B35]',
} as const
```

Cards use a 16px radius, strong readable foreground, a 44px icon well, `focus-visible:ring-2`, and a subtle two-pixel hover lift. Preserve bright surfaces for Home shortcut and Discover/Me entry cards rather than converting them to white list rows.

- [ ] **Step 5: Implement the mobile app bar and bottom navigation**

The app bar renders brand/title on Home, Back/title on descendants, a notification `Link` to `/dashboard/updates`, and an avatar `Link` to `/dashboard/me`. Remove compact sign-out and the hamburger from mobile. The bottom bar is hidden at `lg`, uses four equal columns, includes labels at all widths, applies `aria-current="page"`, and uses `padding-bottom: env(safe-area-inset-bottom)`.

- [ ] **Step 6: Implement desktop rail and shell**

At `lg`, show an 88px icon rail. At `xl`, expand it to 240px with labels. The main content uses `pb-[calc(92px+env(safe-area-inset-bottom))] lg:pb-8`, 16px mobile gutters, 24px tablet gutters, and a maximum content width of 1280px. Keep `SignOutControl` only inside the Me/account surface.

- [ ] **Step 7: Mount the persistent layout without deleting the current page**

`app/dashboard/layout.tsx` wraps children with member provider, badge provider, and shell. Adjust the current page so it does not render the old `DashboardHeader` or sidebar twice; keep its active-section body temporarily until routed pages replace it.

- [ ] **Step 8: Run tests and type checking focused on new files**

Run: `npm test -- tests/dashboard/navigation.test.ts tests/dashboard/profile-patches.test.ts`

Run: `npx tsc --noEmit --pretty false`

Expected: dashboard tests PASS. Record pre-existing repository type errors separately; no error may originate in `app/dashboard/_components`, `_providers`, `_lib`, or `layout.tsx`.

- [ ] **Step 9: Commit the responsive shell**

```bash
git add app/dashboard/_components app/dashboard/_providers app/dashboard/layout.tsx app/dashboard/dashboard-header.tsx app/dashboard/page.tsx tests/dashboard/navigation.test.ts
git commit -m "feat: add responsive member app shell"
```

---

### Task 4: Short task-focused Home plus Discover and Me landing pages

**Files:**
- Replace: `app/dashboard/page.tsx`
- Create: `app/dashboard/discover/page.tsx`
- Create: `app/dashboard/me/page.tsx`
- Create: `app/dashboard/_components/dashboard-home.tsx`
- Create: `app/dashboard/_lib/home-priority.ts`
- Create: `tests/dashboard/home-priority.test.ts`

**Interfaces:**
- Produces: `selectHomePriority({ member, awardNeedsAttention, unreadMessages, unreadUpdates })` returning `{ kind; title; description; href; color }`; `member` is typed as `Pick<MemberProfile, 'status' | 'profileStatus' | 'bio' | 'headline' | 'bioUpdateCount' | 'bioUpdateLimit'>`.
- Landing pages consume the card primitive and navigation arrays from Tasks 1 and 3.

- [ ] **Step 1: Write failing priority-selection tests**

```ts
import { describe, expect, it } from 'vitest'
import { selectHomePriority } from '@/app/dashboard/_lib/home-priority'

const member = {
  status: 'approved', profileStatus: 'approved', bio: 'Complete',
  headline: 'Founder', bioUpdateCount: 0, bioUpdateLimit: 2,
} as const

describe('Home priority', () => {
  it('puts an award action ahead of inbox work', () => {
    expect(selectHomePriority({ member, awardNeedsAttention: true, unreadMessages: 4, unreadUpdates: 2 }).kind)
      .toBe('award')
  })

  it('uses messages when membership work is complete', () => {
    expect(selectHomePriority({ member, awardNeedsAttention: false, unreadMessages: 4, unreadUpdates: 2 }).href)
      .toBe('/dashboard/messages')
  })
})
```

- [ ] **Step 2: Run the focused test and verify failure**

Run: `npm test -- tests/dashboard/home-priority.test.ts`

Expected: FAIL because `home-priority.ts` does not exist.

- [ ] **Step 3: Implement deterministic priority selection**

Priority order is membership restriction, incomplete BIO, award attention, unread messages, unread updates, then Discover. Each result contains final member-facing copy and one routed href; it never opens local component state.

- [ ] **Step 4: Build the short Home experience**

Render compact greeting/profile progress, one `Your next move` card, a maximum three-row `Coming up` area, four bright two-column shortcuts, and at most three recent message/update rows. Home loads these previews locally from the existing conversation, invitation, and member-hub clients; it passes only their unread totals back to the badge provider. Remove the eleven fixed 190px action cards, the large global welcome panel, and decorative balloon motion from routine navigation.

- [ ] **Step 5: Build Discover and Me landing pages**

Discover renders six bright category cards from `discoverNav`, with members/groups using forest, opportunities/saved/events using saffron, and magazine using burgundy. Me renders bright cards for profile, award, posts, feature, and settings, followed by a plain partnership link and `SignOutControl`.

- [ ] **Step 6: Run tests and commit the three landing pages**

Run: `npm test -- tests/dashboard`

Expected: PASS.

```bash
git add app/dashboard/page.tsx app/dashboard/discover/page.tsx app/dashboard/me/page.tsx app/dashboard/_components/dashboard-home.tsx app/dashboard/_lib/home-priority.ts tests/dashboard/home-priority.test.ts
git commit -m "feat: redesign member dashboard home"
```

---

### Task 5: Route Discover features and extract inline sections

**Files:**
- Create: `app/dashboard/_sections/directory-section.tsx`
- Create: `app/dashboard/_sections/magazine-section.tsx`
- Create: `app/dashboard/discover/members/page.tsx`
- Create: `app/dashboard/discover/groups/page.tsx`
- Create: `app/dashboard/discover/groups/[id]/page.tsx`
- Create: `app/dashboard/discover/opportunities/page.tsx`
- Create: `app/dashboard/discover/opportunities/saved/page.tsx`
- Create: `app/dashboard/discover/events/page.tsx`
- Create: `app/dashboard/discover/magazine/page.tsx`
- Modify: `app/dashboard/groups-section.tsx`
- Modify: `app/dashboard/opportunities-section.tsx`

**Interfaces:**
- `DirectorySection` receives `{ member: MemberProfile }` and links message actions to `/dashboard/messages?to=<profileId>&name=<encodedName>`.
- `GroupsSection` receives optional `{ selectedGroupId?: string; onGroupSelected?(id: string): void }` so the route owns mobile selection.
- `OpportunitiesSection` receives optional `{ initialSavedOnly?: boolean }`.

- [ ] **Step 1: Add failing route-coverage assertions**

Extend `tests/dashboard/navigation.test.ts` to assert that every Discover href corresponds to the exact route listed in the approved spec and that `/dashboard/discover/opportunities/saved` resolves the title `Saved opportunities`.

- [ ] **Step 2: Run the test and verify failure**

Run: `npm test -- tests/dashboard/navigation.test.ts`

Expected: FAIL until the saved route has the most-specific configured title.

- [ ] **Step 3: Extract Directory and Magazine without changing feature behavior**

Move their component bodies, helper constants, and required imports from the former monolith into `_sections`. Replace callbacks with `Link`/`router.push` route navigation. Preserve public awardee and public magazine links.

- [ ] **Step 4: Add routed wrappers for existing isolated sections**

Each wrapper uses `useDashboardMember()` and `RouteSection`. Opportunities and Events render the existing components. The saved route passes `initialSavedOnly`. Groups list uses `/dashboard/discover/groups`; selecting a group pushes `/dashboard/discover/groups/<id>`, and the detail wrapper passes the route id back into `GroupsSection`.

- [ ] **Step 5: Preserve membership gates**

Pending members may browse the directory and groups but see an explanatory card where join/create controls would appear. Suspended/rejected members see API-derived errors with member-facing recovery copy; routes remain visible.

- [ ] **Step 6: Run dashboard and feature-domain tests**

Run: `npm test -- tests/dashboard tests/groups tests/opportunities tests/events`

Expected: PASS.

- [ ] **Step 7: Commit Discover routes**

```bash
git add app/dashboard/_sections/directory-section.tsx app/dashboard/_sections/magazine-section.tsx app/dashboard/discover app/dashboard/groups-section.tsx app/dashboard/opportunities-section.tsx tests/dashboard/navigation.test.ts
git commit -m "feat: route dashboard discovery features"
```

---

### Task 6: Route messages, compose recipient, and conversation detail

**Files:**
- Create: `app/dashboard/messages/page.tsx`
- Create: `app/dashboard/messages/[id]/page.tsx`
- Modify: `app/dashboard/messages-section.tsx`
- Modify: `app/dashboard/_sections/directory-section.tsx`
- Create: `app/dashboard/_lib/message-route.ts`
- Create: `tests/dashboard/message-route.test.ts`

**Interfaces:**
- Produces: `parseMessageRecipient(searchParams)` returning `{ profileId: string; name: string } | null` after validating non-empty values.
- `MessagesSection` receives `{ member; initialConversationId?; pendingRecipient?; onUnreadChange; onConversationChange }`.
- `onConversationChange(id)` pushes `/dashboard/messages/<id>`; `onConversationChange(null)` pushes `/dashboard/messages`.

- [ ] **Step 1: Write failing compose-query tests**

```ts
import { describe, expect, it } from 'vitest'
import { parseMessageRecipient } from '@/app/dashboard/_lib/message-route'

describe('message route state', () => {
  it('accepts a valid directory recipient', () => {
    expect(parseMessageRecipient(new URLSearchParams('to=p-12&name=Amara%20Okafor')))
      .toEqual({ profileId: 'p-12', name: 'Amara Okafor' })
  })

  it('rejects partial recipient state', () => {
    expect(parseMessageRecipient(new URLSearchParams('to=p-12'))).toBeNull()
    expect(parseMessageRecipient(new URLSearchParams('name=Amara'))).toBeNull()
  })
})
```

- [ ] **Step 2: Run the test and verify failure**

Run: `npm test -- tests/dashboard/message-route.test.ts`

Expected: FAIL because `message-route.ts` does not exist.

- [ ] **Step 3: Implement URL-owned selection in MessagesSection**

Initialize active conversation from `initialConversationId`. On mobile list selection, call `onConversationChange(id)` rather than keeping the destination exclusively in local state. On Back, call `onConversationChange(null)`. Keep desktop two-pane rendering, list polling, thread polling, draft sending, setup-required state, and unread callbacks unchanged.

- [ ] **Step 4: Add list and detail page wrappers**

The list page parses `to` and `name`, passes the recipient, and routes new conversation ids to the detail page. The detail page reads `[id]`, passes it as `initialConversationId`, and routes Back to the list. Both update the global message badge with `setUnreadMessages`.

- [ ] **Step 5: Verify messaging and commit**

Run: `npm test -- tests/dashboard/message-route.test.ts tests/dev-dashboard/handler.test.ts`

Expected: PASS.

```bash
git add app/dashboard/messages app/dashboard/messages-section.tsx app/dashboard/_sections/directory-section.tsx app/dashboard/_lib/message-route.ts tests/dashboard/message-route.test.ts
git commit -m "feat: add routed member conversations"
```

---

### Task 7: Route Me workflows and split settings by responsibility

**Files:**
- Create: `app/dashboard/_sections/profile-section.tsx`
- Create: `app/dashboard/_sections/feature-section.tsx`
- Create: `app/dashboard/_sections/settings-sections.tsx`
- Create: `app/dashboard/me/profile/page.tsx`
- Create: `app/dashboard/me/posts/page.tsx`
- Create: `app/dashboard/me/posts/new/page.tsx`
- Create: `app/dashboard/me/posts/[id]/edit/page.tsx`
- Create: `app/dashboard/me/feature/page.tsx`
- Create: `app/dashboard/me/settings/page.tsx`
- Create: `app/dashboard/me/settings/visibility/page.tsx`
- Create: `app/dashboard/me/settings/notifications/page.tsx`
- Create: `app/dashboard/me/settings/privacy/page.tsx`
- Modify: `app/dashboard/posts-section.tsx`

**Interfaces:**
- Profile page submits `buildBioPatch`.
- Visibility, notification, and privacy pages submit only their matching Task 2 builders.
- `PostsSection` accepts optional `{ mode?: 'list' | 'new' | 'edit'; postId?: string }` so editor state opens from the route.

- [ ] **Step 1: Extend patch tests with exact value assertions**

Set each checkbox on and off in separate `FormData` instances and assert the returned booleans for all visibility, notification, and privacy keys. Assert no builder contains a key owned by another group.

- [ ] **Step 2: Run the tests and verify the expanded contract**

Run: `npm test -- tests/dashboard/profile-patches.test.ts`

Expected: PASS after Task 2; the new cases must expose any key mismatch before UI extraction.

- [ ] **Step 3: Extract Profile, Feature, and Settings sections**

Move component bodies and helpers out of the deleted monolith. Give each route its own saving, saved, and error state. BIO edit-quota exhaustion disables only BIO fields and BIO submission; it does not disable visibility, notification, or privacy preference pages.

- [ ] **Step 4: Add routed pages**

Profile refreshes the member after save. Feature submits with `createFeatureSubmission` and renders previous submissions. Settings overview shows three bright entry cards and account status. Each settings child page submits one narrow patch and presents a sticky mobile Save action above the bottom-nav safe area.

- [ ] **Step 5: Route post list and editor state**

Adapt `PostsSection` so list, new composer, and edit screens can initialize from route props. Publish restrictions remain visible: pending users may save drafts, approved members may publish, and suspended/rejected users see explanatory disabled states.

- [ ] **Step 6: Run dashboard and posts tests**

Run: `npm test -- tests/dashboard tests/member-posts tests/dev-dashboard/handler.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit Me routes**

```bash
git add app/dashboard/_sections/profile-section.tsx app/dashboard/_sections/feature-section.tsx app/dashboard/_sections/settings-sections.tsx app/dashboard/me app/dashboard/posts-section.tsx tests/dashboard/profile-patches.test.ts
git commit -m "feat: route dashboard account workflows"
```

---

### Task 8: Generate purposeful award journey illustrations

**Files:**
- Create: `public/dashboard/award/address.webp`
- Create: `public/dashboard/award/review.webp`
- Create: `public/dashboard/award/tracking.webp`
- Create: `docs/superpowers/assets/2026-08-11-award-illustration-prompts.md`

**Interfaces:**
- Produces three square raster assets with a shared warm editorial/soft-3D visual language, no embedded text, no logos, and no watermark.
- Address illustration communicates delivery setup; review communicates a physical award plus secure review/payment; tracking communicates a protected parcel moving across an abstract African route.

- [ ] **Step 1: Generate the address illustration with the built-in image generation tool**

Use this prompt:

```text
Use case: stylized-concept
Asset type: compact mobile web-app onboarding illustration
Primary request: an elegant editorial illustration for entering an award delivery address
Scene/backdrop: warm ivory paper canvas, no border and no frame
Subject: a small modern home location pin, a carefully wrapped premium award parcel, and a subtle curved route line
Style/medium: polished soft 3D illustration with crisp simplified shapes and a tasteful African editorial design sensibility
Composition/framing: centered square composition, generous padding, readable at 160 pixels
Lighting/mood: bright, optimistic, trustworthy
Color palette: ember orange, saffron yellow, forest green, cobalt blue, burgundy accents, warm ivory
Constraints: no people, no text, no letters, no numbers, no logo, no watermark; keep the background calm and the subject visually compact
```

- [ ] **Step 2: Generate the review/payment illustration with the built-in image generation tool**

Use this prompt:

```text
Use case: stylized-concept
Asset type: compact mobile web-app checkout illustration
Primary request: an elegant editorial illustration for reviewing and securely paying for a physical leadership award delivery
Scene/backdrop: warm ivory paper canvas, no border and no frame
Subject: a premium sculptural award, a concise order-review card represented only by abstract lines, a small shield and check mark, and a sealed parcel
Style/medium: polished soft 3D illustration with crisp simplified shapes and a tasteful African editorial design sensibility
Composition/framing: centered square composition, generous padding, readable at 160 pixels
Lighting/mood: celebratory, secure, calm
Color palette: ember orange, saffron yellow, cobalt blue, burgundy accents, warm ivory
Constraints: no currency symbols, no readable text, no letters, no numbers, no logo, no watermark
```

- [ ] **Step 3: Generate the tracking illustration with the built-in image generation tool**

Use this prompt:

```text
Use case: stylized-concept
Asset type: compact mobile web-app delivery tracking illustration
Primary request: an elegant editorial illustration for tracking a dispatched leadership award parcel
Scene/backdrop: warm ivory paper canvas with a very subtle abstract contour-line motif, no border and no frame
Subject: a protected premium parcel moving along a curved dotted route with three milestone dots, a small delivery van, and a destination pin; route loosely echoes the African continent without literal map labels
Style/medium: polished soft 3D illustration with crisp simplified shapes and a tasteful African editorial design sensibility
Composition/framing: centered square composition, generous padding, readable at 160 pixels
Lighting/mood: energetic, reassuring, forward-moving
Color palette: forest green, cobalt blue, ember orange, saffron yellow, warm ivory
Constraints: no people, no readable text, no letters, no numbers, no logo, no watermark
```

- [ ] **Step 4: Inspect, select, and persist assets**

Inspect each output for subject clarity, consistent palette, absence of accidental text/watermarks, and useful small-size composition. Copy the selected outputs from the built-in generation directory into the exact three `public/dashboard/award/*.webp` paths without overwriting unrelated assets. Record the final prompts and original generated-image paths in the prompt document.

- [ ] **Step 5: Validate raster assets**

Run: `file public/dashboard/award/address.webp public/dashboard/award/review.webp public/dashboard/award/tracking.webp`

Expected: all three are valid WebP images.

Run a local image-dimension check and confirm every asset is square, at least 768×768, and below 700 KB after lossless or visually high-quality WebP optimization.

- [ ] **Step 6: Commit the illustration set**

```bash
git add public/dashboard/award/address.webp public/dashboard/award/review.webp public/dashboard/award/tracking.webp docs/superpowers/assets/2026-08-11-award-illustration-prompts.md
git commit -m "feat: add award journey illustrations"
```

---

### Task 9: Route notifications and build the guided award journey safely

**Files:**
- Create: `app/dashboard/_sections/notifications-section.tsx`
- Create: `app/dashboard/updates/page.tsx`
- Create: `app/dashboard/me/award/page.tsx`
- Create: `app/dashboard/me/award/address/page.tsx`
- Create: `app/dashboard/me/award/review/page.tsx`
- Create: `app/dashboard/me/award/payment/page.tsx`
- Create: `app/dashboard/me/award/tracking/page.tsx`
- Create: `app/dashboard/_components/award-journey.tsx`
- Create: `app/dashboard/_lib/award-journey.ts`
- Modify: `app/dashboard/awards-section.tsx`
- Modify: `app/api/member/award/checkout/route.ts`
- Modify: `lib/dev-dashboard/handler.ts`
- Modify: `lib/dev-dashboard/store.ts`
- Modify: `lib/dev-dashboard/login.ts`
- Modify: `tests/dev-dashboard/login-flow.test.ts`
- Modify: `tests/dev-dashboard/handler.test.ts`
- Create: `lib/awards/return-url.ts`
- Create: `tests/awards/return-url.test.ts`
- Create: `tests/awards/journey.test.ts`

**Interfaces:**
- Produces: `awardReturnPath({ paymentDone, demo? })` returning `/dashboard/me/award`, with `payment=done` and optional `demo=1` encoded through `URLSearchParams`.
- Produces: `resolveAwardStep(order)` returning `'address' | 'review' | 'payment' | 'tracking'` from the existing award order status; route wrappers redirect to the earliest valid step.
- Local demo login accepts `/dashboard` and every `/dashboard/...` descendant while rejecting protocol-relative and external destinations.

- [ ] **Step 1: Write failing return-path and nested-login tests**

```ts
import { describe, expect, it } from 'vitest'
import { awardReturnPath } from '@/lib/awards/return-url'

describe('award return path', () => {
  it('returns payment completion to the routed award page', () => {
    expect(awardReturnPath({ paymentDone: true })).toBe('/dashboard/me/award?payment=done')
    expect(awardReturnPath({ paymentDone: true, demo: true }))
      .toBe('/dashboard/me/award?payment=done&demo=1')
  })
})
```

Add journey assertions using literal order states: no order or draft address resolves to `address`; quoted resolves to `review`; awaiting payment resolves to `payment`; paid, processing, dispatched, delivered, and exception states resolve to `tracking`. Add a login-flow assertion that `/dashboard/messages/conversation-1` is preserved and `//evil.example/dashboard` falls back to `/dashboard`.

- [ ] **Step 2: Run focused tests and verify failure**

Run: `npm test -- tests/awards/return-url.test.ts tests/awards/journey.test.ts tests/dev-dashboard/login-flow.test.ts`

Expected: FAIL because both award helpers are absent and nested dashboard login currently falls back to Home.

- [ ] **Step 3: Implement and integrate award return paths**

Use `awardReturnPath({ paymentDone: true })` in Paystack callback URL construction and `{ paymentDone: true, demo: true }` in the demo checkout handler. The routed award page consumes `payment=done`, preserves current webhook polling, then removes only the transient payment query with `router.replace('/dashboard/me/award')`.

- [ ] **Step 4: Split the award form into guarded routed steps**

Extract the current award state and API calls without changing their server contracts. `/address` contains short contact and address groups with inline validation and Back/Continue controls. `/review` loads the live quote, shows address/delivery/total summaries, and offers Edit address or Continue to payment. `/payment` contains only secure-payment explanation and the Paystack handoff. `/tracking` contains confirmation, dispatch timeline, courier status, and support guidance. `award-journey.ts` guards every page by redirecting to the earliest incomplete prerequisite. Route-level loading fallbacks use labeled skeletons rather than blank panels.

- [ ] **Step 5: Add progress and purposeful illustrations**

`AwardJourney` renders four labeled steps—Address, Review, Payment, Tracking—with `aria-current="step"`. Address uses `/dashboard/award/address.webp`; Review and Payment use `/dashboard/award/review.webp`; Tracking uses `/dashboard/award/tracking.webp`. Illustrations stay secondary (maximum 176px mobile), use concise alt text only when informative, and never replace headings, instructions, field labels, status text, or validation.

- [ ] **Step 6: Route the notification inbox and update CTAs**

Extract the existing notification list into `/dashboard/updates`, update the global unread count after mark-one/mark-all, and replace seeded demo CTAs with `/dashboard/me/profile` and `/dashboard/discover/opportunities`.

- [ ] **Step 7: Permit safe nested demo returns**

Change `dashboardRedirect` to accept paths matching `requestedPath === '/dashboard' || requestedPath.startsWith('/dashboard/') || requestedPath.startsWith('/dashboard?')`. Continue rejecting any string that does not begin with a single-rooted dashboard path.

- [ ] **Step 8: Run payment, demo, and dashboard tests**

Run: `npm test -- tests/awards tests/payments tests/dev-dashboard tests/dashboard`

Expected: PASS.

- [ ] **Step 9: Commit routed award and updates flows**

```bash
git add app/dashboard/_sections/notifications-section.tsx app/dashboard/_components/award-journey.tsx app/dashboard/_lib/award-journey.ts app/dashboard/updates app/dashboard/me/award app/dashboard/awards-section.tsx app/api/member/award/checkout/route.ts lib/awards/return-url.ts lib/dev-dashboard/handler.ts lib/dev-dashboard/store.ts lib/dev-dashboard/login.ts tests/awards/return-url.test.ts tests/awards/journey.test.ts tests/dev-dashboard/login-flow.test.ts tests/dev-dashboard/handler.test.ts
git commit -m "feat: add guided award journey"
```

---

### Task 10: Legacy compatibility, monolith removal, and full verification

**Files:**
- Modify: `app/dashboard/page.tsx`
- Modify: `app/dashboard/dashboard-header.tsx`
- Modify: `tests/dashboard/navigation.test.ts`
- Modify: `tests/dev-dashboard/routes.test.ts`
- Delete after route parity is proven: obsolete inline section code and old active-section sidebar code from `app/dashboard/page.tsx`

**Interfaces:**
- `/dashboard?section=<legacy>` performs a single client normalization using `router.replace(legacySectionDestination(section))` while preserving `payment=done` only for the award destination.
- Nested `/dashboard/...` routes remain protected in production and admitted by valid localhost demo sessions.

- [ ] **Step 1: Add complete compatibility assertions**

In `tests/dashboard/navigation.test.ts`, loop over all fourteen legacy section names and assert the mapping from Task 1. In `tests/dev-dashboard/routes.test.ts`, assert a valid demo cookie admits `/dashboard/discover`, `/dashboard/messages/c-1`, and `/dashboard/me/settings/privacy` while requests without authentication retain existing redirect behavior.

- [ ] **Step 2: Run the focused tests**

Run: `npm test -- tests/dashboard/navigation.test.ts tests/dev-dashboard/routes.test.ts`

Expected: PASS after Tasks 1 and 9; any failure blocks deletion of old navigation.

- [ ] **Step 3: Normalize legacy entry links once**

At the Home route boundary, read `section` from `useSearchParams`, calculate the destination with `legacySectionDestination`, and call `router.replace`. Do not maintain a parallel section state or redirect chain.

- [ ] **Step 4: Remove the old dashboard state machine**

Delete `DashboardSection`, `activeSection`, `sectionPreview`, `pendingRecipient`, `openSection`, the old mobile sheet/sidebar, and inline conditionals that render fourteen sections. Remove eager conversation and full award-order fetches from Home; only badge summaries remain global. Remove imports that were moved into routed pages.

- [ ] **Step 5: Run automated verification**

Run: `npm test`

Run: `npx tsc --noEmit --pretty false`

Run: `npm run build`

Expected: all 541 existing tests plus the new dashboard tests PASS. Typecheck/build must introduce no dashboard errors; record unrelated pre-existing repository failures with their exact file and diagnostic.

- [ ] **Step 6: Run browser verification at required breakpoints**

On localhost, verify at 360×800, 390×844, 430×932, 768×1024, 1024×768, and 1440×900:

- Bottom navigation shows exactly Home, Discover, Messages, Me below 1024px.
- Bright category cards remain visually prominent and every label is readable.
- No page has horizontal overflow; bottom actions remain above the safe-area bar.
- Notification bell and avatar are reachable; sign-out exists in Me, not the mobile header.
- Home is shorter than the former eleven-card directory and shows one priority action.
- Discover routes open Members, Groups, Opportunities, Saved, Events, and Magazine.
- Directory-to-message compose, conversation Back/refresh, group detail Back/refresh, BIO save, preference save, post draft, feature submission, notification read, award quote, and demo payment completion all work.
- Award address, review, payment, and tracking routes show progress, preserve state, enforce prerequisites, and display the three approved illustrations without displacing form/status content.
- Keyboard Tab shows a visible focus ring; route navigation exposes `aria-current="page"`.

- [ ] **Step 7: Inspect diff integrity**

Run: `git diff --check`

Run: `git status --short`

Review the diff to confirm unrelated user changes remain untouched and no production auth/payment guard was weakened.

- [ ] **Step 8: Commit cleanup and verification fixes**

```bash
git add app/dashboard tests/dashboard tests/dev-dashboard/routes.test.ts
git commit -m "refactor: complete routed member dashboard"
```

---

## Completion Standard

The work is complete only when the four-tab mobile shell is present, every approved feature has a durable route, bright cards retain the product's lively identity, legacy section links normalize correctly, profile settings stay isolated, award payment completion remains safe, localhost demo navigation works across nested routes, and automated plus browser verification is recorded.
