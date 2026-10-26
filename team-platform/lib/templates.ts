export const ALLOWED_TEMPLATE_VARIABLES = [
  'first_name',
  'name',
  'agent_name',
  'organisation',
  'award_name',
  'payment_link',
] as const

export function renderTemplate(
  body: string,
  vars: Partial<Record<(typeof ALLOWED_TEMPLATE_VARIABLES)[number], string>>,
) {
  return body.replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, (match, key: string) => {
    const normalized = key.toLowerCase()
    if (!(ALLOWED_TEMPLATE_VARIABLES as readonly string[]).includes(normalized)) {
      return match
    }
    return vars[normalized as (typeof ALLOWED_TEMPLATE_VARIABLES)[number]] ?? ''
  })
}

export function templateVariables(body: string) {
  const found = new Set<string>()
  for (const match of body.matchAll(/\{\{\s*([a-z_]+)\s*\}\}/gi)) {
    found.add(match[1].toLowerCase())
  }
  return [...found]
}

export function firstName(fullName: string) {
  return fullName.trim().split(/\s+/)[0] ?? fullName
}
