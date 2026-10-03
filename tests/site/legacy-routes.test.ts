import { describe, expect, it } from 'vitest'
import config from '../../next.config.mjs'

describe('legacy route redirects', () => {
  it('sends the retired Talk100 route to the current page', async () => {
    const redirects = await config.redirects?.()
    expect(redirects).toContainEqual({
      source: '/initiatives/talk100',
      destination: '/initiatives/talk100-live',
      permanent: true,
    })
  })
})
