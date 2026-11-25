import { describe, expect, it } from 'vitest'
import { formatEdutuDescription } from '@/lib/opportunities/edutu-description'

const title = 'University of Bergen Free Online Courses 2026–2027'
const intro = 'The University of Bergen offers seven free courses. Learners can study flexibly.'

describe('Edutu detail formatting', () => {
  it('removes repeated titles and summary fragments and formats headings, lists and course durations', () => {
    const description = [
      title, intro, title + ' in Norway (Free Certificates)', 'Available Online Courses',
      'The university lists seven courses:', 'Course', 'Weekly study', 'Climate Science', '3 weeks',
      '3 hours', 'Global Health', 'Eligibility Criteria', 'Open worldwide.', 'No minimum GPA.',
      'Application Process', 'Choose a course', 'Read the course requirements.',
      'Choose a courseRead the course requirements.',
    ].join('\n\n')

    const sections = formatEdutuDescription(title, title + ' The University of Bergen offers seven free courses.', description)
    expect(sections[0]).toEqual({ heading: '', blocks: [{ type: 'paragraph', text: intro }] })
    expect(sections[1]).toMatchObject({
      heading: 'Available Online Courses',
      blocks: [{ type: 'paragraph', text: 'The university lists seven courses:' }, { type: 'list', items: [
        'Climate Science · 3 weeks · 3 hours', 'Global Health',
      ] }],
    })
    expect(sections[2]).toEqual({ heading: 'Eligibility Criteria', blocks: [
      { type: 'list', items: ['Open worldwide.', 'No minimum GPA.'] },
    ] })
    expect(sections[3].blocks).toEqual([
      { type: 'paragraph', text: 'Choose a course' }, { type: 'paragraph', text: 'Read the course requirements.' },
    ])
  })

  it('keeps an independent summary and preserves unknown content as readable paragraphs', () => {
    expect(formatEdutuDescription(title, 'A separate summary.', 'Region-specific requirements remain.')).toEqual([
      { heading: '', blocks: [
        { type: 'paragraph', text: 'A separate summary.' },
        { type: 'paragraph', text: 'Region-specific requirements remain.' },
      ] },
    ])
  })
})
