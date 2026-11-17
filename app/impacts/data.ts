import { getAwardees } from "@/lib/awardees"
import { galleryImages } from "@/lib/gallery-data"
import { getHomepagePosts } from "@/lib/posts/server"
import { resolveSupabasePortrait } from "@/lib/media/remote-image-source"

export async function getImpactPageData() {
  const [awardees, posts] = await Promise.all([getAwardees(), getHomepagePosts()])
  const featuredAwardees = awardees
    .filter((entry) => entry.is_public !== false)
    .flatMap(({ slug, name, avatar_url, bio, country, featured }) => {
      const portrait = resolveSupabasePortrait(avatar_url)
      return portrait ? [{ slug, name, bio, country, featured, avatar_url: portrait }] : []
    })
    .sort((a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)))
    .slice(0, 6)
  const stories = posts.slice(0, 3)
  const moments = galleryImages.slice(0, 6)

  return { featuredAwardees, stories, moments }
}
