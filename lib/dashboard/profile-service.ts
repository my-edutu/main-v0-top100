import { createClient } from '@/lib/supabase/server'

/**
 * Fetch a single awardee by their slug for public profile display
 */
export async function fetchAwardeeBySlug(slug: string) {
    const supabase = await createClient(true)

    const { data, error } = await supabase
        .from('awardee_directory')
        .select('*')
        .eq('slug', slug)
        .single()

    if (error) {
        console.error('Error fetching awardee by slug:', error)
        return null
    }

    return data
}
