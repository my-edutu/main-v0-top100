import type { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { assertTalentEnabled, requireTalentMember, talentJson, talentError, talentRateLimit, id } from '@/lib/talent/api'
import { OPPORTUNITY_COLUMNS, mapOpportunity, visibleTiersFor, sanitizeSearchTerm } from '@/lib/opportunities/server'
import { OPPORTUNITY_TYPES } from '@/lib/opportunities/types'
export const runtime='nodejs'
export const dynamic='force-dynamic'
export async function GET(request:NextRequest){
  try{
    assertTalentEnabled()
    const rate=await talentRateLimit(request,'QUERY','opportunity-list');if(rate)return rate
    const memberOnly=request.nextUrl.searchParams.get('audience')==='member'
    const member=memberOnly?await requireTalentMember(request):null
    const db=member?.db??createAdminClient()
    const tiers=visibleTiersFor(member?{status:member.profile.membership_status}:null)
    const type=request.nextUrl.searchParams.get('type')??''
    const q=sanitizeSearchTerm(request.nextUrl.searchParams.get('q')??'')
    const cursor=request.nextUrl.searchParams.get('cursor');if(cursor)id(cursor)
    const deadlines=`deadline.is.null,deadline.gte.${new Date().toISOString().slice(0,10)}`
    const visibleSearch=q?`and(or(${deadlines}),or(title.ilike.%${q}%,organization.ilike.%${q}%,summary.ilike.%${q}%))`:deadlines
    let query=db.from('opportunities').select(OPPORTUNITY_COLUMNS).eq('status','published').in('visibility',tiers).or(visibleSearch).order('id',{ascending:true}).limit(25)
    if(type&&(OPPORTUNITY_TYPES as readonly string[]).includes(type))query=query.eq('type',type)
    if(cursor)query=query.gt('id',cursor)
    const result=await query;if(result.error)throw result.error
    const rows=(result.data??[]).slice(0,24)
    return talentJson({opportunities:rows.map(row=>mapOpportunity(row)),nextCursor:(result.data??[]).length>24?rows[rows.length-1].id:null})
  }catch(error){return talentError(error)}
}
