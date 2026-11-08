'use client'
import Link from 'next/link'
import { ArrowUpRight, BriefcaseBusiness, Globe2 } from 'lucide-react'
import { useTalentMember } from './use-talent'
import { primaryClass, secondaryClass } from './ui'
export function TalentDashboardCallout() {
  const { data, disabled, loading, error } = useTalentMember()
  if (disabled || loading || error || !data) return null
  return <section aria-labelledby="talent-welcome" className="mb-6 overflow-hidden rounded-[24px] border border-orange-200 bg-gradient-to-r from-orange-50 via-amber-50 to-white p-5 sm:p-7"><div className="flex items-start gap-4"><span className="hidden rounded-2xl bg-orange-100 p-3 text-orange-800 sm:block"><Globe2 className="size-6" aria-hidden="true" /></span><div className="min-w-0 flex-1"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-800">Your next chapter</p><h2 id="talent-welcome" className="mt-2 text-xl font-semibold tracking-tight text-stone-950 sm:text-2xl">Your profile can now do more.</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-stone-700">Add your skills, selected work and opportunity interests. Choose how organisations discover you, while keeping your awards and community in one place.</p><div className="mt-5 flex flex-wrap gap-3"><Link className={primaryClass} href="/dashboard/me/profile#talent-profile">Optimise my profile <ArrowUpRight size={16} /></Link><Link className={secondaryClass} href="/dashboard/introductions"><BriefcaseBusiness size={16} />Introductions</Link><Link className={secondaryClass} href="/dashboard/applications">My applications</Link></div><p className="mt-4 text-xs leading-5 text-stone-600">Talent discovery is {data.talent.discovery_enabled ? 'enabled for reviewed details' : 'off until you choose to enable it'}. <Link className="font-semibold underline underline-offset-4" href="/dashboard/me/settings#talent-privacy">Manage visibility or opt out in Settings.</Link></p></div></div></section>
}
