'use client'
import { useEffect, useRef, useState } from 'react'
import { parseCommaItems } from '@/lib/talent/editor-state'
import { inputClass } from './ui'

/** Keep the typed string intact while focused; joining on every keypress moves
 * the caret and used to make commas/trailing spaces difficult to enter. */
export function CommaInput({ id, value, onChange, max, placeholder }: { id: string; value: string[]; onChange: (value: string[]) => void; max: number; placeholder: string }) {
  const [raw, setRaw] = useState(() => value.join(', '))
  const focused = useRef(false)
  useEffect(() => { if (!focused.current) setRaw(value.join(', ')) }, [value])
  return <div className="space-y-2"><input id={id} className={inputClass} value={raw} maxLength={max * 82} placeholder={placeholder} aria-describedby={`${id}-count`} aria-invalid={value.length > max || undefined}
    onFocus={() => { focused.current = true }} onBlur={() => { focused.current = false; setRaw(value.join(', ')) }}
    onChange={event => { setRaw(event.target.value); onChange(parseCommaItems(event.target.value)) }} />
    <p id={`${id}-count`} className={`text-xs ${value.length > max ? 'text-red-800' : 'text-stone-600'}`}>{value.length} of {max} items. Separate each one with a comma.{value.length > max ? ' Remove some items before saving.' : ''}</p>
  </div>
}
