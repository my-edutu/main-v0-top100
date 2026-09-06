import * as XLSX from 'xlsx'

export function readFirstWorksheet(input: ArrayBuffer | Uint8Array): unknown[][] {
  const bytes = input instanceof ArrayBuffer ? new Uint8Array(input) : input
  const workbook = XLSX.read(bytes, { type: 'array' })
  const firstSheetName = workbook.SheetNames[0]

  if (!firstSheetName) {
    throw new Error('Excel workbook does not contain a worksheet')
  }

  const worksheet = workbook.Sheets[firstSheetName]
  return XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
    header: 1,
    raw: true,
    defval: null,
  })
}
