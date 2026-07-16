import { redirect } from 'next/navigation'

/**
 * Legacy route. Member sign-in now lives at /login and the admin console
 * sign-in at /admin/login; forward old links with their params intact.
 */
export default async function LegacySignInRedirect({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const qs = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === 'string') qs.set(key, value)
  }

  const wantsAdmin =
    qs.get('portal') === 'admin' || (qs.get('redirect') ?? qs.get('from') ?? '').startsWith('/admin')

  if (wantsAdmin) {
    qs.delete('portal')
    redirect(qs.size ? `/admin/login?${qs}` : '/admin/login')
  }

  redirect(qs.size ? `/login?${qs}` : '/login')
}
