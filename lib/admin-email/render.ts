import { escapeHtml } from '@/lib/email/award-templates'
import { validateOutreachDraft, type OutreachDraft } from '@/lib/awards/outreach-templates'
export type GeneralEmailInput = { name: string; year: string; fee: string; actionUrl: string; stopUrl: string; imageUrl: string }
export function renderGeneralEmail(draft: OutreachDraft, input: GeneralEmailInput): { subject: string; text: string; html: string } {
  validateOutreachDraft(draft)
  for (const url of [input.actionUrl, input.stopUrl]) if (!/^https?:\/\//i.test(url)) throw new Error('Invalid email URL.')
  const values: Record<string, string> = { name: input.name.replace(/[\r\n]+/g, ' '), first_name: input.name.trim().split(/\s+/)[0] || 'Awardee', year: input.year, fee: input.fee, action_link: input.actionUrl }
  const merge = (value: string) => value.replace(/{{\s*([^{}]+?)\s*}}/g, (_, key) => values[key])
  const subject = merge(draft.subject), body = merge(draft.body)
  if (subject.length > 300 || /[\r\n]/.test(subject)) throw new Error('The personalised subject is invalid.')
  const action = escapeHtml(input.actionUrl)
  const paragraphs = body.split(/\n\s*\n/).map(p => `<p style="font-size:16px;line-height:1.65;margin:0 0 18px">${escapeHtml(p).replaceAll('\n', '<br>').replaceAll(action, `<a href="${action}">${action}</a>`)}</p>`).join('')
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(subject)}</title></head><body style="margin:0;background:#f6f3ef;color:#211b18;font-family:Arial,sans-serif"><table role="presentation" width="100%"><tr><td align="center" style="padding:24px 12px"><table role="presentation" width="100%" style="max-width:600px;background:#fff;border:1px solid #e8dfd5;border-top:4px solid #ffbf47;border-radius:14px"><tr><td style="padding:28px"><img src="https://top100afl.com/Top100%20Africa%20Future%20leaders%20Logo%20.png" width="186" alt="Top100 Africa Future Leaders" style="display:block;width:186px;max-width:100%;height:auto;margin:0 0 30px">${paragraphs}</td></tr></table><p style="max-width:600px;text-align:left;font-size:13px;line-height:1.6;color:#6b5b50">Top100 Africa Future Leaders<br><a href="${escapeHtml(input.stopUrl)}">Unsubscribe from these emails</a></p></td></tr></table></body></html>`
  return { subject, html, text: `${body}\n\nTop100 Africa Future Leaders\nUnsubscribe: ${input.stopUrl}` }
}
