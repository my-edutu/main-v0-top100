import { NextRequest,NextResponse } from 'next/server'
import { rejectCrossOriginMutation } from '@/lib/security/same-origin'
import { getCurrentUser } from '@/lib/auth-server'
import { createAdminClient } from '@/lib/supabase/server'
import { bookingActionSchema } from '@/lib/interviews/booking-schema'
export async function POST(request:NextRequest,{params}:{params:Promise<{id:string}>}) {
 const originFailure=rejectCrossOriginMutation(request);if(originFailure)return originFailure
 const user=await getCurrentUser(); if(!user?.id)return NextResponse.json({message:'Authentication required.'},{status:401})
 const {id}=await params; const body=await request.json().catch(()=>null);const parsed=bookingActionSchema.safeParse(body)
 if(!parsed.success)return NextResponse.json({message:'Invalid interview action.'},{status:400})
 const result=await createAdminClient().rpc('interview_booking_transition',{p_application_id:id,p_actor_id:user.id,p_actor_role:'member',p_revision:parsed.data.revision,p_action:parsed.data.action,p_payload:{reason:parsed.data.reason??null}})
 if(result.error)return NextResponse.json({message:result.error.message==='stale_revision'?'This appointment changed. Refresh to see the latest time.':result.error.message==='proposal_expired'?'This proposed time has expired.':'Could not update this interview request.'},{status:result.error.code==='42501'?403:result.error.message==='stale_revision'?409:400})
 return NextResponse.json({ok:true,...result.data})
}
