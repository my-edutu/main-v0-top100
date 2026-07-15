// lib/access-codes.ts
// Server-only helpers for admin-issued signup access codes.
// All operations use the service-role client (bypasses RLS); NEVER import
// this file into client components.
import { createAdminClient } from '@/lib/supabase/server'

export type AccessCodeStatus = 'active' | 'used' | 'expired' | 'revoked'

export interface AccessCode {
  id: string
  code: string
  label: string | null
  status: AccessCodeStatus
  uses_left: number
  email: string | null
  created_by: string | null
  used_by: string | null
  used_at: string | null
  expires_at: string
  created_at: string
}

export type ValidateResult =
  | { ok: true; code: AccessCode }
  | { ok: false; reason: 'not_found' | 'inactive' | 'exhausted' | 'expired' | 'email_mismatch' }

/** Normalize a code for storage/lookup: trimmed + uppercased. */
export function normalizeCode(code: string): string {
  return code.trim().toUpperCase()
}

// Crockford-style base32: no I/L/O/U, so codes stay readable when typed by hand.
// 32 chars = exactly 5 bits each, so masking bytes introduces no modulo bias.
const CODE_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'
const CODE_LENGTH = 10

/** Generate a fresh, human-friendly code like AFL-K3M9Q-7VZ2R (50 bits). */
function randomCode(): string {
  const random = globalThis.crypto?.getRandomValues
  if (!random) {
    // Never silently fall back to a constant: that would mint a predictable code.
    throw new Error('access-codes: crypto.getRandomValues is unavailable')
  }

  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(CODE_LENGTH))
  let out = ''
  for (let i = 0; i < CODE_LENGTH; i++) {
    out += CODE_ALPHABET[bytes[i] & 31]
  }
  return `AFL-${out.slice(0, 5)}-${out.slice(5)}`
}

/**
 * Validate a code without consuming it. Optionally enforce an email binding.
 */
export async function validateCode(rawCode: string, email?: string): Promise<ValidateResult> {
  const supabase = createAdminClient()
  const code = normalizeCode(rawCode)

  const { data, error } = await supabase
    .from('access_codes')
    .select('*')
    .eq('code', code)
    .maybeSingle()

  if (error || !data) return { ok: false, reason: 'not_found' }

  const record = data as AccessCode

  if (record.status !== 'active') return { ok: false, reason: 'inactive' }
  if (record.uses_left < 1) return { ok: false, reason: 'exhausted' }
  if (record.expires_at && new Date(record.expires_at).getTime() < Date.now()) {
    return { ok: false, reason: 'expired' }
  }
  if (record.email && email && record.email.toLowerCase() !== email.toLowerCase()) {
    return { ok: false, reason: 'email_mismatch' }
  }

  return { ok: true, code: record }
}

/**
 * Consume one use of a code and attribute it to the redeeming user.
 * Marks the code 'used' when no uses remain.
 *
 * Concurrency: this is a compare-and-swap, not a read-then-write. The UPDATE
 * only matches while uses_left is still the value we read, so of N concurrent
 * redemptions of the same code exactly one wins per use — the losers match 0
 * rows and retry against the new value. A plain decrement would let N signups
 * share a single decrement and redeem a 1-use code many times over.
 */
export async function consumeCode(rawCode: string, userId: string): Promise<boolean> {
  const supabase = createAdminClient()
  const code = normalizeCode(rawCode)

  for (let attempt = 0; attempt < 5; attempt++) {
    const { data } = await supabase
      .from('access_codes')
      .select('uses_left')
      .eq('code', code)
      .eq('status', 'active')
      .maybeSingle()

    if (!data) return false

    const observed = (data as { uses_left: number }).uses_left
    if (observed < 1) return false

    const usesLeft = observed - 1

    const { data: updated, error } = await supabase
      .from('access_codes')
      .update({
        uses_left: usesLeft,
        status: usesLeft < 1 ? 'used' : 'active',
        used_by: userId,
        used_at: new Date().toISOString(),
      })
      .eq('code', code)
      .eq('status', 'active')
      .eq('uses_left', observed) // CAS: lose the race -> 0 rows -> retry
      .select('id')

    if (error) return false
    if (updated && updated.length > 0) return true
  }

  // Contention exhausted the retries; treat as not consumed rather than
  // reporting a redemption that never landed.
  return false
}

/** Create and persist a new access code. */
export async function generateCode(opts: {
  label?: string
  email?: string | null
  usesLeft?: number
  expiresInDays?: number
  createdBy?: string | null
}): Promise<AccessCode> {
  const supabase = createAdminClient()

  const expiresInDays = opts.expiresInDays ?? 90
  const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()

  // Retry a couple times on the (very unlikely) unique collision.
  let lastError: unknown = null
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = randomCode()
    const { data, error } = await supabase
      .from('access_codes')
      .insert({
        code: candidate,
        label: opts.label ?? 'Awardee invite',
        email: opts.email ?? null,
        uses_left: opts.usesLeft ?? 1,
        expires_at: expiresAt,
        created_by: opts.createdBy ?? null,
      })
      .select('*')
      .single()

    if (!error && data) return data as AccessCode
    lastError = error
  }

  throw new Error(`Failed to generate access code: ${String(lastError)}`)
}

/** List all codes, newest first. */
export async function listCodes(): Promise<AccessCode[]> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('access_codes')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []) as AccessCode[]
}

/** Revoke a code so it can no longer be redeemed. */
export async function revokeCode(id: string): Promise<AccessCode | null> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('access_codes')
    .update({ status: 'revoked', uses_left: 0 })
    .eq('id', id)
    .select('*')
    .maybeSingle()

  if (error) throw new Error(error.message)
  return (data as AccessCode) ?? null
}
