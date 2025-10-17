"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { betterAuthClient } from "@/lib/better-auth/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"

export default function SignUpPage() {
  const router = useRouter()
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setMessage(null)

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    setLoading(true)

    try {
      const signUpResult = await betterAuthClient.signUp.email({
        email,
        password,
        name: fullName || email,
      })

      if (!signUpResult || signUpResult.error || !signUpResult.data) {
        const message =
          signUpResult?.error?.message ?? "Unable to create your account. Please try again."
        throw new Error(message)
      }

      setMessage("Account created! Check your email inbox to verify before signing in.")
      router.push(`/auth/verify-email?email=${encodeURIComponent(email)}`)
    } catch (err) {
      console.error("[sign-up] failed", err)
      setError(err instanceof Error ? err.message : "Failed to create account")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-zinc-950 via-black to-zinc-900">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_10%,rgba(255,140,0,0.12),transparent_40%),radial-gradient(circle_at_90%_10%,rgba(255,140,0,0.08),transparent_40%)]" />
      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center space-y-2">
            <h1 className="text-3xl font-bold tracking-tight text-white">Create an account</h1>
            <p className="text-sm text-zinc-400">
              Join the Top100 Africa Future Leaders platform to manage content and events.
            </p>
          </div>
          <Card className="border-zinc-800/80 bg-zinc-950/60 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-xl text-white">Sign up</CardTitle>
              <CardDescription className="text-zinc-400">
                Fill out the form below to create your workspace login
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
                    {error}
                  </div>
                )}
                {message && (
                  <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">
                    {message}
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="fullName" className="text-sm font-medium text-zinc-300">
                    Full name
                  </Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    placeholder="Jane Doe"
                    className="w-full border-zinc-800 bg-zinc-900/70 text-white placeholder:text-zinc-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium text-zinc-300">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                    placeholder="you@example.com"
                    className="w-full border-zinc-800 bg-zinc-900/70 text-white placeholder:text-zinc-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium text-zinc-300">
                    Password
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                    placeholder="Choose a strong password"
                    className="w-full border-zinc-800 bg-zinc-900/70 text-white placeholder:text-zinc-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-sm font-medium text-zinc-300">
                    Confirm password
                  </Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    required
                    placeholder="Re-enter your password"
                    className="w-full border-zinc-800 bg-zinc-900/70 text-white placeholder:text-zinc-500"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-orange-600 text-white hover:bg-orange-500"
                  disabled={loading}
                >
                  {loading ? "Creating account..." : "Create account"}
                </Button>
                <div className="text-center text-xs text-zinc-500">
                  Already have an account?{" "}
                  <Link href="/auth/signin" className="text-orange-300 hover:text-orange-200">
                    Sign in
                  </Link>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
