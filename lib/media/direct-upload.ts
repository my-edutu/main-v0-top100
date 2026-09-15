import { createHmac, timingSafeEqual, randomUUID } from 'node:crypto'
import { GetObjectCommand, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { getMediaStorageConfig } from './storage-config'
import { createR2Client } from './r2'

export type UploadPurpose = 'avatar' | 'portrait' | 'editor'
type Ticket = { key: string; userId: string; purpose: UploadPurpose; size: number; contentType: string; expires: number }
const limits = { avatar: 5 * 1024 * 1024, portrait: 8 * 1024 * 1024, editor: 8 * 1024 * 1024 }

export function validateDirectUpload(purpose: UploadPurpose, size: number, contentType: string) {
  return Object.hasOwn(limits, purpose) && Number.isInteger(size) && size > 0 && size <= limits[purpose] &&
    ['image/jpeg', 'image/png', 'image/webp'].includes(contentType)
}

export function signUploadTicket(ticket: Ticket, secret: string) {
  const body = Buffer.from(JSON.stringify(ticket)).toString('base64url')
  return `${body}.${createHmac('sha256', secret).update(body).digest('base64url')}`
}

export function verifyUploadTicket(token: string, userId: string, purpose: UploadPurpose, secret: string): Ticket {
  const [body, signature, extra] = token.split('.')
  if (!body || !signature || extra) throw new Error('Invalid upload receipt.')
  const expected = createHmac('sha256', secret).update(body).digest()
  const supplied = Buffer.from(signature, 'base64url')
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) throw new Error('Invalid upload receipt.')
  const ticket = JSON.parse(Buffer.from(body, 'base64url').toString()) as Ticket
  if (ticket.userId !== userId || ticket.purpose !== purpose || ticket.expires <= Date.now() ||
      !validateDirectUpload(ticket.purpose, ticket.size, ticket.contentType) ||
      !ticket.key.startsWith(`incoming/${userId}/`)) throw new Error('Upload receipt expired or belongs to another request.')
  return ticket
}

function connection() {
  const config = getMediaStorageConfig()
  if (config.provider !== 'r2') throw new Error('Direct uploads unavailable.')
  return { config, client: createR2Client(config) }
}

export async function prepareDirectUpload(userId: string, purpose: UploadPurpose, size: number, contentType: string) {
  if (!validateDirectUpload(purpose, size, contentType)) throw new Error('Upload a JPEG, PNG or WebP within the size limit.')
  const { config, client } = connection()
  const ticket: Ticket = { key: `incoming/${userId}/${randomUUID()}`, userId, purpose, size, contentType, expires: Date.now() + 15 * 60_000 }
  const url = await getSignedUrl(client, new PutObjectCommand({ Bucket: config.privateBucket, Key: ticket.key, ContentType: contentType, ContentLength: size }), { expiresIn: 300, signableHeaders: new Set(['content-type', 'content-length']) })
  return { url, ticket: signUploadTicket(ticket, config.secretAccessKey) }
}

export async function readDirectUpload(token: string, userId: string, purpose: UploadPurpose) {
  const { config, client } = connection()
  const ticket = verifyUploadTicket(token, userId, purpose, config.secretAccessKey)
  // A bounded range prevents a malicious oversized object from exhausting memory.
  const object = await client.send(new GetObjectCommand({ Bucket: config.privateBucket, Key: ticket.key, Range: `bytes=0-${ticket.size}` }))
  if (!object.Body) throw new Error('Upload not found.')
  const bytes = Buffer.from(await object.Body.transformToByteArray())
  if (bytes.length !== ticket.size || object.ContentType !== ticket.contentType) throw new Error('Uploaded file does not match the receipt.')
  return { bytes, contentType: ticket.contentType, remove: () => client.send(new DeleteObjectCommand({ Bucket: config.privateBucket, Key: ticket.key })) }
}
