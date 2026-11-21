import type { ReactNode } from 'react'
import { AwardLetterDraft } from '../../_components/award-letters'

export default function LetterLayout({ children }: { children: ReactNode }) {
  return <AwardLetterDraft>{children}</AwardLetterDraft>
}
