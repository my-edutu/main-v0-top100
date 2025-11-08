import HomeFeaturedAwardees from "./HomeFeaturedAwardees"
import { getAwardees } from "@/lib/awardees"

export default async function HomeFeaturedAwardeesSection() {
  const awardees = await getAwardees()

  // Filter for the specific awardees - using exact names as they appear in the database
  const requiredAwardees = [
    "abiodun damilola",
    "babarinde taofeek", 
    "babarinde taofeek olajide",
    "raheemat oyiza muhammad", // Exact name from database
    "onofiok lillian okpo",    // Exact name from database
    "stephen emmanuel"         // Exact name from database
  ]

  // Create a more flexible matching function
  const normalizeName = (name: string) => {
    return name.toLowerCase().trim().replace(/\s+/g, ' ')
  }

  const featuredAwardees = awardees
    .filter(entry => {
      const entryName = normalizeName(entry.name)
      const matchFound = requiredAwardees.some(req => {
        const normalizedName = normalizeName(req)
        return entryName.includes(normalizedName) || normalizedName.includes(entryName)
      })
      

      
      return matchFound
    })
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
    // Remove potential duplicates based on name
    .filter((entry, index, self) => 
      index === self.findIndex(e => normalizeName(e.name) === normalizeName(entry.name))
    )


  
  return <HomeFeaturedAwardees awardees={featuredAwardees} />
}