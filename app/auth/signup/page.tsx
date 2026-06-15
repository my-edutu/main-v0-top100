'use client'

import { FormEvent, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight, ShieldCheck } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { registerInviteMember } from '@/lib/member-hub-local'

export default function SignUpPage() {
  const router = useRouter()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setLoading(true)

    const form = new FormData(event.currentTarget)

    try {
      registerInviteMember({
        name: String(form.get('name') || ''),
        email: String(form.get('email') || ''),
        password: String(form.get('password') || ''),
        inviteCode: String(form.get('inviteCode') || ''),
        headline: String(form.get('headline') || ''),
      })
      router.push('/dashboard')
    } catch (signupError) {
      setError(signupError instanceof Error ? signupError.message : 'Could not create this account.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(249,115,22,0.12),transparent_28%),linear-gradient(180deg,#fffaf4_0%,#ffffff_48%,#f8f1e7_100%)] px-4 py-12">
      <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
        <section className="space-y-6">
          <Badge variant="soft" className="border-orange-200 bg-white/80 text-orange-700">
            Invite only
          </Badge>
          <div className="space-y-4">
            <h1 className="max-w-xl text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
              Create your awardee workspace.
            </h1>
            <p className="max-w-lg text-base leading-7 text-slate-600">
              Use the code from the admin team. Your profile goes to review before appearing in the network.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {['BIO review', 'Directory profile', 'Member tools', 'Recruiter visibility'].map((item) => (
              <div key={item} className="rounded-2xl border border-orange-100 bg-white/80 p-4 text-sm font-semibold text-slate-800">
                {item}
              </div>
            ))}
          </div>
        </section>

        <Card className="border-orange-100 bg-white/92 shadow-[0_24px_70px_-46px_rgba(15,23,42,0.55)]">
          <CardHeader className="space-y-3 border-b border-orange-100">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <CardTitle className="text-2xl font-black tracking-tight text-slate-950">
              Awardee signup
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Full name</Label>
                  <Input id="name" name="name" required placeholder="Amina Bello" className="rounded-2xl" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" name="email" type="email" required placeholder="you@example.com" className="rounded-2xl" />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="inviteCode">Invite code</Label>
                  <Input id="inviteCode" name="inviteCode" required placeholder="AFL-247819" className="rounded-2xl uppercase" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" name="password" type="password" required minLength={8} placeholder="Minimum 8 characters" className="rounded-2xl" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="headline">Short headline</Label>
                <Input id="headline" name="headline" placeholder="Founder, researcher, changemaker..." className="rounded-2xl" />
              </div>

              {error ? (
                <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  {error}
                </div>
              ) : null}

              <Button disabled={loading} className="w-full rounded-full bg-gradient-to-r from-orange-500 to-amber-500 py-6 text-white shadow-none hover:opacity-95">
                {loading ? 'Creating account...' : 'Create account'}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <p className="text-center text-sm text-slate-500">
                Already approved?{' '}
                <Link href="/auth/signin?from=/dashboard" className="font-semibold text-orange-700">
                  Sign in
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
