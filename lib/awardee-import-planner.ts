export type AwardeeImportRow = Record<string, unknown> & {
  name: string
  slug: string
  email: string | null
}

export type ExistingAwardeeIdentity = {
  id: string
  slug: string | null
  email: string | null
}

function normalizeEmail(value: string | null | undefined): string | null {
  const normalized = value?.trim().toLowerCase() ?? ''
  return normalized || null
}

function nextSlug(base: string, used: Set<string>): string {
  const safeBase = base.trim() || 'awardee'
  if (!used.has(safeBase)) {
    used.add(safeBase)
    return safeBase
  }

  let suffix = 2
  while (used.has(`${safeBase}-${suffix}`)) suffix += 1
  const slug = `${safeBase}-${suffix}`
  used.add(slug)
  return slug
}

export function planAwardeeImport(
  incoming: AwardeeImportRow[],
  existing: ExistingAwardeeIdentity[],
): { toInsert: AwardeeImportRow[]; toUpdate: AwardeeImportRow[] } {
  const usedSlugs = new Set(existing.flatMap((row) => row.slug ? [row.slug] : []))
  const existingByEmail = new Map(
    existing.flatMap((row) => {
      const email = normalizeEmail(row.email)
      return email ? [[email, row] as const] : []
    }),
  )
  const incomingEmails = new Set<string>()
  const toInsert: AwardeeImportRow[] = []
  const toUpdate: AwardeeImportRow[] = []

  for (const source of incoming) {
    const email = normalizeEmail(source.email)
    if (!email) {
      throw new Error(`Every imported awardee needs an email: ${source.name}`)
    }
    if (email && incomingEmails.has(email)) {
      throw new Error(`Duplicate email in spreadsheet: ${email}`)
    }
    if (email) incomingEmails.add(email)

    const row = { ...source, email }
    const match = email ? existingByEmail.get(email) : undefined

    if (match) {
      toUpdate.push({
        ...row,
        id: match.id,
        slug: match.slug || nextSlug(row.slug, usedSlugs),
      })
      continue
    }

    const insert: AwardeeImportRow = { ...row, slug: nextSlug(row.slug, usedSlugs) }
    delete (insert as Record<string, unknown>).id
    toInsert.push(insert)
  }

  return { toInsert, toUpdate }
}
