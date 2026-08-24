import { createSign } from 'node:crypto'

const GOOGLE_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token'

type CachedToken = {
  accessToken: string
  expiresAt: number
}

const tokenCache = new Map<string, CachedToken>()

const base64Url = (value: string | Buffer) =>
  Buffer.from(value).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')

const requiredEnv = (name: string) => {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`${name} is required for Google document processing`)
  return value
}

const normalizePrivateKey = (value: string) => value.replace(/\\n/g, '\n')

export async function getGoogleServiceAccountAccessToken({
  scopes,
  subject,
}: {
  scopes: string[]
  subject?: string
}): Promise<string> {
  const clientEmail = requiredEnv('GOOGLE_SELECTION_SERVICE_ACCOUNT_EMAIL')
  const privateKey = normalizePrivateKey(requiredEnv('GOOGLE_SELECTION_SERVICE_ACCOUNT_PRIVATE_KEY'))
  const scope = Array.from(new Set(scopes)).sort().join(' ')
  const cacheKey = `${clientEmail}|${subject ?? ''}|${scope}`
  const cached = tokenCache.get(cacheKey)

  if (cached && cached.expiresAt - Date.now() > 60_000) {
    return cached.accessToken
  }

  const issuedAt = Math.floor(Date.now() / 1000) - 30
  const expiresAt = issuedAt + 3600
  const header = base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const claims = base64Url(
    JSON.stringify({
      iss: clientEmail,
      scope,
      aud: GOOGLE_TOKEN_ENDPOINT,
      iat: issuedAt,
      exp: expiresAt,
      ...(subject ? { sub: subject } : {}),
    }),
  )
  const unsignedJwt = `${header}.${claims}`
  const signer = createSign('RSA-SHA256')
  signer.update(unsignedJwt)
  signer.end()
  const assertion = `${unsignedJwt}.${base64Url(signer.sign(privateKey))}`

  const response = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
    cache: 'no-store',
  })

  const payload = (await response.json().catch(() => null)) as
    | { access_token?: string; expires_in?: number; error?: string; error_description?: string }
    | null

  if (!response.ok || !payload?.access_token) {
    const detail = payload?.error_description || payload?.error || `HTTP ${response.status}`
    throw new Error(`Google authentication failed: ${detail}`)
  }

  const lifetimeSeconds = Number.isFinite(payload.expires_in) ? Number(payload.expires_in) : 3600
  tokenCache.set(cacheKey, {
    accessToken: payload.access_token,
    expiresAt: Date.now() + lifetimeSeconds * 1000,
  })

  return payload.access_token
}
