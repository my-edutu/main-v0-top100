import { redirect } from 'next/navigation'

export default function SessionsRedirect() {
  redirect('/dashboard/discover/event-videos')
}
