import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-server'
import { createAdminClient } from '@/lib/supabase/server'
import { checkRateLimit, createRateLimitResponse, RATE_LIMITS } from '@/lib/rate-limit'
import { interestSchema } from '@/lib/programme-manager/interest'
const headers = { 'Cache-Control': 'private, no-store' }
export async function GET() {
 const user = await getCurrentUser(); if (!user?.id) return NextResponse.json({ message:'Authentication required.' }, { status:401, headers })
 const db = createAdminClient(); const [activities, interests] = await Promise.all([db.from('programme_manager_activities').select('id,title,month,format').eq('status','approved').eq('open_for_interest',true).order('month'), db.from('programme_manager_interests').select('id,kind,activity_id').eq('member_id',user.id)])
 if (activities.error || interests.error) return NextResponse.json({ message:'Programme interest is unavailable.' }, { status:503, headers })
 return NextResponse.json({ activities:activities.data, interests:interests.data }, { headers })
}
export async function POST(request: Request) {
 const user = await getCurrentUser(); if (!user?.id) return NextResponse.json({ message:'Authentication required.' }, { status:401, headers })
 const rate = await checkRateLimit({ ...RATE_LIMITS.AUTH, identifier:`programme-interest:${user.id}` }); if (!rate.success) return createRateLimitResponse(rate, 'Please wait before trying again.')
 const parsed = interestSchema.safeParse(await request.json().catch(() => null)); if (!parsed.success) return NextResponse.json({ message:'Choose an option and give consent.' }, { status:400, headers })
 const { data, error } = await createAdminClient().from('programme_manager_interests').insert({ member_id:user.id, kind:parsed.data.kind, activity_id:parsed.data.activity_id }).select('id,kind,activity_id').single()
 if (error) return NextResponse.json({ message:error.code === '23505' ? 'Your interest is already recorded.' : 'Interest could not be saved. The activity may no longer be open.' }, { status:409, headers })
 return NextResponse.json({ interest:data }, { status:201, headers })
}
export async function DELETE(request: Request) {
 const user = await getCurrentUser(); if (!user?.id) return NextResponse.json({ message:'Authentication required.' }, { status:401, headers })
 const body = await request.json().catch(() => null); const id = typeof body?.id === 'string' ? body.id : ''
 if (!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(id)) return NextResponse.json({ message:'Invalid interest.' }, { status:400, headers })
 const { error } = await createAdminClient().from('programme_manager_interests').delete().eq('id',id).eq('member_id',user.id)
 if (error) return NextResponse.json({ message:'Could not withdraw interest.' }, { status:500, headers })
 return NextResponse.json({ message:'Interest withdrawn.' }, { headers })
}
