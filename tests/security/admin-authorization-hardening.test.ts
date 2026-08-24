import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const root = path.resolve(__dirname, '../..')

function source(pathname: string) {
  return readFileSync(path.join(root, pathname), 'utf8')
    .replace(/\/\/.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
}

describe('admin authorization hardening', () => {
  it('does not authorize an admin solely from a possibly-stale JWT role', () => {
    const code = source('lib/api/require-admin.ts')

    expect(code).not.toMatch(
      /if\s*\(isAdminRole\(roleFromJWT\)\)[\s\S]{0,1200}?return\s*\{[\s\S]{0,600}?roleSource:\s*["']jwt["']/,
    )
    expect(code).toContain('const effectiveRole = roleFromDB ?? roleFromJWT')
  })

  it('does not return internal authorization diagnostics to API callers', () => {
    const code = source('lib/api/require-admin.ts')
    expect(code).not.toMatch(/\bdebug\s*:/)
  })
})
