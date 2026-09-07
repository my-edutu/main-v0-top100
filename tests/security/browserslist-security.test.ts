import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

// GHSA-73wf-gq98-2v4g and GHSA-c83g-rgw3-j3cx: patched in 4.28.7.
// Check the committed lockfile, including nested copies, not only the root range.
const lock = JSON.parse(readFileSync(resolve(process.cwd(), 'package-lock.json'), 'utf8')) as {
  packages: Record<string, { version?: string }>
}
const resolutions = Object.entries(lock.packages).filter(([path]) =>
  /(^|\/)node_modules\/browserslist$/.test(path),
)

describe('Browserslist security floor', () => {
  it('finds the dependency resolutions in the committed lockfile', () => {
    expect(resolutions.length).toBeGreaterThan(0)
  })
  it('does not reintroduce an affected or unreviewed prerelease version', () => {
    for (const [path, metadata] of resolutions) {
      const version = metadata.version ?? ''
      expect(version, path).toMatch(/^\d+\.\d+\.\d+$/)
      const [major, minor, patch] = version.split('.').map(Number)
      expect(major > 4 || (major === 4 && (minor > 28 || (minor === 28 && patch >= 7))), path).toBe(true)
    }
  })
})
