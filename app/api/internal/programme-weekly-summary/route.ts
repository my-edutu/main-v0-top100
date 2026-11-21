import { timingSafeEqual } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { selectPriorities } from '@/lib/programme-manager/priorities'
import { deliveryReadiness } from '@/lib/programme-manager/budget'
export const runtime = 'nodejs'
export async function POST(request:NextRequest) {
 const expected=Buffer.from(process.env.CRON_SECRET ?? ''); const received=Buffer.from(request.headers.get('authorization')?.replace(/^Bearer\s+/i,'') ?? '')
 if (!expected.length || expected.length!==received.length || !timingSafeEqual(expected,received)) return NextResponse.json({message:'Unauthorized.'},{status:401})
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Lagos',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())
 const date=new Date(`${today}T12:00:00Z`); date.setUTCDate(date.getUTCDate()-((date.getUTCDay()+6)%7)); const week=date.toISOString().slice(0,10)
 const db=createAdminClient(); const [tasks,activities]=await Promise.all([db.from('programme_manager_tasks').select('id,title,programme,owner,due_date,priority,status,blocker'),db.from('programme_manager_activities').select('title,month,status,costs,cash_received')])
 if(tasks.error || activities.error) return NextResponse.json({message:'Summary data unavailable.'},{status:503})
 const open=(tasks.data ?? []).filter(t=>t.status!=='done')
 const gaps=(activities.data ?? []).map(a=>({title:a.title,...deliveryReadiness(a.costs,a.cash_received)})).filter(a=>!a.ready)
 const report={ priorities:selectPriorities(open,today), overdue:open.filter(t=>t.due_date && t.due_date<today).length, blocked:open.filter(t=>t.status==='blocked').length, undated:open.filter(t=>!t.due_date).length, funding_gaps:gaps, month_activities:today.startsWith('2027-')?(activities.data ?? []).filter(a=>a.month===Number(today.slice(5,7))).map(a=>({title:a.title,status:a.status})):[] }
 const {error}=await db.from('programme_manager_weekly_reports').upsert({week_start:week,generated_at:new Date().toISOString(),report},{onConflict:'week_start'})
 if(error) return NextResponse.json({message:'Could not save summary.'},{status:503})
 return NextResponse.json({week_start:week})
}
