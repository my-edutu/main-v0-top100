import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import './festival.css'

export function FestivalPaymentReturn({
  receipt = false,
}: {
  receipt?: boolean
}) {
  return (
    <aside
      className={`festival-payment-return${receipt ? ' festival-payment-return--receipt' : ''}`}
      aria-label="Festival pickup interest"
    >
      <Link href="/dashboard/festival">
        Festival attendance &amp; pickup{' '}
        <ArrowUpRight size={16} aria-hidden="true" />
      </Link>
    </aside>
  )
}
