import { Suspense } from 'react'
import AdminLoginContent from './page-content'

export default function AdminLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center bg-zinc-950">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-t-2 border-b-2 border-orange-500" />
        </div>
      }
    >
      <AdminLoginContent />
    </Suspense>
  )
}
