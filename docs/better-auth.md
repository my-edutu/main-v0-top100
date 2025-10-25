# Better Auth Integration Notes

Better Auth is now wired into the project alongside the existing Supabase setup. Use the steps below to finish configuring and start using it.

## Environment
- `NEXT_PUBLIC_ENABLE_AUTH` controls whether Better Auth boots at all. Leave it unset (or set to `false`) while staging. Set it to `true` only after the rest of the variables below are ready.
- `DATABASE_URL` must point to the Postgres instance you want Better Auth to manage (the Supabase connection string works).
- `BETTER_AUTH_SECRET` should be a strong random string (32+ chars). Generate one with `openssl rand -base64 32`.
- `BETTER_AUTH_URL` should be the public base URL for the app (e.g. `http://localhost:3000` during development).
- `RESEND_API_KEY` enables transactional email delivery for verification links. Set `RESEND_FROM_EMAIL` if you want to override the default `no-reply` sender.

Without `DATABASE_URL`, Better Auth falls back to an in-memory adapter and data will reset on every restart.

## Database Schema
1. Ensure `lib/better-auth/server.ts` is updated with any plugins you want before generating the schema.
2. Run the Better Auth CLI to emit Prisma SQL (or direct SQL if you switch adapters):
   ```bash
   npx @better-auth/cli@latest generate
   ```
3. Apply the generated schema to your database (via Prisma migrate, psql, etc.). For Supabase, run the SQL using the SQL editor or the Supabase CLI.
4. If you want the CLI to run migrations directly (Kysely adapter only), use:
   ```bash
   npx @better-auth/cli@latest migrate
   ```

## API Route
- Requests should hit `/api/better-auth/*`. Keep the base path aligned with `lib/better-auth/server.ts` and the client helper if you change it.

## Client Helper
- Import `betterAuthClient` from `@/lib/better-auth/client` in client components to sign users in/out:
  ```ts
  import { betterAuthClient } from "@/lib/better-auth/client";

  await betterAuthClient.signIn.email({ email, password });
  ```
- The helper exposes `useSession` and other utilities from Better Auth's React bindings.

## Next Steps
- Seed at least one admin user by updating the Better Auth `user.role` column to `admin`.
- Keep `/api/profiles/ensure` in mind when extending signup/onboarding flows so Supabase domain data stays aligned.
- Email verification is required before sessions are minted, so ensure your email provider is configured in non-local environments.
- Review `docs/content` on better-auth.com for enabling additional providers (OAuth, passkeys, etc.).

