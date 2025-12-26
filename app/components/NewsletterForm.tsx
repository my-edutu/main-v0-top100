'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Loader2, CheckCircle, AlertCircle, Mail } from 'lucide-react'

export default function NewsletterForm() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email || !email.includes('@')) {
      setStatus('error')
      setMessage('Please enter a valid email address')
      return
    }

    setStatus('loading')
    setMessage('')

    try {
      const response = await fetch('/api/brevo/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (response.ok) {
        setStatus('success')
        setMessage('You\'re in! Check your inbox for confirmation.')
        setEmail('')
        // Reset to idle after 5 seconds
        setTimeout(() => {
          setStatus('idle')
          setMessage('')
        }, 5000)
      } else {
        setStatus('error')
        setMessage(data.error || 'Something went wrong. Please try again.')
      }
    } catch (error) {
      console.error('Newsletter subscription error:', error)
      setStatus('error')
      setMessage('Network error. Please check your connection.')
    }
  }

  return (
    <div className="space-y-3">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
          <Input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={status === 'loading' || status === 'success'}
            className="w-full rounded-2xl border-0 bg-white py-6 pl-12 pr-4 shadow-sm shadow-black/5 focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-0 text-base"
          />
        </div>
        <Button
          type="submit"
          disabled={status === 'loading' || status === 'success'}
          className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-2xl px-8 py-6 text-sm font-bold uppercase tracking-wider transition-all hover:scale-105 active:scale-95 disabled:opacity-70 shadow-lg shadow-orange-200"
        >
          {status === 'loading' ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Subscribing...
            </>
          ) : status === 'success' ? (
            <>
              <CheckCircle className="h-4 w-4 mr-2" />
              Subscribed!
            </>
          ) : (
            'Subscribe'
          )}
        </Button>
      </form>

      {/* Status Message */}
      {message && (
        <div className={`flex items-center gap-2 text-sm font-medium animate-in fade-in slide-in-from-top-2 ${status === 'success' ? 'text-emerald-600' : 'text-rose-500'
          }`}>
          {status === 'success' ? (
            <CheckCircle className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          {message}
        </div>
      )}
    </div>
  )
}