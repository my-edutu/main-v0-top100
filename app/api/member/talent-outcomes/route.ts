import type { NextRequest } from 'next/server'
import { requireTalentMember, assertSameOrigin, readTalentBody, onlyFields, talentJson, talentError, id, talentRateLimit } from '@/lib/talent/api'
import { TalentInputError } from '@/lib/talent/contracts'
import { boundedText, choice, publicEvidenceUrl } from '@/lib/talent/transition-input'
export const runtime='nodejs'
export const dynamic='force-dynamic'
export async function POST(request:NextRequest){
  try{
    assertSameOrigin(request)
    const rate=await talentRateLimit(request,'QUERY','outcome'); if(rate)return rate
    const {db,user}=await requireTalentMember(request)
    const b=await readTalentBody(request);onlyFields(b,['introductionId','kind','summary','evidenceUrl','publicationPermission'])
    if(typeof b.publicationPermission!=='boolean')throw new TalentInputError('Choose whether this outcome may be considered for public reporting.')
    const result=await db.rpc('talent_record_outcome',{p_actor:user.id,p_introduction_id:id(b.introductionId),p_kind:choice(b.kind,['interview','offer','placement','scholarship','grant','mentorship','other']),p_summary:boundedText(b.summary,'Outcome summary',2000,10),p_evidence_url:publicEvidenceUrl(b.evidenceUrl??''),p_publication_permission:b.publicationPermission})
    if(result.error)throw result.error
    return talentJson({outcome:result.data},201)
  }catch(error){return talentError(error)}
}
