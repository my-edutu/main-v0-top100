const TEST_ADDRESS_MARKER = /(?:^|[+._-])(test|smoke|qa|staging|launch)(?:[+._-]|$)/i

function isoDate(value: Date) {
  return value.toISOString().slice(0, 10)
}

export function isClearlyTestEmail(value: string): boolean {
  const email = value.trim().toLowerCase()
  const match = /^([^@\s]+)@([^@\s]+)$/.exec(email)
  if (!match) return false

  const [, localPart, domain] = match
  return TEST_ADDRESS_MARKER.test(localPart) || domain === 'example.com'
}

export function buildLaunchSmokeFixtures(
  rawEmail: string,
  now: Date = new Date(),
) {
  const email = rawEmail.trim().toLowerCase()
  if (!isClearlyTestEmail(email)) {
    throw new Error('LAUNCH_SMOKE_EMAIL must be a clearly labelled test address.')
  }

  const fixtureDate = isoDate(now)
  const deadline = new Date(now)
  deadline.setUTCDate(deadline.getUTCDate() + 30)

  return {
    fixtureDate,
    invite: {
      email,
      label: `[Launch Smoke] ${fixtureDate} awardee invite`,
      usesLeft: 1,
      expiresInDays: 2,
    },
    opportunity: {
      title: '[Launch Smoke] Leadership Impact Fellowship',
      slug: `launch-smoke-leadership-impact-fellowship-${fixtureDate.replaceAll('-', '')}`,
      type: 'Fellowship',
      organization: 'Top100 Africa Future Leaders',
      location: 'Remote',
      summary: 'A labelled test listing for the controlled launch verification journey.',
      description: 'Use this listing only to verify the member opportunity experience before launch.',
      application_url: 'https://example.com/top100-afl-launch-smoke',
      contact_email: null,
      deadline: isoDate(deadline),
      amount_note: null,
      visibility: 'members' as const,
      is_featured: false,
      status: 'published' as const,
    },
    notification: {
      title: 'Welcome to the launch check',
      body: 'Your member dashboard is ready. Open the test opportunity to continue verification.',
      category: 'launch-smoke',
      cta_label: 'View opportunity',
      cta_url: '/dashboard/discover/opportunities',
    },
  }
}
