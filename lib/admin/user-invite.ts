export type AdminInviteInput = {
  email: string
  fullName?: string
}

export type NormalizedAdminInvite = {
  email: string
  fullName: string
  role: 'admin'
}

export function normalizeAdminInviteInput(input: AdminInviteInput): NormalizedAdminInvite {
  const email = input.email.trim().toLowerCase()
  const fullName = input.fullName?.trim() ?? ''

  if (!email) throw new Error('Email is required.')
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Enter a valid email address.')
  if (fullName.length > 120) throw new Error('Name must be 120 characters or fewer.')

  return { email, fullName, role: 'admin' }
}

export function getAdminInviteRedirectUrl(siteOrigin: string): string {
  return `${siteOrigin.replace(/\/$/, '')}/auth/update-password?source=admin`
}

export function buildAdminInviteMetadata(input: NormalizedAdminInvite): { full_name: string; role: 'admin' } {
  return { full_name: input.fullName, role: 'admin' }
}
