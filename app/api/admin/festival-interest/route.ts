import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api/require-admin'
import { listFestivalInterests } from '@/lib/festival/server'

export const runtime = 'nodejs'
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error
  const value = request.nextUrl.searchParams.get('page') ?? '1'
  if (!/^\d{1,6}$/.test(value) || Number(value) < 1)
    return NextResponse.json(
      { message: 'Choose a valid page.' },
      { status: 400 },
    )
  const headers = { 'Cache-Control': 'private, no-store' }
  try {
    return NextResponse.json(await listFestivalInterests(Number(value)), {
      headers,
    })
  } catch {
    return NextResponse.json(
      {
        message:
          'Festival responses are temporarily unavailable. Please try again shortly.',
      },
      { status: 503, headers },
    )
  }
}
