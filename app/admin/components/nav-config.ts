import {
  LayoutDashboard,
  Users,
  UserPlus,
  LayoutGrid,
  Star,
  Trophy,
  Calendar,
  Mic,
  Briefcase,
  Newspaper,
  FileText,
  Youtube,
  Megaphone,
  Home,
  ImageIcon,
  Mail,
  Bell,
  BarChart3,
  Settings,
  ListChecks,
  type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  label: string
  href: string
  icon: LucideIcon
}

export interface NavGroup {
  /** Rendered as a SidebarGroupLabel. Null for the ungrouped lead item. */
  label: string | null
  items: NavItem[]
}

/**
 * Every reachable admin section, grouped for scannability.
 *
 * There is deliberately no 'Groups' entry: /api/admin/groups exists but
 * app/admin/groups/page.tsx does not, so a link here would 404. Add it when
 * that console is built.
 */
export const navGroups: NavGroup[] = [
  {
    label: null,
    items: [{ label: 'Overview', href: '/admin', icon: LayoutDashboard }],
  },
  {
    label: 'People',
    items: [
      { label: 'Selection Engine', href: '/admin/selection', icon: ListChecks },
      { label: 'Awardees', href: '/admin/awardees', icon: Star },
      { label: 'Users', href: '/admin/users', icon: Users },
      { label: 'Invites', href: '/admin/invites', icon: UserPlus },
      { label: 'Member Hub', href: '/admin/member-hub', icon: LayoutGrid },
    ],
  },
  {
    label: 'Programs',
    items: [
      { label: 'Awards', href: '/admin/awards', icon: Trophy },
      { label: 'Programs', href: '/admin/events', icon: Calendar },
      { label: 'Interviews', href: '/admin/interviews', icon: Mic },
      { label: 'Opportunities', href: '/admin/opportunities', icon: Briefcase },
      { label: 'Feature Requests', href: '/admin/feature-requests', icon: Newspaper },
    ],
  },
  {
    label: 'Content',
    items: [
      { label: 'Editorial', href: '/admin/blog', icon: FileText },
      { label: 'Channel', href: '/admin/youtube', icon: Youtube },
      { label: 'Announcements', href: '/admin/announcements', icon: Megaphone },
      { label: 'Homepage', href: '/admin/homepage', icon: Home },
      { label: 'Member Posts', href: '/admin/member-posts', icon: ImageIcon },
    ],
  },
  {
    label: 'System',
    items: [
      { label: 'Messages', href: '/admin/messages', icon: Mail },
      { label: 'Notifications', href: '/admin/notifications', icon: Bell },
      { label: 'Insights', href: '/admin/analytics', icon: BarChart3 },
      { label: 'Settings', href: '/admin/settings', icon: Settings },
    ],
  },
]

/** Flat view of every nav item, in sidebar order. */
export const navItems: NavItem[] = navGroups.flatMap((group) => group.items)

/**
 * Whether `href` is the active nav entry for `pathname`.
 *
 * `/admin` is matched exactly, since a prefix match would light it up on every
 * admin page. Every other entry matches its own subtree, so nested Selection
 * Engine pages keep the workspace highlighted.
 */
export function isNavItemActive(pathname: string | null, href: string): boolean {
  if (!pathname) return false
  if (href === '/admin') return pathname === '/admin'
  return pathname === href || pathname.startsWith(`${href}/`)
}

/** Title for the current page, used by the mobile header. */
export function resolvePageTitle(pathname: string | null): string {
  if (!pathname) return 'Admin'
  const match = navItems
    .filter((item) => isNavItemActive(pathname, item.href))
    .sort((a, b) => b.href.length - a.href.length)[0]
  return match?.label ?? 'Admin'
}
