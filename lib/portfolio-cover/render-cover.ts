import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

import type { PortfolioCoverFields } from './types'

type RenderInput = {
  portrait: Buffer
  memberName: string
  fields: PortfolioCoverFields
}

const COVER_WIDTH = 1080
const COVER_HEIGHT = 1350
const PHOTO_AREA = { left: 206, top: 280, width: 668, height: 666 }
const NAMEPLATE = { left: 266, top: 873, width: 548, height: 91 }

function escapeXml(value: string) {
  return value.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[character] ?? character)
}

function renderNameplate(memberName: string) {
  const name = (memberName.trim() || 'Africa Future Leader').slice(0, 120)
  const fontSize = Math.max(22, Math.min(40, 490 / (name.length * 0.59)))
  return Buffer.from(`<svg width="${COVER_WIDTH}" height="${COVER_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
    <rect x="${NAMEPLATE.left}" y="${NAMEPLATE.top}" width="${NAMEPLATE.width}" height="${NAMEPLATE.height}" fill="#fdf9b4" />
    <text x="540" y="929" text-anchor="middle" dominant-baseline="middle" fill="#090909" font-family="Arial,sans-serif" font-size="${fontSize}" font-weight="700">${escapeXml(name)}</text>
  </svg>`)
}

async function readTemplate() {
  return fs.readFile(path.join(process.cwd(), 'public', 'portfolio-cover', 'afl-2026-template.png'))
}

export async function renderPortfolioCover({ portrait, memberName }: RenderInput) {
  const [template, photo] = await Promise.all([
    readTemplate(),
    sharp(portrait, { failOn: 'error' })
      .rotate()
      .resize(PHOTO_AREA.width, PHOTO_AREA.height, { fit: 'cover', position: 'centre' })
      .png()
      .toBuffer(),
  ])

  return sharp(template)
    .resize(COVER_WIDTH, COVER_HEIGHT, { fit: 'fill' })
    .composite([
      { input: photo, left: PHOTO_AREA.left, top: PHOTO_AREA.top },
      { input: renderNameplate(memberName) },
    ])
    .png({ compressionLevel: 9 })
    .toBuffer()
}
