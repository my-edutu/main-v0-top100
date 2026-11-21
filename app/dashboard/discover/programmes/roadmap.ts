import { memberCalendar } from '@/lib/programme-manager/member-calendar'

type ProgrammeCopy = {
  slug: string
  title?: string
  summary: string
  description: string
}

const copy: Record<string, ProgrammeCopy> = {
  'project100-route-qualification-and-conditional-school-return-pilot': {
    slug: 'project100-education-access',
    summary: 'Help children facing poverty and life on the streets get back to school and stay there.',
    description: 'Imagine you’re ready to go back to class, but your family can’t afford a uniform or books. For a child who spends their days on the street, costs like these can keep school out of reach. Project100 aims to help children facing these barriers return to class.',
  },
  'community-impact-network': {
    slug: 'community-impact-onboarding',
    summary: 'Find a role, a cause and a local team to work with.',
    description: 'The network connects Top100 members with community projects. Members can share where they’re based, which causes they care about and how they’d like to contribute.',
  },
  '2027-leadership-kickoff-and-impact-orientation': {
    slug: 'leadership-kickoff',
    summary: 'Get oriented for the year and explore ways to volunteer.',
    description: 'The virtual kickoff will introduce the year’s planned activities and help members identify where their skills, interests and time can support local projects.',
  },
  'career-pathways': {
    slug: 'career-pathways-cohort-1',
    summary: 'Build a career plan through a six-week online pilot.',
    description: 'The first cohort will focus on career direction, practical assignments and mentor feedback. Participants will work through next steps they can use after the lab.',
  },
  'cv-interview-and-linkedin-clinic': {
    slug: 'career-clinic',
    summary: 'Refine your CV, practise interviews and improve your profile.',
    description: 'This online clinic will help members review application materials, practise presenting their experience and identify specific improvements to make after the session.',
  },
  'africa-youth-leadership-opportunity-forum': {
    slug: 'youth-leadership-forum',
    summary: 'Explore leadership opportunities with peers across Africa.',
    description: 'The forum will bring young leaders together online to exchange ideas, discuss routes into opportunities and identify practical ways to follow up after the event.',
  },
  'girls-in-stem-mentorship-launch': {
    slug: 'girls-in-stem-mentorship',
    summary: 'Connect girls exploring STEM with mentors in the field.',
    description: 'The launch will introduce a planned mentoring programme for girls interested in science and technology. Mentoring places depend on mentor capacity and safeguarding arrangements.',
  },
  'africa-future-leaders-campus-summit-2-day-lagos-pilot': {
    slug: 'campus-summit',
    summary: 'A planned two-day Lagos pilot for campus-led action.',
    description: 'The summit will bring campus leaders together to exchange ideas and turn priorities into action plans. The dates and venue will be shared once the pilot is confirmed.',
  },
  'research-collaboration-forum': {
    slug: 'research-collaboration',
    summary: 'Meet researchers across campuses and shape joint projects.',
    description: 'The online forum will give participants a place to share research interests, identify common questions and explore forming cross-campus teams.',
  },
  'entrepreneurship-and-digital-skills-month': {
    slug: 'entrepreneurship-digital-skills',
    summary: 'Use digital skills to develop a practical business idea.',
    description: 'A series of online activities will help members practise entrepreneurship and digital skills. The focus is on making something useful, such as a prototype, pitch or piece of work for a portfolio.',
  },
  'ai-for-africa-bootcamp': {
    slug: 'ai-for-africa',
    summary: 'Practise applying AI to real problems through guided exercises.',
    description: 'This online bootcamp will introduce practical applications of AI. Participants will work through assessed exercises using examples that don’t require sharing sensitive data.',
  },
  'campus-impact-lab-pilot-host-1': {
    slug: 'campus-impact-lab-june',
    summary: 'Help a campus team deliver and review a local project.',
    description: 'The June pilot will support a host campus team in planning and delivering a small community project. The team will review what happened after delivery, with the host partner’s approval.',
  },
  'volunteer-action-day-wave-1': {
    slug: 'volunteer-action-day',
    summary: 'Take part in a practical, partner-led activity close to home.',
    description: 'Local groups will coordinate volunteer activities with host partners. Teams will record what they did and what changed so future volunteers can build on the work.',
  },
  'africa-community-impact-challenge-launch': {
    slug: 'community-impact-challenge',
    summary: 'Turn a community idea into a project with coaching.',
    description: 'The challenge will invite teams to propose solutions to local problems. Selected teams will receive guidance to define their projects, take practical steps and track results.',
  },
  'climate-action-campus-challenge': {
    slug: 'climate-campus-challenge',
    summary: 'Work with a campus team on a measurable climate action.',
    description: 'Participants will plan a local environmental activity, agree how to deliver it responsibly and record a concrete result.',
  },
  'women-in-leadership-and-girls-in-stem-forum': {
    slug: 'women-in-leadership-and-stem',
    summary: 'Hear from women leaders and build mentorship connections.',
    description: 'The forum will bring together women working in leadership and STEM to share experiences, discuss progression and connect with people looking for mentorship.',
  },
  'public-health-and-wellbeing-forum': {
    slug: 'public-health-wellbeing',
    summary: 'Discuss practical public health and wellbeing topics online.',
    description: 'The forum is an educational discussion about public health and wellbeing. It will help participants reflect on what they learned and identify useful resources to explore afterward.',
  },
  'campus-impact-lab-pilot-host-2': {
    slug: 'campus-impact-lab-september',
    summary: 'Put lessons from the first campus pilot into practice.',
    description: 'Subject to a review of the June pilot, a second host campus will deliver a local project and document results after completion.',
  },
  'cross-border-youth-opportunity-labs-prototype': {
    slug: 'cross-border-opportunity-labs',
    summary: 'Collaborate online with youth teams from another country.',
    description: 'This prototype will connect teams across two countries to develop a joint project and reflect on what helped them collaborate across borders.',
  },
  'career-pathways-labs-cohort-2': {
    slug: 'career-pathways-cohort-2',
    summary: 'A second career-development cohort informed by the pilot.',
    description: 'The follow-up cohort is planned after the first lab is evaluated. It will build on the initial pilot’s approach to career planning, assignments and mentor feedback.',
  },
  'nonpartisan-civic-participation-dialogue': {
    slug: 'civic-participation',
    summary: 'Discuss civic participation and plan community actions.',
    description: 'The online dialogue will explore how people can take part in civic life and turn shared ideas into practical local action plans. It is a nonpartisan event.',
  },
  'africa-future-leaders-festival-awards': {
    slug: 'future-leaders-festival-awards',
    summary: 'Celebrate leadership and see community projects on display.',
    description: 'The planned festival will bring the Top100 community together for recognition and an impact exhibition. Dates, location and participation details will be announced once confirmed.',
  },
  'stories-with-receipts-impact-exhibition': {
    slug: 'stories-with-receipts',
    summary: 'Explore documented stories from community projects.',
    description: 'The exhibition will share accounts of community projects backed by evidence. Stories will be checked and published with the permission of the people involved.',
  },
  '2027-impact-finance-and-learning-report': {
    slug: 'impact-finance-learning-report',
    summary: 'See what was delivered, spent and learned during the year.',
    description: 'The annual report will bring together verified results, financial information and lessons from the year. It will describe the limits of the evidence and set out decisions for 2028.',
  },
  'community-recognition-and-2028-planning-assembly': {
    slug: 'community-recognition-planning',
    summary: 'Recognise contributors and help shape the next year.',
    description: 'Community members will come together online to recognise contributions, reflect on the year’s work and agree who will take responsibility for the 2028 priorities.',
  },
}

export const programmes = memberCalendar.map(({ id, title, month, format }) => {
  const details = copy[id]
  const slug = details?.slug ?? id
  return {
    id,
    slug,
    anchor: id === 'career-pathways' ? id : `plan-${id}`,
    title: details?.title ?? title,
    month,
    format,
    summary: details?.summary,
    description: details?.description,
    status: id === 'community-impact-network' ? 'Interest open' : 'Planned',
  }
})
