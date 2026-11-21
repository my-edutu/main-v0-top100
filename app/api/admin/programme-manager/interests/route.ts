import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api/require-admin'
import { createAdminClient } from '@/lib/supabase/server'
export async function GET(request: NextRequest) {
 const auth = await requireAdmin(request); if ('error' in auth) return auth.error
 const { data, error } = await createAdminClient().from('programme_manager_interests').select('id,kind,consented_at,profiles(full_name,email),programme_manager_activities(title)').order('consented_at', { ascending:false })
 if (error) return NextResponse.json({ message:'Could not load member interest.' }, { status:500 })
 return NextResponse.json({ interests:data }, { headers:{ 'Cache-Control':'private, no-store' } })
}
