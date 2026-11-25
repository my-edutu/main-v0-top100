import { z } from 'zod'

type Question = {
  name: string
  label: string
  type: 'text' | 'email' | 'tel' | 'url' | 'country' | 'textarea' | 'choice' | 'checkboxes' | 'confirmation'
  required?: boolean
  options?: readonly string[]
  hint?: string
  maxLength?: number
  autoComplete?: string
}

const expertise = [
  'Leadership and Governance', 'Entrepreneurship and Business Development', 'Technology, AI and Innovation',
  'Career Development and Employability', 'Scholarships, Education and Global Opportunities',
  'Finance, Investment and Wealth Creation', 'Personal Development and Productivity', 'Project Management',
  'Research and Academia', 'Public Policy and Development', 'Communication, Media and Personal Branding',
  'STEM and Engineering', 'Social Impact and Community Development', 'Sustainability and Climate Action',
  'International Relations and Diplomacy', 'Other',
]

export const communityApplicationSections = [
  { title: 'Personal information', questions: [
    { name: 'full_name', label: 'Full name', type: 'text', required: true, maxLength: 150, autoComplete: 'name' },
    { name: 'email', label: 'Email address', type: 'email', required: true, maxLength: 254, autoComplete: 'email' },
    { name: 'phone', label: 'Phone number (WhatsApp preferred)', type: 'tel', required: true, maxLength: 40, autoComplete: 'tel', hint: 'Include your country calling code.' },
    { name: 'country_code', label: 'Country of residence', type: 'country', required: true, autoComplete: 'country' },
    { name: 'region', label: 'State or region', type: 'text', maxLength: 150, autoComplete: 'address-level1' },
    { name: 'city', label: 'Current city', type: 'text', maxLength: 150, autoComplete: 'address-level2' },
    { name: 'linkedin', label: 'LinkedIn profile', type: 'url' },
    { name: 'website', label: 'Personal website, portfolio or other professional profile', type: 'url' },
  ] },
  { title: 'Professional background', questions: [
    { name: 'identity', label: 'What best describes your current professional identity?', type: 'choice', options: [
      'Corporate / Industry Professional', 'Entrepreneur / Business Owner', 'Founder / Startup Executive',
      'Academic / Researcher', 'Educator / Trainer', 'Consultant / Independent Professional',
      'Public Sector / Government Professional', 'Development Sector / NGO Professional', 'Creative / Media Professional',
      'Student / Young Professional', 'Other',
    ] },
    { name: 'organisation', label: 'Current organisation, company or institution', type: 'text', autoComplete: 'organization' },
    { name: 'job_title', label: 'Current role or professional title', type: 'text', autoComplete: 'organization-title' },
    { name: 'bio', label: 'Briefly tell us about yourself, your work and the impact you have made.', type: 'textarea', required: true },
    { name: 'expertise', label: 'Which areas best describe your expertise?', type: 'checkboxes', options: expertise },
  ] },
  { title: 'How you’d like to contribute', questions: [
    { name: 'contributions', label: 'In what ways would you be willing to contribute to the Community Impact Network?', type: 'checkboxes', options: [
      'Guest Speaker / Keynote Speaker', 'Workshop Facilitator / Masterclass Instructor', 'Webinar or Virtual Session Host',
      'Mentor to Top100 Awardees and Community Members', 'Event Organiser / Programme Coordinator',
      'Panelist / Fireside Chat Guest', 'Trainer / Capacity-Building Facilitator', 'Partnership and Institutional Connections',
      'Career Opportunities and Professional Referrals', 'Scholarship, Fellowship and Global Opportunity Connections',
      'Technical Support / Professional Services', 'Resource Person / Content Contributor', 'Community Engagement and Leadership', 'Other',
    ] },
    { name: 'topics', label: 'Which topics would you be comfortable speaking or facilitating sessions on?', type: 'checkboxes', options: expertise },
    { name: 'session_idea', label: 'What specific session, workshop or programme would you love to deliver to the Top100 community?', type: 'textarea', required: true,
      hint: 'For example, Building a Global Career from Africa, Navigating Fully Funded Scholarships, Building AI-Powered Businesses or Leadership in the 21st Century.' },
    { name: 'prior_experience', label: 'Have you previously spoken at events, facilitated workshops, mentored young people or led similar programmes?', type: 'choice', options: [
      'Yes, frequently', 'Yes, a few times', 'I have relevant experience but not in formal events', 'Not yet, but I am willing to contribute',
    ] },
    { name: 'work_links', label: 'Share links to previous speaking engagements, workshops, interviews, publications or relevant work.', type: 'textarea' },
  ] },
  { title: 'Events and programme engagement', questions: [
    { name: 'participation', label: 'How would you prefer to participate?', type: 'checkboxes', options: [
      'Virtual engagements', 'Physical / In-person events', 'Both virtual and physical engagements',
    ] },
    { name: 'frequency', label: 'How frequently would you be willing to contribute?', type: 'choice', options: [
      'Once a month', 'Once every two months', 'Once every quarter', 'Occasionally, when needed', 'Based on programme availability',
    ] },
    { name: 'organising', label: 'Would you be willing to organise or co-host an event, webinar, workshop or community programme with Top100?', type: 'choice', options: [
      'Yes, I can lead and organise programmes.', 'Yes, I can co-host or support programme delivery.',
      'I can facilitate sessions but not organise events.', 'I am open to discussing opportunities.',
    ] },
    { name: 'collaboration', label: 'Are there particular programmes or initiatives you would love to collaborate with Top100 on?', type: 'textarea' },
  ] },
  { title: 'Networks, resources and opportunities', questions: [
    { name: 'resources', label: 'Beyond speaking and mentorship, what other resources or opportunities could you make available to the Top100 community?', type: 'checkboxes', options: [
      'Access to professional networks', 'Internship and job opportunities', 'Scholarships, fellowships and international programmes',
      'Corporate and institutional partnerships', 'Access to industry experts and executives', 'Training resources and learning materials',
      'Professional services and technical expertise', 'Platforms, tools or technology resources', 'Event venues and logistics support',
      'Media visibility and publicity', 'Startup support and business opportunities', 'Other',
    ] },
    { name: 'resource_details', label: 'Tell us more about any specific opportunities, networks, resources or partnerships you could help facilitate.', type: 'textarea' },
  ] },
  { title: 'Final information', questions: [
    { name: 'motivation', label: 'Why would you like to be part of the Top100 Community Impact Network?', type: 'textarea', required: true },
    { name: 'additional_information', label: 'Is there anything else you would like us to know about your experience, interests or potential contributions?', type: 'textarea' },
    { name: 'source', label: 'How did you hear about the Community Impact Network?', type: 'choice', options: [
      'Top100 Africa Future Leaders', 'LinkedIn', 'Instagram', 'WhatsApp', 'Referral', 'Other',
    ] },
    { name: 'confirmation', type: 'confirmation', required: true,
      label: 'I understand that joining the Community Impact Network means expressing my willingness to contribute my knowledge, experience, time, networks or resources towards empowering young Africans through Top100 Africa Future Leaders. I understand that specific engagements will be discussed and agreed upon based on availability and programme needs.' },
  ] },
] as const satisfies readonly { title: string; questions: readonly Question[] }[]

type QuestionName = (typeof communityApplicationSections)[number]['questions'][number]['name']
export type CommunityQuestion = Question & { name: QuestionName }
type Answer = string | string[] | boolean
export type CommunityAnswers = Partial<Record<QuestionName, Answer>>

export function communityAnswerLimit(question: CommunityQuestion) {
  return question.maxLength ?? (question.type === 'textarea' ? 3000 : question.type === 'url' ? 500 : 200)
}

function answerSchema(question: CommunityQuestion): z.ZodType<Answer> {
  const options = question.options ?? []
  switch (question.type) {
    case 'confirmation':
      return z.literal(true, { error: 'Confirm that you understand how engagements are arranged.' })
    case 'checkboxes':
      return z.array(z.enum(options)).max(options.length)
        .refine(items => new Set(items).size === items.length, 'Select each option once.')
        .default([])
    case 'choice':
      return z.enum(['', ...options]).default('')
    case 'email':
      return z.string().trim().max(communityAnswerLimit(question)).pipe(z.email('Enter a valid email address.'))
    case 'tel':
      return z.string().trim().max(communityAnswerLimit(question))
        .refine(value => /^\+?[\d().\s-]+$/.test(value) && /^\d{7,15}$/.test(value.replace(/\D/g, '')), 'Enter a valid phone number.')
    case 'country':
      return z.string().regex(/^[A-Z]{2}$/, 'Select your country of residence.')
    case 'url':
      return z.string().trim().max(communityAnswerLimit(question))
        .transform(value => value && !/^[a-z][a-z\d+.-]*:/i.test(value) ? 'https://' + value : value)
        .pipe(z.union([z.literal(''), z.url({ protocol: /^https?$/, hostname: z.regexes.domain })], { error: 'Enter a valid website address.' }))
        .default('')
    default: {
      const text = z.string().trim().max(communityAnswerLimit(question))
      return question.required ? text.min(1, 'This answer is required.') : text.default('')
    }
  }
}

export const communityAnswerSchemas = Object.fromEntries(
  communityApplicationSections.flatMap(({ questions }) =>
    (questions as readonly CommunityQuestion[]).map(question => [question.name, answerSchema(question)] as const)
  )
) as Record<QuestionName, z.ZodType<Answer>>

export const communityApplicationSchema = z.object({
  version: z.literal(2),
  answers: z.object(communityAnswerSchemas),
})
export type CommunityApplicationDetails = z.infer<typeof communityApplicationSchema>
