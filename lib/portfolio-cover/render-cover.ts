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

async function renderNameplate(memberName: string) {
  const name = Array.from(memberName.normalize('NFC').trim().replace(/\s+/gu, ' ') || 'Africa Future Leader').slice(0, 120).join('')
  // Load the shipped font explicitly: minimal production images do not have
  // Arial or a system sans-serif fallback, which rendered names as square glyphs.
  const text = await sharp({
    text: {
      text: wrapName(name).map(escapeXml).join('\n'),
      font: 'Noto Sans Bold 40',
      fontfile: path.join(process.cwd(), 'public', 'portfolio-cover', 'fonts', 'NotoSans-Bold.ttf'),
      align: 'centre',
      rgba: true,
      dpi: 72,
    },
  }).png().toBuffer()
  // Fit actual glyph pixels, rather than estimating widths from character count.
  const fitted = await sharp(text)
    .resize({ width: NAME_TEXT_WIDTH, height: NAMEPLATE.height - 24, fit: 'inside', withoutEnlargement: true })
    .png()
    .toBuffer({ resolveWithObject: true })
  return sharp({ create: { width: NAMEPLATE.width, height: NAMEPLATE.height, channels: 4, background: '#fdf9b4' } })
    .composite([{
      input: fitted.data,
      left: Math.floor((NAMEPLATE.width - fitted.info.width) / 2),
      top: Math.floor((NAMEPLATE.height - fitted.info.height) / 2),
    }])
    .png()
    .toBuffer()
}

async function readTemplate() {
  return fs.readFile(path.join(process.cwd(), 'public', 'portfolio-cover', 'afl-2026-template.png'))
}

export async function renderPortfolioCover({ portrait, memberName }: RenderInput) {
  const [template, photo, nameplate] = await Promise.all([
    readTemplate(),
    sharp(portrait, { failOn: 'error' })
      .rotate()
      .resize(PHOTO_AREA.width, PHOTO_AREA.height, { fit: 'cover', position: 'centre' })
      .png()
      .toBuffer(),
    renderNameplate(memberName),
  ])

  return sharp(template)
    .resize(COVER_WIDTH, COVER_HEIGHT, { fit: 'fill' })
    .composite([
      { input: photo, left: PHOTO_AREA.left, top: PHOTO_AREA.top },
      { input: nameplate, left: NAMEPLATE.left, top: NAMEPLATE.top },
    ])
    .png({ compressionLevel: 9 })
    .toBuffer()
}
