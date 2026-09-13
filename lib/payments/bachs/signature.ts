import { createHmac, timingSafeEqual } from 'node:crypto'

export type VerifyBachsSignatureInput = {
  rawBody: string | Uint8Array
  timestampHeader: string | null | undefined
  signatureHeader: string | null | undefined
  secret: string
  nowSeconds?: number
  toleranceSeconds?: number
}

/** Verify Bachs' timestamped HMAC over the exact raw request bytes. */
export function verifyBachsSignature(input: VerifyBachsSignatureInput): boolean {
  const { rawBody, timestampHeader, signatureHeader, secret } = input
  if (!secret || !timestampHeader || !signatureHeader) return false
  if (!/^(0|[1-9]\d*)$/.test(timestampHeader)) return false
  if (!/^[0-9a-f]{64}$/.test(signatureHeader)) return false

  const timestamp = Number(timestampHeader)
  const nowSeconds = input.nowSeconds ?? Math.floor(Date.now() / 1_000)
  const toleranceSeconds = input.toleranceSeconds ?? 300
  if (!Number.isSafeInteger(timestamp) || !Number.isSafeInteger(nowSeconds)) return false
  if (!Number.isSafeInteger(toleranceSeconds) || toleranceSeconds < 0) return false
  if (Math.abs(nowSeconds - timestamp) > toleranceSeconds) return false

  const body = typeof rawBody === 'string' ? Buffer.from(rawBody, 'utf8') : Buffer.from(rawBody)
  const message = Buffer.concat([Buffer.from(`${timestamp}.`, 'utf8'), body])
  const expected = createHmac('sha256', secret).update(message).digest()
  const provided = Buffer.from(signatureHeader, 'hex')
  return expected.length === provided.length && timingSafeEqual(expected, provided)
}
