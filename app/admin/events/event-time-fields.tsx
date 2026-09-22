'use client'

import TimePicker from 'react-time-picker'
import { CalendarDays, Clock3 } from 'lucide-react'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PROGRAMME_SESSION_MINUTES } from '@/lib/events/programme'

export type ProgrammeFormDates = {
  startAt: string
  endAt: string
}

export function mergeDateAndTime(dateValue: string, timeValue: string): string {
  return dateValue && timeValue ? `${dateValue}T${timeValue}` : ''
}

export function validateProgrammeForm({ startAt, endAt }: ProgrammeFormDates): { ok: true } | { ok: false; message: string } {
  if (!startAt || !endAt) return { ok: false, message: 'Start and end time are required.' }
  const start = Date.parse(startAt)
  const end = Date.parse(endAt)
  if (!Number.isFinite(start) || !Number.isFinite(end)) return { ok: false, message: 'Enter a valid date and time.' }
  if (end <= start) return { ok: false, message: 'End time must be after the start time.' }
  if (end - start > PROGRAMME_SESSION_MINUTES * 60 * 1000) {
    return { ok: false, message: `Programme sessions cannot exceed ${PROGRAMME_SESSION_MINUTES} minutes.` }
  }
  return { ok: true }
}

type EventTimeFieldsProps = {
  dateValue: string
  timeValue: string
  durationMinutes: number
  timezone: string
  onDateChange: (value: string) => void
  onTimeChange: (value: string) => void
  onDurationChange: (value: number) => void
}

export function EventTimeFields({
  dateValue,
  timeValue,
  durationMinutes,
  timezone,
  onDateChange,
  onTimeChange,
  onDurationChange,
}: EventTimeFieldsProps) {
  return (
    <fieldset className="space-y-4 rounded-2xl border border-white/10 bg-zinc-900/60 p-4">
      <legend className="px-1 text-sm font-semibold text-zinc-200">Programme schedule</legend>
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="grid gap-2">
          <Label htmlFor="programme-date" className="text-xs font-medium text-zinc-400">Date</Label>
          <div className="relative">
            <CalendarDays aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-orange-300" />
            <Input
              id="programme-date"
              type="date"
              value={dateValue}
              onChange={(event) => onDateChange(event.target.value)}
              className="h-11 bg-zinc-950 pl-10 text-white [color-scheme:dark]"
            />
          </div>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="programme-time" className="text-xs font-medium text-zinc-400">Start time · {timezone}</Label>
          <div className="relative programme-time-picker">
            <Clock3 aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-orange-300" />
            <TimePicker
              id="programme-time"
              value={timeValue || null}
              onChange={(value) => onTimeChange(value ?? '')}
              disableClock={false}
              clearIcon={null}
              clockIcon={null}
              format="HH:mm"
              className="h-11 w-full rounded-md border border-zinc-800 bg-zinc-950 pl-9 pr-2 text-white"
              aria-label="Programme start time"
            />
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-3">
        <div>
          <p className="text-sm font-medium text-white">Session duration</p>
          <p className="text-xs text-zinc-500">All October programme sessions are capped at 60 minutes.</p>
        </div>
        <label className="flex items-center gap-2 text-sm text-zinc-300">
          <input
            type="number"
            min={1}
            max={PROGRAMME_SESSION_MINUTES}
            value={durationMinutes}
            onChange={(event) => onDurationChange(Number(event.target.value))}
            className="h-10 w-20 rounded-md border border-zinc-800 bg-zinc-950 px-3 text-right text-white"
            aria-label="Session duration in minutes"
          />
          minutes
        </label>
      </div>
    </fieldset>
  )
}
