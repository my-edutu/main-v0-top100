"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function SignUpPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 bg-gradient-hero opacity-80 dark:opacity-60" />
      <div className="pointer-events-none absolute inset-0 bg-noise-texture opacity-10" />
      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-20 sm:px-6 lg:px-8">
        <div className="w-full max-w-xl text-center">
          <Card className="mx-auto max-w-xl border-border/40 bg-surface-strong/80 shadow-lg">
            <CardHeader className="space-y-4">
              <CardTitle className="text-3xl font-semibold">Public signup coming soon</CardTitle>
              <CardDescription className="text-base text-muted-foreground">
                We&apos;re onboarding a small group of awardees behind the scenes. Once the platform is ready for the wider community, email registration will reopen here.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <Button asChild className="w-full">
                <Link href="/">Return to homepage</Link>
              </Button>
              <p className="text-xs text-muted-foreground">
                Want early access? Reach out through our contact form and we&apos;ll keep you in the loop.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
