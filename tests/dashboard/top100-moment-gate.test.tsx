import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'
import type { MemberProfile } from '@/lib/member-hub'
import { Top100MomentGate } from '@/app/dashboard/_components/top100-moment'

it('keeps the dashboard available while the optional welcome is loading', () => {
  const member = { id: 'member-1', name: 'Jesunwem', status: 'approved' } as MemberProfile
  const markup = renderToStaticMarkup(
    <Top100MomentGate member={member}><nav>Dashboard navigation</nav></Top100MomentGate>,
  )

  expect(markup).toContain('Dashboard navigation')
  expect(markup).not.toContain('Loading your dashboard')
})
