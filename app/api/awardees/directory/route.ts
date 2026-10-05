import { getAwardees } from '@/lib/awardees'
import { publicDirectoryCards } from '@/lib/awardees/directory-cards'

export async function GET() {
  try {
    return Response.json(publicDirectoryCards(await getAwardees()), {
      headers: { 'Cache-Control': 'public, max-age=60, must-revalidate' },
    })
  } catch {
    return Response.json({ message: 'Could not load the member directory.' }, { status: 503 })
  }
}
