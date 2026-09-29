import { NextResponse } from 'next/server'

import { getCurrentUser } from '@/lib/auth-server'
import { isMagazineCheckoutEnabled } from '@/lib/production-readiness'
import { getMagazineFeaturePaymentView } from '@/lib/magazine/payment-server'

export const runtime = 'nodejs'

export async function GET() {
  const user = await getCurrentUser()
  if (!user?.id) return NextResponse.json({ message: 'Authentication required.' }, { status: 401 })
  try {
    const payment = await getMagazineFeaturePaymentView(user.id)
    return NextResponse.json({ payment: { ...payment, checkoutEnabled: isMagazineCheckoutEnabled(process.env) } })
  } catch (error) {
    const status = error && typeof error === 'object' && 'statusCode' in error ? Number(error.statusCode) : 503
    return NextResponse.json({ message: error instanceof Error ? error.message : 'Could not verify magazine payment.' }, { status })
  }
}
