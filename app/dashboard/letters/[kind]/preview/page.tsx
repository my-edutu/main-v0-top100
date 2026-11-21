import { notFound } from 'next/navigation'
import { AwardLetterPreview } from '../../../_components/award-letters'

export default async function LetterPreviewPage({ params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params
  if (kind !== 'recommendation' && kind !== 'invitation') notFound()

  return <AwardLetterPreview kind={kind} />
}
