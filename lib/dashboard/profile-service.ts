'use server'

import { randomUUID } from 'node:crypto'
import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import type {
  Achievement,
  AwardeeDirectoryEntry,
  GalleryItem,
  SocialLinks,
  UserNotification,
  UserProfile,
} from '@/types/profile'
import { profileUpdateSchema, socialLinksSchema, achievementSchema, galleryItemSchema, type ProfileUpdateInput } from './profile-schemas'

const isPlaceholderId = (value: unknown): boolean =>
  typeof value === 'string' && value.startsWith('dev-user')

const emptyToNull = <T>(value: T | ''): T | null => {
  if (value === '') return null
  return value as T
}

const normaliseAchievements = (achievements?: ProfileUpdateInput['achievements']): Achievement[] | null => {
  if (!achievements || achievements.length === 0) return null
  return achievements.map((item) => ({
    id: item.id ?? randomUUID(),
    title: item.title,
    description: item.description || undefined,
    organization: item.organization || undefined,
    recognition_date: item.recognition_date || undefined,
    link: item.link || undefined,
  }))
}

const normaliseGallery = (gallery?: ProfileUpdateInput['gallery']): GalleryItem[] | null => {
  if (!gallery || gallery.length === 0) return null
  return gallery.map((item) => ({
    id: item.id ?? randomUUID(),
    url: item.url,
    caption: item.caption || undefined,
  }))
}

const normaliseVideoLinks = (videoLinks?: ProfileUpdateInput['videoLinks']): string[] | null => {
  if (!videoLinks || videoLinks.length === 0) return null
  const cleaned = videoLinks
    .map((link) => link.trim())
    .filter((link, index, array) => link.length > 0 && array.indexOf(link) === index)
  return cleaned.length ? cleaned : null
}

const normaliseSocialLinks = (links?: ProfileUpdateInput['socialLinks']): SocialLinks | null => {
  if (!links) return null
  const entries = Object.entries(links).reduce<Record<string, string>>((acc, [key, value]) => {
    if (!value) return acc
    acc[key] = value
    return acc
  }, {})
  return Object.keys(entries).length ? (entries as SocialLinks) : null
}

const generateSlug = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')

const ensureUniqueSlug = async (profileId: string, proposed: string) => {
  const serviceClient = await createClient(true)
  const base = proposed && proposed.trim() ? proposed : randomUUID().split('-')[0]

  let candidate = base
  let suffix = 1

  while (true) {
    const { data, error } = await serviceClient
      .from('profiles')
      .select('id')
      .eq('slug', candidate)
      .maybeSingle()

    if (error) {
      console.error('[ensureUniqueSlug] slug check failed', error)
      throw error
    }

    if (!data || data.id === profileId) {
      return candidate
    }

    suffix += 1
    candidate = `${base}-${suffix}`
  }
}

export const fetchProfile = cache(async (profileId: string): Promise<UserProfile | null> => {
  if (isPlaceholderId(profileId)) {
    return null
  }

  try {
    const supabase = await createClient(true)
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', profileId)
      .maybeSingle()

    if (error) {
      // Log more detailed error information
      console.error('[fetchProfile] Supabase error:', error?.message || error)
      // Return null instead of throwing to prevent dashboard from breaking
      return null
    }

    return (data as UserProfile) ?? null
  } catch (error) {
    console.error('[fetchProfile] Unexpected error:', error instanceof Error ? error.message : error)
    // Return null in case of any unexpected errors
    return null
  }
})

export const fetchProfileBySlug = cache(async (slug: string): Promise<UserProfile | null> => {
  const supabase = await createClient(true)
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('slug', slug)
    .maybeSingle()

  if (error) {
    console.error('[fetchProfileBySlug]', error)
    throw error
  }

  return (data as UserProfile) ?? null
})

export const fetchAwardeeDirectory = cache(async (): Promise<AwardeeDirectoryEntry[]> => {
  const supabase = await createClient(true)
  const { data, error } = await supabase
    .from('awardee_directory')
    .select('*')
    .order('name', { ascending: true })

  if (error) {
    console.error('[fetchAwardeeDirectory]', error)
    throw error
  }

  return (data as AwardeeDirectoryEntry[]) ?? []
})

export const fetchAwardeeBySlug = cache(async (slug: string): Promise<AwardeeDirectoryEntry | null> => {
  const supabase = await createClient(true)
  const { data, error } = await supabase
    .from('awardee_directory')
    .select('*')
    .eq('slug', slug)
    .maybeSingle()

  if (error) {
    console.error('[fetchAwardeeBySlug]', error)
    throw error
  }

  return (data as AwardeeDirectoryEntry) ?? null
})

export const fetchNotifications = async (userId: string): Promise<UserNotification[]> => {
  if (isPlaceholderId(userId)) {
    return []
  }

  try {
    const supabase = await createClient(true)
    const { data, error } = await supabase
      .from('user_notifications')
      .select('*')
      .eq('user_id', userId)
      .order('delivered_at', { ascending: false })

    if (error) {
      // Log more detailed error information
      console.error('[fetchNotifications] Supabase error:', error?.message || error)
      // Return empty array instead of throwing to prevent dashboard from breaking
      return []
    }

    return (data as UserNotification[]) ?? []
  } catch (error) {
    console.error('[fetchNotifications] Unexpected error:', error instanceof Error ? error.message : error)
    // Return empty array in case of any unexpected errors
    return []
  }
}

type UpdateProfileOptions = {
  profileId: string
  payload: ProfileUpdateInput
  linkAwardee?: boolean
  asService?: boolean
}

export const updateProfile = async ({
  profileId,
  payload,
  linkAwardee = true,
  asService = false,
}: UpdateProfileOptions) => {
  if (isPlaceholderId(profileId)) {
    throw new Error('Unable to update profile: invalid profile identifier')
  }

  // Validate that profileId is a proper UUID format before updating
  const parsed = profileUpdateSchema.parse(payload)
  const supabase = await createClient(asService)

  const baseSlug = parsed.slug ? parsed.slug : generateSlug(parsed.fullName)
  const slug = await ensureUniqueSlug(profileId, baseSlug)

  const { error } = await supabase
    .from('profiles')
    .update({
      full_name: parsed.fullName,
      username: emptyToNull(parsed.username),
      headline: emptyToNull(parsed.headline),

      bio: emptyToNull(parsed.bio),
      current_school: emptyToNull(parsed.currentSchool),
      field_of_study: emptyToNull(parsed.fieldOfStudy),
      graduation_year: parsed.graduationYear ?? null,
      location: emptyToNull(parsed.location),
      avatar_url: emptyToNull(parsed.avatarUrl),
      cover_image_url: emptyToNull(parsed.coverImageUrl),
      personal_email: emptyToNull(parsed.personalEmail),
      phone: emptyToNull(parsed.phone),
      mentor: emptyToNull(parsed.mentor),
      cohort: emptyToNull(parsed.cohort),
      interests: parsed.interests && parsed.interests.length ? parsed.interests : null,
      social_links: normaliseSocialLinks(parsed.socialLinks),
      achievements: normaliseAchievements(parsed.achievements),
      gallery: normaliseGallery(parsed.gallery),
      video_links: normaliseVideoLinks(parsed.videoLinks),
      is_public: parsed.isPublic ?? true,
      slug,
    })
    .eq('id', profileId)

  if (error) {
    console.error('[updateProfile] profile update failed:', error?.message || error)
    throw error
  }

  if (linkAwardee) {
    await ensureAwardeeLink({ profileId, fullName: parsed.fullName, slug })
  }

  return { slug }
}

type EnsureAwardeeLinkArgs = {
  profileId: string
  fullName: string
  slug: string
}

export const ensureAwardeeLink = async ({ profileId, fullName, slug }: EnsureAwardeeLinkArgs) => {
  if (isPlaceholderId(profileId)) {
    return null
  }

  const serviceClient = await createClient(true)
  const { data: existing, error: fetchError } = await serviceClient
    .from('awardees')
    .select('id')
    .eq('profile_id', profileId)
    .maybeSingle()

  if (fetchError) {
    console.error('[ensureAwardeeLink] fetch error:', fetchError?.message || fetchError)
    throw fetchError
  }

  if (existing) {
    const { error: updateError } = await serviceClient
      .from('awardees')
      .update({
        name: fullName,
        slug,
      })
      .eq('id', existing.id)
    if (updateError) {
      console.error('[ensureAwardeeLink] update error:', updateError?.message || updateError)
      throw updateError
    }
    return existing.id
  }

  const { error: insertError, data } = await serviceClient
    .from('awardees')
    .insert({
      id: randomUUID(),
      profile_id: profileId,
      name: fullName,
      slug,
    })
    .select('id')
    .maybeSingle()

  if (insertError) {
    console.error('[ensureAwardeeLink] insert error:', insertError?.message || insertError)
    throw insertError
  }

  return data?.id
}

export const markNotificationAsRead = async (notificationId: string, asService = false) => {
  const supabase = await createClient(asService)
  const { error } = await supabase
    .from('user_notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', notificationId)

  if (error) {
    console.error('[markNotificationAsRead] Supabase error:', error?.message || error)
    throw error
  }
}

export const dismissNotification = async (notificationId: string, asService = false) => {
  const supabase = await createClient(asService)
  const { error } = await supabase
    .from('user_notifications')
    .delete()
    .eq('id', notificationId)

  if (error) {
    console.error('[dismissNotification] Supabase error:', error?.message || error)
    throw error
  }
}
