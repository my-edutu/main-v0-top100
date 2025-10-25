'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function SignInPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 bg-gradient-hero opacity-80 dark:opacity-60" />
      <div className="pointer-events-none absolute inset-0 bg-noise-texture opacity-10" />
      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-20 sm:px-6 lg:px-8">
        <div className="w-full max-w-xl text-center">
          <Card className="mx-auto max-w-xl border-border/40 bg-surface-strong/80 shadow-lg">
            <CardHeader className="space-y-4">
              <CardTitle className="text-3xl font-semibold">Private beta in progress</CardTitle>
              <CardDescription className="text-base text-muted-foreground">
                We&apos;re polishing the member experience before opening sign-in to the public. Please check back
                soon or follow our updates to be the first to know when access goes live.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <Button asChild className="w-full">
                <Link href="/">Return to homepage</Link>
              </Button>
              <p className="text-xs text-muted-foreground">
                Already part of the core team? Reach out internally for the staging link.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
