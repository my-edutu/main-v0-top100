import type { NextRequest } from 'next/server'
import { requireTalentMember, assertSameOrigin, readTalentBody, onlyFields, talentJson, talentError, id, revision, talentRateLimit } from '@/lib/talent/api'
import { boundedText, choice } from '@/lib/talent/transition-input'
export const runtime='nodejs'
export const dynamic='force-dynamic'
export async function GET(request:NextRequest){
  try{
    const rate=await talentRateLimit(request,'QUERY','introductions'); if(rate)return rate
    const {db,user}=await requireTalentMember(request)
    const cursor=request.nextUrl.searchParams.get('cursor'); if(cursor)id(cursor)
    let query=db.from('talent_introductions').select('id,request_id,profile_id,status,revision,introduction_note,member_note,created_at,updated_at,expires_at').eq('profile_id',user.id).order('id',{ascending:true}).limit(26)
    if(cursor)query=query.gt('id',cursor)
    const result=await query; if(result.error)throw result.error
    const rows=(result.data??[]).slice(0,25)
    const briefs=rows.length?await db.from('talent_requests').select('id,organisation,website,title,kind,description,skills,country,work_mode,places,compensation,deadline').in('id',[...new Set(rows.map(row=>row.request_id))]):{data:[],error:null}
    if(briefs.error)throw briefs.error
    const map=new Map((briefs.data??[]).map(row=>[row.id,row]))
    return talentJson({introductions:rows.map(row=>({...row,brief:map.get(row.request_id)??null})),nextCursor:(result.data??[]).length>25?rows[rows.length-1].id:null})
  }catch(error){return talentError(error)}
}
export async function PATCH(request:NextRequest){
  try{
    assertSameOrigin(request)
    const rate=await talentRateLimit(request,'QUERY','introduction-response'); if(rate)return rate
    const {db,user}=await requireTalentMember(request)
    const b=await readTalentBody(request); onlyFields(b,['introductionId','revision','decision','note'])
    const result=await db.rpc('talent_respond_introduction',{p_actor:user.id,p_introduction_id:id(b.introductionId),p_revision:revision(b.revision),p_decision:choice(b.decision,['accepted','declined','withdrawn','reported']),p_note:boundedText(b.note??'','Response note')})
    if(result.error)throw result.error
    return talentJson({introduction:result.data})
  }catch(error){return talentError(error)}
}
