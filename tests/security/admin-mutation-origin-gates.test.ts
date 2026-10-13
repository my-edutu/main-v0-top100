import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const root = path.resolve(__dirname, '../..', 'app/api/admin')

function routePaths(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const p = path.join(dir, entry.name)
    if (entry.isDirectory()) return routePaths(p)
    return entry.isFile() && entry.name === 'route.ts' ? [p] : []
  })
}

describe('admin mutation origin integrity', () => {
  it('requires a same-origin check for every privileged browser mutation route', () => {
    const routes = routePaths(root)
    expect(routes.length).toBeGreaterThan(20)
    for (const route of routes) {
      const source = readFileSync(route, 'utf8')
      const hasMutation = /export async function (POST|PUT|PATCH|DELETE)\b/.test(source)
      if (!hasMutation) continue
      expect(source, path.relative(root, route)).toContain('rejectCrossOriginMutation(')
    }
  })

  it('protects legacy user and payment mutation routes too', () => {
    const paths = [
      'app/api/users/route.ts',
      'app/api/feature-requests/route.ts',
      'app/api/admin/awards/verify-payment/route.ts',
      'app/api/admin/users/invite/route.ts',
    ]
    for (const p of paths) {
      const source = readFileSync(path.resolve(__dirname, '../..', p), 'utf8')
      expect(source, p).toContain('rejectCrossOriginMutation(')
    }
  })
})
