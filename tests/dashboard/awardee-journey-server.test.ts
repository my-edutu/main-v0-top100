import { beforeEach, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({ payload: null as Record<string, unknown> | null, rpc: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: () => ({ rpc: state.rpc }),
}))

import { getAwardeeJourneyForMember } from '@/lib/dashboard/awardee-journey-server'

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
  state.rpc.mockImplementation(async (functionName: string) => functionName === 'get_awardee_journey_data'
    ? { data: state.payload, error: null }
    : { data: null, error: null })
})

it('loads member journey and persisted WhatsApp completion with database RPCs', async () => {
  const journey = await getAwardeeJourneyForMember('member-1')

  expect(state.rpc).toHaveBeenCalledWith('get_awardee_journey_data', { p_profile_id: 'member-1' })
  expect(state.rpc).toHaveBeenCalledWith('get_awardee_whatsapp_channel_joined_at', { p_profile_id: 'member-1' })
  expect(state.rpc).toHaveBeenCalledTimes(2)
  expect(journey.state.progress).toEqual({ completed: 3, total: 3, percent: 100 })
  expect(journey.state.recommendedActions.find(action => action.id === 'magazine')?.status).toBe('Application submitted')
  expect(journey.state.recommendedActions.find(action => action.id === 'award')?.status).toBe('Award fee paid')
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
