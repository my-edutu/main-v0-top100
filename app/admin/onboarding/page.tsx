import PageHeader from '../components/PageHeader'
import { OnboardingSettingsForm } from './settings-form'

export default function AwardeeOnboardingAdminPage() {
  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        eyebrow="Africa Future Leaders"
        title="Awardee onboarding"
        description="Edit the welcome journey, verified social destinations, flyer artwork and magazine campaign shown to awardees."
      />
      <OnboardingSettingsForm />
    </div>
  )
}
