import { ArrowRight } from 'lucide-react'

import { Button } from '@/components/ui/button'

const PARTNERSHIP_GOOGLE_FORM_URL =
  process.env.NEXT_PUBLIC_PARTNERSHIP_GOOGLE_FORM_URL || 'https://docs.google.com/forms'

const PARTNERSHIP_BACKGROUND_VIDEO_URL =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260418_115655_b4d9cd77-feed-43cd-a198-af78ebdf1f7a.mp4'

export default function PartnershipHeroSection() {
  return (
    <section id="partner-with-us" className="px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
      <div className="container">
        <div className="relative mx-auto overflow-hidden rounded-[32px] shadow-[0_24px_80px_-40px_rgba(15,23,42,0.78)]">
          <video
            autoPlay
            muted
            loop
            playsInline
            className="pointer-events-none absolute inset-0 h-full w-full object-cover"
            aria-hidden="true"
            preload="metadata"
          >
            <source src={PARTNERSHIP_BACKGROUND_VIDEO_URL} type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(15,23,42,0.2),rgba(2,6,23,0.78)_70%)]" />

          <div className="relative z-10 flex min-h-[360px] items-center justify-center px-4 py-12 text-center sm:min-h-[400px] sm:px-6 lg:min-h-[430px]">
            <div className="flex flex-col items-center gap-8">
              <div className="space-y-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.34em] text-white/75">
                  Partnerships
                </p>
                <h2 className="max-w-4xl text-balance text-4xl font-semibold tracking-tight text-[#fff] drop-shadow-lg sm:text-5xl lg:text-6xl">
                  Partner with Top100 on a shared mission.
                </h2>
              </div>

              <Button asChild className="h-14 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 px-8 text-[#fff] shadow-none hover:opacity-95">
                <a href={PARTNERSHIP_GOOGLE_FORM_URL} target="_blank" rel="noreferrer">
                  Start application
                  <ArrowRight className="ml-2 h-4 w-4" />
                </a>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
