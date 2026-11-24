import { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/api/require-admin'
import { listFestivalResponses } from '@/lib/festival/responses'

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error
  const headers = { 'Cache-Control': 'private, no-store' }
  const rawPage = request.nextUrl.searchParams.get('page') ?? '1'
  const filter = request.nextUrl.searchParams.get('filter') ?? 'all'
  if (!/^\d{1,6}$/.test(rawPage) || Number(rawPage) < 1 || !['all', 'attending', 'guests', 'dispatch'].includes(filter)) {
    return Response.json({ message: 'Choose a valid filter and page.' }, { status: 400, headers })
  }
  try {
    return Response.json(await listFestivalResponses(Number(rawPage), filter), { headers })
  } catch {
    return Response.json({ message: 'Festival responses could not be loaded.' }, { status: 503, headers })
  }
}
