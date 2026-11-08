import type { ReactNode } from 'react'
export const inputClass = 'min-h-11 w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-base text-stone-900 outline-none placeholder:text-stone-400 focus:border-orange-600 focus:ring-2 focus:ring-orange-100 disabled:opacity-60'
export const primaryClass = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-700 to-amber-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50'
export const secondaryClass = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm font-semibold text-stone-800 transition hover:border-orange-500 hover:bg-orange-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-600 focus-visible:ring-offset-2 disabled:opacity-50'
export function Field({ label, hint, children, htmlFor }: { label: string; hint?: string; children: ReactNode; htmlFor: string }) {
  return <div className="space-y-2"><label htmlFor={htmlFor} className="block text-sm font-semibold text-stone-800">{label}</label>{children}{hint && <p className="text-xs leading-5 text-stone-600">{hint}</p>}</div>
}
export function TalentNotice({ children, error = false, kind }: { children: ReactNode; error?: boolean; kind?: 'error' | 'info' }) {
  const isError = error || kind === 'error'
  return <div role={isError ? 'alert' : 'status'} className={`rounded-xl border px-4 py-3 text-sm leading-6 ${isError ? 'border-red-200 bg-red-50 text-red-900' : 'border-orange-200 bg-orange-50 text-stone-800'}`}>{children}</div>
}
