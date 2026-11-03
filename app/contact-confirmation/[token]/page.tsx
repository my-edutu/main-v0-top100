import { notFound } from 'next/navigation'
import { z } from 'zod'
import { ogMetadata } from '@/lib/og'
import ContactConfirmation from './confirmation'

export const metadata = {
  title: 'Confirm your contact response',
  robots: { index: false, follow: false }, referrer: 'no-referrer' as const,
  ...ogMetadata({ title: 'Confirm your contact response', eyebrow: 'Top100 Africa Future Leaders' }),
}
export default async function ContactConfirmationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  if (!z.string().uuid().safeParse(token).success) notFound()
  return <ContactConfirmation key={token} token={token} />
}
