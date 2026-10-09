export type HandbookPromptState = {
  eligible: boolean
  promptSeenAt: string | null
  momentCompleted: boolean
  momentDismissed: boolean
}

export function shouldShowHandbookPrompt(state: HandbookPromptState): boolean {
  return state.eligible
    && !state.promptSeenAt
    && (state.momentCompleted || state.momentDismissed)
}

export async function saveHandbookProgress(
  field: 'handbookPromptSeen' | 'handbookRead',
  fetcher: typeof fetch = fetch,
): Promise<void> {
  const response = await fetcher('/api/member/onboarding-journey', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ [field]: true }),
  })
  const result = await response.json().catch(() => ({})) as { message?: string }
  if (!response.ok) throw new Error(result.message || 'Could not save that update.')
}
