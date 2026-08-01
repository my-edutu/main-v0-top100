/**
 * Shrinks images already sitting in Supabase Storage.
 *
 * The upload routes now cap and re-encode on the way in, but everything
 * uploaded before that is still a full-resolution original — and those are the
 * objects actually being served, so they are the ones still costing egress.
 *
 * Objects are rewritten IN PLACE, at the same path, with only the bytes and
 * the content-type changing. Nothing in the database references a size or a
 * format, so no rows need touching and no URL breaks. A `.jpg` path serving
 * `image/webp` is fine: browsers honour the header, not the extension.
 *
 *   node scripts/backfill-storage-images.mjs              # dry run, reports only
 *   node scripts/backfill-storage-images.mjs --apply      # actually rewrites
 *   node scripts/backfill-storage-images.mjs --apply --bucket=awardees
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY. Safe to re-run: an object that is
 * already small enough is skipped, so a second pass is a no-op.
 */
import path from 'node:path'
import process from 'node:process'

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import sharp from 'sharp'

dotenv.config({ path: path.join(process.cwd(), '.env.local') })
dotenv.config({ path: path.join(process.cwd(), '.env') })

const AVATAR_PRESET = { maxDimension: 512, quality: 82 }
const PHOTO_PRESET = { maxDimension: 1600, quality: 80 }

/** Mirrors lib/image-processing.ts. Avatars render small everywhere. */
const PRESET_BY_BUCKET = {
  avatars: AVATAR_PRESET,
  awardees: PHOTO_PRESET,
  uploads: PHOTO_PRESET,
}

const args = process.argv.slice(2)
const apply = args.includes('--apply')
const bucketArg = args.find((a) => a.startsWith('--bucket='))?.split('=')[1]
const buckets = bucketArg ? [bucketArg] : Object.keys(PRESET_BY_BUCKET)

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !key) {
  console.error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY first.')
  process.exit(1)
}

const supabase = createClient(url, key)

const mb = (bytes) => `${(bytes / 1024 / 1024).toFixed(2)}MB`

/** Storage lists 100 at a time; walk until a short page comes back. */
async function listAll(bucket, prefix = '') {
  const out = []
  for (let offset = 0; ; offset += 100) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(prefix, { limit: 100, offset, sortBy: { column: 'name', order: 'asc' } })

    if (error) throw new Error(`list ${bucket}/${prefix}: ${error.message}`)
    if (!data || data.length === 0) break

    for (const entry of data) {
      const full = prefix ? `${prefix}/${entry.name}` : entry.name
      // Storage fakes folders; an entry with no id is a prefix, not an object.
      if (entry.id === null) out.push(...(await listAll(bucket, full)))
      else out.push({ path: full, size: entry.metadata?.size ?? 0 })
    }

    if (data.length < 100) break
  }
  return out
}

async function backfillBucket(bucket) {
  const preset = PRESET_BY_BUCKET[bucket] ?? PHOTO_PRESET
  let objects
  try {
    objects = await listAll(bucket)
  } catch (error) {
    console.error(`  ! ${error.message}`)
    return { before: 0, after: 0, rewritten: 0 }
  }

  console.log(`\n${bucket}: ${objects.length} objects, ${mb(objects.reduce((n, o) => n + o.size, 0))}`)

  let before = 0
  let after = 0
  let rewritten = 0

  for (const object of objects) {
    const { data, error } = await supabase.storage.from(bucket).download(object.path)
    if (error || !data) {
      console.warn(`  ? skip ${object.path}: ${error?.message ?? 'no body'}`)
      continue
    }

    const original = Buffer.from(await data.arrayBuffer())
    before += original.byteLength

    let processed
    try {
      processed = await sharp(original, { animated: true })
        .rotate()
        .resize(preset.maxDimension, preset.maxDimension, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: preset.quality })
        .toBuffer()
    } catch {
      // SVGs, pdfs, anything sharp will not decode. Leave it exactly as it is.
      after += original.byteLength
      continue
    }

    // Re-encoding is not guaranteed to win — a small png can grow as webp.
    // Only rewrite when it is an actual improvement.
    if (processed.byteLength >= original.byteLength * 0.9) {
      after += original.byteLength
      continue
    }

    after += processed.byteLength
    rewritten += 1
    console.log(
      `  ${apply ? '>' : 'would'} ${object.path}: ${mb(original.byteLength)} -> ${mb(processed.byteLength)}`,
    )

    if (apply) {
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(object.path, processed, {
          contentType: 'image/webp',
          cacheControl: String(60 * 60 * 24 * 365),
          upsert: true,
        })
      if (uploadError) console.error(`  ! ${object.path}: ${uploadError.message}`)
    }
  }

  return { before, after, rewritten }
}

const totals = { before: 0, after: 0, rewritten: 0 }
for (const bucket of buckets) {
  const result = await backfillBucket(bucket)
  totals.before += result.before
  totals.after += result.after
  totals.rewritten += result.rewritten
}

console.log(
  `\n${apply ? 'Rewrote' : 'Would rewrite'} ${totals.rewritten} objects: ` +
    `${mb(totals.before)} -> ${mb(totals.after)}`,
)
if (!apply) console.log('Dry run. Re-run with --apply to write.')
