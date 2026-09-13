import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-server'
import { AwardPaymentError } from '@/lib/awards/payment-errors'
import { getAwardPaymentView } from '@/lib/awards/payment-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const user = await getCurrentUser()
  if (!user?.id) return NextResponse.json({ message: 'Authentication required.' }, { status: 401 })
  try {
    return NextResponse.json(await getAwardPaymentView(user.id), { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    if (error instanceof AwardPaymentError) return NextResponse.json({ message: error.message }, { status: error.statusCode })
    return NextResponse.json({ message: 'Could not load award payment. Please try again.' }, { status: 503 })
  }
}
