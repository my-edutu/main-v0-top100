#!/usr/bin/env node
// Read-only check of which tables and profile columns the live Supabase project
// actually has. Run this before and after pasting supabase/SETUP-ALL.sql.
//
// It only ever issues `select ... limit 0` / `limit 1` reads. It creates
// nothing, writes nothing, and drops nothing.
//
// Usage: node scripts/verify-db.mjs

import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

function loadEnv() {
  const env = {}
  let raw
  try {
    raw = readFileSync(join(root, '.env.local'), 'utf8')
  } catch {
    console.error('Could not read .env.local — run this from the project root.')
    process.exit(1)
  }
  for (const line of raw.split('\n')) {
    const match = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim())
    if (match) env[match[1]] = match[2].replace(/^['"]|['"]$/g, '').trim()
  }
  return env
}

const env = loadEnv()
const url = env.NEXT_PUBLIC_SUPABASE_URL
const key = env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !key) {
  console.error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must both be set in .env.local.')
  process.exit(1)
}

const headers = { apikey: key, Authorization: `Bearer ${key}` }

// [table, what breaks without it]
const TABLES = [
  ['profiles', 'everything'],
  ['awardees', 'directory + signup identity claim'],
  ['messages', 'contact form — PREREQUISITE for SETUP-ALL.sql'],
  ['access_codes', 'admin invite codes + /signup'],
  ['user_notifications', 'dashboard notifications + award emails'],
  ['member_features', '"Get featured" submissions'],
  ['dm_conversations', 'direct messages'],
  ['dm_messages', 'direct messages'],
  ['feature_requests', 'news feature requests'],
  ['award_orders', 'the entire award claim + payment flow'],
  ['award_notification_log', '"your award has been sent" notifications'],
  ['interviews', 'impact interviews'],
  ['interview_applications', 'impact interviews'],
  ['member_groups', 'awardee groups'],
  ['member_group_members', 'awardee groups'],
  ['member_group_messages', 'awardee groups'],
  ['member_posts', 'member-written posts on public profiles'],
  ['event_invitations', 'event invitations + RSVP'],
  ['opportunities', 'exclusive member opportunities'],
  ['opportunity_saves', 'bookmarking an opportunity'],
]

// Columns SETUP-MEMBER-HUB.sql adds to profiles. Their absence is the single
// most confusing failure mode: the tables exist, so nothing 404s, but every
// membership check silently misbehaves.
const PROFILE_COLUMNS = [
  'membership_status',
  'bio_update_count',
  'bio_update_limit',
  'notification_prefs',
  'organization',
  'field',
]

async function tableExists(table) {
  try {
    const res = await fetch(`${url}/rest/v1/${table}?select=*&limit=0`, { headers })
    if (res.ok) return { ok: true }
    if (res.status === 404) return { ok: false, reason: 'missing' }
    return { ok: false, reason: `http ${res.status}` }
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : 'request failed' }
  }
}

async function profileColumns() {
  try {
    const res = await fetch(`${url}/rest/v1/profiles?select=*&limit=1`, { headers })
    if (!res.ok) return null
    const rows = await res.json()
    if (!Array.isArray(rows) || rows.length === 0) return null
    return Object.keys(rows[0])
  } catch {
    return null
  }
}

const results = await Promise.all(TABLES.map(async ([t, why]) => [t, why, await tableExists(t)]))

let missing = 0
console.log('\nTABLES')
console.log('-'.repeat(78))
for (const [table, why, result] of results) {
  if (!result.ok) missing++
  const mark = result.ok ? 'ok     ' : 'MISSING'
  console.log(`${mark}  ${table.padEnd(24)} ${result.ok ? '' : `(${result.reason}) — breaks: ${why}`}`)
}

console.log('\nPROFILES COLUMNS')
console.log('-'.repeat(78))
const columns = await profileColumns()
let missingColumns = 0
if (!columns) {
  console.log('could not read a profiles row — skipped (is the table empty?)')
} else {
  for (const column of PROFILE_COLUMNS) {
    const present = columns.includes(column)
    if (!present) missingColumns++
    console.log(`${present ? 'ok     ' : 'MISSING'}  ${column}`)
  }
}

console.log('\n' + '='.repeat(78))
if (missing === 0 && missingColumns === 0) {
  console.log('All expected tables and profile columns are present.')
} else {
  console.log(`${missing} table(s) and ${missingColumns} profiles column(s) missing.`)
  console.log('Fix: run `node scripts/build-setup-sql.mjs`, then paste supabase/SETUP-ALL.sql')
  console.log('into the Supabase SQL editor and run it once.')
  process.exitCode = 1
}
