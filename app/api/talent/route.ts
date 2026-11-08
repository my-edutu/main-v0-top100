import type { NextRequest } from 'next/server'
import { assertTalentEnabled, talentError, talentJson, talentRateLimit } from '@/lib/talent/api'
import { parseTalentFilters } from '@/lib/talent/contracts'
import { getTalentPage } from '@/lib/talent/public-query'
export const dynamic = 'force-dynamic'
export async function GET(request: NextRequest) {
  try {
    assertTalentEnabled()
    const rate = await talentRateLimit(request, 'QUERY', 'directory'); if (rate) return rate
    return talentJson(await getTalentPage(parseTalentFilters(request.nextUrl.searchParams)))
  } catch (error) { return talentError(error) }
}
