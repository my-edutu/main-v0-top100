import type { LucideIcon } from 'lucide-react'
import {
  Award,
  Handshake,
  HeartHandshake,
  Megaphone,
} from 'lucide-react'

export type ApplicationType = 'awardee' | 'ambassador' | 'partnership' | 'volunteer'

/**
 * The awardee cohort is collected in Google Forms, not the in-app form. Any
 * awardee entry point must send people here; /apply/awardee only redirects.
 */
export const APPLY_AWARDEE_FORM_URL =
  'https://docs.google.com/forms/d/e/1FAIpQLSdTIAykgX5z6Gj6sRkxyGQs5A43poO7Lo8xmxdLHeJ3nx0EYw/viewform'

export type ApplicationFieldType = 'text' | 'email' | 'tel' | 'url' | 'textarea'

export type ApplicationField = {
  name: string
  label: string
  type: ApplicationFieldType
  placeholder: string
  helper?: string
  required?: boolean
  rows?: number
  autoComplete?: string
  span?: 1 | 2
}

export type ApplicationProgram = {
  type: ApplicationType
  badge: string
  title: string
  summary: string
  description: string
  href: string
  /** Set when the route is collected off-site; `href` then only redirects here. */
  externalFormUrl?: string
  image: string
  imagePosition: string
  icon: LucideIcon
  accent: string
  showcase: string[]
  highlights: Array<{
    title: string
    description: string
  }>
  steps: Array<{
    title: string
    description: string
  }>
  fields: ApplicationField[]
  submitLabel: string
  adminNote: string
}

export type ApplicationFormProgram = Pick<
  ApplicationProgram,
  'type' | 'badge' | 'href' | 'accent' | 'fields' | 'submitLabel' | 'adminNote'
>

export const applicationOrder: ApplicationType[] = ['awardee', 'ambassador', 'partnership', 'volunteer']

export const applicationPrograms: Record<ApplicationType, ApplicationProgram> = {
  awardee: {
    type: 'awardee',
    badge: 'Top100 Awardee',
    title: 'Apply for the Top100 awardee cohort.',
    summary: 'Share your leadership story, academic details, and impact so the Top100 team can review your nomination.',
    description:
      'This pathway is for students and early-career leaders with measurable community impact. Every submission lands in the admin review queue for selection, follow-up, and approval.',
    href: '/apply/awardee',
    externalFormUrl: APPLY_AWARDEE_FORM_URL,
    image: '/top100 magazine.webp',
    imagePosition: 'center 22%',
    icon: Award,
    accent: 'from-orange-500 via-orange-500 to-amber-500',
    showcase: ['Mentorship', 'Visibility', 'Leadership network'],
    highlights: [
      {
        title: 'Admin reviewed',
        description: 'Applications go straight to the team that manages awardee intake and approvals.',
      },
      {
        title: 'Built for impact',
        description: 'Tell us what you have built, changed, or led, not just your grades.',
      },
      {
        title: 'Community first',
        description: 'Approved applicants join a network of peers, mentors, and opportunities.',
      },
    ],
    steps: [
      {
        title: 'Complete the form',
        description: 'Add your profile, institution, and a short impact story in one sitting.',
      },
      {
        title: 'Team review',
        description: 'The admin team checks fit, context, and completeness before a decision is made.',
      },
      {
        title: 'Shortlist and onboarding',
        description: 'If you are approved, we follow up with the next steps and member access.',
      },
    ],
    fields: [
      { name: 'fullName', label: 'Full name', type: 'text', placeholder: 'Your name', required: true, autoComplete: 'name', span: 1 },
      { name: 'email', label: 'Email address', type: 'email', placeholder: 'you@example.com', required: true, autoComplete: 'email', span: 1 },
      { name: 'country', label: 'Country', type: 'text', placeholder: 'Nigeria', required: true, autoComplete: 'country-name', span: 1 },
      { name: 'institution', label: 'Institution', type: 'text', placeholder: 'University or school', required: true, span: 1 },
      { name: 'fieldOfStudy', label: 'Field of study', type: 'text', placeholder: 'Engineering, law, design...', required: true, span: 1 },
      { name: 'phone', label: 'Phone number', type: 'tel', placeholder: '+234...', autoComplete: 'tel', span: 1 },
      { name: 'linkedin', label: 'LinkedIn or portfolio', type: 'url', placeholder: 'https://linkedin.com/in/yourname', helper: 'Optional, but helps the admin team verify your presence.', span: 2 },
      { name: 'impactStory', label: 'Impact story', type: 'textarea', placeholder: 'Tell us what you have built, led, or changed in your community.', helper: 'Keep this concrete. Outcomes matter.', required: true, rows: 4, span: 2 },
      { name: 'whyJoin', label: 'Why Top100?', type: 'textarea', placeholder: 'Why do you want to join the Top100 network?', helper: 'What would you contribute if selected?', required: true, rows: 4, span: 2 },
    ],
    submitLabel: 'Submit awardee application',
    adminNote: 'Sent directly to the Top100 review queue for admin follow-up and approval.',
  },
  ambassador: {
    type: 'ambassador',
    badge: 'Ambassadorship',
    title: 'Apply to represent Top100 in your community.',
    summary: 'Become the local face of the network and help activate leadership conversations where you are.',
    description:
      'Ambassadors connect chapters, campuses, and communities. The form below helps the admin team understand your reach, energy, and ability to activate others.',
    href: '/apply/ambassador',
    image: '/young-african-man-business-leader.jpg',
    imagePosition: 'center 18%',
    icon: Megaphone,
    accent: 'from-orange-500 via-orange-500 to-amber-500',
    showcase: ['Campus activation', 'Community outreach', 'Event hosting'],
    highlights: [
      {
        title: 'Chapter builder',
        description: 'Ambassadors help spark local activity, storytelling, and referrals.',
      },
      {
        title: 'Visibility with purpose',
        description: 'You will help represent the brand while building real community value.',
      },
      {
        title: 'Admin matched',
        description: 'We review your profile and assign you to a role that matches your strengths.',
      },
    ],
    steps: [
      {
        title: 'Tell us where you lead',
        description: 'Share your chapter, campus, city, or community base.',
      },
      {
        title: 'Show your activation plan',
        description: 'We want to see how you would bring people into the network.',
      },
      {
        title: 'Admin review and onboarding',
        description: 'The team reviews the submission and responds with the next steps.',
      },
    ],
    fields: [
      { name: 'fullName', label: 'Full name', type: 'text', placeholder: 'Your name', required: true, autoComplete: 'name', span: 1 },
      { name: 'email', label: 'Email address', type: 'email', placeholder: 'you@example.com', required: true, autoComplete: 'email', span: 1 },
      { name: 'country', label: 'Country', type: 'text', placeholder: 'Ghana', required: true, autoComplete: 'country-name', span: 1 },
      { name: 'chapter', label: 'City, campus, or chapter', type: 'text', placeholder: 'Accra / University of...', required: true, span: 1 },
      { name: 'organization', label: 'Organization or institution', type: 'text', placeholder: 'School, company, or community group', span: 2 },
      { name: 'phone', label: 'Phone number', type: 'tel', placeholder: '+233...', autoComplete: 'tel', span: 1 },
      { name: 'linkedin', label: 'LinkedIn or social profile', type: 'url', placeholder: 'https://linkedin.com/in/yourname', span: 1 },
      { name: 'motivation', label: 'Why ambassadorship?', type: 'textarea', placeholder: 'What draws you to represent Top100?', helper: 'Tell us what you want to build or amplify.', required: true, rows: 4, span: 2 },
      { name: 'activationPlan', label: 'Activation plan', type: 'textarea', placeholder: 'How would you grow the community where you are?', helper: 'Events, storytelling, referrals, or chapter support.', rows: 4, span: 2 },
    ],
    submitLabel: 'Submit ambassador application',
    adminNote: 'This is routed to the admin team for chapter assignment and review.',
  },
  partnership: {
    type: 'partnership',
    badge: 'Partnerships',
    title: 'Partner with Top100 on a shared mission.',
    summary: 'We work with brands, institutions, and impact teams that want to back Africa’s next generation of leaders.',
    description:
      'Use this form to share your partnership idea, sponsorship interest, or collaboration brief. The admin team reviews every inquiry and replies directly.',
    href: '/partnership',
    image: '/Africa Future leaders festival.png',
    imagePosition: 'center center',
    icon: Handshake,
    accent: 'from-orange-500 via-orange-500 to-amber-500',
    showcase: ['Co-created campaigns', 'Brand visibility', 'Impact partnerships'],
    highlights: [
      {
        title: 'Strategy-led',
        description: 'We focus on collaborations that create tangible value for the network and your brand.',
      },
      {
        title: 'Fast admin review',
        description: 'Partnership inquiries are routed to the team that handles incoming collaborations.',
      },
      {
        title: 'Clear follow-up',
        description: 'You will hear back with a concrete next step rather than a generic form receipt.',
      },
    ],
    steps: [
      {
        title: 'Share your brief',
        description: 'Tell us what you want to sponsor, activate, or co-create.',
      },
      {
        title: 'Admin review',
        description: 'The team checks fit, timing, and the practical next step.',
      },
      {
        title: 'Conversation and close',
        description: 'If aligned, we move into a direct conversation with the relevant lead.',
      },
    ],
    fields: [
      { name: 'contactName', label: 'Contact name', type: 'text', placeholder: 'Your full name', required: true, autoComplete: 'name', span: 1 },
      { name: 'email', label: 'Work email', type: 'email', placeholder: 'you@organisation.com', required: true, autoComplete: 'email', span: 1 },
      { name: 'organization', label: 'Organization', type: 'text', placeholder: 'Company, foundation, or institution', required: true, span: 1 },
      { name: 'website', label: 'Website', type: 'url', placeholder: 'https://yourorganization.com', span: 1 },
      { name: 'partnershipFocus', label: 'Partnership focus', type: 'textarea', placeholder: 'What do you want to support or co-create?', helper: 'Tell us whether this is sponsorship, media, programming, or in-kind support.', required: true, rows: 4, span: 2 },
      { name: 'supportType', label: 'Support type', type: 'text', placeholder: 'Funding, media, events, scholarships, volunteering...', span: 1 },
      { name: 'message', label: 'Brief details', type: 'textarea', placeholder: 'Add any timing, budget, or collaboration notes.', rows: 4, span: 2 },
    ],
    submitLabel: 'Send partnership inquiry',
    adminNote: 'Partnership inquiries are stored in the admin inbox and emailed to the partnerships lead.',
  },
  volunteer: {
    type: 'volunteer',
    badge: 'Volunteering',
    title: 'Offer your time and skills to the network.',
    summary: 'Join community events, editorial support, research, and activation work that helps the network run smoothly.',
    description:
      'Volunteers support production, storytelling, and community logistics. We review each submission so we can match you to a useful role.',
    href: '/apply/volunteer',
    image: '/young-african-woman-social-entrepreneur.jpg',
    imagePosition: 'center 18%',
    icon: HeartHandshake,
    accent: 'from-orange-500 via-orange-500 to-amber-500',
    showcase: ['Events support', 'Storytelling', 'Community care'],
    highlights: [
      {
        title: 'Skills matched',
        description: 'We try to place you where your strengths will actually matter.',
      },
      {
        title: 'Flexible roles',
        description: 'Choose the kind of support you can give and the rhythm that works for you.',
      },
      {
        title: 'Admin routing',
        description: 'Submissions go to the review queue so the right team can respond.',
      },
    ],
    steps: [
      {
        title: 'Tell us your availability',
        description: 'Share when and how you can contribute.',
      },
      {
        title: 'Describe your strengths',
        description: 'We want to know what you are great at and what you want to learn.',
      },
      {
        title: 'Get matched',
        description: 'If there is a fit, the team will follow up with a role or project.',
      },
    ],
    fields: [
      { name: 'fullName', label: 'Full name', type: 'text', placeholder: 'Your name', required: true, autoComplete: 'name', span: 1 },
      { name: 'email', label: 'Email address', type: 'email', placeholder: 'you@example.com', required: true, autoComplete: 'email', span: 1 },
      { name: 'phone', label: 'Phone number', type: 'tel', placeholder: '+234...', autoComplete: 'tel', span: 1 },
      { name: 'country', label: 'Country', type: 'text', placeholder: 'Kenya', required: true, autoComplete: 'country-name', span: 1 },
      { name: 'city', label: 'City', type: 'text', placeholder: 'Nairobi', span: 1 },
      { name: 'availability', label: 'Availability', type: 'text', placeholder: 'Weekends, evenings, or specific months', required: true, span: 1 },
      { name: 'skills', label: 'Skills you bring', type: 'textarea', placeholder: 'Design, logistics, copywriting, research, community building...', helper: 'List the skills that would help the team.',
        required: true,
        rows: 4,
        span: 2,
      },
      { name: 'whyVolunteer', label: 'Why volunteer?', type: 'textarea', placeholder: 'What do you want to contribute to the Top100 community?', rows: 4, span: 2 },
    ],
    submitLabel: 'Submit volunteer interest',
    adminNote: 'Volunteer submissions are routed to the admin review queue for matching.',
  },
}

const sanitize = (value: string | undefined | null) => {
  if (!value) return 'Not provided'
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : 'Not provided'
}

export function getApplicationProgram(type: string | null | undefined) {
  if (!type) return null
  return applicationPrograms[type as ApplicationType] ?? null
}

export function buildApplicationSubject(program: Pick<ApplicationProgram, 'type' | 'badge' | 'fields'>, values: Record<string, string>) {
  const name = sanitize(values[program.type === 'partnership' ? 'contactName' : 'fullName'])
  const org = sanitize(values.organization)
  if (org !== 'Not provided' && org !== name) {
    return `${program.badge} application - ${name} (${org})`
  }
  return `${program.badge} application - ${name}`
}

export function buildApplicationMessage(program: Pick<ApplicationProgram, 'badge' | 'href' | 'fields'>, values: Record<string, string>) {
  const lines = [
    `Application Type: ${program.badge}`,
    `Route: ${program.href}`,
    '',
    ...program.fields.map((field) => `${field.label}: ${sanitize(values[field.name])}`),
    '',
    `Submitted through the Top100 Africa Future Leaders public application gateway.`,
  ]

  return lines.join('\n')
}

export const applicationEntryCards = applicationOrder.map((type) => applicationPrograms[type])
