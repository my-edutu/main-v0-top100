import EdutuIntroduction from './edutu-introduction'
import { TalentOpportunities } from '@/components/talent/opportunities'
import { talentDiscoveryEnabled } from '@/lib/talent/features'

export default function OpportunitiesPage() {
  return <>{talentDiscoveryEnabled() && <TalentOpportunities memberOnly />}<EdutuIntroduction /></>
}
