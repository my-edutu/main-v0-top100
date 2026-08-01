// The CSP in next.config.mjs is only correct relative to what the app actually
// loads. A third-party <Script src> added in app/ is silently blocked in the
// browser unless script-src is widened to match — the failure never shows up in
// a build, only as a console error on a live page.
//
// These tests read the origins the app really requests and assert the policy
// covers them, so the two files cannot drift apart again.
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const root = path.resolve(__dirname, '../..')

function cspDirectives(): Map<string, string[]> {
  const config = readFileSync(path.join(root, 'next.config.mjs'), 'utf8')

  // The policy is authored as an array of quoted directive strings joined with
  // '; '. Pulling the strings out beats evaluating the config module, which
  // would drag in the whole Next build pipeline.
  const block = config.slice(
    config.indexOf("key: 'Content-Security-Policy'"),
    config.indexOf("].join('; ')"),
  )
  const directives = new Map<string, string[]>()
  for (const [, directive] of block.matchAll(/"([a-z-]+ [^"]*)"/g)) {
    const [name, ...values] = directive.split(/\s+/)
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

  it('allows the Brevo endpoints the SDK calls once it runs', () => {
    const connect = cspDirectives().get('connect-src') ?? []
    // The conversations/automation SDK posts to these two hosts, not to
    // api.brevo.com. Loading the script without them yields a working script
    // that cannot report anything.
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
  // Comments in this file discuss the very patterns asserted against below, so
  // match on code only.
  const layout = source.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '')

  it('is gated on the client key being configured', () => {
    // Without a key the init call pushes client_key: '', so the script is a
    // third-party request that can never do anything. Do not load it.
    expect(layout).toMatch(/const\s+brevoClientKey\s*=/)
    expect(layout).toMatch(/brevoClientKey\s*(\?|&&)/)
  })

  it('does not guard init on window.Brevo already existing', () => {
    // Brevo's snippet creates window.Brevo itself. Checking for it first means
    // init never runs when the loader has not finished — which, on lazyOnload,
    // is the normal case.
    expect(layout).not.toMatch(/if\s*\([^)]*window\.Brevo\s*\)/)
  })
})
