import { createAdminClient } from '@/lib/supabase/server'
import { validateSocialLinks } from '@/lib/profile-contact'
import { getAwardees } from '@/lib/awardees'
import { publicDirectoryCards } from '@/lib/awardees/directory-cards'

export async function GET() {
  try {
    const cards = publicDirectoryCards(await getAwardees())
    const ids = [...new Set(cards.map(card => card.profile_id).filter((id): id is string => Boolean(id)))]
    if (ids.length) {
      const { data, error } = await createAdminClient().from('profiles').select('id,notification_prefs').in('id', ids)
      if (error) console.warn("Could not load member social preferences.")
      const preferences = new Map((data ?? []).map(profile => [profile.id, profile.notification_prefs]))
      for (const card of cards) {
        const prefs = preferences.get(card.profile_id)
        card.socialLinks = prefs?.socialLinksConsent === true && !validateSocialLinks(prefs.socialLinks) ? prefs.socialLinks : []
      }
    }
    return Response.json(cards, {
      headers: { 'Cache-Control': 'public, max-age=60, must-revalidate' },
    })
  } catch {
    return Response.json({ message: 'Could not load the member directory.' }, { status: 503 })
  }
}
