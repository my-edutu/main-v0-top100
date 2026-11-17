import { notFound } from 'next/navigation'
import { talentDiscoveryEnabled } from '@/lib/talent/features'
import { MemberIntroductions } from '@/components/talent/introductions'
export const dynamic='force-dynamic'
export default function IntroductionsPage(){if(!talentDiscoveryEnabled())notFound();return <MemberIntroductions/>}
