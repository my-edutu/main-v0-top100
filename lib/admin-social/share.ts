export type ShareOutcome = 'shared' | 'shared_with_image' | 'cancelled' | 'unavailable' | 'failed'

type ShareData = {
  title: string
  text: string
  url: string
  files?: File[]
}

type NavigatorShare = {
  share?: (data: ShareData) => Promise<void>
  canShare?: (data?: ShareData) => boolean
}

export async function shareSocialDraft(
  draft: { caption: string; profileUrl: string; imageUrl: string | null },
  navigatorShare: NavigatorShare = typeof navigator === 'undefined' ? {} : navigator,
  fetchImpl: typeof fetch = fetch,
  preparedImage?: File | null,
): Promise<ShareOutcome> {
  if (!navigatorShare.share) return 'unavailable'
  const base: ShareData = {
    title: 'Africa Future Leaders',
    text: draft.caption,
    url: draft.profileUrl,
  }

  try {
    if (preparedImage && preparedImage.size > 0 && preparedImage.size <= 15 * 1024 * 1024) {
      let supportsFileShare = false
      try {
        supportsFileShare = Boolean(navigatorShare.canShare?.({ ...base, files: [preparedImage] }))
      } catch {
        // Some browsers throw when probing share data they do not support.
      }
      if (supportsFileShare) {
        await navigatorShare.share({ ...base, files: [preparedImage] })
        return 'shared_with_image'
      }
    }

    if (draft.imageUrl && preparedImage === undefined) {
      let file: File | null = null
      try {
        const response = await fetchImpl(draft.imageUrl, { mode: 'cors' })
        if (response.ok) {
          const blob = await response.blob()
          const type = blob.type.split(';', 1)[0].trim().toLowerCase()
          const extensions: Record<string, string> = {
            'image/jpeg': 'jpg',
            'image/png': 'png',
            'image/webp': 'webp',
          }
          const extension = extensions[type]
          if (extension && blob.size > 0 && blob.size <= 15 * 1024 * 1024) {
            file = new File([blob], `afl-awardee.${extension}`, { type })
          }
        }
      } catch {
        // Image transfer can be blocked by CORS or unsupported by the device.
        // Keep the caption and profile link shareable regardless.
      }

      if (file) {
        let supportsFileShare = false
        try {
          supportsFileShare = Boolean(navigatorShare.canShare?.({ ...base, files: [file] }))
        } catch {
          // Some browsers throw when probing share data they do not support.
        }
        if (supportsFileShare) {
          await navigatorShare.share({ ...base, files: [file] })
          return 'shared_with_image'
        }
      }
    }
    await navigatorShare.share(base)
    return 'shared'
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') return 'cancelled'
    return 'failed'
  }
}

export async function prepareSocialImage(imageUrl: string, fetchImpl: typeof fetch = fetch): Promise<File | null> {
  try {
    const response = await fetchImpl(imageUrl, { mode: 'cors' })
    if (!response.ok) return null
    const blob = await response.blob()
    const type = blob.type.split(';', 1)[0].trim().toLowerCase()
    const extensions: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
    }
    const extension = extensions[type]
    if (!extension || blob.size === 0 || blob.size > 15 * 1024 * 1024) return null
    return new File([blob], `afl-awardee.${extension}`, { type })
  } catch {
    return null
  }
}
