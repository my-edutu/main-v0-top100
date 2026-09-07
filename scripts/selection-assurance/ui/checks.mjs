import { execFileSync, spawn } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'

const directory = fileURLToPath(new URL('.', import.meta.url))
const output = resolve(process.env.UI_EVIDENCE_DIR || 'selection-review-ui-artifacts')
const generated = join(output, 'generated')
const id = '11111111-1111-4111-8111-111111111111'
const results = []
let server
const command = (...args) => execFileSync('agent-browser', ['--session', 'selection-review-ui', ...args], {
  encoding: 'utf8', timeout: 45000, maxBuffer: 2 * 1024 * 1024,
})
const evaluate = (expression) => command('eval', expression)
const pause = (ms) => new Promise((done) => setTimeout(done, ms))
const check = (name, expression) => {
  try {
    evaluate(`(()=>{if(!(${expression}))throw new Error(${JSON.stringify(name)});return 'PASS'})()`)
    results.push({ name, status: 'PASS' }); console.log(`PASS: ${name}`)
  } catch (error) {
    results.push({ name, status: 'FAIL', detail: String(error.message).slice(0, 1200) })
    console.error(`FAIL: ${name}`)
  }
}
const field = (suffix) => `[id="${id}-${suffix}"]`
const fill = (suffix, value) => command('fill', field(suffix), String(value))
const screenshot = (name) => command('screenshot', join(output, name), '--full')
const snapshot = (name) => writeFileSync(join(output, name), command('snapshot', '-i'))
const allVerificationChecks = () => evaluate(`Array.from(document.querySelectorAll('input[type="checkbox"]')).slice(0,4).forEach(e=>{if(!e.checked)e.click()});true`)
const confirm = () => evaluate(`(()=>{const e=Array.from(document.querySelectorAll('input[type="checkbox"]')).at(-1);if(!e.checked)e.click();return true})()`)
const textContrast = `(()=>{
  const e=document.querySelector('input[type="number"]');
  const rgb=s=>(s.match(/[\\d.]+/g)||[]).map(Number);
  const fg=rgb(getComputedStyle(e).color); let node=e,bg;
  while(node){bg=rgb(getComputedStyle(node).backgroundColor);if(bg.length>=3&&(bg.length<4||bg[3]>0.99))break;node=node.parentElement;}
  if(!node)bg=[255,255,255];
  const luminance=c=>c.slice(0,3).map(v=>{v/=255;return v<=0.04045?v/12.92:((v+0.055)/1.055)**2.4}).reduce((s,v,i)=>s+v*[0.2126,0.7152,0.0722][i],0);
  const a=luminance(fg),b=luminance(bg);return (Math.max(a,b)+0.05)/(Math.min(a,b)+0.05)>=4.5;
})()`

async function main() {
  mkdirSync(generated, { recursive: true })
  await build({
    entryPoints: [join(directory, 'harness.jsx')], outfile: join(generated, 'harness.js'),
    bundle: true, platform: 'browser', format: 'iife', jsx: 'automatic',
    tsconfig: resolve('tsconfig.json'), define: { 'process.env.NODE_ENV': '"production"' },
    plugins: [{ name: 'synthetic-navigation-only', setup(builder) {
      builder.onResolve({ filter: /^next\/navigation$/ }, () => ({ path: 'navigation', namespace: 'synthetic' }))
      builder.onLoad({ filter: /.*/, namespace: 'synthetic' }, () => ({ contents:
        'export const useRouter=()=>({refresh:()=>window.dispatchEvent(new Event("selection-harness-refresh"))});', loader: 'js' }))
    } }],
  })
  // Use the actual site CSS/tokens. Remote font loading is excluded from this
  // isolated, deterministic component check; the live shell is not simulated.
  const css = readFileSync(resolve('app/globals.css'), 'utf8').replace(/^@import url\([^\n]+\);\s*$/gm, '')
  writeFileSync(join(generated, 'input.css'), css)
  execFileSync(resolve('node_modules/.bin/tailwindcss'), ['-i', join(generated, 'input.css'), '-o', join(generated, 'harness.css')], { stdio: 'inherit', timeout: 60000 })
  writeFileSync(join(generated, 'index.html'), '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Top100 synthetic reviewer component test</title><link rel="stylesheet" href="/harness.css"></head><body><div id="root"></div><script src="/harness.js"></script></body></html>')
  server = spawn(process.execPath, [join(directory, 'serve.mjs'), generated], { stdio: 'inherit' })
  let ready = false
  for (let attempt = 0; attempt < 30; attempt++) {
    try { if ((await fetch('http://127.0.0.1:4173')).ok) { ready = true; break } } catch { /* bounded startup polling */ }
    await pause(100)
  }
  if (!ready) throw new Error('Synthetic harness server did not become ready')
  command('set', 'viewport', '1440', '1100')
  command('open', 'http://127.0.0.1:4173')
  command('wait', 'form[aria-label="Review Ada Example"]')
  snapshot('desktop-controls.txt')
  check('Meaningful case and original-evidence interface renders', "document.body.innerText.includes('Original evidence')&&document.body.innerText.includes('Ada Example')")
  check('No uncaught browser errors on initial render', 'window.__uiErrors.length===0')
  check('Default decision remains unresolved', `document.querySelector(${JSON.stringify(field('verdict'))}).value==='needs_review'`)
  check('Original PDF link is scoped and isolated in a new tab', "(()=>{const a=document.querySelector('a[href$=\"/access\"]');return a&&a.target==='_blank'&&a.rel.includes('noreferrer')&&a.href.includes('/11111111-1111-4111-8111-111111111111/documents/')})()")
  check('Desktop has no horizontal overflow', 'document.documentElement.scrollWidth<=window.innerWidth+1')
  check('Rubric input text contrast meets 4.5:1 in default site theme', textContrast)
  screenshot('review-desktop-default.png')
  evaluate("document.documentElement.className='light';true")
  check('Rubric input text contrast meets 4.5:1 in light site theme', textContrast)
  screenshot('review-desktop-light.png')
  command('set', 'viewport', '390', '844')
  check('Mobile has no horizontal overflow', 'document.documentElement.scrollWidth<=window.innerWidth+1')
  screenshot('review-mobile-light.png')
  command('press', 'Tab')
  check('Keyboard can reach an interactive reviewer control', "document.activeElement.matches('a,input,select,textarea,button')")
  command('set', 'viewport', '1440', '1100')
  for (const [key, score] of Object.entries({ academic: 28, leadership: 20, impact: 20, initiative: 8, communication: 8 })) fill(key, score)
  fill('notes', 'Synthetic registrar REF-001 checked; applicant holder binding remains a fixture.')
  fill('reasons', 'The invented evidence meets the synthetic published requirements.')
  fill('reference', 'Synthetic source REF-001; holder and original issuing source reviewed.')
  command('select', field('verdict'), 'qualified')
  snapshot('final-decision-controls.txt')
  confirm()
  command('click', 'button[type="submit"]')
  command('wait', '[role="alert"]')
  check('Missing verification blocks final submission before any request', "window.__uiRequests.length===0&&document.querySelector('[role=alert]').innerText.includes('conflict of interest')")
  allVerificationChecks()
  command('select', field('academic-outcome'), 'first_class')
  confirm()
  fill('impact', 21)
  check('Changing a score clears final confirmation', "!Array.from(document.querySelectorAll('input[type=checkbox]')).at(-1).checked")
  fill('impact', 20)
  confirm()
  evaluate("window.__uiMode='pending';true")
  command('click', 'button[type="submit"]')
  check('Controls are disabled during an unresolved save', "document.querySelector('button[type=submit]').disabled&&document.querySelector('fieldset').disabled")
  evaluate("document.querySelector('button[type=submit]').click();true")
  check('Disabled repeat submission does not duplicate the request', 'window.__uiRequests.length===1')
  evaluate("window.__uiMode='conflict';window.__uiResume();true")
  command('wait', '--fn', "document.querySelector('[role=alert]')?.textContent.includes('Another reviewer')")
  check('Conflict response preserves the reviewer draft', `document.querySelector(${JSON.stringify(field('notes'))}).value.includes('REF-001')&&!document.querySelector('button[type=submit]').disabled`)
  screenshot('review-conflict-error.png')
  evaluate("window.__uiMode='failure';true")
  command('click', 'button[type="submit"]')
  command('wait', '--fn', "document.querySelector('[role=alert]')?.textContent.includes('could not be confirmed')")
  check('Server failure keeps input and an actionable error', `document.querySelector(${JSON.stringify(field('reasons'))}).value.includes('invented evidence')&&document.querySelector('[role=alert]').textContent.includes('Reload')`)
  evaluate("window.__uiMode='success';true")
  command('click', 'button[type="submit"]')
  command('wait', '--fn', "document.querySelector('[role=status]')?.textContent.includes('Review saved for')")
  check('Successful save is announced but does not claim publication', "document.querySelector('[role=status]').textContent.includes('private')&&!document.querySelector('[role=alert]')")
  check('Every retry carries the expected revision', 'window.__uiRequests.every(request=>request.expectedRevision===1)')
  check('No reviewer draft is placed in local browser storage', 'localStorage.length===0')
  check('No uncaught browser errors after interaction', 'window.__uiErrors.length===0')
  screenshot('review-saved-private.png')
  snapshot('saved-controls.txt')
  if (results.some(result => result.status !== 'PASS')) throw new Error('One or more reviewer UI checks failed')
}

try { await main() } catch (error) {
  results.push({ name: 'Harness execution', status: 'FAIL', detail: String(error.message).slice(0, 1600) })
  try { screenshot('failure-state.png'); snapshot('failure-controls.txt') } catch { /* capture what remains available */ }
  process.exitCode = 1
} finally {
  mkdirSync(output, { recursive: true })
  writeFileSync(join(output, 'results.json'), JSON.stringify({
    sourceCommit: process.env.GITHUB_SHA ?? 'local',
    scope: 'Actual reviewer components in Chromium via agent-browser, invented fixtures, stubbed API/navigation; not live integration or a full accessibility audit.',
    checks: results,
  }, null, 2))
  try { command('close') } catch { /* no browser may have started */ }
  server?.kill('SIGTERM')
}
