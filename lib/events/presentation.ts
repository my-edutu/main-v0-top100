export const EVENT_FALLBACK_COVERS = [
  '/top100-africa-future-leaders-2024-magazine-cover-w.jpg',
  '/magazine-cover-2025.jpg',
  '/young-african-man-business-leader.jpg',
] as const

export function eventCoverUrl(
  event: { cover?: string | null; featured_image_url?: string | null },
  index: number,
): string {
  return event.cover?.trim() || event.featured_image_url?.trim() || EVENT_FALLBACK_COVERS[index % EVENT_FALLBACK_COVERS.length]
}
