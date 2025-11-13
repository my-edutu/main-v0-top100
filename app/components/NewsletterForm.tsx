'use client'

import { useState, useActionState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { handleSubscribe } from '@/app/actions/newsletter'

export default function NewsletterForm() {
  const [email, setEmail] = useState('')
  const [state, formAction, isPending] = useActionState(handleSubscribe, null)

  return (
    <form
      action={formAction}
      className="flex flex-col gap-4 sm:flex-row"
    >
      <div className="relative flex-1">
        <Input
          type="email"
          name="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email address"
          className="w-full rounded-2xl border-0 bg-white py-6 pl-6 pr-32 shadow-sm shadow-black/5 focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-0"
          required
        />
        <Button 
          type="submit" 
          className="absolute right-2 top-1/2 -translate-y-1/2 bg-orange-500 text-white rounded-xl px-4 py-2 text-sm font-medium hover:bg-orange-600 transition-colors"
          disabled={isPending}
        >
          {isPending ? 'Subscribing...' : 'Subscribe'}
        </Button>
      </div>
      {state && (
        <div className={`mt-2 text-center ${state.success ? 'text-green-600' : 'text-red-600'}`}>
          {state.message}
        </div>
      )}
    </form>
  )
}