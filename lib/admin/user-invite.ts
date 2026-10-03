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
  let origin: URL
  try {
    origin = new URL(siteOrigin)
  } catch {
    throw new Error('Set NEXT_PUBLIC_SITE_URL to a valid site origin before creating invite links.')
  }

  if (!['http:', 'https:'].includes(origin.protocol) || origin.username || origin.password || origin.pathname !== '/' || origin.search || origin.hash) {
    throw new Error('Set NEXT_PUBLIC_SITE_URL to a site origin without a path or credentials.')
  }

  const host = origin.hostname.toLowerCase().replace(/\.$/, '')
  const reservedLocalDomain = /(^|\.)(localhost|local|test|invalid|example|internal|lan)$/.test(host) || host === 'home.arpa'
  const ipLiteral = /^\d{1,3}(?:\.\d{1,3}){3}$/.test(host) || (host.startsWith('[') && host.endsWith(']'))
  if (process.env.NODE_ENV === 'production' && (
    origin.protocol !== 'https:' ||
    reservedLocalDomain ||
    ipLiteral ||
    !host.includes('.')
  )) {
    throw new Error('Admin invite links require a public HTTPS site URL in production.')
  }

  return `${origin.origin}/auth/update-password?source=admin`
}

export function buildAdminInviteMetadata(input: NormalizedAdminInvite): { full_name: string; role: 'admin' } {
  return { full_name: input.fullName, role: 'admin' }
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character]!)
}

export function buildAdminInviteEmail(input: { fullName: string; setupLink: string }): { subject: string; html: string; text: string } {
  const greeting = input.fullName ? `Hello ${input.fullName},` : 'Hello,'
  const safeGreeting = escapeHtml(greeting)
  const safeLink = escapeHtml(input.setupLink)
  return {
    subject: 'Set up your Top100 Africa Future Leaders admin account',
    text: `${greeting}\n\nAn administrator created an account for you on Top100 Africa Future Leaders. Use the secure link below to verify your email and choose a password:\n\n${input.setupLink}\n\nIf you were not expecting this invitation, contact the person who invited you.`,
    html: `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Admin account invitation</title></head><body style="margin:0;background:#f7f4ef;font-family:Arial,sans-serif;color:#211b18"><div style="display:none;max-height:0;overflow:hidden;opacity:0">Your secure link to set up your Top100 admin account.</div><main style="max-width:600px;margin:32px auto;padding:32px 24px;background:#fff;border:1px solid #e8dfd5;border-radius:16px"><p style="margin:0 0 12px;color:#b84412;font-size:13px;font-weight:700;letter-spacing:2px;text-transform:uppercase">Top100 Africa Future Leaders</p><h1 style="margin:0 0 18px;font-size:26px;line-height:1.25">Set up your admin account</h1><p style="font-size:16px;line-height:1.6">${safeGreeting}</p><p style="font-size:16px;line-height:1.6">An administrator created an account for you on Top100 Africa Future Leaders. Use the secure link below to verify your email and choose a password.</p><p style="margin:28px 0"><a href="${safeLink}" style="display:inline-block;min-height:48px;padding:0 24px;border-radius:8px;background:#f97316;color:#17120f;font-size:16px;font-weight:700;line-height:48px;text-decoration:none">Set up your account</a></p><p style="font-size:14px;line-height:1.6;color:#655e58">If you were not expecting this invitation, contact the person who invited you. Do not forward this link; it provides access to your admin account.</p></main></body></html>`,
  }
}
