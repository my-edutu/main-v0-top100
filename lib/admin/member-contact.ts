export const MEMBER_CONTACT_TEMPLATES = {
  welcome: 'Welcome to Top100 Africa Future Leaders',
  reminder: 'A reminder to complete your Top100 profile',
} as const
export type MemberContactTemplate = keyof typeof MEMBER_CONTACT_TEMPLATES
export function memberContactMessage(input: { template: MemberContactTemplate; name: string; code?: string; origin: string }) {
  const name = input.name.replace(/[\r\n]/g, ' ').trim() || 'Awardee'
  const url = new URL(input.code ? '/signup' : '/dashboard', input.origin).toString()
  const subject = MEMBER_CONTACT_TEMPLATES[input.template]
  const intro = input.template === 'welcome'
    ? 'Welcome to Top100 Africa Future Leaders! We are pleased to have you in our community.'
    : 'This is a friendly reminder to complete your Top100 Africa Future Leaders profile so the community can get to know you.'
  const next = input.code
    ? `Activate your profile: ${url}\nFind and select your name, then sign up with this email address and your invite code: ${input.code}\nThis code is for your email only and expires in 7 days. If you already have an account, sign in first.`
    : `Sign in and update your biography, photo and profile details: ${url}\nAlready completed your profile? Thank you—you can disregard this reminder.`
  const text = `Hello ${name},\n\n${intro}\n\n${next}\n\nNeed help? Contact info@top100afl.com.\n\nTop100 Africa Future Leaders`
  const esc = (v: string) => v.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(subject)}</title></head><body style="font-family:Arial,sans-serif;color:#211b18;background:#faf8f5;padding:24px"><div style="max-width:600px;margin:auto;background:white;padding:28px"><h1 style="font-size:24px">${esc(subject)}</h1>${text.split('\n\n').map(p => `<p style="font-size:16px;line-height:1.7">${esc(p).replaceAll('\n', '<br>')}</p>`).join('')}<a href="${esc(url)}" style="display:inline-block;padding:14px 22px;background:#ffbf47;color:#211b18">${input.code ? 'Activate your profile' : 'Update your profile'}</a></div></body></html>`
  return { subject, text, html }
}
