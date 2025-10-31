'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function VerifyEmailPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-primary-50 to-secondary-50 dark:from-primary-900/20 dark:to-secondary-900/20">
      <div className="absolute inset-0 bg-grid-pattern opacity-5 dark:opacity-10"></div>
      <div className="relative z-10 flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/20">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
            <h1 className="mt-4 text-2xl font-bold tracking-tight text-foreground">Email Verification</h1>
            <p className="mt-2 text-sm text-muted-foreground">Account verification status</p>
          </div>
          
          <Card className="border-0 bg-background/80 backdrop-blur-sm shadow-xl">
            <CardHeader className="text-center space-y-2">
              <CardTitle className="text-xl font-semibold">Email verification</CardTitle>
              <CardDescription className="text-sm text-muted-foreground">
                Email verification is part of the Top100 Awardee profile setup process.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center text-sm text-muted-foreground">
                <p className="mb-4">Are you a Top100 Awardee with credentials?</p>
                <Button asChild variant="outline" className="w-full">
                  <Link href="/auth/signin">Sign In to Your Profile</Link>
                </Button>
              </div>
              <p className="text-xs text-center text-muted-foreground">
                For assistance with your Top100 Awardee profile, contact our administrative team.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
