import Link from 'next/link'
import { redirect } from 'next/navigation'
import { LogOut, ShieldAlert } from 'lucide-react'
import { getSessionMember } from '@/lib/auth'
import { getTeamContext } from '@/lib/data'
import { createServerSupabase } from '@/lib/supabase/server'
import { AppShell } from '@/components/app-shell'
import { BrandMark } from '@/components/brand'
import { signOutAction } from '@/app/actions'

export const dynamic = 'force-dynamic'

export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const member = await getSessionMember()
  if (!member) {
    const supabase = await createServerSupabase()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    return (
      <main className="flex min-h-dvh flex-col items-center justify-center px-5">
        <div className="mb-8 text-ink">
          <BrandMark />
        </div>
        <div className="card w-full max-w-md p-7 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-800">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <h1 className="display text-2xl">Workspace access pending</h1>
          <p className="mt-2 text-sm leading-6 text-muted">
            Your account is signed in, but team access is still waiting for administrator approval.
            Confirm your email if you have not already, then ask your Top100 administrator to activate your membership.
          </p>
          <div className="mt-6 flex justify-center gap-2">
            <Link href="/login" className="btn btn-ghost">
              Use another account
            </Link>
            <form action={signOutAction}>
              <button className="btn btn-primary" type="submit">
                <LogOut className="h-4 w-4" /> Sign out
              </button>
            </form>
          </div>
        </div>
      </main>
    )
  }

  const context = await getTeamContext(member)
  return (
    <AppShell member={member} unread={context.unread}>
      {children}
    </AppShell>
  )
}
