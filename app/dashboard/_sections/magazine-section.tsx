import Image from 'next/image'
import Link from 'next/link'
import { ArrowUpRight, Download } from 'lucide-react'
import { magazineEditions } from '@/lib/magazines'

export function MagazineSection() {
  const editions = [...new Map(magazineEditions.map(edition => [edition.year, edition])).values()]
  return <div className="space-y-7">
    <Link href="/dashboard/me/feature" className="block rounded-2xl bg-[#ffcf9e] p-5 text-[#211d24]" style={{background:'#ffcf9e',color:'#211d24'}}>
      <div className="flex items-start justify-between gap-4">
        <h1 className="text-xl font-medium leading-snug">Apply for the 2026 magazine feature</h1>
        <ArrowUpRight className="mt-1 h-5 w-5 shrink-0" aria-hidden="true" />
      </div>
      <p className="mt-2 text-sm leading-6">Share your story, work or impact for editorial review.</p>
      <span className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold underline underline-offset-4">Apply to feature</span>
    </Link>
    <section aria-labelledby="magazine-editions">
      <h2 id="magazine-editions" className="mb-2 text-lg font-medium">Past editions</h2>
      <div className="grid gap-x-8 md:grid-cols-2">
        {editions.map(magazine => <article key={magazine.year} className="grid grid-cols-[88px_minmax(0,1fr)] gap-4 border-b border-stone-200 py-5 sm:grid-cols-[112px_minmax(0,1fr)]">
          <Link href={magazine.readHref} aria-label={`Read ${magazine.title}`} className="relative block aspect-[3/4] self-start overflow-hidden rounded-md">
            <Image src={magazine.cover} alt={magazine.title} fill sizes="(min-width:640px) 112px, 88px" className="object-contain" />
          </Link>
          <div className="min-w-0">
            <h3 className="text-base font-medium">{magazine.year} edition</h3>
            <p className="mt-1 text-sm leading-5 text-stone-600">{magazine.subtitle}</p>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
              <Link href={magazine.readHref} className="inline-flex min-h-11 items-center gap-1 text-sm font-medium underline underline-offset-4">Read <ArrowUpRight size={14} /></Link>
              <Link href={magazine.downloadLink} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-1 text-sm underline underline-offset-4">Download <Download size={14} /></Link>
            </div>
          </div>
        </article>)}
      </div>
    </section>
  </div>
}
