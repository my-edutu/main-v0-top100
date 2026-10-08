import HomeFeaturedAwardees from "./HomeFeaturedAwardees"
import { getAwardees } from "@/lib/awardees"
import { resolveSupabasePortrait } from "@/lib/media/remote-image-source"

export default async function HomeFeaturedAwardeesSection() {
  const awardees = await getAwardees()

  const currentLeaders = awardees.filter((entry) => Number(entry.year) === 2026 && entry.is_public !== false)
  const featured = currentLeaders.filter((entry) => entry.featured)
  const nonFeatured = currentLeaders.filter((entry) => !entry.featured)
  const spotlight = (featured.length > 0 ? [...featured, ...nonFeatured] : currentLeaders)
    .map((entry) => ({
      slug: entry.slug ?? entry.awardee_id ?? entry.name,
      name: entry.name,
      country: entry.country ?? null,
      avatar_url: resolveSupabasePortrait(entry.avatar_url),
      headline: entry.headline ?? entry.tagline ?? entry.field_of_study ?? entry.current_school ?? null,
    }))
    .filter((entry) => entry.avatar_url !== null)

  return <HomeFeaturedAwardees awardees={spotlight} />
}
