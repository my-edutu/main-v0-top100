import { NextResponse } from 'next/server'

import { getCurrentUser } from '@/lib/auth-server'
import { createAdminClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export async function GET() {
  const user = await getCurrentUser()
  if (!user?.id) return NextResponse.json({ message: 'Authentication required.' }, { status: 401 })

  const { data, error } = await createAdminClient()
    .from('profiles')
    .select('portfolio_cover_url')
    .eq('id', user.id)
    .maybeSingle()
  if (error || !data) return NextResponse.json({ message: 'Could not load your saved cover.' }, { status: 503 })

  return NextResponse.json({ enabled: true, coverUrl: data.portfolio_cover_url ?? null })
}
