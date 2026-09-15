import Image from 'next/image'

export function AwardIntroduction() {
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
      <span className="award-cinema-cta award-cinema-cta-disabled" aria-label="Award access coming soon">Coming soon</span>
      <p className="award-cinema-note">Award access will open here when the next step is available.</p>
    </div>
  </section>
}
