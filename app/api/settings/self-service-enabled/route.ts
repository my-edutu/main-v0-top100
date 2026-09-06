import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { legacySelfServiceEnabled } from '@/lib/legacy-self-service'

// Check if self-service profile editing is enabled
export async function GET(request: NextRequest) {
    try {
        const supabase = createAdminClient()

        return Response.json({ enabled: await legacySelfServiceEnabled(supabase) })
    } catch (error) {
        console.error('Error checking self-service setting:', error)
        return Response.json({ enabled: false })
    }
}
