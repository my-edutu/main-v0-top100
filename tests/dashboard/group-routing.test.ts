import { expect, it } from 'vitest'

import { finishSuccessfulGroupLeave } from '@/app/dashboard/_lib/navigation'

it('clears routed group state before refreshing the list and exiting the detail route', async () => {
  const events: string[] = []
  await finishSuccessfulGroupLeave({
    clearSelection: () => events.push('selection cleared'),
    clearDetail: () => events.push('detail cleared'),
    refreshList: async () => {
      events.push('list refreshed')
    },
    exitRoute: () => events.push('route exited'),
  })

  expect(events).toEqual([
    'selection cleared',
    'detail cleared',
    'list refreshed',
    'route exited',
  ])
})
