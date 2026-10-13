import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const query = searchParams.get('q')

        if (!query || query.trim().length < 2 || query.trim().length > 100) {
            return Response.json({ awardees: [] })
        }

        const supabase = createAdminClient()

        // This route is public: hidden profiles must never be discoverable
        // here. Verified members manage their own details inside the dashboard.
        const sanitizedQuery = query.trim().replace(/[\\%_]/g, '\\$&')
        const { data, error } = await supabase
            .from('awardees')
            .select('id, name, slug, avatar_url, country, headline, email')
             .eq('is_public', true)
            .ilike('name', `%${sanitizedQuery}%`)
            .order('name', { ascending: true })
            .limit(100) // Bound public search results for predictable response time

        if (error) {
            console.error('Error searching awardees:', error)
            return Response.json({
                awardees: [],
                error: 'Search failed'
            }, { status: 500 })
        }

        // Don't expose full email in search results - just indicate if email exists
        const sanitizedData = (data || []).map(awardee => ({
            id: awardee.id,
            name: awardee.name,
            slug: awardee.slug,
            avatar_url: awardee.avatar_url,
            country: awardee.country,
            headline: awardee.headline,
            hasEmail: !!awardee.email // Just indicate if email exists, don't expose value
        }))

        return Response.json({
            awardees: sanitizedData,
            total: sanitizedData.length
        })
    } catch (error) {
        console.error('Error in awardees search:', error)
        return Response.json({
            awardees: [],
            error: 'Search failed'
        }, { status: 500 })
    }
}
