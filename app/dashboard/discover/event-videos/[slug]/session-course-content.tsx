'use client'

import { useRef, useState } from 'react'
import { ArrowUpRight, BookOpen, ClipboardList, FileText, Presentation, UserRound } from 'lucide-react'

import type { Session, SessionResource, SessionResourceType } from '@/lib/sessions'

type CourseTab = 'description' | 'resources'

const tabs: CourseTab[] = ['description', 'resources']

const resourceIcons: Record<SessionResourceType, typeof BookOpen> = {
  video: BookOpen,
  presentation: Presentation,
  workshop: ClipboardList,
  writeup: FileText,
}

function SessionResourceLink({ resource }: { resource: SessionResource }) {
  const Icon = resourceIcons[resource.type]
  return (
    <a href={resource.url} target="_blank" rel="noopener noreferrer" className="event-course-resource">
      <span className="event-course-resource__icon" aria-hidden="true"><Icon size={19} /></span>
      <span className="event-course-resource__copy">
        <span className="event-course-resource__title">{resource.title}</span>
        <span className="event-course-resource__type">{resource.type === 'writeup' ? 'Notes & write-ups' : resource.type}</span>
        {resource.description ? <span className="event-course-resource__description">{resource.description}</span> : null}
      </span>
      <ArrowUpRight size={18} aria-hidden="true" />
    </a>
  )
}

export function SessionCourseContent({ session, resources }: { session: Session; resources: SessionResource[] }) {
  const [activeTab, setActiveTab] = useState<CourseTab>(resources.length ? 'resources' : 'description')
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([])

  function selectTab(index: number) {
    const nextIndex = (index + tabs.length) % tabs.length
    setActiveTab(tabs[nextIndex])
    tabRefs.current[nextIndex]?.focus()
  }

  return (
    <section className="event-course-sheet" aria-labelledby="event-session-title">
      <div className="event-course-heading">
        <p className="event-course-heading__eyebrow">
          <span>{session.year} learning programme</span>
          {session.date ? <><span aria-hidden="true">·</span><span>{session.date}</span></> : null}
        </p>
        <h1 id="event-session-title">{session.title}</h1>
        {session.presenter ? <p className="event-course-heading__speaker"><UserRound size={17} aria-hidden="true" />{session.presenter}</p> : null}
      </div>

      <div className="event-course-tabs" role="tablist" aria-label="Session information">
        {tabs.map((tab, index) => (
          <button
            key={tab}
            ref={(node) => { tabRefs.current[index] = node }}
            id={`event-course-tab-${tab}`}
            type="button"
            role="tab"
            aria-selected={activeTab === tab}
            aria-controls="event-course-tabpanel"
            tabIndex={activeTab === tab ? 0 : -1}
            onClick={() => setActiveTab(tab)}
            onKeyDown={(event) => {
              if (event.key === 'ArrowRight') { event.preventDefault(); selectTab(index + 1) }
              if (event.key === 'ArrowLeft') { event.preventDefault(); selectTab(index - 1) }
              if (event.key === 'Home') { event.preventDefault(); selectTab(0) }
              if (event.key === 'End') { event.preventDefault(); selectTab(tabs.length - 1) }
            }}
          >
            {tab === 'description' ? 'Description' : 'Resources'}
            {tab === 'resources' ? <span className="event-course-tabs__count">{resources.length}</span> : null}
          </button>
        ))}
      </div>

      <div
        id="event-course-tabpanel"
        role="tabpanel"
        aria-labelledby={`event-course-tab-${activeTab}`}
        tabIndex={0}
        className="event-course-panel"
      >
        {activeTab === 'description' ? (
          <div className="event-course-description">
            <h2>About this session</h2>
            <p>{session.summary ?? 'Session details will be added here.'}</p>
          </div>
        ) : (
          resources.length ? (
            <div className="event-course-resource-list">
              {resources.map((resource) => <SessionResourceLink key={`${resource.title}-${resource.url}`} resource={resource} />)}
            </div>
          ) : (
            <div className="event-course-resources-empty" role="status">
              <BookOpen size={20} aria-hidden="true" />
              <div>
                <h2>Coming soon</h2>
                <p>Slides, workshop materials, and session notes will be added here.</p>
              </div>
            </div>
          )
        )}
      </div>
    </section>
  )
}
