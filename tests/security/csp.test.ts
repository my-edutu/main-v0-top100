// The CSP in next.config.mjs is only correct relative to what the app actually
// loads. These tests keep third-party origins and production restrictions in
// sync with the root layout.
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const root = path.resolve(__dirname, '../..')

function configSource(): string {
  return readFileSync(path.join(root, 'next.config.mjs'), 'utf8')
}

function cspDirectives(): Map<string, string[]> {
  const config = configSource()
  const block = config.slice(
    config.indexOf("key: 'Content-Security-Policy'"),
    config.indexOf("].join('; ')"),
  )
  const directives = new Map<string, string[]>()

  for (const [, directive] of block.matchAll(/"([a-z-]+ [^"]*)"/g)) {
    const [name, ...values] = directive.split(/\s+/)
    directives.set(name, values)
  }

  // script-src is environment-specific. Security assertions are intentionally
  // made against the production policy, which must not contain unsafe-eval.
  const productionScriptSrc = config.match(
    /const\s+productionScriptSrc\s*=\s*"([^"]+)"/,
  )?.[1]
  if (productionScriptSrc) {
    const [name, ...values] = productionScriptSrc.split(/\s+/)
    directives.set(name, values)
  }

  return directives
}

/** Every absolute script URL the app asks the browser to execute. */
function scriptOrigins(): string[] {
  const layout = readFileSync(path.join(root, 'app/layout.tsx'), 'utf8')
  const origins = new Set<string>()
  for (const [, url] of layout.matchAll(/src="(https:\/\/[^"]+)"/g)) {
    origins.add(new URL(url).origin)
  }
  return [...origins]
}

describe('Content-Security-Policy', () => {
  it('parses into directives', () => {
    const directives = cspDirectives()
    expect(directives.get('default-src')).toEqual(["'self'"])
    expect(directives.has('script-src')).toBe(true)
  })

  it('allows every third-party script the root layout loads', () => {
    const allowed = cspDirectives().get('script-src') ?? []
    for (const origin of scriptOrigins()) {
      expect(allowed, `script-src must allow ${origin}`).toContain(origin)
    }
  })

  it('keeps unsafe-eval out of production', () => {
    const allowed = cspDirectives().get('script-src') ?? []
    expect(allowed).not.toContain("'unsafe-eval'")
  })

  it('allows the Brevo endpoints the SDK calls once it runs', () => {
    const connect = cspDirectives().get('connect-src') ?? []
    expect(connect).toContain('https://in-automate.brevo.com')
    expect(connect).toContain('https://sibautomation.com')
  })

  it('keeps the restrictive directives that are not about third parties', () => {
    const directives = cspDirectives()
    expect(directives.get('object-src')).toEqual(["'none'"])
    expect(directives.get('base-uri')).toEqual(["'self'"])
    expect(directives.get('frame-ancestors')).toEqual(["'none'"])
    expect(directives.get('form-action')).toEqual(["'self'"])
  })
})

describe('Brevo SDK injection', () => {
  const source = readFileSync(path.join(root, 'app/layout.tsx'), 'utf8')
  const layout = source.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '')

  it('is gated on the client key being configured', () => {
    expect(layout).toMatch(/const\s+brevoClientKey\s*=/)
    expect(layout).toMatch(/brevoClientKey\s*(\?|&&)/)
  })

  it('does not guard init on window.Brevo already existing', () => {
    expect(layout).not.toMatch(/if\s*\([^)]*window\.Brevo\s*\)/)
  })
})
