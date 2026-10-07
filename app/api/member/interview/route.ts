import { NextRequest, NextResponse } from 'next/server'
import { rejectCrossOriginMutation } from '@/lib/security/same-origin'
import { getCurrentUser } from '@/lib/auth-server'
import { createAdminClient } from '@/lib/supabase/server'
import { interviewRequestSchema } from '@/lib/interviews/booking-schema'

export async function GET() {
  const user = await getCurrentUser()
  if (!user?.id) return NextResponse.json({ message:'Authentication required.' },{status:401})
  const db=createAdminClient()
  const {data:application,error}=await db.from('interview_applications').select('id,interview_topic,impact_story,request_format,member_timezone,preferred_windows,additional_note,publication_consent,booking_status,created_at').eq('member_id',user.id).order('created_at',{ascending:false}).limit(1).maybeSingle()
  if(error) return NextResponse.json({message:'Could not load your interview request.'},{status:503})
  if(!application) return NextResponse.json({application:null,booking:null,events:[],teamTimezone:'Africa/Lagos'})
  const [{data:booking},{data:events},{data:settings}]=await Promise.all([db.from('interview_bookings').select('id,starts_at,ends_at,state,revision,expires_at,meeting_url,member_reason,calendar_uid').eq('application_id',application.id).order('revision',{ascending:false}).limit(1).maybeSingle(),db.from('interview_booking_events').select('action,revision,created_at').eq('application_id',application.id).order('created_at',{ascending:false}).limit(30),db.from('interview_scheduling_settings').select('team_timezone').eq('id',true).maybeSingle()])
  return NextResponse.json({application,booking,events:events??[],teamTimezone:settings?.team_timezone??'Africa/Lagos'},{headers:{'Cache-Control':'no-store'}})
}

export async function POST(request:NextRequest) {
  const originFailure=rejectCrossOriginMutation(request);if(originFailure)return originFailure
  const user=await getCurrentUser()
  if(!user?.id) return NextResponse.json({message:'Authentication required.'},{status:401})
  const body=await request.json().catch(()=>null)
  const parsed=interviewRequestSchema.safeParse(body)
  if(!parsed.success) return NextResponse.json({message:'Check the request details and consent before sending.'},{status:400})
  const db=createAdminClient()
  const {data:profile,error}=await db.from('profiles').select('id,email,full_name,role').eq('id',user.id).maybeSingle()
  if(error||!profile?.email) return NextResponse.json({message:'We could not find the email on your member profile.'},{status:404})
  const result=await db.rpc('interview_submit_request',{p_member_id:user.id,p_email:profile.email,p_name:profile.full_name||profile.email,p_payload:parsed.data})
  if(result.error) return NextResponse.json({message:'Could not submit your interview request. Please try again.'},{status:500})
  return NextResponse.json({ok:true,existing:result.data?.existing===true,message:result.data?.existing?'You already have an active interview request.':'Request received. Your interview is not scheduled yet.'},{status:result.data?.existing?200:201})
}
