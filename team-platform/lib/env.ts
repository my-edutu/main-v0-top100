export const env = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
  supabaseAnonKey:
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    '',
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
  cronSecret: process.env.TEAM_CRON_SECRET ?? '',
  cronActorId: process.env.TEAM_CRON_ACTOR_ID ?? '',
  smtp: {
    host: process.env.SMTP_HOST ?? '',
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER ?? '',
    pass: process.env.SMTP_PASS ?? '',
    fromName: process.env.SMTP_FROM_NAME ?? 'Top100 Africa Future Leaders',
    fromEmail: process.env.SMTP_FROM_EMAIL ?? process.env.SMTP_USER ?? '',
  },
}

export function assertServerEnv() {
  const missing: string[] = []
  if (!env.supabaseUrl) missing.push('NEXT_PUBLIC_SUPABASE_URL')
  if (!env.supabaseAnonKey) missing.push('NEXT_PUBLIC_SUPABASE_ANON_KEY')
  if (!env.serviceRoleKey) missing.push('SUPABASE_SERVICE_ROLE_KEY')
  return missing
}

export function smtpConfigured() {
  return Boolean(env.smtp.host && env.smtp.fromEmail)
}
