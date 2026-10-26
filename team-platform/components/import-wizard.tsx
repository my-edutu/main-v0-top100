'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, CheckCircle2, FileSpreadsheet, Loader2, RefreshCw, Upload } from 'lucide-react'
import { Banner, Button, Field } from '@/components/ui'
import { AWARDEE_FIELDS } from '@/lib/import'

type Summary = {
  total_rows: number
  valid_rows: number
  error_rows: number
  inserts: number
  updates: number
}

type PreviewRow = {
  row_number: number
  action: 'insert' | 'update'
  matched_by?: string
  data: Record<string, string | null>
  warnings: string[]
}

type Issue = { row_number: number; field: string; message: string; value: string }

type PreviewResponse = {
  jobId: string
  filename: string
  headers: string[]
  mapping: Record<string, string | null>
  preview: { rows: PreviewRow[]; errors: Issue[]; summary: Summary }
  commitRows: number
  truncated: boolean
}

const LABELS: Record<string, string> = {
  public_awardee_id: 'Public awardee ID',
  external_key: 'Source / awardee ID',
  name: 'Full name',
  email: 'Email',
  phone: 'Phone / WhatsApp',
  country: 'Country',
  state: 'State',
  city: 'City',
  address: 'Address',
}

export function ImportWizard() {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [data, setData] = useState<PreviewResponse | null>(null)
  const [mapping, setMapping] = useState<Record<string, string | null>>({})
  const [remapping, setRemapping] = useState(false)
  const [committing, setCommitting] = useState(false)
  const [committed, setCommitted] = useState<{ inserted: number; updated: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function upload(event: React.FormEvent) {
    event.preventDefault()
    if (!file) {
      setError('Choose a CSV or Excel file first')
      return
    }
    setUploading(true)
    setError(null)
    setCommitted(null)
    try {
      const form = new FormData()
      form.set('file', file)
      const response = await fetch('/api/admin/imports/preview', { method: 'POST', body: form })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error ?? 'Could not preview the import')
      setData(payload)
      setMapping(payload.mapping)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not preview the import')
    } finally {
      setUploading(false)
    }
  }

  async function remap() {
    if (!data) return
    setRemapping(true)
    setError(null)
    try {
      const response = await fetch('/api/admin/imports/remap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId: data.jobId, mapping }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error ?? 'Could not rebuild the preview')
      setData(payload)
      setMapping(payload.mapping)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not rebuild the preview')
    } finally {
      setRemapping(false)
    }
  }

  async function commit() {
    if (!data) return
    if (!window.confirm(`Import ${data.commitRows} valid rows into the awardee book? This cannot be undone automatically.`)) return
    setCommitting(true)
    setError(null)
    try {
      const response = await fetch('/api/admin/imports/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId: data.jobId }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error ?? 'Could not commit the import')
      setCommitted(payload.result)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not commit the import')
    } finally {
      setCommitting(false)
    }
  }

  return (
    <div className="space-y-5">
      {error ? <Banner tone="error">{error}</Banner> : null}

      {committed ? (
        <Banner tone="success">
          <span className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Import committed: {committed.inserted} inserted, {committed.updated} updated. Assignment has not run
              automatically — use Assignments when you are ready.
            </span>
          </span>
        </Banner>
      ) : null}

      <form onSubmit={upload} className="space-y-3">
        <Field label="Spreadsheet" hint="CSV, XLSX or XLS. Up to 10 MB and 5,000 awardee rows per file.">
          <input
            className="input !h-auto py-2.5 file:mr-3 file:rounded-lg file:border-0 file:bg-ink file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-cream"
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={(event) => {
              setFile(event.target.files?.[0] ?? null)
              setData(null)
              setCommitted(null)
            }}
            required
          />
        </Field>
        <Button type="submit" variant="ember" disabled={uploading || !file}>
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {uploading ? 'Reading file…' : 'Preview & match'}
        </Button>
      </form>

      {data ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {[
              ['Rows', data.preview.summary.total_rows],
              ['Valid', data.preview.summary.valid_rows],
              ['Errors', data.preview.summary.error_rows],
              ['New', data.preview.summary.inserts],
              ['Updates', data.preview.summary.updates],
            ].map(([label, value]) => (
              <div key={String(label)} className="card-flat p-3">
                <p className="label">{label}</p>
                <p className="num mt-1 text-lg font-semibold">{value}</p>
              </div>
            ))}
          </div>

          <div className="card p-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="display text-lg">Column mapping</h3>
                <p className="text-[11px] text-muted">Match spreadsheet columns to awardee fields, then re-check.</p>
              </div>
              <FileSpreadsheet className="h-4 w-4 text-muted" />
            </div>
            <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
              {AWARDEE_FIELDS.map((field) => (
                <Field key={field} label={LABELS[field] ?? field}>
                  <select
                    className="select !h-9 text-xs"
                    value={mapping[field] ?? ''}
                    onChange={(event) => setMapping({ ...mapping, [field]: event.target.value || null })}
                  >
                    <option value="">Not mapped</option>
                    {data.headers.map((header) => (
                      <option key={header} value={header}>
                        {header}
                      </option>
                    ))}
                  </select>
                </Field>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button variant="ghost" size="sm" onClick={remap} disabled={remapping}>
                {remapping ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                Re-check with this mapping
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={commit}
                disabled={committing || !data.commitRows || data.preview.summary.valid_rows === 0}
              >
                {committing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                Commit {data.commitRows} valid rows
              </Button>
            </div>
            {data.preview.summary.error_rows ? (
              <p className="mt-2 flex items-start gap-1.5 text-[10px] leading-4 text-amber-800">
                <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                Rows with errors will be skipped. Fix the spreadsheet and upload it again to include them.
              </p>
            ) : null}
          </div>

          {data.preview.errors.length ? (
            <div className="card overflow-hidden">
              <div className="border-b border-ink/[0.07] px-4 py-3">
                <h3 className="display text-lg">Rows needing attention</h3>
                <p className="text-[11px] text-muted">{data.preview.errors.length} issues (first 500 shown)</p>
              </div>
              <div className="max-h-64 overflow-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-ink/[0.02]">
                      <th className="th">Row</th>
                      <th className="th">Field</th>
                      <th className="th">Problem</th>
                      <th className="th">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.preview.errors.map((issue, index) => (
                      <tr key={`${issue.row_number}-${issue.field}-${index}`} className="border-t border-ink/[0.06]">
                        <td className="td num">{issue.row_number}</td>
                        <td className="td">{issue.field}</td>
                        <td className="td">{issue.message}</td>
                        <td className="td max-w-[220px] truncate text-muted">{issue.value || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          <div className="card overflow-hidden">
            <div className="border-b border-ink/[0.07] px-4 py-3">
              <h3 className="display text-lg">Valid rows preview</h3>
              <p className="text-[11px] text-muted">
                Showing {data.preview.rows.length} of {data.preview.summary.valid_rows} valid rows.
                {data.truncated ? ' The full set is saved with this import job.' : ''}
              </p>
            </div>
            <div className="max-h-[420px] overflow-auto">
              <table className="w-full min-w-[760px] text-xs">
                <thead>
                  <tr className="bg-ink/[0.02]">
                    <th className="th">Row</th>
                    <th className="th">Action</th>
                    <th className="th">Name</th>
                    <th className="th">Email</th>
                    <th className="th">Phone</th>
                    <th className="th">Country</th>
                    <th className="th">Warnings</th>
                  </tr>
                </thead>
                <tbody>
                  {data.preview.rows.map((row) => (
                    <tr key={row.row_number} className="border-t border-ink/[0.06]">
                      <td className="td num">{row.row_number}</td>
                      <td className="td">
                        <span className={row.action === 'insert' ? 'text-moss' : 'text-amber-800'}>
                          {row.action}
                          {row.matched_by ? ` · ${row.matched_by}` : ''}
                        </span>
                      </td>
                      <td className="td font-medium">{row.data.name}</td>
                      <td className="td text-muted">{row.data.email ?? '—'}</td>
                      <td className="td text-muted">{row.data.phone ?? '—'}</td>
                      <td className="td text-muted">{row.data.country ?? '—'}</td>
                      <td className="td max-w-[260px] text-[10px] text-amber-800">{row.warnings.join(' ') || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
