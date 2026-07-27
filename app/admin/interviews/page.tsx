import type { Metadata } from 'next'

import InterviewsAdminClient from './_components/InterviewsAdminClient'

export const metadata: Metadata = {
  title: 'Impact Interviews | Admin',
}

export default function AdminInterviewsPage() {
  return <InterviewsAdminClient />
}
