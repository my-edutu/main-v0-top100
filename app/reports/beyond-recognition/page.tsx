import type { Metadata } from "next"
import Link from "next/link"
import { ArrowDown, ArrowDownToLine, ArrowRight, ArrowUpRight, Play } from "lucide-react"

import Image from "@/components/safe-image"
import { SITE_URL } from "@/lib/site"

import styles from "./report.module.css"

const reportUrl = "/reports/beyond-recognition"
const title = "Beyond Recognition"
const description = "How Top100 helps young African leaders turn visibility into opportunity"
const cover = "/IMG_0673.jpg"
const interview = "https://www.youtube.com/watch?v=41hmjQYnL5U"

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: `${SITE_URL}${reportUrl}` },
  openGraph: {
    title,
    description,
    url: `${SITE_URL}${reportUrl}`,
    type: "article",
    publishedTime: "2026-11-25",
    images: [{ url: cover, width: 1200, height: 674, alt: "An award presentation at the 2025 Top100 event" }],
  },
  twitter: { card: "summary_large_image", title, description, images: [cover] },
}

const contents = [
  ["overview", "Overview"],
  ["pathways", "Pathways"],
  ["stories", "Awardee stories"],
  ["empowher", "EmpowHER"],
  ["actions", "What comes next"],
  ["download", "Downloads"],
] as const

const ilo = "https://www.ilo.org/sites/default/files/2024-08/Sub-Saharan%20Africa%20GET%20Youth%202024_0.pdf"
const swisCohort = "https://www.swisafrica.org/post/swis-africa-selects-44-women-for-inaugural-empowher-program"
const swisShowcase = "https://www.swisafrica.org/post/from-classroom-to-showcase-swis-empowher-fellows-present-their-final-projects"
const successScholar = "https://www.mandelarhodes.org/scholarship/scholars/success-ndubuisi/"
const cindyFellowship = "https://www.eyclf.org/"
const paidWork = "/blog/from-skills-to-paid-work"

const labourEstimates = [
  { label: "Young women", value: 27.0 },
  { label: "All youth", value: 21.9 },
  { label: "Young men", value: 16.9 },
]

const pathways = [
  { title: "Make the work visible", text: "Awardee profiles and interviews give partners and peers a place to discover what young leaders are building.", href: "/awardees", label: "Explore the directory" },
  { title: "Help awardees prepare", text: "Peer feedback, empowerment sessions and mentoring can help awardees prepare for an application, interview or first project.", href: "/blog/impact-beyond-recognition-impact-africa", label: "Read about the sessions" },
  { title: "Connect people to openings", text: "The Opportunities Hub brings listings together. Partnerships such as EmpowHER create a defined route into training and mentorship.", href: "/initiatives/opportunities", label: "Browse opportunities" },
  { title: "Follow what happens", text: "Top100 plans to use Emerging Talent to connect awardees with employers and track interviews, offers and paid starts.", href: paidWork, label: "Read about the plan" },
]

function DownloadPdf() {
  return (
    <a className={styles.downloadButton} href={`${reportUrl}.pdf`} download="Beyond Recognition.pdf">
      <ArrowDownToLine aria-hidden="true" size={18} />
      Download PDF
    </a>
  )
}

export default function BeyondRecognitionPage() {
  return (
    <main className={styles.report}>
      <section className={styles.hero} aria-labelledby="report-title">
        <Image className={styles.heroImage} src={cover} alt="" fill sizes="100vw" loading="eager" fetchPriority="high" />
        <div className={`${styles.shell} ${styles.heroInner}`}>
          <p className={styles.eyebrow}>Top100 report <span>·</span> <time dateTime="2026-11">November 2026</time></p>
          <h1 id="report-title">Beyond <em>Recognition</em></h1>
          <p className={styles.heroSubtitle}>{description}</p>
          <DownloadPdf />
          <a className={styles.heroRead} href="#overview">Read the report online <ArrowDown size={17} aria-hidden="true" /></a>
        </div>
      </section>

      <nav aria-label="In this report" className={styles.contents}>
        <div className={styles.shell}>
          <ul>
            {contents.map(([id, label]) => <li key={id}><a href={`#${id}`}>{label}</a></li>)}
          </ul>
        </div>
      </nav>

      <section id="overview" className={`${styles.shell} ${styles.section} ${styles.overview}`} aria-labelledby="overview-heading">
        <div className={styles.prose}>
          <p className={styles.eyebrow}>Executive summary</p>
          <h2 id="overview-heading">What happens after a young leader is recognised?</h2>
          <p className={styles.lead}>Top100 gives young African leaders a platform for their work and connects them with peers and partners. The clearest documented opportunities come when someone offers a defined next step.</p>
          <p>A public profile can help a partner discover an awardee. An interview can make hard-won knowledge available to others. A programme place, paid project or mentor introduction gives someone a way to act on that access.</p>
          <p>Public records show examples of visibility and programme participation. They leave open how often Top100 referrals lead to jobs, fellowships or lasting collaborations.</p>
        </div>
        <figure className={styles.chart}>
          <figcaption>
            <h3>Young people outside employment, education or training</h3>
            <p>Sub-Saharan Africa · Ages 15–24 · 2023 estimates</p>
          </figcaption>
          <ul className={styles.chartRows}>
            {labourEstimates.map(({ label, value }) => (
              <li key={label}>
                <div><span>{label}</span><strong>{value.toFixed(1)}%</strong></div>
                <span className={styles.chartTrack} aria-hidden="true"><span style={{ width: `${value / 30 * 100}%` }} /></span>
              </li>
            ))}
          </ul>
          <p className={styles.chartNote}>Bars use a 0–30% scale. Estimates describe the region as a whole. <a href={ilo}>International Labour Organization estimates</a></p>
        </figure>
      </section>

      <section id="pathways" className={styles.pathways} aria-labelledby="pathways-heading">
        <div className={`${styles.shell} ${styles.section}`}>
          <p className={styles.eyebrow}>Programme model</p>
          <h2 id="pathways-heading">How Top100 connects visibility to opportunity</h2>
          <ol className={styles.pathwayList}>
            {pathways.map(({ title, text, href, label }, index) => (
              <li key={title}>
                <span className={styles.stageNumber} aria-hidden="true">0{index + 1}</span>
                <h3>{title}</h3>
                <p>{text}</p>
                <Link className={styles.textLink} href={href}>{label} <ArrowRight size={16} aria-hidden="true" /></Link>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="stories" className={`${styles.shell} ${styles.section}`} aria-labelledby="stories-heading">
        <p className={styles.eyebrow}>Ghana and Nigeria</p>
        <h2 id="stories-heading">Awardee stories</h2>
        <article className={styles.featureStory}>
          <a className={styles.storyImage} href={interview} aria-label="Watch the Top100 interview with Success Ndubuisi Okafor">
            <Image src="/reports/beyond-recognition/success-impact-series.webp" alt="Top100 Impact Series artwork featuring Success Ndubuisi Okafor" width={1280} height={720} sizes="(min-width: 900px) 52vw, 100vw" />
            <span aria-hidden="true"><Play size={20} fill="currentColor" /></span>
          </a>
          <div className={styles.prose}>
            <p className={styles.eyebrow}>Scholarship guidance · Nigeria</p>
            <h3>Success Ndubuisi Okafor</h3>
            <p>After a difficult EducationUSA interview and a rejection, Success kept applying. The Mandela Rhodes Foundation lists him as a 2026 scholar at Rhodes University.</p>
            <p>Top100 invited him to share how he prepared, handled setbacks and kept going. The published interview gives aspiring scholars access to lessons from someone who has been through the process.</p>
            <div className={styles.storyLinks}>
              <a className={styles.textLink} href={interview}>Watch the interview <ArrowUpRight size={16} aria-hidden="true" /></a>
              <a className={styles.textLink} href={successScholar}>Scholar profile <ArrowUpRight size={16} aria-hidden="true" /></a>
            </div>
          </div>
        </article>
        <div className={styles.storyGrid}>
          <article className={styles.prose}>
            <p className={styles.eyebrow}>Career mentorship · Ghana</p>
            <h3>Cindy Bempong Odame</h3>
            <p>Cindy co-founded Ghana’s Emerging Young Corporate Leaders Fellowship to help students and early-career professionals enter the world of work. The fellowship uses mentorship, masterclasses and practical learning to build that bridge.</p>
            <p>Her Top100 profile gives prospective mentors and collaborators a way to discover the work.</p>
            <Link className={styles.textLink} href="/awardees/cindy-bempong-odame">Read Cindy’s profile <ArrowRight size={16} aria-hidden="true" /></Link>
          </article>
          <article className={styles.prose}>
            <p className={styles.eyebrow}>Creative-sector training · Nigeria</p>
            <h3>Abiodun Damilola</h3>
            <p>Damilola, a 2025 Top100 awardee, helps young people build creative skills through Canon’s Miraisha Programme. His Top100 profile also records his selection for the 2026 Young Innovation Leaders Fellowship.</p>
            <p>Featuring his work helps young creatives and potential collaborators find it. The route to his fellowship selection is undocumented in the sources reviewed.</p>
            <Link className={styles.textLink} href="/awardees/abiodun-damilola">Read Damilola’s profile <ArrowRight size={16} aria-hidden="true" /></Link>
          </article>
        </div>
      </section>

      <section id="empowher" className={styles.caseStudy} aria-labelledby="empowher-heading">
        <div className={`${styles.shell} ${styles.section}`}>
          <div className={styles.caseIntro}>
            <div>
              <p className={styles.eyebrow}>Partnership case · Nigeria</p>
              <h2 id="empowher-heading">A route into STEM careers</h2>
            </div>
            <p className={styles.lead}>SWIS Africa and Top100 partnered on EmpowHER to give final-year women in STEM a place to learn, work with mentors and present their ideas.</p>
          </div>
          <dl className={styles.caseStats}>
            <div><dt>Final-year women selected</dt><dd>44</dd></div>
            <div><dt>Career streams</dt><dd>3</dd></div>
            <div><dt>Team projects presented</dt><dd>10</dd></div>
          </dl>
          <p className={styles.caseNote}>SWIS Africa reported figures for the partnership cohort. The public record leaves individual referral routes and later career outcomes open.</p>
          <div className={styles.caseDetails}>
            <div>
              <h3>Structured access</h3>
              <p>Participants could explore academia, industry or entrepreneurship. The programme was designed around training and an eight-week mentorship phase.</p>
              <a className={styles.textLink} href={swisCohort}>Read about the cohort <ArrowUpRight size={16} aria-hidden="true" /></a>
            </div>
            <div>
              <h3>Work participants produced</h3>
              <p>Fellows presented ten team projects at the September 2026 showcase, including an original survey and proposals on STEM workplace representation.</p>
              <a className={styles.textLink} href={swisShowcase}>Explore the projects <ArrowUpRight size={16} aria-hidden="true" /></a>
            </div>
          </div>
        </div>
      </section>

      <section id="actions" className={`${styles.shell} ${styles.section} ${styles.actions}`} aria-labelledby="actions-heading">
        <figure>
          <Image src="/IMG_0676.jpg" alt="Two attendees speaking face to face at the 2025 Top100 event" width={1200} height={674} sizes="(min-width: 900px) 48vw, 100vw" />
          <figcaption>Attendees in conversation at the 2025 Top100 event</figcaption>
        </figure>
        <div className={styles.prose}>
          <p className={styles.eyebrow}>Recommended actions</p>
          <h2 id="actions-heading">Give each introduction a next step</h2>
          <p>Top100 can invite awardees to name the support they want and opt in to introductions. Partners can offer a specific, defined opportunity, such as a paid project, application feedback or a research placement.</p>
          <p>Follow up at 30, 90 and 180 days to see what people applied for, what they started and what continued. Confirm a sample of outcomes with partners.</p>
          <Link className={styles.textLink} href="/partnership">Partner with Top100 <ArrowRight size={16} aria-hidden="true" /></Link>
        </div>
      </section>

      <section id="download" className={styles.downloadSection} aria-labelledby="download-heading">
        <div className={`${styles.shell} ${styles.section} ${styles.downloadInner}`}>
          <div>
            <h2 id="download-heading">Download the full report</h2>
            <p>Read the full cases, proposed follow-up measures and linked references.</p>
          </div>
          <DownloadPdf />
        </div>
      </section>

      <section className={`${styles.shell} ${styles.methods}`}>
        <h2>Explore the 2027 opportunity report</h2>
        <p>Read the research baseline on how young leaders find and access opportunities.</p>
        <Link className={styles.textLink} href="/reports/opportunity-2027">Read the 2027 report <ArrowRight size={16} aria-hidden="true" /></Link>
      </section>

      <section className={`${styles.shell} ${styles.methods}`} aria-labelledby="methods-heading">
        <h2 id="methods-heading">Sources and methods</h2>
        <p>This report draws on public material available by 25 November 2026. The awardee stories illustrate different routes into opportunity. Cohort-wide follow-up and individual referral records were unavailable for this review.</p>
        <ul>
          <li><a href={ilo}>ILO youth employment estimates</a></li>
          <li><a href={successScholar}>Mandela Rhodes Foundation scholar profile</a></li>
          <li><a href={cindyFellowship}>Emerging Young Corporate Leaders Fellowship</a></li>
          <li><a href={swisCohort}>SWIS EmpowHER cohort</a></li>
          <li><a href={swisShowcase}>SWIS EmpowHER showcase</a></li>
        </ul>
      </section>
    </main>
  )
}
