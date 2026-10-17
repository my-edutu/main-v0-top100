import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api/require-admin'
import { callBot } from '@/lib/afl-bot/bridge'
import { readOperation, writeOperation } from '@/lib/afl-bot/operations'

export const runtime = 'nodejs'
const MAX_BODY = 15 * 1024 * 1024
const noStore = { 'Cache-Control': 'private, no-store, max-age=0' }
function invalid(message: string, status = 400) {
  return NextResponse.json({ message }, { status, headers: noStore })
}
export async function GET(request: NextRequest) {
  const access = await requireAdmin(request)
  if ('error' in access) return access.error
  try {
    return await callBot(readOperation(request.nextUrl.searchParams), access.user.id)
  } catch {
    return invalid('Unknown bot resource or invalid record/page.')
  }
}
export async function POST(request: NextRequest) {
  const access = await requireAdmin(request)
  if ('error' in access) return access.error
  if (request.headers.get('origin') !== request.nextUrl.origin) return invalid('Same-origin admin request required.', 403)
  if (!request.headers.get('content-type')?.startsWith('application/json')) return invalid('JSON request required.', 415)
  if (Number(request.headers.get('content-length')) > MAX_BODY) return invalid('Request is too large.', 413)
  let body: unknown
  try {
    const raw = await request.text()
    if (Buffer.byteLength(raw, 'utf8') > MAX_BODY) return invalid('Request is too large.', 413)
    body = JSON.parse(raw)
  } catch { return invalid('Invalid request body.') }
  try {
    return await callBot(writeOperation(body), access.user.id)
  } catch (error) {
    return invalid(error instanceof Error ? error.message : 'Invalid bot operation.')
  }
}
