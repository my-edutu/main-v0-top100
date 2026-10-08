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
const NAME_TEXT_WIDTH = NAMEPLATE.width - 58
const MAX_NAME_LINE_LENGTH = 30

function escapeXml(value: string) {
  return value.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[character] ?? character)
}

function splitLongWord(word: string) {
  const characters = Array.from(word)
  const chunks: string[] = []
  for (let index = 0; index < characters.length; index += MAX_NAME_LINE_LENGTH) {
    chunks.push(characters.slice(index, index + MAX_NAME_LINE_LENGTH).join(''))
  }
  return chunks
}

function wrapName(name: string) {
  const lines: string[] = []
  let line = ''

  for (const word of name.split(/\s+/u).filter(Boolean).flatMap(splitLongWord)) {
    const next = line ? `${line} ${word}` : word
    if (Array.from(next).length <= MAX_NAME_LINE_LENGTH) {
      line = next
    } else {
      if (line) lines.push(line)
      line = word
    }
  }

  if (line) lines.push(line)
  return lines.length ? lines : ['Africa Future Leader']
}

function characterWidthInEm(character: string) {
  if (/\p{Mark}/u.test(character)) return 0
  if (/\s/u.test(character)) return 0.32
  if (/[ilI1|!.,:;'`]/u.test(character)) return 0.3
  if (/[MW@%&]/u.test(character)) return 0.9
  if (/[A-Z]/u.test(character)) return 0.66
  if (/[a-z]/u.test(character)) return 0.54
  if (/[0-9]/u.test(character)) return 0.56
  return 1
}

function measureNameInEm(line: string) {
  return Array.from(line).reduce((width, character) => width + characterWidthInEm(character), 0)
}

function renderNameplate(memberName: string) {
  const name = Array.from(memberName.trim().replace(/\s+/gu, ' ') || 'Africa Future Leader').slice(0, 120).join('')
  const lines = wrapName(name)
  const widestLineInEm = Math.max(...lines.map(measureNameInEm))
  const fontSize = Math.max(16, Math.min(40, Math.floor(NAME_TEXT_WIDTH / (widestLineInEm * 1.03))))
  const lineHeight = fontSize * 1.15
  const firstLineY = NAMEPLATE.top + NAMEPLATE.height / 2 - ((lines.length - 1) * lineHeight) / 2
  const text = lines.map((line, index) => {
    const measuredWidth = Math.min(NAME_TEXT_WIDTH, measureNameInEm(line) * fontSize)
    const y = (firstLineY + index * lineHeight).toFixed(2)
    return `<tspan x="540" y="${y}" textLength="${measuredWidth.toFixed(2)}" lengthAdjust="spacingAndGlyphs">${escapeXml(line)}</tspan>`
  }).join('')

  return Buffer.from(`<svg width="${COVER_WIDTH}" height="${COVER_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
    <rect x="${NAMEPLATE.left}" y="${NAMEPLATE.top}" width="${NAMEPLATE.width}" height="${NAMEPLATE.height}" fill="#fdf9b4" />
    <text text-anchor="middle" dominant-baseline="middle" fill="#090909" font-family="Arial,sans-serif" font-size="${fontSize}" font-weight="700">${text}</text>
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
