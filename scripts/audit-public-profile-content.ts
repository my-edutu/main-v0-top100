/** Read-only content coverage report. Input must be a public-field-only snapshot. */
import { readFile, writeFile } from 'node:fs/promises'
import { buildProfileContent } from '../lib/seo/profile-content'

async function main() {
  const argument = (key: string) => process.argv[process.argv.indexOf(key) + 1]
  if (!process.argv.includes('--input') || !process.argv.includes('--output')) throw new Error('Use --input <public-snapshot.json> --output <report.json>')
  const rows = JSON.parse(await readFile(argument('--input'), 'utf8')) as Parameters<typeof buildProfileContent>[0][]
  const profiles = rows.filter(row => row.is_public === true).map(row => {
    const content = buildProfileContent(row)
    const original = (row.bio || '').replace(/\r\n?/g, '\n')
    const paragraphs = content.sections.flatMap(section => section.paragraphs)
    // Every published narrative paragraph must be an unchanged source span.
    if (paragraphs.some(paragraph => !original.includes(paragraph))) throw new Error(`Unsupported narrative in ${row.slug}`)
    for (const paragraph of original.split(/\n\s*\n/).map(value => value.trim()).filter(Boolean)) {
      const colon = paragraph.indexOf(':')
      const body = colon >= 0 ? paragraph.slice(colon + 1).trim() : paragraph
      if (!paragraphs.includes(paragraph) && !paragraphs.includes(body)) throw new Error(`Lost biography text in ${row.slug}`)
    }
    return {
      slug: row.slug,
      name: row.name,
      originalBiography: row.bio || '',
      publishedBiography: content.biography,
      title: content.title,
      description: content.description,
      sources: content.details.map(detail => ({ field: detail.source, value: detail.value })),
      sectionCount: content.sections.length,
      structured: content.sections.some(section => section.heading),
      reviewFlags: content.reviewFlags,
    }
  })
  const flags: Record<string, number> = {}
  for (const profile of profiles) for (const flag of profile.reviewFlags) flags[flag] = (flags[flag] || 0) + 1
  const summary = {
    publicProfiles: profiles.length,
    excludedPrivateProfiles: rows.length - profiles.length,
    biographiesWithFactualIntroductions: profiles.filter(profile => profile.publishedBiography !== profile.originalBiography && !profile.reviewFlags.includes('missing-real-name')).length,
    missingBiographiesGivenFactBasedText: profiles.filter(profile => profile.reviewFlags.includes('missing-biography') && profile.publishedBiography).length,
    formBiographiesStructured: profiles.filter(profile => profile.structured).length,
    originalNarrativesPreserved: profiles.length,
    reviewFlags: flags,
  }
  await writeFile(argument('--output'), JSON.stringify({ summary, profiles }, null, 2), { mode: 0o600 })
  console.log(JSON.stringify(summary, null, 2))
}
main().catch(error => { console.error(error.message); process.exitCode = 1 })
