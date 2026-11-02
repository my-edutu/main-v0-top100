'use client'

import { useEffect, useRef, useState } from 'react'
import type { SessionQuiz as Quiz } from '@/lib/session-quiz'
import styles from './session-quiz.module.css'

export function SessionQuiz({ quiz }: { quiz: Quiz }) {
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [reflections, setReflections] = useState<Record<string, string>>({})
  const [submitted, setSubmitted] = useState(false)
  const resultRef = useRef<HTMLDivElement>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const score = quiz.questions.filter(question => answers[question.id] === question.correctAnswer).length

  useEffect(() => {
    if (submitted) resultRef.current?.focus()
  }, [submitted])

  return (
    <form ref={formRef} className={styles.quiz} onSubmit={event => { event.preventDefault(); setSubmitted(true) }}>
      <div>
        <h2>Session quiz</h2>
        <p>Test what you learned with {quiz.questions.length} multiple-choice {quiz.questions.length === 1 ? 'question' : 'questions'}{quiz.discussions.length ? `, then reflect on ${quiz.discussions.length} discussion prompts` : ''}. Your responses stay on this page until you leave or retry.</p>
      </div>
      {submitted ? (
        <div ref={resultRef} tabIndex={-1} className={styles.result} role="status">
          <h3>You scored {score} out of {quiz.questions.length}</h3>
          <p>Review the correct answers below.{quiz.discussions.length ? ' Written reflections are for self-review and are not included in your score.' : ''}</p>
        </div>
      ) : null}
      <h3>{quiz.discussions.length ? 'Section 1: Multiple choice' : 'Multiple choice'}</h3>
      <p>Choose one answer for every question.</p>
      {quiz.questions.map((question, index) => (
        <fieldset key={question.id} className={styles.question} disabled={submitted}>
          <legend>{index + 1}. {question.prompt}</legend>
          <div className={styles.options}>
            {question.options.map((option, optionIndex) => (
              <label key={option} className={styles.option}>
                <input
                  type="radio"
                  name={question.id}
                  value={optionIndex}
                  required
                  checked={answers[question.id] === optionIndex}
                  onChange={() => setAnswers(previous => ({ ...previous, [question.id]: optionIndex }))}
                />
                <span>{String.fromCharCode(65 + optionIndex)}) {option}</span>
              </label>
            ))}
          </div>
          {submitted ? (
            <div className={styles.feedback}>
              <strong>{answers[question.id] === question.correctAnswer ? 'Correct.' : 'Incorrect.'}</strong>{' '}
              Correct answer: {String.fromCharCode(65 + question.correctAnswer)}) {question.options[question.correctAnswer]}
              {question.explanation ? <p>{question.explanation}</p> : null}
            </div>
          ) : null}
        </fieldset>
      ))}
      {quiz.discussions.length ? <>
        <h3>Section 2: Short answer / discussion</h3>
        <p>These reflections are optional. Compare your thinking with the model answers after checking your quiz.</p>
      </> : null}
      {quiz.discussions.map((question, index) => (
        <div key={question.id} className={styles.discussion}>
          <label htmlFor={`quiz-${question.id}`}>
            <strong>{index + 1}. {question.title}</strong>
            <span>{question.prompt}</span>
          </label>
          <textarea
            id={`quiz-${question.id}`}
            rows={4}
            value={reflections[question.id] ?? ''}
            readOnly={submitted}
            onChange={event => setReflections(previous => ({ ...previous, [question.id]: event.target.value }))}
          />
          {submitted ? <div className={styles.feedback}><strong>Model answer</strong><p>{question.modelAnswer}</p></div> : null}
        </div>
      ))}
      {submitted ? (
        <button className={styles.action} type="button" onClick={() => {
          setAnswers({})
          setReflections({})
          setSubmitted(false)
          requestAnimationFrame(() => formRef.current?.querySelector<HTMLInputElement>('input')?.focus())
        }}>Try again</button>
      ) : <button className={styles.action} type="submit">Check my answers</button>}
    </form>
  )
}
