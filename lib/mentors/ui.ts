export const fieldClass = 'min-h-11 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-base text-stone-950 focus-visible:outline-2 focus-visible:outline-orange-600'
export const primary = 'inline-flex min-h-11 items-center justify-center rounded-full bg-[#ffdf45] px-5 py-2 text-sm font-semibold text-[#171717] hover:bg-[#ffd321] disabled:cursor-wait disabled:opacity-60'
export const secondary = 'inline-flex min-h-11 items-center justify-center rounded-full border border-stone-300 bg-white px-5 py-2 text-sm font-semibold text-[#171717] hover:bg-stone-100 disabled:cursor-wait disabled:opacity-60'

export const panel = 'rounded-2xl border border-stone-200 bg-white p-5 sm:p-7'

export function sessionTime(value: string) {
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC',
  }).format(new Date(value)) + ' UTC'
}
