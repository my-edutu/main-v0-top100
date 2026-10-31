export const dynamic = 'force-dynamic'

/** Use the Play app-signing certificate, not just the local upload key. */
export function GET() {
  const packageName = process.env.ANDROID_PACKAGE_NAME?.trim()
  const fingerprints = (process.env.ANDROID_SHA256_CERT_FINGERPRINTS ?? '')
    .split(',').map(value => value.trim().toUpperCase()).filter(Boolean)
  const headers = { 'Cache-Control': 'no-store, max-age=0', 'CDN-Cache-Control': 'no-store', 'Cloudflare-CDN-Cache-Control': 'no-store' }
  if (!packageName || !/^[A-Za-z]\w*(?:\.[A-Za-z]\w*)+$/.test(packageName) ||
      !fingerprints.length || fingerprints.some(value => !/^(?:[A-F0-9]{2}:){31}[A-F0-9]{2}$/.test(value))) {
    return Response.json({ error: 'Android app signing association is not configured.' }, { status: 503, headers })
  }
  return Response.json([{
    relation: ['delegate_permission/common.handle_all_urls'],
    target: { namespace: 'android_app', package_name: packageName, sha256_cert_fingerprints: fingerprints },
  }], { headers })
}
