'use client'

import { Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { directoryReturnHref } from '@/lib/talent/directory-state'

const linkClass = 'inline-flex min-h-11 items-center gap-2 text-sm text-stone-600 transition-colors hover:text-[#A94412] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A94412]'
function DirectoryLink({ href }: { href: string }) {
  return <Link href={href} className={linkClass}><ArrowLeft className="h-4 w-4" aria-hidden="true" /><span>Back to Leaders</span></Link>
}
function ResolvedLink({ year }: { year?: number | string | null }) {
  const params = useSearchParams()
  return <DirectoryLink href={directoryReturnHref(params.get('returnTo'), year)} />
}
export default function BackToLeaders({ year }: { year?: number | string | null }) {
  return <Suspense fallback={<DirectoryLink href={directoryReturnHref(null, year)} />}><ResolvedLink year={year} /></Suspense>
}
