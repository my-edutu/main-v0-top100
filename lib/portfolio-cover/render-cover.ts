import sharp from 'sharp'

import type { PortfolioCoverFields, PortfolioTailoring, PortfolioVariant } from './types'

type RenderInput = {
  portrait: Buffer
  memberName: string
  tailoring: PortfolioTailoring
  variant: PortfolioVariant
  fields: PortfolioCoverFields
}

function escapeXml(value: string) {
  return value.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[character] ?? character)
}

function textLines(value: string | undefined, max: number, limit: number) {
  if (!value?.trim()) return []
  const words = value.trim().split(/\s+/)
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    const next = line ? `${line} ${word}` : word
    if (next.length > max && line) {
      lines.push(line)
      line = word
    } else {
      line = next
    }
  }
  if (line) lines.push(line)
  return lines.slice(0, limit)
}

function titleCase(value: string) {
  return value.replace(/\b\w/g, character => character.toUpperCase())
}

function factMarkup(fields: PortfolioCoverFields) {
  const facts = [
    ['FIELD', fields.fieldOfStudy],
    ['COUNTRY', fields.country],
    ['CLASS', fields.degreeClass],
  ].filter(([, value]) => Boolean(value?.trim())) as [string, string][]

  return facts.slice(0, 3).map(([label, value], index) => {
    const x = 80 + index * 485
    return `<text x="${x}" y="1858" fill="#FDBA74" font-family="Arial,sans-serif" font-size="20" font-weight="800" letter-spacing="4">${escapeXml(label)}</text>
      <text x="${x}" y="1906" fill="#FFFFFF" font-family="Arial,sans-serif" font-size="32" font-weight="800">${escapeXml(value)}</text>`
  }).join('')
}

export async function renderPortfolioCover({ portrait, memberName, fields }: RenderInput) {
  const name = titleCase(memberName.trim() || 'Top100 Future Leader')
  const issueYear = fields.cohort?.trim() || '2026'
  const headline = textLines(fields.headline || "Africa's Future Leaders", 22, 3)
  const impact = textLines(fields.impactStatement || 'Recognising the people creating meaningful change across Africa.', 62, 3)
  const headlineStart = headline.length === 1 ? 1390 : headline.length === 2 ? 1300 : 1215
  const headlineSize = headline.some(line => line.length > 19) ? 94 : 116
  const headlineLeading = headlineSize + 8
  const impactStart = headlineStart + headline.length * headlineLeading + 38
  const portraitData = (await sharp(portrait)
    .resize(1600, 2000, { fit: 'cover', position: 'north' })
    .modulate({ saturation: 0.94, brightness: 0.98 })
    .png()
    .toBuffer()).toString('base64')
  const headlineMarkup = headline.map((line, index) => `<text x="80" y="${headlineStart + index * headlineLeading}" fill="#FFFFFF" font-family="Georgia,serif" font-size="${headlineSize}" font-weight="900" letter-spacing="-3" stroke="#FFFFFF" stroke-width="1">${escapeXml(line)}</text>`).join('')
  const impactMarkup = impact.map((line, index) => `<text x="84" y="${impactStart + index * 38}" fill="#FFFFFF" font-family="Arial,sans-serif" font-size="27" font-weight="700">${escapeXml(line)}</text>`).join('')

  const svg = `<svg width="1600" height="2000" viewBox="0 0 1600 2000" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="topShade" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#090A0C" stop-opacity=".74"/><stop offset="1" stop-color="#090A0C" stop-opacity="0"/></linearGradient>
      <linearGradient id="bottomShade" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#090A0C" stop-opacity="0"/><stop offset=".38" stop-color="#090A0C" stop-opacity=".48"/><stop offset="1" stop-color="#090A0C" stop-opacity=".98"/></linearGradient>
      <linearGradient id="brandOrange" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#F15A24"/><stop offset=".52" stop-color="#FF7A1A"/><stop offset="1" stop-color="#F9A51A"/></linearGradient>
    </defs>
    <rect width="1600" height="2000" fill="#111315"/>
    <image href="data:image/png;base64,${portraitData}" x="0" y="0" width="1600" height="2000" preserveAspectRatio="xMidYMid slice"/>
    <rect width="1600" height="620" fill="url(#topShade)"/>
    <rect y="650" width="1600" height="1350" fill="url(#bottomShade)"/>
    <rect x="48" y="48" width="1504" height="1904" fill="none" stroke="url(#brandOrange)" stroke-width="4"/>

    <rect x="625" y="0" width="350" height="118" fill="url(#brandOrange)"/>
    <text x="800" y="47" text-anchor="middle" fill="#171717" font-family="Arial,sans-serif" font-size="21" font-weight="900" letter-spacing="5">SPECIAL ISSUE</text>
    <text x="800" y="84" text-anchor="middle" fill="#171717" font-family="Arial,sans-serif" font-size="18" font-weight="800" letter-spacing="3">CLASS OF ${escapeXml(issueYear)}</text>

    <text x="64" y="282" fill="#FFFFFF" font-family="Georgia,serif" font-size="218" font-weight="900" letter-spacing="-11" stroke="#FFFFFF" stroke-width="2">TOP100</text>
    <circle cx="790" cy="123" r="20" fill="#F97316"/>
    <text x="74" y="346" fill="#FDBA74" font-family="Arial,sans-serif" font-size="25" font-weight="800" letter-spacing="9">AFRICA FUTURE LEADERS</text>
    <text x="1510" y="344" text-anchor="end" fill="#FFFFFF" font-family="Arial,sans-serif" font-size="19" font-weight="800" letter-spacing="3">VOL. 01 / ${escapeXml(issueYear)}</text>

    <rect x="1280" y="948" width="235" height="7" fill="url(#brandOrange)"/>
    <text x="1515" y="1000" text-anchor="end" fill="#FDBA74" font-family="Arial,sans-serif" font-size="20" font-weight="800" letter-spacing="4">AWARDEE PROFILE</text>
    <text x="1515" y="1056" text-anchor="end" fill="#FFFFFF" font-family="Georgia,serif" font-size="48" font-style="italic" font-weight="900">${escapeXml(name)}</text>
    ${fields.school ? `<text x="1515" y="1100" text-anchor="end" fill="#FFFFFF" font-family="Arial,sans-serif" font-size="25" font-weight="700">${escapeXml(fields.school)}</text>` : ''}

    ${headlineMarkup}
    ${impactMarkup}
    <rect x="80" y="${impactStart + impact.length * 38 + 28}" width="220" height="10" fill="url(#brandOrange)"/>
    <rect x="0" y="1730" width="1600" height="270" fill="#090A0C" fill-opacity=".82"/>
    <text x="80" y="1804" fill="#FDBA74" font-family="Arial,sans-serif" font-size="22" font-weight="900" letter-spacing="6">THE NEXT GENERATION OF IMPACT</text>
    ${factMarkup(fields)}
    <text x="1520" y="1960" text-anchor="end" fill="#FFFFFF" font-family="Arial,sans-serif" font-size="22" font-weight="900" letter-spacing="3">TOP100AFL.COM</text>
    <rect x="0" y="1990" width="1600" height="10" fill="url(#brandOrange)"/>
  </svg>`

  return sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer()
}
