import { NextRequest,NextResponse } from 'next/server'
import { rejectCrossOriginMutation } from '@/lib/security/same-origin'
import { requireAdmin } from '@/lib/api/require-admin'
import { createAdminClient } from '@/lib/supabase/server'
import { adminBookingActionSchema } from '@/lib/interviews/booking-schema'
export async function GET(request:NextRequest) {
 const auth=await requireAdmin(request);if('error'in auth)return auth.error
 const db=createAdminClient();const [apps,bookings,events,settings,outbox]=await Promise.all([db.from('interview_applications').select('*').order('created_at',{ascending:false}),db.from('interview_bookings').select('*').order('revision',{ascending:false}),db.from('interview_booking_events').select('*').order('created_at',{ascending:false}).limit(100),db.from('interview_scheduling_settings').select('*').eq('id',true).single(),db.from('interview_notification_outbox').select('id,event_key,channel,state,attempts,last_error,created_at').in('state',['failed','processing']).order('created_at',{ascending:false}).limit(30)])
 if(apps.error||bookings.error||events.error||settings.error||outbox.error)return NextResponse.json({message:'Interview booking tables are not ready. Apply the internal interview booking migration.'},{status:503})
 return NextResponse.json({applications:apps.data,bookings:bookings.data,events:events.data,settings:settings.data,outbox:outbox.data})
}
export async function POST(request:NextRequest) {
  const originFailure=rejectCrossOriginMutation(request);if(originFailure)return originFailure
 const auth=await requireAdmin(request);if('error'in auth)return auth.error
 const body=await request.json().catch(()=>null);const parsed=adminBookingActionSchema.safeParse(body);if(!parsed.success)return NextResponse.json({message:'Check the scheduling details.'},{status:400})
 const result=await createAdminClient().rpc('interview_booking_transition',{p_application_id:parsed.data.applicationId,p_actor_id:auth.user.id,p_actor_role:'admin',p_revision:parsed.data.revision??null,p_action:parsed.data.action,p_payload:{startsAt:parsed.data.startsAt,meetingUrl:parsed.data.meetingUrl,reason:parsed.data.reason}})
 if(result.error){const map:Record<string,string>={slot_conflict:'That time was just reserved. Choose another available time.',daily_capacity_reached:'The daily interview limit is full.',availability_not_configured:'Set working hours before proposing interview times.',outside_working_hours:'Choose a time inside the configured working hours.',insufficient_notice:'Interview times need at least 24 hours notice.',meeting_url_required:'Add a secure meeting link before proposing this time.',stale_revision:'This request changed. Refresh and try again.'};return NextResponse.json({message:map[result.error.message]??'Could not update this interview request.'},{status:result.error.code==='23P01'?409:400})}
 return NextResponse.json({ok:true,...result.data})
}

export async function PATCH(request:NextRequest) {
 const originFailure=rejectCrossOriginMutation(request);if(originFailure)return originFailure
 const auth=await requireAdmin(request);if('error'in auth)return auth.error
 const body=await request.json().catch(()=>null);const id=Number(body?.outboxId)
 if(!Number.isSafeInteger(id)||id<1||body?.action!=='retry')return NextResponse.json({message:'Choose a valid notification to retry.'},{status:400})
 const {data,error}=await createAdminClient().from('interview_notification_outbox').update({state:'pending',due_at:new Date().toISOString(),lease_until:null,last_error:null}).eq('id',id).in('state',['failed','pending']).select('id').maybeSingle()
 if(error)return NextResponse.json({message:'Could not retry this notification.'},{status:500})
 if(!data)return NextResponse.json({message:'This notification is already processing or delivered.'},{status:409})
 return NextResponse.json({ok:true})
}
