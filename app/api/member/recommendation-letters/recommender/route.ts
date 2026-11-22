import { getCurrentUser } from '@/lib/auth-server'
import { getAwardLetterAccess } from '@/lib/award-letters/access'
import { recommenderResponse } from '@/lib/award-letters/recommender'
import { createAdminClient } from '@/lib/supabase/server'

function unavailable(message: string, status: number) {
  return Response.json({ message }, { status, headers: { 'Cache-Control': 'private, no-store' } })
}

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user?.id) return unavailable('Sign in to view recommender details.', 401)
    const access = await getAwardLetterAccess(createAdminClient(), user.id)
    if (!access) return unavailable('Recommender details are available to Top100 awardees.', 403)
    return recommenderResponse()
  } catch {
    return unavailable('Recommender details are temporarily unavailable. Try again.', 503)
  }
}
