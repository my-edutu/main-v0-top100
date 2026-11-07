import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it, vi } from 'vitest'
import AwardeesPageClient from '@/app/awardees/AwardeesPageClient'
import type { Awardee } from '@/lib/awardees-shared'

const { query } = vi.hoisted(() => ({ query: { value: '' } }))
vi.mock('next/navigation', () => ({
  usePathname: () => '/awardees',
  useSearchParams: () => new URLSearchParams(query.value),
  useRouter: () => ({}),
}))
vi.mock('@/lib/supabase/client', () => ({ supabase: null }))

it('renders distinct directory pages and crawlable pagination before hydration', () => {
  const profiles: Awardee[] = Array.from({ length: 20 }, (_, index) => {
    const number = String(index + 1).padStart(2, '0')
    return { awardee_id: number, profile_id: null, name: `Leader ${number}`, slug: `leader-${number}`, is_public: true, year: 2026 }
  }).reverse()
  query.value = 'year=all'
  const first = renderToStaticMarkup(<AwardeesPageClient initialPeople={profiles} />)
  expect(first).toContain('href="/awardees?year=all&amp;page=2"')
  expect(first).toContain('href="/awardees/leader-01"')
  expect(first).not.toContain('href="/awardees/leader-19"')

  query.value = 'year=all&page=2'
  const second = renderToStaticMarkup(<AwardeesPageClient initialPeople={profiles} />)
  expect(second).toContain('href="/awardees?year=all"')
  expect(second).toContain('href="/awardees/leader-19"')
  expect(second).not.toContain('href="/awardees/leader-01"')
})
