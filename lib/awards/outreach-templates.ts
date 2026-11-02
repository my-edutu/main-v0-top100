import { escapeHtml } from '@/lib/email/award-templates'
import type { OutreachMember } from './outreach'

export const OUTREACH_TEMPLATES = { recovery: 'Payment help', awareness: 'Award introduction', follow_up: 'Helpful follow-up · day 4', final: 'Final check-in · day 8', verification: 'Verify an existing payment', paid: 'Paid member care' } as const
export type OutreachTemplate = keyof typeof OUTREACH_TEMPLATES
export type OutreachDraft = { subject: string; body: string }
const details = '\n\nThe physical award fee is {{fee}} and covers the physical award only. Delivery is charged separately. View Nigerian shipping quotes in your dashboard, or contact info@top100afl.com about collection and other destinations. Contact us for the current fulfillment timeline before ordering.\n\nYour recognition has already been awarded; buying the physical award is optional.'
export function defaultOutreachDraft(template: OutreachTemplate): OutreachDraft {
  switch (template) {
    case 'recovery': return { subject: 'Can we help with your physical award payment?', body: 'Hi {{name}},\n\nYou started an order for your physical Africa Future Leaders award, but payment has not been confirmed. Did you experience a payment problem, or is the price, delivery or timing holding you back?' + details + '\n\nContinue or check your status: {{action_link}}\n\nIf you already paid, please do not pay again. Reply so we can verify your payment.' }
    case 'verification': return { subject: 'Let us check your award payment', body: 'Hi {{name}},\n\nWe are checking the payment information on your award order. Please do not make another payment while we resolve this. If you have paid, reply with your transaction reference and payment date. Never send your password or card details.\n\nCheck your dashboard: {{action_link}}\n\nFor help, reply or contact info@top100afl.com.' }
    case 'paid': return { subject: 'Your physical award: next steps', body: 'Hi {{name}},\n\nYour physical award payment is confirmed. Thank you. View your dashboard for the current status and delivery options: {{action_link}}\n\nDelivery is arranged separately. Reply to discuss collection, delivery costs and the current fulfillment timeline with our team at info@top100afl.com.' }
    case 'follow_up': return { subject: 'Your physical award: details and support', body: 'Hi {{name}},\n\nFollowing up on our physical award message for the {{year}} cohort. What would you need clarified before deciding?' + details + '\n\nDetails and next steps: {{action_link}}\n\nAlready paid? Please do not pay again. Reply and we will verify it.' }
    case 'final': return { subject: 'Would you like help obtaining your physical award?', body: 'Hi {{name}},\n\nA final check-in about the optional physical award for the {{year}} cohort. If you are interested, you can see the details here: {{action_link}}. If another time would suit you better, reply and tell us when.' + details + '\n\nAlready paid? Do not pay again. Reply for verification. If you are not interested, let us know and we will stop these follow-ups.' }
    default: return { subject: '{{year}} Africa Future Leaders: your physical award', body: 'Hi {{name}},\n\nWe are contacting eligible members of the {{year}} Africa Future Leaders cohort about obtaining their physical award. You can see the award pictured below.' + details + '\n\nView your next steps: {{action_link}}\n\nIf you have not created your profile, use the claim page and your AFL invite code. If you need your code or help finding your record, reply or contact info@top100afl.com.' }
  }
}
export function templateEligible(member: OutreachMember, template: OutreachTemplate, now = Date.now()): boolean {
  if (member.suppressed || member.deliveryHeld || !member.emailable) return false
  if (member.lastContactedAt && Date.parse(member.lastContactedAt) > now - 3 * 86400000) return false
  if (template === 'paid') return member.state === 'paid'
  if (template === 'verification') return member.state === 'verification'
  if (member.state === 'paid' || member.state === 'verification') return false
  if (template === 'recovery') return member.state === 'recovery'
  if (template === 'awareness') return member.state === 'not_started'
  return true
}
export function validateOutreachDraft(draft: OutreachDraft) {
  if (!draft.subject.trim() || draft.subject.length > 160 || /[\r\n]/.test(draft.subject)) throw new Error('Enter a one-line subject of up to 160 characters.')
  if (!draft.body.trim() || draft.body.length > 6000) throw new Error('Enter a message of up to 6,000 characters.')
  for (const match of (draft.subject + draft.body).matchAll(/{{\s*([^{}]+)\s*}}/g)) {
    if (!['name', 'first_name', 'year', 'fee', 'action_link'].includes(match[1].trim())) throw new Error(`Unsupported merge variable: ${match[1]}`)
  }
  if ((draft.subject + draft.body).replace(/{{\s*(name|first_name|year|fee|action_link)\s*}}/g, '').match(/{{|}}/)) throw new Error('Check your merge variables.')
}
export function buildOutreachMessage(draft: OutreachDraft, input: { name: string; year: string; fee: string; actionUrl: string; stopUrl: string; imageUrl: string }) {
  validateOutreachDraft(draft)
  for (const url of [input.actionUrl, input.stopUrl, input.imageUrl]) if (!/^https?:\/\//i.test(url)) throw new Error('Invalid email URL.')
  const values: Record<string, string> = { name: input.name.replace(/[\r\n]+/g, ' '), first_name: input.name.trim().split(/\s+/)[0] || 'Awardee', year: input.year, fee: input.fee, action_link: input.actionUrl }
  const merge = (value: string) => value.replace(/{{\s*([^{}]+?)\s*}}/g, (_, key) => values[key])
  const subject = merge(draft.subject)
  const body = merge(draft.body)
  if (subject.length > 300 || /[\r\n]/.test(subject)) throw new Error('The personalized subject is invalid.')
  const text = `${body}\n\nTop100 Africa Future Leaders\nStop award outreach: ${input.stopUrl}`
  const paragraphs = body.split(/\n\s*\n/).map(p => `<p style="font-size:16px;line-height:1.7;margin:0 0 18px">${escapeHtml(p).replaceAll('\n', '<br>')}</p>`).join('')
  const html = `<!doctype html><html lang="en" dir="ltr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(subject)}</title></head><body style="margin:0;background:#f6f3ef;color:#211b18;font-family:Arial,sans-serif"><table role="presentation" width="100%"><tr><td align="center" style="padding:24px 12px"><table role="presentation" width="100%" style="max-width:600px;background:white;border:1px solid #e8dfd5;border-radius:16px"><tr><td style="padding:28px"><p style="font-size:12px;letter-spacing:2px;color:#95430d">TOP100 AFRICA FUTURE LEADERS</p><h1 style="font-size:24px;line-height:1.3">${escapeHtml(subject)}</h1><img src="${escapeHtml(input.imageUrl)}" width="300" alt="Physical Africa Future Leaders award" style="display:block;width:100%;max-width:300px;height:auto;margin:20px auto">${paragraphs}<p><a href="${escapeHtml(input.actionUrl)}" style="display:inline-block;padding:14px 22px;background:#ffbf47;border-radius:8px;color:#211b18;text-decoration:none">View your award details</a></p><p style="font-size:13px;line-height:1.6">Questions? <a href="mailto:info@top100afl.com">Contact the Top100 team</a>.</p><p style="font-size:12px"><a href="${escapeHtml(input.stopUrl)}">Stop award outreach</a></p></td></tr></table></td></tr></table></body></html>`
  return { subject, text, html }
}
