// lib/access-codes.ts
// Server-only helpers for admin-issued signup access codes.
// All operations use the service-role client (bypasses RLS); NEVER import
// this file into client components.
import { createAdminClient } from '@/lib/supabase/server'

export type AccessCodeStatus = 'active' | 'used' | 'expired' | 'revoked'
export type AccessCodeMode = 'single_use' | 'time_limited'

export interface AccessCode {
  id: string
  code: string
  label: string | null
  status: AccessCodeStatus
  redemption_mode: AccessCodeMode
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

type AccessCodeDecision = { ok: true } | { ok: false; reason: Exclude<ValidateResult, { ok: true }>['reason'] }

export function evaluateAccessCode(record: AccessCode, email?: string, now = Date.now()): AccessCodeDecision {
  if (record.status !== 'active') return { ok: false, reason: 'inactive' }
  if (record.redemption_mode === 'single_use' && record.uses_left < 1) {
    return { ok: false, reason: 'exhausted' }
  }
  if (record.expires_at && new Date(record.expires_at).getTime() < now) {
    return { ok: false, reason: 'expired' }
  }
  if (record.email && email && record.email.toLowerCase() !== email.toLowerCase()) {
    return { ok: false, reason: 'email_mismatch' }
  }
  return { ok: true }
}

export function buildAccessCodeInsert(opts: {
  mode: AccessCodeMode
  email?: string | null
  durationHours?: 1 | 24
  now?: Date
}) {
  const now = opts.now ?? new Date()
  const durationHours = opts.mode === 'time_limited' ? (opts.durationHours ?? 1) : 90 * 24

  return {
    redemption_mode: opts.mode,
    email: opts.mode === 'single_use' ? (opts.email?.trim().toLowerCase() || null) : null,
    uses_left: 1,
    expires_at: new Date(now.getTime() + durationHours * 60 * 60 * 1000).toISOString(),
  }
}

export function buildAccessCodeConsumption(record: AccessCode, userId: string, now = new Date()) {
  const usesLeft = record.redemption_mode === 'single_use'
    ? Math.max(0, record.uses_left - 1)
    : record.uses_left

  return {
    uses_left: usesLeft,
    status: record.redemption_mode === 'single_use' && usesLeft < 1 ? 'used' as const : 'active' as const,
    used_by: userId,
    used_at: now.toISOString(),
  }
}

export function parseAccessCodeRequest(body: Record<string, unknown>) {
  if (body.mode !== undefined && body.mode !== 'single_use' && body.mode !== 'time_limited') {
    throw new Error('Choose a valid invite code type.')
  }
  const mode: AccessCodeMode = body.mode === 'time_limited' ? 'time_limited' : 'single_use'
  const label = typeof body.label === 'string' && body.label.trim() ? body.label.trim() : 'Awardee invite'

  if (mode === 'single_use') {
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      throw new Error('A valid recipient email is required for an individual code.')
    }
    return { mode, label, email }
  }

  const durationHours = Number(body.durationHours)
  if (durationHours !== 1 && durationHours !== 24) {
    throw new Error('Choose a reusable-code duration of 1 or 24 hours.')
  }
  return { mode, label, email: null, durationHours: durationHours as 1 | 24 }
}

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

  const decision = evaluateAccessCode(record, email)
  if (!decision.ok) return decision

  return { ok: true, code: record }
}

/**
 * Record a successful redemption. Individual codes use a compare-and-swap
 * decrement so only one concurrent signup can win. Timed codes remain active
 * and reusable, but the guarded update still verifies they have not expired.
 */
export async function consumeCode(rawCode: string, userId: string): Promise<boolean> {
  const supabase = createAdminClient()
  const code = normalizeCode(rawCode)

  for (let attempt = 0; attempt < 5; attempt++) {
    const { data } = await supabase
      .from('access_codes')
      .select('*')
      .eq('code', code)
      .eq('status', 'active')
      .maybeSingle()

    if (!data) return false

    const record = data as AccessCode
    const decision = evaluateAccessCode(record)
    if (!decision.ok) return false
    const consumedAt = new Date()
    const update = buildAccessCodeConsumption(record, userId, consumedAt)
    let updateQuery = supabase
      .from('access_codes')
      .update(update)
      .eq('code', code)
      .eq('status', 'active')

    if (record.redemption_mode === 'single_use') {
      updateQuery = updateQuery.eq('uses_left', record.uses_left)
    } else {
      updateQuery = updateQuery.gt('expires_at', consumedAt.toISOString())
    }

    const { data: updated, error } = await updateQuery.select('id')

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
  mode?: AccessCodeMode
  durationHours?: 1 | 24
  createdBy?: string | null
}): Promise<AccessCode> {
  const supabase = createAdminClient()
  const policy = buildAccessCodeInsert({
    mode: opts.mode ?? 'single_use',
    email: opts.email,
    durationHours: opts.durationHours,
  })

  // Retry a couple times on the (very unlikely) unique collision.
  let lastError: unknown = null
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = randomCode()
    const { data, error } = await supabase
      .from('access_codes')
      .insert({
        code: candidate,
        label: opts.label ?? 'Awardee invite',
        ...policy,
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
