import { getAwardees } from "@/lib/awardees"
import { galleryImages } from "@/lib/gallery-data"
import { getHomepagePosts } from "@/lib/posts/server"

export async function getImpactPageData() {
  const [awardees, posts] = await Promise.all([getAwardees(), getHomepagePosts()])
  const featuredAwardees = [
    ...awardees.filter((entry) => entry.featured),
    ...awardees.filter((entry) => !entry.featured),
  ].slice(0, 6)
  const stories = posts.slice(0, 3)
  const moments = galleryImages.slice(0, 6)

  return { featuredAwardees, stories, moments }
}
