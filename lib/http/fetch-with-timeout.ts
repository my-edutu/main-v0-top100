const DEFAULT_FETCH_TIMEOUT_MS = 12_000

export class FetchTimeoutError extends Error {
  constructor(message = 'The request took too long. Please try again.') {
    super(message)
    this.name = 'FetchTimeoutError'
  }
}

export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = DEFAULT_FETCH_TIMEOUT_MS,
  fetchImpl: typeof fetch = fetch,
): Promise<Response> {
  const controller = new AbortController()
  let timedOut = false
  const forwardAbort = () => controller.abort(init.signal?.reason)

  if (init.signal?.aborted) forwardAbort()
  else init.signal?.addEventListener('abort', forwardAbort, { once: true })

  const timer = setTimeout(() => {
    timedOut = true
    controller.abort(new FetchTimeoutError())
  }, timeoutMs)

  try {
    return await fetchImpl(input, { ...init, signal: controller.signal })
  } catch (error) {
    if (timedOut) throw new FetchTimeoutError()
    throw error
  } finally {
    clearTimeout(timer)
    init.signal?.removeEventListener('abort', forwardAbort)
  }
}
