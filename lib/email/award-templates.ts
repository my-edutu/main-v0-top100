// lib/email/award-templates.ts
// Pure, side-effect-free email builders for the four award milestones.
// Every function returns { subject, html, text } and touches nothing else —
// no env, no network, no clock — so they are directly testable.
//
// Everything interpolated here is member-supplied (recipient name, address
// lines) or third-party-supplied (waybill, tracking URL from the courier), so
// every value goes through escapeHtml before it reaches the HTML body.

import { formatNaira } from '@/lib/awards/money'

/** The four order statuses that are worth telling the member about. */
export type AwardMilestone = 'paid' | 'dispatched' | 'in_transit' | 'delivered'

export type AwardEmail = {
  subject: string
  html: string
  text: string
}

export type AwardEmailInput = {
  recipientName: string
  /** Integer kobo. Null when the order has no recorded total (never for `paid`). */
  totalAmountKobo: number | null
  /** Already-split delivery address, one entry per line. */
  addressLines: string[]
  waybill: string | null
  trackingUrl: string | null
  /** Display name of the courier handling the parcel. */
  courierName: string
}

const BRAND = 'Top100 Africa Future Leaders'

/**
 * HTML-escape a value for interpolation into element text or a quoted
 * attribute. Ampersand first, or the escapes below would be double-escaped.
 */
export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Only ever emit http(s) hrefs. A courier response is third-party data; a
 * `javascript:` URL arriving from it must not become a live link in an email.
 */
function safeUrl(url: string | null): string | null {
  if (!url) return null
  const trimmed = url.trim()
  return /^https?:\/\//i.test(trimmed) ? trimmed : null
}

/** Money never gets arithmetic here — formatNaira owns kobo -> naira. */
function money(kobo: number | null): string {
  if (typeof kobo !== 'number' || !Number.isInteger(kobo) || kobo < 0) return 'the award amount'
  return formatNaira(kobo)
}

function cleanName(name: string): string {
  const trimmed = (name ?? '').trim()
  return trimmed || 'Awardee'
}

function addressBlock(lines: string[]): string[] {
  return (lines ?? []).map((line) => (line ?? '').trim()).filter((line) => line.length > 0)
}

/** Shared cream/orange shell so all four emails look like one family. */
function layout(heading: string, bodyHtml: string): string {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#fffaf4;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fffaf4;padding:32px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #ffedd5;border-radius:24px;padding:32px;font-family:Helvetica,Arial,sans-serif;color:#1c1917;">
            <tr>
              <td>
                <p style="margin:0 0 20px;font-size:11px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#ea580c;">${escapeHtml(
                  BRAND,
                )}</p>
                <h1 style="margin:0 0 20px;font-size:22px;line-height:1.3;color:#1c1917;">${escapeHtml(heading)}</h1>
                ${bodyHtml}
                <p style="margin:28px 0 0;font-size:13px;color:rgba(0,0,0,0.55);">— The ${escapeHtml(BRAND)} team</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`
}

function paragraph(text: string): string {
  return `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:rgba(0,0,0,0.7);">${escapeHtml(text)}</p>`
}

function detailCard(rows: Array<[string, string]>): string {
  if (rows.length === 0) return ''
  const cells = rows
    .map(
      ([label, value]) =>
        `<tr><td style="padding:4px 12px 4px 0;font-size:12px;text-transform:uppercase;letter-spacing:0.12em;color:#ea580c;white-space:nowrap;">${escapeHtml(
          label,
        )}</td><td style="padding:4px 0;font-size:14px;color:#1c1917;">${escapeHtml(value)}</td></tr>`,
    )
    .join('')
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;background:#fffaf4;border:1px solid #ffedd5;border-radius:16px;padding:16px;margin:0 0 18px;">${cells}</table>`
}

function addressCard(lines: string[]): string {
  if (lines.length === 0) return ''
  const body = lines.map((line) => escapeHtml(line)).join('<br>')
  return `<div style="background:#fffaf4;border:1px solid #ffedd5;border-radius:16px;padding:16px;margin:0 0 18px;">
    <p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#ea580c;">Delivery address</p>
    <p style="margin:0;font-size:14px;line-height:1.6;color:#1c1917;">${body}</p>
  </div>`
}

function trackingButton(url: string | null): string {
  const safe = safeUrl(url)
  if (!safe) return ''
  return `<p style="margin:0 0 18px;"><a href="${escapeHtml(
    safe,
  )}" style="display:inline-block;background:#f97316;color:#fffaf0;text-decoration:none;font-size:14px;font-weight:600;padding:12px 24px;border-radius:999px;">Track your parcel</a></p>`
}

/** Plain-text alternative. Empty lines are collapsed so nothing looks broken. */
function textBody(heading: string, lines: Array<string | null>): string {
  return [heading, '', ...lines.filter((line): line is string => Boolean(line)), '', `— The ${BRAND} team`].join('\n')
}

export function paidEmail(input: AwardEmailInput): AwardEmail {
  const name = cleanName(input.recipientName)
  const address = addressBlock(input.addressLines)
  const amount = money(input.totalAmountKobo)

  const html = layout(
    'Payment confirmed',
    [
      paragraph(`Hi ${name},`),
      paragraph(`We have received your payment of ${amount}. Your award is now being prepared.`),
      detailCard([['Amount paid', amount]]),
      addressCard(address),
      paragraph(
        'What happens next: we pack and hand your award to our courier partner. As soon as it leaves us you will get an email with the waybill number and a tracking link.',
      ),
      paragraph('If any of the address details above are wrong, reply to this email straight away.'),
    ].join('\n'),
  )

  const text = textBody('Payment confirmed', [
    `Hi ${name},`,
    '',
    `We have received your payment of ${amount}. Your award is now being prepared.`,
    '',
    address.length ? 'Delivery address:' : null,
    ...address,
    '',
    'What happens next: we pack and hand your award to our courier partner. As soon as it leaves us you will get an email with the waybill number and a tracking link.',
    'If any of the address details above are wrong, reply to this email straight away.',
  ])

  return { subject: 'Payment confirmed — your award is being prepared', html, text }
}

export function dispatchedEmail(input: AwardEmailInput): AwardEmail {
  const name = cleanName(input.recipientName)
  const address = addressBlock(input.addressLines)
  const waybill = (input.waybill ?? '').trim()
  const courier = (input.courierName ?? '').trim() || 'our courier partner'
  const link = safeUrl(input.trackingUrl)

  const rows: Array<[string, string]> = [['Courier', courier]]
  if (waybill) rows.push(['Waybill', waybill])

  const html = layout(
    'Your award has been sent',
    [
      paragraph(`Hi ${name},`),
      paragraph(`Your award is on its way with ${courier}.`),
      detailCard(rows),
      trackingButton(link),
      addressCard(address),
      paragraph('Delivery times vary by destination. Keep the waybill number handy if you need to contact the courier.'),
    ].join('\n'),
  )

  const text = textBody('Your award has been sent', [
    `Hi ${name},`,
    '',
    `Your award is on its way with ${courier}.`,
    waybill ? `Waybill: ${waybill}` : null,
    link ? `Track it here: ${link}` : null,
    '',
    address.length ? 'Delivery address:' : null,
    ...address,
    '',
    'Delivery times vary by destination. Keep the waybill number handy if you need to contact the courier.',
  ])

  return { subject: 'Your award has been sent', html, text }
}

export function inTransitEmail(input: AwardEmailInput): AwardEmail {
  const name = cleanName(input.recipientName)
  const waybill = (input.waybill ?? '').trim()
  const link = safeUrl(input.trackingUrl)
  const courier = (input.courierName ?? '').trim() || 'our courier partner'

  const rows: Array<[string, string]> = []
  if (waybill) rows.push(['Waybill', waybill])
  rows.push(['Courier', courier])

  const html = layout(
    'Your award is on the way',
    [
      paragraph(`Hi ${name},`),
      paragraph('Your award is moving through the courier network and will reach you shortly.'),
      detailCard(rows),
      trackingButton(link),
    ].join('\n'),
  )

  const text = textBody('Your award is on the way', [
    `Hi ${name},`,
    '',
    'Your award is moving through the courier network and will reach you shortly.',
    waybill ? `Waybill: ${waybill}` : null,
    link ? `Track it here: ${link}` : null,
  ])

  return { subject: 'Your award is on the way', html, text }
}

export function deliveredEmail(input: AwardEmailInput): AwardEmail {
  const name = cleanName(input.recipientName)
  const waybill = (input.waybill ?? '').trim()

  const html = layout(
    'Your award has been delivered',
    [
      paragraph(`Hi ${name},`),
      paragraph('Your Africa Future Leaders award has been delivered. Congratulations once again.'),
      detailCard(waybill ? [['Waybill', waybill]] : []),
      paragraph(
        'We would love to see it — share a photo with us and tag Top100 Africa Future Leaders so we can celebrate with you.',
      ),
      paragraph('If it has not actually reached you, reply to this email and we will chase the courier.'),
    ].join('\n'),
  )

  const text = textBody('Your award has been delivered', [
    `Hi ${name},`,
    '',
    'Your Africa Future Leaders award has been delivered. Congratulations once again.',
    waybill ? `Waybill: ${waybill}` : null,
    '',
    'We would love to see it — share a photo with us and tag Top100 Africa Future Leaders so we can celebrate with you.',
    'If it has not actually reached you, reply to this email and we will chase the courier.',
  ])

  return { subject: 'Your award has been delivered', html, text }
}

const BUILDERS: Record<AwardMilestone, (input: AwardEmailInput) => AwardEmail> = {
  paid: paidEmail,
  dispatched: dispatchedEmail,
  in_transit: inTransitEmail,
  delivered: deliveredEmail,
}

/** Dispatch to the milestone's builder. */
export function buildAwardEmail(milestone: AwardMilestone, input: AwardEmailInput): AwardEmail {
  return BUILDERS[milestone](input)
}
