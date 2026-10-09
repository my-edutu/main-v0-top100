import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase/client', () => ({
  supabase: { auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) } },
}))

import SignUpPage from '@/app/signup/page'

describe('awardee signup page', () => {
  it('shows existing-account guidance only once', () => {
    const html = renderToStaticMarkup(createElement(SignUpPage))

    expect(html.match(/Already registered\?/g)).toHaveLength(1)
    expect(html.match(/Already have an account\?/g) ?? []).toHaveLength(0)
  })
})
