import { sendMemberPush } from '@/lib/push/send'
// app/api/admin/members/[id]/route.ts
// Admin: approve / reject / suspend a member, or reset their BIO update limit.
import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/api/require-admin'
import { createAdminClient } from '@/lib/supabase/server'
import { mapProfileToMember } from '@/lib/member-hub-server'
import { createPortfolioCoverRepository } from '@/lib/portfolio-cover/repository'

export const runtime = 'nodejs'

const STATUS_ACTIONS: Record<string, string> = {
  approve: 'approved',
  reject: 'rejected',
  suspend: 'suspended',
  pending: 'pending',
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const adminCheck = await requireAdmin(request)
  if ('error' in adminCheck) return adminCheck.error

  const { id } = await params
  if (!id) return NextResponse.json({ message: 'Member id is required.' }, { status: 400 })

  let body: Record<string, unknown> = {}
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ message: 'Invalid request body.' }, { status: 400 })
  }

  const action = String(body.action ?? '')
  const update: Record<string, unknown> = {}

  if (action === 'reset-portfolio-cover') {
    try {
      const generation = await createPortfolioCoverRepository().getLatest(id)
      if (!generation) return NextResponse.json({ message: 'No portfolio cover set found.' }, { status: 404 })
      await createPortfolioCoverRepository().reset(generation.id, adminCheck.user.id)
      update.portfolio_cover_url = null
    } catch {
      return NextResponse.json({ message: 'Could not reset the portfolio cover.' }, { status: 500 })
    }
  } else if (action === 'reset-bio') {
    update.bio_update_count = 0
  } else if (STATUS_ACTIONS[action]) {
    update.membership_status = STATUS_ACTIONS[action]
  } else {
    return NextResponse.json({ message: `Unsupported action: ${action}` }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data: pendingClaim, error: claimError } = await supabase
    .from('pending_awardee_claims').select('user_id').eq('user_id', id).maybeSingle()
  if (claimError) return NextResponse.json({ message: 'Could not check the pending claim.' }, { status: 500 })
  if (action === 'approve' && pendingClaim) {
    const { error: approvalError } = await supabase.rpc('approve_pending_awardee_claim', { p_user_id: id })
    if (approvalError) {
      console.error('[admin/members] claim approval failed', { code: approvalError.code, message: approvalError.message })
      return NextResponse.json({ message: 'Could not approve this claim. Check whether its awardee record or email changed.' }, { status: 409 })
    }
    // The RPC links the awardee and changes the profile status in one transaction.
    delete update.membership_status
  }
  const { data, error } = Object.keys(update).length
    ? await supabase.from('profiles').update(update).eq('id', id).eq('role', 'user').select('*').maybeSingle()
    : await supabase.from('profiles').select('*').eq('id', id).eq('role', 'user').maybeSingle()

  if (error) return NextResponse.json({ message: 'Could not update the member.' }, { status: 500 })
  if (!data) return NextResponse.json({ message: 'Member not found.' }, { status: 404 })
  if (action === 'reject' && pendingClaim) {
    const { error: deleteError } = await supabase.from('pending_awardee_claims').delete().eq('user_id', id)
    if (deleteError) return NextResponse.json({ message: 'Member rejected, but could not clear the pending claim.' }, { status: 500 })
  }

  // Tell the member what happened so status changes are visible in their
  // dashboard notifications, not just as a silent badge change.
  const statusNotice: Record<string, { title: string; body: string }> = {
    'reset-portfolio-cover': {
      title: 'Your portfolio cover can be regenerated',
      body: 'The admin team reset your portfolio cover allowance. You can create a new two-option cover set from your dashboard.',
    },
    approve: {
      title: 'Your awardee account is approved',
      body: 'Welcome to the network! Your account has full access — complete your BIO and connect with fellow awardees.',
    },
    reject: {
      title: 'Update on your awardee account',
      body: 'Your account application was not approved. Contact the admin team if you believe this is a mistake.',
    },
    suspend: {
      title: 'Your awardee account was suspended',
      body: 'Your account access has been limited. Contact the admin team to resolve this.',
    },
  }
  const notice = statusNotice[action]
  if (notice) {
    const { error: noticeError } = await supabase.from('user_notifications').insert({
      user_id: id,
      title: notice.title,
      body: notice.body,
      category: 'account',
      metadata: { audience: 'all', source: 'membership-status' },
    })
    if (!noticeError) await sendMemberPush(supabase, [id], { ...notice, url: '/dashboard/notifications' }).catch(() => undefined)
  }

  if (action === 'approve' && pendingClaim) revalidatePath('/awardees')

  return NextResponse.json({ member: mapProfileToMember(data) })
}
