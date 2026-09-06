# Cloudflare media pipeline

This project now supports Cloudflare R2 for new awardee/profile media while
keeping existing Supabase URLs and legacy buckets working.

## Responsibility split

- Supabase remains the source of truth for profiles, awardees, ownership,
  consent, generation status, and directory metadata.
- R2 stores new uploaded/generated media when \`MEDIA_STORAGE_PROVIDER=r2\`.
- Cloudflare Queues buffers portfolio generation jobs.
- The Node.js application keeps the existing \`sharp\` and OpenAI processing
  logic.
- The queue consumer calls the internal Node.js processing route with a shared
  secret.

## Cloudflare account setup

The Cloudflare account currently has the queue and R2 bucket created:

- Queue name: \`top100-afl-portfolio-generation\`
- Queue ID: \`11a4ad0b222946f0afe980ce43fce8b2\`
- Public R2 bucket: \`top100-afl-media\` (Standard storage, WEUR location)
- Private R2 bucket: \`top100-afl-private\` (Standard storage, WEUR location)

Important: a custom domain makes the bucket publicly accessible. The current
code routes logical portfolio sources and options to a private bucket while
public media and selected covers use the public bucket.

The Cloudflare account must have the \`top100afl.com\` zone for that
attachment; verify the domain is attached to the exact bucket and account
before enabling R2 in the application.

The bucket CORS policy currently allows GET/PUT/POST/DELETE/HEAD from
\`https://www.top100afl.com\`, \`https://top100afl.com\`, and
\`http://localhost:3000\`.

Create an R2 API token with Object Read & Write access limited to these two
buckets. Do not use the Cloudflare global API token for application uploads.

## Application environment

Set these server-side variables in the deployment environment:

\`\`\`env
MEDIA_STORAGE_PROVIDER=r2
CLOUDFLARE_R2_ACCOUNT_ID=<account-id>
CLOUDFLARE_R2_ACCESS_KEY_ID=<r2-access-key>
CLOUDFLARE_R2_SECRET_ACCESS_KEY=<r2-secret-key>
CLOUDFLARE_R2_BUCKET=top100-afl-media
CLOUDFLARE_R2_PRIVATE_BUCKET=top100-afl-private
CLOUDFLARE_R2_PUBLIC_URL=https://media.top100afl.com

CLOUDFLARE_ACCOUNT_ID=<account-id>
CLOUDFLARE_QUEUE_ID=11a4ad0b222946f0afe980ce43fce8b2
CLOUDFLARE_API_TOKEN=<server-only-token-with-queue-write>
PORTFOLIO_WORKER_SECRET=<long-random-shared-secret>
\`\`\`

Keep \`CLOUDFLARE_R2_SECRET_ACCESS_KEY\`, \`CLOUDFLARE_API_TOKEN\`, and
\`PORTFOLIO_WORKER_SECRET\` server-only. None may use a \`NEXT_PUBLIC_\` prefix.

Keep the existing portfolio bucket names as logical namespaces:

\`\`\`env
PORTFOLIO_SOURCE_BUCKET=portfolio-sources
PORTFOLIO_OPTION_BUCKET=portfolio-options
PORTFOLIO_COVER_BUCKET=portfolio-covers
\`\`\`

## Queue consumer deployment

The consumer source is in \`cloudflare/portfolio-generation-consumer.js\`.
Set its application origin in \`cloudflare/wrangler.toml\` or as a Worker
variable, then deploy:

\`\`\`bash
npx wrangler deploy --config cloudflare/wrangler.toml
npx wrangler secret put PORTFOLIO_WORKER_SECRET --config cloudflare/wrangler.toml
\`\`\`

The consumer sends only a generation ID, member ID, and attempt number. Image
bytes never travel through the queue.

## Rollout

1. Leave \`MEDIA_STORAGE_PROVIDER\` unset while validating the code.
2. Verify R2, the bucket, custom domain, CORS policy, and restricted R2 token.
3. Add the server variables to staging.
4. Deploy the queue consumer.
5. Run one test signup/avatar upload and one portfolio generation.
6. Confirm the directory reads the selected R2 cover URL.
7. Enable \`MEDIA_STORAGE_PROVIDER=r2\` in production.

If R2 is selected without complete credentials, production readiness fails
closed. If portfolio generation is enabled on R2 without queue credentials, it
also fails closed instead of using request-bound background work.
