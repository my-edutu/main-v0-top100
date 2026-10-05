/** Cancel the network operation itself, including on browsers without AbortSignal.any. */
export function createTimedFetch(fetcher: typeof globalThis.fetch, timeoutMs = 15_000): typeof globalThis.fetch {
  return async (input, init) => {
    const controller = new AbortController()
    const upstream = init?.signal ?? (typeof Request !== 'undefined' && input instanceof Request ? input.signal : undefined)
    const cancel = () => controller.abort(upstream?.reason)
    if (upstream?.aborted) cancel()
    else upstream?.addEventListener('abort', cancel, { once: true })
    const timeout = setTimeout(() => controller.abort(new DOMException('Request timed out. Please try again.', 'TimeoutError')), timeoutMs)
    try {
      return await fetcher(input, { ...init, signal: controller.signal })
    } finally {
      clearTimeout(timeout)
      upstream?.removeEventListener('abort', cancel)
    }
  }
}
