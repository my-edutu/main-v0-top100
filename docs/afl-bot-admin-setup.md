# Connect the AFL bot admin workspace

The new page is `/admin/afl-bot`. It uses the existing Top100 admin session and current
admin-role checks. No Top100 database migration is required. The browser never receives
the bot bridge credential. The bot never receives Top100 Supabase credentials or profiles.

## Private connection (operator configuration)

1. Keep the bot API disabled (`BOT_ADMIN_API_PORT=0`) until a private connection is
   arranged. The API stores/manages private draft knowledge; do not expose it casually.
2. Generate a high-entropy ASCII secret of at least 32 characters in a password manager
   or secret manager. Enter it directly in the two server environments; never paste it
   into browser code, chat, source files, or a `NEXT_PUBLIC_` variable.
3. In the bot service: set `BOT_ADMIN_API_PORT=8090`, `BOT_ADMIN_API_BIND=0.0.0.0` for
   a private container network, and `BOT_ADMIN_API_TOKEN` to the secret. Do not publish
   a host port. Loopback binding (`127.0.0.1`) is the default for same-host processes.
4. In the Top100 server: set `AFL_BOT_ADMIN_URL` to the reachable private bot URL such
   as `http://bot-service:8090` and `AFL_BOT_ADMIN_TOKEN` to the same secret. Container
   DNS requires both containers to share an operator-approved private network. The URL
   must be the root origin, without credentials, path, query, or fragment. Public
   connections require HTTPS; HTTP is accepted only for private/local hostnames/IPs.
5. Restart/deploy the bot and Top100 application, preserving the bot's data volume.
   Open the admin workspace and refresh status. It should report whether WhatsApp,
   the reply model and conversational memory are connected.

Enabling a new route/network connection is an operator action after review. A completed
code change does not mean this connection is configured. The UI shows an explicit
unavailable/setup message when it has no connection. Never use Fresh Volumes to apply it.

## Knowledge

Save text or a readable PDF (10 MB maximum) as a draft. The default audience is admins
only. Review the complete extracted content, audience, effective/expiry dates and source
link before publishing. Member knowledge becomes available only after publication and
while effective; private drafts never support member answers. Use Create replacement
for a new version; published content is immutable. Retire withdraws it from answers and
downloads while retaining the audit trail. Each text entry is limited to 80,000 characters;
add multiple focused entries for a large library. Announcements do not automatically
become approved knowledge.

## Announcements

Save exact text as a draft (3,500 characters maximum). Preview shows the server-selected
single test-group destination; no browser-provided group target is accepted. Review the
message and destination, check the confirmation, and press Send announcement now. The
actor-bound preview expires after 10 minutes. A transaction claims each send once. A
send that fails or times out may have reached WhatsApp: refresh status and check the
group, and never blindly retry. A new replacement draft requires another explicit review.

No real announcement is sent as part of automated tests or a code deployment. Broader
group broadcasts and scheduled announcements are intentionally outside this first release.
