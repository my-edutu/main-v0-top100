import Image from 'next/image'
import { ArrowUpRight, CheckCircle2, Compass, Sparkles } from 'lucide-react'

const features = [
  {
    icon: Compass,
    title: 'Find the right fit',
    body: 'Discover scholarships, fellowships, internships, and grants matched to your goals.',
  },
  {
    icon: Sparkles,
    title: 'Build your roadmap',
    body: 'Get practical, AI-guided steps that turn a promising opportunity into a clear plan.',
  },
  {
    icon: CheckCircle2,
    title: 'Apply with confidence',
    body: 'Strengthen your materials and stay on track with reminders through every deadline.',
  },
]

export default function OpportunitiesPage() {
  return (
    <main className="space-y-8 py-6 pb-24">
      <section className="overflow-hidden rounded-3xl bg-[#101b35] text-white shadow-sm">
        <div className="relative isolate overflow-hidden px-5 pb-7 pt-6 sm:px-8 sm:pt-8">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_85%_10%,#146ef555,transparent_42%),radial-gradient(circle_at_0%_100%,#f9731640,transparent_46%)]" />
          <div className="flex items-center gap-3">
            <Image src="/edutu-logo.png" alt="Edutu logo" width={48} height={48} className="h-11 w-11 rounded-2xl bg-white object-contain p-1" />
            <div>
              <p className="text-sm font-semibold tracking-tight">Edutu</p>
              <p className="text-xs text-blue-100/75">AI-powered global opportunities</p>
            </div>
          </div>
          <p className="mt-10 text-xs font-semibold uppercase tracking-[0.22em] text-orange-200">Top100 × Edutu</p>
          <h1 className="mt-4 max-w-xl text-3xl font-semibold leading-[1.05] tracking-[-0.04em] !text-white sm:text-5xl">Turn your ambition into your next opportunity.</h1>
          <p className="mt-5 max-w-xl text-sm leading-7 text-blue-50/80 sm:text-base">Edutu helps you find global programmes, understand what they need, and follow a clear path from discovery to application.</p>
          <a href="https://www.edutu.org" target="_blank" rel="noopener noreferrer" className="mt-7 inline-flex min-h-12 items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-orange-400 to-amber-300 px-5 text-sm font-semibold text-slate-950 transition hover:from-orange-300 hover:to-amber-200">
            Explore Edutu <ArrowUpRight size={18} aria-hidden="true" />
          </a>
        </div>
        <Image
          src="/edutu-top100-partnership.png"
          alt="Top100 and Edutu partners helping African leaders find global opportunities"
          width={1672}
          height={941}
          priority
          className="h-52 w-full object-cover sm:h-72"
        />
      </section>

      <section className="space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-700">Built for your next move</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[#171412]">A smarter way to pursue global opportunities.</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {features.map(({ icon: Icon, title, body }) => (
            <article key={title} className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-[#146ef5]"><Icon size={19} aria-hidden="true" /></span>
              <h3 className="mt-4 text-base font-semibold text-[#171412]">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-stone-600">{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-orange-200 bg-[#fff4e8] p-5 sm:p-7">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-700">Exclusive member access</p>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-[#171412]">Your Top100 profile is the starting point.</h2>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-stone-600">Use your experience, interests, and goals to shape a stronger search. Edutu brings the opportunities together and helps you move from “maybe” to “ready.”</p>
        <ul className="mt-5 grid gap-3 text-sm text-stone-700 sm:grid-cols-2">
          {['Personalized opportunity matching', 'Step-by-step application guidance', 'Feedback for your CV and materials', 'Deadline reminders and progress tracking'].map(item => <li key={item} className="flex items-center gap-2"><CheckCircle2 size={17} className="shrink-0 text-emerald-600" aria-hidden="true" />{item}</li>)}
        </ul>
      </section>

      <section className="rounded-2xl bg-[#171412] px-5 py-7 text-white sm:px-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-300">Ready when you are</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight !text-white">Start your next application with Edutu.</h2>
          </div>
          <a href="https://www.edutu.org" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-12 shrink-0 items-center justify-center gap-3 rounded-xl bg-white px-5 text-sm font-semibold text-[#171412] transition hover:bg-orange-50">
            Join Edutu <ArrowUpRight size={18} aria-hidden="true" />
          </a>
        </div>
      </section>
    </main>
  )
}
