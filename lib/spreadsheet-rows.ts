export type SpreadsheetCell = unknown

const hasValue = (value: SpreadsheetCell): boolean => {
  return value !== null && value !== undefined && String(value).trim().length > 0
}

export const sheetRowsToRecords = (
  rows: readonly (readonly SpreadsheetCell[])[]
): Record<string, SpreadsheetCell>[] => {
  if (rows.length < 2) return []

  const headers = rows[0].map((cell) => String(cell ?? '').trim())

  return rows.slice(1)
    .filter((row) => row.some(hasValue))
    .map((row) => {
      const record: Record<string, SpreadsheetCell> = {}

      headers.forEach((header, index) => {
        if (!header || Object.prototype.hasOwnProperty.call(record, header)) return
        record[header] = row[index] ?? null
      })

      return record
    })
}
