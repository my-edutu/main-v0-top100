import { NextRequest } from 'next/server'
import { z } from 'zod'

import { createAdminClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email/brevo'
import { checkRateLimit, createRateLimitResponse, getClientIdentifier, RATE_LIMITS } from '@/lib/rate-limit'

const applicationSchema = z.object({
  applicationType: z.enum(['awardee', 'ambassador', 'partnership', 'volunteer']),
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('A valid email is required'),
  organization: z.string().optional().default(''),
  subject: z.string().min(1, 'Subject is required'),
  message: z.string().min(1, 'Message is required'),
  values: z.record(z.string()).optional().default({}),
})

const escapeHtml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')

const formatEmailHtml = (subject: string, message: string, values: Record<string, string>) => {
  const rows = Object.entries(values)
    .map(([key, value]) => `
      <tr>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.12em;">${escapeHtml(key)}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; font-size: 14px; color: #111827;">${escapeHtml(value || 'Not provided')}</td>
      </tr>
    `)
    .join('')

  return `
    <html>
      <body style="margin:0; padding:24px; background:#f8fafc; font-family: Arial, sans-serif; color:#111827;">
        <div style="max-width:720px; margin:0 auto; background:#ffffff; border:1px solid #e5e7eb; border-radius:24px; overflow:hidden;">
          <div style="padding:24px; background: linear-gradient(135deg, #f97316, #ea580c); color:#fff;">
            <p style="margin:0 0 8px 0; font-size:12px; letter-spacing:0.28em; text-transform:uppercase; opacity:0.9;">New application</p>
            <h1 style="margin:0; font-size:24px; line-height:1.2;">${escapeHtml(subject)}</h1>
          </div>
          <div style="padding:24px;">
            <p style="margin:0 0 18px 0; font-size:14px; line-height:1.8; color:#374151; white-space:pre-wrap;">${escapeHtml(message)}</p>
            <table style="width:100%; border-collapse:collapse; border:1px solid #e5e7eb; border-radius:16px; overflow:hidden;">
              <tbody>
                ${rows}
              </tbody>
            </table>
          </div>
        </div>
      </body>
    </html>
  `
}

export async function POST(req: NextRequest) {
  try {
    const identifier = getClientIdentifier(req.headers)
    const rateLimitResult = checkRateLimit({
      ...RATE_LIMITS.CONTACT,
      identifier: `application:${identifier}`,
    })

    if (!rateLimitResult.success) {
      return createRateLimitResponse(rateLimitResult, 'Too many submissions. Please try again later.')
    }

    const body = await req.json()
    const validated = applicationSchema.parse(body)

    const supabase = createAdminClient()

    const { data: saved, error: dbError } = await supabase
      .from('messages')
      .insert({
        name: validated.name,
        email: validated.email,
        subject: validated.subject,
        message: validated.message,
        type: validated.applicationType,
        status: 'unread',
        created_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (dbError) {
      console.error('[applications] Failed to save submission:', dbError)
      return Response.json({
        success: false,
        error: 'Failed to save application',
      }, { status: 500 })
    }

    const recipientEmail = process.env.APPLICATIONS_EMAIL || process.env.PARTNERSHIP_EMAIL || process.env.CONTACT_FORM_NOTIFICATION_EMAIL || 'partnership@top100afl.com'

    try {
      const emailSent = await sendEmail({
        to: recipientEmail,
        subject: `Top100 application received: ${validated.subject}`,
        html: formatEmailHtml(validated.subject, validated.message, validated.values),
      })

      if (!emailSent) {
        console.error('[applications] Admin email notification failed to send')
      }
    } catch (emailError) {
      console.error('[applications] Email notification error:', emailError)
    }

    return Response.json({
      success: true,
      message: 'Your application has been sent to the Top100 admin team.',
      data: saved,
    })
  } catch (error) {
    console.error('[applications] Error processing application:', error)

    if (error instanceof z.ZodError) {
      return Response.json({
        success: false,
        error: 'Invalid input data',
        details: error.errors,
      }, { status: 400 })
    }

    return Response.json({
      success: false,
      error: 'Internal server error',
    }, { status: 500 })
  }
}
