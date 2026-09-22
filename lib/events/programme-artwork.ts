import { PROGRAMME_SCHEDULE } from './programme'

export type ProgrammeArtwork = {
  src: string
  title: string
  alt: string
}

const fileNames: Record<number, string> = {
  0: 'onboarding',
  1: 'global-talent-playbook',
  2: 'beyond-the-paycheck',
  3: 'from-expertise-to-authority',
  4: 'leadership-multiplier',
  5: 'africas-hard-problems',
  6: 'ai-native-leadership',
  7: 'from-knowledge-to-ideas',
  8: 'collaboration-advantage',
  9: 'beyond-the-initiative',
  10: 'the-10-year-question',
}

export const PROGRAMME_ARTWORK: Record<number, ProgrammeArtwork> = Object.fromEntries(
  PROGRAMME_SCHEDULE.map(item => [item.sessionNumber, {
    src: `/programme/afl-october-2026/${fileNames[item.sessionNumber]}.png`,
    title: item.title,
    alt: `${item.title} — Africa Future Leaders October 2026`,
  }]),
)
