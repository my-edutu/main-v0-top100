import type { Metadata } from "next"
import Link from "next/link"
import { ArrowDown, ArrowDownToLine, ArrowRight } from "lucide-react"

import Image from "@/components/safe-image"
import { pageOg } from "@/lib/og-pages"
import { project100OutreachSource } from "@/lib/project100/outreach-photos"
import { SITE_URL } from "@/lib/site"

import report from "../beyond-recognition/report.module.css"
import styles from "./back-in-class.module.css"

const reportPath = "/reports/back-in-class"
const programmePath = "/initiatives/project100"
const { title, subtitle } = pageOg(reportPath)
const cover = `${reportPath}/school-walk.webp`
const reportDate = "2026-11-26"

const situationAnalysis = "https://www.unicef.org/nigeria/reports/situation-analysis-children-and-adolescents-nigeria-2024"
const householdSurvey = "https://www.unicef.org/nigeria/reports/2021-multiple-indicator-cluster-survey-national-immunization-coverage-survey-report"
const educationOverview = "https://www.unicef.org/nigeria/education"

export const metadata: Metadata = {
  title,
  description: subtitle,
  alternates: { canonical: `${SITE_URL}${reportPath}` },
  openGraph: {
    title,
    description: subtitle,
    url: `${SITE_URL}${reportPath}`,
    type: "article",
    publishedTime: reportDate,
    images: [{ url: cover, width: 1540, height: 845, alt: "Illustration of children walking to primary school in Nigeria" }],
  },
  twitter: { card: "summary_large_image", title, description: subtitle, images: [cover] },
}

const contents = [
  ["overview", "Overview"],
  ["stories", "Field stories"],
  ["support", "How Project100 helps"],
  ["follow-up", "Staying in school"],
  ["download", "Download"],
  ["sources", "Sources"],
] as const

const followUp = [
  ["Before support", "Record whether the child has never enrolled, has stopped attending, or is enrolled and at risk of leaving. Agree what support the child needs."],
  ["When school starts", "Record what was provided. Ask the school to confirm enrolment and first attendance for children starting or returning."],
  ["At term end and next term", "Ask the school whether the child is still attending. Note any long absence and what follow-up was possible."],
]

function DownloadPdf() {
  return (
    <a className={report.downloadButton} href={`${reportPath}.pdf`} download="Back in Class.pdf">
      <ArrowDownToLine size={18} aria-hidden="true" /> Download PDF
    </a>
  )
}

export default function BackInClassPage() {
  return (
    <article className={report.report} aria-labelledby="report-title">
      <header className={`${report.hero} ${styles.hero}`}>
        <Image className={report.heroImage} src={cover} alt="" fill sizes="100vw" loading="eager" fetchPriority="high" />
        <div className={`${report.shell} ${report.heroInner}`}>
          <p className={report.eyebrow}>Project100 Scholarship <span>·</span> <time dateTime={reportDate}>November 2026</time></p>
          <h1 id="report-title">Back in <em>Class</em></h1>
          <p className={report.heroSubtitle}>{subtitle}</p>
          <DownloadPdf />
          <a className={report.heroRead} href="#overview">Read the report online <ArrowDown size={17} aria-hidden="true" /></a>
          <p className={styles.heroCredit}>AI-generated illustration</p>
        </div>
      </header>

      <nav className={report.contents} aria-label="In this report">
        <div className={report.shell}>
          <ul>
            {contents.map(([id, label]) => <li key={id}><a href={`#${id}`}>{label}</a></li>)}
          </ul>
        </div>
      </nav>

      <section id="overview" className={`${report.shell} ${report.section} ${report.overview}`} aria-labelledby="overview-heading">
        <div className={report.prose}>
          <p className={report.eyebrow}>Executive summary</p>
          <h2 id="overview-heading">What keeps a child out of class?</h2>
          <p className={report.lead}>A term’s fees can stand between a family and the next school day. Project100 helps families cover school costs and supplies children need in class.</p>
          <p>Even where tuition is free, families may pay for uniforms, books or transport. Distance, insecurity and the availability of safe schools can also affect whether children attend. <a className={styles.citation} href={educationOverview}>UNICEF Nigeria education overview</a></p>
          <p>Top100’s programme page reports that 50+ children are back in school. The published figure has no reporting period or term-end attendance records. <Link className={styles.citation} href={programmePath}>Project100 programme figures</Link></p>
        </div>
        <aside className={styles.stat} aria-label="Nigeria’s primary school attendance context">
          <p className={report.eyebrow}>Nigeria · 2021 household survey</p>
          <p className={styles.statNumber}>About 1 in 4</p>
          <div className={styles.statMarks} aria-hidden="true"><span /><span /><span /><span /></div>
          <p>primary-school-age children were out of school in Nigeria.</p>
          <a className={styles.citation} href={situationAnalysis}>Nigeria’s 2024 child situation analysis</a>
        </aside>
      </section>

      <section id="stories" className={report.pathways} aria-labelledby="stories-heading">
        <div className={`${report.shell} ${report.section}`}>
          <p className={report.eyebrow}>Bayelsa and Delta</p>
          <h2 id="stories-heading">What Project100 did</h2>
          <div className={`${report.featureStory} ${styles.fieldStories}`}>
            <div className={styles.storyCopy}>
              <article className={report.prose}>
                <p className={report.eyebrow}>Toru-Orua, Bayelsa State</p>
                <h3>One term’s fees covered</h3>
                <p>Project100 volunteers reported paying one term’s school fees for a Grade 4 pupil whose family was struggling to pay. At a second school in the community, the team helped 20 students cover required charges.</p>
              </article>
              <article className={report.prose}>
                <p className={report.eyebrow}>Ugborikoko, Delta State</p>
                <h3>Books and pens for class</h3>
                <p>At Eyagbugba Primary School, the local team reported distributing exercise books and pens. Pupils received supplies they could use in class.</p>
              </article>
              <a className={report.textLink} href={project100OutreachSource}>Read Project100’s field updates <ArrowRight size={16} aria-hidden="true" /></a>
            </div>
            <figure className={styles.photo}>
              <Image src="/project100/outreach/22-delta.webp" alt="Students gathered in groups in a schoolyard during a Project100 visit in Delta State" width={800} height={600} sizes="(max-width: 760px) 100vw, (max-width: 1280px) 48vw, 640px" />
              <figcaption>Students gather for a school visit in Delta State. Photograph by Project100 Scholarship.</figcaption>
            </figure>
          </div>
        </div>
      </section>

      <section id="support" className={`${report.shell} ${report.section} ${report.actions}`} aria-labelledby="support-heading">
        <figure className={styles.photo}>
          <Image src={`${reportPath}/classroom.webp`} alt="Illustration of a teacher at the classroom door welcoming a pupil" width={1540} height={560} sizes="(max-width: 760px) 100vw, (max-width: 1280px) 48vw, 640px" />
          <figcaption>AI-generated illustration of a classroom welcome.</figcaption>
        </figure>
        <div className={report.prose}>
          <p className={report.eyebrow}>The programme</p>
          <h2 id="support-heading">Start with what the child needs</h2>
          <p>Project100 works with community leaders and educators to identify children who need support. When cost is the barrier, a fee payment, uniform or set of books can help a child take the next step.</p>
          <p>A child starting school for the first time needs a place suited to their age. A child returning after a break may also need help catching up. Schools can help families decide what fits and confirm when the child starts attending.</p>
          <Link className={report.textLink} href={programmePath}>Explore Project100 Scholarship <ArrowRight size={16} aria-hidden="true" /></Link>
        </div>
      </section>

      <section id="follow-up" className={report.caseStudy} aria-labelledby="follow-up-heading">
        <div className={`${report.shell} ${report.section}`}>
          <div className={report.caseIntro}>
            <div>
              <p className={report.eyebrow}>What comes next</p>
              <h2 id="follow-up-heading">Still in school a term later</h2>
            </div>
            <p className={report.lead}>Follow up with families and schools to see whether children have started or returned to school and whether they are still attending at term end.</p>
          </div>
          <ol className={styles.followUp}>
            {followUp.map(([stage, detail]) => <li key={stage}><h3>{stage}</h3><p>{detail}</p></li>)}
          </ol>
          <p className={styles.followUpNote}>Publish totals for children who started or returned, those still attending at term end, and those awaiting follow-up. Report support for pupils already in school separately and keep children’s identities private.</p>
        </div>
      </section>

      <section id="download" className={report.downloadSection} aria-labelledby="download-heading">
        <div className={`${report.shell} ${report.downloadInner}`}>
          <div>
            <h2 id="download-heading">Download the full report</h2>
            <p>Save the field stories, follow-up measures and linked references.</p>
          </div>
          <DownloadPdf />
        </div>
      </section>

      <section id="sources" className={`${report.shell} ${report.methods}`} aria-labelledby="sources-heading">
        <h2 id="sources-heading">Sources and methods</h2>
        <p>The report draws on public sources available through 26 November 2026. Project100 and its volunteers reported the programme figures and local activities. The review had no access to enrolment or attendance records. The two illustrations show fictional school scenes.</p>
        <ul>
          <li><Link href={programmePath}>Project100 programme and figures</Link></li>
          <li><a href={project100OutreachSource}>Project100 field accounts</a></li>
          <li><a href={situationAnalysis}>Nigeria’s 2024 child situation analysis</a></li>
          <li><a href={householdSurvey}>Nigeria’s 2021 household survey</a></li>
          <li><a href={educationOverview}>UNICEF Nigeria education overview</a></li>
        </ul>
      </section>
    </article>
  )
}
