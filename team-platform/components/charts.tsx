import { cn } from '@/lib/cn'

export function ActivityChart({
  data,
  showCommissions = true,
}: {
  data: Array<{ day: string; followups: number; commissions: number }>
  showCommissions?: boolean
}) {
  const max = Math.max(1, ...data.map((point) => point.followups), ...data.map((point) => point.commissions))
  return (
    <div>
      <div className="flex h-36 items-end gap-1.5 md:gap-2">
        {data.map((point) => {
          const followupHeight = Math.max(3, (point.followups / max) * 100)
          const commissionHeight = Math.max(2, (point.commissions / max) * 100)
          return (
            <div key={point.day} className="group relative flex h-full flex-1 flex-col justify-end gap-0.5">
              <div className="flex flex-1 items-end gap-0.5">
                <div
                  className="w-full rounded-t-[3px] bg-ember/85 transition group-hover:bg-ember"
                  style={{ height: `${followupHeight}%` }}
                  title={`${point.followups} follow-ups`}
                />
                {showCommissions ? (
                  <div
                    className="w-full rounded-t-[3px] bg-moss/45 transition group-hover:bg-moss/70"
                    style={{ height: `${commissionHeight}%` }}
                    title={`${point.commissions} commissions`}
                  />
                ) : null}
              </div>
              <span className="mt-2 block text-center text-[9px] text-muted">
                {new Date(`${point.day}T00:00:00`).toLocaleDateString('en-GB', { weekday: 'narrow' })}
              </span>
            </div>
          )
        })}
      </div>
      <div className="mt-3 flex items-center gap-4 text-[10px] text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm bg-ember" /> Follow-ups
        </span>
        {showCommissions ? (
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm bg-moss/50" /> Commissions
          </span>
        ) : null}
        <span className="ml-auto">Last 14 days</span>
      </div>
    </div>
  )
}

export function Ring({
  value,
  label,
  sublabel,
  size = 132,
  tone = 'ember',
}: {
  value: number
  label: string
  sublabel?: string
  size?: number
  tone?: 'ember' | 'moss' | 'cream'
}) {
  const clamped = Math.max(0, Math.min(100, value))
  const color = tone === 'moss' ? '#1F6B4A' : tone === 'cream' ? '#F6F2EA' : '#DE4B1F'
  return (
    <div
      className="relative flex shrink-0 items-center justify-center rounded-full"
      style={{
        width: size,
        height: size,
        background: `conic-gradient(${color} ${clamped * 3.6}deg, rgba(255,255,255,0.10) 0deg)`,
      }}
      role="img"
      aria-label={`${label}: ${clamped}%`}
    >
      <div
        className="flex flex-col items-center justify-center rounded-full bg-ink text-cream"
        style={{ width: size - 16, height: size - 16 }}
      >
        <span className="num text-2xl font-semibold tracking-tight">{clamped}%</span>
        <span className="mt-0.5 text-[9px] uppercase tracking-[0.14em] text-cream/45">{sublabel ?? label}</span>
      </div>
    </div>
  )
}

export function FunnelStep({
  label,
  value,
  total,
  tone = 'ember',
}: {
  label: string
  value: number
  total: number
  tone?: 'ember' | 'moss' | 'ink'
}) {
  const percent = total ? Math.round((value / total) * 100) : 0
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between text-xs">
        <span className="font-medium text-ink">{label}</span>
        <span className="num text-muted">
          {value.toLocaleString()} <span className="text-[10px]">· {percent}%</span>
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-ink/[0.06]">
        <div
          className={cn(
            'h-full rounded-full',
            tone === 'moss' ? 'bg-moss' : tone === 'ink' ? 'bg-ink' : 'bg-ember',
          )}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}

export function CountryBars({
  countries,
}: {
  countries: Array<{ country: string; awardees: number; paid: number }>
}) {
  const max = Math.max(1, ...countries.map((country) => country.awardees))
  return (
    <div className="space-y-3.5">
      {countries.map((country) => {
        const paidPercent = country.awardees ? Math.round((country.paid / country.awardees) * 100) : 0
        return (
          <div key={country.country}>
            <div className="mb-1 flex items-center justify-between gap-2 text-[11px]">
              <span className="truncate font-medium">{country.country}</span>
              <span className="num shrink-0 text-muted">
                {country.awardees} · {paidPercent}% paid
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-ink/[0.06]">
              <div className="h-full rounded-full bg-ink/70" style={{ width: `${(country.awardees / max) * 100}%` }}>
                <div className="h-full rounded-full bg-moss" style={{ width: `${paidPercent}%` }} />
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
