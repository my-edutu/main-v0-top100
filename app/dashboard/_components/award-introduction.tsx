import Image from 'next/image'
import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'

export function AwardIntroduction({ continueTo }: { continueTo: string }) {
  return <section className="award-cinema mx-auto max-w-5xl">
    <div className="award-cinema-image">
      <Image src="/IMG_0674.jpg" alt="Africa Future Leaders award presentation" fill priority sizes="(max-width: 1024px) 100vw, 1000px" className="object-cover" />
      <div className="award-cinema-shade" />
    </div>
    <div className="award-cinema-copy">
      <p className="award-cinema-kicker">Africa Future Leaders · Recognition</p>
      <h1>Your impact.<br />Worth celebrating.</h1>
      <p className="award-cinema-lead">You made a difference. This is your moment.</p>
      <p className="award-cinema-detail">An award has been issued to you in recognition of your work and impact. The ideas you put into action, the people you inspire, and the change you create deserve to be celebrated.</p>
      <Link href={continueTo} className="award-cinema-cta">Continue to my award <ArrowUpRight size={18} aria-hidden="true" /></Link>
      <p className="award-cinema-note">By continuing, you agree to our <Link href="/legal/terms">terms and conditions</Link>.</p>
    </div>
  </section>
}
