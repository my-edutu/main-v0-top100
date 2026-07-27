import { describe, expect, it } from 'vitest'

import {
  formatDuration,
  parseYouTubeId,
  pickFeatured,
  toCardView,
  youtubeThumbnail,
  type InterviewRow,
} from '@/lib/interviews/mappers'

const baseRow: InterviewRow = {
  id: 'i1',
  slug: 'amara-okonkwo',
  title: 'I stopped waiting for permission',
  format: 'video',
  video_id: 'dQw4w9WgXcQ',
  duration_seconds: 1104,
  thumbnail_url: null,
  pull_quote: 'I stopped waiting for permission.',
  summary: 'Amara on building a clinic network.',
  body: '<p>Hello</p>',
  awardee_id: 'a1',
  awardee_name: 'Amara Okonkwo',
  country: 'Nigeria',
  cohort_year: 2025,
  topics: ['health'],
  featured: false,
  status: 'published',
  published_at: '2026-07-01T00:00:00.000Z',
  sort_order: 0,
  application_id: null,
  awardee: { slug: 'amara-okonkwo' },
}

describe('formatDuration', () => {
  it('formats minutes and seconds', () => {
    expect(formatDuration(1104)).toBe('18:24')
  })

  it('formats past an hour', () => {
    expect(formatDuration(3731)).toBe('1:02:11')
  })

  it('returns null when the duration is unknown', () => {
    expect(formatDuration(null)).toBeNull()
  })
})

describe('youtubeThumbnail', () => {
  it('builds a thumbnail url from a video id', () => {
    expect(youtubeThumbnail('dQw4w9WgXcQ')).toBe('https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg')
  })
})

describe('parseYouTubeId', () => {
  it('reads a watch url', () => {
    expect(parseYouTubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10s')).toBe('dQw4w9WgXcQ')
  })

  it('reads a short url', () => {
    expect(parseYouTubeId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
  })

  it('reads an embed url', () => {
    expect(parseYouTubeId('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
  })

  it('reads a shorts url', () => {
    expect(parseYouTubeId('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
  })

  it('accepts a bare id', () => {
    expect(parseYouTubeId('dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
  })

  it('rejects a non-youtube url', () => {
    expect(parseYouTubeId('https://vimeo.com/12345')).toBeNull()
  })

  it('rejects an empty value', () => {
    expect(parseYouTubeId('   ')).toBeNull()
  })
})

describe('toCardView', () => {
  it('falls back to the youtube thumbnail when none is stored', () => {
    expect(toCardView(baseRow).thumbnailUrl).toBe('https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg')
  })

  it('prefers an explicit thumbnail override', () => {
    const view = toCardView({ ...baseRow, thumbnail_url: 'https://cdn.example.com/a.jpg' })
    expect(view.thumbnailUrl).toBe('https://cdn.example.com/a.jpg')
  })

  it('handles a written interview with no video', () => {
    const view = toCardView({
      ...baseRow,
      format: 'written',
      video_id: null,
      duration_seconds: null,
      thumbnail_url: null,
    })
    expect(view.format).toBe('written')
    expect(view.thumbnailUrl).toBeNull()
    expect(view.durationLabel).toBeNull()
    expect(view.videoId).toBeNull()
  })

  it('exposes the linked awardee slug for profile links', () => {
    expect(toCardView(baseRow).awardeeSlug).toBe('amara-okonkwo')
  })

  it('carries the raw video id through for the player', () => {
    expect(toCardView(baseRow).videoId).toBe('dQw4w9WgXcQ')
  })

  it('survives a row whose awardee link was removed', () => {
    const view = toCardView({ ...baseRow, awardee_id: null, awardee: null })
    expect(view.awardeeSlug).toBeNull()
    expect(view.awardeeName).toBe('Amara Okonkwo')
  })
})

describe('pickFeatured', () => {
  it('prefers the flagged interview', () => {
    const rows = [baseRow, { ...baseRow, id: 'i2', slug: 'b', featured: true }]
    expect(pickFeatured(rows)?.id).toBe('i2')
  })

  it('falls back to the first row when nothing is flagged', () => {
    expect(pickFeatured([baseRow])?.id).toBe('i1')
  })

  it('returns null when there is nothing published', () => {
    expect(pickFeatured([])).toBeNull()
  })
})
