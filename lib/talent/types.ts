export type TalentStatus = 'draft' | 'submitted' | 'approved' | 'changes_requested'
export type TalentInterest = 'Employment' | 'Internship' | 'Scholarship' | 'Fellowship' | 'Research' | 'Mentorship' | 'Speaking' | 'Project funding'
export type TalentProject = { title: string; role: string; description: string; outcome: string; url: string }
export type TalentEducation = { institution: string; qualification: string; field: string; year: string }
export type TalentDraft = {
  headline: string; summary: string; sector: string; country: string; city: string
  skills: string[]; languages: string[]; interests: TalentInterest[]
  workMode: 'Flexible' | 'Remote' | 'Hybrid' | 'On-site'; availability: string
  experience: string; projects: TalentProject[]; education: TalentEducation[]
  portfolioUrl: string; linkedinUrl: string
}
export type TalentRecord = {
  profile_id: string; draft: TalentDraft; published: TalentDraft | null
  revision: number; published_revision: number | null; publication_status: TalentStatus
  discovery_enabled: boolean; introductions_enabled: boolean; promotion_enabled: boolean
  outreach_email_opt_out: boolean; consent_version: string | null; review_note: string | null
  created_at: string; updated_at: string
}
export type TalentCard = {
  id: string; slug: string; name: string; avatarUrl: string | null; year: string | null
  headline: string; sector: string; country: string; skills: string[]; interests: TalentInterest[]
  workMode: TalentDraft['workMode']; availability: string; updatedAt: string
}
export type TalentPublicProfile = TalentCard & {
  details: TalentDraft; introductionsEnabled: boolean; publishedRevision: number
  checks: { scope: string; claimIndex: number | null; method: string; checkedAt: string }[]
}
export type TalentFilters = {
  q: string; sector: string; skill: string; country: string; interest: string; language: string
  workMode: string; year: number | null; limit: number; cursor: string | null
}
export type TalentPage = { people: TalentCard[]; nextCursor: string | null; total: number }
export type TalentVisibilityInput = {
  discoveryEnabled: boolean; introductionsEnabled: boolean; promotionEnabled: boolean
  outreachEmailOptOut: boolean; policyVersion: string
}
export type TalentRequestInput = {
  organisation: string; website: string; contactName: string; email: string; title: string
  kind: TalentInterest; description: string; skills: string[]; country: string; workMode: string
  places: number; compensation: string; deadline: string; talentSlug: string; consent: true
}
export type IntroductionStatus = 'awaiting_member' | 'accepted' | 'declined' | 'introduced' | 'withdrawn' | 'reported' | 'closed' | 'expired'
export type ApplicationStage = 'saved' | 'preparing' | 'applied' | 'interview' | 'offer' | 'unsuccessful' | 'withdrawn'
