import { createAdminClient } from '@/lib/supabase/server'

import { createR2MediaStore } from './r2'
import { getMediaStorageConfig, mediaObjectKey, type MediaStorageConfig } from './storage-config'

type UploadOptions = {
  bucket: string
  path: string
  body: Uint8Array
  contentType: string
  cacheControl?: string
  upsert?: boolean
}

function r2Key(bucket: string, path: string) {
  return mediaObjectKey(bucket, path)
}

export function physicalR2BucketName(
  logicalBucket: string,
  config: Extract<MediaStorageConfig, { provider: 'r2' }>,
  env: Record<string, string | undefined> = process.env,
) {
  const privateLogicalBuckets = new Set([
    env.PORTFOLIO_SOURCE_BUCKET?.trim() || 'portfolio-sources',
    env.PORTFOLIO_OPTION_BUCKET?.trim() || 'portfolio-options',
  ])
  return privateLogicalBuckets.has(logicalBucket) ? config.privateBucket : config.bucket
}

function r2StoreFor(config: Extract<MediaStorageConfig, { provider: 'r2' }>, logicalBucket: string) {
  return createR2MediaStore({
    ...config,
    bucket: physicalR2BucketName(logicalBucket, config),
  })
}

export async function uploadMedia(options: UploadOptions) {
  const config = getMediaStorageConfig()

  if (config.provider === 'r2') {
    const store = r2StoreFor(config, options.bucket)
    const key = r2Key(options.bucket, options.path)
    const uploaded = await store.put(key, options.body, {
      contentType: options.contentType,
      cacheControl: options.cacheControl,
      upsert: options.upsert,
    })
    return { path: key, publicUrl: uploaded.url }
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase.storage.from(options.bucket).upload(options.path, options.body, {
    contentType: options.contentType,
    cacheControl: options.cacheControl,
    upsert: options.upsert ?? false,
  })
  if (error) throw error

  const { data: publicUrl } = supabase.storage.from(options.bucket).getPublicUrl(data.path)
  return { path: data.path, publicUrl: publicUrl.publicUrl }
}

export async function downloadMedia(bucket: string, path: string) {
  const config = getMediaStorageConfig()
  if (config.provider === 'r2') {
    return r2StoreFor(config, bucket).download(r2Key(bucket, path))
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase.storage.from(bucket).download(path)
  if (error) throw error
  return Buffer.from(await data.arrayBuffer())
}

export async function signedMediaUrl(bucket: string, path: string, expiresIn = 900) {
  const config = getMediaStorageConfig()
  if (config.provider === 'r2') {
    return r2StoreFor(config, bucket).signedGetUrl(r2Key(bucket, path), expiresIn)
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn)
  if (error) throw error
  return data.signedUrl
}

export function publicMediaUrl(bucket: string, path: string) {
  const config = getMediaStorageConfig()
  if (config.provider === 'r2') {
    return r2StoreFor(config, bucket).publicUrl(r2Key(bucket, path))
  }

  const supabase = createAdminClient()
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl
}
