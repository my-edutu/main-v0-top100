import { brandEmail, dashboardUrl, escapeHtml } from '@/lib/email/brand'

type SendEmailOptions = {
  to: string
  subject: string
  html: string
  text: string
}

const RESEND_API_URL = 'https://api.resend.com/emails'

const getFromAddress = () => {
  const from = process.env.RESEND_FROM_EMAIL
  if (from && from.trim().length > 0) {
    return from.trim()
  }
  return 'Top100 AFL <no-reply@top100afl.com>'
}

export const sendEmail = async ({ to, subject, html, text }: SendEmailOptions) => {
  const apiKey = process.env.RESEND_API_KEY

  if (!apiKey) {
    console.warn('[email] RESEND_API_KEY is not configured. Outputting verification email to logs instead.')
    console.info('--- email preview start ---')
    console.info('To:', to)
    console.info('Subject:', subject)
    console.info('Text body:', text)
    console.info('HTML body:', html)
    console.info('--- email preview end ---')
    return
  }

  const response = await fetch(RESEND_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: getFromAddress(),
      to: [to],
      subject,
      html,
      text,
    }),
  })

  if (!response.ok) {
    const errorBody = await response.text().catch(() => 'empty response')
    console.error('[email] failed to deliver via Resend', errorBody)
    throw new Error(`Failed to send email: ${response.status}`)
  }
}

type SendVerificationEmailOptions = {
  email: string
  verificationUrl: string
  name?: string | null
}

export const sendVerificationEmail = async ({
  email,
  verificationUrl,
  name,
}: SendVerificationEmailOptions) => {
  const subject = 'Verify your email for Top100 Africa Future Leaders'
  const recipientName = name && name.trim().length > 0 ? name.trim() : 'there'
  const text = [
    `Hi ${recipientName},`,
    '',
    'Thanks for creating an account with Top100 Africa Future Leaders.',
    'To activate your account, please confirm your email address.',
    '',
    `Verify your email: ${verificationUrl}`,
    '',
    'If you did not create this account, you can ignore this message.',
    '',
    'Thanks,',
    'Top100 Africa Future Leaders Team',
  ].join('\n')

  const safeVerificationUrl = /^https?:\/\//i.test(verificationUrl.trim()) ? verificationUrl.trim() : ''
  const html = brandEmail({
    previewText: 'Confirm your email address to finish setting up your Top100 account.',
    eyebrow: 'Account security',
    heading: 'One last step: verify your email',
    bodyHtml: `
      <p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#514a43;">Hi ${escapeHtml(recipientName)},</p>
      <p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#514a43;">Welcome to Top100 Africa Future Leaders. Confirm your email address so we can keep your account secure and connected to the right awardee profile.</p>
      <p style="margin:0;font-size:14px;line-height:1.6;color:#766f68;word-break:break-all;">If the button does not work, copy and paste this link:<br/>${escapeHtml(safeVerificationUrl)}</p>`,
    cta: safeVerificationUrl ? { label: 'Verify my email', href: safeVerificationUrl } : undefined,
    footerText: 'If you did not create this account, you can safely ignore this email.',
  })

  await sendEmail({ to: email, subject, html, text })
}

type MemberEmailOptions = {
  email: string
  name?: string | null
}

const founderName = () => process.env.TOP100_FOUNDER_NAME?.trim() || 'Nwosu Paul Light'

export const sendWelcomeEmail = async ({ email, name }: MemberEmailOptions) => {
  const recipientName = name?.trim() || 'there'
  const founder = founderName()
  const subject = 'Welcome to Top100 Africa Future Leaders'
  const text = [
    `Hi ${recipientName},`,
    '',
    'Welcome to Top100 Africa Future Leaders. Your account is ready, and we are delighted to have you in the community.',
    '',
    `A message from ${founder}: Your recognition is not the finish line. It is an invitation to keep building, keep connecting, and help Africa's next chapter move forward. We are honoured to have you with us.`,
    '',
    'You can now sign in to your member hub, manage your profile, and follow your award journey.',
    '',
    'With appreciation,',
    `${founder} and the Top100 Africa Future Leaders team`,
  ].join('\n')

  const safeFounder = escapeHtml(founder)
  const html = brandEmail({
    previewText: 'Your Top100 account is ready. Welcome to the community.',
    eyebrow: 'Welcome to the community',
    heading: `Welcome, ${recipientName}.`,
    bodyHtml: `
      <p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#514a43;">Your account is ready, and we are delighted to welcome you into the Top100 community.</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0;background:#fff7ed;border:1px solid #fed7aa;border-radius:18px;">
        <tr><td style="padding:22px 22px 20px;">
          <p style="margin:0 0 10px;color:#ea580c;font-size:11px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;">A note from ${safeFounder}</p>
          <p style="margin:0;color:#3f352d;font-size:16px;line-height:1.65;">Your recognition is not the finish line. It is an invitation to keep building, keep connecting, and help Africa's next chapter move forward. We are honoured to have you with us.</p>
        </td></tr>
      </table>
      <p style="margin:0;font-size:15px;line-height:1.6;color:#514a43;">Sign in to your member hub to complete your profile, connect with the community, and follow your award journey.</p>`,
    cta: { label: 'Open my member hub', href: dashboardUrl() },
    footerText: `With appreciation, ${founder} and the Top100 Africa Future Leaders team.`,
  })

  await sendEmail({ to: email, subject, html, text })
}

export const sendLoginEmail = async ({ email, name }: MemberEmailOptions) => {
  const recipientName = name?.trim() || 'there'
  const subject = 'You signed in to Top100 Africa Future Leaders'
  const text = [
    `Hi ${recipientName},`,
    '',
    'This is a confirmation that your Top100 Africa Future Leaders account was just accessed.',
    'If this was you, no action is needed. If you do not recognise this sign-in, reset your password and contact the admin team.',
    '',
    'Top100 Africa Future Leaders Team',
  ].join('\n')
  const safeName = escapeHtml(recipientName)
  const html = brandEmail({
    previewText: 'Your Top100 Africa Future Leaders sign-in was successful.',
    eyebrow: 'Account security',
    heading: 'Good to see you again',
    bodyHtml: `
      <p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#514a43;">Hi ${safeName},</p>
      <p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#514a43;">You have successfully signed in to your Top100 Africa Future Leaders account.</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:22px 0;background:#f7f4ef;border:1px solid #e7ded2;border-radius:16px;">
        <tr><td style="padding:16px 18px;color:#514a43;font-size:14px;line-height:1.6;">If this was you, there is nothing else you need to do. If you do not recognise this activity, reset your password and contact the admin team.</td></tr>
      </table>`,
    cta: { label: 'Go to my dashboard', href: dashboardUrl() },
    footerText: 'For your security, never share your password or one-time codes with anyone.',
  })

  await sendEmail({ to: email, subject, html, text })
}
