import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-server'
import { checkFestivalAwardeeAccess } from '@/lib/festival/access'
import { readFestivalInterest } from '@/lib/festival/server'
import { renderFestivalTicket } from '@/lib/festival/ticket'

export const runtime = 'nodejs'
const headers = { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' }

export async function GET() {
  const user = await getCurrentUser()
  if (!user?.id) return NextResponse.json({ message: 'Authentication required.' }, { status: 401, headers })
  const blocked = await checkFestivalAwardeeAccess(user.id)
  if (blocked) return blocked
  try {
    const view = await readFestivalInterest(user.id)
    if (view.payment === 'unavailable') return NextResponse.json({ message: 'We couldn’t verify your payment. Check again shortly.' }, { status: 503, headers })
    if (view.payment !== 'confirmed') return NextResponse.json({ message: 'Confirmed award payment is required to download your ticket.' }, { status: 403, headers })
    if (!view.ticket || !view.interest) return NextResponse.json({ message: 'Register for the festival to get your ticket.' }, { status: 404, headers })
    const image = await renderFestivalTicket({ id: view.ticket.id, ...view.interest })
    return new Response(new Uint8Array(image), { headers: {
      ...headers, 'Content-Type': 'image/png',
      'Content-Disposition': 'attachment; filename="Africa-Future-Leaders-Festival-2026-ticket.png"',
    } })
  } catch {
    return NextResponse.json({ message: 'Your ticket could not be downloaded. Please try again.' }, { status: 503, headers })
  }
}
