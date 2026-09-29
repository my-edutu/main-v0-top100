import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { GroupsLockedState } from '@/app/dashboard/_components/groups-locked-state'

describe('GroupsLockedState', () => {
  it('communicates unavailability with an accessible illustration and no return action', () => {
    const markup = renderToStaticMarkup(<GroupsLockedState />)

    expect(markup).toContain('role="status"')
    expect(markup).toContain('role="img" aria-label="Groups are not available"')
    expect(markup).toContain('Groups aren’t available right now')
    expect(markup).not.toContain('Back to Discover')
  })
})
