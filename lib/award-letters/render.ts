import sharp, { type OverlayOptions } from 'sharp'
import path from 'node:path'
import { FESTIVAL_DATE, FESTIVAL_VENUE } from '../festival/config'
import { recommender } from './recommender'

export type LetterInput = { kind: 'recommendation' | 'invitation'; name: string; recipient: string; purpose: string }

// One A4 page containing the exact JPEG shown in the dashboard preview.
function pagePdf(jpeg: Buffer) {
  const content = 'q 595.28 0 0 841.89 0 0 cm /PageImage Do Q'
  const objects = [
    Buffer.from('<< /Type /Catalog /Pages 2 0 R >>'),
    Buffer.from('<< /Type /Pages /Kids [3 0 R] /Count 1 >>'),
    Buffer.from('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /XObject << /PageImage 4 0 R >> >> /Contents 5 0 R >>'),
    Buffer.concat([Buffer.from(`<< /Type /XObject /Subtype /Image /Width 989 /Height 1400 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`), jpeg, Buffer.from('\nendstream')]),
    Buffer.from(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`),
  ]
  const parts = [Buffer.from('%PDF-1.4\n')]
  const offsets = ['0000000000 65535 f ']
  let length = parts[0].length
  objects.forEach((object, index) => {
    offsets.push(String(length).padStart(10, '0') + ' 00000 n ')
    const part = Buffer.concat([Buffer.from(`${index+1} 0 obj\n`), object, Buffer.from('\nendobj\n')])
    parts.push(part)
    length += part.length
  })
  parts.push(Buffer.from(`xref\n0 6\n${offsets.join('\n')}\ntrailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${length}\n%%EOF\n`))
  return Buffer.concat(parts)
}

export async function renderLetter(input: LetterInput, year?: string, demo = false) {
  return renderLetterPage(input, year, demo, false)
}

async function renderLetterPage(input: LetterInput, year: string | undefined, demo: boolean, compact: boolean): Promise<{ image: string; pdf: string }> {
  const { name, purpose, recipient, kind } = input
  const recommendation = kind === 'recommendation'
  const title = recommendation ? 'Letter of recommendation' : 'Award confirmation and festival invitation'
  const paragraphs = recommendation ? [
    `On behalf of Top100 Africa Future Leaders, I am pleased to recommend ${name} for ${purpose.replace(/[.!?]+$/, '')}.`,
    `${year ? 'In ' + year + ', we' : 'We'} selected ${name} as a Top100 Africa Future Leaders award recipient. Our programme recognises young Africans who show leadership through the work they do in their communities, workplaces and fields of study. In assessing candidates, we consider the initiative they have shown, the impact of their work and their potential to lead.`,
    'That recognition is the basis for this recommendation. We value leadership that can be seen in how people take responsibility, put ideas into practice and contribute to others. An award from our programme reflects our judgement that the recipient’s work merits recognition and that their potential deserves continued support.',
    'I encourage you to consider this distinction alongside the applicant’s experience and goals. The opportunity described above would give them a chance to build on the work that earned their recognition and bring what they have learned to a new setting. I am pleased to support their application on behalf of our programme.',
    `Thank you for considering their application. If you would like to confirm the award or learn more about our selection process, our team can be reached at ${recommender.email}.`,
  ] : [
    `On behalf of Top100 Africa Future Leaders, we are pleased to confirm that ${name} is a Top100 Africa Future Leaders award recipient and is invited to attend the Africa Future Leaders Festival.`,
    `Festival date: ${FESTIVAL_DATE}\nVenue: ${FESTIVAL_VENUE}, Lagos, Nigeria`,
    'The festival brings together awardees, professionals and partners to celebrate the work of young African leaders. It gives awardees an opportunity to meet others working in different fields, share what they have learned and build relationships that can support their work beyond the festival.',
    `We are issuing this letter in support of ${name}’s request for sponsorship to attend. We would be grateful for your consideration of support towards travel, accommodation and other expenses directly related to participating in the festival.`,
    'Thank you for considering this request. To verify the invitation or confirm the event details, please contact our team at partnership@top100afl.com.',
  ]
  const folder = path.join(process.cwd(), 'private/award-letters')
  const layers: OverlayOptions[] = []
  const spacious = !compact
  const margin = spacious ? 85 : 62
  const width = 989 - 2 * margin
  let top = spacious ? 218 : 200
  async function line(value: string, size: number, gap: number, bold = false, right = false) {
    const escaped = value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    const { data, info } = await sharp({ text: { text: escaped, fontfile: path.join(process.cwd(), 'node_modules/geist/dist/fonts/geist-sans/Geist-Variable.ttf'), font: `Geist ${bold ? 'bold ' : ''}${size}`, width, wrap: 'word-char', rgba: true, spacing: spacious ? 7 : 4 } }).png().toBuffer({ resolveWithObject: true })
    layers.push({input: data, top, left: right ? 989 - margin - info.width : margin})
    top += info.height + gap
  }
  await line(new Intl.DateTimeFormat('en-GB', {dateStyle:'long',timeZone:'Africa/Lagos'}).format(new Date()), 19, 32, false, true)
  if (demo) await line('LOCAL PREVIEW • SAMPLE LETTER', 19, 18, true)
  await line(recipient ? `Dear ${recipient},` : 'To Whom It May Concern,', 22, 24)
  await line(`${title} for ${name}`, compact ? 24 : 26, 25, true)
  for (const [index, paragraph] of paragraphs.entries()) {
    const eventDetails = !recommendation && index === 1
    await line(paragraph, spacious ? 21 : 19, spacious ? 24 : 16, eventDetails)
  }
  await line(recipient ? 'Yours sincerely,' : 'Yours faithfully,', 21, 6)
  const signature = await sharp(path.join(folder,'signature.png')).resize(195).png().toBuffer()
  layers.push({input: signature, top, left: margin})
  top += 75
  await line(recommender.name, 22, 5, true)
  await line(`${recommender.title}\n${recommender.organisation.toUpperCase()}`, 20, 0)
  if (top > 1320) {
    if (spacious) return renderLetterPage(input, year, demo, true)
    throw new RangeError('Please shorten your entries to fit one page.')
  }
  const sealSize = 156
  const seal = await sharp(path.join(folder, 'seal.png')).resize(sealSize).png().toBuffer()
  layers.push({ input: seal, top: top - sealSize, left: 989 - margin - sealSize })
  const image = await sharp(path.join(folder,'stationery.png')).composite(layers).removeAlpha().jpeg({quality:94}).toBuffer()
  return {image: image.toString('base64'), pdf: pagePdf(image).toString('base64')}
}
