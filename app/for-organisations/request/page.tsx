import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { talentDiscoveryEnabled } from '@/lib/talent/features'
import { TalentRequestForm } from '@/components/talent/request-form'
export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Submit a Talent Brief | Top100', robots: { index: false, follow: true } }
export default async function TalentRequestPage({ searchParams }: { searchParams: Promise<{ talent?: string }> }) {
  if (!talentDiscoveryEnabled()) notFound()
  const query = await searchParams
  const slug = query.talent && /^[a-z0-9-]{1,160}$/i.test(query.talent) ? query.talent : ''
  return <main className="mx-auto max-w-3xl px-5 py-10 sm:px-8"><Link href="/for-organisations" className="inline-flex min-h-11 items-center text-sm text-orange-800 hover:underline">← For organisations</Link><header className="mb-7 mt-4"><p className="text-xs font-semibold uppercase tracking-[.18em] text-orange-800">Talent introductions</p><h1 className="mt-3 text-3xl font-semibold tracking-tight text-stone-950 sm:text-4xl">Tell us who you need.</h1><p className="mt-4 text-base leading-7 text-stone-600">A clear brief helps us make a relevant introduction. Your contact details stay with the Top100 team and are not published in the directory.</p></header><TalentRequestForm talentSlug={slug} /></main>
}
