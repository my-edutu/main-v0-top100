import type { Metadata } from "next"
import Link from "next/link"
import Image from "@/components/safe-image"
import { ArrowDown, ArrowDownToLine, ArrowRight, ArrowUpRight } from "lucide-react"
import { SITE_URL } from "@/lib/site"
import styles from "../beyond-recognition/report.module.css"

const title = "The Africa Future Leaders Opportunity Report 2027"
const description = "How young African leaders find, access and turn opportunities into progress"
export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: `${SITE_URL}/reports/opportunity-2027` },
  openGraph: { title, description, url: `${SITE_URL}/reports/opportunity-2027`, images: ["/IMG_0676.jpg"] },
}

const contents = [["overview", "What Top100 helped make possible"], ["partnership", "EmpowHER"], ["stories", "Awardee stories"], ["evidence", "Why access matters"], ["research", "2027 research"], ["download", "Download"]] as const

const awardeeCases = [
  { name: "Natnael Dechasa Gemeda", field: "Assistive technology · Ethiopia", slug: "natnael-dechasa-gemeda", summary: "His profile describes locally manufactured prosthetics. A UNDP cohort booklet also documents his assistive technology work." },
  { name: "Mwanamkasi Masudi Mfunga", field: "Community programmes · Kenya", slug: "mwanamkasi-masudi-mfunga", summary: "Her profile describes working with schools and volunteers on education, menstrual health and youth mentoring through Hold My Hand Coast Initiative." },
  { name: "Ada Zo’o Vanessa Lucie", field: "STEM and mentorship · Cameroon", slug: "ada-zo-o-vanessa-lucie", summary: "Her profile describes mentoring young people in STEM and connecting them with information about scholarships and fellowships." },
  { name: "Eniola Afanu", field: "Student financial support · Nigeria", slug: "eniola-afanu", summary: "Her profile describes a campaign to help University of Lagos students affected by tuition increases and a separate digital scholarship partnership." },
  { name: "Esther Enow Laetitia Egbenchong II", field: "Climate resilience · Cameroon", slug: "esther-enow-laetitia-egbenchong-ii", summary: "Her profile connects research on flooding in Buea and Limbe I with community environmental work and waste reuse." },
]

function Download() {
  return <a className={styles.downloadButton} href="/reports/opportunity-2027.pdf" download="Africa Future Leaders Opportunity Report 2027.pdf"><ArrowDownToLine size={18} aria-hidden="true" /> Download PDF</a>
}

export default function OpportunityReportPage() {
  return (
    <main className={styles.report}>
      <section className={styles.hero} aria-labelledby="report-title">
        <Image className={styles.heroImage} src="/IMG_0676.jpg" alt="" fill sizes="100vw" loading="eager" fetchPriority="high" />
        <div className={`${styles.shell} ${styles.heroInner}`}>
          <p className={styles.eyebrow}>Research baseline · November 2026</p>
          <h1 id="report-title">Africa Future Leaders <em>Opportunity Report 2027</em></h1>
          <p className={styles.heroSubtitle}>{description}</p>
          <Download />
          <a className={styles.heroRead} href="#overview">Read the report online <ArrowDown size={17} aria-hidden="true" /></a>
        </div>
      </section>
      <nav aria-label="In this report" className={styles.contents}><div className={styles.shell}><ul>{contents.map(([id,label]) => <li key={id}><a href={`#${id}`}>{label}</a></li>)}</ul></div></nav>

      <section id="overview" className={`${styles.shell} ${styles.section} ${styles.overview}`}>
        <div className={styles.prose}><p className={styles.eyebrow}>Executive summary</p>
          <h2>What Top100 helped make possible</h2>
          <p className={styles.lead}>Through EmpowHER, final-year women in STEM in Nigeria had a place to train, work with mentors, and present their ideas. Top100 partnered with SWIS Africa to deliver the programme.</p>
          <p>One team designed and ran a survey. Another pitched a plan to improve women’s representation in a Nigerian STEM workplace. The showcase gave fellows a chance to demonstrate their skills and defend their ideas.</p>
          <a className={styles.textLink} href="#partnership">Explore the partnership <ArrowDown size={16} aria-hidden="true" /></a>
        </div>
        <figure className={styles.chart}>
          <figcaption><h3>What the partnership delivered</h3></figcaption>
          <dl className={styles.chartRows}>
            <div><dt><strong>44 women selected</strong></dt><dd>Final-year STEM students from across Nigeria.</dd></div>
            <div><dt><strong>10 team projects presented</strong></dt><dd>Fellows shared work across research, industry and entrepreneurship.</dd></div>
          </dl>
          <a href="https://www.swisafrica.org/post/from-classroom-to-showcase-swis-empowher-fellows-present-their-final-projects">SWIS Africa’s programme reporting</a>
        </figure>
      </section>

      <section id="partnership" className={styles.caseStudy}><div className={`${styles.shell} ${styles.section}`}>
        <div className={styles.caseIntro}><div><p className={styles.eyebrow}>Partnership · Nigeria</p><h2>A defined route into STEM careers</h2></div><p className={styles.lead}>SWIS Africa and Top100 partnered on EmpowHER, giving final-year women in STEM access to a programme of training and mentoring.</p></div>
        <dl className={styles.caseStats}><div><dt>Women selected</dt><dd>44</dd></div><div><dt>Career streams</dt><dd>3</dd></div><div><dt>Team projects presented</dt><dd>10</dd></div></dl>
        <p className={styles.caseNote}>SWIS Africa reports these figures for the partnership cohort. Individual referral routes and later career outcomes are unavailable in the public sources reviewed.</p>
        <div className={styles.caseDetails}><div><h3>Training and mentorship</h3><p>Participants could explore academic, industry and entrepreneurial pathways.</p><a className={styles.textLink} href="https://www.swisafrica.org/post/swis-africa-selects-44-women-for-inaugural-empowher-program">Read the cohort report <ArrowUpRight size={16} /></a></div><div><h3>Work produced</h3><p>Fellows presented projects including an original survey and workplace representation proposals.</p><a className={styles.textLink} href="https://www.swisafrica.org/post/from-classroom-to-showcase-swis-empowher-fellows-present-their-final-projects">Explore the showcase <ArrowUpRight size={16} /></a></div></div>
      </div></section>

      <section id="stories" className={`${styles.shell} ${styles.section}`}><p className={styles.eyebrow}>Awardee stories</p><h2>Different journeys into opportunity</h2>
        <p>The report profiles five awardees across four countries and two cohorts. Their public profiles show the work Top100 can help make visible and connect to partners.</p>
        <div className={styles.storyGrid}>
          {awardeeCases.map(({ name, field, summary, slug }) => (
            <article className={styles.prose} key={slug}>
              <p className={styles.eyebrow}>{field}</p>
              <h3>{name}</h3>
              <p>{summary}</p>
              <Link className={styles.textLink} href={`/awardees/${slug}`}>Read the awardee profile <ArrowRight size={16} aria-hidden="true" /></Link>
            </article>
          ))}
        </div>
      </section>

      <section id="evidence" className={styles.pathways}><div className={`${styles.shell} ${styles.section}`}>
        <p className={styles.eyebrow}>The evidence</p><h2>Opportunity has many forms</h2>
        <ol className={styles.pathwayList}>
          <li><h3>Work quality matters</h3><p>The Africa Youth Employment Outlook describes substantial informal and low-paying youth work. Pay, stability and progression matter alongside access.</p><a className={styles.textLink} href="https://mastercardfdn.org/en/our-research/africa-youth-employment-outlook-2026/">Read the outlook <ArrowUpRight size={16} /></a></li>
          <li><h3>Barriers vary</h3><p>Afrobarometer identifies training, experience and skill mismatches among barriers reported by young people, with differences across countries and groups.</p><a className={styles.textLink} href="https://www.afrobarometer.org/publication/pp98-from-aspiration-to-action-barriers-to-youth-empowerment-in-africa/">Read the research <ArrowUpRight size={16} /></a></li>
          <li><h3>Networks can help</h3><p>Public profiles and interviews make work discoverable. Top100 plans to connect awardees and employers through Emerging Talent.</p><Link className={styles.textLink} href="/blog/from-skills-to-paid-work">Explore the plans <ArrowRight size={16} /></Link></li>
          <li><h3>Follow the outcome</h3><p>Record introductions, applications, offers and starts separately. A follow-up can show what continues and where a process stalls.</p></li>
        </ol>
      </div></section>

      <section id="research" className={`${styles.shell} ${styles.section} ${styles.actions}`}>
        <figure><Image src="/IMG_0672.jpg" alt="Attendees speaking at the 2025 Top100 event" width={1200} height={674} sizes="(min-width: 900px) 48vw, 100vw" /><figcaption>Top100 Africa Future Leaders event, 2025</figcaption></figure>
        <div className={styles.prose}><p className={styles.eyebrow}>Proposed 2027 research</p><h2>Follow what happens next</h2><p>Top100 reports a community of around 1,000 awardees. The proposed study would use the register to invite awardees across cohorts and fields, then publish how many were invited and how many responded.</p><p>With consent, follow applications and referrals at 90 and 180 days. Count interviews, offers, paid starts and project milestones separately, and confirm a sample with partners.</p><p>Findings would describe the people who participate. A broader sampling design would be needed to represent young Africans across the continent.</p><Link className={styles.textLink} href="/partnership">Partner with Top100 <ArrowRight size={16} /></Link></div>
      </section>
      <section id="download" className={styles.downloadSection}><div className={`${styles.shell} ${styles.section} ${styles.downloadInner}`}><div><h2>Download the full report</h2><p>See what Top100 and its partners delivered, what awardees are building, and how the 2027 study could track progress.</p></div><Download /></div></section>
      <section className={`${styles.shell} ${styles.methods}`}><h2>Sources and methods</h2><p>Published sources were reviewed through 25 November 2026. No new survey, interviews or outcome evaluation were conducted for this baseline. Awardee cases illustrate different pathways and are not representative estimates.</p><ul><li><a href="https://mastercardfdn.org/en/our-research/africa-youth-employment-outlook-2026/">Africa Youth Employment Outlook</a></li><li><a href="https://www.afrobarometer.org/publication/pp98-from-aspiration-to-action-barriers-to-youth-empowerment-in-africa/">Afrobarometer</a></li><li><a href="https://www.swisafrica.org/post/swis-africa-selects-44-women-for-inaugural-empowher-program">SWIS Africa</a></li></ul></section>
    </main>
  )
}
