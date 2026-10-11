import { createHmac, timingSafeEqual } from 'node:crypto'

const PURPOSE = 'afl-magazine-guest-recovery-v1:'
const LIFETIME_SECONDS = 30 * 60

type RecoveryClaim = { orderId: string; accessHash: string; expiresAt: number }

function signingKey() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) throw new Error('Magazine recovery is not configured.')
  return key
}

export function createMagazineRecoveryToken(orderId: string, accessHash: string, now = Date.now()) {
  const payload = Buffer.from(JSON.stringify({ orderId, accessHash, expiresAt: Math.floor(now / 1000) + LIFETIME_SECONDS })).toString('base64url')
  return `${payload}.${createHmac('sha256', signingKey()).update(PURPOSE + payload).digest('base64url')}`
}

export function readMagazineRecoveryToken(token: string, now = Date.now()): RecoveryClaim | null {
  try {
    if (token.length > 1024) return null
    const parts = token.split('.')
    if (parts.length !== 2 || !parts.every(part => /^[A-Za-z0-9_-]+$/.test(part))) return null
    const [payload, signature] = parts
    const expected = createHmac('sha256', signingKey()).update(PURPOSE + payload).digest()
    const actual = Buffer.from(signature, 'base64url')
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null
    const claim = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    const seconds = Math.floor(now / 1000)
    if (typeof claim.orderId !== 'string' || !/^[0-9a-f-]{36}$/i.test(claim.orderId) || !/^[0-9a-f]{64}$/.test(claim.accessHash) || !Number.isSafeInteger(claim.expiresAt) || claim.expiresAt <= seconds || claim.expiresAt > seconds + LIFETIME_SECONDS) return null
    return claim
  } catch { return null }
}
