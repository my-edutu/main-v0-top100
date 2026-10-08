/** Drive sharing pages are HTML, not image URLs. Public thumbnails may still
 * fail for private/deleted files; callers must provide an image fallback. */
export function resolveRemoteImageSource(source: string): string | null {
  if (source.startsWith('/') && !source.startsWith('//')) return source
  try {
    const url = new URL(source)
    if (!['https:', 'http:', 'data:', 'blob:'].includes(url.protocol)) return null
    // Public objects were migrated to our VPS; the retired cloud project now
    // returns 402. Preserve paths and signed/private URLs outside this prefix.
    if (url.hostname === 'zsavekrhfwrpqudhjvlq.supabase.co' &&
        url.pathname.startsWith('/storage/v1/object/public/')) {
      url.hostname = 'supabase.top100afl.com'
      return url.toString()
    }
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

/** Homepage portraits must be public uploads in our Supabase Storage. */
export function resolveSupabasePortrait(source?: string | null): string | null {
  if (!source) return null
  const resolved = resolveRemoteImageSource(source.trim())
  if (!resolved) return null
  try {
    const url = new URL(resolved)
    const storageHost = url.hostname === 'supabase.top100afl.com' || url.hostname.endsWith('.supabase.co')
    return url.protocol === 'https:' && storageHost && url.pathname.startsWith('/storage/v1/object/public/')
      ? resolved
      : null
  } catch { return null }
}
