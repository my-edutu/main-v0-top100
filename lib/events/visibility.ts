export const EVENT_VISIBILITIES = ['public', 'awardee_only', 'private'] as const
export type EventVisibility = (typeof EVENT_VISIBILITIES)[number]

export function isPublicEventVisibility(value: unknown): value is 'public' {
  return value === 'public'
}

export function isAwardeeOnlyEventVisibility(value: unknown): value is 'awardee_only' {
  return value === 'awardee_only'
}
