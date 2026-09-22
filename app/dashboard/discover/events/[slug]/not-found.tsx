import Link from 'next/link'

export default function ProgrammeEventNotFound() {
  return <div className="py-20 text-center"><h1 className="text-2xl font-semibold text-stone-950">Event not found</h1><p className="mt-2 text-sm text-stone-600">This programme session may no longer be published.</p><Link href="/dashboard/discover/events" className="mt-6 inline-flex min-h-11 items-center rounded-full bg-stone-950 px-5 text-sm font-semibold text-white">Back to events</Link></div>
}
