import { SITE_URL } from '@/lib/site'

const escapeHtml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')

type AdminEmailInput = {
  fullName: string
  email: string
  phone: string
  country: string
  cohortYear: number
  roleTitle: string
  organisation: string
  bio: string
  impactStory: string
  linkedinUrl: string
  otherLink: string
  preferredFormat: string
  verification: 'matched' | 'unmatched'
  hasHeadshot: boolean
}

const row = (label: string, value: string) => `
  <tr>
    <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.12em;white-space:nowrap;">${escapeHtml(label)}</td>
    <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;font-size:14px;color:#111827;">${escapeHtml(value || 'Not provided')}</td>
  </tr>
`

export function applicationAdminEmail(input: AdminEmailInput): { subject: string; html: string } {
  const badge =
    input.verification === 'matched'
      ? '<span style="background:#dcfce7;color:#166534;padding:4px 10px;border-radius:999px;font-size:12px;font-weight:700;">Matched to directory</span>'
      : '<span style="background:#fef3c7;color:#92400e;padding:4px 10px;border-radius:999px;font-size:12px;font-weight:700;">Needs verification</span>'

  return {
    subject: `Interview application — ${input.fullName} (${input.cohortYear})`,
    html: `
      <html><body style="margin:0;padding:24px;background:#f8fafc;font-family:Arial,sans-serif;color:#111827;">
        <div style="max-width:720px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:24px;overflow:hidden;">
          <div style="padding:24px;background:linear-gradient(135deg,#f97316,#ea580c);color:#fff;">
            <p style="margin:0 0 8px 0;font-size:12px;letter-spacing:0.28em;text-transform:uppercase;opacity:0.9;">Impact Interviews</p>
            <h1 style="margin:0;font-size:24px;line-height:1.2;">${escapeHtml(input.fullName)}</h1>
          </div>
          <div style="padding:24px;">
            <p style="margin:0 0 18px 0;">${badge}</p>
            <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden;">
              <tbody>
                ${row('Email', input.email)}
                ${row('Phone', input.phone)}
                ${row('Country', input.country)}
                ${row('Cohort', String(input.cohortYear))}
                ${row('Role', input.roleTitle)}
                ${row('Organisation', input.organisation)}
                ${row('Preferred format', input.preferredFormat)}
                ${row('LinkedIn', input.linkedinUrl)}
                ${row('Other link', input.otherLink)}
                ${row('Headshot', input.hasHeadshot ? 'Uploaded' : 'Not provided')}
                ${row('Bio', input.bio)}
                ${row('Story', input.impactStory)}
              </tbody>
            </table>
            <p style="margin:20px 0 0 0;">
              <a href="${SITE_URL}/admin/interviews"
                 style="display:inline-block;background:#f97316;color:#fff;text-decoration:none;padding:12px 22px;border-radius:999px;font-weight:700;font-size:14px;">
                Open the application queue
              </a>
            </p>
          </div>
        </div>
      </body></html>
    `,
  }
}

export function applicationApplicantEmail(fullName: string): { subject: string; html: string } {
  const firstName = fullName.trim().split(/\s+/)[0] || 'there'

  return {
    subject: 'We received your Impact Interviews application',
    html: `
      <html><body style="margin:0;padding:24px;background:#f8fafc;font-family:Arial,sans-serif;color:#111827;">
        <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:24px;overflow:hidden;">
          <div style="padding:24px;background:linear-gradient(135deg,#f97316,#ea580c);color:#fff;">
            <p style="margin:0 0 8px 0;font-size:12px;letter-spacing:0.28em;text-transform:uppercase;opacity:0.9;">Impact Interviews</p>
            <h1 style="margin:0;font-size:24px;line-height:1.2;">Thanks, ${escapeHtml(firstName)}</h1>
          </div>
          <div style="padding:24px;font-size:15px;line-height:1.8;color:#374151;">
            <p style="margin:0 0 16px 0;">Your application to be featured in Impact Interviews is in. Here is what happens next:</p>
            <ol style="margin:0 0 16px 0;padding-left:20px;">
              <li>Our team reviews applications in batches, roughly every two weeks.</li>
              <li>If your story is a fit, we email you to agree a recording slot.</li>
              <li>Interviews run about 30 minutes and are recorded remotely.</li>
            </ol>
            <p style="margin:0 0 16px 0;">You do not need to do anything else for now. If your circumstances change, reply to this email and let us know.</p>
            <p style="margin:0;">— Top100 Africa Future Leaders</p>
          </div>
        </div>
      </body></html>
    `,
  }
}
