import type { SelectionReport } from '../contracts'

const PAGE_LINE_LIMIT = 46
const WRAP_WIDTH = 92

const toPdfSafeText = (value: string) =>
  value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[–—]/g, '-')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[^\x20-\x7E]/g, '?')

const escapePdfLiteral = (value: string) =>
  toPdfSafeText(value)
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')

const wrapLine = (value: string, width = WRAP_WIDTH) => {
  const normalized = toPdfSafeText(value).trim()
  if (!normalized) return ['']

  const words = normalized.split(/\s+/)
  const lines: string[] = []
  let current = ''

  for (const word of words) {
    if (!current) {
      current = word
      continue
    }

    if (`${current} ${word}`.length <= width) {
      current = `${current} ${word}`
      continue
    }

    lines.push(current)
    current = word
  }

  if (current) lines.push(current)
  return lines
}

const verdictLabel = (verdict: SelectionReport['applications'][number]['verdict']) => {
  if (verdict === 'qualified') return 'QUALIFIED'
  if (verdict === 'needs_review') return 'NEEDS REVIEW'
  return 'NOT QUALIFIED'
}

const buildReportLines = (report: SelectionReport) => {
  const lines: string[] = []

  lines.push(report.title)
  lines.push('')
  lines.push(`Cycle: ${report.cycleName}`)
  lines.push(`Source: ${report.sourceLabel}`)
  lines.push(`Generated: ${report.generatedAt}`)
  lines.push(`Batch ${report.summary.batchNumber} of ${report.summary.totalBatches}`)
  lines.push(
    `Processed ${report.summary.processedApplications} of ${report.summary.totalApplications} applications`,
  )
  lines.push(
    `Qualified: ${report.summary.qualified} | Not qualified: ${report.summary.notQualified} | Needs review: ${report.summary.needsReview}`,
  )
  lines.push('')
  lines.push('APPLICATION RESULTS')
  lines.push('')

  report.applications.forEach((application, index) => {
    lines.push(
      `${index + 1}. ${application.fullName} | ${application.country || 'Unspecified'} | ${verdictLabel(application.verdict)} | Score ${application.totalScore}/100`,
    )

    const reasons = application.publicReasons.length > 0
      ? application.publicReasons.join(' ')
      : 'No public explanation was recorded.'
    lines.push(`Reason: ${reasons}`)
    lines.push('')
  })

  return lines.flatMap((line) => wrapLine(line))
}

const paginate = (lines: string[]) => {
  const pages: string[][] = []
  for (let index = 0; index < lines.length; index += PAGE_LINE_LIMIT) {
    pages.push(lines.slice(index, index + PAGE_LINE_LIMIT))
  }
  return pages.length > 0 ? pages : [[]]
}

const contentStreamForPage = (lines: string[], pageNumber: number, pageCount: number) => {
  const pageLines = [...lines, '', `Page ${pageNumber} of ${pageCount}`]
  return [
    'BT',
    '/F1 10 Tf',
    '50 800 Td',
    '14 TL',
    ...pageLines.flatMap((line, index) => [
      `(${escapePdfLiteral(line)}) Tj`,
      ...(index < pageLines.length - 1 ? ['T*'] : []),
    ]),
    'ET',
  ].join('\n')
}

const byteLength = (value: string) => Buffer.byteLength(value, 'latin1')

/**
 * Dependency-free PDF generation for private selection reports.
 *
 * The report is deliberately text-first: it remains downloadable even when an
 * external AI/OCR provider is unavailable. The detailed evidence viewer stays
 * in the admin console; this PDF contains decisions and applicant-safe reasons.
 */
export function generateSelectionReportPdf(report: SelectionReport): Uint8Array {
  const pages = paginate(buildReportLines(report))
  const pageObjectNumbers = pages.map((_, index) => 4 + index * 2)
  const objects = new Map<number, string>()

  objects.set(1, '<< /Type /Catalog /Pages 2 0 R >>')
  objects.set(
    2,
    `<< /Type /Pages /Kids [${pageObjectNumbers.map((number) => `${number} 0 R`).join(' ')}] /Count ${pages.length} >>`,
  )
  objects.set(3, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>')

  pages.forEach((lines, index) => {
    const pageObjectNumber = pageObjectNumbers[index]
    const contentObjectNumber = pageObjectNumber + 1
    const stream = contentStreamForPage(lines, index + 1, pages.length)

    objects.set(
      pageObjectNumber,
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentObjectNumber} 0 R >>`,
    )
    objects.set(
      contentObjectNumber,
      `<< /Length ${byteLength(stream)} >>\nstream\n${stream}\nendstream`,
    )
  })

  const maxObjectNumber = 3 + pages.length * 2
  let output = '%PDF-1.4\n%Top100 Selection Engine\n'
  const offsets = new Array<number>(maxObjectNumber + 1).fill(0)

  for (let objectNumber = 1; objectNumber <= maxObjectNumber; objectNumber += 1) {
    const body = objects.get(objectNumber)
    if (!body) throw new Error(`Missing PDF object ${objectNumber}`)

    offsets[objectNumber] = byteLength(output)
    output += `${objectNumber} 0 obj\n${body}\nendobj\n`
  }

  const xrefOffset = byteLength(output)
  output += `xref\n0 ${maxObjectNumber + 1}\n`
  output += '0000000000 65535 f \n'

  for (let objectNumber = 1; objectNumber <= maxObjectNumber; objectNumber += 1) {
    output += `${offsets[objectNumber].toString().padStart(10, '0')} 00000 n \n`
  }

  output += `trailer\n<< /Size ${maxObjectNumber + 1} /Root 1 0 R >>\n`
  output += `startxref\n${xrefOffset}\n%%EOF\n`

  return new Uint8Array(Buffer.from(output, 'latin1'))
}
