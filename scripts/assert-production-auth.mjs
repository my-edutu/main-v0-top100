import nextEnv from '@next/env'
const { loadEnvConfig } = nextEnv

// Next embeds public values into browser bundles. Reject the wrong origin
// before building, even if the runner has a different environment.
loadEnvConfig(process.cwd(), false)
if (process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '') !== 'https://supabase.top100afl.com') {
  console.error('Build blocked: NEXT_PUBLIC_SUPABASE_URL must be https://supabase.top100afl.com. Hosted Supabase is retired.')
  process.exit(1)
}
console.log('Production auth origin verified: self-hosted Supabase.')
