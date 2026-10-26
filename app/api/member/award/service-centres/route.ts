// app/api/member/award/service-centres/route.ts
// Returns the verified GIG service centres for a member's destination so the
// client can offer service-centre collection without hard-coding ids or
// coordinates. Reads the same station directory and cache the quote adapter
// uses; no coordinates are invented here.
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { getCurrentUser } from '@/lib/auth-server'
import { checkRateLimit, RATE_LIMITS, createRateLimitResponse } from '@/lib/rate-limit'
import { listGigServiceCentres } from '@/lib/courier/gig'
import { nigeriaState } from '@/lib/awards/locations'

export const runtime = 'nodejs'

const querySchema = z.object({
  state: z.string().trim().min(2, 'Enter your state or region.').max(100),
  city: z.string().trim().min(2, 'Enter your city.').max(100),
})

export async function GET(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user?.id) return NextResponse.json({ message: 'Authentication required.' }, { status: 401 })

  const rate = await checkRateLimit({
    ...RATE_LIMITS.QUERY,
    identifier: `award-service-centres:${user.id}`,
  })
  if (!rate.success) return createRateLimitResponse(rate, 'Too many requests. Please wait a moment.')

  const params = querySchema.safeParse({
    state: request.nextUrl.searchParams.get('state') ?? '',
    city: request.nextUrl.searchParams.get('city') ?? '',
  })
  if (!params.success) {
    return NextResponse.json(
      { message: params.error.issues[0]?.message ?? 'Enter a city and state.' },
      { status: 400 },
    )
  }

  const state = nigeriaState(params.data.state)
  if (!state) return NextResponse.json({ message: 'Select a valid Nigerian state or FCT.' }, { status: 400 })

  try {
    const centres = await listGigServiceCentres({ state: state.name, city: params.data.city })
    return NextResponse.json({
      serviceCentres: centres.map((centre) => ({
        id: centre.id,
        name: centre.name,
        code: centre.code,
        address: centre.address,
        stationId: centre.stationId,
        latitude: centre.latitude,
        longitude: centre.longitude,
      })),
    })
  } catch (error) {
    console.error('[award-service-centres] lookup failed:', (error as Error)?.message ?? error)
    return NextResponse.json(
      { message: 'GIG service centres are temporarily unavailable. Please try again or use home delivery.' },
      { status: 503 },
    )
  }
}
