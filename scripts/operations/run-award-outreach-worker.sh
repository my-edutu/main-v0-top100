#!/bin/sh
# Installed on the Dokploy host; contains no credentials. Follow the active task
# on every invocation so rebuilds do not leave the scheduler on an old container.
set -eu
container=$(docker ps --filter label=com.docker.swarm.service.name=top100-frontend-hymlzt --filter status=running --format '{{.ID}}' | head -n 1)
if [ -z "$container" ]; then
  echo 'Top100 frontend container unavailable.' >&2
  exit 1
fi
docker exec "$container" node -e '
async function run() {
  const secret = process.env.AWARD_OUTREACH_WORKER_SECRET || process.env.EMAIL_OUTBOX_WORKER_SECRET || process.env.CRON_SECRET;
  if (!secret) throw new Error("Outreach worker secret missing.");
  const response = await fetch("http://127.0.0.1:3000/api/internal/award-outreach/process", {
    method: "POST",
    headers: { authorization: `Bearer ${secret}` },
    signal: AbortSignal.timeout(55000),
  });
  if (!response.ok) throw new Error(`Outreach worker HTTP ${response.status}`);
  const result = await response.json();
  console.log(JSON.stringify(Object.fromEntries(
    ["claimed", "sent", "skipped", "deliveryUnknown", "failed"].map(key => [key, result[key]])
  )));
  if (result.failed || result.deliveryUnknown) process.exitCode = 1;
}
run().catch(error => { console.error(error.message); process.exitCode = 1; });
'
