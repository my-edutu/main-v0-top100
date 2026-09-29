import { NextResponse } from 'next/server'

import { hasConfirmedAwardPayment } from '@/lib/awards/access-server'
import { getCurrentUser } from '@/lib/auth-server'
import { createAdminClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export async function GET() {
  const user = await getCurrentUser()
  if (!user?.id) return NextResponse.json({ message: 'Authentication required.' }, { status: 401 })
  try {
    if (!(await hasConfirmedAwardPayment(user.id))) {
      return NextResponse.json({ message: 'Complete your award payment to unlock your portfolio cover.' }, { status: 402 })
    }
  } catch {
    return NextResponse.json({ message: 'Could not verify award access. Please try again shortly.' }, { status: 503 })
  }

  const { data, error } = await createAdminClient()
    .from('profiles')
    .select('portfolio_cover_url')
    .eq('id', user.id)
    .maybeSingle()
  if (error || !data) return NextResponse.json({ message: 'Could not load your saved cover.' }, { status: 503 })

  return NextResponse.json({ enabled: true, coverUrl: data.portfolio_cover_url ?? null })
}
