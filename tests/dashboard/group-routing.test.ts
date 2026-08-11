import { expect, it } from 'vitest'

import { groupExitDestination } from '@/app/dashboard/_lib/navigation'

it('returns to the groups list after leaving a routed group detail', () => {
  expect(groupExitDestination()).toBe('/dashboard/discover/groups')
})
