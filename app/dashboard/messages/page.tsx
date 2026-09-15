import { redirect } from 'next/navigation'

/** Direct messaging is paused temporarily. Keep the route reversible. */
export default function MessagesListPage() {
  redirect('/dashboard/discover/members')
}
