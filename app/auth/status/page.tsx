import { notFound } from 'next/navigation'

import AuthStatusClient from './status-client'
import { isAuthDebugEnabled } from '@/lib/auth/debug-access'

export default function AuthStatusPage() {
  if (!isAuthDebugEnabled(process.env.NODE_ENV)) notFound()
  return <AuthStatusClient />
}
