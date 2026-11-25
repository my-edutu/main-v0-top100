type ListPage<Row> = { rows: Row[]; pageSize: number; total: number }

export async function loadFestivalList<Row extends { memberId: string }>(
  loadPage: (page: number) => Promise<ListPage<Row>>,
) {
  const first = await loadPage(1)
  const rows = [...first.rows]
  const pageCount = Math.ceil(first.total / first.pageSize)
  for (let page = 2; page <= pageCount; page += 1) {
    const result = await loadPage(page)
    if (result.total !== first.total || result.pageSize !== first.pageSize) {
      throw new Error('The list changed during export. Try again.')
    }
    rows.push(...result.rows)
  }
  if (rows.length !== first.total || new Set(rows.map((row) => row.memberId)).size !== rows.length) {
    throw new Error('The list changed during export. Try again.')
  }
  return rows
}

export function numberedFestivalNames(names: string[]) {
  return names.map((name, index) => `${index + 1}. ${name.replace(/\s+/g, ' ').trim()}`).join('\n')
}

function csvValue(value: string) {
  const cell = /^[\t\r\n]|^\s*[=+@-]/u.test(value) ? `'${value}` : value
  return `"${cell.replaceAll('"', '""')}"`
}

export function festivalCsv(columns: string[], rows: string[][]) {
  const header = ['No.', ...columns].map(csvValue).join(',')
  const numbered = rows.map((row, index) => [String(index + 1), ...row].map(csvValue).join(','))
  return `\uFEFF${[header, ...numbered].join('\r\n')}\r\n`
}
