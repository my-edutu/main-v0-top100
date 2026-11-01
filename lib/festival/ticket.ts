import path from 'node:path'
import sharp from 'sharp'
import { SITE_URL } from '@/lib/site'
import { FESTIVAL_DATE, FESTIVAL_IMAGE, FESTIVAL_TIME, FESTIVAL_VENUE } from './config'

export type FestivalTicketDetails = { id: string; fullName: string; pickupRequested: boolean }
const escape = (value: string) => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[char]!)

export function festivalAwardArrangement(pickupRequested: boolean) {
  return pickupRequested
    ? 'Your award and certificate will be prepared for festival collection. The team will confirm pickup arrangements.'
    : 'Your award and certificate will be dispatched once your delivery address and delivery arrangements are confirmed. Delivery charges are separate.'
}

export function buildFestivalTicketEmail(ticket: FestivalTicketDetails) {
  const subject = 'Your Africa Future Leaders Festival 2026 ticket'
  const url = `${SITE_URL}/dashboard/festival`
  const arrangement = festivalAwardArrangement(ticket.pickupRequested)
  const text = `Hi ${ticket.fullName},\n\nYour festival registration is confirmed. Your personal ticket is attached.\n\nAfrica Future Leaders Festival 2026\n${FESTIVAL_DATE}\n${FESTIVAL_VENUE}\n${FESTIVAL_TIME}\n\nTicket reference: ${ticket.id}\n\n${arrangement}\n\nBring your ticket and photo ID. Admission requires your award payment to remain confirmed. This ticket is personal and cannot be transferred.\n\nDownload your ticket again: ${url}\n\nTop100 Africa Future Leaders\nCentral business district, Abuja, Nigeria`
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${subject}</title></head><body style="margin:0;background:#f5f5f4;color:#171717;font-family:Arial,Helvetica,sans-serif"><div style="display:none;max-height:0;overflow:hidden">Your personal festival ticket for ${FESTIVAL_DATE}, ${FESTIVAL_VENUE}, is attached.</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:32px 16px"><table role="presentation" width="600" cellspacing="0" cellpadding="0" style="width:100%;max-width:600px;background:#ffffff;border:1px solid #e5e5e5;border-radius:16px;overflow:hidden"><tr><td style="padding:24px 32px;background:#ffdf45;font-size:15px;font-weight:bold">Top100 Africa Future Leaders</td></tr><tr><td style="padding:32px"><h1 style="margin:0 0 20px;font-size:28px;line-height:1.2;font-weight:600">Your festival ticket is ready</h1><p style="margin:0 0 24px;font-size:16px;line-height:1.6">Hi ${escape(ticket.fullName)},<br>Your registration is confirmed. Save the attached ticket and join fellow awardees to celebrate your impact.</p><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-top:1px solid #e5e5e5;border-bottom:1px solid #e5e5e5"><tr><td style="padding:20px 0;font-size:16px;line-height:1.8"><strong>Africa Future Leaders Festival 2026</strong><br>${FESTIVAL_DATE}<br>${FESTIVAL_VENUE}<br><span style="color:#626262">${FESTIVAL_TIME}</span></td></tr></table><p style="margin:24px 0;font-size:14px;line-height:1.6">Ticket reference<br><strong style="overflow-wrap:anywhere">${escape(ticket.id)}</strong></p><p style="margin:0 0 24px;font-size:15px;line-height:1.6">${escape(arrangement)}</p><table role="presentation" cellspacing="0" cellpadding="0" width="100%"><tr><td align="center" style="padding:16px 20px;background:#ffdf45;border-radius:10px"><a href="${escape(url)}" style="color:#171717;font-size:16px;font-weight:bold;text-decoration:none">View your ticket</a></td></tr></table><p style="margin:24px 0 0;font-size:13px;color:#626262;line-height:1.6">Bring your ticket and photo ID. Admission requires your award payment to remain confirmed. Your ticket is personal and cannot be transferred.</p></td></tr><tr><td style="padding:24px 32px;background:#f5f5f4;color:#626262;font-size:12px;line-height:1.6">Africa Future Leaders<br>Central business district, Abuja, Nigeria</td></tr></table></td></tr></table></body></html>`
  return { subject, html, text }
}

/** Self-contained image attachment: no remote images, public PII URLs, or browser runtime. */
export async function renderFestivalTicket(ticket: FestivalTicketDetails) {
  const fontfile = path.join(process.cwd(), 'public/portfolio-cover/fonts/NotoSans-Bold.ttf')
  const rasterText = async (markup: string, maxHeight: number) => {
    const rendered = await sharp({ text: {
      text: markup, font: 'Noto Sans Bold 24', fontfile,
      rgba: true, width: 952, wrap: 'word-char', dpi: 72, spacing: 8,
    } }).png().toBuffer()
    return sharp(rendered).resize({ width: 952, height: maxHeight, fit: 'inside', withoutEnlargement: true }).toBuffer()
  }
  const span = (value: string, size: number, color = '#171717') =>
    `<span font_desc="Noto Sans Bold ${size}" foreground="${color}">${escape(value)}</span>`
  const name = ticket.fullName.normalize('NFC').trim()
  const arrangement = ticket.pickupRequested ? 'Award + certificate: festival collection requested.'
    : 'Award + certificate: dispatch after delivery is arranged.'
  // Rasterize two complete text blocks so one ticket does not start dozens of
  // font render jobs. The shipped font handles names on minimal server images.
  // Initialize the font once before scheduling the remaining native image work.
  // Concurrent cold font initializations contend on Fontconfig's shared cache.
  const header = await rasterText(`${span('Top100 Africa Future Leaders', 32)}\n${span(ticket.id.startsWith('PREVIEW-') ? 'LOCAL PREVIEW · NOT VALID FOR ADMISSION' : 'PERSONAL ADMISSION · 2026', 19)}`, 112)
  const [body, stage] = await Promise.all([
    rasterText([
      span('Africa Future Leaders\nFestival 2026', 46), '',
      span('AWARDEE', 17, '#626262'), span(name, 36), '',
      span(FESTIVAL_DATE, 30), span(FESTIVAL_VENUE, 30), span(FESTIVAL_TIME, 20, '#626262'), '',
      span('TICKET REFERENCE', 17, '#626262'), span(ticket.id, 23), '',
      span(arrangement, 20), '',
      span('Bring your ticket and photo ID.\nConfirmed award payment required. Personal and non-transferable.', 18, '#626262'),
    ].join('\n'), 850),
    sharp(path.join(process.cwd(), 'public', FESTIVAL_IMAGE)).resize(1080, 310, { fit: 'cover', position: 'centre' }).png().toBuffer(),
  ])
  const paper = Buffer.from('<svg width="1080" height="1440" xmlns="http://www.w3.org/2000/svg"><rect width="1080" height="1440" fill="#ffffff"/><rect width="1080" height="170" fill="#ffdf45"/><rect y="1400" width="1080" height="40" fill="#ffdf45"/></svg>')
  return sharp(paper).composite([
    { input: header, left: 64, top: 38 },
    { input: stage, left: 0, top: 170 },
    { input: body, left: 64, top: 518 },
  ]).png().toBuffer()
}
