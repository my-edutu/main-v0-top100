'use client'

import { ExternalLink, Linkedin } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import type { AwardeeJourneySettings } from '@/lib/dashboard/awardee-journey-settings'

export function FounderWelcomeDialog({
  open,
  settings,
  saving,
  onOpenChange,
  onAcknowledge,
}: {
  open: boolean
  settings: AwardeeJourneySettings
  saving: boolean
  onOpenChange: (open: boolean) => void
  onAcknowledge: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(88dvh,900px)] max-w-2xl gap-0 overflow-y-auto rounded-[24px] border-[#E8DED3] bg-[#FFFEFC] p-0 text-[#171412] shadow-2xl sm:rounded-[28px]">
        <div className="relative overflow-hidden bg-gradient-to-br from-[#F36D21] via-[#F08B18] to-[#F5A313] px-6 pb-7 pt-8 text-white sm:px-9 sm:pt-10">
          <span className="absolute -right-12 -top-24 h-64 w-64 rounded-full border border-white/20" aria-hidden="true" />
          <span className="absolute -right-2 -top-14 h-44 w-44 rounded-full border border-white/15" aria-hidden="true" />
          <div className="relative z-10 max-w-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/85">A personal welcome</p>
            <DialogTitle className="mt-2 max-w-lg text-2xl font-semibold leading-tight tracking-[-0.025em] text-white sm:text-3xl">{settings.welcomeTitle}</DialogTitle>
            <DialogDescription className="mt-2 text-sm leading-6 text-white/85">A note from {settings.founderName}, {settings.founderTitle}.</DialogDescription>
          </div>
        </div>
        <div className="px-6 py-6 sm:px-9 sm:py-8">
          <div className="max-w-none whitespace-pre-line text-[15px] leading-7 text-[#514B45] sm:text-base sm:leading-8">{settings.welcomeBody}</div>
          <div className="mt-7 border-t border-[#EEE7DF] pt-5">
            <p className="text-sm text-[#6F675E]">With belief in what we can build together,</p>
            <p aria-hidden="true" className="mt-1 text-[32px] leading-tight text-[#9E3D12]" style={{ fontFamily: '"Bradley Hand", "Segoe Print", "Comic Sans MS", cursive', fontStyle: 'italic' }}>{settings.signatureText}</p>
            <span className="sr-only">Signed, {settings.signatureText}.</span>
            <a href={settings.founderLinkedinUrl} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full border border-[#0A66C2] bg-[#0A66C2] px-4 text-sm font-semibold !text-white transition-colors hover:bg-[#004182] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A66C2] focus-visible:ring-offset-2">
              <Linkedin className="h-4 w-4 !text-white" aria-hidden="true" /><span className="!text-white">Follow Paul on LinkedIn</span><ExternalLink className="h-4 w-4 !text-white" aria-hidden="true" />
            </a>
          </div>
          <div className="mt-7 flex flex-col-reverse gap-3 border-t border-[#EEE7DF] pt-5 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="min-h-11 rounded-full border-[#D8CBBE] bg-white px-5 text-[#514B45]">Read this later</Button>
            <Button type="button" disabled={saving} onClick={onAcknowledge} style={{ backgroundImage: 'linear-gradient(90deg, #F36D21, #F5A313)', color: '#171412' }} className="min-h-11 rounded-full border-0 px-5 font-semibold hover:brightness-95 disabled:opacity-60">{saving ? 'Saving…' : 'I’ve read my welcome'}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
