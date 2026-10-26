import { NextResponse } from 'next/server'
import { ApiError, apiAdmin, jsonError } from '@/lib/api'
import { createAdminClient } from '@/lib/supabase/admin'
import { importCommitSchema } from '@/lib/validation'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

export async function POST(request: Request) {
  try {
    const member = await apiAdmin()
    const payload = importCommitSchema.parse(await request.json())
    const admin = createAdminClient()

    const { data: job, error } = await admin
      .from('team_import_jobs')
      .select('id, team_id, status, filename, summary')
      .eq('id', payload.jobId)
      .eq('team_id', member.membership.team_id)
      .maybeSingle()
    if (error) throw new ApiError('Could not load the import', 500)
    if (!job) throw new ApiError('Import not found', 404)
    if (job.status !== 'previewed') throw new ApiError('This import has already been committed', 409)

    const { data, error: rpcError } = await admin.rpc('team_commit_import', {
      p_job_id: job.id,
      p_actor: member.user.id,
    })
    if (rpcError) {
      if (/changed since preview/i.test(rpcError.message)) {
        throw new ApiError('An awardee changed since the preview. Preview the file again.', 409)
      }
      throw new ApiError(rpcError.message, 400)
    }

    return NextResponse.json({ result: data, filename: job.filename })
  } catch (error) {
    return jsonError(error)
  }
}
