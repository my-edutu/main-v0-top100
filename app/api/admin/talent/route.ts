import type { NextRequest } from 'next/server'
import { requireTalentAdmin, assertSameOrigin, readTalentBody, onlyFields, talentJson, talentError, id, revision } from '@/lib/talent/api'
import { boundedText, choice } from '@/lib/talent/transition-input'
import { TalentInputError } from '@/lib/talent/contracts'
import { mapTalentRecord } from '@/lib/talent/profile-service'
import type { TalentRecord } from '@/lib/talent/types'
import type { WorkspaceTab } from '@/lib/talent/workspace-types'
export const runtime='nodejs'
export const dynamic='force-dynamic'
const BRIEF_COLUMNS='id,organisation,website,title,kind,description,skills,country,work_mode,places,compensation,deadline'
export async function GET(request:NextRequest) {
  try {
    const {db}=await requireTalentAdmin(request)
    if(request.nextUrl.searchParams.get('tab')==='checks'){
      const profileId=id(request.nextUrl.searchParams.get('profileId'))
      const checks=await db.from('talent_verifications').select('id,scope,claim_index,method,evidence_reference,published_revision,checked_at').eq('profile_id',profileId).is('revoked_at',null).order('checked_at',{ascending:false}).limit(50)
      if(checks.error)throw checks.error
      return talentJson({checks:checks.data??[]})
    }
    const tab=choice(request.nextUrl.searchParams.get('tab') || 'profiles',['profiles','requests','introductions','outcomes'],'workspace') as WorkspaceTab
    const cursor=request.nextUrl.searchParams.get('cursor')
    if(cursor) id(cursor,'Page reference')
    const table={profiles:'talent_profiles',requests:'talent_requests',introductions:'talent_introductions',outcomes:'talent_outcomes'}[tab]!
    const key=tab==='profiles'?'profile_id':'id'
    let query=db.from(table).select('*',{count:'exact'}).order(key,{ascending:true}).limit(26)
    const status=request.nextUrl.searchParams.get('status')
    if(status){
      const choices=tab==='profiles'?['draft','submitted','approved','changes_requested']:tab==='requests'?['new','qualified','declined','closed']:tab==='introductions'?['awaiting_member','accepted','declined','introduced','withdrawn','reported','closed','expired']:['self_reported','confirmed','rejected']
      choice(status,choices,'status'); query=query.eq(tab==='profiles'?'publication_status':tab==='outcomes'?'verification_status':'status',status)
    }
    if(cursor) query=query.gt(key,cursor)
    const result=await query
    if(result.error) throw result.error
    const rows=(result.data??[]).slice(0,25).map(row=>tab==='profiles'?mapTalentRecord(row as TalentRecord):row) as Record<string,unknown>[]
    const hasMore=(result.data??[]).length>25
    if(tab!=='requests' && rows.length){
      const ids=[...new Set(rows.map(row=>String(row.profile_id)))]
      const names=await db.from('profiles').select('id,full_name,slug').in('id',ids)
      if(names.error) throw names.error
      const map=new Map<string,{id:string;full_name:string|null;slug:string|null}>((names.data??[]).map((row:{id:string;full_name:string|null;slug:string|null})=>[row.id,row]))
      for(const row of rows){ const p=map.get(String(row.profile_id)); row.memberName=p?.full_name || 'Top100 member'; row.slug=p?.slug || null }
    }
    if(tab==='introductions' && rows.length){
      const briefs=await db.from('talent_requests').select(BRIEF_COLUMNS).in('id',[...new Set(rows.map(row=>String(row.request_id)))])
      if(briefs.error) throw briefs.error
      const map=new Map((briefs.data??[]).map(row=>[row.id,row])); for(const row of rows) row.brief=map.get(String(row.request_id))??null
    }
    return talentJson({[tab]:rows,nextCursor:hasMore?String(rows[rows.length-1][key]):null,total:result.count??0})
  }catch(error){return talentError(error)}
}
export async function POST(request:NextRequest){
  try{
    assertSameOrigin(request)
    const {db,user}=await requireTalentAdmin(request)
    const b=await readTalentBody(request)
    let result
    if(b.action==='review_profile'){
      onlyFields(b,['action','profileId','revision','decision','note'])
      result=await db.rpc('talent_review_profile',{p_actor:user.id,p_profile_id:id(b.profileId),p_revision:revision(b.revision),p_decision:choice(b.decision,['approve','changes_requested','unpublish']),p_note:boundedText(b.note,'Review note',2000,5)})
    }else if(b.action==='review_request'){
      onlyFields(b,['action','requestId','decision','note','organisationChecked'])
      if(typeof b.organisationChecked!=='boolean') throw new TalentInputError('Confirm your organisation review.')
      result=await db.rpc('talent_review_request',{p_actor:user.id,p_request_id:id(b.requestId),p_decision:choice(b.decision,['qualified','declined','closed']),p_note:boundedText(b.note,'Review note',2000,10),p_organisation_checked:b.organisationChecked})
    }else if(b.action==='propose_introduction'){
      onlyFields(b,['action','requestId','profileId','note'])
      result=await db.rpc('talent_propose_introduction',{p_actor:user.id,p_request_id:id(b.requestId),p_profile_id:id(b.profileId),p_note:boundedText(b.note,'Introduction note',2000,10)})
    }else if(b.action==='contacts'){
      onlyFields(b,['action','introductionId','revision'])
      result=await db.rpc('talent_introduction_contacts',{p_actor:user.id,p_introduction_id:id(b.introductionId),p_revision:revision(b.revision)})
    }else if(b.action==='finish_introduction'){
      onlyFields(b,['action','introductionId','revision','note','completed'])
      if(b.completed!==true) throw new TalentInputError('Confirm that you completed the approved introduction.')
      result=await db.rpc('talent_finish_introduction',{p_actor:user.id,p_introduction_id:id(b.introductionId),p_revision:revision(b.revision),p_note:boundedText(b.note,'Completion note',2000,10),p_completed:true})
    }else if(b.action==='review_claim'){
      onlyFields(b,['action','profileId','publishedRevision','scope','claimIndex','method','evidenceReference'])
      const scope=choice(b.scope,['recognition','academic','project'],'claim scope')
      const index=scope==='recognition'?null:revision(b.claimIndex)
      if(index!==null && index>7) throw new TalentInputError('Choose a claim from the published profile.')
      result=await db.rpc('talent_review_claim',{p_actor:user.id,p_profile_id:id(b.profileId),p_revision:revision(b.publishedRevision),p_scope:scope,p_claim_index:index,p_method:boundedText(b.method,'Public check method',160,5),p_reference:boundedText(b.evidenceReference,'Private evidence reference',1000,5)})
    }else if(b.action==='revoke_claim'){
      onlyFields(b,['action','verificationId','note'])
      result=await db.rpc('talent_revoke_claim',{p_actor:user.id,p_verification_id:id(b.verificationId),p_note:boundedText(b.note,'Revocation reason',1000,5)})
    }else if(b.action==='confirm_outcome'){
      onlyFields(b,['action','outcomeId','decision','reference','expectedUpdatedAt'])
      if(typeof b.expectedUpdatedAt!=='string'||Number.isNaN(Date.parse(b.expectedUpdatedAt))) throw new TalentInputError('Reload this outcome before reviewing it.')
      result=await db.rpc('talent_confirm_outcome',{p_actor:user.id,p_outcome_id:id(b.outcomeId),p_decision:choice(b.decision,['confirmed','rejected']),p_reference:boundedText(b.reference,'Confirmation reference',2000,10),p_expected_updated_at:b.expectedUpdatedAt})
    }else throw new TalentInputError('Choose a valid workspace action.')
    if(result.error) throw result.error
    return talentJson({result:result.data})
  }catch(error){return talentError(error)}
}
