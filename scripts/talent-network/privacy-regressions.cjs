/** Real route/parser/authorisation helper execution; Supabase transport and
 * NextResponse are test doubles. Database atomicity has a separate SQL test. */
const assert = require('node:assert/strict')
const { makeHarness, fixture } = require('./client-regressions.cjs')
function setup(options = {}) {
  const calls = []
  const actor = '11111111-1111-4111-8111-111111111111'
  let row
  const db = {
    from(table) {
      const chain = { select() { return chain }, eq() { return chain }, order() { return chain }, limit() { return chain }, async maybeSingle() {
        return { error: null, data: table === 'profiles' ? { id: actor, membership_status: options.suspended ? 'suspended' : 'approved' } : { id: actor, name: 'Synthetic member', slug: 'synthetic-member' } }
      } }; return chain
    },
    async rpc(name, args) { calls.push({ name, args }); return options.rpcError ? { error: options.rpcError, data: null } : { error: null, data: row } },
  }
  const h = makeHarness({ modules: {
    'next/server': { NextResponse: { json: (body, init) => Response.json(body, init) } },
    '@/lib/auth-server': { getServerSession: async () => options.anonymous ? null : { user: { id: actor } } },
    '@/lib/api/require-admin': { requireAdmin: async () => { throw new Error('Not an admin test') } },
    '@/lib/supabase/server': { createAdminClient: () => db },
    '@/lib/rate-limit': { checkRateLimit: async () => ({ success: true }), getClientIdentifier: () => 'synthetic-test', RATE_LIMITS: { QUERY: {} } },
    './features': { talentDiscoveryEnabled: () => true },
  } })
  row = fixture(h).talent
  const route = h.load('app/api/member/talent/route.ts')
  const visibility = { discoveryEnabled: false, introductionsEnabled: false, promotionEnabled: false, outreachEmailOptOut: true, policyVersion: 'talent-discovery-2026-11-v1' }
  const expectedVisibility = { discovery_enabled: false, introductions_enabled: false, promotion_enabled: false, outreach_email_opt_out: false, consent_version: null }
  const request = (body, origin = 'https://top100.test') => route.PATCH(new Request('https://top100.test/api/member/talent', { method: 'PATCH', headers: { 'Content-Type': 'application/json', Origin: origin }, body: JSON.stringify(body) }))
  return { calls, actor, request, visibility, expectedVisibility }
}
const tests = [
 ['missing saved privacy snapshot is rejected before any write', async () => { const x=setup();const r=await x.request({ action:'visibility',visibility:x.visibility });assert.equal(r.status,400);assert.equal(x.calls.length,0) }],
 ['valid privacy changes use the atomic checked RPC and authenticated actor', async () => { const x=setup();const r=await x.request({ action:'visibility',visibility:x.visibility,expectedVisibility:x.expectedVisibility });assert.equal(r.status,200);assert.equal(x.calls[0].name,'talent_set_visibility_checked');assert.equal(x.calls[0].args.p_actor,x.actor);assert.equal(JSON.stringify(x.calls[0].args.p_expected),JSON.stringify(x.expectedVisibility));assert.equal(x.calls[0].args.p_withdraw,false) }],
 ['withdrawal has a separate no-grant operation', async () => { const x=setup();const r=await x.request({ action:'withdraw_visibility' });assert.equal(r.status,200);assert.equal(x.calls[0].name,'talent_set_visibility_checked');assert.equal(x.calls[0].args.p_withdraw,true);assert.equal(x.calls[0].args.p_choices,null) }],
 ['withdrawal cannot smuggle consent grants in its body', async () => { const x=setup();const r=await x.request({ action:'withdraw_visibility',visibility:{...x.visibility,discoveryEnabled:true} });assert.equal(r.status,400);assert.equal(x.calls.length,0) }],
 ['unknown expectation fields are rejected', async () => { const x=setup();const r=await x.request({ action:'visibility',visibility:x.visibility,expectedVisibility:{...x.expectedVisibility,role:'admin'} });assert.equal(r.status,400);assert.equal(x.calls.length,0) }],
 ['string booleans are rejected in the saved snapshot', async () => { const x=setup();const r=await x.request({ action:'visibility',visibility:x.visibility,expectedVisibility:{...x.expectedVisibility,discovery_enabled:'false'} });assert.equal(r.status,400);assert.equal(x.calls.length,0) }],
 ['an atomic privacy conflict is returned as HTTP 409', async () => { const x=setup({rpcError:{code:'40001'}});const r=await x.request({ action:'visibility',visibility:x.visibility,expectedVisibility:x.expectedVisibility });assert.equal(r.status,409) }],
 ['missing guard SQL fails closed rather than falling back to unsafe writes', async () => { const x=setup({rpcError:{code:'PGRST202'}});const r=await x.request({ action:'visibility',visibility:x.visibility,expectedVisibility:x.expectedVisibility });assert.equal(r.status,503);assert.equal(x.calls.length,1);assert.equal(x.calls[0].name,'talent_set_visibility_checked') }],
 ['anonymous accounts cannot change privacy', async () => { const x=setup({anonymous:true});const r=await x.request({action:'withdraw_visibility'});assert.equal(r.status,401);assert.equal(x.calls.length,0) }],
 ['suspended members cannot bypass account checks', async () => { const x=setup({suspended:true});const r=await x.request({action:'withdraw_visibility'});assert.equal(r.status,403);assert.equal(x.calls.length,0) }],
 ['cross-origin form submissions are denied', async () => { const x=setup();const r=await x.request({action:'withdraw_visibility'},'https://other.test');assert.equal(r.status,403);assert.equal(x.calls.length,0) }],
 ['private route responses are never cacheable', async () => { const x=setup();const r=await x.request({action:'withdraw_visibility'});assert.match(r.headers.get('cache-control'),/no-store/);assert.match(r.headers.get('vary'),/Cookie/);assert.equal(r.headers.get('x-robots-tag'),'noindex') }],
]
;(async()=>{let failed=0;for(const[name,run]of tests){try{await run();console.log('PASS '+name)}catch(e){failed++;console.error('FAIL '+name+'\n  '+e.message)}}console.log(`${tests.length-failed}/${tests.length} route/privacy tests passed (transport doubles; not SQL execution).`);process.exitCode=failed?1:0})()
