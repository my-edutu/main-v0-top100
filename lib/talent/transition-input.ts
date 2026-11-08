import { TalentInputError, isSafePublicUrl } from './contracts'
export function boundedText(value: unknown,label: string,max=2000,min=0): string {
  if (typeof value !== 'string' || value.trim().length<min || value.trim().length>max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)) throw new TalentInputError(`${label} must be between ${min} and ${max} characters.`)
  return value.trim()
}
export function choice(value:unknown,allowed:readonly string[],label='Action'):string {
  if (typeof value!=='string' || !allowed.includes(value)) throw new TalentInputError(`Choose a valid ${label.toLowerCase()}.`)
  return value
}
export function publicEvidenceUrl(value:unknown):string {
  const url=boundedText(value,'Evidence link',500)
  if (url && !isSafePublicUrl(url)) throw new TalentInputError('Use a public https evidence link without embedded credentials.')
  return url
}
