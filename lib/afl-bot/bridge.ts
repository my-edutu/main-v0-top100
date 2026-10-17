import 'server-only'
import { NextResponse } from 'next/server'
import type { BotOperation } from './operations'

const noStore = { 'Cache-Control': 'private, no-store, max-age=0' }
function privateHttpHost(host: string) {
  return host === 'localhost' || host === '127.0.0.1' || /^[a-z0-9-]+$/.test(host)
    || host.endsWith('.internal') || /^10\.\d+\.\d+\.\d+$/.test(host)
    || /^192\.168\.\d+\.\d+$/.test(host) || /^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/.test(host)
}
function connection() {
  const raw = process.env.AFL_BOT_ADMIN_URL
  const token = process.env.AFL_BOT_ADMIN_TOKEN
  if (!raw || !token || token.length < 32 || !/^[\x21-\x7e]+$/.test(token)) return null
  try {
    const url = new URL(raw)
    if (url.username || url.password || url.search || url.hash || url.pathname !== '/') return null
    if (url.protocol !== 'https:' && !(url.protocol === 'http:' && privateHttpHost(url.hostname))) return null
    return { url, token }
  } catch { return null }
}
export async function callBot(operation: BotOperation, userId: string) {
  const config = connection()
  if (!config) return NextResponse.json({ configured: false,
    message: 'The bot admin connection is not configured. Ask the operator to connect the private bot service.' },
    { status: 503, headers: noStore })
  try {
    const upstream = await fetch(new URL(operation.path, config.url), {
      method: operation.method, headers: { Authorization: `Bearer ${config.token}`,
        'X-AFL-Actor': `web:${userId}`, 'Content-Type': 'application/json' },
      ...(operation.data ? { body: JSON.stringify(operation.data) } : {}),
      cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(50000),
    })
    if (upstream.status >= 500) throw new Error('Bot operation unavailable')
    if ([401, 403].includes(upstream.status)) return NextResponse.json({
      message: 'The bot rejected its server connection credentials. Ask the operator to check the bridge.' },
      { status: 502, headers: noStore })
    const data: unknown = await upstream.json()
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Invalid bot response')
    return NextResponse.json(data, { status: upstream.status, headers: noStore })
  } catch {
    return NextResponse.json({ message: operation.isSend
      ? 'Delivery status is not confirmed. Refresh the announcement status and check the group before attempting another send.'
      : 'The bot service is unavailable. Please try refreshing its status shortly.' },
    { status: 503, headers: noStore })
  }
}
