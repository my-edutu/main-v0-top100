import { NextRequest } from 'next/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { requireAdmin, createAdminClient, sendTransactionalEmail } = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  createAdminClient: vi.fn(),
  sendTransactionalEmail: vi.fn(),
}))

vi.mock('@/lib/api/require-admin', () => ({ requireAdmin }))
vi.mock('@/lib/supabase/server', () => ({ createAdminClient }))
vi.mock('@/lib/email/send', () => ({ sendTransactionalEmail }))

import { POST } from '@/app/api/admin/users/invite/route'

function request(body: Record<string, unknown>) {
  return new NextRequest('https://www.top100afl.com/api/admin/users/invite', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/admin/users/invite', () => {
  afterEach(() => vi.unstubAllEnvs())

  beforeEach(() => {
    vi.clearAllMocks()
    requireAdmin.mockResolvedValue({ user: { id: 'inviter-1' }, profile: { role: 'admin' } })
    sendTransactionalEmail.mockResolvedValue({ ok: true })
  })

  it('creates an admin setup link without sending email and provisions the profile', async () => {
    const generateLink = vi.fn().mockResolvedValue({ data: { user: { id: 'new-user-1' }, properties: { action_link: 'https://project.supabase.co/auth/v1/verify?token=test' } }, error: null })
    const upsert = vi.fn().mockReturnValue({ select: () => ({ single: vi.fn().mockResolvedValue({ data: { id: 'new-user-1' }, error: null }) }) })
    createAdminClient.mockReturnValue({ auth: { admin: { generateLink } }, from: () => ({ upsert }) })

    const response = await POST(request({ email: 'new.admin@example.com', fullName: 'Ada Admin' }))

    expect(response.status).toBe(201)
    expect(generateLink).toHaveBeenCalledWith({
      type: 'invite',
      email: 'new.admin@example.com',
      options: {
        data: { full_name: 'Ada Admin', role: 'admin' },
        redirectTo: 'https://www.top100afl.com/auth/update-password?source=admin',
      },
    })
    expect(upsert).toHaveBeenCalledWith({ id: 'new-user-1', email: 'new.admin@example.com', full_name: 'Ada Admin', role: 'admin' }, { onConflict: 'id' })
    await expect(response.json()).resolves.toMatchObject({ emailSent: false, setupLink: 'https://project.supabase.co/auth/v1/verify?token=test' })
  })

  it('deletes the invited auth user if the admin profile cannot be provisioned', async () => {
    const deleteUser = vi.fn().mockResolvedValue({ error: null })
    const generateLink = vi.fn().mockResolvedValue({ data: { user: { id: 'new-user-2' }, properties: { action_link: 'https://project.supabase.co/verify' } }, error: null })
    const upsert = vi.fn().mockReturnValue({ select: () => ({ single: vi.fn().mockResolvedValue({ data: null, error: { message: 'profile failed' } }) }) })
    createAdminClient.mockReturnValue({ auth: { admin: { generateLink, deleteUser } }, from: () => ({ upsert }) })

    const response = await POST(request({ email: 'broken.admin@example.com' }))

    expect(response.status).toBe(500)
    expect(deleteUser).toHaveBeenCalledWith('new-user-2')
  })

  it('rejects requests from non-admin callers before touching Supabase', async () => {
    requireAdmin.mockResolvedValue({ error: Response.json({ message: 'Admin access required' }, { status: 403 }) })
    const response = await POST(request({ email: 'blocked@example.com' }))

    expect(response.status).toBe(403)
    expect(createAdminClient).not.toHaveBeenCalled()
  })

  it('rejects malformed JSON shapes before touching Supabase', async () => {
    const response = await POST(request(null as unknown as Record<string, unknown>))
    expect(response.status).toBe(400)
    expect(createAdminClient).not.toHaveBeenCalled()
  })

  it('sends production invites only with the configured public HTTPS redirect', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://www.top100afl.com')
    const generateLink = vi.fn().mockResolvedValue({ data: { user: { id: 'prod-user-1' }, properties: { action_link: 'https://project.supabase.co/auth/v1/verify?token=prod' } }, error: null })
    const upsert = vi.fn().mockReturnValue({ select: () => ({ single: vi.fn().mockResolvedValue({ data: { id: 'prod-user-1' }, error: null }) }) })
    const adminGenerateLink = vi.fn().mockImplementation(async (args) => {
      expect(args.options.redirectTo).toBe('https://www.top100afl.com/auth/update-password?source=admin')
      return generateLink(args)
    })
    createAdminClient.mockReturnValue({ auth: { admin: { generateLink: adminGenerateLink } }, from: () => ({ upsert }) })

    const response = await POST(request({ email: 'prod.admin@example.com', fullName: 'Prod Admin' }))

    expect(response.status).toBe(201)
    expect(generateLink).toHaveBeenCalledWith({
      type: 'invite', email: 'prod.admin@example.com',
      options: { data: { full_name: 'Prod Admin', role: 'admin' }, redirectTo: 'https://www.top100afl.com/auth/update-password?source=admin' },
    })
    expect(sendTransactionalEmail).toHaveBeenCalledWith(expect.objectContaining({
      to: 'prod.admin@example.com',
      toName: 'Prod Admin',
      subject: 'Set up your Top100 Africa Future Leaders admin account',
      idempotencyKey: 'admin-invite-prod-user-1',
    }))
    await expect(response.json()).resolves.toMatchObject({ emailSent: true, setupLink: null })
  })

  it('does not send email in local development and returns the setup link', async () => {
    const generateLink = vi.fn().mockResolvedValue({ data: { user: { id: 'local-user-1' }, properties: { action_link: 'http://supabase.local/verify?token=local' } }, error: null })
    const upsert = vi.fn().mockReturnValue({ select: () => ({ single: vi.fn().mockResolvedValue({ data: { id: 'local-user-1' }, error: null }) }) })
    createAdminClient.mockReturnValue({ auth: { admin: { generateLink } }, from: () => ({ upsert }) })

    const response = await POST(request({ email: 'local.admin@example.com' }))

    expect(response.status).toBe(201)
    expect(sendTransactionalEmail).not.toHaveBeenCalled()
    await expect(response.json()).resolves.toMatchObject({ emailSent: false, setupLink: 'http://supabase.local/verify?token=local' })
  })

  it('removes the pending account when production email delivery fails', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://www.top100afl.com')
    sendTransactionalEmail.mockResolvedValue({ ok: false, reason: 'Resend unavailable' })
    const deleteUser = vi.fn().mockResolvedValue({ error: null })
    const generateLink = vi.fn().mockResolvedValue({ data: { user: { id: 'failed-mail-user' }, properties: { action_link: 'https://project.supabase.co/verify?token=failed' } }, error: null })
    const profileDelete = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) })
    const upsert = vi.fn().mockReturnValue({ select: () => ({ single: vi.fn().mockResolvedValue({ data: { id: 'failed-mail-user' }, error: null }) }) })
    createAdminClient.mockReturnValue({
      auth: { admin: { generateLink, deleteUser } },
      from: () => ({ upsert, delete: profileDelete }),
    })

    const response = await POST(request({ email: 'failed.admin@example.com' }))

    expect(response.status).toBe(502)
    expect(profileDelete).toHaveBeenCalledOnce()
    expect(deleteUser).toHaveBeenCalledWith('failed-mail-user')
    await expect(response.json()).resolves.toMatchObject({ message: expect.stringContaining('email could not be sent') })
  })

  it('does not send a production invite when the configured site URL is localhost', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'http://localhost:3000')
    const response = await POST(request({ email: 'blocked.admin@example.com' }))
    expect(response.status).toBe(503)
    expect(createAdminClient).not.toHaveBeenCalled()
  })

  it('requires an explicit public site URL in production instead of trusting request origin', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', '')
    const response = await POST(request({ email: 'blocked.admin@example.com' }))
    expect(response.status).toBe(503)
    expect(createAdminClient).not.toHaveBeenCalled()
  })
})
