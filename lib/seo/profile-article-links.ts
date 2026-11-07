import type { ResolvedPost } from '@/lib/posts'
import { SITE_URL } from '@/lib/site'

/** Only explicit links and recorded author IDs establish a relationship. */
export function linkedProfileSlugs(html: string): string[] {
  const slugs = new Set<string>()
  const links = html.matchAll(/<a\b[^>]*?\s+href\s*=\s*(?:"([^"]*)"|'([^']*)')/gi)
  for (const match of links) {
    try {
      const url = new URL(match[1] ?? match[2], SITE_URL)
      if (url.origin !== SITE_URL) continue
      const slug = url.pathname.match(/^\/(?:awardees|bio)\/([^/]+)\/?$/)?.[1]
      if (slug) slugs.add(decodeURIComponent(slug))
    } catch {
      // Skip malformed links.
    }
  }
  return [...slugs]
}

export function articleLinksToProfile(post: ResolvedPost, profile: { profile_id: string | null; slug: string }): boolean {
  return Boolean(profile.profile_id && post.authorId === profile.profile_id) ||
    linkedProfileSlugs(post.contentHtml).includes(profile.slug)
}
