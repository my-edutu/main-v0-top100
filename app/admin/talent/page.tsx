import { TalentAdminWorkspace } from '@/components/talent/admin-workspace'
import { requireAdmin } from '@/lib/api/require-admin'
import { talentDiscoveryEnabled } from '@/lib/talent/features'
export const dynamic='force-dynamic'
export default async function TalentAdminPage(){
  const check=await requireAdmin()
  if('error' in check)return <p className="p-6">Administrator access is required.</p>
  if(!talentDiscoveryEnabled())return <section className="m-6 rounded-2xl border border-orange-200 bg-orange-50 p-6"><h1 className="text-xl font-semibold text-stone-900">Talent Network is disabled in this environment.</h1><p className="mt-3 text-sm text-stone-700">Apply the reviewed schema to an isolated database and set TALENT_DISCOVERY_ENABLED=true for local review. Do not enable production email sending on a review branch.</p></section>
  return <TalentAdminWorkspace/>
}
