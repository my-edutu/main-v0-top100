import PortraitImage from "./PortraitImage"

import type { TeamMember } from "@/lib/impact-content"

type TeamRailProps = {
  members: readonly TeamMember[]
}

export default function TeamRail({ members }: TeamRailProps) {
  return (
    <div
      aria-label="Top100 team"
      data-team-rail="compact"
      role="list"
      className="-mx-4 grid auto-cols-[9rem] grid-flow-col gap-2.5 overflow-x-auto overscroll-x-contain px-4 pb-5 pt-2 [scrollbar-width:none] snap-x snap-mandatory touch-pan-x sm:-mx-6 sm:auto-cols-[10rem] sm:gap-3 sm:px-6 md:auto-cols-[11rem] lg:auto-cols-[12rem] [&::-webkit-scrollbar]:hidden"
    >
      {members.map((member) => {
        const cardContent = (
          <div className="relative h-full w-full">
            <div className="absolute inset-0 overflow-hidden bg-slate-900">
              <PortraitImage
                src={member.image}
                name={member.name}
                sizes="(max-width: 640px) 9rem, (max-width: 768px) 10rem, (max-width: 1024px) 11rem, 12rem"
                className="object-cover object-top transition-transform duration-500 group-hover:scale-[1.04] motion-reduce:transition-none"
              />
            </div>
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent"
            />
            <div className="absolute inset-x-0 bottom-0 space-y-1 p-3 text-left sm:p-3.5">
              <h3 className="text-sm font-semibold leading-tight text-[#fff] sm:text-[0.95rem]">
                {member.name}
              </h3>
              <p className="text-[0.58rem] font-semibold uppercase leading-tight tracking-[0.12em] text-orange-200 sm:text-[0.62rem]">
                {member.role}
              </p>
            </div>
          </div>
        )

        return (
          <article
            key={member.name}
            data-team-card={member.name}
            role="listitem"
            className="group relative aspect-[3/4] snap-start overflow-hidden rounded-xl border border-white/10 bg-slate-950 shadow-[0_10px_28px_rgba(2,6,23,0.18)] transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-[0_18px_38px_rgba(2,6,23,0.28)] motion-reduce:transform-none"
          >
            {member.linkedIn ? (
              <a
                href={member.linkedIn}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${member.name} on LinkedIn (opens in a new tab)`}
                className="block h-full rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-600 focus-visible:ring-offset-2"
              >
                {cardContent}
              </a>
            ) : (
              cardContent
            )}
          </article>
        )
      })}
    </div>
  )
}
