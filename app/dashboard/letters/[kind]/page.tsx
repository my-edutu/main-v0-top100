import { notFound } from 'next/navigation'
import { AwardLetterForm } from '../../_components/award-letters'

export default async function AwardLetterPage({ params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params
  if (kind !== 'recommendation' && kind !== 'invitation') notFound()

  return <AwardLetterForm key={kind} kind={kind} />
}
