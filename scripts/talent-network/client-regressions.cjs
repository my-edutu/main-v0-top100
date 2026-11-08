/**
 * Deterministic unit tests of the actual client hook/event-handler source.
 * React hook scheduling and network calls are explicit test doubles, NOT a
 * browser/Next.js/authentication integration test. No real accounts or requests.
 * Run: node scripts/talent-network/client-regressions.cjs
 */
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')
const root = path.resolve(__dirname, '../..')
const tests = []
const harnesses = []
function test(name, body) { tests.push({ name, body }) }
function deferred() { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no }); return { promise, resolve, reject } }
function response(body, status = 200) { return { ok: status >= 200 && status < 300, status, json: async () => body } }
const clone = value => JSON.parse(JSON.stringify(value))
function makeHarness(extra = {}) {
  const slots = [], effects = [], cache = new Map()
  const dispose = () => { if (disposed) return; disposed = true; for (const slot of slots) slot?.cleanup?.() }; harnesses.push(dispose)
  let cursor = 0, dirty = true, disposed = false, component, output, lateWrites = 0
  const same = (a, b) => Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((v, i) => Object.is(v, b[i]))
  const react = {
    useState(initial) {
      const index = cursor++
      if (!slots[index]) {
        const slot = { value: typeof initial === 'function' ? initial() : initial }
        slot.set = update => {
          if (disposed) { lateWrites++; return }
          const next = typeof update === 'function' ? update(slot.value) : update
          if (!Object.is(next, slot.value)) { slot.value = next; dirty = true }
        }
        slots[index] = slot
      }
      return [slots[index].value, slots[index].set]
    },
    useRef(initial) { const index = cursor++; if (!slots[index]) slots[index] = { current: initial }; return slots[index] },
    useEffect(effect, deps) {
      const index = cursor++, old = slots[index]
      if (!old || !same(old.deps, deps)) {
        slots[index] = { deps, cleanup: old?.cleanup }
        effects.push(() => { slots[index].cleanup?.(); slots[index].cleanup = effect() })
      }
    },
    useCallback(callback, deps) { const index = cursor++; if (!slots[index] || !same(slots[index].deps, deps)) slots[index] = { deps, value: callback }; return slots[index].value },
    useMemo(factory, deps) { return react.useCallback(factory, deps)() },
    isValidElement: element => Boolean(element && typeof element === 'object' && 'props' in element),
    cloneElement: (element, props) => ({ ...element, props: { ...element.props, ...props } }),
  }
  const jsx = (type, props, key) => ({ type, props: props || {}, key })
  function load(filename) {
    let absolute = filename.startsWith('/') ? filename : path.join(root, filename)
    if (!fs.existsSync(absolute)) absolute = ['.ts', '.tsx', '.js', '.cjs'].map(ext => absolute + ext).find(fs.existsSync)
    if (!absolute) throw new Error(`Missing local source: ${filename}`)
    if (cache.has(absolute)) return cache.get(absolute).exports
    const mod = { exports: {} }; cache.set(absolute, mod)
    const source = ts.transpileModule(fs.readFileSync(absolute, 'utf8'), { fileName: absolute, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText
    function requireModule(name) {
      if (Object.prototype.hasOwnProperty.call(extra.modules || {}, name)) return extra.modules[name]
      if (name === 'react') return react
      if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx, Fragment: 'fragment' }
      if (name === 'next/link') return { __esModule: true, default: 'a' }
      if (name === 'lucide-react') return new Proxy({}, { get: (_, key) => `icon-${String(key)}` })
      if (name.startsWith('@/')) return load(name.slice(2))
      if (name.startsWith('.')) return load(path.resolve(path.dirname(absolute), name))
      throw new Error(`Undeclared dependency: ${name}`)
    }
    const context = { exports: mod.exports, module: mod, require: requireModule, console, URL, URLSearchParams, Headers, AbortController, DOMException, TextDecoder, setTimeout, clearTimeout, requestAnimationFrame: callback => callback(), queueMicrotask, process: { env: { NODE_ENV: 'test' } }, fetch: extra.fetch || (() => { throw new Error('Unexpected network call') }), window: extra.window || { addEventListener() {}, removeEventListener() {}, confirm: () => true }, document: { getElementById: () => null, addEventListener() {}, removeEventListener() {} }, ...extra.globals }
    vm.runInNewContext(source, context, { filename: absolute })
    return mod.exports
  }
  function render() {
    let passes = 0
    do { dirty = false; cursor = 0; output = component(); while (effects.length) effects.shift()(); if (++passes > 40) throw new Error('Render loop') } while (dirty)
    return output
  }
  return { load, mount(fn) { component = fn; return render() }, render, async settle() { for (let i = 0; i < 8; i++) { await new Promise(resolve => setImmediate(resolve)); if (dirty) render() } return output }, get output() { return output }, unmount: dispose, get lateWrites() { return lateWrites } }
}
function nodes(node) {
  if (Array.isArray(node)) return node.flatMap(nodes)
  if (!node || typeof node !== 'object') return []
  // Expand only these stateless production components. Stateful child hooks
  // are mounted independently (see the comma-input test), not faked as DOM.
  if (typeof node.type === 'function' && ['TalentProfileFields', 'Field'].includes(node.type.name)) return [node, ...nodes(node.type(node.props))]
  return [node, ...nodes(node.props?.children)]
}
function text(node) {
  if (Array.isArray(node)) return node.map(text).join(' ')
  if (node == null || node === false) return ''
  if (typeof node !== 'object') return String(node)
  return text(node.props?.children)
}
function byId(h, id) { const found = nodes(h.output).find(n => n.props.id === id); assert.ok(found, `Field ${id} remains mounted`); return found }
function button(h, label) { const found = nodes(h.output).find(n => n.type === 'button' && text(n).includes(label)); assert.ok(found, `Button ${label}`); return found }
function fixture(h) {
  const { emptyTalentDraft } = h.load('lib/talent/contracts.ts')
  return { name: 'Synthetic Member', slug: 'synthetic-member', completeness: 60, policyVersion: 'talent-discovery-2026-11-v1', talent: { profile_id: '11111111-1111-4111-8111-111111111111', draft: { ...emptyTalentDraft(), headline: 'Graduate engineer', summary: 'I build practical clean energy systems for communities.', sector: 'Engineering', country: 'Nigeria', skills: ['Research'], interests: ['Internship'] }, published: null, revision: 1, visibility_revision: 0, published_revision: null, publication_status: 'draft', discovery_enabled: false, introductions_enabled: false, promotion_enabled: false, outreach_email_opt_out: false, consent_version: null, review_note: null, created_at: '2026-11-08T00:00:00Z', updated_at: '2026-11-08T00:00:00Z' } }
}
function clientFixture() {
  const requests = []
  const h = makeHarness({ fetch: (url, init) => { const d = deferred(); requests.push({ url, init, ...d }); return d.promise } })
  const source = h.load('components/talent/use-talent.ts')
  h.mount(() => source.useTalentMember())
  return { h, requests, source }
}
function editorFixture() {
  let resource
  const pending = []
  const h = makeHarness({ modules: { './use-talent': { useTalentMember: () => resource, talentFetch: (url, init) => { const d = deferred(); pending.push({ url, init, ...d }); return d.promise } } } })
  resource = { data: fixture(h), loading: false, error: '', disabled: false, setData(value) { resource.data = typeof value === 'function' ? value(resource.data) : value }, saving: false, reload: async () => resource.data, mutate(body) { const d = deferred(); pending.push({ url: '/api/member/talent', init: { body: JSON.stringify(body) }, ...d }); return d.promise.then(result => { resource.setData({ ...resource.data, talent: result.talent }); return result.talent }) } }
  const { TalentProfileEditor } = h.load('components/talent/profile-editor.tsx')
  h.mount(() => TalentProfileEditor())
  return { h, resource, pending }
}

test('late initial fetch cannot replace the newest reload', async () => {
  const { h, requests } = clientFixture(), old = fixture(h), latest = clone(old)
  latest.talent.revision = 8
  const reload = h.output.reload()
  requests[1].resolve(response(latest)); await reload; await h.settle()
  requests[0].resolve(response(old)); await h.settle()
  assert.equal(h.output.data.talent.revision, 8)
})
test('a confirmed mutation cannot be rolled back by an older read', async () => {
  const { h, requests } = clientFixture(), old = fixture(h), saved = clone(old)
  saved.talent.revision = 9
  h.output.setData(saved); h.render()
  requests[0].resolve(response(old)); await h.settle()
  assert.equal(h.output.data.talent.revision, 9)
})
test('unmount cancels writes from an outstanding member load', async () => {
  const { h, requests } = clientFixture(), old = fixture(h)
  h.unmount(); requests[0].resolve(response(old)); await h.settle()
  assert.equal(h.lateWrites, 0)
})
test('lost authentication clears previously loaded private member data', async () => {
  const { h, requests } = clientFixture()
  requests[0].resolve(response(fixture(h))); await h.settle()
  const reload = h.output.reload(); requests[1].resolve(response({ message: 'Please sign in' }, 401)); await reload; await h.settle()
  assert.equal(h.output.data, null)
})
test('incomplete member payloads never become editable saved state', async () => {
  const { h, requests } = clientFixture(), broken = fixture(h)
  delete broken.talent.publication_status
  requests[0].resolve(response(broken)); await h.settle()
  assert.equal(h.output.data, null)
  assert.match(h.output.error, /incomplete|response/i)
})
test('a successful reload returns its receipt for explicit draft replacement', async () => {
  const { h, requests } = clientFixture(), data = fixture(h)
  requests[0].resolve(response(data)); await h.settle()
  const reload = h.output.reload(); requests[1].resolve(response(data))
  assert.equal((await reload)?.talent.revision, 1)
})
test('invalid JSON with HTTP 200 is an error, not a saved receipt', async () => {
  const h = makeHarness({ fetch: async () => ({ ok: true, status: 200, json: async () => { throw new Error('html') } }) })
  const { talentFetch } = h.load('components/talent/use-talent.ts')
  await assert.rejects(talentFetch('/api/member/talent'), /response|read|format/i)
})
test('Headers objects retain caller headers and the JSON body content type', async () => {
  let actual
  const h = makeHarness({ fetch: async (_, init) => { actual = new Headers(init.headers); return response({ ok: true }) } })
  const { talentFetch } = h.load('components/talent/use-talent.ts')
  await talentFetch('/api/member/talent', { method: 'PATCH', body: '{}', headers: new Headers({ 'X-Test': 'preserved' }) })
  assert.equal(actual.get('X-Test'), 'preserved'); assert.equal(actual.get('Content-Type'), 'application/json')
})
test('profile edits typed during a slow save are not overwritten', async () => {
  const { h, resource, pending } = editorFixture()
  byId(h, 'talent-headline').props.onChange({ target: { value: 'First edit' } }); h.render()
  button(h, 'Save draft').props.onClick(); h.render()
  byId(h, 'talent-headline').props.onChange({ target: { value: 'Newer edit while saving' } }); h.render()
  const saved = clone(resource.data.talent); saved.revision = 2; saved.draft.headline = 'First edit'
  pending[0].resolve({ talent: saved }); await h.settle()
  assert.equal(byId(h, 'talent-headline').props.value, 'Newer edit while saving')
  assert.match(text(h.output), /unsaved/i)
})
test('two immediate Save clicks issue only one mutation', () => {
  const { h, pending } = editorFixture()
  const click = button(h, 'Save draft').props.onClick
  click(); click()
  assert.equal(pending.length, 1)
})
test('a refresh failure leaves unsaved inputs visible and editable', () => {
  const { h, resource } = editorFixture()
  byId(h, 'talent-headline').props.onChange({ target: { value: 'Retain my work' } }); h.render()
  resource.error = 'Temporarily unavailable'; h.render()
  assert.equal(byId(h, 'talent-headline').props.value, 'Retain my work')
})
test('comma input does not rewrite the characters while typing skills', () => {
  const h = makeHarness()
  let values = []
  const { CommaInput } = h.load('components/talent/comma-input.tsx')
  h.mount(() => CommaInput({ id: 'talent-skills', value: values, onChange: value => { values = value }, max: 20, placeholder: '' }))
  byId(h, 'talent-skills').props.onFocus(); h.render()
  byId(h, 'talent-skills').props.onChange({ target: { value: 'Python,' } }); h.render()
  assert.equal(byId(h, 'talent-skills').props.value, 'Python,')
})
test('a rejected profile save retains the original typed draft', async () => {
  const { h, pending } = editorFixture()
  byId(h, 'talent-headline').props.onChange({ target: { value: 'Keep this on conflict' } }); h.render()
  button(h, 'Save draft').props.onClick(); h.render()
  pending[0].reject(Object.assign(new Error('Changed in another tab'), { status: 409 })); await h.settle()
  assert.equal(byId(h, 'talent-headline').props.value, 'Keep this on conflict')
})
test('privacy checkbox edits do not mutate the saved server snapshot', () => {
  let resource
  const h = makeHarness({ modules: { './use-talent': { useTalentMember: () => resource, talentFetch: async () => { throw new Error('Unexpected save') } } } })
  resource = { data: fixture(h), loading: false, error: '', disabled: false, setData(value) { resource.data = typeof value === 'function' ? value(resource.data) : value }, reload: async () => resource.data }
  const exports = h.load('components/talent/visibility-settings.tsx')
  h.mount(() => exports.TalentVisibilityControls ? exports.TalentVisibilityControls({ resource }) : exports.TalentVisibilitySettings())
  nodes(h.output).find(n => n.type === 'input' && n.props.type === 'checkbox').props.onChange({ target: { checked: true } }); h.render()
  assert.equal(resource.data.talent.discovery_enabled, false)
  assert.match(text(h.output), /unsaved|not saved/i)
})
test('empty comma-only skills do not increase readiness or satisfy publication', () => {
  const h = makeHarness(), { emptyTalentDraft, profileCompleteness, publicationBlockedReason } = h.load('lib/talent/contracts.ts')
  const draft = emptyTalentDraft(); draft.skills = [' ', '']; draft.languages = [' ']
  assert.equal(profileCompleteness(draft), 0)
  Object.assign(draft, { headline: 'Graduate engineer', summary: 'A genuine profile introduction that is long enough.', sector: 'Engineering', country: 'Nigeria', interests: ['Internship'] })
  assert.match(publicationBlockedReason(draft) || '', /skill/i)
})

async function run() {
  let failures = 0
  for (const { name, body } of tests) {
    try { await body(); console.log(`PASS ${name}`) }
    catch (error) { failures++; console.error(`FAIL ${name}\n  ${error.message}`) }
    finally { for (const dispose of harnesses.splice(0)) dispose() }
  }
  console.log(`\n${tests.length - failures}/${tests.length} client regression tests passed. Explicit React/network test doubles; no browser or real database claimed.`)
  process.exitCode = failures ? 1 : 0
}
if (require.main === module) void run()
module.exports = { makeHarness, fixture, nodes, text, byId, button, deferred, response }
