import { Check, Sparkles } from 'lucide-react'

const LOOKING_FOR = [
  'A Top100 Africa Future Leaders awardee, from any cohort',
  'Work with measurable impact since the award — a venture, a project, a body of research',
  'A story with a turning point in it, not just a list of achievements',
  'Willing to sit for a recorded interview of about 30 minutes',
]

const WHY_APPLY = [
  'Your story reaches the full Top100 network, our magazine and our social platforms',
  'A permanent, shareable profile piece you can send to funders and partners',
  'Connection with awardees working on adjacent problems across 31 countries',
  'A stronger, more specific picture of what African leadership actually looks like',
]

export default function EligibilityBands() {
  return (
    <section className="grid gap-6 md:grid-cols-2">
      <div className="rounded-[28px] border border-orange-100 bg-[#fffaf4] p-8">
        <h2 className="text-xl font-bold text-slate-900">Who we&rsquo;re looking for</h2>
        <ul className="mt-5 space-y-3">
          {LOOKING_FOR.map((item) => (
            <li key={item} className="flex gap-3 text-sm leading-relaxed text-slate-600">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-orange-600" aria-hidden="true" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-[28px] border border-orange-100 bg-white p-8">
        <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900">
          <Sparkles className="h-5 w-5 text-orange-500" aria-hidden="true" />
          Why apply
        </h2>
        <ul className="mt-5 space-y-3">
          {WHY_APPLY.map((item) => (
            <li key={item} className="flex gap-3 text-sm leading-relaxed text-slate-600">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-orange-600" aria-hidden="true" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
