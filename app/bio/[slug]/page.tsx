import { notFound, permanentRedirect } from 'next/navigation'

import { publicBioDestination } from '@/lib/dashboard/bio-routing'

export default async function PublicBioAliasPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const destination = publicBioDestination(slug)
  if (!destination) notFound()
  permanentRedirect(destination)
}
