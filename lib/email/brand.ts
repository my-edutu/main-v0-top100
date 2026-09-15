const BRAND = 'Top100 Africa Future Leaders'
const DEFAULT_SITE_URL = 'https://top100afl.com'
const DEFAULT_LOGO_PATH = '/Top100%20Africa%20Future%20leaders%20Logo%20.png'

/** HTML-escape all dynamic text before it enters an email body or attribute. */
export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function siteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim() || DEFAULT_SITE_URL
  return /^https?:\/\//i.test(configured) ? configured.replace(/\/$/, '') : DEFAULT_SITE_URL
}

export function emailLogoUrl(): string {
  const configured = process.env.EMAIL_LOGO_URL?.trim()
  if (configured && /^https?:\/\//i.test(configured)) return configured
  return `${siteUrl()}${DEFAULT_LOGO_PATH}`
}

export function dashboardUrl(path = '/dashboard'): string {
  const safePath = path.startsWith('/') ? path : `/${path}`
  return `${siteUrl()}${safePath}`
}

function safeHref(url: string): string | null {
  return /^https?:\/\//i.test(url.trim()) ? url.trim() : null
}

export type BrandEmailOptions = {
  previewText: string
  eyebrow?: string
  heading: string
  bodyHtml: string
  cta?: { label: string; href: string }
  footerText?: string
}

export function brandButton(label: string, href: string): string {
  const safe = safeHref(href)
  if (!safe) return ''
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0 8px;">
    <tr>
      <td align="center" bgcolor="#f97316" style="border-radius:999px;background:#f97316;background-image:linear-gradient(135deg,#f97316 0%,#fb923c 48%,#ea580c 100%);">
        <a href="${escapeHtml(safe)}" style="display:inline-block;padding:14px 24px;border-radius:999px;color:#ffffff;font-size:14px;font-weight:700;line-height:1;text-decoration:none;">${escapeHtml(label)}</a>
      </td>
    </tr>
  </table>`
}

export function brandEmail({
  previewText,
  eyebrow = 'Member update',
  heading,
  bodyHtml,
  cta,
  footerText = 'Questions or need help? Reply to this email and our team will be happy to help.',
}: BrandEmailOptions): string {
  const ctaHtml = cta ? brandButton(cta.label, cta.href) : ''
  const logo = emailLogoUrl()

  return `<!doctype html>
<html>
  <head>
    <meta name="color-scheme" content="light only">
    <meta name="supported-color-schemes" content="light">
  </head>
  <body style="margin:0;padding:0;background:#f6f0e8;color:#1c1917;font-family:Helvetica,Arial,sans-serif;">
    <span style="display:none!important;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(previewText)}</span>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f6f0e8;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:620px;background:#ffffff;border:1px solid #eadfd1;border-radius:24px;overflow:hidden;">
            <tr>
              <td bgcolor="#f97316" style="padding:20px 32px;background:#f97316;background-image:linear-gradient(135deg,#ea580c 0%,#f97316 42%,#fb923c 100%);">
                <p style="margin:0;color:#fff7ed;font-size:11px;font-weight:800;letter-spacing:.2em;line-height:1.4;text-transform:uppercase;">${escapeHtml(BRAND)}</p>
                <p style="margin:8px 0 0;color:#fff7ed;font-size:13px;line-height:1.5;">Celebrating impact beyond recognition.</p>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:24px 32px 10px;background:#ffffff;">
                <img src="${escapeHtml(logo)}" width="280" alt="${escapeHtml(BRAND)}" style="display:block;width:280px;max-width:100%;height:auto;border:0;outline:none;text-decoration:none;">
              </td>
            </tr>
            <tr>
              <td style="padding:14px 40px 40px;">
                <p style="margin:0 0 14px;color:#ea580c;font-size:11px;font-weight:800;letter-spacing:.16em;line-height:1.4;text-transform:uppercase;">${escapeHtml(eyebrow)}</p>
                <h1 style="margin:0 0 20px;color:#171310;font-size:30px;line-height:1.15;letter-spacing:-.02em;">${escapeHtml(heading)}</h1>
                ${bodyHtml}
                ${ctaHtml}
                <hr style="margin:32px 0 20px;border:0;border-top:1px solid #eee4d8;">
                <p style="margin:0;color:#766f68;font-size:13px;line-height:1.6;">${escapeHtml(footerText)}</p>
                <p style="margin:18px 0 0;color:#a39a91;font-size:12px;line-height:1.5;">— The ${escapeHtml(BRAND)} team</p>
              </td>
            </tr>
          </table>
          <p style="margin:16px 0 0;color:#958b80;font-size:11px;line-height:1.5;">This is a transactional email from ${escapeHtml(BRAND)}.</p>
        </td>
      </tr>
    </table>
  </body>
</html>`
}
