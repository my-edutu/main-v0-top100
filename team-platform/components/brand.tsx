import Link from 'next/link'
import Image from 'next/image'

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/dashboard" aria-label="Top100 Team Platform home" className="group inline-flex items-center">
      <Image
        src="/top100-afl-logo.png"
        alt="Top100 Africa Future Leaders"
        width={compact ? 152 : 176}
        height={compact ? 35 : 41}
        priority
        className="h-auto w-[152px] lg:w-[176px]"
      />
    </Link>
  )
}
