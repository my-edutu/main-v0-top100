import * as React from 'react'
import { cn } from '@/lib/utils'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export interface ResponsiveColumn<T> {
  key: string
  header: React.ReactNode
  cell: (row: T) => React.ReactNode
  className?: string
  /**
   * Omit this column from the default mobile card. Use for columns that only
   * make sense in a table (row selection checkboxes, index numbers), or whose
   * content is already shown by a custom `renderCard`.
   */
  hideOnMobile?: boolean
}

export interface ResponsiveTableProps<T> {
  data: T[]
  columns: ResponsiveColumn<T>[]
  getRowKey: (row: T) => string
  /** Custom mobile card. Falls back to stacked label/value pairs. */
  renderCard?: (row: T) => React.ReactNode
  empty?: React.ReactNode
  /**
   * Width at which the table replaces the cards. Wide tables (8+ columns) are
   * cramped at `md`, so they opt into `lg` or `xl`.
   */
  breakpoint?: 'md' | 'lg' | 'xl'
  className?: string
}

/**
 * Tailwind's JIT compiler scans source for complete class strings, so these
 * cannot be interpolated — they have to appear literally.
 */
const BREAKPOINT_CLASSES = {
  md: { table: 'hidden md:block', cards: 'md:hidden' },
  lg: { table: 'hidden lg:block', cards: 'lg:hidden' },
  xl: { table: 'hidden xl:block', cards: 'xl:hidden' },
} as const

/**
 * Columns that the default mobile card renders, in order.
 *
 * Split out as a pure function so the fallback's behaviour is unit-testable
 * without a DOM — the project's vitest setup runs in a node environment.
 */
export function cardColumns<T>(
  columns: ResponsiveColumn<T>[],
): ResponsiveColumn<T>[] {
  return columns.filter((column) => !column.hideOnMobile)
}

/**
 * One definition of a list, rendered as a real table from `md:` up and as
 * stacked cards below it.
 *
 * This replaces the hand-duplicated `hidden md:block` table plus separate
 * mobile card list that each admin list page maintained independently, where
 * the two copies could and did drift apart.
 */
export function ResponsiveTable<T>({
  data,
  columns,
  getRowKey,
  renderCard,
  empty,
  breakpoint = 'md',
  className,
}: ResponsiveTableProps<T>) {
  if (data.length === 0 && empty) {
    return <>{empty}</>
  }

  const mobileColumns = cardColumns(columns)
  const breakpointClasses = BREAKPOINT_CLASSES[breakpoint]

  return (
    <div className={cn('responsive-records min-w-0', className)}>
      {/* Table — at and above the breakpoint */}
      <div
        className={cn(
          'overflow-x-auto rounded-2xl border border-zinc-200 bg-white',
          breakpointClasses.table,
        )}
      >
        <Table className="min-w-full">
          <TableHeader>
            <TableRow className="bg-zinc-50/80 hover:bg-zinc-50/80">
              {columns.map((column) => (
                <TableHead key={column.key} className={cn('h-11 text-[11px] font-semibold uppercase tracking-[0.1em] text-zinc-500', column.className)}>
                  {column.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row) => (
              <TableRow key={getRowKey(row)} className="transition-colors hover:bg-orange-50/45">
                {columns.map((column) => (
                  <TableCell key={column.key} className={column.className}>
                    {column.cell(row)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Cards — below the breakpoint */}
      <div className={cn('space-y-3', breakpointClasses.cards)}>
        {data.map((row) => (
          <div key={getRowKey(row)} className="responsive-record min-w-0">
            {renderCard ? (
              renderCard(row)
            ) : (
              <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-[0_1px_1px_rgba(24,23,21,.03)]">
                <dl className="space-y-2">
                  {mobileColumns.map((column) => (
                    <div
                      key={column.key}
                      className="flex min-h-8 items-start justify-between gap-3 border-b border-zinc-100 py-1.5 last:border-0"
                    >
                      <dt className="shrink-0 text-xs font-medium uppercase tracking-wide text-zinc-500">
                        {column.header}
                      </dt>
                      <dd className={cn('min-w-0 text-right text-sm text-zinc-900')}>
                        {column.cell(row)}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default ResponsiveTable
