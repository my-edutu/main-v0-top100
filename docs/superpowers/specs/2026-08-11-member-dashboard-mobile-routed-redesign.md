# Member Dashboard Mobile-First Routed Redesign

**Date:** 2026-08-11  
**Status:** Proposed for implementation review  
**Approved primary navigation:** Home, Discover, Messages, Me

## 1. Objective

Refactor the member dashboard from a single client-side section switcher into a responsive, task-focused web app with durable URLs, a four-item mobile bottom navigation, clearer priorities, and a consistent colorful icon system.

The redesign must preserve existing member workflows and API behavior while improving mobile navigation, page ownership, browser history, loading boundaries, accessibility, and desktop responsiveness.

## 2. Current Problems

- Fourteen destinations are rendered from one 1,820-line page through `activeSection`, so sections cannot be refreshed, linked, or restored with browser Back.
- The mobile Home page contains eleven large navigation cards and creates an excessively long first screen.
- The mobile header is crowded with messages, notifications, sign-out, and menu controls.
- The mobile menu repeats the full desktop sidebar in a long ungrouped sheet.
- The award-claim banner appears above almost every task and competes with the page the user intentionally opened.
- Messages and groups use internal selection state instead of detail routes.
- Shared profile/settings submission logic can reset preferences that are absent from the active form.
- Startup eagerly loads dashboard, conversations, and award data even when those features are not open.

## 3. Experience Principles

1. **One tap to frequent work.** Home, discovery, conversations, and account tasks remain permanently reachable on mobile.
2. **Next action before feature directory.** Home prioritizes the most useful action rather than presenting every feature equally.
3. **A URL for every meaningful screen.** Pages, conversations, groups, editors, and payment returns support refresh, Back, and deep links.
4. **Color supports recognition.** Category color is stable and paired with labels; it never communicates state by itself.
5. **Mobile is the primary composition.** Tablet and desktop layouts adapt the same information architecture rather than stretching mobile cards.
6. **Gated features explain themselves.** Pending, suspended, or restricted members receive clear next steps instead of hidden navigation or a 404.

## 4. Information Architecture

### Mobile primary navigation

| Tab | Purpose | Contents |
| --- | --- | --- |
| Home | Orient and act | Priority action, profile progress, upcoming activity, shortcuts, recent updates |
| Discover | Find people and possibilities | Members, groups, opportunities, saved opportunities, events, magazine |
| Messages | Continue conversations | Conversation list, unread state, direct-message composer, thread detail |
| Me | Manage membership and publish | Profile, award, posts, feature submission, settings, partnership link, sign-out |

Notifications remain a top-bar bell with an unread badge and route to `/dashboard/updates`. Publishing stays within Me and can also be surfaced as a contextual Home shortcut. Sign-out moves from the mobile header into Me.

### Route map

```text
/dashboard                                  Home
/dashboard/discover                         Discover landing
/dashboard/discover/members                 Member directory
/dashboard/discover/groups                  My groups and group discovery
/dashboard/discover/groups/[id]             Group detail/chat
/dashboard/discover/opportunities           Opportunity discovery
/dashboard/discover/opportunities/saved     Saved opportunities
/dashboard/discover/events                  Invitations and events
/dashboard/discover/magazine                Member magazine entry
/dashboard/messages                         Conversation list
/dashboard/messages/[id]                    Conversation detail
/dashboard/me                               Personal overview
/dashboard/me/profile                       BIO/profile editor
/dashboard/me/award                         Award overview and current status
/dashboard/me/award/address                 Delivery contact and address
/dashboard/me/award/review                  Live quote and order review
/dashboard/me/award/payment                 Secure payment handoff
/dashboard/me/award/tracking                Dispatch and delivery tracking
/dashboard/me/posts                         My posts
/dashboard/me/posts/new                     Post composer
/dashboard/me/posts/[id]/edit               Post editor
/dashboard/me/feature                       Feature submission and status
/dashboard/me/settings                      Settings overview
/dashboard/me/settings/visibility           Profile/contact visibility
/dashboard/me/settings/notifications        Notification preferences
/dashboard/me/settings/privacy              Privacy and security
/dashboard/updates                          Notification inbox
```

Public destinations remain public: `/awardees/[slug]`, `/events`, `/magazine`, and `/partnership`.

## 5. Mobile App Shell

### Top app bar

- Sticky, 60px high, with a warm translucent surface and subtle bottom border.
- Home shows the compact brand mark and “Awardee Hub.”
- Subpages show Back, the page title, and at most one contextual action.
- The right side contains only the notification bell and 40px avatar.
- Interactive controls have a minimum 44px touch target.

### Bottom navigation

- Fixed edge-to-edge bar with four equal-width items: Home, Discover, Messages, Me.
- Height is `68px + env(safe-area-inset-bottom)`.
- Every item always shows its icon and label.
- Active state uses a tinted icon well, stronger label, `aria-current="page"`, and a non-color marker.
- Messages can show an accessible unread-count badge.
- Mobile content reserves at least 92px bottom padding so controls are never obscured.

### Local navigation

- Discover and Me use compact horizontal local tabs or short grouped lists on their landing pages.
- Detail pages replace local tabs with Back and contextual actions.
- Filters and searches use URL query parameters; object identity uses route segments.

## 6. Home Page

Home becomes a short, personalized action feed:

1. Compact greeting with member status and profile-completion progress.
2. One **Your next move** card chosen from award claim, BIO completion, event response, expiring opportunity, or unread conversation.
3. A short **Coming up** timeline.
4. A two-by-two shortcut grid selected from current context, not eleven fixed large cards.
5. Recent messages and admin updates as compact rows.

The award action appears as the priority card when relevant. Other pages receive only a compact status indicator when award attention is urgent; the large claim banner is not globally injected.

### Guided award flow

The current long award form becomes a routed, resumable journey:

1. **Delivery address** — name, phone, email, street, apartment, city, state/region, postal code, and country, grouped into short sections with inline validation.
2. **Quote and review** — live delivery quote, delivery summary, editable address, and a clear total before the user commits.
3. **Secure payment** — concise payment explanation and Paystack handoff; no address fields repeat here.
4. **Tracking** — payment confirmation, dispatch status, courier tracking, and support guidance.

Each step has a visible progress indicator, Back/Continue controls, route-level loading fallback, preserved server state, and context-specific error recovery. Users returning to `/dashboard/me/award` are sent to the next valid step derived from their order status; they cannot skip required address or quote states by typing a later URL.

Use three purposeful illustrations only: address/delivery setup, award review/secure payment, and dispatched package tracking. They share the warm Impact Atlas palette, contain no embedded text, remain secondary to the form, include descriptive alt text when informative, and are hidden from assistive technology when purely decorative.

## 7. Visual Direction: Impact Atlas

The interface uses a warm editorial member-app style inspired by the existing Africa Future Leaders identity.

### Core tokens

- Canvas: `#FBF7EF`
- Surface: `#FFFFFF`
- Ink: `#171412`
- Muted text: `#625B52`
- Warm border: `#E7DDCF`
- Brand/identity: ember orange
- Discover/growth: saffron
- Community: forest
- Messages: cobalt
- Recognition/publishing: burgundy
- Utilities: charcoal

Semantic success, warning, error, and information colors remain separate from category colors.

### Components

- Retain the existing dashboard's brightly colored card personality. Home shortcuts and Discover/Me entry cards use confident, visibly saturated category surfaces rather than collapsing into neutral white cards.
- Bright surfaces are assigned by category—not randomly—and use tested dark foreground colors so labels, icons, and focus indicators meet WCAG 2.2 AA.
- Standard cards use 16px radius; priority cards use 20px; 24px is reserved for modals and celebratory moments.
- Mobile card padding is 16px; tablet/desktop card padding is 20–24px.
- Static cards use a border without unnecessary shadow. Interactive cards add a subtle shadow and small hover lift on pointer devices.
- Icons use one stroke family, 20px in navigation and 22–24px in cards, inside 40–44px tinted containers.
- Urbanist remains the UI typeface. Mobile page titles use 28–32px sizes with tight, confident weight.

### Responsive behavior

- Below 640px: 16px gutter, single-column task content, four-item bottom bar.
- 640–1023px: 24px gutter, two-column cards where useful, bottom bar retained.
- 1024–1279px: bottom bar becomes an 88px icon rail.
- 1280px and above: rail expands to a 240px labeled sidebar and content uses a maximum-width 12-column grid.
- Desktop Home uses an eight-column feed and four-column contextual rail.
- Messages and groups retain two-pane desktop layouts while using list/detail routes on mobile.

## 8. Motion and Accessibility

- Page entrance: 180–220ms fade with an 8px rise.
- Card press: 90ms scale to 0.98; pointer hover: 2px lift.
- Navigation state change: 160ms.
- Existing reduced-motion behavior is preserved.
- Text and controls meet WCAG 2.2 AA contrast requirements.
- Every interactive element has a visible 2px focus ring with offset.
- Touch targets are at least 44px.
- Status uses icon plus text, not color alone.
- Forms provide field-linked errors and an error summary when submission fails.
- Payment/tracking updates use appropriate live regions.
- The shell respects safe areas and the on-screen keyboard.

## 9. Code and Data Boundaries

- `app/dashboard/layout.tsx` owns persistent shell, authentication/loading gate, header, desktop navigation, mobile bottom navigation, and global membership status.
- A member provider owns only the current member and `refreshMember`.
- A badge provider owns scalar summaries only: unread messages, unread updates, and award attention.
- Posts, groups, opportunities, events, messages, award, notifications, feature submissions, profile, and settings keep route-local state and data.
- Navigation is `Link`-based; active state derives from `usePathname`.
- Existing self-contained section modules are initially reused behind route pages to reduce regression risk.
- Separate narrow mutation builders are required for profile and settings so one form cannot reset another form’s preferences.

## 10. Compatibility and Safety

- Legacy `?section=` links are normalized to their new routes during migration.
- Directory-to-message actions use `/dashboard/messages?to=<profileId>` instead of in-memory recipient state.
- Award checkout returns to `/dashboard/me/award?payment=done`.
- Existing payment confirmation polling and anti-double-charge behavior are preserved.
- Award steps validate their prerequisite order state on load and redirect to the earliest incomplete step.
- Localhost demo login accepts nested dashboard return paths.
- Demo notification CTAs and checkout callbacks use the new routes.
- Pending or restricted members see explicit gated states; server-side API authorization remains authoritative.

## 11. Delivery Sequence

1. Protect existing behavior with route, navigation, preference-mutation, and award-return tests.
2. Extract shell primitives, providers, and route configuration without visual changes.
3. Add nested routes and compatibility redirects.
4. Migrate Discover leaves, then Messages and its detail route.
5. Migrate Me workflows, separating profile/settings mutations before exposing them as pages.
6. Migrate award payment returns and verify completion polling.
7. Split the long award form into routed address, review, payment, and tracking steps and add the approved illustrations.
8. Replace Home and mobile/desktop navigation with the approved design.
9. Remove `activeSection`, redundant eager data loads, and the legacy all-section drawer.
10. Verify responsive layouts, keyboard behavior, accessibility, and localhost demo flows.

## 12. Acceptance Criteria

- Mobile navigation shows exactly Home, Discover, Messages, and Me.
- A user can refresh or deep-link every routed feature without losing the current screen.
- Browser Back works between lists and message/group details.
- Home no longer renders the eleven-card vertical directory.
- Sign-out is absent from the mobile top bar and available in Me.
- Notifications remain reachable from the top bar.
- Award payment completion returns to the routed award page without duplicate payment risk.
- The award journey is split across address, review, payment, and tracking routes with progress, Back/Continue behavior, prerequisite guards, and purposeful illustrations.
- Saving BIO cannot change unrelated visibility, notification, or privacy preferences.
- Pending/restricted member states are understandable and actionable.
- The dashboard works at 360px, 390px, 430px, tablet, and desktop widths without horizontal overflow or obscured controls.
- Automated tests cover route mapping, legacy compatibility, active navigation, mutation scoping, demo nested redirects, and payment return behavior.

## 13. Out of Scope

- Redesigning public awardee, event, magazine, or partnership pages.
- Replacing working member APIs solely for stylistic consistency.
- Changing membership approval policy or payment provider behavior.
- Introducing additional primary navigation items beyond the approved four.
