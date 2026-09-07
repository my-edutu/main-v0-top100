import { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import ReviewQueueClient from '../../../../app/admin/selection/review/review-queue-client'

// Isolated, invented UI fixtures only. Not an authentication or live-API test.
const id = '11111111-1111-4111-8111-111111111111'
window.__uiErrors = []
window.addEventListener('error', (event) => window.__uiErrors.push(event.message))
window.addEventListener('unhandledrejection', (event) => window.__uiErrors.push(String(event.reason)))
window.__uiMode = 'success'
window.__uiRequests = []
window.__uiRevision = 1
const originalFetch = window.fetch.bind(window)
window.fetch = async (url, options) => {
  if (String(url) !== `/api/admin/selection/applications/${id}/review`) return originalFetch(url, options)
  const body = JSON.parse(options.body)
  window.__uiRequests.push(body)
  if (window.__uiMode === 'pending') await new Promise((resolve) => { window.__uiResume = resolve })
  if (window.__uiMode === 'conflict') return Response.json({ message: 'Another reviewer updated this case. Reload and review again.' }, { status: 409 })
  if (window.__uiMode === 'failure') return Response.json({ message: 'Review save could not be confirmed. Reload before retrying.' }, { status: 503 })
  window.__uiRevision = (body.expectedRevision ?? 0) + 1
  return Response.json({ revision: window.__uiRevision, resultPublished: false })
}

function Harness() {
  const [revision, setRevision] = useState(1)
  useEffect(() => {
    const refresh = () => setRevision(window.__uiRevision)
    window.addEventListener('selection-harness-refresh', refresh)
    return () => window.removeEventListener('selection-harness-refresh', refresh)
  }, [])
  const applicant = {
    id, full_name: 'Ada Example', country: 'Nigeria', institution: 'Synthetic Community University',
    course: 'Environmental Engineering', claimed_cgpa: '4.8 / 5', claimed_academic_status: 'First Class',
    leadership_narrative: 'Invented case: I coordinated a student team supporting 300 learners. Supporting records and the issuing source still need independent verification.',
    selection_cycles: { policy: { version: '2026.1' } }, selection_jobs: { source_label: 'Synthetic UI fixture' },
    selection_assessments: [{ verdict: 'needs_review', total_score: 39, revision, policy_version: '2026.1',
      score_breakdown: { academic: 0, leadership: 15, impact: 12, initiative: 6, communication: 6 },
      public_reasons: [], internal_reasons: ['ACADEMIC_AUTHENTICITY_NOT_VERIFIED', 'DOCUMENT_HOLDER_NOT_VERIFIED'] }],
    selection_documents: [{ id: '22222222-2222-4222-8222-222222222222', original_name: 'Invented-degree-evidence.pdf',
      size_bytes: 246800, sha256: 'a'.repeat(64), extraction_status: 'completed', extraction_confidence: 96, integrity_flags: [] }],
  }
  return <main className="mx-auto w-full max-w-[1600px] space-y-5 bg-zinc-50 px-4 py-6 text-zinc-900 md:px-8">
    <header><p className="text-sm font-semibold text-orange-700">TOP100 · SYNTHETIC COMPONENT TEST</p><h1 className="mt-2 text-2xl font-bold">Applicant verification case</h1><p className="mt-2 text-sm text-zinc-600">Actual reviewer components with invented data and stubbed navigation/API responses. Not the live admin portal.</p></header>
    <ReviewQueueClient applicants={[applicant]} focusApplicationId={id} />
  </main>
}
createRoot(document.getElementById('root')).render(<Harness />)
