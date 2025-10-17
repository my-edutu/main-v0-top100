import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth-server'
import { fetchNotifications, fetchProfile } from '@/lib/dashboard/profile-service'
import type { UserNotification, UserProfile } from '@/types/profile'
import DashboardClient from './DashboardClient'

export const runtime = 'nodejs'

const emptyProfile = (userId: string, email?: string | null): UserProfile => ({
  id: userId,
  email: email ?? undefined,
  role: 'user',
  full_name: '',
  username: undefined,
  headline: undefined,

  bio: undefined,
  current_school: undefined,
  field_of_study: undefined,
  graduation_year: undefined,
  location: undefined,
  avatar_url: undefined,
  cover_image_url: undefined,
  personal_email: undefined,
  phone: undefined,
  social_links: null,
  achievements: null,
  gallery: null,
  interests: null,
  mentor: null,
  cohort: null,
  slug: null,
  is_public: true,
  metadata: null,
  last_seen_at: null,
  created_at: undefined,
  updated_at: undefined,
})

export default async function DashboardPage() {
  const cookieStore = cookies()
  const devBypassProfileId =
    process.env.NODE_ENV !== 'production' ? cookieStore.get('dev_user_bypass')?.value ?? null : null

  const user = await getCurrentUser()

  if (!user && !devBypassProfileId) {
    redirect('/auth/signin?next=/dashboard')
  }

  const effectiveProfileId = user?.id ?? devBypassProfileId ?? 'dev-user'

  const canFetchNotifications = effectiveProfileId !== 'dev-user'

  let profile: UserProfile | null = null
  let notifications: UserNotification[] = []

  try {
    // Fetch profile and notifications separately to handle errors individually
    try {
      profile = await fetchProfile(effectiveProfileId)
    } catch (error) {
      console.error('[DashboardPage] failed to fetch profile', error)
      profile = null
    }

    try {
      notifications = canFetchNotifications
        ? await fetchNotifications(effectiveProfileId)
        : []
    } catch (error) {
      console.error('[DashboardPage] failed to fetch notifications', error)
      notifications = []
    }
  } catch (error) {
    console.error('[DashboardPage] failed to bootstrap data', error)
    profile = null
    notifications = []
  }

  const fallbackProfile = profile ?? emptyProfile(effectiveProfileId, user?.email ?? 'dev-user@example.com')

  const currentUser = user
    ? {
        id: user.id,
        email: user.email ?? fallbackProfile.email ?? '',
        name: (user as any).name ?? fallbackProfile.full_name ?? '',
      }
    : {
        id: effectiveProfileId,
        email: fallbackProfile.email ?? 'developer@example.com',
        name: fallbackProfile.full_name || 'Developer User',
      }

  return (
    <DashboardClient
      currentUser={currentUser}
      initialProfile={fallbackProfile}
      initialNotifications={notifications}
    />
  )
}
