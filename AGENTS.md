<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Production hosting

Top100 runs on our own Dokploy hosting at https://console.top100afl.com, not Vercel.
The production database is self-hosted Supabase at https://supabase.top100afl.com;
the former hosted Supabase project is retired. Apply migrations and configure
worker schedules on the active Dokploy server. Do not use Vercel or the retired
hosted database for production changes.
