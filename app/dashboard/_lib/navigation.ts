import {
  Bookmark,
  CalendarDays,
  Compass,
  FileText,
  Home,
  MessageCircle,
  Settings,
  Trophy,
  UserRound,
  Users,
  type LucideIcon,
} from 'lucide-react'

export type DashboardColor =
  | 'ember'
  | 'saffron'
  | 'forest'
  | 'cobalt'
  | 'burgundy'
  | 'charcoal'

type DashboardNavItem = {
  label: string
  title?: string
  href: string
  icon: LucideIcon
  color: DashboardColor
}

export type PrimaryDashboardNavItem = DashboardNavItem & {
  id: 'home' | 'discover' | 'messages' | 'me'
}

export const primaryDashboardNav: PrimaryDashboardNavItem[] = [
  { id: 'home', label: 'Home', href: '/dashboard', icon: Home, color: 'ember' },
  { id: 'discover', label: 'Discover', href: '/dashboard/discover', icon: Compass, color: 'saffron' },
  { id: 'messages', label: 'Messages', href: '/dashboard/messages', icon: MessageCircle, color: 'cobalt' },
  { id: 'me', label: 'Me', href: '/dashboard/me', icon: UserRound, color: 'burgundy' },
]

export const discoverNav: DashboardNavItem[] = [
  { label: 'Members', href: '/dashboard/discover/members', icon: Users, color: 'forest' },
  { label: 'Groups', href: '/dashboard/discover/groups', icon: Users, color: 'cobalt' },
  { label: 'Opportunities', href: '/dashboard/discover/opportunities', icon: Compass, color: 'saffron' },
  {
    label: 'Saved',
    title: 'Saved opportunities',
    href: '/dashboard/discover/opportunities/saved',
    icon: Bookmark,
    color: 'burgundy',
  },
  { label: 'Events', href: '/dashboard/discover/events', icon: CalendarDays, color: 'ember' },
  { label: 'Magazine', href: '/dashboard/discover/magazine', icon: FileText, color: 'charcoal' },
]

export const meNav: DashboardNavItem[] = [
  { label: 'Profile', href: '/dashboard/me/profile', icon: UserRound, color: 'forest' },
  { label: 'My award', href: '/dashboard/me/award', icon: Trophy, color: 'saffron' },
  { label: 'Posts', href: '/dashboard/me/posts', icon: FileText, color: 'cobalt' },
  { label: 'Get featured', href: '/dashboard/me/feature', icon: Trophy, color: 'burgundy' },
  { label: 'Settings', href: '/dashboard/me/settings', icon: Settings, color: 'charcoal' },
]

const allDashboardNav = [...primaryDashboardNav, ...discoverNav, ...meNav]

export function isDashboardNavActive(pathname: string, href: string) {
  return href === '/dashboard'
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`)
}

export function resolveDashboardTitle(pathname: string) {
  const matchingItem = allDashboardNav
    .filter(({ href }) => isDashboardNavActive(pathname, href))
    .sort((left, right) => right.href.length - left.href.length)[0]

  return matchingItem?.title ?? matchingItem?.label ?? 'Dashboard'
}
