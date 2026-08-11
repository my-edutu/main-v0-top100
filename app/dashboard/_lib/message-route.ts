export type MessageRecipient = {
  profileId: string
  name: string
}

type MessageRecipientSearchParams = Pick<URLSearchParams, 'get'>

export function parseMessageRecipient(searchParams: MessageRecipientSearchParams): MessageRecipient | null {
  const profileId = searchParams.get('to')?.trim()
  const name = searchParams.get('name')?.trim()

  if (!profileId || !name) return null

  return { profileId, name }
}
