/** Drive sharing pages are HTML, not image URLs. Public thumbnails may still
 * fail for private/deleted files; callers must provide an image fallback. */
export function resolveRemoteImageSource(source: string): string | null {
  if (source.startsWith('/') && !source.startsWith('//')) return source
  try {
    const url = new URL(source)
    if (!['https:', 'http:', 'data:', 'blob:'].includes(url.protocol)) return null
    if (url.hostname !== 'drive.google.com') return source
    const id = url.searchParams.get('id') ?? url.pathname.match(/^\/file\/d\/([^/]+)/)?.[1]
    if (!id || !/^[a-zA-Z0-9_-]+$/.test(id)) return null
    const thumbnail = new URL('https://drive.google.com/thumbnail')
    thumbnail.searchParams.set('id', id)
    thumbnail.searchParams.set('sz', 'w800')
    const resourceKey = url.searchParams.get('resourcekey')
    if (resourceKey) thumbnail.searchParams.set('resourcekey', resourceKey)
    return thumbnail.toString()
  } catch { return null }
}

export function isDriveImage(source: string): boolean {
  try { return new URL(source).hostname === 'drive.google.com' } catch { return false }
}
