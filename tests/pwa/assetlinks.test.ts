import { afterEach, expect, it, vi } from 'vitest'
import { GET } from '@/app/.well-known/assetlinks.json/route'

afterEach(() => vi.unstubAllEnvs())
it('does not publish an unverified Android association', async () => {
  vi.stubEnv('ANDROID_PACKAGE_NAME', '')
  vi.stubEnv('ANDROID_SHA256_CERT_FINGERPRINTS', '')
  expect(GET().status).toBe(503)
})
it('publishes the actual Play signing certificates, allowing key rotation', async () => {
  const fingerprint = Array(32).fill('AB').join(':')
  vi.stubEnv('ANDROID_PACKAGE_NAME', 'com.top100afl.app')
  vi.stubEnv('ANDROID_SHA256_CERT_FINGERPRINTS', fingerprint)
  const response = GET()
  expect(response.status).toBe(200)
  expect(await response.json()).toEqual([{
    relation: ['delegate_permission/common.handle_all_urls'],
    target: { namespace: 'android_app', package_name: 'com.top100afl.app', sha256_cert_fingerprints: [fingerprint] },
  }])
  expect(response.headers.get('Cache-Control')).toContain('no-store')
})
it('rejects malformed certificates instead of making verification look configured', () => {
  vi.stubEnv('ANDROID_PACKAGE_NAME', 'com.top100afl.app')
  vi.stubEnv('ANDROID_SHA256_CERT_FINGERPRINTS', 'replace-me')
  expect(GET().status).toBe(503)
})
