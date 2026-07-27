import { NextRequest } from 'next/server'
import { ZodError } from 'zod'

import { applicationSchema, validateHeadshot } from '@/lib/interviews/schema'
import { applicationAdminEmail, applicationApplicantEmail } from '@/lib/interviews/emails'
import { matchAwardee } from '@/lib/interviews/matching'
import { findRecentPendingApplication, getAwardeeCandidates } from '@/lib/interviews/queries'
import { sendEmail } from '@/lib/email/brevo'
import { createAdminClient } from '@/lib/supabase/server'
import {
  checkRateLimit,
  createRateLimitResponse,
  getClientIdentifier,
  RATE_LIMITS,
} from '@/lib/rate-limit'

const HEADSHOT_BUCKET = 'interview-applications'

async function verifyTurnstile(token: string | null): Promise<boolean> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY

  // Matches app/api/verify-captcha/route.ts: unconfigured is a no-op in dev.
  if (!secretKey) {
    return process.env.NODE_ENV === 'development'
  }

  if (!token) {
    return false
  }

  try {
    const body = new URLSearchParams()
    body.append('secret', secretKey)
    body.append('response', token)

    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body,
    })

    const data = (await response.json()) as { success?: boolean }
    return data.success === true
  } catch (error) {
    console.error('[interviews/apply] turnstile verification failed:', error)
    return false
  }
}

export async function POST(request: NextRequest) {
  const identifier = getClientIdentifier(request.headers)
  const rateLimit = checkRateLimit({
    ...RATE_LIMITS.UPLOAD,
    identifier: `interview-apply:${identifier}`,
  })

  if (!rateLimit.success) {
    return createRateLimitResponse(rateLimit, 'Too many submissions. Please try again later.')
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return Response.json(
      { success: false, message: 'We could not read your submission. Please try again.' },
      { status: 400 },
    )
  }

  const captchaOk = await verifyTurnstile((formData.get('captchaToken') as string) || null)
  if (!captchaOk) {
    return Response.json(
      { success: false, message: 'Please complete the verification challenge and try again.' },
      { status: 400 },
    )
  }

  const raw = Object.fromEntries(
    Array.from(formData.entries()).filter(([, value]) => typeof value === 'string'),
  )

  let input
  try {
    input = applicationSchema.parse(raw)
  } catch (error) {
    if (error instanceof ZodError) {
      const fieldErrors: Record<string, string> = {}
      for (const issue of error.issues) {
        const key = String(issue.path[0] ?? 'form')
        if (!fieldErrors[key]) {
          fieldErrors[key] = issue.message
        }
      }

      return Response.json(
        { success: false, message: 'Please check the highlighted fields.', fieldErrors },
        { status: 400 },
      )
    }

    throw error
  }

  const duplicate = await findRecentPendingApplication(input.email)
  if (duplicate) {
    return Response.json({
      success: true,
      duplicate: true,
      message: 'We already have an application from you and it is still under review.',
    })
  }

  const candidates = await getAwardeeCandidates(input.email, input.fullName)
  const match = matchAwardee(
    { email: input.email, fullName: input.fullName, cohortYear: input.cohortYear },
    candidates,
  )

  const supabase = createAdminClient()

  const { data: application, error: insertError } = await supabase
    .from('interview_applications')
    .insert({
      full_name: input.fullName,
      email: input.email,
      phone: input.phone || null,
      country: input.country,
      cohort_year: input.cohortYear,
      role_title: input.roleTitle || null,
      organisation: input.organisation || null,
      bio: input.bio,
      impact_story: input.impactStory,
      linkedin_url: input.linkedinUrl || null,
      other_link: input.otherLink || null,
      preferred_format: input.preferredFormat,
      matched_awardee_id: match.awardeeId,
      verification: match.verification,
      consent_recorded: input.consentRecorded,
      consent_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (insertError || !application) {
    console.error('[interviews/apply] insert failed:', insertError?.message)
    return Response.json(
      { success: false, message: 'We could not save your application. Please try again.' },
      { status: 500 },
    )
  }

  // The headshot is a nice-to-have. Losing the applicant because their photo
  // failed to upload would be a far worse outcome, so this never fails the request.
  let hasHeadshot = false
  const headshot = formData.get('headshot')
  if (headshot instanceof File && headshot.size > 0) {
    try {
      const buffer = new Uint8Array(await headshot.arrayBuffer())
      const check = validateHeadshot(buffer, headshot.size)

      if (check.ok) {
        // The client filename never reaches the storage path.
        const path = `${application.id}/headshot.${check.extension}`
        const { error: uploadError } = await supabase.storage
          .from(HEADSHOT_BUCKET)
          .upload(path, buffer, { contentType: check.mime, upsert: true })

        if (uploadError) {
          console.error('[interviews/apply] headshot upload failed:', uploadError.message)
        } else {
          hasHeadshot = true
          await supabase
            .from('interview_applications')
            .update({ headshot_path: path })
            .eq('id', application.id)
        }
      } else {
        console.warn('[interviews/apply] headshot rejected:', check.message)
      }
    } catch (error) {
      console.error('[interviews/apply] headshot processing threw:', error)
    }
  }

  const adminAddress = process.env.ADMIN_NOTIFICATION_EMAIL || process.env.BREVO_SENDER_EMAIL
  if (!adminAddress) {
    // The application is safely stored either way, but nobody gets told about
    // it. Say so plainly rather than dropping the notification in silence.
    console.error(
      '[interviews/apply] no ADMIN_NOTIFICATION_EMAIL or BREVO_SENDER_EMAIL set — admin notification skipped',
    )
  }

  const adminEmail = applicationAdminEmail({
    fullName: input.fullName,
    email: input.email,
    phone: input.phone,
    country: input.country,
    cohortYear: input.cohortYear,
    roleTitle: input.roleTitle,
    organisation: input.organisation,
    bio: input.bio,
    impactStory: input.impactStory,
    linkedinUrl: input.linkedinUrl,
    otherLink: input.otherLink,
    preferredFormat: input.preferredFormat,
    verification: match.verification,
    hasHeadshot,
  })

  const applicantEmail = applicationApplicantEmail(input.fullName)

  // Email delivery must not decide whether the application counts as received.
  await Promise.allSettled([
    adminAddress
      ? sendEmail({ to: adminAddress, subject: adminEmail.subject, html: adminEmail.html })
      : Promise.resolve(false),
    sendEmail({ to: input.email, subject: applicantEmail.subject, html: applicantEmail.html }),
  ])

  return Response.json({
    success: true,
    message: 'Your application is in. Check your inbox for a confirmation.',
  })
}
