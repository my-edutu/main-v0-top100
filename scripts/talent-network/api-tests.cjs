/* Executes real new route handlers against explicit framework/auth/database doubles.
 * This is not a hosted Supabase, RLS, browser or Next.js integration test. */
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const Module = require('node:module')
const ts = require('typescript')
const root = path.resolve(__dirname, '../..')
const actor = '11111111-1111-4111-8111-111111111111'
let session, profile, awardee, saved, rpcResult, adminResult, calls, passed = 0
const cache = new Map()
const db = {
  from(table) {
    const q = { select(){return q}, eq(){return q}, order(){return q}, limit(){return q},
      maybeSingle: async()=>({data:table==='profiles'?profile:table==='awardees'?awardee:table==='talent_profiles'?saved:null,error:null}) }
    return q
  },
  rpc: async(name,args)=>{calls.push({name,args});return rpcResult},
}
const native = Module.createRequire(__filename)
function load(file) {
  const resolved=path.resolve(file)
  if(cache.has(resolved))return cache.get(resolved).exports
  const module={exports:{}};cache.set(resolved,module)
  const code=ts.transpileModule(fs.readFileSync(resolved,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
  const customRequire=(name)=>{
    if(name==='next/server')return {NextResponse:{json:(data,init)=>Response.json(data,init)}}
    if(name==='@/lib/auth-server')return {getServerSession:async()=>session}
    if(name==='@/lib/api/require-admin')return {requireAdmin:async()=>adminResult}
    if(name==='@/lib/supabase/server')return {createAdminClient:()=>db}
    if(name==='@/lib/rate-limit')return {checkRateLimit:async()=>({success:true}),getClientIdentifier:()=> 'synthetic',RATE_LIMITS:{QUERY:{},CONTACT:{}},createRateLimitResponse:()=>new Response(null,{status:429})}
    if(name.startsWith('@/'))return load(path.join(root,name.slice(2)+'.ts'))
    if(name.startsWith('.'))return load(path.resolve(path.dirname(resolved),name+'.ts'))
    return native(name)
  }
  new Function('require','module','exports','__filename','__dirname',code)(customRequire,module,module.exports,resolved,path.dirname(resolved))
  return module.exports
}
const api=load(path.join(root,'lib/talent/api.ts'))
const route=load(path.join(root,'app/api/member/talent/route.ts'))
const contracts=load(path.join(root,'lib/talent/contracts.ts'))
const mail=load(path.join(root,'lib/talent/upgrade-email.ts'))
const originalEnv={...process.env}
function reset(){
  process.env.TALENT_DISCOVERY_ENABLED='true';process.env.TALENT_DISCOVERY_LAUNCHED='false';process.env.TALENT_UPGRADE_EMAIL_ENABLED='false'
  session={user:{id:actor}};profile={id:actor,full_name:'Invented member',membership_status:'approved',role:'user',notification_prefs:{recruiterVisible:true,showInDirectory:true}}
  awardee={id:'22222222-2222-4222-8222-222222222222',name:'Invented member',slug:'invented-member'}
  saved=null;calls=[];rpcResult={data:null,error:null};adminResult={user:{id:actor}}
}
function request(body,origin='http://localhost:3000'){
  return new Request('http://localhost:3000/api/member/talent',{method:'PATCH',headers:{origin,'content-type':'application/json'},body:JSON.stringify(body)})
}
async function check(name,fn){reset();await fn();passed++;console.log(`PASS ${name}`)}
async function main(){
  await check('disabled feature rejects member GET',async()=>{process.env.TALENT_DISCOVERY_ENABLED='false';assert.equal((await route.GET(new Request('http://localhost:3000/api/member/talent'))).status,404)})
  await check('signed-out member GET returns 401',async()=>{session=null;assert.equal((await route.GET(new Request('http://localhost:3000/api/member/talent'))).status,401)})
  await check('pending membership cannot edit talent',async()=>{profile.membership_status='pending';assert.equal((await route.GET(new Request('http://localhost:3000/api/member/talent'))).status,403)})
  await check('inactive account cannot edit talent',async()=>{profile.account_status='suspended';assert.equal((await route.GET(new Request('http://localhost:3000/api/member/talent'))).status,403)})
  await check('unlinked awardee is denied',async()=>{awardee=null;assert.equal((await route.GET(new Request('http://localhost:3000/api/member/talent'))).status,403)})
  await check('legacy true preferences do not enable talent discovery',async()=>{const response=await route.GET(new Request('http://localhost:3000/api/member/talent'));assert.equal(response.status,200);const body=await response.json();assert.equal(body.talent.discovery_enabled,false);assert.equal(body.talent.introductions_enabled,false);assert.match(response.headers.get('cache-control'),/no-store/)})
  await check('cross-origin profile write is blocked',async()=>{assert.equal((await route.PATCH(request({action:'save'},'https://other.example'))).status,403);assert.equal(calls.length,0)})
  await check('missing origin is blocked',async()=>{const req=new Request('http://localhost:3000/api/member/talent',{method:'PATCH',headers:{'content-type':'application/json'},body:'{}'});assert.equal((await route.PATCH(req)).status,403)})
  await check('caller cannot override profile identity',async()=>{const response=await route.PATCH(request({action:'save',profileId:'another',expectedRevision:0,draft:contracts.emptyTalentDraft()}));assert.equal(response.status,400);assert.equal(calls.length,0)})
  await check('save uses authenticated identity and expected revision',async()=>{rpcResult={data:{profile_id:actor,draft:contracts.emptyTalentDraft(),revision:1},error:null};const response=await route.PATCH(request({action:'save',expectedRevision:0,draft:contracts.emptyTalentDraft()}));assert.equal(response.status,200);assert.equal(calls[0].name,'talent_save_draft');assert.equal(calls[0].args.p_actor,actor);assert.equal(calls[0].args.p_expected_revision,0);assert.equal(calls[0].args.p_submit,false)})
  await check('incomplete publication never reaches RPC',async()=>{const response=await route.PATCH(request({action:'submit',expectedRevision:0,draft:contracts.emptyTalentDraft()}));assert.equal(response.status,400);assert.equal(calls.length,0)})
  await check('stale save returns 409 without database detail leak',async()=>{rpcResult={data:null,error:{code:'40001',message:'private internal detail'}};const response=await route.PATCH(request({action:'save',expectedRevision:0,draft:contracts.emptyTalentDraft()}));assert.equal(response.status,409);assert.ok(!(await response.text()).includes('private internal detail'))})
  await check('explicit opt-out reaches transactional visibility RPC',async()=>{rpcResult={data:{profile_id:actor,draft:contracts.emptyTalentDraft(),revision:1},error:null};const response=await route.PATCH(request({action:'visibility',expectedVisibility:{discovery_enabled:false,introductions_enabled:false,promotion_enabled:false,outreach_email_opt_out:false,consent_version:null},visibility:{discoveryEnabled:false,introductionsEnabled:false,promotionEnabled:false,outreachEmailOptOut:true,policyVersion:contracts.TALENT_POLICY_VERSION}}));assert.equal(response.status,200);assert.equal(calls[0].name,'talent_set_visibility_checked');assert.equal(calls[0].args.p_choices.outreachEmailOptOut,true);assert.equal(calls[0].args.p_choices.discoveryEnabled,false);assert.equal(calls[0].args.p_expected.discovery_enabled,false)})
  await check('JSON arrays are rejected',async()=>{await assert.rejects(()=>api.readTalentBody(request([])),/Invalid form/)})
  await check('declared oversized form is rejected',async()=>{const req=new Request('http://localhost:3000',{method:'POST',headers:{'content-type':'application/json','content-length':'70001'},body:'{}'});await assert.rejects(()=>api.readTalentBody(req),error=>error.status===413)})
  await check('streamed oversized form is rejected without content length',async()=>{const req=request({text:'x'.repeat(70001)});await assert.rejects(()=>api.readTalentBody(req),error=>error.status===413)})
  await check('missing schema is an explicit unavailable response',async()=>{const response=api.talentError({code:'42P01'});assert.equal(response.status,503);assert.equal((await response.json()).setupRequired,true)})
  await check('fresh admin RPC denial fails closed',async()=>{rpcResult={data:null,error:{code:'42501'}};await assert.rejects(()=>api.requireTalentAdmin(),error=>error.code==='42501');assert.equal(calls[0].name,'talent_assert_admin')})
  await check('branch email sending is blocked before provider access',async()=>{await assert.rejects(()=>mail.sendUpgradeBatch(db,actor,5,'http://localhost:3000'),error=>error.status===409);assert.equal(calls.length,0)})
  console.log(`${passed} talent API checks passed with explicit dependency doubles`)
}
main().catch(error=>{console.error(error);process.exitCode=1}).finally(()=>{for(const key of Object.keys(process.env))if(!(key in originalEnv))delete process.env[key];Object.assign(process.env,originalEnv)})
