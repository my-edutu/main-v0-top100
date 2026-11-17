import { NextResponse, type NextRequest } from 'next/server'
import { getServerSession } from '@/lib/auth-server'
import { requireAdmin } from '@/lib/api/require-admin'
import { createAdminClient } from '@/lib/supabase/server'
import { checkRateLimit, getClientIdentifier, RATE_LIMITS, createRateLimitResponse } from '@/lib/rate-limit'
import { talentDiscoveryEnabled } from './features'
import { TalentInputError, UUID_PATTERN } from './contracts'

export const PRIVATE_HEADERS = { 'Cache-Control': 'private, no-store, max-age=0', Vary: 'Cookie, Authorization', 'X-Robots-Tag': 'noindex' }
export function talentJson(body: unknown, status = 200) { return NextResponse.json(body, { status, headers: PRIVATE_HEADERS }) }
export class TalentAccessError extends Error { constructor(message: string, public readonly status: number) { super(message) } }
export function assertTalentEnabled() { if (!talentDiscoveryEnabled()) throw new TalentAccessError('Talent discovery is not enabled in this environment.', 404) }
export function assertSameOrigin(request: Request) {
  const origin = request.headers.get('origin')
  if (!origin || origin !== new URL(request.url).origin) throw new TalentAccessError('Please submit this form from the Top100 website.', 403)
}
export async function readTalentBody(request: Request): Promise<Record<string, unknown>> {
  if (!request.headers.get('content-type')?.toLowerCase().includes('application/json')) throw new TalentInputError('Send a JSON form.')
  if (Number(request.headers.get('content-length') || 0) > 70_000) throw new TalentAccessError('The form is too large.', 413)
  const reader = request.body?.getReader()
  if (!reader) throw new TalentInputError('The form is empty.')
  const chunks: Uint8Array[] = []; let size = 0
  try {
    while (true) {
      const { value, done } = await reader.read(); if (done) break
      size += value.byteLength
      if (size > 70_000) { await reader.cancel(); throw new TalentAccessError('The form is too large.', 413) }
      chunks.push(value)
    }
    const bytes = new Uint8Array(size); let offset = 0
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength }
    const data: unknown = JSON.parse(new TextDecoder().decode(bytes))
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new TalentInputError('Invalid form.')
    return data as Record<string, unknown>
  } catch (error) {
    if (error instanceof TalentAccessError || error instanceof TalentInputError) throw error
    throw new TalentInputError('Could not read this form. Please try again.')
  } finally { reader.releaseLock() }
}
export function id(value: unknown, label = 'Reference'): string {
  if (typeof value !== 'string' || !UUID_PATTERN.test(value)) throw new TalentInputError(`${label} is invalid.`)
  return value
}
export function revision(value: unknown): number {
  if (!Number.isInteger(value) || Number(value) < 0) throw new TalentInputError('Reload this record before saving.')
  return Number(value)
}
export function onlyFields(body: Record<string, unknown>, fields: string[]) {
  if (Object.keys(body).some(key => !fields.includes(key))) throw new TalentInputError('Unexpected form field.')
}
export async function talentRateLimit(request: NextRequest, kind: 'QUERY' | 'CONTACT', suffix: string) {
  const result = await checkRateLimit({ ...RATE_LIMITS[kind], identifier: `talent:${suffix}:${getClientIdentifier(request.headers)}` })
  return result.success ? null : createRateLimitResponse(result, 'Too many requests. Please try again shortly.')
}
export async function requireTalentMember(request: NextRequest) {
  assertTalentEnabled()
  const session = await getServerSession(request)
  if (!session?.user?.id) throw new TalentAccessError('Please sign in to your Top100 account.', 401)
  const db = createAdminClient()
  const { data: profile, error } = await db.from('profiles').select('*').eq('id', session.user.id).maybeSingle()
  if (error) throw error
  if (!profile || profile.membership_status !== 'approved' || (profile.account_status && profile.account_status !== 'active')) throw new TalentAccessError('An approved, active Top100 membership is required.', 403)
  const award = await db.from('awardees').select('id,name,slug,headline,bio,country,course,year,is_public').eq('profile_id', session.user.id).order('year', { ascending: false }).limit(1).maybeSingle()
  if (award.error) throw award.error
  if (!award.data) throw new TalentAccessError('Link your awardee profile before using talent discovery.', 403)
  return { db, user: session.user, profile, awardee: award.data }
}
export async function requireTalentAdmin(request?: NextRequest) {
  assertTalentEnabled()
  const check = await requireAdmin(request)
  if ('error' in check) throw new TalentAccessError('Administrator access required.', check.error.status)
  const db = createAdminClient()
  const active = await db.rpc('talent_assert_admin', { p_actor: check.user.id })
  if (active.error) throw active.error
  return { db, user: check.user }
}
export function talentError(error: unknown): NextResponse {
  if (error instanceof TalentInputError) return talentJson({ message: error.message }, 400)
  if (error instanceof TalentAccessError) return talentJson({ message: error.message }, error.status)
  const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : ''
  if (code === '40001' || code === '23505') return talentJson({ message: 'This record has changed. Reload before saving again.' }, 409)
  if (code === '42501') return talentJson({ message: 'This action is not available for this account or its current permissions.' }, 403)
  if (code === 'P0002') return talentJson({ message: 'This record could not be found.' }, 404)
  if (code === '22023') return talentJson({ message: 'Please check the form and the current record status.' }, 400)
  if (['42P01','42703','42883','PGRST202','PGRST204','PGRST205'].includes(code)) return talentJson({ message: 'Talent discovery is not configured in this environment yet. Your existing Top100 features remain available.', setupRequired: true }, 503)
  console.error('[talent] operation failed', { code: code || 'unknown' })
  return talentJson({ message: 'We could not complete that action. Your changes have not been confirmed. Please try again.' }, 500)
}
