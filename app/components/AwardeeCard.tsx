import { memo } from "react"
import { Badge } from "@/components/ui/badge"
import { AvatarSVG, flagEmoji, initials } from "@/lib/avatars"

export type Awardee = {
  id: string
  name: string
  country: string
  category: string
  year: number
  bio30?: string
  photo_url?: string
  featured?: boolean
}

type AwardeeCardProps = {
  awardee: Awardee
}

const AwardeeCardComponent = ({ awardee }: AwardeeCardProps) => {


  return (
    <article
      className="group relative flex h-full flex-col gap-4 rounded-2xl border border-zinc-800/80 bg-zinc-950/60 p-6 shadow-sm transition hover:border-orange-400/60 hover:shadow-lg focus-within:border-orange-400/60 focus-within:shadow-lg"
      style={{ contentVisibility: "auto", containIntrinsicSize: "280px" }}
      tabIndex={-1}
    >
      <div className="flex items-start gap-4">
        <span className="inline-flex shrink-0 items-center justify-center rounded-full border border-white/5 bg-white/10 p-1">
          <AvatarSVG
            name={awardee.name}
            size={64}
            className="h-12 w-12 lg:h-16 lg:w-16"
            style={{ height: "100%", width: "100%" }}
          />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-semibold text-white" id={`awardee-${awardee.id}`}>
            {awardee.name}
          </h3>
          <p className="mt-1 flex items-center gap-2 text-sm text-zinc-300">
            <span className="text-sm text-zinc-300">{awardee.country}</span>
          </p>
          <Badge
            variant="secondary"
            className="mt-3 w-fit rounded-full bg-orange-500/20 px-3 py-1 text-xs font-medium uppercase tracking-wide text-orange-200"
          >
            {awardee.category}
          </Badge>
        </div>
      </div>
      <span className="sr-only">Awarded in {awardee.year}</span>
    </article>
  )
}

export const AwardeeCard = memo(AwardeeCardComponent)
AwardeeCard.displayName = "AwardeeCard"
