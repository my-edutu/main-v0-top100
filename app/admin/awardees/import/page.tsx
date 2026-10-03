'use client'

import { useEffect, useRef, useState, type DragEvent } from 'react'
import Link from 'next/link'
import { ArrowLeft, Check, CheckCircle2, FileSpreadsheet, Loader2, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { IMPORT_FIELDS, type ImportField } from '@/lib/awardee-import-fields'
import type { SheetInfo, WorkbookMapping } from '@/lib/awardee-workbook'
import type { ImportReview } from '@/lib/awardee-import-review'
import { supabase } from '@/lib/supabase/client'

type Preview = ImportReview & { previewId: string; totalRecords: number; actionCount: number; issueCount: number }
type Batch = { id: string; filename: string; summary: ImportReview['summary']; created_at: string; rolled_back_at: string | null }
type StagedUpload = { uploadPath: string; filename: string }
type CommitOutcome =
  | { status: 'saving' }
  | { status: 'success'; count: number; batchId: string; summary: ImportReview['summary']; issueCount: number }
  | { status: 'error'; message: string }

const MAX_FILE_BYTES = 10 * 1024 * 1024
const DEFAULT_AWARD_YEAR = '2026'
const DEFAULT_AWARD_YEAR_OPTION = '@default-award-year-2026'

const labels: Record<ImportField, string> = {
  externalId: 'Winner ID', name: 'Full name', email: 'Email', country: 'Country',
  course: 'Field of study', bio: 'Bio / About', year: 'Award year',
  imageUrl: 'Photo URL', tagline: 'Tagline', headline: 'Headline',
  linkedin: 'LinkedIn', twitter: 'X / Twitter', instagram: 'Instagram',
  facebook: 'Facebook', website: 'Website', cgpa: 'CGPA',
  educationLevel: 'Education level', graduationYear: 'Graduation year',
  firstClass: 'First-Class / BGS status', proofUrl: 'First-Class / BGS proof link',
  leadershipJourney: 'Leadership journey', notableImpact: 'Notable impact',
  impactArea: 'Area of impact', peopleBenefited: 'People benefited',
}

export default function AwardeesImportPage() {
  const [file, setFile] = useState<File | null>(null)
  const [stagedUpload, setStagedUpload] = useState<StagedUpload | null>(null)
  const [sheets, setSheets] = useState<SheetInfo[]>([])
  const [mapping, setMapping] = useState<WorkbookMapping | null>(null)
  const [preview, setPreview] = useState<Preview | null>(null)
  const [history, setHistory] = useState<Batch[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [approved, setApproved] = useState(false)
  const [commitOutcome, setCommitOutcome] = useState<CommitOutcome | null>(null)
  const [estimatedProgress, setEstimatedProgress] = useState(0)
  const [draggingFile, setDraggingFile] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const uploadAttemptRef = useRef(0)

  useEffect(() => { void loadHistory() }, [])

  useEffect(() => {
    if (commitOutcome?.status !== 'saving') return
    const startedAt = Date.now()
    const timer = window.setInterval(() => {
      const elapsedSeconds = (Date.now() - startedAt) / 1000
      setEstimatedProgress(Math.min(92, Math.round(92 * (1 - Math.exp(-elapsedSeconds / 8)))))
    }, 250)
    return () => window.clearInterval(timer)
  }, [commitOutcome?.status])

  async function loadHistory() {
    try {
      const response = await fetch('/api/awardees/import')
      if (response.ok) setHistory((await response.json()).batches ?? [])
    } catch {
      // The import result is authoritative; history can be refreshed separately if unavailable.
    }
  }

  async function send(action: 'inspect' | 'preview' | 'commit', upload = stagedUpload, nextMapping = mapping, previewId?: string) {
    if (!upload) throw new Error('Choose a spreadsheet first.')
    const response = await fetch('/api/awardees/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...upload, mapping: nextMapping, previewId }),
    })
    const body = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(body.message || (response.status === 413 ? 'The spreadsheet is too large to process. Choose a file under 5 MiB.' : 'Could not process this spreadsheet.'))
    return body
  }

  async function discardUpload(upload: StagedUpload) {
    await fetch('/api/awardees/import', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uploadPath: upload.uploadPath }),
    })
  }

  async function stageFile(nextFile: File): Promise<StagedUpload> {
    if (!nextFile.size) throw new Error('The selected spreadsheet is empty. Choose another file.')
    if (nextFile.size > MAX_FILE_BYTES) {
      const sizeMiB = (nextFile.size / (1024 * 1024)).toFixed(1)
      throw new Error(`This file is ${sizeMiB} MiB. Choose an Excel or CSV file up to 10 MiB.`)
    }
    if (!/\.(xlsx|xls|csv)$/i.test(nextFile.name)) throw new Error('Choose an .xlsx, .xls, or .csv file.')
    const response = await fetch('/api/awardees/import', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'prepare-upload', filename: nextFile.name, fileSize: nextFile.size }),
    })
    const body = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(body.message || 'Could not prepare the spreadsheet upload.')
    const upload = { uploadPath: String(body.uploadPath), filename: nextFile.name }
    const { error: uploadError } = await supabase.storage.from(String(body.bucket)).uploadToSignedUrl(upload.uploadPath, String(body.token), nextFile, {
      contentType: nextFile.type || 'application/octet-stream',
    })
    if (uploadError) {
      await discardUpload(upload).catch(() => undefined)
      throw new Error(`Could not upload the spreadsheet: ${uploadError.message}`)
    }
    return upload
  }

  async function selectFile(nextFile: File | null) {
    const attempt = ++uploadAttemptRef.current
    setFile(nextFile)
    setStagedUpload(null)
    setSheets([])
    setMapping(null)
    setPreview(null)
    setApproved(false)
    setError('')
    setSuccess('')
    if (!nextFile) return
    setBusy(true)
    try {
      if (stagedUpload) await discardUpload(stagedUpload).catch(() => undefined)
      if (attempt !== uploadAttemptRef.current) return
      const upload = await stageFile(nextFile)
      if (attempt !== uploadAttemptRef.current) {
        await discardUpload(upload).catch(() => undefined)
        return
      }
      setStagedUpload(upload)
      const body = await send('inspect', upload, null)
      if (attempt !== uploadAttemptRef.current) return
      setSheets(body.sheets)
      setMapping(body.mapping)
    } catch (cause) {
      if (attempt === uploadAttemptRef.current) {
        setError(cause instanceof Error ? cause.message : 'Could not read the spreadsheet.')
      }
    } finally {
      if (attempt === uploadAttemptRef.current) setBusy(false)
    }
  }

  function chooseFile() {
    if (busy) return
    setError('')
    fileInputRef.current?.click()
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setDraggingFile(false)
    if (busy) return
    const droppedFile = event.dataTransfer.files?.[0]
    if (droppedFile) void selectFile(droppedFile)
  }

  function changeMapping(change: (current: WorkbookMapping) => WorkbookMapping) {
    setMapping((current) => current ? change(current) : current)
    setPreview(null)
    setApproved(false)
  }

  function changeField(sheetName: string, field: ImportField, header: string) {
    changeMapping((current) => ({
      ...current,
      sheets: current.sheets.map((sheet) => {
        if (sheet.sheet !== sheetName) return sheet
        if (field === 'year') {
          const fields = { ...sheet.fields }
          const defaults = { ...sheet.defaults }
          if (header === DEFAULT_AWARD_YEAR_OPTION || !header) {
            delete fields.year
            defaults.year = DEFAULT_AWARD_YEAR
          } else {
            fields.year = header
            delete defaults.year
          }
          return { ...sheet, fields, defaults }
        }
        return { ...sheet, fields: { ...sheet.fields, [field]: header || undefined } }
      }),
    }))
  }

  function changePrimarySheet(sheetName: string) {
    changeMapping((current) => {
      let nextSheets = current.sheets.some((entry) => entry.sheet === sheetName)
        ? current.sheets
        : [...current.sheets, { sheet: sheetName, headerRow: sheets.find((item) => item.name === sheetName)?.headerRow ?? 1, fields: {} }]
      nextSheets = nextSheets.map((entry) => entry.sheet === sheetName && !entry.fields.year
        ? { ...entry, defaults: { ...entry.defaults, year: DEFAULT_AWARD_YEAR } }
        : entry)
      return { ...current, primarySheet: sheetName, sheets: nextSheets }
    })
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
    if (!preview || !approved || busy) return
    setBusy(true)
    setError('')
    setEstimatedProgress(0)
    setCommitOutcome({ status: 'saving' })
    try {
      const body = await send('commit', stagedUpload, mapping, preview.previewId)
      const importedCount = Number(body.batch?.count ?? preview.actionCount)
      const batchId = String(body.batch?.id ?? '')
      setCommitOutcome({
        status: 'success',
        count: importedCount,
        batchId,
        summary: body.summary ?? preview.summary,
        issueCount: Number(body.issueCount ?? preview.issueCount),
      })
      setSuccess(`Imported ${importedCount} winner records.${batchId ? ` Batch ${batchId}.` : ''}`)
      setPreview(null)
      setApproved(false)
      setStagedUpload(null)
      void loadHistory()
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Could not confirm the import result.'
      setError(message)
      setCommitOutcome({ status: 'error', message })
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
    {success && <p role="status" className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800"><CheckCircle2 className="h-5 w-5" />{success}</p>}

    <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-800">Step 1</p>
          <h2 className="mt-1 text-lg font-semibold text-stone-900">Choose a spreadsheet</h2>
          <p className="mt-1 text-sm text-stone-600">CSV or Excel · Up to 10 MiB · 10,000 rows</p>
        </div>
        {file && mapping && <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-800"><Check className="size-3.5" aria-hidden="true" />Ready to map</span>}
      </div>
      <div
        onDragEnter={(event) => { event.preventDefault(); if (!busy) setDraggingFile(true) }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDraggingFile(false) }}
        onDrop={handleDrop}
        className={`mt-5 rounded-2xl border border-dashed p-4 transition-colors sm:p-5 ${draggingFile ? 'border-orange-500 bg-orange-50' : 'border-stone-300 bg-stone-50/70'} ${busy ? 'opacity-70' : ''}`}
      >
        {file ? <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-white text-orange-700 ring-1 ring-stone-200"><FileSpreadsheet className="size-6" aria-hidden="true" /></span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-stone-900" title={file.name}>{file.name}</p>
              <p className="mt-1 text-xs text-stone-600">{(file.size / (1024 * 1024)).toFixed(1)} MiB <span aria-hidden="true">·</span> {busy ? 'Uploading and reading spreadsheet…' : mapping ? 'Spreadsheet loaded' : error ? 'Upload needs attention' : 'Selected'}</p>
            </div>
          </div>
          <Button type="button" variant="outline" className="w-full shrink-0 bg-white sm:w-auto" disabled={busy} onClick={chooseFile}>Choose another file</Button>
        </div> : <div className="flex flex-col items-center gap-3 py-4 text-center sm:py-5">
          <span className="flex size-12 items-center justify-center rounded-xl bg-orange-100 text-orange-800"><Upload className="size-5" aria-hidden="true" /></span>
          <div>
            <p className="text-sm font-semibold text-stone-900">Drag and drop your spreadsheet</p>
            <p className="mt-1 text-sm text-stone-600">or choose a file from your device</p>
          </div>
          <Button type="button" variant="outline" className="min-h-11 bg-white" disabled={busy} onClick={chooseFile}>Browse files</Button>
        </div>}
        <input ref={fileInputRef} aria-label="Choose spreadsheet" className="sr-only" type="file" tabIndex={-1} accept=".xlsx,.xls,.csv" disabled={busy} onChange={(event) => {
        const selectedFile = event.target.files?.[0] ?? null
        event.target.value = ''
        void selectFile(selectedFile)
      }} />
      </div>
      {file && !mapping && error && !busy ? <Button type="button" variant="link" className="mt-2 h-auto p-0 text-orange-800" onClick={() => void selectFile(file)}>Retry upload</Button> : null}
      {error && <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p>}
    </section>

    {mapping && <section className="rounded-2xl border bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-lg font-semibold">2. Map tabs and columns</h2><p className="mt-1 text-sm text-stone-600">Select the winners tab as the primary list. Other tabs join by Email or Winner ID. Leave unrelated tabs unchecked.</p>
      <div className="mt-5 max-w-md"><Label htmlFor="primary-sheet">Winners tab</Label><select id="primary-sheet" value={mapping.primarySheet} onChange={(event) => changePrimarySheet(event.target.value)} className="mt-2 h-11 w-full rounded-md border border-stone-300 bg-white px-3">{sheets.map((sheet) => <option key={sheet.name} value={sheet.name}>{sheet.name}</option>)}</select></div>
      <div className="mt-6 space-y-5">{sheets.map((sheetInfo) => {
        const sheet = mapping.sheets.find((entry) => entry.sheet === sheetInfo.name)
        const enabled = Boolean(sheet)
        const headers = sheetInfo.headerOptions.find((option) => option.row === sheet?.headerRow)?.headers ?? sheetInfo.headers
        return <div key={sheetInfo.name} className="rounded-xl border border-stone-200 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3"><label className="flex items-center gap-2 font-semibold"><input type="checkbox" checked={enabled} disabled={mapping.primarySheet === sheetInfo.name} onChange={(event) => changeMapping((current) => ({ ...current, sheets: event.target.checked ? [...current.sheets, { sheet: sheetInfo.name, headerRow: sheetInfo.headerRow, fields: {} }] : current.sheets.filter((entry) => entry.sheet !== sheetInfo.name) }))} />{sheetInfo.name}</label><span className="text-xs text-stone-500">About {sheetInfo.rowCount} rows</span></div>
          {enabled && sheet && <><div className="mt-4 max-w-40"><Label htmlFor={`header-${sheetInfo.name}`}>Header row</Label><select id={`header-${sheetInfo.name}`} value={sheet.headerRow} onChange={(event) => changeMapping((current) => ({ ...current, sheets: current.sheets.map((entry) => entry.sheet === sheetInfo.name ? { ...entry, headerRow: Number(event.target.value), fields: {} } : entry) }))} className="mt-1 h-10 w-full rounded-md border px-2">{sheetInfo.headerOptions.map((option) => <option key={option.row} value={option.row}>Row {option.row}</option>)}</select></div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{IMPORT_FIELDS.map((field) => <div key={field}><Label htmlFor={`${sheetInfo.name}-${field}`}>{labels[field]}</Label><select id={`${sheetInfo.name}-${field}`} value={field === 'year' ? sheet.fields.year ?? (sheet.defaults?.year ? DEFAULT_AWARD_YEAR_OPTION : '') : sheet.fields[field] ?? ''} onChange={(event) => changeField(sheetInfo.name, field, event.target.value)} className="mt-1 h-10 w-full min-w-0 rounded-md border border-stone-300 bg-white px-2 text-sm">{field === 'year' ? <><option value={DEFAULT_AWARD_YEAR_OPTION}>Set all rows to award year {DEFAULT_AWARD_YEAR}</option><option value="">Skip award year</option></> : <option value="">Not in this tab</option>}{headers.filter(Boolean).map((header, index) => <option key={`${header}-${index}`} value={header}>{header}</option>)}</select>{field === 'year' && <p className="mt-1 text-xs leading-5 text-stone-500">This is the award cohort, separate from graduation year.</p>}</div>)}</div></>}
        </div>
      })}</div>
      <Button className="mt-6" disabled={busy || !mapping.sheets.some((sheet) => sheet.sheet === mapping.primarySheet && sheet.fields.name && sheet.fields.email)} onClick={() => void runPreview()}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Preview matches<ArrowLeft className="ml-2 h-4 w-4 rotate-180" /></Button>
    </section>}

    {preview && <section className="rounded-2xl border bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-lg font-semibold">3. Review before import</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-4">{([['New', preview.summary.new], ['Fill missing details', preview.summary.fill], ['Unchanged', preview.summary.unchanged], ['Needs review', preview.summary.skipped]] as const).map(([label, count]) => <div key={label} className="rounded-xl bg-stone-50 p-4"><strong className="block text-2xl">{count}</strong><span className="text-sm text-stone-600">{label}</span></div>)}</div>
      <p className="mt-4 text-sm text-stone-600">{preview.totalRecords} valid winner rows found. New winners remain private until they claim their account.</p>
      {preview.issueCount > 0 && <details className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4" open><summary className="cursor-pointer font-semibold text-amber-900">{preview.issueCount} rows or fields need review</summary><ul className="mt-3 max-h-52 space-y-2 overflow-auto text-sm text-amber-900">{preview.issues.map((issue, index) => <li key={index}><strong>{issue.source}:</strong> {issue.message}</li>)}</ul>{preview.issueCount > preview.issues.length ? <p className="mt-3 text-sm">Showing the first {preview.issues.length} issues.</p> : null}</details>}
      {preview.actionCount > preview.actions.length ? <p className="mt-4 text-sm text-stone-600">Showing the first {preview.actions.length} of {preview.actionCount} changes below.</p> : null}
      <div className="mt-5 max-h-72 overflow-auto rounded-xl border"><table className="w-full min-w-[600px] text-left text-sm"><thead className="sticky top-0 bg-stone-50"><tr><th className="p-3">Action</th><th className="p-3">Winner</th><th className="p-3">Email</th><th className="p-3">Fields</th></tr></thead><tbody>{preview.actions.map((action, index) => <tr key={index} className="border-t"><td className="p-3 capitalize">{action.type}</td><td className="p-3">{action.name}</td><td className="p-3">{action.email}</td><td className="p-3">{Object.keys(action.payload).filter((key) => !['name', 'email', 'slug', 'metadata', 'is_public'].includes(key)).join(', ') || 'Identity'}</td></tr>)}</tbody></table></div>
      <label className="mt-5 flex items-start gap-3 text-sm"><input type="checkbox" checked={approved} onChange={(event) => setApproved(event.target.checked)} className="mt-1" />I reviewed the summary and the listed sample of changes. Rows marked as needing review will be skipped.</label>
      <Button className="mt-5" disabled={busy || !approved || !preview.actionCount} onClick={() => void commit()}>{busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}Import {preview.actionCount} records</Button>
    </section>}

    {history.length > 0 && <section className="rounded-2xl border bg-white p-5 shadow-sm sm:p-6"><h2 className="text-lg font-semibold">Recent imports</h2><ul className="mt-4 divide-y">{history.map((batch) => <li key={batch.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"><span><strong className="block">{batch.filename}</strong><span className="text-stone-600">{batch.summary.new} new · {batch.summary.fill} filled · {new Date(batch.created_at).toLocaleString()}</span></span>{batch.rolled_back_at ? <span className="text-stone-500">Undone</span> : <Button size="sm" variant="outline" disabled={busy} onClick={() => void undo(batch)}>Undo batch</Button>}</li>)}</ul></section>}

    <Dialog open={Boolean(commitOutcome)} onOpenChange={(open) => {
      if (commitOutcome?.status === 'saving') return
      if (!open) setCommitOutcome(null)
    }}>
      {commitOutcome && <DialogContent className={`max-h-[90dvh] w-[calc(100%-2rem)] overflow-y-auto rounded-2xl border-stone-200 bg-white p-6 sm:max-w-md sm:p-8 ${commitOutcome.status === 'saving' ? '[&>button:last-child]:hidden' : ''}`}>
        {commitOutcome.status === 'saving' ? <>
          <DialogHeader className="items-center text-center">
            <div className="relative mb-2 flex size-28 items-center justify-center" aria-hidden="true">
              <svg viewBox="0 0 100 100" className="absolute inset-0 size-full -rotate-90">
                <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="5" className="text-orange-100" />
                <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeDasharray={2 * Math.PI * 42} strokeDashoffset={2 * Math.PI * 42 * (1 - estimatedProgress / 100)} className="text-orange-600 transition-[stroke-dashoffset] duration-300" />
              </svg>
              <svg viewBox="0 0 48 48" className="size-12 text-orange-700" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 5h14l8 8v28H14a4 4 0 0 1-4-4V9a4 4 0 0 1 4-4Z" />
                <path d="M28 5v9h8M18 23h14M18 29h14M18 35h8" />
              </svg>
            </div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-800">Import in progress</p>
            <DialogTitle className="mt-2 text-2xl font-semibold text-stone-900">Saving winner records</DialogTitle>
            <DialogDescription className="mt-2 max-w-sm text-sm leading-6 text-stone-600">The database is applying your reviewed changes. Keep this page open while it confirms the result.</DialogDescription>
          </DialogHeader>
          <div className="mt-2" role="progressbar" aria-label="Estimated import progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={estimatedProgress}>
            <div className="flex items-center justify-between text-sm"><span className="text-stone-600">Estimated progress</span><span className="font-semibold tabular-nums text-stone-900">{estimatedProgress}%</span></div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-orange-100"><div className="h-full rounded-full bg-orange-600 transition-[width] duration-300" style={{ width: `${estimatedProgress}%` }} /></div>
            <p className="mt-3 text-xs leading-5 text-stone-500">This is an estimate while the import runs. Completion is shown only after the database responds.</p>
          </div>
        </> : commitOutcome.status === 'success' ? <>
          <DialogHeader className="items-center text-center">
            <svg viewBox="0 0 96 96" className="mb-2 size-24" role="img" aria-label="Import completed successfully">
              <circle cx="48" cy="48" r="44" fill="#ecfdf5" />
              <circle cx="48" cy="48" r="34" fill="#10b981" />
              <path d="m32 49 10 10 22-24" fill="none" stroke="white" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-800">Import confirmed</p>
            <DialogTitle className="mt-2 text-2xl font-semibold text-stone-900">Winner records saved</DialogTitle>
            <DialogDescription className="mt-2 text-sm leading-6 text-stone-600">The import finished successfully. The summary below reflects the records returned by the database.</DialogDescription>
          </DialogHeader>
          <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl bg-stone-50 p-3"><dt className="text-stone-600">Records imported</dt><dd className="mt-1 text-xl font-semibold tabular-nums text-stone-900">{commitOutcome.count}</dd></div>
            <div className="rounded-xl bg-stone-50 p-3"><dt className="text-stone-600">New profiles</dt><dd className="mt-1 text-xl font-semibold tabular-nums text-stone-900">{commitOutcome.summary.new}</dd></div>
            <div className="rounded-xl bg-stone-50 p-3"><dt className="text-stone-600">Profiles completed</dt><dd className="mt-1 text-xl font-semibold tabular-nums text-stone-900">{commitOutcome.summary.fill}</dd></div>
            <div className="rounded-xl bg-stone-50 p-3"><dt className="text-stone-600">Review notes</dt><dd className="mt-1 text-xl font-semibold tabular-nums text-stone-900">{commitOutcome.issueCount}</dd></div>
          </dl>
          {commitOutcome.batchId && <p className="mt-4 break-all text-xs text-stone-500">Batch ID: {commitOutcome.batchId}</p>}
          <DialogFooter className="mt-5"><Button className="w-full" onClick={() => setCommitOutcome(null)}>Done</Button></DialogFooter>
        </> : <>
          <DialogHeader className="items-center text-center">
            <svg viewBox="0 0 96 96" className="mb-2 size-24" role="img" aria-label="Import result could not be confirmed">
              <circle cx="48" cy="48" r="44" fill="#fff7ed" />
              <circle cx="48" cy="48" r="34" fill="#f59e0b" />
              <path d="M48 29v23M48 64h.1" fill="none" stroke="white" strokeWidth="6" strokeLinecap="round" />
            </svg>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-800">Import not confirmed</p>
            <DialogTitle className="mt-2 text-2xl font-semibold text-stone-900">Check before trying again</DialogTitle>
            <DialogDescription className="mt-2 text-sm leading-6 text-stone-600">{commitOutcome.message}</DialogDescription>
          </DialogHeader>
          <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">If the connection dropped during saving, check Recent imports before retrying. The reviewed rows are still available on this page.</p>
          <DialogFooter className="mt-5"><Button variant="outline" className="w-full" onClick={() => setCommitOutcome(null)}>Return to review</Button></DialogFooter>
        </>}
      </DialogContent>}
    </Dialog>
  </div>
}
