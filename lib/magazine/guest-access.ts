import { createHash, randomBytes } from 'node:crypto'

export const MAGAZINE_GUEST_ACCESS_COOKIE = 'afl_magazine_guest_access'
export const MAGAZINE_GUEST_ACCESS_MAX_AGE = 60 * 60 * 24 * 30
export const MAGAZINE_GUEST_ACCESS_PATH = '/api/public/magazine'

const GUEST_ACCESS_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/

export function createMagazineGuestAccessToken(): string {
  return randomBytes(32).toString('base64url')
}

export function hashMagazineGuestAccessToken(token: string | null | undefined): string | null {
  if (!token || !GUEST_ACCESS_TOKEN_PATTERN.test(token)) return null
  return createHash('sha256').update(token, 'utf8').digest('hex')
}
