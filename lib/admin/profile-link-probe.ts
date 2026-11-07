import { Resolver } from 'node:dns/promises'
import { request as httpRequest } from 'node:http'
import { request as httpsRequest } from 'node:https'
import { BlockList, isIP } from 'node:net'
import { qualityLinkUrl, type LinkResult } from './profile-quality'

const blocked = new BlockList()
for (const [range, prefix] of [
  ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8],
  ['169.254.0.0', 16], ['172.16.0.0', 12], ['192.0.0.0', 24], ['192.0.2.0', 24],
  ['192.88.99.0', 24], ['192.168.0.0', 16], ['198.18.0.0', 15],
  ['198.51.100.0', 24], ['203.0.113.0', 24], ['224.0.0.0', 3],
] as const) blocked.addSubnet(range, prefix)

const resolver = new Resolver({ timeout: 1800, tries: 1 })

async function probe(url: URL, method: 'HEAD' | 'GET', signal: AbortSignal) {
  if (signal.aborted || isIP(url.hostname) || url.hostname.startsWith('[') || !url.hostname.includes('.')) {
    throw new Error('Unsupported destination')
  }
  const addresses = await resolver.resolve4(url.hostname)
  if (!addresses.length || addresses.some(address => blocked.check(address))) throw new Error('Non-public destination')
  const address = addresses[0]
  return new Promise<{ code: number; location?: string; type?: string }>((resolve, reject) => {
    const request = url.protocol === 'https:' ? httpsRequest : httpRequest
    const outgoing = request(url, {
      method,
      signal,
      agent: false,
      family: 4,
      // Pin the validated address while keeping the URL hostname for TLS and Host.
      lookup: (_host, options, callback) => {
        if (options.all) callback(null, [{ address, family: 4 }])
        else callback(null, address, 4)
      },
      headers: method === 'GET' ? { Range: 'bytes=0-0' } : {},
    }, response => {
      resolve({ code: response.statusCode ?? 0, location: response.headers.location, type: response.headers['content-type'] })
      response.destroy()
    })
    outgoing.on('error', reject)
    outgoing.end()
  })
}

export async function checkProfileLink(target: { label: string; url: string; image: boolean }, signal: AbortSignal): Promise<LinkResult> {
  let url = qualityLinkUrl(target.url)
  const host = url?.hostname ?? ''
  const result = (status: LinkResult['status'], reason: string): LinkResult => ({ label: target.label, host, status, reason })
  if (!url) return result('broken', 'Invalid web address')
  try {
    for (let hop = 0; hop < 4; hop++) {
      let response = await probe(url, 'HEAD', signal)
      if ([404, 405, 410, 501].includes(response.code)) response = await probe(url, 'GET', signal)
      if ([301, 302, 303, 307, 308].includes(response.code) && response.location) {
        url = qualityLinkUrl(new URL(response.location, url).href)
        if (!url) return result('review', 'Redirect needs a manual check')
        continue
      }
      if ([404, 410].includes(response.code)) return result('broken', `Page or file missing (HTTP ${response.code})`)
      if (response.code < 200 || response.code >= 300) return result('review', `Manual check needed (HTTP ${response.code})`)
      if (target.image && !response.type?.startsWith('image/')) return result('review', 'The address did not return an image')
      return result('working', 'Reachable')
    }
    return result('review', 'Too many redirects')
  } catch {
    return result('review', 'Could not verify this address')
  }
}
