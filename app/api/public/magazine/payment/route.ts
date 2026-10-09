import { NextRequest, NextResponse } from 'next/server'

import { MAGAZINE_GUEST_ACCESS_COOKIE } from '@/lib/magazine/guest-access'
import { getPublicMagazinePaymentView } from '@/lib/magazine/guest-payment-server'
import { MagazinePaymentError } from '@/lib/magazine/payment-server'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    return NextResponse.json(await getPublicMagazinePaymentView(request.cookies.get(MAGAZINE_GUEST_ACCESS_COOKIE)?.value ?? null), {
      headers: { 'Cache-Control': 'private, no-store' },
    })
  } catch (error) {
    if (error instanceof MagazinePaymentError) return NextResponse.json({ message: error.message }, { status: error.statusCode })
    console.error('[public-magazine] Could not load payment status.')
    return NextResponse.json({ message: 'Could not load magazine payment details.' }, { status: 503 })
  }
}
