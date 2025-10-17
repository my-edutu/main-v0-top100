'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { getCurrentUser } from '@/lib/auth-server'
import {
  dismissNotification,
  markNotificationAsRead,
  updateProfile,
} from '@/lib/dashboard/profile-service'
import { profileUpdateSchema } from '@/lib/dashboard/profile-schemas'
import type { ProfileUpdateInput as ProfileFormValues } from '@/lib/dashboard/profile-schemas'

export async function updateProfileAction({
  profileId,
  payload,
}: {
  profileId: string
  payload: ProfileFormValues
}) {
  const user = await getCurrentUser()
  const cookieStore = cookies()
  const devBypassProfileId =
    process.env.NODE_ENV !== 'production' ? cookieStore.get('dev_user_bypass')?.value ?? null : null

  const isDevBypass = devBypassProfileId === profileId && !user

  if (!user && !isDevBypass) {
    return { success: false, message: 'Unauthorized', slug: null as string | null }
  }

  if (user && user.id !== profileId) {
    return { success: false, message: 'Unauthorized', slug: null as string | null }
  }

  try {
    const { slug } = await updateProfile({ profileId, payload, asService: isDevBypass })
    revalidatePath('/dashboard')
    revalidatePath('/awardees')
    if (slug) {
      revalidatePath(`/awardees/${slug}`)
    }
    return { success: true, slug }
  } catch (error: any) {
    console.error('[updateProfileAction]', error)
    const message = error?.message ?? 'Failed to update profile'
    return { success: false, message, slug: null as string | null }
  }
}

export async function markNotificationReadAction({ notificationId }: { notificationId: string }) {
  const user = await getCurrentUser()
  const cookieStore = cookies()
  const devBypassProfileId =
    process.env.NODE_ENV !== 'production' ? cookieStore.get('dev_user_bypass')?.value ?? null : null

  if (!user && !devBypassProfileId) {
    return { success: false }
  }

  try {
    await markNotificationAsRead(notificationId, !user && !!devBypassProfileId)
    revalidatePath('/dashboard')
    return { success: true }
  } catch (error) {
    console.error('[markNotificationReadAction]', error)
    return { success: false }
  }
}

export async function dismissNotificationAction({ notificationId }: { notificationId: string }) {
  const user = await getCurrentUser()
  const cookieStore = cookies()
  const devBypassProfileId =
    process.env.NODE_ENV !== 'production' ? cookieStore.get('dev_user_bypass')?.value ?? null : null

  if (!user && !devBypassProfileId) {
    return { success: false }
  }

  try {
    await dismissNotification(notificationId, !user && !!devBypassProfileId)
    revalidatePath('/dashboard')
    return { success: true }
  } catch (error) {
    console.error('[dismissNotificationAction]', error)
    return { success: false }
  }
}
