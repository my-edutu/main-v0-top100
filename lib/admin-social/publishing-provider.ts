import { PublicationRejected } from './publish-spotlight'
import { SPOTLIGHT_PLATFORMS, type SpotlightPlatform } from './spotlight'

type Environment = Record<string, string | undefined>
const required: Record<SpotlightPlatform, string[]> = {
  linkedin: ['SOCIAL_LINKEDIN_ACCESS_TOKEN', 'SOCIAL_LINKEDIN_ORGANIZATION_ID', 'SOCIAL_LINKEDIN_VERSION'],
  facebook: ['SOCIAL_META_PAGE_ACCESS_TOKEN', 'SOCIAL_FACEBOOK_PAGE_ID', 'SOCIAL_META_VERSION'],
  instagram: ['SOCIAL_META_PAGE_ACCESS_TOKEN', 'SOCIAL_INSTAGRAM_USER_ID', 'SOCIAL_META_VERSION'],
  x: ['SOCIAL_X_USER_ACCESS_TOKEN'],
}
export function publishingConfiguration(env: Environment = process.env) {
  return SPOTLIGHT_PLATFORMS.map(platform => ({ platform, configured: required[platform].every(key => Boolean(env[key]?.trim())) }))
}

export function createSocialPublisher(env: Environment = process.env, fetchImpl: typeof fetch = fetch) {
  async function request(url: string, token: string, body?: object, extraHeaders?: Record<string, string>, finalPost = false) {
    const response = await fetchImpl(url, {
      method: body ? 'POST' : 'GET',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...extraHeaders },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(20_000), redirect: 'error', cache: 'no-store',
    })
    if (!response.ok) {
      // 5xx/408 may occur after accepting the post. Only definite rejections
      // are safe to retry. Provider payloads can contain secrets: do not expose.
      if (!finalPost || (response.status >= 400 && response.status < 500 && response.status !== 408)) throw new PublicationRejected()
      throw new Error('Delivery unknown')
    }
    const data = await response.json().catch(() => ({}))
    return { data, headers: response.headers }
  }
  return async (platform: SpotlightPlatform, caption: string, imageUrl: string | null): Promise<{ postId: string; postUrl: string | null }> => {
    if (!publishingConfiguration(env).find(item => item.platform === platform)?.configured) throw new PublicationRejected()
    if (platform === 'linkedin') {
      if (!/^\d+$/.test(env.SOCIAL_LINKEDIN_ORGANIZATION_ID!) || !/^\d{6}$/.test(env.SOCIAL_LINKEDIN_VERSION!)) throw new PublicationRejected()
      const { headers } = await request('https://api.linkedin.com/rest/posts', env.SOCIAL_LINKEDIN_ACCESS_TOKEN!, {
        author: `urn:li:organization:${env.SOCIAL_LINKEDIN_ORGANIZATION_ID}`, commentary: caption,
        visibility: 'PUBLIC', distribution: { feedDistribution: 'MAIN_FEED', targetEntities: [], thirdPartyDistributionChannels: [] },
        lifecycleState: 'PUBLISHED', isReshareDisabledByAuthor: false,
      }, { 'LinkedIn-Version': env.SOCIAL_LINKEDIN_VERSION!, 'X-Restli-Protocol-Version': '2.0.0' }, true)
      const postId = headers.get('x-restli-id')
      if (!postId || !/^urn:li:(share|ugcPost):\d+$/.test(postId)) throw new Error('Missing post ID')
      return { postId, postUrl: `https://www.linkedin.com/feed/update/${postId}/` }
    }
    if (platform === 'x') {
      const { data } = await request('https://api.x.com/2/tweets', env.SOCIAL_X_USER_ACCESS_TOKEN!, { text: caption }, undefined, true)
      const postId = data?.data?.id
      if (typeof postId !== 'string' || !/^\d+$/.test(postId)) throw new Error('Missing post ID')
      return { postId, postUrl: `https://x.com/i/web/status/${postId}` }
    }
    if (!/^v\d+\.0$/.test(env.SOCIAL_META_VERSION!)) throw new PublicationRejected()
    const base = `https://graph.facebook.com/${env.SOCIAL_META_VERSION}`
    const token = env.SOCIAL_META_PAGE_ACCESS_TOKEN!
    if (platform === 'facebook') {
      if (!/^\d+$/.test(env.SOCIAL_FACEBOOK_PAGE_ID!)) throw new PublicationRejected()
      const { data } = await request(`${base}/${env.SOCIAL_FACEBOOK_PAGE_ID}/feed`, token, { message: caption }, undefined, true)
      if (typeof data.id !== 'string' || !/^[\d_]+$/.test(data.id)) throw new Error('Missing post ID')
      return { postId: data.id, postUrl: `https://www.facebook.com/${data.id}` }
    }
    if (!imageUrl || !imageUrl.startsWith('https://') || !/^\d+$/.test(env.SOCIAL_INSTAGRAM_USER_ID!)) throw new PublicationRejected()
    // Instagram requires public image media, unlike the text/link posts above.
    const container = await request(`${base}/${env.SOCIAL_INSTAGRAM_USER_ID}/media`, token, { image_url: imageUrl, caption })
    if (typeof container.data.id !== 'string' || !/^\d+$/.test(container.data.id)) throw new PublicationRejected()
    let ready = false
    for (let attempt = 0; attempt < 8; attempt++) {
      const status = await request(`${base}/${container.data.id}?fields=status_code`, token)
      if (status.data.status_code === 'FINISHED') { ready = true; break }
      if (['ERROR', 'EXPIRED'].includes(status.data.status_code)) throw new PublicationRejected()
      await new Promise(resolve => setTimeout(resolve, 1500))
    }
    if (!ready) throw new PublicationRejected()
    const { data } = await request(`${base}/${env.SOCIAL_INSTAGRAM_USER_ID}/media_publish`, token, { creation_id: container.data.id }, undefined, true)
    if (typeof data.id !== 'string' || !/^\d+$/.test(data.id)) throw new Error('Missing post ID')
    // Failure to retrieve the permalink must not turn a confirmed post into failure.
    let postUrl: string | null = null
    try {
      const media = await request(`${base}/${data.id}?fields=permalink`, token)
      const link = new URL(media.data.permalink)
      if (link.protocol === 'https:' && ['www.instagram.com', 'instagram.com'].includes(link.hostname)) postUrl = link.toString()
    } catch { /* The platform has already confirmed the post ID. */ }
    return { postId: data.id, postUrl }
  }
}
