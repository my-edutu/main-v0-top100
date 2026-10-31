import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it, vi } from 'vitest'

vi.mock('next/navigation', () => ({ usePathname: () => '/dashboard', useRouter: () => ({ replace: vi.fn() }) }))
vi.mock('react', async original => {
  const react = await original<typeof import('react')>()
  return { ...react, useState: (initial: unknown) => react.useState(initial === null
    ? { id: 'member-test', name: 'Member', status: 'approved', onboardingCompletedAt: null } : initial) }
})
vi.mock('next/dynamic', () => ({ default: (loader: () => unknown) => loader.toString().includes('top100-moment')
  ? ({ children }: { children: React.ReactNode }) => <section>Optional welcome{children}</section>
  : () => <p>Required profile setup</p> }))
import { DashboardMemberProvider } from '@/app/dashboard/_providers/dashboard-member'

it('shows required setup without mounting optional welcome or handbook prompts', () => {
  const markup = renderToStaticMarkup(<DashboardMemberProvider>Dashboard</DashboardMemberProvider>)
  expect(markup).toContain('Required profile setup')
  expect(markup).not.toContain('Optional welcome')
})
