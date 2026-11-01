import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api/require-admin'
import { createAdminClient } from '@/lib/supabase/server'
import { deliveryView, type DeliveryRow } from '@/lib/awards/delivery/server'
export const runtime = 'nodejs'
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error
  const headers = { 'Cache-Control': 'private, no-store' }
  const { data, error } = await createAdminClient().from('award_delivery_orders').select('*').order('created_at', { ascending: false }).limit(100)
  if (error) return NextResponse.json({ message: 'Delivery orders could not be loaded.' }, { status: 503, headers })
  return NextResponse.json({ deliveries: (data ?? []).map((row: DeliveryRow & { booking_response?: { reason?: unknown; waybill?: unknown } }) => ({
    ...deliveryView(row), memberId: row.member_id,
    reviewReason: typeof row.booking_response?.reason === 'string' ? row.booking_response.reason.slice(0, 500) : null,
    recoveryWaybill: typeof row.booking_response?.waybill === 'string' ? row.booking_response.waybill.slice(0, 150) : null,
  })) }, { headers })
}
