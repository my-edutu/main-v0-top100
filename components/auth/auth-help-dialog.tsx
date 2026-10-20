'use client'

import { Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

export function AuthHelpDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" variant="link" className="h-auto p-0 text-sm text-orange-700">
          Having trouble? Contact admin
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[calc(100%-2rem)] max-w-md rounded-2xl border-stone-200 bg-white text-stone-950">
        <DialogHeader className="pr-8 text-left">
          <DialogTitle className="text-xl">Need help with your account?</DialogTitle>
          <DialogDescription className="pt-1 leading-6">
            Email the Top100 admin team if you’re having trouble signing in, resetting your password, or claiming your profile.
          </DialogDescription>
        </DialogHeader>
        <a
          href="mailto:nigeriatop100@gmail.com"
          aria-label="Email the Top100 admin team at nigeriatop100@gmail.com"
          className="inline-flex min-h-11 items-center gap-2 break-all rounded-lg border border-orange-200 bg-orange-50 px-4 py-2 font-medium text-orange-900 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-600 focus-visible:ring-offset-2"
        >
          <Mail className="h-4 w-4 shrink-0" aria-hidden="true" />
          nigeriatop100@gmail.com
        </a>
      </DialogContent>
    </Dialog>
  )
}
