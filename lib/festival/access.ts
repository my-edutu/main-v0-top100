import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { canAttendFestival } from './config'

const headers = { 'Cache-Control': 'private, no-store' }

export async function checkFestivalAwardeeAccess(memberId: string) {
  try {
    const { data, error } = await createAdminClient()
      .from('profiles')
      .select('membership_status')
      .eq('id', memberId)
      .maybeSingle()
    if (error) throw error
    if (!data || !canAttendFestival(data.membership_status))
      return NextResponse.json(
        { message: 'Festival registration is available to approved Top100 awardees.' },
        { status: 403, headers },
      )
    return null
  } catch {
    return NextResponse.json(
      { message: 'We couldn’t check your awardee status. Please try again shortly.' },
      { status: 503, headers },
    )
  }
}
