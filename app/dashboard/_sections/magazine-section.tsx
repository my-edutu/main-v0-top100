import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, Download } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { magazineEditions } from '@/lib/magazines'

export function MagazineSection() {
  return (
    <Card className="rounded-[30px] border-orange-100 bg-white shadow-none">
      <CardContent className="space-y-5 p-5 sm:p-7">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-black">Magazine library.</h2>
            <p className="mt-2 max-w-xl text-sm font-medium leading-6 text-black/60">
              Read or download any edition, then apply to feature your story, startup, project, or product.
            </p>
          </div>
          <Button asChild className="rounded-full bg-[#050505] px-7 py-6 text-[#fffaf0] hover:bg-[#171717]">
            <Link href="/magazine">
              Open public library
              <ArrowRight className="ml-2 h-4 w-4" strokeWidth={2.8} />
            </Link>
          </Button>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="grid gap-4 sm:grid-cols-2">
            {magazineEditions.map((magazine) => (
              <article key={magazine.year} className="overflow-hidden rounded-[28px] border border-orange-100 bg-white">
                <div className="relative min-h-[260px] overflow-hidden bg-black">
                  <Image
                    src={magazine.cover}
                    alt={magazine.title}
                    fill
                    sizes="(min-width: 1024px) 30vw, 100vw"
                    className="object-cover transition duration-500 hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.02)_0%,rgba(0,0,0,0.7)_100%)]" />
                  <div className="absolute left-4 right-4 top-4 flex items-center justify-between gap-2">
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-black">
                      {magazine.year}
                    </span>
                    {magazine.isLatest ? (
                      <span className="rounded-full bg-orange-500 px-3 py-1 text-xs font-semibold text-[#fffaf0]">
                        Latest
                      </span>
                    ) : null}
                  </div>
                </div>
                <div className="space-y-4 p-5">
                  <div>
                    <h3 className="text-xl font-bold tracking-tight text-black">{magazine.title}</h3>
                    <p className="mt-1 text-sm font-medium text-black/55">{magazine.subtitle}</p>
                    <p className="mt-2 text-sm font-medium leading-6 text-black/60">{magazine.description}</p>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Button asChild className="rounded-full bg-[#050505] text-[#fffaf0] hover:bg-[#171717]">
                      <Link href={magazine.readHref}>
                        Read
                        <ArrowRight className="ml-2 h-4 w-4" strokeWidth={2.8} />
                      </Link>
                    </Button>
                    <Button
                      asChild
                      variant="outline"
                      className="rounded-full border-orange-200 text-black hover:bg-orange-50"
                    >
                      <Link href={magazine.downloadLink} target="_blank" rel="noopener noreferrer">
                        Download
                        <Download className="ml-2 h-4 w-4" strokeWidth={2.8} />
                      </Link>
                    </Button>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <div className="rounded-[28px] bg-orange-500 p-6 text-black">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-black/60">Feature request</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight">Apply to feature in the magazine.</h2>
            <p className="mt-2 text-sm font-medium leading-6 text-black/65">
              Submit your BIO, founder story, product, research, impact project, or startup for magazine team review.
            </p>
            <div className="mt-6 grid gap-3">
              {['Awardee story', 'Product or startup', 'Impact project', 'Research or article'].map((item) => (
                <div key={item} className="rounded-2xl bg-[#fffaf0] px-4 py-3 text-sm font-semibold text-black">
                  {item}
                </div>
              ))}
            </div>
            <Button asChild className="mt-7 rounded-full bg-[#050505] px-7 py-6 text-[#fffaf0] hover:bg-[#171717]">
              <Link href="/dashboard/me/feature">
                Apply to feature
                <ArrowRight className="ml-2 h-4 w-4" strokeWidth={2.8} />
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
