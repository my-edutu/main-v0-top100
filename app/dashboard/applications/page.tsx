import { notFound } from 'next/navigation'
import { talentDiscoveryEnabled } from '@/lib/talent/features'
import { UUID_PATTERN } from '@/lib/talent/contracts'
import { MemberApplications } from '@/components/talent/applications'
export const dynamic='force-dynamic'
export default async function ApplicationsPage({searchParams}:{searchParams:Promise<{opportunity?:string}>}){if(!talentDiscoveryEnabled())notFound();const query=await searchParams;return <MemberApplications opportunityId={query.opportunity&&UUID_PATTERN.test(query.opportunity)?query.opportunity:''}/>}
