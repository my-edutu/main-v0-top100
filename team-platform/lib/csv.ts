/**
 * Small CSV writer. Every field is quoted so spreadsheet formulas cannot be
 * injected by imported awardee data. Formula-looking values are prefixed with
 * an apostrophe to keep Excel/Sheets from executing them.
 */
export function csvCell(value: unknown): string {
  const raw = value === null || value === undefined ? '' : String(value)
  const guarded = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw
  return `"${guarded.replace(/"/g, '""')}"`
}

export function toCsv(headers: string[], rows: Array<Array<unknown>>): string {
  const lines = [headers.map(csvCell).join(','), ...rows.map((row) => row.map(csvCell).join(','))]
  return `\uFEFF${lines.join('\r\n')}\r\n`
}
