import { getAllAwardeesForProof } from '@/lib/awardees'
import { Metadata } from 'next'
import AwardeesListClient from './AwardeesListClient'

export const metadata: Metadata = {
    title: 'Top 100 Africa Future Leaders - Full Awardees List',
    description: 'Complete list of all Top 100 Africa Future Leaders awardees with their CGPA and country.',
}

export const revalidate = 3600 // Revalidate every hour (static Excel doesn't change often)

export default async function AwardeesListPage() {
    // Fetch ALL awardees from the static Excel file
    const awardees = await getAllAwardeesForProof()

    // Sort by name alphabetically
    const sortedAwardees = [...awardees].sort((a, b) =>
        a.name.localeCompare(b.name)
    )

    return <AwardeesListClient awardees={sortedAwardees} />
}
