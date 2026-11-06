import sharp from 'sharp'
const MAX_BYTES = 8 * 1024 * 1024
export async function renderSpotlightImage(source: string, fetchImpl: typeof fetch = fetch) {
  const url = new URL(source)
  if (url.protocol !== 'https:' || url.username || url.password || url.port || !['media.top100afl.com', 'supabase.top100afl.com', 'top100afl.com', 'www.top100afl.com'].includes(url.hostname)) throw new Error('Unsupported public image host')
  const response = await fetchImpl(url.toString(), { redirect: 'error', signal: AbortSignal.timeout(15_000), cache: 'no-store' })
  if (!response.ok || !response.body || Number(response.headers.get('content-length')) > MAX_BYTES) throw new Error('Image unavailable or too large')
  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let bytes = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      bytes += value.byteLength
      if (bytes > MAX_BYTES) throw new Error('Image too large')
      chunks.push(value)
    }
  } finally { await reader.cancel().catch(() => undefined) }
  return sharp(Buffer.concat(chunks), { limitInputPixels: 40_000_000, failOn: 'error' })
    .rotate().resize(1080, 1350, { fit: 'contain', background: '#ffffff' }).flatten({ background: '#ffffff' }).jpeg({ quality: 88 }).toBuffer()
}
