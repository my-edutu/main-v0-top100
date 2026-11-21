import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api/require-admin'
import { createAdminClient } from '@/lib/supabase/server'
export async function GET(request:NextRequest) {const auth=await requireAdmin(request);if('error' in auth)return auth.error;const {data,error}=await createAdminClient().from('programme_manager_weekly_reports').select('*').order('week_start',{ascending:false}).limit(12);if(error)return NextResponse.json({message:'Could not load weekly summaries.'},{status:500});return NextResponse.json({reports:data},{headers:{'Cache-Control':'private, no-store'}})}
