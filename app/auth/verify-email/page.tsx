'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function VerifyEmailPage() {
  return (
    <div className="relative min-h-screen bg-gradient-to-br from-zinc-950 via-black to-zinc-900">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,140,0,0.12),transparent_40%),radial-gradient(circle_at_bottom_right,rgba(255,140,0,0.08),transparent_40%)]" />
      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-xl text-center">
          <Card className="border-zinc-800/80 bg-zinc-950/70 backdrop-blur">
            <CardHeader className="space-y-3">
              <CardTitle className="text-2xl font-semibold text-white">Email verification paused</CardTitle>
              <CardDescription className="text-sm text-zinc-400">
                Public access is temporarily closed while we prepare the next release. We’ll start sending verification links again once sign-in is re-enabled.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button asChild className="w-full bg-yellow-500 text-white hover:bg-yellow-400">
                <Link href="/">Explore the site</Link>
              </Button>
              <p className="text-xs text-zinc-500">
                Need help as part of the internal team? Ping us on the team channel for a direct invite.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
