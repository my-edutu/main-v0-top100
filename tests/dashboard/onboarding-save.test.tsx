import { afterEach, expect, it, vi } from 'vitest'
import type { MemberProfile } from '@/lib/member-hub'
import type { ReactElement } from 'react'

vi.mock('react', async original => ({ ...await original<typeof import('react')>(),
  useState: (initial: unknown) => [typeof initial === 'function' ? initial() : initial, vi.fn()],
  useRef: (initial: unknown) => ({ current: initial }), useEffect: vi.fn(),
}))
vi.mock('@/app/dashboard/dashboard-header', () => ({ SignOutControl: () => null }))
vi.mock('@/app/dashboard/_components/onboarding-welcome', () => ({ OnboardingWelcome: () => null }))
import { Onboarding } from '@/app/dashboard/_components/onboarding'

function form(node: any): ReactElement<{ onSubmit: (event: any) => Promise<void> }> | undefined {
  if (!node || typeof node !== 'object') return
  if (node.type === 'form') return node
  const children = node.props?.children
  for (const child of Array.isArray(children) ? children.flat() : [children]) {
    const found = form(child)
    if (found) return found
  }
}
afterEach(() => vi.unstubAllGlobals())
it('deduplicates rapid saves and unlocks a failed save without losing the answer', async () => {
  let finish: ((response: Response) => void) | undefined
  const fetcher = vi.fn(() => new Promise<Response>(resolve => { finish = resolve }))
  vi.stubGlobal('fetch', fetcher)
  const tree = Onboarding({ member: { name: 'Member', headline: 'Community organiser', location: 'Nigeria', field: 'Education', bio: '', onboardingStep: 0 } as MemberProfile, onComplete: vi.fn() })
  const submit = form(tree)!.props.onSubmit
  const event = { preventDefault: vi.fn() }
  const pending = submit(event)
  await submit(event)
  expect(fetcher).toHaveBeenCalledOnce()
  finish!(Response.json({ message: 'Try again' }, { status: 503 }))
  await pending
  const retry = submit(event)
  expect(fetcher).toHaveBeenCalledTimes(2)
  expect(JSON.parse((fetcher.mock.calls[1] as unknown as [string, RequestInit])[1].body as string).headline).toBe('Community organiser')
  finish!(Response.json({ member: {} }))
  await retry
})
