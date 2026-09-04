// app/api/member/groups/route.ts
// Awardee groups the member can see, and creating a new one.
//   GET  -> every non-private group plus private groups the caller belongs to
//   POST -> create a group (creator becomes its owner)
import { NextRequest, NextResponse } from 'next/server'

import { getCurrentUser } from '@/lib/auth-server'
import { createAdminClient } from '@/lib/supabase/server'
import { checkRateLimit, createRateLimitResponse } from '@/lib/rate-limit'
import {
  GROUPS_SETUP_MESSAGE,
  generateUniqueSlug,
  isMissingGroupsTable,
  loadProfileForGroups,
  loadUnreadCounts,
  mapGroupSummary,
  type GroupMemberRow,
  type GroupRow,
} from '@/lib/groups/server'
import {
  GROUP_CREATE_DAILY_LIMIT,
  createGroupSchema,
  type GroupSummary,
} from '@/lib/groups/types'

export const runtime = 'nodejs'

const SETUP_RESPONSE = () =>
  NextResponse.json({ message: GROUPS_SETUP_MESSAGE, setupRequired: true }, { status: 503 })

export async function GET() {
  const user = await getCurrentUser()
  if (!user?.id) return NextResponse.json({ message: 'Authentication required.' }, { status: 401 })

  const supabase = createAdminClient()

  // Memberships first: they decide which private groups are visible and carry
  // the last_read_at that drives the unread badge.
  const { data: membershipRows, error: membershipError } = await supabase
    .from('member_group_members')
    .select('*')
    .eq('profile_id', user.id)

  if (membershipError) {
    if (isMissingGroupsTable(membershipError)) return SETUP_RESPONSE()
    console.error('[member-groups] membership load failed', membershipError)
    return NextResponse.json({ message: 'Could not load your groups.' }, { status: 500 })
  }

  const memberships = (membershipRows ?? []) as GroupMemberRow[]
  const membershipByGroup = new Map(memberships.map((row) => [row.group_id, row]))

  const { data: listedRows, error: listedError } = await supabase
    .from('member_groups')
    .select('*')
    .neq('visibility', 'private')
    .order('member_count', { ascending: false })
    .limit(200)

  if (listedError) {
    if (isMissingGroupsTable(listedError)) return SETUP_RESPONSE()
    console.error('[member-groups] group list failed', listedError)
    return NextResponse.json({ message: 'Could not load groups.' }, { status: 500 })
  }

  const groupsById = new Map<string, GroupRow>()
  for (const row of (listedRows ?? []) as GroupRow[]) groupsById.set(row.id, row)

  // Private groups are never listed, so pull the caller's own separately.
  const missingIds = memberships
    .map((row) => row.group_id)
    .filter((groupId) => !groupsById.has(groupId))

  if (missingIds.length > 0) {
    const { data: privateRows, error: privateError } = await supabase
      .from('member_groups')
      .select('*')
      .in('id', missingIds)

    if (privateError) {
      console.error('[member-groups] private group load failed', privateError)
    } else {
      for (const row of (privateRows ?? []) as GroupRow[]) groupsById.set(row.id, row)
    }
  }

  const unread = await loadUnreadCounts(
    supabase,
    // Banned members do not get an unread badge for a group they cannot read.
    memberships.filter((membership) => membership.status !== 'banned'),
  )

  const groups: GroupSummary[] = Array.from(groupsById.values())
    .map((row) => {
      const membership = membershipByGroup.get(row.id) ?? null
      return mapGroupSummary(
        row,
        membership && membership.status !== 'banned' ? membership : null,
        unread.get(row.id) ?? 0,
      )
    })
    // Joined groups first, then by size, then alphabetically — the same order
    // the dashboard renders "Your groups" above "Discover".
    .sort((a, b) => {
      const mine = Number(Boolean(b.membership)) - Number(Boolean(a.membership))
      if (mine !== 0) return mine
      if (b.memberCount !== a.memberCount) return b.memberCount - a.memberCount
      return a.name.localeCompare(b.name)
    })

  return NextResponse.json({ groups })
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user?.id) return NextResponse.json({ message: 'Authentication required.' }, { status: 401 })

  let payload: unknown = {}
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ message: 'Invalid request body.' }, { status: 400 })
  }

  const parsed = createGroupSchema.safeParse(payload)
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? 'Check the group details and try again.'
    return NextResponse.json({ message }, { status: 400 })
  }

  const supabase = createAdminClient()

  const profile = await loadProfileForGroups(supabase, user.id)
  if (profile?.membership_status !== 'approved') {
    return NextResponse.json(
      { message: 'Only approved awardees can create groups.' },
      { status: 403 },
    )
  }

  // Per member, not per IP: a shared office network must not lock everyone out.
  const rateLimit = await checkRateLimit({
    maxRequests: GROUP_CREATE_DAILY_LIMIT,
    windowSeconds: 24 * 60 * 60,
    identifier: `group-create:${user.id}`,
  })
  if (!rateLimit.success) {
    return createRateLimitResponse(
      rateLimit,
      `You can create up to ${GROUP_CREATE_DAILY_LIMIT} groups a day. Try again tomorrow.`,
    ) as NextResponse
  }

  const { name, description, topic, visibility } = parsed.data

  // One retry: another request can take the slug between our lookup and insert.
  let created: GroupRow | null = null
  for (let attempt = 0; attempt < 2 && !created; attempt += 1) {
    const slug = await generateUniqueSlug(supabase, name)
    const { data, error } = await supabase
      .from('member_groups')
      .insert({
        slug,
        name,
        description: description || null,
        topic: topic || null,
        visibility,
        created_by: user.id,
      })
      .select('*')
      .single()

    if (!error && data) {
      created = data as GroupRow
      break
    }

    if (error && isMissingGroupsTable(error)) return SETUP_RESPONSE()
    if (error && error.code !== '23505') {
      console.error('[member-groups] create failed', error)
      return NextResponse.json({ message: 'Could not create this group.' }, { status: 500 })
    }
  }

  if (!created) {
    return NextResponse.json(
      { message: 'That group name is already taken. Try a slightly different one.' },
      { status: 409 },
    )
  }

  const { data: membershipRow, error: membershipError } = await supabase
    .from('member_group_members')
    .insert({ group_id: created.id, profile_id: user.id, role: 'owner', status: 'active' })
    .select('*')
    .single()

  if (membershipError) {
    // The group exists but has no owner — unadministrable. Roll it back rather
    // than leaving an orphan nobody can moderate.
    console.error('[member-groups] owner membership failed, rolling back group', membershipError)
    await supabase.from('member_groups').delete().eq('id', created.id)
    return NextResponse.json({ message: 'Could not create this group.' }, { status: 500 })
  }

  return NextResponse.json(
    {
      group: mapGroupSummary(
        // member_count is maintained by trigger and was 0 at insert time.
        { ...created, member_count: 1 },
        membershipRow as GroupMemberRow,
        0,
      ),
    },
    { status: 201 },
  )
}
