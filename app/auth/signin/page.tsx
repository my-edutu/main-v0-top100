import { Suspense } from 'react'
import SignInContent from './page-content'

export default function SignInPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mb-2"></div>
        <p className="text-muted-foreground">Loading Top100 Awardee portal...</p>
      </div>
    </div>}>
      <SignInContent />
    </Suspense>
  )
}