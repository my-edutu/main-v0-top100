import { redirect } from 'next/navigation'

export default async function PublicSessionRedirect({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  redirect(`/dashboard/discover/event-videos/${encodeURIComponent(slug)}`)
}
