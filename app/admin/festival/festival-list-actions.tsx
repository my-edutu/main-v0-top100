'use client'

import { useState } from 'react'
import { Copy, Download } from 'lucide-react'
import { festivalCsv, loadFestivalList, numberedFestivalNames } from '@/lib/festival/list-export'
import { festivalControl } from './festival-list-ui'

export function FestivalListActions<Row extends { memberId: string }>({
  filename, total, columns, loadPage, toCsv, toName,
}: {
  filename: string
  total: number
  columns: string[]
  loadPage: (page: number) => Promise<{ rows: Row[]; pageSize: number; total: number }>
  toCsv: (row: Row) => string[]
  toName: (row: Row) => string
}) {
  const [busy, setBusy] = useState<'copy' | 'export' | null>(null)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [manualCopy, setManualCopy] = useState('')

  async function run(action: 'copy' | 'export') {
    if (busy) return
    setBusy(action)
    setStatus('')
    setError('')
    setManualCopy('')
    try {
      const rows = await loadFestivalList(loadPage)
      if (!rows.length) {
        setStatus('This list is empty.')
        return
      }
      if (action === 'copy') {
        const text = numberedFestivalNames(rows.map(toName))
        try {
          await navigator.clipboard.writeText(text)
          setStatus(`${rows.length} numbered names copied.`)
        } catch {
          setManualCopy(text)
        }
      } else {
        const csv = festivalCsv(columns, rows.map(toCsv))
        const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
        const link = document.createElement('a')
        link.href = url
        link.download = `festival-${filename}.csv`
        document.body.append(link)
        link.click()
        link.remove()
        window.setTimeout(() => URL.revokeObjectURL(url), 30_000)
        setStatus(`CSV prepared for ${rows.length} records.`)
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The list could not be prepared.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="min-w-0 space-y-2">
      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        <button type="button" disabled={!!busy || total === 0} onClick={() => void run('copy')} className={festivalControl}>
          <Copy className="size-4 shrink-0" aria-hidden="true" /> {busy === 'copy' ? 'Preparing…' : 'Copy names'}
        </button>
        <button type="button" disabled={!!busy || total === 0} onClick={() => void run('export')} className={festivalControl}>
          <Download className="size-4 shrink-0" aria-hidden="true" /> {busy === 'export' ? 'Preparing…' : 'Export CSV'}
        </button>
      </div>
      {status && <p role="status" className="text-sm text-stone-700">{status}</p>}
      {error && <p role="alert" className="text-sm text-rose-800">{error}</p>}
      {manualCopy && (
        <label className="block space-y-1 text-sm text-stone-700">
          <span>Clipboard access is unavailable. Select and copy these names.</span>
          <textarea readOnly value={manualCopy} onFocus={(event) => event.currentTarget.select()} rows={5} className="block w-full rounded-lg border border-stone-300 p-2.5 text-sm" />
        </label>
      )}
    </div>
  )
}
