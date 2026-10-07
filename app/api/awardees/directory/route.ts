import { createAdminClient } from '@/lib/supabase/server'
import { validateSocialLinks } from '@/lib/profile-contact'
import { getAwardees } from '@/lib/awardees'
import { publicDirectoryCards } from '@/lib/awardees/directory-cards'

export async function GET() {
  try {
    const cards = publicDirectoryCards(await getAwardees())
    const ids = [...new Set(cards.map(card => card.profile_id).filter((id): id is string => Boolean(id)))]
    const preferences = new Map<string, Record<string, unknown>>()
    try {
      const db = createAdminClient()
      const batches = Array.from({ length: Math.ceil(ids.length / 100) }, (_, index) => ids.slice(index * 100, (index + 1) * 100))
      const results = await Promise.all(batches.map(batch => db.from('profiles').select('id,email,notification_prefs').in('id', batch)))
      for (const result of results) for (const profile of result.data ?? []) preferences.set(profile.id, { ...profile.notification_prefs, email: profile.email })
    } catch (error) {
      console.warn('Could not load member contact preferences.', error)
    }
    for (const card of cards) {
      const prefs = card.profile_id ? preferences.get(card.profile_id) : undefined
      card.socialLinks = prefs?.socialLinksConsent === true && !validateSocialLinks(prefs.socialLinks) ? prefs.socialLinks as import('@/lib/profile-contact').SocialLink[] : []
      card.email = prefs?.emailVisible === true && prefs.contactEmailConsent === true && typeof prefs.email === 'string' ? prefs.email : null
      card.personal_email = null
    }
    return Response.json(cards, {
      headers: { 'Cache-Control': 'public, max-age=60, must-revalidate' },
    })
  } catch {
    return Response.json({ message: 'Could not load the member directory.' }, { status: 503 })
  }
}
