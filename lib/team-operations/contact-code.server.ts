import { createHmac } from 'node:crypto'

/** Purpose- and recipient-bound proof; plaintext codes are never stored. */
export function contactCodeDigest(token: string, userId: string, challengeId: string, code: string) {
  const dedicated = process.env.CONTACT_CONFIRMATION_SECRET?.trim()
  const raw = dedicated || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (!raw || raw.length < 32) throw new Error('Contact confirmation signing is unavailable.')
  return createHmac('sha256', `top100-contact-confirmation-v1:${raw}`)
    .update(`${token}:${userId}:${challengeId}:${code}`).digest('hex')
}

export function maskContactEmail(email: string) {
  const [local, domain] = email.split('@')
  if (!local || !domain) return 'your recorded email address'
  return `${local.slice(0, 1)}•••@${domain.slice(0, 1)}•••${domain.includes('.') ? domain.slice(domain.lastIndexOf('.')) : ''}`
}

export function contactCodeMessage(code: string, repName: string, channel: string) {
  const contactChannel = channel === 'call' ? 'phone' : 'WhatsApp'
  const purpose = `Use this code on top100afl.com to submit your own answer about whether ${repName} contacted you by ${contactChannel}.`
  const text = `Top100 contact confirmation\n\n${purpose}\n\n${code}\n\nThis code expires in 10 minutes. Never share it with a rep. If you did not request it, ignore this email. You can continue to your award without confirming contact.`
  const escape = (value: string) => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!)
  return {
    subject: 'Your Top100 contact confirmation code', text,
    html: `<!doctype html><html lang="en"><body style="margin:0;background:#f7f5f0;font-family:Arial,sans-serif;color:#201e19"><table role="presentation" width="100%"><tr><td style="padding:32px 16px"><table role="presentation" style="max-width:520px;margin:auto;background:white;border:1px solid #e7e1d6;border-radius:12px"><tr><td style="padding:28px;font-size:16px;line-height:1.6"><p style="color:#875410;font-size:13px">Top100 Africa Future Leaders</p><h1 style="font-size:24px;font-weight:500">Confirm your contact response</h1><p>${escape(purpose)}</p><p style="font:32px monospace;letter-spacing:6px;background:#fff5d6;padding:16px;text-align:center">${escape(code)}</p><p>This code expires in 10 minutes. Never share it with a rep.</p><p style="color:#625b52;font-size:14px">If you did not request it, ignore this email. You can continue to your award without confirming contact.</p></td></tr></table></td></tr></table></body></html>`,
  }
}
