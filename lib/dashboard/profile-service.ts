import { unstable_cache } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getAwardees } from '@/lib/awardees'

/**
 * Fetch a single awardee by their slug for public profile display
 */
export const fetchAwardeeBySlug = unstable_cache(
    async (slug: string) => {
        try {
            const supabase = await createClient(true)

            const { data, error } = await supabase
                .from('awardee_directory')
                .select('*')
                .eq('slug', slug)
                .single()

            if (!error && data) {
                return data
            }

            if (error) {
                console.warn('Error fetching awardee by slug from Supabase, using workbook fallback:', error)
            }
        } catch (error) {
            console.warn('Awardee profile service falling back to workbook data:', error)
        }

        const awardees = await getAwardees()
        return awardees.find((awardee) => awardee.slug === slug) ?? null
    },
    // Version the cache key so a previously cached not-found response cannot
    // hide a newly added public directory record after it is inserted.
    ['awardee-profile-by-slug-v2'],
    { revalidate: 600, tags: ['awardees'] },
)
