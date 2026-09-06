import { describe, expect, it } from 'vitest'

import {
  createDemoDashboardStore,
  demoAwardeeDirectoryEntry,
} from '@/lib/dev-dashboard/store'

describe('local dashboard public profile', () => {
  it('maps the current demo BIO into the public awardee shape', () => {
    const store = createDemoDashboardStore()
    store.profile.headline = 'Launch verification headline'
    store.profile.bio = 'Launch verification biography.'

    expect(demoAwardeeDirectoryEntry(store)).toMatchObject({
      awardee_id: 'demo-awardee-1',
      profile_id: 'demo-member-1',
      slug: 'amara-okafor-demo',
      name: 'Amara Okafor',
      headline: 'Launch verification headline',
      bio: 'Launch verification biography.',
      country: 'Nigeria',
      is_public: true,
    })
  })
})
