import { afterEach, expect, it, vi } from 'vitest'
import { fetchEdutuCatalog, mapEdutuOpportunity } from '@/lib/opportunities/edutu'

const row = {
  id: 'listing-1',
  title: 'Leadership Fellowship',
  status: 'active',
  category: 'Science',
  canonical_category: 'fellowships',
  application_url: 'https://example.org/apply',
  trust: { deadlineNeedsReview: true },
}

afterEach(() => vi.unstubAllGlobals())

it('maps the public Edutu category, safe apply link, and deadline verification flag', () => {
  expect(mapEdutuOpportunity(row)).toMatchObject({
    id: 'edutu:listing-1',
    type: 'Fellowship',
    source: 'Edutu',
    applicationUrl: 'https://example.org/apply',
    deadlineNeedsReview: true,
  })
})

it('omits inactive, expired and unsafe listings', () => {
  expect(mapEdutuOpportunity({ ...row, status: 'closed' })).toBeNull()
  expect(mapEdutuOpportunity({ ...row, close_date: '2000-01-01' })).toBeNull()
  expect(mapEdutuOpportunity({ ...row, application_url: 'javascript:alert(1)' })).toBeNull()
})

it('removes listings at midnight in Lagos after their closing date', () => {
  const listing = { ...row, close_date: '2026-11-21' }
  expect(mapEdutuOpportunity(listing, new Date('2026-11-21T22:59:59Z'))).not.toBeNull()
  expect(mapEdutuOpportunity(listing, new Date('2026-11-21T23:00:00Z'))).toBeNull()
})

it('keeps the full description and uses a safe listing image', () => {
  const listing = {
    ...row,
    description: 'Application details and eligibility.',
    image_url: 'https://cdn.example.org/fellowship.jpg',
    source_image_url: 'https://example.org/cover.jpg',
  }
  expect(mapEdutuOpportunity(listing)).toMatchObject({
    description: listing.description,
    imageUrl: listing.image_url,
  })
  expect(mapEdutuOpportunity({ ...listing, image_url: 'javascript:alert(1)' })?.imageUrl)
    .toBe(listing.source_image_url)
})

it('continues across Edutu pages when filtering by the canonical category', async () => {
  const fetch = vi.fn()
    .mockResolvedValueOnce(Response.json({ items: [{ ...row, canonical_category: 'scholarships' }], nextCursor: 'page-2' }))
    .mockResolvedValueOnce(Response.json({ items: [row], nextCursor: null }))
  vi.stubGlobal('fetch', fetch)

  const result = await fetchEdutuCatalog({ query: 'leadership', type: 'Fellowship', cursor: '' })

  expect(result.opportunities.map(item => item.id)).toEqual(['edutu:listing-1'])
  expect(result.nextCursor).toBeNull()
  expect(fetch.mock.calls[1][0].searchParams.get('cursor')).toBe('page-2')
  expect(fetch.mock.calls[1][0].searchParams.get('q')).toBe('leadership')
})

it('reports upstream failures instead of inventing listings', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 503 })))
  await expect(fetchEdutuCatalog({ query: '', type: '', cursor: '' })).rejects.toThrow('HTTP 503')
})
