import { Suspense } from 'react'
import SignInContent from './page-content'
import { getAwardeeRegisterTotals } from '@/lib/awardees/register-summary.server'
import { getImpactStats } from '@/lib/impact-content'

export const revalidate = 300

export default async function SignInPage() {
  const stats = getImpactStats(await getAwardeeRegisterTotals())
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mb-2"></div>
        <p className="text-muted-foreground">Loading Top100 Awardee portal...</p>
      </div>
    </div>}>
      <SignInContent stats={stats} />
    </Suspense>
  )
}