// app/api/member/award/route.ts
// The authenticated member's award order.
//   GET -> their order (or null if they have not started one) + the award price
import { NextResponse } from 'next/server'

import { getCurrentUser } from '@/lib/auth-server'
import { createAdminClient } from '@/lib/supabase/server'
import { awardPriceKobo } from '@/lib/awards/money'
import { needsClaim } from '@/lib/awards/status'
import {
  AWARD_SETUP_MESSAGE,
  isMissingAwardTable,
  loadOrderForUser,
  mapAwardOrder,
} from '@/lib/awards/server'

export const runtime = 'nodejs'

export async function GET() {
  const user = await getCurrentUser()
  if (!user?.id) return NextResponse.json({ message: 'Authentication required.' }, { status: 401 })

  const supabase = createAdminClient()
  const { order, error } = await loadOrderForUser(supabase, user.id)

  if (error) {
    if (isMissingAwardTable(error)) {
      return NextResponse.json({ message: AWARD_SETUP_MESSAGE }, { status: 503 })
    }
    return NextResponse.json({ message: 'Could not load your award order.' }, { status: 500 })
  }

  const view = order ? mapAwardOrder(order) : null

  return NextResponse.json({
    order: view,
    awardPriceKobo: awardPriceKobo(),
    needsClaim: needsClaim(view?.status ?? null),
  })
}
