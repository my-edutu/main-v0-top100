import { NextResponse } from 'next/server'

import { hasConfirmedAwardPayment } from '@/lib/awards/access-server'
import { getCurrentUser } from '@/lib/auth-server'
import { downloadMedia } from '@/lib/media/storage'
import { createAdminClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export async function GET() {
  const user = await getCurrentUser()
  if (!user?.id) return NextResponse.json({ message: 'Authentication required.' }, { status: 401 })

  try {
    if (!(await hasConfirmedAwardPayment(user.id))) {
      return NextResponse.json({ message: 'Complete your award payment to access your portfolio cover.' }, { status: 402 })
    }
  } catch {
    return NextResponse.json({ message: 'Could not verify award access. Please try again shortly.' }, { status: 503 })
  }

  const { data, error } = await createAdminClient()
    .from('profiles')
    .select('portfolio_cover_url')
    .eq('id', user.id)
    .maybeSingle()
  if (error) return NextResponse.json({ message: 'Could not load your saved cover.' }, { status: 503 })
  if (!data?.portfolio_cover_url) return NextResponse.json({ message: 'Create your cover before downloading it.' }, { status: 404 })

  try {
    const image = await downloadMedia(
      process.env.PORTFOLIO_COVER_BUCKET || 'portfolio-covers',
      `${user.id}/afl-2026-cover.png`,
    )
    return new NextResponse(new Uint8Array(image), {
      headers: {
        'Cache-Control': 'private, no-store',
        'Content-Disposition': 'attachment; filename="afl-2026-cover.png"',
        'Content-Length': String(image.byteLength),
        'Content-Type': 'image/png',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch {
    return NextResponse.json({ message: 'Your cover could not be downloaded. Please try again.' }, { status: 503 })
  }
}
