// lib/email/award-templates.ts
// Pure, side-effect-free email builders for the four award milestones.
// Every function returns { subject, html, text } and performs no network or
// clock work, so the rendered output remains directly testable. The shared
// brand shell reads only presentation configuration such as the public logo URL.
//
// Everything interpolated here is member-supplied (recipient name, address
// lines) or third-party-supplied (waybill, tracking URL from the courier), so
// every value goes through escapeHtml before it reaches the HTML body.

import { formatNaira } from '@/lib/awards/money'
import { brandButton, brandEmail, escapeHtml } from '@/lib/email/brand'

export { escapeHtml } from '@/lib/email/brand'

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
  return brandButton('Track your parcel', safe)
}

/** Plain-text alternative. Empty lines are collapsed so nothing looks broken. */
function textBody(heading: string, lines: Array<string | null>): string {
  return [heading, '', ...lines.filter((line): line is string => Boolean(line)), '', `— The ${BRAND} team`].join('\n')
}

export function paidEmail(input: AwardEmailInput): AwardEmail {
  const name = cleanName(input.recipientName)
  const address = addressBlock(input.addressLines)
  const amount = money(input.totalAmountKobo)

  const html = brandEmail({
    previewText: 'Thank you for your payment. Your Top100 award is being prepared for delivery.',
    eyebrow: 'Award journey · Payment received',
    heading: 'Your award journey has begun',
    bodyHtml: [
      paragraph(`Hi ${name},`),
      paragraph(`Thank you for making your payment of ${amount}. Your award is now reserved, and our team is preparing it for dispatch.`),
      detailCard([['Amount paid', amount]]),
      addressCard(address),
      paragraph('What happens next: we will carefully pack your award and hand it to our courier partner. Once it leaves us, we will send your waybill number and tracking link.'),
      paragraph('If any delivery detail above is incorrect, reply to this email as soon as possible.'),
    ].join('\n'),
  })

  const text = textBody('Payment confirmed', [
    `Hi ${name},`,
    '',
    `Thank you for making your payment of ${amount}. Your award is now reserved, and our team is preparing it for dispatch.`,
    '',
    address.length ? 'Delivery address:' : null,
    ...address,
    '',
    'What happens next: we will carefully pack your award and hand it to our courier partner. Once it leaves us, we will send your waybill number and tracking link.',
    'If any delivery detail above is incorrect, reply to this email as soon as possible.',
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

  const html = brandEmail({
    previewText: `Your award is on its way with ${courier}.`,
    eyebrow: 'Award journey · Dispatched',
    heading: 'Your award is on its way',
    bodyHtml: [
      paragraph(`Hi ${name},`),
      paragraph(`Your Top100 award has left us and is now on its way with ${courier}.`),
      detailCard(rows),
      trackingButton(link),
      addressCard(address),
      paragraph('Delivery times vary by destination. Keep the waybill number handy if you need to contact the courier.'),
    ].join('\n'),
  })

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

  const html = brandEmail({
    previewText: 'Your award is moving through the courier network.',
    eyebrow: 'Award journey · In transit',
    heading: 'Your award is moving',
    bodyHtml: [
      paragraph(`Hi ${name},`),
      paragraph('Your award is moving through the courier network. It is making its way to you now, and we will keep you updated as it progresses.'),
      detailCard(rows),
      trackingButton(link),
    ].join('\n'),
  })

  const text = textBody('Your award is on the way', [
    `Hi ${name},`,
    '',
    'Your award is moving through the courier network. It is making its way to you now, and we will keep you updated as it progresses.',
    waybill ? `Waybill: ${waybill}` : null,
    link ? `Track it here: ${link}` : null,
  ])

  return { subject: 'Your award is on the way', html, text }
}

export function deliveredEmail(input: AwardEmailInput): AwardEmail {
  const name = cleanName(input.recipientName)
  const waybill = (input.waybill ?? '').trim()

  const html = brandEmail({
    previewText: 'Your Africa Future Leaders award has been delivered.',
    eyebrow: 'Award journey · Delivered',
    heading: 'Your award has arrived',
    bodyHtml: [
      paragraph(`Hi ${name},`),
      paragraph('Your Africa Future Leaders award has been delivered. Congratulations once again — this recognition belongs to the work, courage, and impact that brought you here.'),
      detailCard(waybill ? [['Waybill', waybill]] : []),
      paragraph(
        'We would love to see it — share a photo and tag Top100 Africa Future Leaders so we can celebrate your story with the community.',
      ),
      paragraph('If it has not actually reached you, reply to this email and we will follow up with the courier.'),
    ].join('\n'),
  })

  const text = textBody('Your award has been delivered', [
    `Hi ${name},`,
    '',
    'Your Africa Future Leaders award has been delivered. Congratulations once again — this recognition belongs to the work, courage, and impact that brought you here.',
    waybill ? `Waybill: ${waybill}` : null,
    '',
    'We would love to see it — share a photo and tag Top100 Africa Future Leaders so we can celebrate your story with the community.',
    'If it has not actually reached you, reply to this email and we will follow up with the courier.',
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
