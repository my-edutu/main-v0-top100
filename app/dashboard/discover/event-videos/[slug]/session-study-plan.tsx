import { BookOpen, ChevronDown } from 'lucide-react'
import type { SessionStudyPlan as StudyPlan } from '@/lib/session-study-plans'
import styles from './session-study-plan.module.css'

export function SessionStudyPlan({ plan }: { plan: StudyPlan }) {
  return (
    <details className={styles.plan}>
      <summary>
        <BookOpen size={20} aria-hidden="true" />
        <span><strong>Study plan</strong><span>{plan.modules.length} modules · {plan.title}</span></span>
        <ChevronDown size={18} className={styles.chevron} aria-hidden="true" />
      </summary>
      <div className={styles.content}>
        <p>{plan.introduction}</p>
        {plan.modules.map((module, index) => (
          <section key={module.title}>
            <h3>Module {index + 1}: {module.title}</h3>
            {module.sections.map(section => {
              const List = section.ordered ? 'ol' : 'ul'
              return (
                <div key={section.title}>
                  <h4>{section.title}</h4>
                  <List>{section.points.map(point => <li key={point}>{point}</li>)}</List>
                </div>
              )
            })}
          </section>
        ))}
      </div>
    </details>
  )
}
