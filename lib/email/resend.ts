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

  const html = `
    <div style="font-family: Arial, Helvetica, sans-serif; line-height: 1.6; color: #111827;">
      <p>Hi ${recipientName},</p>
      <p>Thanks for creating an account with Top100 Africa Future Leaders. To keep the community secure we need to confirm your email address.</p>
      <p>
        <a href="${verificationUrl}" style="display: inline-block; padding: 12px 20px; background: #f97316; color: #ffffff; text-decoration: none; border-radius: 6px;">
          Verify email address
        </a>
      </p>
      <p>If the button does not work, copy and paste this link into your browser:</p>
      <p style="word-break: break-all;"><a href="${verificationUrl}">${verificationUrl}</a></p>
      <p style="margin-top: 24px;">If you did not request this, you can safely ignore this email.</p>
      <p>Thanks,<br/>Top100 Africa Future Leaders Team</p>
    </div>
  `

  await sendEmail({ to: email, subject, html, text })
}

