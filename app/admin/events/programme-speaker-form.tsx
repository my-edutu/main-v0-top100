'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export type ProgrammeSpeakerDraft = {
  id?: string
  name: string
  slug: string
  portraitUrl: string
  role: string
  organisation: string
  biography: string
  websiteUrl: string
  linkedinUrl: string
  socialUrl: string
  status: 'draft' | 'published' | 'archived'
}

export const emptyProgrammeSpeaker = (): ProgrammeSpeakerDraft => ({
  name: '', slug: '', portraitUrl: '', role: '', organisation: '', biography: '',
  websiteUrl: '', linkedinUrl: '', socialUrl: '', status: 'draft',
})

type Props = { value: ProgrammeSpeakerDraft; onChange: (value: ProgrammeSpeakerDraft) => void }

export function ProgrammeSpeakerForm({ value, onChange }: Props) {
  const update = (field: keyof ProgrammeSpeakerDraft, next: string) => onChange({ ...value, [field]: next })

  return (
    <section className="space-y-4 rounded-2xl border border-white/10 bg-zinc-900/60 p-4" aria-labelledby="programme-speaker-heading">
      <div>
        <p className="text-sm font-semibold text-zinc-200" id="programme-speaker-heading">Session speaker</p>
        <p className="mt-1 text-xs leading-5 text-zinc-500">Leave the name blank to show “Speaker to be unveiled” to members.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="speaker-name" className="text-xs text-zinc-500">Name</Label>
          <Input id="speaker-name" value={value.name} onChange={(event) => update('name', event.target.value)} placeholder="Speaker to be unveiled" className="bg-zinc-950 text-white" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="speaker-role" className="text-xs text-zinc-500">Role</Label>
          <Input id="speaker-role" value={value.role} onChange={(event) => update('role', event.target.value)} placeholder="Leadership strategist" className="bg-zinc-950 text-white" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="speaker-organisation" className="text-xs text-zinc-500">Organisation</Label>
          <Input id="speaker-organisation" value={value.organisation} onChange={(event) => update('organisation', event.target.value)} placeholder="Organisation name" className="bg-zinc-950 text-white" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="speaker-portrait" className="text-xs text-zinc-500">Portrait URL</Label>
          <Input id="speaker-portrait" value={value.portraitUrl} onChange={(event) => update('portraitUrl', event.target.value)} placeholder="https://..." className="bg-zinc-950 text-white" />
        </div>
        <div className="grid gap-2 sm:col-span-2">
          <Label htmlFor="speaker-bio" className="text-xs text-zinc-500">Biography</Label>
          <Textarea id="speaker-bio" value={value.biography} onChange={(event) => update('biography', event.target.value)} rows={3} placeholder="A short approved speaker biography..." className="resize-none bg-zinc-950 text-white" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="speaker-linkedin" className="text-xs text-zinc-500">LinkedIn URL</Label>
          <Input id="speaker-linkedin" value={value.linkedinUrl} onChange={(event) => update('linkedinUrl', event.target.value)} placeholder="https://linkedin.com/in/..." className="bg-zinc-950 text-white" />
        </div>
        <div className="grid gap-2">
          <Label className="text-xs text-zinc-500">Publication</Label>
          <Select value={value.status} onValueChange={(status: ProgrammeSpeakerDraft['status']) => update('status', status)}>
            <SelectTrigger className="bg-zinc-950 text-white"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-zinc-900 text-white">
              <SelectItem value="draft">Draft — show placeholder</SelectItem>
              <SelectItem value="published">Published — show profile</SelectItem>
              <SelectItem value="archived">Archived — hide profile</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </section>
  )
}
