import { emailSecret } from '@/lib/admin-email/secrets'
import { createHash, timingSafeEqual } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { deliverGatewayMessage } from '@/lib/admin-email/gateway'
import { gatewayDependencies } from '@/lib/admin-email/gateway-server'
export const runtime = 'nodejs'
const digest = (value: string) => createHash('sha256').update(value).digest()
export async function POST(request: NextRequest) {
  const user = process.env.LISTMONK_GATEWAY_USER
  const password = emailSecret('LISTMONK_GATEWAY_PASSWORD')
  if (!user || !password) return NextResponse.json({ message: 'Email gateway is unavailable.' }, { status: 503 })
  const supplied = request.headers.get('authorization') ?? ''
  const expected = `Basic ${Buffer.from(`${user}:${password}`).toString('base64')}`
  if (!timingSafeEqual(digest(supplied), digest(expected))) return NextResponse.json({ message: 'Unauthorised.' }, { status: 401 })
  const raw = await request.text()
  if (Buffer.byteLength(raw) > 600_000) return NextResponse.json({ message: 'Message too large.' }, { status: 413 })
  let data: unknown
  try { data = JSON.parse(raw) } catch { return NextResponse.json({ message: 'Invalid message.' }, { status: 400 }) }
  const result = await deliverGatewayMessage(data, gatewayDependencies())
  return NextResponse.json({ ok: result.status === 200 }, { status: result.status, headers: { 'Cache-Control': 'no-store' } })
}
