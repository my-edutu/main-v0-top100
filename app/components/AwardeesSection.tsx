import AwardeesSpotlightClient from "./AwardeesSpotlightClient"
import { getAwardees } from "@/lib/awardees"

const AWARDEES_LIMIT = 8

export default async function AwardeesSection() {
  const awardees = await getAwardees()

  const featured = awardees.filter((entry) => entry.featured)
  const nonFeatured = awardees.filter((entry) => !entry.featured)

  const prioritized = featured.length > 0 ? [...featured, ...nonFeatured] : awardees
  const spotlight = prioritized.slice(0, AWARDEES_LIMIT).map((entry) => ({
    slug: entry.slug ?? entry.awardee_id ?? entry.name,
    name: entry.name,
    country: entry.country ?? null,
    bio: entry.bio ?? null,
    avatar_url: entry.avatar_url ?? null,
    course: entry.course ?? entry.field_of_study ?? entry.current_school ?? null,
    cgpa: entry.cgpa ?? null,
    featured: entry.featured ?? false,
  }))

  return <AwardeesSpotlightClient awardees={spotlight} />
}
