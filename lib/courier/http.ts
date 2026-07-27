// lib/courier/http.ts
// Transport for the GIG Logistics adapter: env helpers, dotted-path readers,
// a timeout/retry-aware JSON fetch, and the module-scope bearer-token cache.
//
// UNVERIFIED AGAINST A LIVE ACCOUNT. Nothing in this file has ever been run
// against a real GIG account — there are no credentials in this environment.
// Every path and every response field name is read from env with a documented
// default (see docs/gig-integration.md) so that a wrong guess is a config
// change, not a code change.

/** Read a string env var, falling back when unset or empty. */
export function env(name: string, fallback: string): string {
  const raw = process.env[name]
  return raw === undefined || raw.trim() === '' ? fallback : raw.trim()
}

/** Read a numeric env var. A malformed value falls back rather than producing NaN. */
export function envNumber(name: string, fallback: number): number {
  const raw = process.env[name]
  if (raw === undefined || raw.trim() === '') return fallback
  const parsed = Number(raw)
  return Number.isFinite(parsed) ? parsed : fallback
}

/** Read a boolean-ish env var. `1`/`true`/`yes`/`on` are true, anything else false. */
export function envFlag(name: string, fallback: boolean): boolean {
  const raw = process.env[name]
  if (raw === undefined || raw.trim() === '') return fallback
  return ['1', 'true', 'yes', 'on'].includes(raw.trim().toLowerCase())
}

/** Parse a JSON-object env var used to merge extra request fields. Invalid JSON is ignored. */
export function envJsonObject(name: string): Record<string, unknown> {
  const raw = process.env[name]
  if (!raw || raw.trim() === '') return {}
  try {
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>
    }
  } catch {
    console.error(`[gig] ${name} is not valid JSON and was ignored.`)
  }
  return {}
}

/**
 * Read a value out of an arbitrary payload by dotted path. Numeric segments
 * index into arrays: `Object.MobileShipmentTrackings.0.Status`.
 */
export function pickValue(payload: unknown, path: string): unknown {
  if (!path) return undefined
  let cursor: unknown = payload
  for (const segment of path.split('.')) {
    if (cursor === null || cursor === undefined) return undefined
    if (Array.isArray(cursor)) {
      const index = Number(segment)
      if (!Number.isInteger(index) || index < 0) return undefined
      cursor = cursor[index]
      continue
    }
    if (typeof cursor !== 'object') return undefined
    cursor = (cursor as Record<string, unknown>)[segment]
  }
  return cursor
}

/**
 * Read a finite number by dotted path. Strings are accepted because GIG has
 * been observed returning money as both a number and a numeric string, but a
 * blank or non-numeric value returns `null` — never 0. A silent 0 would become
 * a free shipment; callers must treat `null` as "no usable amount".
 */
export function pickNumber(payload: unknown, path: string): number | null {
  const value = pickValue(payload, path)
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value === 'string') {
    const trimmed = value.replace(/[,\s₦]/g, '')
    if (trimmed === '') return null
    const parsed = Number(trimmed)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

/** Read a non-empty string by dotted path. Numbers are stringified (waybills arrive as both). */
export function pickString(payload: unknown, path: string): string | null {
  const value = pickValue(payload, path)
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed === '' ? null : trimmed
  }
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  return null
}

/** Split a comma-separated list of dotted paths (the env override format). */
export function splitPaths(paths: string): string[] {
  return paths
    .split(',')
    .map((p) => p.trim())
    .filter((p) => p !== '')
}

/**
 * First path in the list that yields a usable number, with the path that
 * matched so callers can log which field name the account actually uses.
 */
export function pickFirstNumber(payload: unknown, paths: string): { value: number; path: string } | null {
  for (const path of splitPaths(paths)) {
    const value = pickNumber(payload, path)
    if (value !== null) return { value, path }
  }
  return null
}

/** First path in the list that yields a non-empty string. */
export function pickFirstString(payload: unknown, paths: string): { value: string; path: string } | null {
  for (const path of splitPaths(paths)) {
    const value = pickString(payload, path)
    if (value !== null) return { value, path }
  }
  return null
}

/** Join a base URL and a path without doubling or dropping the separator. */
export function joinUrl(base: string, path: string): string {
  if (/^https?:\/\//i.test(path)) return path
  return `${base.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`
}

export type HttpFailureKind = 'network' | 'timeout' | 'http' | 'parse'

export type HttpResult =
  | { ok: true; status: number; data: unknown }
  | { ok: false; status: number | null; data: unknown; error: string; kind: HttpFailureKind }

export type RequestOptions = {
  /** Extra attempts after the first. MUST be 0 for non-idempotent calls (booking). */
  retries?: number
  timeoutMs?: number
}

function isAbortError(error: unknown): boolean {
  const name = (error as { name?: string } | null)?.name
  return name === 'TimeoutError' || name === 'AbortError'
}

async function sleep(ms: number): Promise<void> {
  if (ms <= 0) return
  await new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * One JSON request with a timeout and bounded retries.
 *
 * Retries only on network errors, timeouts and 5xx — never on a 4xx, which is
 * a request we should fix rather than repeat. Callers booking a shipment MUST
 * pass `retries: 0`: a retried booking creates a duplicate parcel.
 */
export async function requestJson(url: string, init: RequestInit, options: RequestOptions = {}): Promise<HttpResult> {
  const retries = Math.max(0, options.retries ?? 0)
  const timeoutMs = options.timeoutMs ?? envNumber('GIG_TIMEOUT_MS', 12000)
  const retryBaseMs = envNumber('GIG_RETRY_BASE_MS', 300)

  let last: HttpResult = { ok: false, status: null, data: null, error: 'Request was never attempted.', kind: 'network' }

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    if (attempt > 0) await sleep(retryBaseMs * 2 ** (attempt - 1))

    try {
      const response = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) })
      const text = await response.text().catch(() => '')

      let data: unknown = null
      let parseFailed = false
      if (text.trim() !== '') {
        try {
          data = JSON.parse(text)
        } catch {
          parseFailed = true
          data = text
        }
      }

      if (response.ok) {
        if (parseFailed) {
          last = {
            ok: false,
            status: response.status,
            data,
            error: 'Carrier returned a non-JSON body.',
            kind: 'parse',
          }
          // A 2xx with an unparseable body will not become parseable on retry.
          return last
        }
        return { ok: true, status: response.status, data }
      }

      last = {
        ok: false,
        status: response.status,
        data,
        error: `Carrier responded with HTTP ${response.status}.`,
        kind: 'http',
      }
      if (response.status < 500) return last
    } catch (error) {
      last = isAbortError(error)
        ? { ok: false, status: null, data: null, error: `Carrier request timed out after ${timeoutMs}ms.`, kind: 'timeout' }
        : {
            ok: false,
            status: null,
            data: null,
            error: `Could not reach the carrier: ${(error as Error)?.message ?? 'unknown network error'}`,
            kind: 'network',
          }
    }
  }

  return last
}

export type GigAuth = {
  token: string
  /** `Object.UserId` — GIG echoes this back in price/shipment request bodies. */
  userId: string | null
  /** `Object.UserName` — used as `CustomerCode` on price/shipment requests. */
  customerCode: string | null
  /** Epoch ms at which the cached token must be discarded (already skew-adjusted). */
  expiresAt: number
}

let cachedAuth: GigAuth | null = null
let inflightLogin: Promise<GigAuth> | null = null

/** Test seam and deploy-time safety valve. Drops the cached bearer token. */
export function resetGigAuthCache(): void {
  cachedAuth = null
  inflightLogin = null
}

/** Exposed for assertions in tests; never log the returned token. */
export function peekGigAuthCache(): GigAuth | null {
  return cachedAuth
}

export function gigBaseUrl(): string {
  return env('GIG_API_BASE_URL', '')
}

async function login(): Promise<GigAuth> {
  const baseUrl = gigBaseUrl()
  const username = env('GIG_API_USERNAME', '')
  const password = process.env.GIG_API_PASSWORD ?? ''

  if (!baseUrl || !username || !password) {
    throw new Error('GIG is not configured: set GIG_API_BASE_URL, GIG_API_USERNAME and GIG_API_PASSWORD.')
  }

  const url = joinUrl(baseUrl, env('GIG_PATH_LOGIN', 'login'))
  // Observed login body shape: { username, Password, SessionObj }. The casing
  // is deliberate and matches the reference client; do not "fix" it.
  const body = {
    username,
    Password: password,
    SessionObj: '',
    ...envJsonObject('GIG_LOGIN_EXTRA_JSON'),
  }

  const result = await requestJson(
    url,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
    },
    { retries: envNumber('GIG_RETRIES', 2) },
  )

  if (!result.ok) {
    // Never include the request body in this message — it holds the password.
    throw new Error(`GIG login failed: ${result.error}`)
  }

  const token = pickFirstString(result.data, env('GIG_FIELD_TOKEN', 'Object.access_token,access_token,Object.Token,token'))
  if (!token) {
    throw new Error('GIG login succeeded but no access token was found in the response.')
  }

  // Token lifetime is unverified. If the response carries an expiry we use it,
  // otherwise we fall back to a short conservative TTL — a token we drop too
  // early costs one extra login; one we hold too long costs a failed dispatch.
  const expiresInSeconds = pickFirstNumber(result.data, env('GIG_FIELD_TOKEN_EXPIRY', 'Object.expires_in,expires_in,Object.ExpiresIn'))
  const ttlMs =
    expiresInSeconds && expiresInSeconds.value > 0
      ? expiresInSeconds.value * 1000
      : envNumber('GIG_TOKEN_TTL_MS', 300_000)
  const skewMs = envNumber('GIG_TOKEN_SKEW_MS', 60_000)

  return {
    token: token.value,
    userId: pickFirstString(result.data, env('GIG_FIELD_USER_ID', 'Object.UserId,Object.userId'))?.value ?? null,
    customerCode:
      pickFirstString(result.data, env('GIG_FIELD_CUSTOMER_CODE', 'Object.UserName,Object.CustomerCode'))?.value ?? null,
    // Refresh early rather than late, and never produce an already-expired entry.
    expiresAt: Date.now() + Math.max(1_000, ttlMs - skewMs),
  }
}

/**
 * Cached bearer token. `force: true` discards the cache first — used exactly
 * once per request after a 401, so an expired-token 401 costs one re-login
 * rather than a failed dispatch.
 */
export async function getGigAuth(options: { force?: boolean } = {}): Promise<GigAuth> {
  if (options.force) {
    cachedAuth = null
    inflightLogin = null
  } else if (cachedAuth && cachedAuth.expiresAt > Date.now()) {
    return cachedAuth
  }

  // Concurrent quotes must not each fire their own login.
  if (!inflightLogin) {
    inflightLogin = login()
      .then((auth) => {
        cachedAuth = auth
        return auth
      })
      .finally(() => {
        inflightLogin = null
      })
  }

  return inflightLogin
}

export type AuthedRequestOptions = RequestOptions & {
  method?: string
  body?: unknown
}

/**
 * An authenticated GIG call with the single-retry-on-401 re-login.
 *
 * The 401 re-login is applied even when `retries` is 0 (booking). That is
 * safe: a 401 means the carrier rejected the request before doing anything, so
 * no shipment can have been created. Any other failure is returned as-is.
 */
export async function gigAuthedRequest(path: string, options: AuthedRequestOptions = {}): Promise<HttpResult> {
  const url = joinUrl(gigBaseUrl(), path)
  const { method = 'POST', body, ...requestOptions } = options

  const send = async (auth: GigAuth): Promise<HttpResult> =>
    requestJson(
      url,
      {
        method,
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${auth.token}`,
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      },
      requestOptions,
    )

  const first = await send(await getGigAuth())
  if (first.ok || first.status !== 401) return first

  return send(await getGigAuth({ force: true }))
}
