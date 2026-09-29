export const MEMBER_GROUPS_ENABLED = false
export const MEMBER_GROUPS_LOCKED_MESSAGE = 'Groups are currently unavailable. Please check back later.'

export function memberGroupsLockedResponse() {
  return Response.json(
    { locked: true, message: MEMBER_GROUPS_LOCKED_MESSAGE },
    { status: 423 },
  )
}
