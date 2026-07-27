// lib/uploads/validate.ts
// Pure validation for member-supplied uploads. Kept free of Next/Supabase so
// it can be unit-tested and reused by any upload surface.

/**
 * SVG is deliberately excluded: it can carry script and would be served from
 * our own origin, so an allowed SVG upload is a stored-XSS primitive.
 */
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024

const EXTENSION_BY_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

export function validateUpload(file: { type: string; size: number; name: string }):
  | { ok: true }
  | { ok: false; reason: string } {
  if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
    return { ok: false, reason: 'Upload a JPG, PNG or WebP image.' }
  }
  if (file.size <= 0) {
    return { ok: false, reason: 'That file is empty.' }
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return { ok: false, reason: 'Images must be 5MB or smaller.' }
  }
  return { ok: true }
}

/**
 * Build the storage key. The member id prefix is what stops one member from
 * overwriting another's file, so the remainder of the name is aggressively
 * sanitised — a caller-supplied name must never be able to escape the prefix.
 */
export function memberUploadPath(profileId: string, fileName: string, now: number = Date.now()): string {
  const rawExtension = fileName.includes('.') ? fileName.split('.').pop() ?? '' : ''
  const extension = /^[a-zA-Z0-9]{1,5}$/.test(rawExtension) ? rawExtension.toLowerCase() : 'jpg'

  const base = fileName
    .replace(/\.[^/.]+$/, '')
    .replace(/[^a-zA-Z0-9-_]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60)

  return `members/${profileId}/${base || 'upload'}-${now}.${extension === 'jpeg' ? 'jpg' : extension}`
}

/** The canonical extension for an allowed MIME type. */
export function extensionForType(type: string): string {
  return EXTENSION_BY_TYPE[type] ?? 'jpg'
}
