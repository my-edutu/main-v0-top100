import { beforeEach, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({ payload: null as Record<string, unknown> | null, rpc: vi.fn(), prefs: {} as Record<string, unknown> }))
vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: () => ({
    rpc: state.rpc,
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { notification_prefs: state.prefs }, error: null }) }) }),
    }),
  }),
}))

import { getAwardeeJourneyForMember, saveAwardeeJourneyProgress } from '@/lib/dashboard/awardee-journey-server'

beforeEach(() => {
  state.payload = {
    profile: {
      full_name: 'Ama Mensah',
      headline: 'Founder and community builder',
      bio: 'I build opportunities for young people across Ghana.',
      location: 'Accra, Ghana',
      organization: 'Open Path',
      field: 'Education',
      avatar_url: 'https://media.example/ama.webp',
    },
    progress: { welcome_read_at: '2026-09-23T10:00:00.000Z', external_share_confirmed_at: null, external_share_platform: null },
    handbook_eligible: false,
    settings: null,
    campaign: null,
    has_published_intro_post: true,
    magazine_order: { status: 'paid' },
    application: { status: 'pending' },
    award_order: { award_payment_status: 'paid', status: 'paid' },
  }
  state.prefs = {}
  state.rpc.mockImplementation(async (functionName: string) => functionName === 'get_awardee_journey_data'
    ? { data: state.payload, error: null }
    : { data: null, error: null })
})

it('loads member journey and persisted WhatsApp completion with database RPCs', async () => {
  const journey = await getAwardeeJourneyForMember('member-1')

  expect(state.rpc).toHaveBeenCalledWith('get_awardee_journey_data', { p_profile_id: 'member-1' })
  expect(state.rpc).toHaveBeenCalledWith('get_awardee_whatsapp_channel_joined_at', { p_profile_id: 'member-1' })
  expect(state.rpc).toHaveBeenCalledWith('get_awardee_journey_manual_progress', { p_profile_id: 'member-1' })
  expect(state.rpc).toHaveBeenCalledTimes(3)
  expect(journey.state.progress).toEqual({ completed: 3, total: 4, percent: 75 })
  expect(journey.state.recommendedActions.find(action => action.id === 'magazine')?.status).toBe('Application submitted')
  expect(journey.state.recommendedActions.find(action => action.id === 'award')?.status).toBe('Award fee paid')
  expect(journey.handbook.eligible).toBe(true)
  expect(journey.state.coreSteps.some(step => step.id === 'handbook')).toBe(true)
})

it('loads separately persisted member confirmations for an existing intro and home-screen install', async () => {
  state.rpc.mockImplementation(async (functionName: string) => {
    if (functionName === 'get_awardee_journey_data') return { data: state.payload, error: null }
    if (functionName === 'get_awardee_journey_manual_progress') return { data: {
      intro_published_confirmed_at: '2026-10-09T10:00:00.000Z',
      home_screen_added_at: '2026-10-09T10:05:00.000Z',
    }, error: null }
    return { data: null, error: null }
  })

  const journey = await getAwardeeJourneyForMember('member-1')

  expect(journey.introPublishedConfirmedAt).toBe('2026-10-09T10:00:00.000Z')
  expect(journey.homeScreenAddedAt).toBe('2026-10-09T10:05:00.000Z')
  expect(journey.state.coreSteps.find(step => step.id === 'introduction')?.complete).toBe(true)
})

it('keeps the journey readable and restores confirmations from existing profile preferences before migration', async () => {
  state.prefs = {
    homeScreenAddedAt: '2026-10-09T10:05:00.000Z',
    introPublishedConfirmedAt: '2026-10-09T10:00:00.000Z',
  }
  state.rpc.mockImplementation(async (functionName: string) => {
    if (functionName === 'get_awardee_journey_data') return { data: state.payload, error: null }
    if (functionName === 'get_awardee_journey_manual_progress') {
      return { data: null, error: { code: 'PGRST202', message: 'Could not find the function' } }
    }
    return { data: null, error: null }
  })

  const journey = await getAwardeeJourneyForMember('member-1')

  expect(journey.homeScreenAddedAt).toBe('2026-10-09T10:05:00.000Z')
  expect(journey.introPublishedConfirmedAt).toBe('2026-10-09T10:00:00.000Z')
  expect(journey.state.coreSteps.find(step => step.id === 'introduction')?.complete).toBe(true)
})

it('persists explicit member confirmations through the dedicated progress RPC', async () => {
  await saveAwardeeJourneyProgress('member-1', { homeScreenAdded: true, introPublished: true })

  expect(state.rpc).toHaveBeenCalledWith('mark_awardee_journey_tasks', {
    p_profile_id: 'member-1',
    p_home_screen_added: true,
    p_intro_published: true,
  })
})

it('saves share confirmation using the five-argument progress RPC when handbook fields are not touched', async () => {
  await saveAwardeeJourneyProgress('member-1', { externalShareConfirmed: true, externalSharePlatform: 'other' })

  expect(state.rpc).toHaveBeenCalledWith('save_awardee_onboarding_progress', {
    p_profile_id: 'member-1',
    p_welcome_read: false,
    p_external_share_confirmed: true,
    p_external_share_platform: 'other',
    p_top100_moment_complete: false,
  })
})

it('saves confirmations through the existing preferences RPC while the progress migration is pending', async () => {
  state.rpc.mockImplementation(async (functionName: string) => functionName === 'mark_awardee_journey_tasks'
    ? { data: null, error: { code: 'PGRST202', message: 'Could not find the function' } }
    : { data: null, error: null })

  await saveAwardeeJourneyProgress('member-1', { homeScreenAdded: true, introPublished: true })

  expect(state.rpc).toHaveBeenCalledWith('merge_profile_notification_prefs', {
    p_profile_id: 'member-1',
    p_patch: {
      homeScreenAddedAt: expect.any(String),
      introPublishedConfirmedAt: expect.any(String),
    },
  })
})

it('fails closed when the data function cannot find the profile', async () => {
  state.rpc.mockImplementation(async () => ({ data: null, error: null }))
  await expect(getAwardeeJourneyForMember('missing')).rejects.toThrow('Member profile not found.')
})

it('returns handbook eligibility and the two independent persisted timestamps', async () => {
  state.payload = {
    ...state.payload,
    handbook_eligible: true,
    progress: {
      welcome_read_at: null,
      external_share_confirmed_at: null,
      external_share_platform: null,
      handbook_prompt_seen_at: '2026-10-09T10:00:00.000Z',
      handbook_read_at: null,
    },
  }

  const journey = await getAwardeeJourneyForMember('member-1')

  expect(journey.handbook).toEqual({
    eligible: true,
    promptSeenAt: '2026-10-09T10:00:00.000Z',
    readAt: null,
  })
  expect(journey.state.coreSteps.find(step => step.id === 'handbook')?.complete).toBe(false)
})

it('uses existing profile preferences to restore handbook progress before the migration is applied', async () => {
  state.prefs = { handbookPromptSeenAt: '2026-10-09T10:00:00.000Z' }

  const journey = await getAwardeeJourneyForMember('member-1')

  expect(journey.handbook.promptSeenAt).toBe('2026-10-09T10:00:00.000Z')
})

it('falls back to an atomic profile preference merge when handbook progress RPC is unavailable', async () => {
  state.rpc.mockImplementation(async (functionName: string) => functionName === 'save_awardee_onboarding_progress'
    ? { data: null, error: { message: 'handbook progress columns are missing' } }
    : functionName === 'merge_profile_notification_prefs'
      ? { data: {}, error: null }
      : { data: null, error: null })

  await expect(saveAwardeeJourneyProgress('member-1', { handbookPromptSeen: true })).resolves.toBeUndefined()
  expect(state.rpc).toHaveBeenCalledWith('merge_profile_notification_prefs', expect.objectContaining({
    p_profile_id: 'member-1',
    p_patch: expect.objectContaining({ handbookPromptSeenAt: expect.any(String) }),
  }))
})
