import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase/client', () => ({
  supabase: { auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) } },
}))

import SignUpPage from '@/app/signup/page'

describe('awardee signup page', () => {
  it('starts with just the awardee search and keeps code and password fields for later', () => {
    const html = renderToStaticMarkup(createElement(SignUpPage))

    expect(html).toContain('Find your awardee record')
    expect(html).toContain('id="winner-search"')
    expect(html).not.toContain('id="claim-email"')
    expect(html).not.toContain('id="claim-code"')
    expect(html).not.toContain('id="claim-password"')
  })

  it('shows existing-account guidance only once', () => {
    const html = renderToStaticMarkup(createElement(SignUpPage))

    expect(html.match(/Already registered\?/g)).toHaveLength(1)
    expect(html.match(/Already have an account\?/g) ?? []).toHaveLength(0)
  })
})
