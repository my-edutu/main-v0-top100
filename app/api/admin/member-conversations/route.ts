import { rejectCrossOriginMutation } from '@/lib/security/same-origin'
import { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/api/require-admin'
import { GET as list, POST as send } from '@/app/api/member/conversations/route'
export async function GET(request: NextRequest) {
  const access = await requireAdmin(request)
  return 'error' in access ? access.error : list()
}
export async function POST(request: NextRequest) {
  const originError = rejectCrossOriginMutation(request)
  if (originError) return originError
  const access = await requireAdmin(request)
  return 'error' in access ? access.error : send(request)
}
