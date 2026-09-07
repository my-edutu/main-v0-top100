import { describe, expect, it } from 'vitest'

import {
  flattenGoogleFormQuestions,
  normalizeGoogleFormResponse,
} from '@/lib/selection/google/forms'

const form = {
  formId: 'form-1',
  linkedSheetId: 'sheet-1',
  info: { title: 'Top100 Africa Future Leaders 2026' },
  items: [
    { title: 'What is your full name', questionItem: { question: { questionId: 'name' } } },
    { title: "What's your E-mail?", questionItem: { question: { questionId: 'email' } } },
    { title: "What's your phone number?", questionItem: { question: { questionId: 'phone' } } },
    { title: 'What country do you reside in?', questionItem: { question: { questionId: 'country' } } },
    { title: 'What university/Higher institution did you graduate from?', questionItem: { question: { questionId: 'school' } } },
    { title: 'What year did you graduate?', questionItem: { question: { questionId: 'year' } } },
    { title: "What's your CGPA?", questionItem: { question: { questionId: 'cgpa' } } },
    { title: 'What department did you graduate from?', questionItem: { question: { questionId: 'course' } } },
    { title: 'Are you the BEST GRADUATING STUDENT in your Department?', questionItem: { question: { questionId: 'bgs' } } },
    { title: 'Kindly upload proof of your first class Degree or BGS status.', questionItem: { question: { questionId: 'proof' } } },
    { title: 'Give a description about your leadership roles, positions and impact.', questionItem: { question: { questionId: 'leadership' } } },
    { title: 'Do you confirm that everything you said is correct?', questionItem: { question: { questionId: 'confirm' } } },
  ],
}

const textAnswer = (value: string) => ({ textAnswers: { answers: [{ value }] } })

describe('flattenGoogleFormQuestions', () => {
  it('maps stable question ids to their visible titles', () => {
    const questions = flattenGoogleFormQuestions(form)

    expect(questions.get('name')).toBe('What is your full name')
    expect(questions.get('proof')).toContain('upload proof')
  })
})

describe('normalizeGoogleFormResponse', () => {
  it('normalizes the known Top100 fields and uploaded PDF evidence', () => {
    const normalized = normalizeGoogleFormResponse({
      form,
      response: {
        responseId: 'response-123',
        respondentEmail: 'collected@example.com',
        createTime: '2026-05-01T10:00:00Z',
        lastSubmittedTime: '2026-05-01T10:05:00Z',
        answers: {
          name: textAnswer('Ada Example'),
          email: textAnswer('ada@example.com'),
          phone: textAnswer('+2348000000000'),
          country: textAnswer('Nigeria'),
          school: textAnswer('University of Lagos'),
          year: textAnswer('2025'),
          cgpa: textAnswer('4.72/5.00'),
          course: textAnswer('Computer Science'),
          bgs: textAnswer('Yes'),
          proof: {
            fileUploadAnswers: {
              answers: [
                { fileId: 'drive-pdf-1', fileName: 'Ada Result.pdf', mimeType: 'application/pdf' },
                { fileId: 'drive-image-1', fileName: 'Ada Result.jpg', mimeType: 'image/jpeg' },
              ],
            },
          },
          leadership: textAnswer('I led a programme serving 300 students.'),
          confirm: textAnswer('Yes, I confirm'),
        },
      },
    })

    expect(normalized.application).toMatchObject({
      sourceRecordId: 'response-123',
      fullName: 'Ada Example',
      primaryEmail: 'collected@example.com',
      secondaryEmail: 'ada@example.com',
      country: 'Nigeria',
      institution: 'University of Lagos',
      graduationYear: 2025,
      claimedCgpa: '4.72/5.00',
      course: 'Computer Science',
      claimedAcademicStatus: 'Best Graduating Student and First Class/equivalent claimed',
      declarationConfirmed: true,
    })
    expect(normalized.academicPdfFiles).toEqual([
      { fileId: 'drive-pdf-1', fileName: 'Ada Result.pdf', mimeType: 'application/pdf' },
    ])
    expect(normalized.unsupportedAcademicFiles).toEqual([
      { fileId: 'drive-image-1', fileName: 'Ada Result.jpg', mimeType: 'image/jpeg' },
    ])
  })

  it('uses the submitted email when Google did not collect an address', () => {
    const normalized = normalizeGoogleFormResponse({
      form,
      response: {
        responseId: 'response-2',
        answers: {
          name: textAnswer('Kojo Example'),
          email: textAnswer('kojo@example.com'),
        },
      },
    })

    expect(normalized.application.primaryEmail).toBe('kojo@example.com')
    expect(normalized.application.secondaryEmail).toBeNull()
  })

  it('fails closed when the response has no stable response id or name', () => {
    expect(() =>
      normalizeGoogleFormResponse({
        form,
        response: { answers: { name: textAnswer('Ada Example') } },
      }),
    ).toThrow('responseId')

    expect(() =>
      normalizeGoogleFormResponse({
        form,
        response: { responseId: 'response-3', answers: {} },
      }),
    ).toThrow('full name')
  })
})
