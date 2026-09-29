'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2, FileSpreadsheet, Loader2, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { IMPORT_FIELDS, type ImportField } from '@/lib/awardee-import-fields'
import type { SheetInfo, WorkbookMapping } from '@/lib/awardee-workbook'
import type { ImportReview } from '@/lib/awardee-import-review'

type Preview = ImportReview & { previewId: string; totalRecords: number }
type Batch = { id: string; filename: string; summary: ImportReview['summary']; created_at: string; rolled_back_at: string | null }

const labels: Record<ImportField, string> = {
  externalId: 'Winner ID', name: 'Full name', email: 'Email', country: 'Country',
  course: 'Field of study', bio: 'Bio / About', year: 'Award year',
  imageUrl: 'Photo URL', tagline: 'Tagline', headline: 'Headline',
  linkedin: 'LinkedIn', twitter: 'X / Twitter', instagram: 'Instagram',
  facebook: 'Facebook', website: 'Website', cgpa: 'CGPA',
}

export default function AwardeesImportPage() {
  const [file, setFile] = useState<File | null>(null)
  const [sheets, setSheets] = useState<SheetInfo[]>([])
  const [mapping, setMapping] = useState<WorkbookMapping | null>(null)
  const [preview, setPreview] = useState<Preview | null>(null)
  const [history, setHistory] = useState<Batch[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [approved, setApproved] = useState(false)

  useEffect(() => { void loadHistory() }, [])

  async function loadHistory() {
    const response = await fetch('/api/awardees/import')
    if (response.ok) setHistory((await response.json()).batches ?? [])
  }

  async function send(action: 'inspect' | 'preview' | 'commit', nextFile = file, nextMapping = mapping, previewId?: string) {
    if (!nextFile) throw new Error('Choose a spreadsheet first.')
    const form = new FormData()
    form.set('file', nextFile)
    form.set('action', action)
    if (nextMapping) form.set('mapping', JSON.stringify(nextMapping))
    if (previewId) form.set('previewId', previewId)
    const response = await fetch('/api/awardees/import', { method: 'POST', body: form })
    const body = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(body.message || 'Could not process this spreadsheet.')
    return body
  }

  async function selectFile(nextFile: File | null) {
    setFile(nextFile)
    setSheets([])
    setMapping(null)
    setPreview(null)
    setApproved(false)
    setError('')
    setSuccess('')
    if (!nextFile) return
    setBusy(true)
    try {
      const body = await send('inspect', nextFile, null)
      setSheets(body.sheets)
      setMapping(body.mapping)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not read the spreadsheet.')
    } finally { setBusy(false) }
  }

  function changeMapping(change: (current: WorkbookMapping) => WorkbookMapping) {
    setMapping((current) => current ? change(current) : current)
    setPreview(null)
    setApproved(false)
  }

  function changeField(sheetName: string, field: ImportField, header: string) {
    changeMapping((current) => ({
      ...current,
      sheets: current.sheets.map((sheet) => sheet.sheet === sheetName
        ? { ...sheet, fields: { ...sheet.fields, [field]: header || undefined } }
        : sheet),
    }))
  }

  async function runPreview() {
    setBusy(true)
    setError('')
    try {
      setPreview(await send('preview') as Preview)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not preview this import.')
    } finally { setBusy(false) }
  }

  async function commit() {
    if (!preview || !approved) return
    setBusy(true)
    setError('')
    try {
      const body = await send('commit', file, mapping, preview.previewId)
      setSuccess(`Imported ${body.batch.count} winner records. Batch ${body.batch.id}.`)
      setPreview(null)
      setApproved(false)
      await loadHistory()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save the import.')
    } finally { setBusy(false) }
  }

  async function undo(batch: Batch) {
    if (!window.confirm(`Undo the import of ${batch.filename}? This works only while its winner records are unchanged and unclaimed.`)) return
    setBusy(true)
    setError('')
    try {
      const response = await fetch('/api/awardees/import', {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchId: batch.id }),
      })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(body.message || 'Could not undo this import.')
      setSuccess(`Undid ${body.reverted} changes from ${batch.filename}.`)
      await loadHistory()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not undo this import.')
    } finally { setBusy(false) }
  }

  return <div className="mx-auto max-w-6xl space-y-7 px-4 py-8 sm:px-6">
    <div><Link href="/admin/awardees" className="inline-flex items-center gap-2 text-sm text-stone-600 hover:text-orange-800"><ArrowLeft className="h-4 w-4" /> Awardees</Link><h1 className="mt-3 text-3xl font-semibold tracking-tight">Import winner profiles</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-stone-600">Map columns across tabs, check matches, and approve only the records you intend to add. Claimed profiles and populated fields are protected from spreadsheet overwrites.</p></div>
    {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p>}
    {success && <p role="status" className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800"><CheckCircle2 className="h-5 w-5" />{success}</p>}

    <section className="rounded-2xl border bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-center gap-3"><FileSpreadsheet className="h-6 w-6 text-orange-700" /><div><h2 className="text-lg font-semibold">1. Choose a spreadsheet</h2><p className="text-sm text-stone-600">Excel and CSV files up to 5 MiB and 10,000 rows.</p></div></div>
      <Input aria-label="Choose spreadsheet" className="mt-5 max-w-xl" type="file" accept=".xlsx,.xls,.csv" disabled={busy} onChange={(event) => void selectFile(event.target.files?.[0] ?? null)} />
      {file && <p className="mt-3 text-sm font-medium text-stone-700">{file.name}</p>}
    </section>

    {mapping && <section className="rounded-2xl border bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-lg font-semibold">2. Map tabs and columns</h2><p className="mt-1 text-sm text-stone-600">Select the winners tab as the primary list. Other tabs join by Email or Winner ID. Leave unrelated tabs unchecked.</p>
      <div className="mt-5 max-w-md"><Label htmlFor="primary-sheet">Winners tab</Label><select id="primary-sheet" value={mapping.primarySheet} onChange={(event) => changeMapping((current) => ({ ...current, primarySheet: event.target.value, sheets: current.sheets.some((entry) => entry.sheet === event.target.value) ? current.sheets : [...current.sheets, { sheet: event.target.value, headerRow: sheets.find((item) => item.name === event.target.value)?.headerRow ?? 1, fields: {} }] }))} className="mt-2 h-11 w-full rounded-md border border-stone-300 bg-white px-3">{sheets.map((sheet) => <option key={sheet.name} value={sheet.name}>{sheet.name}</option>)}</select></div>
      <div className="mt-6 space-y-5">{sheets.map((sheetInfo) => {
        const sheet = mapping.sheets.find((entry) => entry.sheet === sheetInfo.name)
        const enabled = Boolean(sheet)
        const headers = sheetInfo.headerOptions.find((option) => option.row === sheet?.headerRow)?.headers ?? sheetInfo.headers
        return <div key={sheetInfo.name} className="rounded-xl border border-stone-200 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3"><label className="flex items-center gap-2 font-semibold"><input type="checkbox" checked={enabled} disabled={mapping.primarySheet === sheetInfo.name} onChange={(event) => changeMapping((current) => ({ ...current, sheets: event.target.checked ? [...current.sheets, { sheet: sheetInfo.name, headerRow: sheetInfo.headerRow, fields: {} }] : current.sheets.filter((entry) => entry.sheet !== sheetInfo.name) }))} />{sheetInfo.name}</label><span className="text-xs text-stone-500">About {sheetInfo.rowCount} rows</span></div>
          {enabled && sheet && <><div className="mt-4 max-w-40"><Label htmlFor={`header-${sheetInfo.name}`}>Header row</Label><select id={`header-${sheetInfo.name}`} value={sheet.headerRow} onChange={(event) => changeMapping((current) => ({ ...current, sheets: current.sheets.map((entry) => entry.sheet === sheetInfo.name ? { ...entry, headerRow: Number(event.target.value), fields: {} } : entry) }))} className="mt-1 h-10 w-full rounded-md border px-2">{sheetInfo.headerOptions.map((option) => <option key={option.row} value={option.row}>Row {option.row}</option>)}</select></div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{IMPORT_FIELDS.map((field) => <div key={field}><Label htmlFor={`${sheetInfo.name}-${field}`}>{labels[field]}</Label><select id={`${sheetInfo.name}-${field}`} value={sheet.fields[field] ?? ''} onChange={(event) => changeField(sheetInfo.name, field, event.target.value)} className="mt-1 h-10 w-full min-w-0 rounded-md border border-stone-300 bg-white px-2 text-sm"><option value="">Not in this tab</option>{headers.filter(Boolean).map((header, index) => <option key={`${header}-${index}`} value={header}>{header}</option>)}</select></div>)}</div></>}
        </div>
      })}</div>
      <Button className="mt-6" disabled={busy || !mapping.sheets.some((sheet) => sheet.sheet === mapping.primarySheet && sheet.fields.name && sheet.fields.email)} onClick={() => void runPreview()}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Preview matches<ArrowLeft className="ml-2 h-4 w-4 rotate-180" /></Button>
    </section>}

    {preview && <section className="rounded-2xl border bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-lg font-semibold">3. Review before import</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-4">{([['New', preview.summary.new], ['Fill missing details', preview.summary.fill], ['Unchanged', preview.summary.unchanged], ['Needs review', preview.summary.skipped]] as const).map(([label, count]) => <div key={label} className="rounded-xl bg-stone-50 p-4"><strong className="block text-2xl">{count}</strong><span className="text-sm text-stone-600">{label}</span></div>)}</div>
      <p className="mt-4 text-sm text-stone-600">{preview.totalRecords} valid winner rows found. New winners remain private until they claim their account.</p>
      {preview.issues.length > 0 && <details className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4" open><summary className="cursor-pointer font-semibold text-amber-900">{preview.issues.length} rows or fields need review</summary><ul className="mt-3 max-h-52 space-y-2 overflow-auto text-sm text-amber-900">{preview.issues.map((issue, index) => <li key={index}><strong>{issue.source}:</strong> {issue.message}</li>)}</ul></details>}
      <div className="mt-5 max-h-72 overflow-auto rounded-xl border"><table className="w-full min-w-[600px] text-left text-sm"><thead className="sticky top-0 bg-stone-50"><tr><th className="p-3">Action</th><th className="p-3">Winner</th><th className="p-3">Email</th><th className="p-3">Fields</th></tr></thead><tbody>{preview.actions.map((action, index) => <tr key={index} className="border-t"><td className="p-3 capitalize">{action.type}</td><td className="p-3">{action.name}</td><td className="p-3">{action.email}</td><td className="p-3">{Object.keys(action.payload).filter((key) => !['name', 'email', 'slug', 'metadata', 'is_public'].includes(key)).join(', ') || 'Identity'}</td></tr>)}</tbody></table></div>
      <label className="mt-5 flex items-start gap-3 text-sm"><input type="checkbox" checked={approved} onChange={(event) => setApproved(event.target.checked)} className="mt-1" />I reviewed the matches and understand that rows listed as needing review will be skipped.</label>
      <Button className="mt-5" disabled={busy || !approved || !preview.actions.length} onClick={() => void commit()}>{busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}Import {preview.actions.length} records</Button>
    </section>}

    {history.length > 0 && <section className="rounded-2xl border bg-white p-5 shadow-sm sm:p-6"><h2 className="text-lg font-semibold">Recent imports</h2><ul className="mt-4 divide-y">{history.map((batch) => <li key={batch.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"><span><strong className="block">{batch.filename}</strong><span className="text-stone-600">{batch.summary.new} new · {batch.summary.fill} filled · {new Date(batch.created_at).toLocaleString()}</span></span>{batch.rolled_back_at ? <span className="text-stone-500">Undone</span> : <Button size="sm" variant="outline" disabled={busy} onClick={() => void undo(batch)}>Undo batch</Button>}</li>)}</ul></section>}
  </div>
}
