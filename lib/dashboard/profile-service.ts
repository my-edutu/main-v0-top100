import { unstable_cache } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/server'
import {
    DEMO_PUBLIC_SLUG,
    demoAwardeeDirectoryEntry,
    getDemoDashboardStore,
} from '@/lib/dev-dashboard/store'

/**
 * Fetch a single awardee by their slug for public profile display
 */
const fetchPersistedAwardeeBySlug = unstable_cache(
    async (slug: string) => {
        const supabase = createAdminClient()
        const { data, error } = await supabase
            .from('awardee_directory')
            .select('*')
            .eq('slug', slug)
            .maybeSingle()

        // Availability failures must not republish workbook records or become
        // cached 404s. Throw so Next preserves a previously successful ISR page.
        if (error) throw new Error('Public profile lookup failed', { cause: error })
        return data ?? null
    },
    // Version the cache key so a previously cached not-found response cannot
    // hide a newly added public directory record after it is inserted.
    ['awardee-profile-by-slug-v5'],
    { revalidate: 600, tags: ['awardees'] },
)

export async function fetchAwardeeBySlug(slug: string) {
    if (process.env.NODE_ENV === 'development' && slug === DEMO_PUBLIC_SLUG) {
        return demoAwardeeDirectoryEntry(getDemoDashboardStore())
    }

    return fetchPersistedAwardeeBySlug(slug)
}
