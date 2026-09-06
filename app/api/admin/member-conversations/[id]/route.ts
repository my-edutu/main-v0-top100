import { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/api/require-admin'
import {
  GET as read,
  POST as send,
} from '@/app/api/member/conversations/[id]/route'
type Context = { params: Promise<{ id: string }> }
export async function GET(request: NextRequest, context: Context) {
  const access = await requireAdmin(request)
  return 'error' in access ? access.error : read(request, context)
}
export async function POST(request: NextRequest, context: Context) {
  const access = await requireAdmin(request)
  return 'error' in access ? access.error : send(request, context)
}
