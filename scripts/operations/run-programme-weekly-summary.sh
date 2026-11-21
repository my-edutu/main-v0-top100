#!/bin/sh
# Example for the Dokploy host. Install and enable only during a future release.
set -eu
exec 9>/run/lock/top100-programme-weekly-summary.lock
flock -n 9 || exit 0
container=$(docker ps --filter 'name=top100-frontend-hymlzt.1' --filter status=running --format '{{.ID}}' | head -n 1)
[ -n "$container" ]
docker exec -i "$container" node <<'JS'
(async () => {
  if (!process.env.CRON_SECRET) throw new Error('Summary secret is not configured')
  const response = await fetch('http://127.0.0.1:3000/api/internal/programme-weekly-summary', { method:'POST', headers:{ Authorization:'Bearer ' + process.env.CRON_SECRET }, signal:AbortSignal.timeout(60000) })
  if (!response.ok) throw new Error(`Weekly summary failed: ${response.status}`)
  console.log('Weekly programme summary generated')
})().catch(error => { console.error(error.message); process.exitCode = 1 })
JS
