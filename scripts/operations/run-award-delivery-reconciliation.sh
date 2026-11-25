#!/bin/sh
# Installed on the active Dokploy host. Reads credentials only inside the app.
set -eu
exec 9>/run/lock/top100-award-delivery-reconciliation.lock
flock -n 9 || exit 0
container=$(docker ps --filter 'name=top100-frontend-hymlzt.1' --filter status=running --format '{{.ID}}' | head -n 1)
[ -n "$container" ]
docker exec -i "$container" node <<'JS'
(async () => {
  if (!process.env.CRON_SECRET) throw new Error('Reconciliation secret is not configured')
  const r = await fetch('http://127.0.0.1:3000/api/internal/award-delivery-reconciliation', {
    method: 'POST', headers: { Authorization: 'Bearer ' + process.env.CRON_SECRET },
    signal: AbortSignal.timeout(210000),
  })
  console.log('Delivery payment reconciliation', r.status, await r.text())
  if (!r.ok) process.exitCode = 1
})().catch(e => { console.error(e.message); process.exitCode = 1 })
JS
