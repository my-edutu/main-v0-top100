import TestAuthDebug from '../signin/test-auth-debug'
import { notFound } from 'next/navigation'
import { isAuthDebugEnabled } from '@/lib/auth/debug-access'

export default function TestDebugPage() {
  if (!isAuthDebugEnabled(process.env.NODE_ENV)) notFound()
  return <TestAuthDebug />
}
