export type InterviewFormat = 'video' | 'written'
export type InterviewStatus = 'draft' | 'published'

export type InterviewRow = {
  id: string
  slug: string
  title: string
  format: InterviewFormat
  video_id: string | null
  duration_seconds: number | null
  thumbnail_url: string | null
  pull_quote: string | null
  summary: string | null
  body: string | null
  awardee_id: string | null
  awardee_name: string
  country: string | null
  cohort_year: number | null
  topics: string[] | null
  featured: boolean
  status: InterviewStatus
  published_at: string | null
  sort_order: number
  application_id: string | null
  /** Joined from public.awardees so cards can link to the profile. */
  awardee?: { slug: string | null } | null
}

export type InterviewCardView = {
  id: string
  slug: string
  title: string
  awardeeName: string
  awardeeSlug: string | null
  videoId: string | null
  country: string | null
  cohortYear: number | null
  thumbnailUrl: string | null
  durationLabel: string | null
  format: InterviewFormat
  pullQuote: string | null
  summary: string | null
}

export function youtubeThumbnail(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
}

export function formatDuration(seconds: number | null): string | null {
  if (!seconds || seconds <= 0) {
    return null
  }

  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainder = seconds % 60
  const paddedSeconds = String(remainder).padStart(2, '0')

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${paddedSeconds}`
  }

  return `${minutes}:${paddedSeconds}`
}

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/

/**
 * Admins paste whatever the YouTube share button gave them. Accept every shape
 * it produces, and reject anything else before it becomes an empty player.
 */
export function parseYouTubeId(input: string): string | null {
  const value = input.trim()
  if (!value) {
    return null
  }

  if (YOUTUBE_ID.test(value)) {
    return value
  }

  let url: URL
  try {
    url = new URL(value)
  } catch {
    return null
  }

  const host = url.hostname.replace(/^www\./, '')

  if (host === 'youtu.be') {
    const id = url.pathname.slice(1)
    return YOUTUBE_ID.test(id) ? id : null
  }

  if (host !== 'youtube.com' && host !== 'youtube-nocookie.com' && host !== 'm.youtube.com') {
    return null
  }

  const param = url.searchParams.get('v')
  if (param && YOUTUBE_ID.test(param)) {
    return param
  }

  const match = url.pathname.match(/^\/(embed|shorts|v)\/([A-Za-z0-9_-]{11})/)
  return match ? match[2] : null
}

export function toCardView(row: InterviewRow): InterviewCardView {
  const thumbnailUrl = row.thumbnail_url || (row.video_id ? youtubeThumbnail(row.video_id) : null)

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    awardeeName: row.awardee_name,
    awardeeSlug: row.awardee?.slug ?? null,
    videoId: row.video_id,
    country: row.country,
    cohortYear: row.cohort_year,
    thumbnailUrl,
    durationLabel: formatDuration(row.duration_seconds),
    format: row.format,
    pullQuote: row.pull_quote,
    summary: row.summary,
  }
}

export function pickFeatured(rows: InterviewRow[]): InterviewRow | null {
  return rows.find((row) => row.featured) ?? rows[0] ?? null
}
