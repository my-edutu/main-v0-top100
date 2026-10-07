'use client'

import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Clock3 } from 'lucide-react'

export type TimePreference = 'any' | 'morning' | 'afternoon' | 'evening'
export type AvailabilityPreference = { date: string; time: TimePreference }

const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const timeChoices: Array<{ value: TimePreference; label: string; hours: string }> = [
  { value: 'any', label: 'Any time', hours: 'Flexible' },
  { value: 'morning', label: 'Morning', hours: '09:00–12:00' },
  { value: 'afternoon', label: 'Afternoon', hours: '12:00–16:00' },
  { value: 'evening', label: 'Evening', hours: '16:00–19:00' },
]

export function encodeAvailability(values: AvailabilityPreference[]) {
  return values.map(({ date, time }) => `${date}|${time}`)
}

export function decodeAvailability(values: string[] | null | undefined): AvailabilityPreference[] {
  return (values ?? []).flatMap((value) => {
    const [date, time] = value.split('|')
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !timeChoices.some((choice) => choice.value === time)) return []
    return [{ date, time: time as TimePreference }]
  })
}

function localDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function shiftMonth(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1)
}

export function InterviewAvailabilityCalendar({
  values,
  onChange,
}: {
  values: AvailabilityPreference[]
  onChange: (values: AvailabilityPreference[]) => void
}) {
  const [month, setMonth] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const todayKey = localDateKey(new Date())
  const monthLabel = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(month)
  const cells = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1)
    const mondayOffset = (first.getDay() + 6) % 7
    const start = new Date(first.getFullYear(), first.getMonth(), first.getDate() - mondayOffset)
    return Array.from({ length: 42 }, (_, index) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + index))
  }, [month])
  const selected = new Map(values.map((value) => [value.date, value.time]))

  function toggleDate(date: Date) {
    const key = localDateKey(date)
    if (key < todayKey) return
    if (selected.has(key)) {
      onChange(values.filter((value) => value.date !== key))
      return
    }
    if (values.length >= 5) return
    const preference: AvailabilityPreference = { date: key, time: 'any' }
    onChange([...values, preference].sort((a, b) => a.date.localeCompare(b.date)))
  }

  function updateTime(date: string, time: TimePreference) {
    onChange(values.map((value) => value.date === date ? { ...value, time } : value))
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold">Choose up to five dates</h3>
          <p className="mt-1 text-sm text-neutral-600">Pick days that work for you. We’ll confirm a time with you.</p>
        </div>
        <span className="shrink-0 text-sm tabular-nums text-neutral-600">{values.length}/5</span>
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-3 sm:p-5">
        <div className="mb-3 flex items-center justify-between">
          <button type="button" aria-label="Previous month" disabled={month.getFullYear() === new Date().getFullYear() && month.getMonth() === new Date().getMonth()} onClick={() => setMonth((value) => shiftMonth(value, -1))} className="inline-flex size-11 items-center justify-center rounded-full border text-neutral-700 transition hover:bg-neutral-50 disabled:opacity-40">
            <ChevronLeft className="size-5" aria-hidden="true" />
          </button>
          <h4 aria-live="polite" className="font-medium">{monthLabel}</h4>
          <button type="button" aria-label="Next month" onClick={() => setMonth((value) => shiftMonth(value, 1))} className="inline-flex size-11 items-center justify-center rounded-full border text-neutral-700 transition hover:bg-neutral-50">
            <ChevronRight className="size-5" aria-hidden="true" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1" role="grid" aria-label={monthLabel}>
          {weekdays.map((day) => <div key={day} role="columnheader" className="py-2 text-center text-xs font-medium text-neutral-500">{day}</div>)}
          {cells.map((date) => {
            const key = localDateKey(date)
            const isCurrentMonth = date.getMonth() === month.getMonth()
            const isSelected = selected.has(key)
            const isPast = key < todayKey
            return (
              <div role="gridcell" key={key}>
                <button
                  type="button"
                  aria-label={new Intl.DateTimeFormat(undefined, { dateStyle: 'full' }).format(date)}
                  aria-pressed={isSelected}
                  disabled={isPast || (!isSelected && values.length >= 5)}
                  onClick={() => toggleDate(date)}
                  className={`mx-auto flex size-10 items-center justify-center rounded-full text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-600 focus-visible:ring-offset-2 ${isSelected ? 'bg-orange-600 font-semibold text-white' : isCurrentMonth ? 'text-neutral-900 hover:bg-orange-50' : 'text-neutral-400 hover:bg-neutral-50'} disabled:cursor-not-allowed disabled:opacity-35 sm:size-11`}
                >
                  {date.getDate()}
                </button>
              </div>
            )
          })}
        </div>
        <p className="mt-3 text-xs text-neutral-500">Times are shown in the time zone selected below. Past dates can’t be selected.</p>
      </div>

      {values.length ? (
        <div className="space-y-3">
          {values.map((value) => {
            const dateLabel = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date(`${value.date}T12:00:00`))
            return (
              <fieldset key={value.date} className="min-w-0 rounded-xl border border-neutral-200 p-3 sm:p-4">
                <legend className="px-1 text-sm font-medium">{dateLabel}</legend>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {timeChoices.map((choice) => (
                    <button key={choice.value} type="button" aria-pressed={value.time === choice.value} onClick={() => updateTime(value.date, choice.value)} className={`min-h-12 rounded-lg border px-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-600 ${value.time === choice.value ? 'border-orange-500 bg-orange-50 text-neutral-950' : 'border-neutral-200 text-neutral-700 hover:bg-neutral-50'}`}>
                      <span className="block text-sm font-medium">{choice.label}</span>
                      <span className="block text-xs text-neutral-500">{choice.hours}</span>
                    </button>
                  ))}
                </div>
              </fieldset>
            )
          })}
        </div>
      ) : (
        <div className="flex items-start gap-3 rounded-xl bg-neutral-50 p-4 text-sm text-neutral-600">
          <Clock3 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <p>No date preference? Leave this blank and the team will suggest a time.</p>
        </div>
      )}
    </div>
  )
}
