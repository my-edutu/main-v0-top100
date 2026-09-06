export type MediaStorageConfig =
  | { provider: 'supabase' }
  | {
      provider: 'r2'
      accountId: string
      accessKeyId: string
      secretAccessKey: string
      bucket: string
      privateBucket: string
      publicUrl: string
    }

type Environment = Record<string, string | undefined>

const trim = (value: string | undefined) => value?.trim() || ''

export function getMediaStorageConfig(env: Environment = process.env): MediaStorageConfig {
  const provider = trim(env.MEDIA_STORAGE_PROVIDER).toLowerCase()
  if (provider !== 'r2') return { provider: 'supabase' }

  const accountId = trim(env.CLOUDFLARE_R2_ACCOUNT_ID)
  const accessKeyId = trim(env.CLOUDFLARE_R2_ACCESS_KEY_ID)
  const secretAccessKey = trim(env.CLOUDFLARE_R2_SECRET_ACCESS_KEY)
  const bucket = trim(env.CLOUDFLARE_R2_BUCKET)
  const privateBucket = trim(env.CLOUDFLARE_R2_PRIVATE_BUCKET)
  const publicUrl = trim(env.CLOUDFLARE_R2_PUBLIC_URL).replace(/\/$/, '')

  const missing = [
    ['CLOUDFLARE_R2_ACCOUNT_ID', accountId],
    ['CLOUDFLARE_R2_ACCESS_KEY_ID', accessKeyId],
    ['CLOUDFLARE_R2_SECRET_ACCESS_KEY', secretAccessKey],
    ['CLOUDFLARE_R2_BUCKET', bucket],
    ['CLOUDFLARE_R2_PRIVATE_BUCKET', privateBucket],
    ['CLOUDFLARE_R2_PUBLIC_URL', publicUrl],
  ]
    .filter(([, value]) => !value)
    .map(([name]) => name)

  if (missing.length > 0) {
    throw new Error(`R2 media storage is incomplete. Missing: ${missing.join(', ')}`)
  }

  return { provider: 'r2', accountId, accessKeyId, secretAccessKey, bucket, privateBucket, publicUrl }
}

function safeSegment(value: string) {
  return value
    .replaceAll('\\', '/')
    .split('/')
    .filter((segment) => segment && segment !== '.' && segment !== '..')
    .map((segment) => segment.replace(/[^a-zA-Z0-9._-]/g, '-'))
    .filter(Boolean)
}

export function mediaObjectKey(namespace: string, ...parts: string[]) {
  return [namespace, ...parts].flatMap(safeSegment).join('/')
}

export type PortfolioGenerationMessage = {
  type: 'portfolio-cover.generate'
  generationId: string
  memberId: string
  attempt: number
}

export function portfolioGenerationMessage(input: Omit<PortfolioGenerationMessage, 'type'>): PortfolioGenerationMessage {
  return { type: 'portfolio-cover.generate', ...input }
}
