import { z } from 'zod'
import { getCurrentUser } from '@/lib/auth-server'
import { checkFestivalAwardeeAccess } from '@/lib/festival/access'
import { festivalDispatchSchema, festivalRsvpSchema } from '@/lib/festival/interest'
import { getFestivalResponse, saveFestivalResponse } from '@/lib/festival/responses'
import { checkRateLimit, createRateLimitResponse, RATE_LIMITS } from '@/lib/rate-limit'

const headers = { 'Cache-Control': 'private, no-store' }
const payload = z.union([
  z.object({ rsvp: festivalRsvpSchema }).strict(),
  z.object({ dispatch: festivalDispatchSchema }).strict(),
])

async function handle(request: Request) {
  const user = await getCurrentUser()
  if (!user?.id) return Response.json({ message: 'Sign in to open this form.' }, { status: 401, headers })
  const blocked = await checkFestivalAwardeeAccess(user.id)
  if (blocked) return blocked
  try {
    if (request.method === 'GET') return Response.json({ response: await getFestivalResponse(user.id) }, { headers })
    const rate = await checkRateLimit({ ...RATE_LIMITS.AUTH, identifier: `festival-rsvp:${user.id}` })
    if (!rate.success) return createRateLimitResponse(rate, 'Please wait a moment before saving again.')
    const parsed = payload.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return Response.json({ message: 'Check your entries and try again.' }, { status: 400, headers })
    return Response.json({ response: await saveFestivalResponse(user.id, parsed.data) }, { headers })
  } catch {
    return Response.json({ message: 'Festival responses are temporarily unavailable. Please try again.' }, { status: 503, headers })
  }
}

export { handle as GET, handle as POST }
