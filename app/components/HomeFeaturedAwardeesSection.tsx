import HomeFeaturedAwardees from "./HomeFeaturedAwardees"
import { getAwardees } from "@/lib/awardees"

export default async function HomeFeaturedAwardeesSection() {
  const awardees = await getAwardees()

  // Filter for awardees marked as featured in the database
  const featuredAwardees = awardees
    .filter(entry => entry.featured === true)
    .map((entry) => ({
      slug: entry.slug ?? entry.awardee_id ?? entry.name,
      name: entry.name,
      country: entry.country ?? null,
      bio: entry.bio ?? null,
      avatar_url: entry.avatar_url ?? null,
      course: entry.course ?? entry.field_of_study ?? entry.current_school ?? null,
      cgpa: entry.cgpa ?? null,
      featured: entry.featured ?? false,
    }))


  
  return <HomeFeaturedAwardees awardees={featuredAwardees} />
}