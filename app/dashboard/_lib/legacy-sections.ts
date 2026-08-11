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

export function legacySectionDestination(section: string) {
  return destinations[section] ?? '/dashboard'
}
