import { RouteSection } from '../../_components/route-section'

export default function Project100ScholarshipPage() {
  return (
    <RouteSection
      title="Project100 Scholarship · 2026 edition"
      description="A future-focused scholarship for Africa’s next generation of leaders."
    >
      <section className="rounded-[20px] border border-[#E7DDCF] bg-[#FFF8ED] p-6 sm:p-8" aria-labelledby="project100-coming-soon-title">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#9A3412]">Project100 Scholarship</p>
        <h2 id="project100-coming-soon-title" className="mt-3 text-3xl font-semibold tracking-tight text-[#171412]">Coming soon</h2>
        <p className="mt-3 max-w-xl text-base leading-7 text-[#625B52]">
          The 2026 edition is being prepared. Applications for the 2027 cycle are expected to open in November–December.
        </p>
        <div className="mt-6 rounded-[16px] border border-[#E7DDCF] bg-white px-4 py-3 text-sm font-medium text-[#625B52]">
          We’ll share the application dates and next steps here when they are confirmed.
        </div>
      </section>
    </RouteSection>
  )
}
