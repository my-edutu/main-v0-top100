import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

// Check if self-service profile editing is enabled
export async function GET(request: NextRequest) {
    try {
        const supabase = createAdminClient()

        const { data, error } = await supabase
            .from('settings')
            .select('self_service_profile_edit_enabled')
            .limit(1)
            .single()

        if (error) {
            // If settings table doesn't exist or no setting, default to enabled
            return Response.json({ enabled: true })
        }

        return Response.json({
            enabled: data?.self_service_profile_edit_enabled ?? true
        })
    } catch (error) {
        console.error('Error checking self-service setting:', error)
        // Default to enabled if there's an error
        return Response.json({ enabled: true })
    }
}
