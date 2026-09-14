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
    return `<text x="${x}" y="1870" fill="#FDBA74" font-family="Arial,sans-serif" font-size="17" font-weight="700" letter-spacing="4">${escapeXml(label)}</text>
      <text x="${x}" y="1910" fill="#FFFDF7" font-family="Arial,sans-serif" font-size="27" font-weight="700">${escapeXml(value)}</text>`
  }).join('')
}

export async function renderPortfolioCover({ portrait, memberName, fields }: RenderInput) {
  const name = titleCase(memberName.trim() || 'Top100 Future Leader')
  const issueYear = fields.cohort?.trim() || '2026'
  const headline = textLines(fields.headline || "Africa's Future Leaders", 24, 3)
  const impact = textLines(fields.impactStatement || 'Recognising the people creating meaningful change across Africa.', 68, 3)
  const headlineStart = headline.length === 1 ? 1420 : headline.length === 2 ? 1335 : 1255
  const headlineSize = headline.some(line => line.length > 20) ? 92 : 112
  const impactStart = headlineStart + headline.length * 112 + 34
  const portraitData = (await sharp(portrait)
    .resize(1600, 2000, { fit: 'cover', position: 'centre' })
    .modulate({ saturation: 0.92, brightness: 0.96 })
    .png()
    .toBuffer()).toString('base64')
  const headlineMarkup = headline.map((line, index) => `<text x="80" y="${headlineStart + index * 112}" fill="#FFFDF7" font-family="Georgia,serif" font-size="${headlineSize}" font-weight="700" letter-spacing="-2">${escapeXml(line)}</text>`).join('')
  const impactMarkup = impact.map((line, index) => `<text x="84" y="${impactStart + index * 35}" fill="#FFFDF7" opacity=".94" font-family="Arial,sans-serif" font-size="25" font-weight="600">${escapeXml(line)}</text>`).join('')

  const svg = `<svg width="1600" height="2000" viewBox="0 0 1600 2000" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="topShade" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#090A0C" stop-opacity=".74"/><stop offset="1" stop-color="#090A0C" stop-opacity="0"/></linearGradient>
      <linearGradient id="bottomShade" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#090A0C" stop-opacity="0"/><stop offset=".55" stop-color="#090A0C" stop-opacity=".3"/><stop offset="1" stop-color="#090A0C" stop-opacity=".96"/></linearGradient>
    </defs>
    <rect width="1600" height="2000" fill="#111315"/>
    <image href="data:image/png;base64,${portraitData}" x="0" y="0" width="1600" height="2000" preserveAspectRatio="xMidYMid slice"/>
    <rect width="1600" height="620" fill="url(#topShade)"/>
    <rect y="720" width="1600" height="1280" fill="url(#bottomShade)"/>
    <rect x="52" y="52" width="1496" height="1896" fill="none" stroke="#F97316" stroke-opacity=".8" stroke-width="3"/>

    <rect x="635" y="0" width="330" height="112" fill="#F97316"/>
    <text x="800" y="43" text-anchor="middle" fill="#171717" font-family="Arial,sans-serif" font-size="20" font-weight="700" letter-spacing="5">SPECIAL ISSUE</text>
    <text x="800" y="78" text-anchor="middle" fill="#171717" font-family="Arial,sans-serif" font-size="17" font-weight="700" letter-spacing="3">CLASS OF ${escapeXml(issueYear)}</text>

    <text x="70" y="268" fill="#FFFDF7" font-family="Georgia,serif" font-size="194" font-weight="700" letter-spacing="-9">TOP100</text>
    <circle cx="713" cy="135" r="18" fill="#F97316"/>
    <text x="80" y="326" fill="#FDBA74" font-family="Arial,sans-serif" font-size="24" font-weight="700" letter-spacing="9">AFRICA FUTURE LEADERS</text>
    <text x="1510" y="322" text-anchor="end" fill="#FFFDF7" font-family="Arial,sans-serif" font-size="18" font-weight="700" letter-spacing="3">VOL. 01 / ${escapeXml(issueYear)}</text>

    <text x="1515" y="1000" text-anchor="end" fill="#FDBA74" font-family="Arial,sans-serif" font-size="18" font-weight="700" letter-spacing="4">AWARDEE PROFILE</text>
    <text x="1515" y="1048" text-anchor="end" fill="#FFFDF7" font-family="Georgia,serif" font-size="38" font-style="italic" font-weight="700">${escapeXml(name)}</text>
    ${fields.school ? `<text x="1515" y="1086" text-anchor="end" fill="#FFFDF7" opacity=".9" font-family="Arial,sans-serif" font-size="22">${escapeXml(fields.school)}</text>` : ''}

    ${headlineMarkup}
    ${impactMarkup}
    <rect x="80" y="${impactStart + impact.length * 35 + 28}" width="180" height="8" fill="#F97316"/>
    <text x="80" y="1810" fill="#FDBA74" font-family="Arial,sans-serif" font-size="19" font-weight="700" letter-spacing="5">THE NEXT GENERATION OF IMPACT</text>
    ${factMarkup(fields)}
    <text x="1520" y="1910" text-anchor="end" fill="#FFFDF7" font-family="Arial,sans-serif" font-size="18" font-weight="700" letter-spacing="2">TOP100AFL.COM</text>
  </svg>`

  return sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer()
}
