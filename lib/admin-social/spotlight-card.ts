import path from 'node:path'
import sharp, { type OverlayOptions } from 'sharp'
import type { PublicAwardee } from './types'

export type SpotlightCardProfile = Pick<
  PublicAwardee,
  'name' | 'headline' | 'country' | 'year'
> &
  Partial<Pick<PublicAwardee, 'fieldOfStudy'>>

const WIDTH = 1080
const HEIGHT = 1350
const MARGIN = 64
const CONTENT = WIDTH - MARGIN * 2
const INK = '#211B18'
const PAPER = '#FFF6E7'
const ORANGE = '#F9A34E'
const MATTE = '#312823'
const FONT = path.join(
  process.cwd(),
  'public/portfolio-cover/fonts/NotoSans-Bold.ttf',
)
const LOGO = path.join(process.cwd(), 'public/icons/top100-africa-192.png')

const escape = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (char) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&apos;',
      })[char]!,
  )

function block(
  width: number,
  height: number,
  background: string,
  left: number,
  top: number,
): OverlayOptions {
  return {
    input: { create: { width, height, channels: 4, background } },
    left,
    top,
  }
}

async function lettering(
  value: string,
  size: number,
  color: string,
  width: number,
  height: number,
) {
  const safe = escape(
    value
      .replace(/[\u0000-\u001f\u007f]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim(),
  )
  const glyphs = await sharp({
    text: {
      text: `<span foreground="${color}">${safe}</span>`,
      font: `Noto Sans Bold ${size}`,
      fontfile: FONT,
      width,
      wrap: 'word-char',
      rgba: true,
      dpi: 72,
    },
  })
    .png()
    .toBuffer()
  return sharp(glyphs)
    .resize({ width, height, fit: 'inside', withoutEnlargement: true })
    .png()
    .toBuffer({ resolveWithObject: true })
}

export async function renderSpotlightCard(
  photo: Buffer | null,
  profile: SpotlightCardProfile,
) {
  const portraitHeight = 650
  const portraitTop = 222
  const headline = [profile.headline, profile.fieldOfStudy]
    .find((value) => value?.trim())
    ?.trim()
  const country = [profile.country?.trim(), profile.year]
    .filter(Boolean)
    .join('  ·  ')
  const [picture, logo, series, subtitle, name, brandTop, brandBottom, footer] =
    await Promise.all([
      photo &&
        sharp(photo, { limitInputPixels: 40_000_000, failOn: 'error' })
          .rotate()
          .resize(CONTENT, portraitHeight, {
            fit: 'contain',
            background: MATTE,
          })
          .flatten({ background: MATTE })
          .png()
          .toBuffer(),
      sharp(LOGO).resize(62, 62).png().toBuffer(),
      lettering('AFL Spotlight', 59, INK, 580, 72),
      lettering('BEYOND RECOGNITION', 24, '#713510', 520, 36),
      lettering(
        profile.name.trim() || 'Awardee full name',
        68,
        INK,
        CONTENT,
        146,
      ),
      lettering('TOP100', 27, INK, 230, 34),
      lettering('AFRICA FUTURE LEADERS', 17, INK, 230, 25),
      lettering('TOP100AFL.COM', 26, PAPER, 420, 35),
    ])
  const field = profile.fieldOfStudy?.trim()
  const metadata = [country, field && field !== headline ? field : '']
    .filter(Boolean)
    .join('   /   ')
  const overlays: OverlayOptions[] = [
    block(WIDTH, 708, INK, 0, 192),
    block(100, 7, ORANGE, MARGIN, 38),
    block(WIDTH, 94, INK, 0, 1256),
    block(100, 7, ORANGE, WIDTH - MARGIN - 100, 1304),
    { input: series.data, left: MARGIN, top: 65 },
    { input: subtitle.data, left: MARGIN + 2, top: 141 },
    { input: logo, left: 712, top: 71 },
    { input: brandTop.data, left: 792, top: 72 },
    { input: brandBottom.data, left: 792, top: 112 },
    { input: name.data, left: MARGIN, top: 967 },
    { input: footer.data, left: MARGIN, top: 1294 },
  ]
  if (picture) {
    overlays.push({ input: picture, left: MARGIN, top: portraitTop })
  } else {
    const placeholder = await lettering(
      'AWARDEE PHOTOGRAPH',
      26,
      ORANGE,
      360,
      40,
    )
    overlays.push(block(CONTENT, portraitHeight, MATTE, MARGIN, portraitTop), {
      input: placeholder.data,
      left: (WIDTH - placeholder.info.width) >> 1,
      top: 528,
    })
  }
  if (metadata) {
    const detail = await lettering(metadata, 27, '#713510', CONTENT, 33)
    overlays.push({ input: detail.data, left: MARGIN, top: 926 })
  }
  if (headline) {
    const title = await lettering(headline, 38, '#50382B', CONTENT, 108)
    overlays.push({
      input: title.data,
      left: MARGIN,
      top: 987 + name.info.height,
    })
  }
  return sharp({
    create: { width: WIDTH, height: HEIGHT, channels: 3, background: PAPER },
  })
    .composite(overlays)
    .jpeg({ quality: 92 })
    .toBuffer()
}
