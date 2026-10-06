'use client'

import NextImage, { type ImageProps } from 'next/image'
import { useState } from 'react'
import { isDriveImage, resolveRemoteImageSource } from '@/lib/media/remote-image-source'
export type { ImageProps, StaticImageData } from 'next/image'

const FALLBACK = '/image-unavailable.svg'

/** Preserve normal Next image optimization. Drive images bypass the optimizer
 * because redirects and private sharing pages aren't supported image sources. */
export default function SafeImage({ src, onError, unoptimized, ...props }: ImageProps) {
  const [failedSource, setFailedSource] = useState<ImageProps['src'] | null>(null)
  const source = typeof src === 'string' ? resolveRemoteImageSource(src) : src
  const fallback = !source || failedSource === src
  return <NextImage {...props} src={fallback ? FALLBACK : source} unoptimized={unoptimized || (typeof src === 'string' && isDriveImage(src))} onError={event => {
    if (!fallback) setFailedSource(src)
    onError?.(event)
  }} />
}
