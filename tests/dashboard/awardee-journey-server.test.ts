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
    settings: null,
    campaign: null,
    has_published_intro_post: true,
    magazine_order: { status: 'paid' },
    application: { status: 'pending' },
    award_order: { award_payment_status: 'paid', status: 'paid' },
  }
  state.rpc.mockResolvedValue({ data: state.payload, error: null })
})

it('loads a member journey with one database RPC and maps progress and payment state', async () => {
  const journey = await getAwardeeJourneyForMember('member-1')

  expect(state.rpc).toHaveBeenCalledExactlyOnceWith('get_awardee_journey_data', { p_profile_id: 'member-1' })
  expect(journey.state.progress).toEqual({ completed: 3, total: 3, percent: 100 })
  expect(journey.state.recommendedActions.find(action => action.id === 'magazine')?.status).toBe('Application submitted')
  expect(journey.state.recommendedActions.find(action => action.id === 'award')?.status).toBe('Award fee paid')
})

it('fails closed when the data function cannot find the profile', async () => {
  state.rpc.mockResolvedValue({ data: null, error: null })
  await expect(getAwardeeJourneyForMember('missing')).rejects.toThrow('Member profile not found.')
})
