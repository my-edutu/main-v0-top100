import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/server'
import { ogMetadata } from '@/lib/og'
export const metadata = {
  title: 'Your communication preference',
  robots: { index: false, follow: false },
  referrer: 'no-referrer' as const,
  ...ogMetadata({ title: 'Your communication preference', eyebrow: 'Top100 Africa Future Leaders' }),
}
export default async function StopAwardOutreach({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const valid = z.string().uuid().safeParse(token).success
  const result = valid ? await createAdminClient().from('award_outreach_contacts').select('suppressed').eq('token', token).maybeSingle() : null
  const ready = result && !result.error ? result.data : null
  return <main className="mx-auto my-16 max-w-lg rounded-2xl border bg-white p-7 text-stone-900"><p className="text-sm text-orange-800">Top100 Africa Future Leaders</p><h1 className="my-4 text-2xl font-semibold">{ready?.suppressed ? 'Award outreach stopped' : 'Your communication preference'}</h1>
    {ready?.suppressed ? <p>You will be excluded from future award outreach. This does not change your recognition, account or payment status.</p> : ready ? <><p className="mb-6">Stop optional award outreach messages. Your recognition and account remain available.</p><form method="post" action={`/api/award-outreach/${token}/stop`}><button className="min-h-12 rounded-xl bg-amber-300 px-5 font-medium">Stop award outreach</button></form></> : <p>This link is unavailable. Contact info@top100afl.com for help.</p>}</main>
}
