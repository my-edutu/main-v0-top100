/* Real member route + API helpers; external Next/Auth/database/rate-limit doubles.
 * This does NOT execute Supabase, React, RLS, PostgreSQL or provider integration. */
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const Module = require('node:module')
const ts = require('typescript')
const root = path.resolve(__dirname, '../..')
const actor = '11111111-1111-4111-8111-111111111111'
let session, profile, awardee, stored, calls, rpcResult, passed = 0, failed = 0
const db = {
  from(table) {
    const query = { select() { return query }, eq() { return query }, order() { return query }, limit() { return query },
      maybeSingle: async () => ({ data: table === 'profiles' ? profile : table === 'awardees' ? awardee : stored, error: null }) }
    return query
  },
  rpc: async (name, args) => { calls.push({ name, args }); return rpcResult },
}
const cache = new Map()
const native = Module.createRequire(__filename)
function load(file) {
  const resolved = path.resolve(file)
  if (cache.has(resolved)) return cache.get(resolved).exports
  const module = { exports: {} }; cache.set(resolved, module)
  let source = fs.readFileSync(resolved, 'utf8')
  if (process.env.TALENT_AUDIT_BASELINE === '1') {
    try { source = require('node:child_process').execFileSync('git', ['show', `HEAD:${path.relative(root, resolved)}`], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }) } catch { /* unchanged support files are sparse copies */ }
  }
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const customRequire = name => {
    if (name === 'next/server') return { NextResponse: { json: (body, init) => Response.json(body, init) } }
    if (name === '@/lib/auth-server') return { getServerSession: async () => session }
    if (name === '@/lib/api/require-admin') return { requireAdmin: async () => ({ error: new Response(null, { status: 403 }) }) }
    if (name === '@/lib/supabase/server') return { createAdminClient: () => db }
    if (name === '@/lib/rate-limit') return { checkRateLimit: async () => ({ success: true }), getClientIdentifier: () => 'synthetic', RATE_LIMITS: { QUERY: {}, CONTACT: {} }, createRateLimitResponse: () => new Response(null, { status: 429 }) }
    if (name.startsWith('@/')) return load(path.join(root, name.slice(2) + '.ts'))
    if (name.startsWith('.')) return load(path.resolve(path.dirname(resolved), name + '.ts'))
    return native(name)
  }
  new Function('require', 'module', 'exports', output)(customRequire, module, module.exports)
  return module.exports
}
const route = load(path.join(root, 'app/api/member/talent/route.ts'))
const contracts = load(path.join(root, 'lib/talent/contracts.ts'))
const original = { ...process.env }
const preferences = () => ({ discoveryEnabled: false, introductionsEnabled: false, promotionEnabled: false, outreachEmailOptOut: true, policyVersion: contracts.TALENT_POLICY_VERSION })
function reset() {
  process.env.TALENT_DISCOVERY_ENABLED = 'true'
  process.env.TALENT_DISCOVERY_LAUNCHED = 'false'; process.env.TALENT_UPGRADE_EMAIL_ENABLED = 'false'
  session = { user: { id: actor } }; profile = { id: actor, role: 'user', full_name: 'Invented member', membership_status: 'approved' }
  awardee = { id: actor, name: 'Invented member', slug: 'invented-member' }; stored = null; calls = []
  rpcResult = { data: { profile_id: actor, draft: contracts.emptyTalentDraft(), revision: 1, visibility_revision: 1 }, error: null }
}
function request(body, origin = 'http://localhost:3000') {
  return new Request('http://localhost:3000/api/member/talent', { method: 'PATCH', headers: { origin, 'content-type': 'application/json' }, body: JSON.stringify(body) })
}
async function check(name, fn) {
  reset()
  try { await fn(); passed++; console.log(`PASS ${name}`) }
  catch (error) { failed++; console.error(`FAIL ${name}: ${error.message}`) }
}
async function main() {
  await check('save accepts unfinished private project data', async () => {
    const draft = contracts.emptyTalentDraft(); draft.projects = [{ title: '', role: 'Researcher', description: 'Still writing', outcome: '', url: 'https://' }]
    assert.equal((await route.PATCH(request({ action: 'save', expectedRevision: 0, draft }))).status, 200)
    assert.equal(calls[0].args.p_draft.projects[0].description, 'Still writing'); assert.equal(calls[0].args.p_submit, false)
  })
  await check('submit still rejects unsafe public links before RPC', async () => {
    const draft = contracts.emptyTalentDraft(); draft.portfolioUrl = 'javascript:alert(1)'
    assert.equal((await route.PATCH(request({ action: 'submit', expectedRevision: 0, draft }))).status, 400); assert.equal(calls.length, 0)
  })
  await check('visibility save requires the revision the member reviewed', async () => {
    assert.equal((await route.PATCH(request({ action: 'visibility', visibility: preferences() }))).status, 400); assert.equal(calls.length, 0)
  })
  await check('versioned visibility passes only authenticated actor and expected version', async () => {
    assert.equal((await route.PATCH(request({ action: 'visibility', visibility: preferences(), expectedVisibilityRevision: 8 }))).status, 200)
    assert.equal(calls[0].name, 'talent_set_visibility'); assert.equal(calls[0].args.p_expected_revision, 8); assert.equal(calls[0].args.p_actor, actor)
  })
  await check('stale privacy update is 409 without internal database details', async () => {
    rpcResult = { data: null, error: { code: '40001', message: 'private database detail' } }
    const response = await route.PATCH(request({ action: 'visibility', visibility: preferences(), expectedVisibilityRevision: 0 }))
    assert.equal(response.status, 409); assert.ok(!(await response.text()).includes('private database detail'))
  })
  await check('restrictive withdrawal does not reuse stale permission or email values', async () => {
    assert.equal((await route.PATCH(request({ action: 'withdraw' }))).status, 200)
    assert.deepEqual(calls[0], { name: 'talent_withdraw_discovery', args: { p_actor: actor } })
  })
  await check('withdrawal rejects smuggled grants or another owner', async () => {
    assert.equal((await route.PATCH(request({ action: 'withdraw', discoveryEnabled: true, profileId: 'another' }))).status, 400); assert.equal(calls.length, 0)
  })
  await check('cross-origin withdrawal fails before a database write', async () => {
    assert.equal((await route.PATCH(request({ action: 'withdraw' }, 'https://other.example'))).status, 403); assert.equal(calls.length, 0)
  })
  await check('signed-out member cannot mutate privacy', async () => {
    session = null; assert.equal((await route.PATCH(request({ action: 'withdraw' }))).status, 401); assert.equal(calls.length, 0)
  })
  await check('unmigrated stored record is a clear setup error, not unsafe default consent', async () => {
    stored = { profile_id: actor, draft: contracts.emptyTalentDraft(), revision: 0 }
    const response = await route.GET(new Request('http://localhost:3000/api/member/talent'))
    assert.equal(response.status, 503); assert.equal((await response.json()).setupRequired, true)
  })
  await check('partial saved links are readable as draft text and never publicly cached', async () => {
    stored = { profile_id: actor, draft: { ...contracts.emptyTalentDraft(), portfolioUrl: 'https://' }, revision: 1, visibility_revision: 0 }
    const response = await route.GET(new Request('http://localhost:3000/api/member/talent'))
    assert.equal(response.status, 200); assert.match(response.headers.get('cache-control'), /private, no-store/)
    assert.equal((await response.json()).talent.draft.portfolioUrl, 'https://')
  })
  await check('disabled feature still blocks writes', async () => {
    process.env.TALENT_DISCOVERY_ENABLED = 'false'; assert.equal((await route.PATCH(request({ action: 'withdraw' }))).status, 404); assert.equal(calls.length, 0)
  })
  console.log(`${passed} API audit checks passed; ${failed} failed (explicit external dependency doubles)`)
  if (failed) process.exitCode = 1
}
main().catch(error => { console.error(error); process.exitCode = 1 }).finally(() => {
  for (const key of Object.keys(process.env)) if (!(key in original)) delete process.env[key]
  Object.assign(process.env, original)
})
