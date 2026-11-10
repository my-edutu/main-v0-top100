/* Run with node. Only the TypeScript compiler from the existing devDependencies
 * is required. These are production-domain tests, not an application E2E test. */
const assert = require('node:assert/strict')
const test = require('node:test')
const fs = require('node:fs')
const path = require('node:path')
const Module = require('node:module')
const ts = require('typescript')
const root = path.resolve(__dirname, '../..')
const cache = new Map()
function load(relative) {
  const file = path.resolve(root, relative)
  if (cache.has(file)) return cache.get(file).exports
  const m = { exports: {} }; cache.set(file, m)
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  const localRequire = name => name.startsWith('.') ? load(path.relative(root, path.resolve(path.dirname(file), name + '.ts'))) : Module.createRequire(file)(name)
  new Function('require', 'module', 'exports', code)(localRequire, m, m.exports)
  return m.exports
}
const contracts = load('lib/talent/contracts.ts')
const profile = load('lib/talent/profile-service.ts')
const validDraft = () => ({ ...contracts.emptyTalentDraft(), headline: 'Graduate engineer', summary: 'I develop practical energy solutions with my team.', country: 'Nigeria', sector: 'Engineering', skills: ['Research'], interests: ['Internship'] })

test('an unfinished project can be saved privately without losing its text', () => {
  const draft = validDraft(); draft.projects = [{ title: '', role: 'Student lead', description: 'Still writing', outcome: '', url: '' }]
  assert.equal(contracts.parseTalentDraft(draft, 'draft').projects[0].description, 'Still writing')
})
test('an unfinished education entry can be saved privately', () => {
  const draft = validDraft(); draft.education = [{ institution: '', qualification: 'BSc', field: '', year: '20' }]
  assert.equal(contracts.parseTalentDraft(draft, 'draft').education[0].year, '20')
})
test('a half-typed portfolio URL is draft text, not an active public link', () => {
  const draft = validDraft(); draft.portfolioUrl = 'https://'
  assert.equal(contracts.parseTalentDraft(draft, 'draft').portfolioUrl, 'https://')
  assert.throws(() => contracts.parseTalentDraft(draft), /https|link/i)
})
test('publication rejects incomplete optional project entries', () => {
  const draft = validDraft(); draft.projects = [{ title: '', role: '', description: '', outcome: '', url: '' }]
  assert.match(contracts.publicationBlockedReason(draft) || '', /project/i)
})
test('blank skills, spaces and empty education do not inflate readiness', () => {
  const draft = contracts.emptyTalentDraft(); draft.skills = [' ']; draft.languages = ['']; draft.projects = [{ title: '', role: '', description: '', outcome: '', url: '' }]; draft.education = [{ institution: '', qualification: '', field: '', year: '' }]
  assert.equal(contracts.profileCompleteness(draft), 0)
})
test('existing record without privacy revision fails closed until schema is updated', () => {
  const row = { ...profile.initialTalentRecord('11111111-1111-4111-8111-111111111111') }; delete row.visibility_revision
  assert.throws(() => profile.mapTalentRecord(row), e => e.code === '42703')
})
test('new member starts with versioned privacy off', () => {
  const row = profile.initialTalentRecord('11111111-1111-4111-8111-111111111111')
  assert.equal(row.visibility_revision, 0)
  assert.equal(row.discovery_enabled, false)
})

const editor = fs.existsSync(path.join(root, 'lib/talent/editor-state.ts')) ? load('lib/talent/editor-state.ts') : {}
function editorFunction(name) { assert.equal(typeof editor[name], 'function', `${name} must be implemented`); return editor[name] }
test('save acknowledgement preserves typing that happened after the request started', () => {
  const sent = validDraft(); const current = { ...sent, summary: 'Newer words typed while the request was in flight.' }
  const result = editorFunction('reconcileSavedDraft')(current, sent, { ...sent, headline: 'Normalized headline' })
  assert.equal(result.summary, current.summary); assert.equal(result.headline, 'Normalized headline')
})
test('save acknowledgement preserves a project added during saving', () => {
  const sent = validDraft(); const current = { ...sent, projects: [{ title: 'New project', role: '', description: '', outcome: '', url: '' }] }
  assert.deepEqual(editorFunction('reconcileSavedDraft')(current, sent, sent).projects, current.projects)
})
test('three-way conflict merge keeps independent remote and local edits', () => {
  const base = validDraft(), local = { ...base, city: 'Lagos' }, remote = { ...base, availability: 'January' }
  const result = editorFunction('planDraftMerge')(base, local, remote)
  assert.equal(result.merged.city, 'Lagos'); assert.equal(result.merged.availability, 'January'); assert.deepEqual(result.conflicts, [])
})
test('three-way merge requires an explicit choice when both tabs changed the same field', () => {
  const base = validDraft(), local = { ...base, headline: 'My local changes' }, remote = { ...base, headline: 'Saved in another tab' }
  const result = editorFunction('planDraftMerge')(base, local, remote)
  assert.deepEqual(result.conflicts, ['headline']); assert.equal(result.merged.headline, local.headline)
})
test('identical edits in two tabs are not a conflict', () => {
  const base = validDraft(), changed = { ...base, headline: 'The same new headline' }
  assert.deepEqual(editorFunction('planDraftMerge')(base, changed, changed).conflicts, [])
})
test('response merge never re-enables newer saved privacy choices', () => {
  const base = profile.initialTalentRecord('11111111-1111-4111-8111-111111111111')
  const current = { ...base, visibility_revision: 4, discovery_enabled: false, revision: 1 }
  const stale = { ...base, visibility_revision: 3, discovery_enabled: true, revision: 2, draft: validDraft() }
  const result = editorFunction('mergeTalentRecords')(current, stale)
  assert.equal(result.discovery_enabled, false); assert.equal(result.visibility_revision, 4); assert.equal(result.revision, 2)
})
test('privacy acknowledgement cannot roll back a newer saved draft', () => {
  const base = profile.initialTalentRecord('11111111-1111-4111-8111-111111111111')
  const current = { ...base, revision: 5, draft: validDraft(), visibility_revision: 2 }
  const response = { ...base, revision: 4, visibility_revision: 3, discovery_enabled: false }
  const result = editorFunction('mergeTalentRecords')(current, response)
  assert.equal(result.revision, 5); assert.deepEqual(result.draft, current.draft); assert.equal(result.visibility_revision, 3)
})
test('comma parsing ignores empty tokens and duplicate casing, retaining meaningful order', () => {
  assert.deepEqual(editorFunction('parseCommaItems')('Python, , python, Financial analysis, '), ['Python', 'Financial analysis'])
})
test('publication checklist points members to the incomplete step', () => {
  const list = editorFunction('profileChecklist')(contracts.emptyTalentDraft())
  assert.ok(list.some(item => item.step === 0 && !item.done)); assert.ok(list.some(item => item.step === 1 && !item.done)); assert.ok(list.some(item => item.step === 3 && !item.done))
})
test('spaces around short content do not satisfy publication requirements', () => {
  const draft = validDraft(); draft.headline = '    A    '
  assert.match(contracts.publicationBlockedReason(draft) || '', /headline/i)
})
test('editor writes against the draft version it has actually reconciled, not an unrelated privacy response', () => {
  const source = fs.readFileSync(path.join(root, 'components/talent/profile-editor.tsx'), 'utf8')
  // Integration wiring assertion; domain conflict cases above cover the merge logic.
  assert.match(source, /expectedRevision: baseRevision\.current/)
  assert.doesNotMatch(source, /expectedRevision: data\.talent\.revision/)
})
const directory = fs.existsSync(path.join(root, 'lib/talent/directory-state.ts')) ? load('lib/talent/directory-state.ts') : {}
function directoryFunction(name) { assert.equal(typeof directory[name], 'function', `${name} must be implemented`); return directory[name] }
test('legacy cohort links still open the recognition archive', () => {
  assert.equal(directoryFunction('readDirectoryState')(new URLSearchParams('year=2024&page=2'), true).view, 'archive')
})
test('explicit talent mode can use a recognition-year filter', () => {
  const state = directoryFunction('readDirectoryState')(new URLSearchParams('view=talent&year=2026&q=research'), true)
  assert.equal(state.view, 'talent'); assert.equal(state.filters.year, '2026'); assert.equal(state.filters.q, 'research')
})
test('directory defaults to talent with all cohorts, not a hard-coded year', () => {
  const state = directoryFunction('readDirectoryState')(new URLSearchParams(), true)
  assert.equal(state.view, 'talent'); assert.equal(state.filters.year, '')
})
test('talent URLs round-trip selected filters without copying archive pagination', () => {
  const search = directoryFunction('directorySearch')(new URLSearchParams('page=4&search=old&utm_source=partner'), 'talent', { ...directory.EMPTY_DIRECTORY_FILTERS, q: 'AI & research', country: 'Nigeria', year: '2027' })
  const params = new URLSearchParams(search)
  assert.equal(params.get('page'), null); assert.equal(params.get('search'), null); assert.equal(params.get('utm_source'), 'partner')
  assert.equal(directoryFunction('readDirectoryState')(params, true).filters.q, 'AI & research')
})
test('public talent search keeps the awardee section on its own filters and page', () => {
  const current = new URLSearchParams('year=2024&country=Kenya&search=Grace&page=2')
  const search = directory.publicTalentSearch(current, { ...directory.EMPTY_DIRECTORY_FILTERS, country: 'Nigeria', year: '2026' })
  const params = new URLSearchParams(search)
  assert.deepEqual(directory.readAwardeeFilters(params), { year: '2024', country: 'Kenya' })
  assert.equal(params.get('search'), 'Grace')
  assert.equal(params.get('page'), '2')
  const talent = directory.readDirectoryState(params, true).filters
  assert.equal(talent.country, 'Nigeria')
  assert.equal(talent.year, '2026')

  const cleared = new URLSearchParams(directory.publicTalentSearch(params, directory.EMPTY_DIRECTORY_FILTERS))
  assert.deepEqual(directory.readAwardeeFilters(cleared), { year: '2024', country: 'Kenya' })
  assert.equal(cleared.get('country'), null)
})
test('switching to archive removes talent-only filter parameters', () => {
  const params = new URLSearchParams(directoryFunction('directorySearch')(new URLSearchParams('view=talent&q=AI&skill=Python&year=2027'), 'archive', directory.EMPTY_DIRECTORY_FILTERS))
  assert.equal(params.get('view'), 'archive'); assert.equal(params.get('q'), null); assert.equal(params.get('skill'), null)
})
test('compact member directory cannot enter a nonexistent archive mode', () => {
  assert.equal(directoryFunction('readDirectoryState')(new URLSearchParams('view=archive&year=2024'), false).view, 'talent')
})
test('profile return links accept only the two internal directory routes', () => {
  const back = directoryFunction('directoryReturnHref')
  assert.equal(back('/awardees?view=talent&skill=Python', 2026), '/awardees?view=talent&skill=Python')
  assert.equal(back('/dashboard/discover/members?view=talent', 2026), '/dashboard/discover/members?view=talent')
  for (const value of ['https://other.example', '//other.example', '/admin', '/awardees/other', '/awardees\\\\other', '/awardees\n']) {
    assert.equal(back(value, 2026), '/awardees?view=archive&year=2026#leader-directory')
  }
})
test('draft dirty checks ignore save normalisation without rewriting the focused text', () => {
  const raw = { ...validDraft(), summary: 'I build community learning tools. ', skills: [' Python ', 'python'] }
  const canonical = contracts.parseTalentDraft(raw, 'draft')
  assert.equal(editorFunction('draftsEquivalent')(raw, canonical), true)
  assert.equal(raw.summary.endsWith(' '), true)
  assert.equal(editorFunction('draftsEquivalent')({ ...raw, summary: raw.summary + 'New words' }, canonical), false)
})
