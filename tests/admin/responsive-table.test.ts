import { describe, it, expect } from 'vitest'
import { cardColumns, type ResponsiveColumn } from '@/components/ui/responsive-table'

interface Row {
  id: string
  name: string
}

const columns: ResponsiveColumn<Row>[] = [
  { key: 'select', header: '', cell: () => null, hideOnMobile: true },
  { key: 'name', header: 'Name', cell: (row) => row.name },
  { key: 'id', header: 'ID', cell: (row) => row.id },
]

describe('cardColumns', () => {
  it('drops columns marked hideOnMobile', () => {
    expect(cardColumns(columns).map((c) => c.key)).toEqual(['name', 'id'])
  })

  it('preserves declaration order', () => {
    const reordered: ResponsiveColumn<Row>[] = [
      { key: 'b', header: 'B', cell: () => null },
      { key: 'a', header: 'A', cell: () => null },
    ]
    expect(cardColumns(reordered).map((c) => c.key)).toEqual(['b', 'a'])
  })

  it('keeps every column when none are hidden', () => {
    const visible = columns.slice(1)
    expect(cardColumns(visible)).toHaveLength(visible.length)
  })

  it('returns empty for an empty column set', () => {
    expect(cardColumns<Row>([])).toEqual([])
  })
})
