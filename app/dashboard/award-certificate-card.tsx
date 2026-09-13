'use client'

import { Award, Download } from 'lucide-react'

import type { MemberProfile } from '@/lib/member-hub'

function escapeXml(value: string) {
  return value.replace(/[<>&'\"]/g, character => ({
    '<': '&lt;',
    '>': '&gt;',
    '&': '&amp;',
    "'": '&apos;',
    '"': '&quot;',
  })[character] ?? character)
}

function certificateHref(memberName: string) {
  const name = escapeXml(memberName)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1100" viewBox="0 0 1600 1100"><rect width="1600" height="1100" fill="#fffaf4"/><rect x="36" y="36" width="1528" height="1028" rx="28" fill="none" stroke="#f97316" stroke-width="8"/><rect x="64" y="64" width="1472" height="972" rx="20" fill="none" stroke="#f59e0b" stroke-width="2"/><text x="800" y="250" text-anchor="middle" font-family="Arial, sans-serif" font-size="34" letter-spacing="9" fill="#9a3412">TOP100 AFRICA FUTURE LEADERS</text><text x="800" y="390" text-anchor="middle" font-family="Georgia, serif" font-size="82" fill="#171412">Certificate of Recognition</text><text x="800" y="510" text-anchor="middle" font-family="Arial, sans-serif" font-size="30" fill="#625b52">This certificate is proudly presented to</text><text x="800" y="650" text-anchor="middle" font-family="Georgia, serif" font-size="76" font-weight="bold" fill="#171412">${name}</text><text x="800" y="760" text-anchor="middle" font-family="Arial, sans-serif" font-size="30" fill="#625b52">in recognition of their leadership, service and impact</text><text x="800" y="820" text-anchor="middle" font-family="Arial, sans-serif" font-size="30" fill="#625b52">as a Top100 Africa Future Leader.</text><path d="M300 920h300M1000 920h300" stroke="#d4c7b6" stroke-width="2"/><text x="450" y="970" text-anchor="middle" font-family="Arial, sans-serif" font-size="22" fill="#625b52">Africa Future Leaders</text><text x="1150" y="970" text-anchor="middle" font-family="Arial, sans-serif" font-size="22" fill="#625b52">Top100 Recognition</text></svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

export function AwardCertificateCard({ member }: { member: MemberProfile }) {
  return (
    <section className="rounded-[22px] border border-orange-200 bg-[#fffaf4] p-5 sm:p-7" aria-labelledby="award-certificate-title">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[15px] bg-orange-100 text-orange-700">
            <Award className="h-6 w-6" aria-hidden="true" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-700">Your recognition</p>
            <h2 id="award-certificate-title" className="mt-2 text-2xl font-semibold tracking-tight text-[#171412]">Download your award certificate</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-[#625B52]">Keep a digital certificate of your Top100 Africa Future Leaders recognition for your records and professional profiles.</p>
          </div>
        </div>
        <a href={certificateHref(member.name)} download="top100-africa-future-leaders-certificate.svg" className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-[linear-gradient(110deg,#f97316,#fb923c,#f59e0b)] px-5 text-sm font-semibold text-[#171412] transition hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-600 focus-visible:ring-offset-2">
          <Download className="h-4 w-4" aria-hidden="true" />
          Download certificate
        </a>
      </div>
    </section>
  )
}
