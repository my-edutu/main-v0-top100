import { cookies } from 'next/headers'
import AdminShell from './components/AdminShell'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Read the sidebar's persisted state on the server so the first paint already
  // has the right width — reading it on the client would flash the wrong one.
  const cookieStore = await cookies()
  const defaultOpen = cookieStore.get('sidebar:state')?.value !== 'false'

  return <AdminShell defaultOpen={defaultOpen}>{children}</AdminShell>
}
