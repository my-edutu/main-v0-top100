import type { MemberProfile } from '@/lib/member-hub'

export const awardLettersPath = '/dashboard/letters'

export const letterOptions = {
  recommendation: {
    title: 'Recommendation letter',
    description: 'Support an application for a scholarship, job, programme or another opportunity.',
  },
  invitation: {
    title: 'Festival invitation letter',
    description: 'Confirm your invitation to the Africa Future Leaders Festival for travel or sponsorship.',
  },
} as const

export type LetterKind = keyof typeof letterOptions

export function recommendationFilename(purpose: string) {
  const safeTitle = purpose.replace(/[<>:"/\\|?*\p{C}]/gu, ' ').replace(/\s+/g, ' ').trim()
  const shortTitle = Array.from(safeTitle).slice(0, 55).join('').replace(/[. ]+$/, '')
  return shortTitle ? `${shortTitle} - Recommendation.pdf` : 'recommendation-letter.pdf'
}

export function canCreateAwardLetters(member: Pick<MemberProfile, 'status' | 'awardeeId'>) {
  return member.status !== 'suspended' && member.status !== 'rejected' &&
    (Boolean(member.awardeeId) || member.status === 'approved')
}
