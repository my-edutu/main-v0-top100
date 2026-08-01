"use client"

import { useState } from "react"
import { Loader2, CheckCircle2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { WAITLIST_PROGRAMS, type WaitlistProgramSlug } from "@/lib/waitlist-programs"

type WaitlistFormProps = {
  initialProgram: WaitlistProgramSlug
}

export default function WaitlistForm({ initialProgram }: WaitlistFormProps) {
  const [program, setProgram] = useState<WaitlistProgramSlug>(initialProgram)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [country, setCountry] = useState("")
  const [organization, setOrganization] = useState("")
  const [note, setNote] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const selected = WAITLIST_PROGRAMS.find((item) => item.slug === program)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          program,
          country: country || undefined,
          organization: organization || undefined,
          note: note || undefined,
        }),
      })

      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        setError(payload?.error || "Something went wrong. Please try again.")
        return
      }

      setDone(true)
    } catch {
      setError("Network error. Please check your connection and try again.")
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <div className="flex flex-col items-center text-center gap-3 py-6" role="status" aria-live="polite">
        <CheckCircle2 className="h-10 w-10 text-orange-600" aria-hidden="true" />
        <h2 className="text-xl font-black text-zinc-900">You&apos;re on the list</h2>
        <p className="text-sm text-zinc-500 font-medium">
          We&apos;ll email {email} as soon as {selected?.label ?? "this programme"} opens for registration.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="program">Which programme?</Label>
        <select
          id="program"
          value={program}
          onChange={(event) => setProgram(event.target.value as WaitlistProgramSlug)}
          className="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
        >
          {WAITLIST_PROGRAMS.map((item) => (
            <option key={item.slug} value={item.slug}>
              {item.label}
            </option>
          ))}
        </select>
        {selected && <p className="text-xs text-zinc-400 font-medium">{selected.detail}</p>}
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Full name</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={120} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required maxLength={200} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="country">Country (optional)</Label>
          <Input id="country" value={country} onChange={(e) => setCountry(e.target.value)} maxLength={120} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="organization">Organisation / school (optional)</Label>
          <Input id="organization" value={organization} onChange={(e) => setOrganization(e.target.value)} maxLength={200} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="note">Anything you&apos;d like us to know? (optional)</Label>
        <textarea
          id="note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          maxLength={2000}
          className="flex w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
        />
      </div>

      {error && (
        <p className="text-sm font-medium text-red-600" role="alert">
          {error}
        </p>
      )}

      <Button type="submit" disabled={submitting} className="w-full rounded-xl bg-orange-600 text-[#fff] hover:bg-orange-700">
        {submitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
            Adding you…
          </>
        ) : (
          "Join the waiting list"
        )}
      </Button>
    </form>
  )
}
