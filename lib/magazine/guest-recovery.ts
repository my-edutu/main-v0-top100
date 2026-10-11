import { createHmac, timingSafeEqual, createHash, createCipheriv, createDecipheriv, randomBytes, randomInt } from 'node:crypto'

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

export const MAGAZINE_OTP_COOKIE = 'afl_magazine_resume_code'
export const MAGAZINE_OTP_MAX_AGE = 10 * 60
const OTP_PURPOSE = 'afl-magazine-otp-v1'
type OtpChallenge = { email: string; code: string; recoveryToken: string | null; expiresAt: number }

function otpKey() {
  return createHash('sha256').update(OTP_PURPOSE + signingKey()).digest()
}

export function createMagazineOtpCode() {
  return randomInt(0, 1_000_000).toString().padStart(6, '0')
}

// The browser receives only authenticated ciphertext. A short code or its hash
// must never be exposed in a client-readable challenge, where it can be guessed offline.
export function createMagazineOtpChallenge(email: string, code: string, recoveryToken: string | null, now = Date.now()) {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', otpKey(), iv)
  cipher.setAAD(Buffer.from(OTP_PURPOSE))
  const encrypted = Buffer.concat([cipher.update(JSON.stringify({ email, code, recoveryToken, expiresAt: Math.floor(now / 1000) + MAGAZINE_OTP_MAX_AGE }), 'utf8'), cipher.final()])
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString('base64url')
}

export function readMagazineOtpChallenge(raw: string | undefined, now = Date.now()): OtpChallenge | null {
  try {
    if (!raw || raw.length > 2048 || !/^[A-Za-z0-9_-]+$/.test(raw)) return null
    const data = Buffer.from(raw, 'base64url')
    if (data.length < 29) return null
    const decipher = createDecipheriv('aes-256-gcm', otpKey(), data.subarray(0, 12))
    decipher.setAAD(Buffer.from(OTP_PURPOSE))
    decipher.setAuthTag(data.subarray(12, 28))
    const claim = JSON.parse(Buffer.concat([decipher.update(data.subarray(28)), decipher.final()]).toString('utf8'))
    const seconds = Math.floor(now / 1000)
    if (typeof claim.email !== 'string' || typeof claim.code !== 'string' || !/^[0-9]{6}$/.test(claim.code) || (claim.recoveryToken !== null && typeof claim.recoveryToken !== 'string') || !Number.isSafeInteger(claim.expiresAt) || claim.expiresAt <= seconds || claim.expiresAt > seconds + MAGAZINE_OTP_MAX_AGE) return null
    return claim
  } catch { return null }
}

export function magazineOtpMatches(challenge: OtpChallenge, code: string) {
  return /^[0-9]{6}$/.test(code) && timingSafeEqual(Buffer.from(challenge.code), Buffer.from(code))
}
