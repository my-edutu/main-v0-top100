import type { NextRequest } from 'next/server'
import { requireTalentAdmin, assertSameOrigin, readTalentBody, onlyFields, talentJson, talentError } from '@/lib/talent/api'
import { TalentInputError } from '@/lib/talent/contracts'
import { talentLaunchFlags } from '@/lib/talent/features'
import { talentUpgradeEmail } from '@/lib/talent/email-template'
import { sendUpgradeBatch, TALENT_EMAIL_CONFIRMATION, upgradeOrigin } from '@/lib/talent/upgrade-email'
export const runtime='nodejs'
export const dynamic='force-dynamic'
export async function GET(request:NextRequest){
  try{
    const {db,user}=await requireTalentAdmin(request)
    const role=await db.from('profiles').select('role').eq('id',user.id).maybeSingle();if(role.error)throw role.error
    const statuses=['sending','sent','failed','unknown','skipped'] as const
    const counts=await Promise.all(statuses.map(status=>db.from('talent_upgrade_deliveries').select('profile_id',{count:'exact',head:true}).eq('status',status)))
    for(const result of counts)if(result.error)throw result.error
    return talentJson({preview:talentUpgradeEmail('Top100 member',upgradeOrigin()),flags:talentLaunchFlags(),superadmin:role.data?.role==='superadmin',counts:Object.fromEntries(statuses.map((status,index)=>[status,counts[index].count??0])),canSend:role.data?.role==='superadmin'&&process.env.NODE_ENV==='production'&&new URL(request.url).origin===upgradeOrigin()&&Object.values(talentLaunchFlags()).every(Boolean),confirmation:TALENT_EMAIL_CONFIRMATION})
  }catch(error){return talentError(error)}
}
export async function POST(request:NextRequest){
  try{
    assertSameOrigin(request)
    const {db,user}=await requireTalentAdmin(request)
    const body=await readTalentBody(request);onlyFields(body,['confirmation','limit'])
    if(body.confirmation!==TALENT_EMAIL_CONFIRMATION)throw new TalentInputError('Type the release confirmation exactly before sending.')
    if(!Number.isInteger(body.limit)||Number(body.limit)<1||Number(body.limit)>10)throw new TalentInputError('Send a bounded batch of one to ten members.')
    return talentJson(await sendUpgradeBatch(db,user.id,Number(body.limit),new URL(request.url).origin))
  }catch(error){return talentError(error)}
}
