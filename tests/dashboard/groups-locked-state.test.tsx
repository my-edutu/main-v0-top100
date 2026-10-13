import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { GroupsLockedState } from '@/app/dashboard/_components/groups-locked-state'

describe('GroupsLockedState', () => {
  it('explains approved-member access with an accessible illustration', () => {
    const markup = renderToStaticMarkup(<GroupsLockedState />)

    expect(markup).toContain('role="status"')
    expect(markup).toContain('role="img" aria-label="WhatsApp groups are for approved members"')
    expect(markup).toContain('WhatsApp groups are for approved members')
    expect(markup).toContain('available to approved members')
    expect(markup).not.toContain('Back to Discover')
  })
})
