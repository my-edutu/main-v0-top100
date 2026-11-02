import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { SessionCourseContent } from '@/app/dashboard/discover/event-videos/[slug]/session-course-content'
import { SessionQuiz } from '@/app/dashboard/discover/event-videos/[slug]/session-quiz'
import { getSessionBySlug, getSessionsByYear } from '@/lib/sessions'

describe('session learning content', () => {
  it('unlocks Recognition to Leadership from the calendar and retains the recording and speaker', () => {
    const session = getSessionsByYear([{
      id: 'leadership-calendar-event',
      title: 'From Recognition to Leadership: Practical Steps to Becoming a Leader of Impact in Life and Workplace',
      startAt: '2026-10-20T18:00:00Z',
      endAt: '2026-10-20T19:00:00Z',
      meetUrl: null,
      cover: '/images/session-from-recognition-to-leadership.jpg',
    }]).find(group => group.year === 2026)!.sessions[0]
    expect(session.locked).toBe(false)
    expect(session.slug).toBe('2026-from-recognition-to-leadership')
    expect(session.presenter).toBe('Amos Ologunleko')
    expect(session.resources.find(resource => resource.type === 'video')?.url).toBe('https://drive.google.com/file/d/1hwYyh3RLpWGUPm2CWEeQUmGMTEjeOoZm/view?usp=sharing')
    expect(getSessionBySlug(session.slug)).toBeDefined()
  })

  it('offers the leadership study plan in Resources and an eight-question quiz', () => {
    const session = getSessionBySlug('2026-from-recognition-to-leadership')
    expect(session).toBeDefined()
    const markup = renderToStaticMarkup(<SessionCourseContent session={session!} resources={[]} />)
    expect(markup).toContain('Study plan')
    expect(markup).toContain('Module 5: Practical Application &amp; Leadership Navigation')
    expect(markup).toContain('event-course-tab-quiz')
    expect(markup).not.toContain('Coming soon')
    expect(session!.quiz?.questions).toHaveLength(8)
  })

  it('describes the actual quiz length and omits discussion prompts for a multiple-choice-only quiz', () => {
    const markup = renderToStaticMarkup(<SessionQuiz quiz={{
      questions: [{ id: 'influence', prompt: 'Which stage builds trust?', options: ['Influence', 'Impact'], correctAnswer: 0 }],
      discussions: [],
    }} />)
    expect(markup).toContain('1 multiple-choice question')
    expect(markup).not.toContain('Short answer / discussion')
    expect(markup).not.toContain('three discussion prompts')
  })

  it('offers a quiz for Knowledge to Impact alongside its session resources', () => {
    const session = getSessionBySlug('2026-from-knowledge-to-impact')!
    const markup = renderToStaticMarkup(<SessionCourseContent session={session} resources={session.resources.filter(resource => resource.type !== 'video')} />)
    expect(markup).toMatch(/role="tab"[^>]*>Quiz</)
    expect(markup).toContain('https://docs.google.com/document/d/1fynQ6k2HTHmmdN2OuTn-HZStr18wEpVMF-Jc6mkxIjo/edit?usp=sharing')
  })

  it('keeps sessions without a quiz focused on their description and resources', () => {
    const session = getSessionBySlug('2026-day-1')!
    const markup = renderToStaticMarkup(<SessionCourseContent session={session} resources={[]} />)
    expect(markup).not.toContain('event-course-tab-quiz')
    expect(markup).toContain('About this session')
  })
})
