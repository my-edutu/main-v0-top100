'use client'
import Link from 'next/link'

export default function OnboardingPage() {
  return (
    <section
      className="grid min-h-[45dvh] place-items-center px-4 text-center"
      aria-labelledby="opening-dashboard-title"
    >
      <div>
        <h1 id="opening-dashboard-title" className="text-xl font-semibold">
          Your profile setup is complete.
        </h1>
        <p className="mt-2 text-sm text-neutral-600">
          Continue to your dashboard to meet your awardee community.
        </p>
        <Link
          href="/dashboard"
          className="mt-4 inline-flex min-h-11 items-center font-medium text-orange-800 underline underline-offset-4"
        >
          Continue to dashboard
        </Link>
      </div>
    </section>
  )
}
