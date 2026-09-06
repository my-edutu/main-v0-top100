#!/usr/bin/env node
// Applies supabase/SETUP-ALL.sql to a Postgres database over a direct
// connection, inside a single transaction.
//
// Why this exists: SETUP-ALL.sql is DDL, and the Supabase service-role key is a
// PostgREST JWT — it can read and write rows but cannot create a table. DDL
// needs a real Postgres connection, which needs the database password.
//
// Usage:
//   DATABASE_URL='postgresql://postgres:PASSWORD@db.<ref>.supabase.co:5432/postgres' \
//     node scripts/run-setup-sql.mjs
//
//   Add --dry-run to print what would be applied and exit without connecting.
//
// Get the string from: Supabase dashboard -> Project Settings -> Database ->
// Connection string -> URI (then substitute your database password).
//
// The whole file runs in ONE transaction: if any statement fails, everything
// rolls back and the database is left exactly as it was. SETUP-ALL.sql is
// idempotent, so a successful re-run is a no-op.

import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const sqlPath = join(root, 'supabase', 'SETUP-ALL.sql')

if (!existsSync(sqlPath)) {
  console.error('supabase/SETUP-ALL.sql not found. Run: node scripts/build-setup-sql.mjs')
  process.exit(1)
}

const sql = readFileSync(sqlPath, 'utf8')
const dryRun = process.argv.includes('--dry-run')

// Report which files the bootstrap covers, so a run is never a black box.
const covered = [...sql.matchAll(/^-- BEGIN (.+)$/gm)].map((m) => m[1])
console.log(`supabase/SETUP-ALL.sql — ${sql.split('\n').length} lines, ${covered.length} migration file(s):`)
for (const name of covered) console.log(`  - ${name}`)

if (dryRun) {
  console.log('\n--dry-run: nothing was connected to or executed.')
  process.exit(0)
}

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  console.error(`
DATABASE_URL is not set, so there is nothing to connect to.

The Supabase service-role key in .env.local cannot be used here: it authenticates
to PostgREST, which does not execute DDL. Creating tables needs the database
password.

  Supabase dashboard -> Project Settings -> Database -> Connection string -> URI

Then:
  DATABASE_URL='postgresql://postgres:PASSWORD@db.<ref>.supabase.co:5432/postgres' \\
    node scripts/run-setup-sql.mjs

Alternative that needs no password: open the Supabase SQL Editor and paste the
contents of supabase/SETUP-ALL.sql.`)
  process.exit(1)
}

// Supabase requires TLS. rejectUnauthorized:false matches what the Supabase CLI
// and most tooling do here — the hostname is fixed and the connection still
// encrypts; the CA chain is simply not pinned locally.
const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } })

// Surface RAISE NOTICE output — several of the migrations use it to explain
// conditional paths (e.g. an RLS policy that degrades when a column is absent).
client.on('notice', (notice) => {
  if (notice?.message) console.log(`  notice: ${notice.message}`)
})

try {
  await client.connect()
  const { rows } = await client.query('select current_database() as db, current_user as usr')
  console.log(`\nConnected to ${rows[0].db} as ${rows[0].usr}. Applying in one transaction...\n`)

  await client.query('begin')
  await client.query(sql)
  await client.query('commit')

  console.log('\nCommitted. Verify with: node scripts/verify-db.mjs')
} catch (error) {
  try {
    await client.query('rollback')
    console.error('\nRolled back — the database is unchanged.')
  } catch {
    console.error('\nRollback also failed; inspect the database before retrying.')
  }
  console.error(`\n${error?.message ?? error}`)
  if (error?.position) console.error(`at character position ${error.position} of the combined file`)
  if (error?.hint) console.error(`hint: ${error.hint}`)
  process.exitCode = 1
} finally {
  await client.end().catch(() => {})
}
