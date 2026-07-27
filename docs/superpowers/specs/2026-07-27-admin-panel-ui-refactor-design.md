# Admin Panel UI Refactor — UX and Mobile Responsiveness

**Date:** 2026-07-27
**Branch:** `feat/member-awards-dispatch`
**Status:** Approved design, pending implementation plan

## Problem

The admin console at `/admin` spans 25 pages across 20 top-level sections
(19 route directories plus the `/admin` root) and ~14.7k lines of TSX. It has
accumulated three classes of defect.

### Mobile layout is broken

`AdminSidebar` renders a `fixed`, 80px-tall mobile header. `app/admin/layout.tsx`
gives `<main>` no corresponding top offset, so every page must compensate with its
own `pt-20 lg:pt-0`. Thirty-seven such compensations exist across the tree. Seven
pages omit it, and their first 80px of content renders underneath the header:

- `app/admin/announcements/page.tsx`
- `app/admin/invites/page.tsx`
- `app/admin/interviews/page.tsx`
- `app/admin/interviews/_components/InterviewsAdminClient.tsx`
- `app/admin/blog/new/page.tsx`
- `app/admin/blog/edit/[id]/page.tsx`
- `app/admin/awardees/import/page.tsx`

Further mobile defects:

- `InterviewsAdminClient.tsx:306` renders a raw `<table>` with only
  `overflow-x-auto` and no card fallback, forcing horizontal scroll on phones.
  Every other list page hand-duplicates a `hidden md:block` table plus a separate
  mobile card list.
- `app/admin/member-hub/page.tsx:143` uses a non-responsive `grid-cols-3`.
- `app/admin/settings/loading.tsx:17` uses `grid-cols-4 lg:grid-cols-10`, which
  does not match the real tab layout it stands in for.
- The "Add Awardee" floating action button is fixed bottom-right on *every* admin
  page, including Settings, Analytics and the blog editor, where it both overlaps
  content and offers an action unrelated to the page.
- The mobile header spends its 80px on a hamburger and a 96px logo. It carries no
  page title, no search and no account control.

### Information architecture is incomplete

The sidebar lists 13 items. Six routes are unreachable from it: `users`,
`homepage`, `interviews`, `invites`, `member-posts` and `opportunities`. The list
is flat and ungrouped, and the `Bell` icon is bound to both "Member Hub" and
"Notifications".

### The chrome contains non-functional controls

The desktop top bar's search `<Input>` is not wired to anything, and its
notification bell renders a permanently-lit unread dot. Both are hidden below
`lg:`, so mobile has neither. Sidebar collapse state is not persisted across
navigation, and `Escape` is bound globally to collapse the sidebar — a surprising
capture of a key users expect to dismiss dialogs.

There is no shared page-header primitive, so headings diverge per page:
`app/admin/awards/page.tsx:394` uses a gradient `text-3xl`, while
`app/admin/users/page.tsx:226` and `app/admin/awardees/page.tsx:638` use
`text-3xl sm:text-4xl font-black`.

## Blocking prerequisite

`tailwind.config.ts:94-102` maps `bg-sidebar`, `text-sidebar-foreground`,
`border-sidebar-border` and siblings to `--sidebar-*` CSS custom properties.
**`app/globals.css` never defines those properties.** The installed-but-unused
`components/ui/sidebar.tsx` therefore cannot render correctly today. Defining the
tokens is a required first step, not an optional polish.

Token values must be authored to survive the `html.light` override block at
`app/globals.css:30-58`, which rewrites dark utilities with `!important` and has
previously broken `text-white` site-wide.

## Design

### 1. Shell architecture

```
app/admin/layout.tsx                     server: reads sidebar:state cookie
app/admin/components/
  AdminShell.tsx                         client: login bypass, guard, providers
  AdminSidebar.tsx                       rewritten on ui/sidebar primitives
  AdminFooter.tsx                        unchanged
  PageHeader.tsx                         new
components/ui/responsive-table.tsx       new
app/globals.css                          + --sidebar-* token definitions
```

`app/admin/layout.tsx` becomes a server component. It reads the `sidebar:state`
cookie via `next/headers` and passes `defaultOpen` to `AdminShell`. Reading the
cookie on the server is what makes collapse state persist across navigation
without a first-paint flash of the wrong width.

`AdminShell` is a client component holding what needs client hooks: the
`/admin/login` chrome bypass (via `usePathname`), `SessionSecurityGuard`, and the
`SidebarProvider` / `SidebarInset` pair.

### 2. The mobile offset fix

The mobile header moves from `fixed` to `sticky top-0` **in normal document flow**
inside `SidebarInset`. Content then cannot render underneath it, because it
occupies layout space rather than being lifted out of it.

This makes the per-page offset unnecessary. All 37 `pt-20 lg:pt-*` compensations
are removed. The seven pages that never had one are fixed by the same change,
without being edited for that purpose.

The header shrinks from `h-20` to `h-14`, with a 32px logo, a `SidebarTrigger`,
and the current page title.

Drawer behaviour — focus trap, scroll lock, overlay, and the `⌘B` / `Ctrl+B`
toggle — comes from `ui/sidebar`. The hand-rolled slide-in, the manual overlay,
and the global `Escape` binding are deleted.

### 3. Navigation

Nineteen items in five groups, up from the current 13. The six orphaned routes
are folded in.

| Group | Items |
|---|---|
| *(ungrouped)* | Overview |
| People | Awardees, Users, Invites, Member Hub |
| Programs | Awards, Programs, Interviews, Opportunities, Feature Requests |
| Content | Editorial, Channel, Announcements, Homepage, Member Posts |
| System | Messages, Notifications, Insights, Settings |

"Member Hub" moves from `Bell` to `LayoutGrid`, leaving `Bell` unique to
"Notifications". In icon/collapsed mode, group labels hide and each item exposes a
tooltip through `SidebarMenuButton`'s `tooltip` prop.

The non-functional search input and notification bell are deleted. That empties
the desktop top bar, so the bar is removed and its vertical space returns to
content.

### 4. PageHeader

One primitive replacing the per-page headings.

```tsx
interface PageHeaderProps {
  title: string
  description?: string
  backHref?: string
  actions?: React.ReactNode
}
```

Actions stack full-width below the title under `sm:`, and sit inline-right at
`sm:` and above. This is where each page's primary action lives now that the
global floating action button is gone.

### 5. ResponsiveTable

```tsx
interface Column<T> {
  key: string
  header: React.ReactNode
  cell: (row: T) => React.ReactNode
  className?: string
}

interface ResponsiveTableProps<T> {
  data: T[]
  columns: Column<T>[]
  getRowKey: (row: T) => string
  renderCard?: (row: T) => React.ReactNode
  empty?: React.ReactNode
}
```

Emits a real `<table>` (through `components/ui/table.tsx`) at `md:` and above, and
stacked cards below. When `renderCard` is omitted it falls back to stacked
label/value pairs derived from `columns`.

Retrofit targets, all of which currently duplicate table and card markup:
`announcements`, `awardees`, `youtube`, `blog`, `users`, `events`. Plus
`interviews`, which has no card fallback at all.

### 6. Remaining fixes

- `member-hub/page.tsx:143` → `grid-cols-1 sm:grid-cols-3`.
- `settings/loading.tsx:17` skeleton aligned to the real tab layout.
- Nav items and table row actions brought to a 44px minimum touch target.

## Non-goals

- No new visual language. The existing orange/amber-on-white palette is retained;
  this is a structural and responsive refactor, not a restyle.
- No change to any admin API route, data fetching, or authorization logic.
- No refactoring of page-level business logic beyond swapping in the two new
  primitives and deleting the offset hack.

## Verification

The project has vitest but no Playwright, so browser assertions are manual.

1. `npm run test` — passes. New unit coverage for `ResponsiveTable`'s two render
   modes and `PageHeader`'s action slot, both of which are pure presentational
   units.
2. `npm run build` — passes. This is the real guard on the server/client component
   split in `layout.tsx`; a `usePathname` left in the server layout fails here.
3. `npm run lint` — passes.
4. Manual pass over all 25 pages at 375px, 768px and 1440px, checking: no
   horizontal overflow; no content beneath the mobile header; drawer traps focus
   and locks scroll; collapse state survives navigation.

A claim that this work is complete requires the output of steps 1-3, not an
assertion that they should pass.

## Risks

**Concurrent edits.** At the time of writing, the working tree is dirty with
in-flight work from another session: 8 modified tracked files and untracked
`app/admin/member-posts/` and `app/admin/opportunities/`. One modified file,
`app/admin/events/page.tsx`, is a file this refactor rewrites. Implementation must
re-check `git status` and the current branch before starting, and must not commit
unrelated in-flight changes.

**Token authoring.** The `--sidebar-*` values interact with the `html.light`
`!important` block. Getting them wrong yields an invisible or unreadable sidebar
rather than an obvious failure, so they need a visual check, not just a build.

**Breadth.** The change touches all 25 admin pages. The shell and the two
primitives are genuinely new code; the per-page edits are mechanical (delete
offset, swap header, swap table) and should be reviewed as such.
