import { portfolioGenerationMessage, type PortfolioGenerationMessage } from '@/lib/media/storage-config'

type Environment = Record<string, string | undefined>
type FetchLike = typeof fetch

function required(env: Environment, name: string) {
  const value = env[name]?.trim()
  if (!value) throw new Error(name + ' is required to enqueue portfolio generation jobs.')
  return value
}

export async function enqueuePortfolioGeneration(
  input: Omit<PortfolioGenerationMessage, 'type'>,
  env: Environment = process.env,
  fetchImpl: FetchLike = fetch,
) {
  const accountId = required(env, 'CLOUDFLARE_ACCOUNT_ID')
  const queueId = required(env, 'CLOUDFLARE_QUEUE_ID')
  const token = required(env, 'CLOUDFLARE_API_TOKEN')
  const message = portfolioGenerationMessage(input)
  const response = await fetchImpl(
    'https://api.cloudflare.com/client/v4/accounts/' + accountId + '/queues/' + queueId + '/messages',
    {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content_type: 'json', body: message }),
    },
  )

  const payload = await response.json().catch(() => null) as { success?: boolean; errors?: unknown } | null
  if (!response.ok || payload?.success !== true) {
    throw new Error('Cloudflare Queue rejected the portfolio generation job.')
  }

  return message
}

export function portfolioQueueConfigured(env: Environment = process.env) {
  return Boolean(
    env.CLOUDFLARE_ACCOUNT_ID?.trim() &&
      env.CLOUDFLARE_QUEUE_ID?.trim() &&
      env.CLOUDFLARE_API_TOKEN?.trim(),
  )
}
