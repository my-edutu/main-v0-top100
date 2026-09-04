import sharp from 'sharp'

import type { PortfolioCoverFields, PortfolioTailoring, PortfolioVariant } from './types'

type RenderInput = {
  portrait: Buffer
  memberName: string
  tailoring: PortfolioTailoring
  variant: PortfolioVariant
  fields: PortfolioCoverFields
}

const variantTheme: Record<PortfolioVariant, { background: string; accent: string; text: string; kicker: string }> = {
  'executive-charcoal': { background: '#111315', accent: '#F3C623', text: '#FFFDF7', kicker: '#F9D96A' },
  'leadership-ivory': { background: '#F5F0E5', accent: '#B78900', text: '#171412', kicker: '#826600' },
}

function escapeXml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[character] ?? character)
}

function textLines(value: string | undefined, max = 54) {
  if (!value?.trim()) return []
  const words = value.trim().split(/\s+/)
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    const next = line ? `${line} ${word}` : word
    if (next.length > max && line) {
      lines.push(line)
      line = word
    } else line = next
  }
  if (line) lines.push(line)
  return lines.slice(0, 5)
}

function fieldRows(fields: PortfolioCoverFields, text: string, accent: string) {
  const rows = [
    ['SCHOOL', fields.school],
    ['CGPA', fields.cgpa],
    ['CLASS', fields.degreeClass],
    ['FIELD', fields.fieldOfStudy],
    ['COUNTRY', fields.country],
    ['COHORT', fields.cohort],
  ].filter(([, value]) => Boolean(value?.trim())) as [string, string][]

  return rows.map(([label, value], index) => {
    const x = index % 2 === 0 ? 80 : 820
    const y = 1550 + Math.floor(index / 2) * 76
    return `<text x="${x}" y="${y}" fill="${accent}" font-family="Arial,sans-serif" font-size="18" letter-spacing="3">${escapeXml(label)}</text><text x="${x}" y="${y + 30}" fill="${text}" font-family="Arial,sans-serif" font-size="24" font-weight="700">${escapeXml(value)}</text>`
  }).join('')
}

export async function renderPortfolioCover({ portrait, memberName, variant, fields }: RenderInput) {
  const theme = variantTheme[variant]
  const name = memberName.trim() || 'Top100 Future Leader'
  const headline = textLines(fields.headline, 37)
  const impact = textLines(fields.impactStatement, 75)
  const portraitData = (await sharp(portrait).resize(1600, 2000, { fit: 'cover', position: 'centre' }).png().toBuffer()).toString('base64')
  const headlineMarkup = headline.map((line, index) => `<text x="80" y="${1240 + index * 78}" fill="${theme.text}" font-family="Georgia,serif" font-size="${index === 0 ? 78 : 70}" font-weight="700">${escapeXml(line)}</text>`).join('')
  const impactMarkup = impact.map((line, index) => `<text x="80" y="${1430 + index * 30}" fill="${theme.text}" opacity=".88" font-family="Arial,sans-serif" font-size="22">${escapeXml(line)}</text>`).join('')
  const svg = `<svg width="1600" height="2000" viewBox="0 0 1600 2000" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="veil" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${theme.background}" stop-opacity=".08"/><stop offset=".58" stop-color="${theme.background}" stop-opacity=".12"/><stop offset="1" stop-color="${theme.background}" stop-opacity=".98"/></linearGradient>
      <linearGradient id="edge" x1="0" y1="0" x2="1" y2="0"><stop stop-color="${theme.accent}"/><stop offset="1" stop-color="${theme.accent}" stop-opacity="0"/></linearGradient>
    </defs>
    <rect width="1600" height="2000" fill="${theme.background}"/>
    <image href="data:image/png;base64,${portraitData}" x="0" y="0" width="1600" height="2000" preserveAspectRatio="xMidYMid slice"/>
    <rect width="1600" height="2000" fill="url(#veil)"/>
    <rect x="80" y="80" width="1440" height="1840" fill="none" stroke="${theme.accent}" stroke-opacity=".72" stroke-width="2"/>
    <text x="80" y="190" fill="${theme.text}" font-family="Georgia,serif" font-size="106" font-weight="700" letter-spacing="-3">TOP100</text>
    <circle cx="620" cy="151" r="14" fill="${theme.accent}"/>
    <text x="80" y="245" fill="${theme.kicker}" font-family="Arial,sans-serif" font-size="20" font-weight="700" letter-spacing="7">AFRICA FUTURE LEADERS</text>
    <text x="1520" y="180" text-anchor="end" fill="${theme.text}" font-family="Arial,sans-serif" font-size="18" letter-spacing="3">VOL. 01 / 2026</text>
    <text x="1520" y="245" text-anchor="end" fill="${theme.text}" font-family="Arial,sans-serif" font-size="24" font-weight="700">${escapeXml(name)}</text>
    <rect x="80" y="1120" width="740" height="5" fill="url(#edge)"/>
    ${headlineMarkup}
    ${impactMarkup}
    <text x="80" y="1510" fill="${theme.kicker}" font-family="Arial,sans-serif" font-size="17" letter-spacing="4">THE NEXT GENERATION OF IMPACT</text>
    ${fieldRows(fields, theme.text, theme.kicker)}
    <text x="1520" y="1900" text-anchor="end" fill="${theme.kicker}" font-family="Arial,sans-serif" font-size="16" letter-spacing="2">TOP100AFL.COM</text>
  </svg>`

  return sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer()
}
