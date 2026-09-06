import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

import { getMediaStorageConfig, type MediaStorageConfig } from './storage-config'

type R2Client = Pick<S3Client, 'send'>

function assertR2Config(config: MediaStorageConfig): asserts config is Extract<MediaStorageConfig, { provider: 'r2' }> {
  if (config.provider !== 'r2') throw new Error('R2 media storage is not enabled.')
}

function publicObjectUrl(baseUrl: string, key: string) {
  return baseUrl + '/' + key.split('/').map(encodeURIComponent).join('/')
}

export function createR2Client(config: MediaStorageConfig = getMediaStorageConfig()) {
  assertR2Config(config)
  return new S3Client({
    region: 'auto',
    endpoint: 'https://' + config.accountId + '.r2.cloudflarestorage.com',
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  })
}

export function createR2MediaStore(
  config: MediaStorageConfig = getMediaStorageConfig(),
  client: R2Client = createR2Client(config),
) {
  assertR2Config(config)

  return {
    async put(
      key: string,
      body: Uint8Array,
      options: { contentType: string; cacheControl?: string; upsert?: boolean },
    ) {
      await client.send(
        new PutObjectCommand({
          Bucket: config.bucket,
          Key: key,
          Body: body,
          ContentType: options.contentType,
          CacheControl: options.cacheControl,
        }),
      )

      return { key, url: publicObjectUrl(config.publicUrl, key) }
    },

    async download(key: string) {
      const result = await client.send(
        new GetObjectCommand({ Bucket: config.bucket, Key: key }),
      )
      if (!result.Body) throw new Error('R2 object "' + key + '" has no response body.')
      return Buffer.from(await result.Body.transformToByteArray())
    },

    async signedGetUrl(key: string, expiresIn = 900) {
      return getSignedUrl(
        client as S3Client,
        new GetObjectCommand({ Bucket: config.bucket, Key: key }),
        { expiresIn },
      )
    },

    async remove(key: string) {
      await client.send(new DeleteObjectCommand({ Bucket: config.bucket, Key: key }))
    },

    publicUrl(key: string) {
      return publicObjectUrl(config.publicUrl, key)
    },
  }
}
