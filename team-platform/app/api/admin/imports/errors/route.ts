import { NextResponse } from 'next/server'
import { ApiError, apiAdmin, jsonError } from '@/lib/api'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const member = await apiAdmin()
    const jobId = new URL(request.url).searchParams.get('jobId')
    if (!jobId) throw new ApiError('jobId is required')

    const admin = createAdminClient()
    const { data, error } = await admin
      .from('team_import_jobs')
      .select('id, filename, status, errors, summary')
      .eq('id', jobId)
      .eq('team_id', member.membership.team_id)
      .maybeSingle()
    if (error) throw new ApiError('Could not load import errors', 500)
    if (!data) throw new ApiError('Import not found', 404)

    return NextResponse.json({ job: data })
  } catch (error) {
    return jsonError(error)
  }
}
