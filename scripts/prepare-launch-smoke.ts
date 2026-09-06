import { loadEnvConfig } from '@next/env'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { generateCode } from '../lib/access-codes'
import { buildLaunchSmokeFixtures } from '../lib/launch-smoke/fixtures'
import { createAdminClient } from '../lib/supabase/server'

loadEnvConfig(process.cwd())

const outputDirectory = path.join(process.cwd(), '.launch-smoke')
const outputPath = path.join(outputDirectory, 'credentials.json')

function readPhase() {
  const phaseArg = process.argv.find((arg) => arg.startsWith('--phase='))
  const phase = phaseArg?.split('=')[1] ?? 'prepare'
  if (phase !== 'prepare' && phase !== 'finalize') {
    throw new Error('Use --phase=prepare or --phase=finalize.')
  }
  return phase
}

function requireSafeSupabaseEnvironment() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (!url || !serviceRoleKey) {
    throw new Error('Supabase URL and service-role configuration are required for --apply.')
  }

  const parsed = new URL(url)
  if (parsed.protocol !== 'https:' || !parsed.hostname.endsWith('.supabase.co')) {
    throw new Error('Fixture writes require an HTTPS Supabase project URL.')
  }
}

async function persistOutput(value: Record<string, unknown>) {
  await mkdir(outputDirectory, { recursive: true })
  await writeFile(outputPath, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 })
}

async function prepare() {
  const email = process.env.LAUNCH_SMOKE_EMAIL ?? ''
  const fixtures = buildLaunchSmokeFixtures(email)
  const apply = process.argv.includes('--apply')

  if (!apply) {
    console.log('Dry run ready: one labelled invite and one labelled member opportunity.')
    console.log('No database records were written. Add --apply only after the test address is approved.')
    return
  }

  requireSafeSupabaseEnvironment()
  const supabase = createAdminClient()
  const { data: opportunity, error: opportunityError } = await supabase
    .from('opportunities')
    .upsert(fixtures.opportunity, { onConflict: 'slug' })
    .select('id, slug')
    .single()
  if (opportunityError || !opportunity) {
    throw new Error(`Could not prepare the launch opportunity: ${opportunityError?.message ?? 'unknown error'}`)
  }

  const { data: existingInvite, error: inviteLookupError } = await supabase
    .from('access_codes')
    .select('*')
    .eq('email', fixtures.invite.email)
    .eq('label', fixtures.invite.label)
    .eq('status', 'active')
    .gt('uses_left', 0)
    .maybeSingle()
  if (inviteLookupError) {
    throw new Error(`Could not inspect launch invites: ${inviteLookupError.message}`)
  }

  const invite = existingInvite ?? (await generateCode(fixtures.invite))
  await persistOutput({
    fixtureDate: fixtures.fixtureDate,
    email: fixtures.invite.email,
    accessCodeId: invite.id,
    accessCode: invite.code,
    opportunityId: opportunity.id,
    opportunitySlug: opportunity.slug,
  })

  console.log(`Launch fixtures prepared. The invite credential is stored locally at ${outputPath}.`)
}

async function finalize() {
  const email = process.env.LAUNCH_SMOKE_EMAIL ?? ''
  const fixtures = buildLaunchSmokeFixtures(email)
  const apply = process.argv.includes('--apply')

  if (!apply) {
    console.log('Dry run ready: one labelled welcome notification for the approved test member.')
    console.log('No database records were written. Add --apply after the member has signed up.')
    return
  }

  requireSafeSupabaseEnvironment()
  const supabase = createAdminClient()
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', fixtures.invite.email)
    .maybeSingle()
  if (profileError || !profile) {
    throw new Error('The launch-smoke member profile does not exist yet. Complete signup first.')
  }

  const { data: existing, error: existingError } = await supabase
    .from('user_notifications')
    .select('id')
    .eq('user_id', profile.id)
    .eq('category', fixtures.notification.category)
    .maybeSingle()
  if (existingError) throw new Error(`Could not inspect notifications: ${existingError.message}`)

  let notificationId = existing?.id
  if (!notificationId) {
    const { data: notification, error: notificationError } = await supabase
      .from('user_notifications')
      .insert({
        ...fixtures.notification,
        user_id: profile.id,
        metadata: { launch_smoke: true, fixture_date: fixtures.fixtureDate },
      })
      .select('id')
      .single()
    if (notificationError || !notification) {
      throw new Error(`Could not create the welcome notification: ${notificationError?.message ?? 'unknown error'}`)
    }
    notificationId = notification.id
  }

  let previous: Record<string, unknown> = {}
  try {
    previous = JSON.parse(await readFile(outputPath, 'utf8')) as Record<string, unknown>
  } catch {
    // Preparing and finalizing can be run independently.
  }
  await persistOutput({ ...previous, profileId: profile.id, notificationId })
  console.log(`Launch notification prepared. Record identifiers are stored at ${outputPath}.`)
}

async function main() {
  if (readPhase() === 'prepare') await prepare()
  else await finalize()
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Launch fixture preparation failed.')
  process.exitCode = 1
})
