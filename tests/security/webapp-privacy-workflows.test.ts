import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const root = path.resolve(__dirname, '../..')
const source = (file: string) => readFileSync(path.join(root, file), 'utf8')

describe('web application stabilization security regressions', () => {
  it('restricts public awardee collection and detail responses', () => {
    const list = source('app/api/awardees/route.ts')
    const detail = source('app/api/awardees/[id]/route.ts')
    expect(list).toContain("if (!includeAllForAdmin) query = query.eq('is_public', true)")
    expect(list).toContain("'id,name,slug,avatar_url,image_url,country,course,bio")
    expect(list).not.toContain('return Response.json(fallbackAwardees)')
    expect(detail).toContain("if (!adminMode) query = query.eq('is_public', true)")
    expect(detail).not.toContain('delete safeData.email')
    const search = source('app/api/awardees/search/route.ts')
    expect(search).toContain(".eq('is_public', true)")
    expect(search).toContain(".limit(100)")
    expect(search).toContain('sanitizedQuery')
  })

  it.each([
    ['app/api/events/route.ts', "if (scope === 'admin')"],
    ['app/api/announcements/route.ts', "if (scope === 'admin')"],
    ['app/api/homepage-sections/route.ts', "if (scope === 'admin')"],
  ])('checks admin role for privileged read mode: %s', (file, scopeGuard) => {
    const contents = source(file)
    const gate = contents.indexOf(scopeGuard)
    const check = contents.indexOf('await requireAdmin(', gate)
    expect(gate).toBeGreaterThanOrEqual(0)
    expect(check).toBeGreaterThan(gate)
    expect(check - gate).toBeLessThan(170)
  })

  it('never returns the complete site-settings row to anonymous callers', () => {
    const contents = source('app/api/settings/route.ts')
    expect(contents).toContain('PUBLIC_SITE_SETTINGS_KEYS')
    expect(contents).toContain('publicSiteSettings(data)')
    const publicKeys = contents.slice(contents.indexOf('const PUBLIC_SITE_SETTINGS_KEYS'), contents.indexOf('function publicSiteSettings'))
    expect(publicKeys).not.toMatch(/smtp_password|brevo_api_key|cloudinary_api_secret|recaptcha_secret_key/)
  })

  it('protects feature request management and ignores user-supplied prices and payment state', () => {
    const contents = source('app/api/feature-requests/route.ts')
    const get = contents.slice(contents.indexOf('export async function GET'), contents.indexOf('export async function PUT'))
    const put = contents.slice(contents.indexOf('export async function PUT'))
    expect(get).toContain('await requireAdmin(request)')
    expect(put).toContain('await requireAdmin(request)')
    expect(put).toContain('rejectCrossOriginMutation(request)')
    const post = contents.slice(contents.indexOf('export async function POST'), contents.indexOf('export async function GET'))
    expect(post).toContain('amount: 40000')
    expect(post).toContain("currency: 'NGN'")
    expect(post).toContain("status: 'pending'")
    expect(post).toContain('checkRateLimit')
  })

  it('protects member account access independently of directory visibility', () => {
    const middleware = source('utils/supabase/middleware.ts')
    const admin = source('lib/api/require-admin.ts')
    const users = source('app/api/users/route.ts')
    expect(middleware).toContain('select=notification_prefs,account_status')
    expect(middleware).toContain("profile.account_status !== 'active'")
    expect(admin).toContain('account_status !== "active"')
    expect(users).toContain("updates.account_status = status === 'inactive' ? 'suspended' : 'active'")
    expect(users).not.toContain("updates.is_public = status === 'active'")
  })

  it('keeps active WhatsApp invitations out of tracked runtime configuration', () => {
    const contents = source('lib/groups/whatsapp.ts')
    expect(contents).toContain('WHATSAPP_GROUP_1_INVITE_URL')
    expect(contents).toContain('WHATSAPP_GROUP_2_INVITE_URL')
    expect(contents).toContain('WHATSAPP_GROUP_3_INVITE_URL')
    expect(contents).not.toMatch(/https:\/\/chat\.whatsapp\.com\/[A-Za-z0-9]{15,}/)
  })
})
