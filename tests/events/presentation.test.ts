import { describe, expect, it } from 'vitest'

import { eventCoverUrl } from '@/lib/events/presentation'

describe('event card presentation', () => {
  it('always returns a cover image, falling back for events without artwork', () => {
    expect(eventCoverUrl({ cover: null }, 0)).toBe('/top100-africa-future-leaders-2024-magazine-cover-w.jpg')
    expect(eventCoverUrl({ featured_image_url: '' }, 1)).toBe('/magazine-cover-2025.jpg')
  })

  it('prefers the event cover over the fallback artwork', () => {
    expect(eventCoverUrl({ cover: 'https://cdn.example.com/event.jpg' }, 2)).toBe(
      'https://cdn.example.com/event.jpg',
    )
  })
})
