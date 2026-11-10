import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowRight, ArrowUpRight, BriefcaseBusiness, FlaskConical, GraduationCap, Plus, ShieldCheck } from 'lucide-react'
import Image from '@/components/safe-image'
import { ogMetadata } from '@/lib/og'
import { pageOg } from '@/lib/og-pages'
import { talentDiscoveryEnabled } from '@/lib/talent/features'
import { getPromotedTalent } from '@/lib/talent/public-query'
import styles from './organisations.module.css'

export const dynamic = 'force-dynamic'

const directory = '/awardees?view=talent'
const brief = '/for-organisations/request'
const contact = 'mailto:partnership@top100afl.com?subject=Top100%20Talent%20Discovery%20enquiry'
const hero = '/african-students-celebrating-achievement-at-gradua.jpg'
const description = 'Find African talent for your team. See what Top100 award winners have built, share a job or internship, or partner with us.'

export const metadata: Metadata = {
  title: 'Find and Hire African Talent',
  description,
  alternates: { canonical: '/for-organisations' },
  ...ogMetadata(pageOg('/for-organisations'), { url: '/for-organisations', description }),
}

const pathways = [
  { icon: BriefcaseBusiness, title: 'Find people for jobs', text: 'Meet Top100 members who are looking for a job. Check their skills and past work.', interest: 'Employment' },
  { icon: GraduationCap, title: 'Find interns', text: 'Find people who want to learn on the job and put their skills to work.', interest: 'Internship' },
  { icon: FlaskConical, title: 'Find research partners', text: 'Meet members who want to take part in research. Read about the work they’ve done.', interest: 'Research' },
]

const steps = [
  { title: 'Share the job', text: 'Tell us what the person will do, what skills they need, where they’ll work and what you’ll pay.' },
  { title: 'We check the details', text: 'We read your request and look for members whose skills fit the job.' },
  { title: 'Meet people who say yes', text: 'Each member decides if they want to meet you. If they say yes, we put you in touch.' },
]

const questions = [
  { title: 'What can I share with Top100?', text: 'Share a job, paid internship, scholarship or project. Tell us who can apply, where it takes place and what it pays or covers.' },
  { title: 'Can I ask to meet someone I found?', text: 'Yes. If you see “Request an introduction” on their profile, tell us why you’d like to meet them. They can say yes or no.' },
  { title: 'Does Top100 check what’s on each profile?', text: 'Members write about their own skills and work. If we’ve checked a detail, we say so on the profile. You decide who to hire.' },
  { title: 'Will Top100 always find someone for me?', text: 'We can put you in touch when there’s a good fit and the member says yes. We may turn down requests we can’t check or that ask people for money or private details they don’t need to share.' },
]

export default async function OrganisationsPage() {
  if (!talentDiscoveryEnabled()) notFound()
  const people = await getPromotedTalent().catch(() => [])

  return (
    <div className={styles.page}>
      <nav className={styles.nav} aria-label="Talent Discovery">
        <div className={styles.navInner}>
          <Link href="/for-organisations" className={styles.wordmark}><span aria-hidden="true" />Talent Discovery</Link>
          <div className={styles.navLinks}>
            <Link href="#discover">Find talent</Link>
            <Link href="#how-it-works">How it works</Link>
            <Link href="#contact">Contact</Link>
          </div>
          <Link href={brief} className={styles.navAction}>Share a job <ArrowUpRight size={15} aria-hidden="true" /></Link>
        </div>
      </nav>

      <section className={styles.hero} aria-labelledby="talent-hero">
        <Image src={hero} alt="" fill sizes="100vw" preload className={styles.heroPhoto} />
        <div className={styles.heroShade} />
        <div className={`${styles.container} ${styles.heroContent}`}>
          <p className={styles.eyebrow}><span /> Top100 Africa Future Leaders</p>
          <h1 id="talent-hero">African talent.<br /><em>Ready for the world.</em></h1>
          <p className={styles.heroIntro}>Meet Top100 award winners from across Africa. See what they’ve built, find skills your team needs, and ask to meet someone.</p>
          <div className={styles.actions}>
            <Link href="#discover" className={styles.primary}>Discover pipelines <ArrowRight size={18} aria-hidden="true" /></Link>
            <Link href="/partnership" className={styles.outline}>Partner with us <ArrowUpRight size={17} aria-hidden="true" /></Link>
          </div>
        </div>
        <div className={styles.heroCaption}>Impact beyond recognition</div>
      </section>

      <section id="discover" className={styles.discover} aria-labelledby="discover-title">
        <div className={styles.container}>
          <div className={styles.sectionLead}>
            <div><p className={styles.eyebrow}><span /> Find talent</p><h2 id="discover-title">Who do you need on your team?</h2></div>
            <p>Pick a group below, or <Link href={directory} className="underline underline-offset-4">browse all profiles</Link> to search by skill or country.</p>
          </div>
          <div className={styles.pathways}>
            {pathways.map(({ icon: Icon, title, text, interest }) => (
              <Link key={title} href={`${directory}&interest=${encodeURIComponent(interest)}`} className={styles.pathway}>
                <span className={styles.pathwayTop}><Icon size={25} strokeWidth={1.65} aria-hidden="true" /><ArrowUpRight size={18} aria-hidden="true" /></span>
                <h3>{title}</h3>
                <p>{text}</p>
              </Link>
            ))}
          </div>

          {people.length > 0 && (
            <div className={styles.spotlight}>
              <div className={styles.sectionLead}>
                <div><p className={styles.eyebrow}><span /> Member profiles</p><h2>Meet Top100 members.</h2></div>
                <Link className={styles.textLink} href={directory}>Browse all profiles <ArrowUpRight size={17} aria-hidden="true" /></Link>
              </div>
              <ul className={styles.pathways}>
                {people.map(person => (
                  <li key={person.id}>
                    <Link className={styles.person} href={`/awardees/${encodeURIComponent(person.slug)}`}>
                      {person.avatarUrl ? <Image src={person.avatarUrl} alt="" width={64} height={64} /> : <span className={styles.initial} aria-hidden="true">{person.name.slice(0, 1)}</span>}
                      <div><h3>{person.name}</h3><p>{person.headline}</p></div>
                      <ArrowUpRight size={17} aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>

      <section className={`${styles.container} ${styles.impact}`} aria-labelledby="impact-title">
        <div className={styles.impactVisual}>
          <Image src="/IMG_0674.jpg" alt="Participants at a Top100 Africa Future Leaders award presentation" fill sizes="(max-width: 767px) 90vw, 46vw" />
          <span>01 / The Top100 community</span>
        </div>
        <div className={styles.impactCopy}>
          <p className={styles.eyebrow}><span /> Impact beyond recognition</p>
          <h2 id="impact-title">See the work behind the award.</h2>
          <p>Read about what members have built and the problems they’ve helped solve. Their profiles show what they do well and what kind of work they want to do next.</p>
          <div className={styles.actions}>
            <Link href={directory} className={styles.darkButton}>Browse talent profiles <ArrowRight size={17} aria-hidden="true" /></Link>
            <Link href="/impacts" className={styles.textLink}>Read impact stories <ArrowUpRight size={16} aria-hidden="true" /></Link>
          </div>
        </div>
      </section>

      <section id="how-it-works" className={styles.process} aria-labelledby="process-title">
        <div className={styles.processImage}>
          <Image src="/IMG_0672.jpg" alt="" fill sizes="100vw" />
          <div className={styles.container}>
            <p className={styles.eyebrow}><span /> How it works</p>
            <h2 id="process-title">How to share a job<br className={styles.desktopBreak} /> and meet a member.</h2>
          </div>
        </div>
        <div className={`${styles.container} ${styles.processBody}`}>
          <ol className={styles.steps}>
            {steps.map(({ title, text }, index) => (
              <li key={title}><span>0{index + 1}</span><h3>{title}</h3><p>{text}</p></li>
            ))}
          </ol>
          <div className={styles.consent}>
            <span><ShieldCheck size={21} aria-hidden="true" /> Members choose what to share and who to meet.</span>
            <Link href={brief}>Share a job <ArrowRight size={17} aria-hidden="true" /></Link>
          </div>
        </div>
      </section>

      <section className={`${styles.container} ${styles.faq}`} aria-labelledby="faq-title">
        <div><p className={styles.eyebrow}><span /> Common questions</p><h2 id="faq-title">What employers ask us.</h2></div>
        <div className={styles.questions}>
          {questions.map(({ title, text }) => (
            <details key={title}>
              <summary>{title}<Plus size={19} aria-hidden="true" /></summary>
              <p>{text}</p>
            </details>
          ))}
        </div>
      </section>

      <section id="contact" className={styles.contact} aria-labelledby="contact-title">
        <div className={`${styles.container} ${styles.contactInner}`}>
          <div><p className={styles.eyebrow}><span /> Work with Top100</p><h2 id="contact-title">Hire someone or work with us.</h2><p>Tell us about the job you need to fill. If you want to run a workshop, fund a scholarship or work on a project together, get in touch.</p></div>
          <div className={styles.contactActions}>
            <Link href={brief} className={styles.primary}>Share a job <ArrowRight size={18} aria-hidden="true" /></Link>
            <a href={contact} className={styles.outline}>Email the Top100 team <ArrowUpRight size={17} aria-hidden="true" /></a>
            <Link href="/partnership" className={styles.contactLink}>Partner with us <ArrowUpRight size={15} aria-hidden="true" /></Link>
          </div>
        </div>
      </section>
    </div>
  )
}
