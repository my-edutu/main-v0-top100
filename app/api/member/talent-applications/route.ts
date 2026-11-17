import type { NextRequest } from 'next/server'
import { requireTalentMember, assertSameOrigin, readTalentBody, onlyFields, talentJson, talentError, id, talentRateLimit } from '@/lib/talent/api'
import { APPLICATION_STAGES } from '@/lib/talent/contracts'
import { boundedText, choice } from '@/lib/talent/transition-input'
export const runtime='nodejs'
export const dynamic='force-dynamic'
export async function GET(request:NextRequest){
  try{
    const rate=await talentRateLimit(request,'QUERY','applications');if(rate)return rate
    const {db,user}=await requireTalentMember(request)
    const cursor=request.nextUrl.searchParams.get('cursor');if(cursor)id(cursor)
    let query=db.from('talent_applications').select('id,opportunity_id,stage,notes,reported_by,updated_at').eq('profile_id',user.id).order('id',{ascending:true}).limit(26)
    if(cursor)query=query.gt('id',cursor)
    const result=await query;if(result.error)throw result.error
    const rows=(result.data??[]).slice(0,25)
    const opps=rows.length?await db.from('opportunities').select('id,title,organization,application_url,deadline').in('id',rows.map(row=>row.opportunity_id)).in('visibility',['public','members','approved']).in('status',['published','closed']):{data:[],error:null}
    if(opps.error)throw opps.error
    const map=new Map((opps.data??[]).map(row=>[row.id,row]))
    let selectedOpportunity=null
    const chosen=request.nextUrl.searchParams.get('opportunityId')
    if(chosen){
      const detail=await db.from('opportunities').select('title,organization,application_url,deadline').eq('id',id(chosen)).eq('status','published').in('visibility',['public','members','approved']).maybeSingle()
      if(detail.error)throw detail.error
      selectedOpportunity=detail.data
    }
    return talentJson({selectedOpportunity,applications:rows.map(row=>({...row,opportunity:map.get(row.opportunity_id)??null})),nextCursor:(result.data??[]).length>25?rows[rows.length-1].id:null})
  }catch(error){return talentError(error)}
}
export async function PATCH(request:NextRequest){
  try{
    assertSameOrigin(request)
    const rate=await talentRateLimit(request,'QUERY','application-update');if(rate)return rate
    const {db,user}=await requireTalentMember(request)
    const b=await readTalentBody(request);onlyFields(b,['opportunityId','stage','notes'])
    const result=await db.rpc('talent_record_application',{p_actor:user.id,p_opportunity_id:id(b.opportunityId),p_stage:choice(b.stage,APPLICATION_STAGES,'application stage'),p_notes:boundedText(b.notes??'','Notes')})
    if(result.error)throw result.error
    return talentJson({application:result.data})
  }catch(error){return talentError(error)}
}
