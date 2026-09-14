import fs from 'node:fs/promises'
import path from 'node:path'
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

function titleCase(value: string) {
  return value.replace(/\b\w/g, character => character.toUpperCase())
}

async function readTemplate(name: string) {
  return fs.readFile(path.join(process.cwd(), 'public', 'portfolio-cover', name))
}

function profileOverlay(memberName: string, fields: PortfolioCoverFields) {
  const name = titleCase(memberName.trim() || 'Top100 Future Leader')
  const field = fields.fieldOfStudy?.trim() || 'Africa Future Leader'
  const school = fields.school?.trim() || ''
  const svg = `<svg width="1600" height="2000" viewBox="0 0 1600 2000" xmlns="http://www.w3.org/2000/svg">
    <text x="1110" y="1010" fill="#FFFFFF" font-family="Arial,sans-serif" font-size="56" font-weight="900" letter-spacing="1">${escapeXml(name.toUpperCase())}</text>
    <text x="1110" y="1070" fill="#FFB84D" font-family="Arial,sans-serif" font-size="34" font-weight="800">${escapeXml(field.toUpperCase())}</text>
    ${school ? `<text x="1110" y="1125" fill="#FFFFFF" font-family="Arial,sans-serif" font-size="32" font-weight="700">${escapeXml(school.toUpperCase())}</text>` : ''}
  </svg>`
  return Buffer.from(svg)
}

export async function renderPortfolioCover({ portrait, memberName, fields }: RenderInput) {
  const [background, foreground] = await Promise.all([
    readTemplate('template-background.png'),
    readTemplate('template-foreground.png'),
  ])
  const subject = await sharp(portrait)
    .resize(1600, 2000, { fit: 'contain', position: 'centre', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .modulate({ saturation: 0.96, brightness: 0.99 })
    .png()
    .toBuffer()
  const dynamicProfile = await sharp(profileOverlay(memberName, fields)).png().toBuffer()

  return sharp(background)
    .resize(1600, 2000, { fit: 'fill' })
    .composite([
      { input: subject },
      { input: foreground },
      { input: dynamicProfile },
    ])
    .png({ compressionLevel: 9 })
    .toBuffer()
}
