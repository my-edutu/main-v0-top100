// app/api/member/groups/[id]/membership/route.ts
//   POST   -> join this group (open => active, request => pending, private => 403)
//   DELETE -> leave it (blocked for the last remaining owner)
//   PATCH  -> owner/moderator approves, declines or bans a member
import { NextRequest, NextResponse } from 'next/server'

import { getCurrentUser } from '@/lib/auth-server'
import { createAdminClient } from '@/lib/supabase/server'
import { checkRateLimit, createRateLimitResponse } from '@/lib/rate-limit'
import {
  GROUPS_SETUP_MESSAGE,
  countActiveOwners,
  isMissingGroupsTable,
  isSiteAdminProfile,
  loadGroup,
  loadMembership,
  loadProfileForGroups,
  type GroupMemberRow,
} from '@/lib/groups/server'
import {
  canLeaveGroup,
  canModerateGroup,
  joinStatusFor,
  membershipPatchSchema,
} from '@/lib/groups/types'

export const runtime = 'nodejs'

const SETUP_RESPONSE = () =>
  NextResponse.json({ message: GROUPS_SETUP_MESSAGE, setupRequired: true }, { status: 503 })

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user?.id) return NextResponse.json({ message: 'Authentication required.' }, { status: 401 })

  const { id } = await params

  const rateLimit = await checkRateLimit({
    maxRequests: 20,
    windowSeconds: 60,
    identifier: `group-join:${user.id}`,
  })
  if (!rateLimit.success) {
    return createRateLimitResponse(rateLimit, 'Too many join requests. Try again shortly.') as NextResponse
  }

  const supabase = createAdminClient()

  const { group, error: groupError } = await loadGroup(supabase, id)
  if (groupError) {
    if (isMissingGroupsTable(groupError)) return SETUP_RESPONSE()
    console.error('[group-membership] group load failed', groupError)
    return NextResponse.json({ message: 'Could not join this group.' }, { status: 500 })
  }
  if (!group) return NextResponse.json({ message: 'This group no longer exists.' }, { status: 404 })
  if (group.is_archived) {
    return NextResponse.json({ message: 'This group has been archived.' }, { status: 403 })
  }

  const profile = await loadProfileForGroups(supabase, user.id)
  if (profile?.membership_status !== 'approved') {
    return NextResponse.json(
      { message: 'Only approved awardees can join groups. Your membership is still being reviewed.' },
      { status: 403 },
    )
  }

  const nextStatus = joinStatusFor(group.visibility)
  if (!nextStatus) {
    return NextResponse.json(
      { message: 'This group is private — you need an invitation from an owner.' },
      { status: 403 },
    )
  }

  const { membership, error: membershipError } = await loadMembership(supabase, id, user.id)
  if (membershipError) {
    console.error('[group-membership] membership load failed', membershipError)
    return NextResponse.json({ message: 'Could not join this group.' }, { status: 500 })
  }

  if (membership) {
    if (membership.status === 'banned') {
      return NextResponse.json({ message: 'You cannot rejoin this group.' }, { status: 403 })
    }
    // Re-joining is a no-op, not a duplicate-key crash.
    return NextResponse.json({ status: membership.status, alreadyMember: true })
  }

  const { data, error } = await supabase
    .from('member_group_members')
    .insert({ group_id: id, profile_id: user.id, status: nextStatus, role: 'member' })
    .select('*')
    .single()

  if (error) {
    // A concurrent join won the unique index — read back what it created.
    if (error.code === '23505') {
      const { membership: existing } = await loadMembership(supabase, id, user.id)
      if (existing) return NextResponse.json({ status: existing.status, alreadyMember: true })
    }
    if (isMissingGroupsTable(error)) return SETUP_RESPONSE()
    console.error('[group-membership] join failed', error)
    return NextResponse.json({ message: 'Could not join this group.' }, { status: 500 })
  }

  return NextResponse.json(
    { status: (data as GroupMemberRow).status, alreadyMember: false },
    { status: 201 },
  )
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user?.id) return NextResponse.json({ message: 'Authentication required.' }, { status: 401 })

  const { id } = await params
  const supabase = createAdminClient()

  const { membership, error } = await loadMembership(supabase, id, user.id)
  if (error) {
    if (isMissingGroupsTable(error)) return SETUP_RESPONSE()
    console.error('[group-membership] leave lookup failed', error)
    return NextResponse.json({ message: 'Could not leave this group.' }, { status: 500 })
  }

  const activeOwnerCount = membership?.role === 'owner' ? await countActiveOwners(supabase, id) : 0
  const verdict = canLeaveGroup({
    membership: membership ? { role: membership.role, status: membership.status } : null,
    activeOwnerCount,
  })
  if (!verdict.ok) return NextResponse.json({ message: verdict.message }, { status: verdict.status })

  const { error: deleteError } = await supabase
    .from('member_group_members')
    .delete()
    .eq('group_id', id)
    .eq('profile_id', user.id)

  if (deleteError) {
    console.error('[group-membership] leave failed', deleteError)
    return NextResponse.json({ message: 'Could not leave this group.' }, { status: 500 })
  }

  return NextResponse.json({ left: true })
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user?.id) return NextResponse.json({ message: 'Authentication required.' }, { status: 401 })

  const { id } = await params

  let payload: unknown = {}
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ message: 'Invalid request body.' }, { status: 400 })
  }

  const parsed = membershipPatchSchema.safeParse(payload)
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? 'Check the request and try again.'
    return NextResponse.json({ message }, { status: 400 })
  }
  const { profileId, status } = parsed.data

  const supabase = createAdminClient()

  const [{ membership: caller, error: callerError }, profile] = await Promise.all([
    loadMembership(supabase, id, user.id),
    loadProfileForGroups(supabase, user.id),
  ])

  if (callerError) {
    if (isMissingGroupsTable(callerError)) return SETUP_RESPONSE()
    console.error('[group-membership] moderator lookup failed', callerError)
    return NextResponse.json({ message: 'Could not update this member.' }, { status: 500 })
  }

  // Moderation authority is scoped to *this* group — being an owner elsewhere
  // grants nothing here.
  const isSiteAdmin = isSiteAdminProfile(profile)
  if (!isSiteAdmin && !canModerateGroup(caller?.role, caller?.status)) {
    return NextResponse.json(
      { message: 'Only this group’s owners and moderators can manage members.' },
      { status: 403 },
    )
  }

  const { membership: target, error: targetError } = await loadMembership(supabase, id, profileId)
  if (targetError) {
    console.error('[group-membership] target lookup failed', targetError)
    return NextResponse.json({ message: 'Could not update this member.' }, { status: 500 })
  }
  if (!target) {
    return NextResponse.json({ message: 'That member is not in this group.' }, { status: 404 })
  }

  // An owner outranks a moderator: only a site admin or another owner may act
  // on one, and nobody may strip the last owner out of the group.
  if (target.role === 'owner' && !isSiteAdmin && caller?.role !== 'owner') {
    return NextResponse.json({ message: 'You cannot change an owner of this group.' }, { status: 403 })
  }
  if (target.role === 'owner' && status !== 'active') {
    const owners = await countActiveOwners(supabase, id)
    if (owners <= 1) {
      return NextResponse.json(
        { message: 'This is the group’s only owner. Promote someone else first.' },
        { status: 409 },
      )
    }
  }

  if (status === 'removed') {
    const { error } = await supabase
      .from('member_group_members')
      .delete()
      .eq('group_id', id)
      .eq('profile_id', profileId)

    if (error) {
      console.error('[group-membership] remove failed', error)
      return NextResponse.json({ message: 'Could not update this member.' }, { status: 500 })
    }
    return NextResponse.json({ status: 'removed' })
  }

  const { error } = await supabase
    .from('member_group_members')
    .update({ status })
    .eq('group_id', id)
    .eq('profile_id', profileId)

  if (error) {
    console.error('[group-membership] status update failed', error)
    return NextResponse.json({ message: 'Could not update this member.' }, { status: 500 })
  }

  return NextResponse.json({ status })
}
