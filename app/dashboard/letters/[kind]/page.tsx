import { cookies } from 'next/headers'
import { isAndroidPlaySession } from '@/lib/play-distribution'
import { notFound } from 'next/navigation'
import { AwardLetterForm } from '../../_components/award-letters'

export default async function AwardLetterPage({ params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params
  if (kind !== 'recommendation' && kind !== 'invitation') notFound()

  const allowCheckout = !isAndroidPlaySession(await cookies())
  return <AwardLetterForm key={kind} kind={kind} allowCheckout={allowCheckout} />
}
