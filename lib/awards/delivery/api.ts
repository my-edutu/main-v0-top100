import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { getCurrentUser } from '@/lib/auth-server'
import { checkRateLimit, createRateLimitResponse, RATE_LIMITS } from '@/lib/rate-limit'
import { DeliveryError } from './server'

export async function deliveryApi(request: Request, action: (member: { id: string; email?: string | null }, body: unknown) => Promise<unknown>, checkout = false) {
  const headers = { 'Cache-Control': 'private, no-store' }
  const user = await getCurrentUser()
  if (!user?.id) return NextResponse.json({ message: 'Authentication required.' }, { status: 401, headers })
  const rate = await checkRateLimit({ ...(checkout ? RATE_LIMITS.AUTH : RATE_LIMITS.QUERY), identifier: `award-delivery:${checkout ? 'checkout' : request.method}:${user.id}` })
  if (!rate.success) return createRateLimitResponse(rate, 'Please wait a moment before trying again.')
  try {
    let body: unknown = {}
    if (request.method === 'POST') {
      const text = await request.text()
      if (text.trim()) {
        try { body = JSON.parse(text) } catch { return NextResponse.json({ message: 'Invalid request body.' }, { status: 400, headers }) }
      }
    }
    return NextResponse.json(await action(user, body), { headers })
  } catch (error) {
    if (error instanceof DeliveryError) return NextResponse.json({ message: error.message }, { status: error.status, headers })
    if (error instanceof ZodError) return NextResponse.json({ message: 'Check your delivery details.' }, { status: 400, headers })
    console.error('[award-delivery] Request could not be completed.')
    return NextResponse.json({ message: 'Delivery is temporarily unavailable. Please check its status before trying another payment.' }, { status: 503, headers })
  }
}
