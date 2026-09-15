'use client'
import Link from 'next/link'
import { useEffect } from 'react'
import { LoaderCircle } from 'lucide-react'

export default function OnboardingPage() {
  useEffect(() => {
    window.location.replace('/dashboard')
  }, [])

  return (
    <section
      className="grid min-h-[45dvh] place-items-center px-4 text-center"
      aria-labelledby="opening-dashboard-title"
    >
      <div>
        <LoaderCircle
          className="mx-auto h-7 w-7 animate-spin text-orange-600 motion-reduce:animate-none"
          aria-hidden="true"
        />
        <h1 id="opening-dashboard-title" className="mt-4 text-xl font-semibold">
          Opening your dashboard…
        </h1>
        <p className="mt-2 text-sm text-neutral-600">
          Your profile setup is complete.
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
