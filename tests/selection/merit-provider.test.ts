import { describe, expect, it } from 'vitest'

import {
  buildMeritAssessmentPrompt,
  buildOpenAiMeritRequest,
  parseOpenAiMeritResponse,
  prepareMeritModelPrompt,
  redactMeritInput,
} from '@/lib/selection/merit/openai'

describe('redactMeritInput', () => {
  it('removes applicant identity and contact details while retaining outcome evidence', () => {
    const redacted = redactMeritInput({
      text: [
        'My name is Ada Nwosu from the University of Lagos in Nigeria.',
        'Contact me at ada.nwosu@example.com or +234 803 123 4567.',
        'Portfolio: https://example.com/ada-nwosu.',
        'I led a campus project serving 300 students and coordinated 12 volunteers.',
      ].join(' '),
      identifiers: [
        'Ada Nwosu',
        'University of Lagos',
        'Nigeria',
        'ada.nwosu@example.com',
        '+234 803 123 4567',
      ],
    })

    expect(redacted).not.toContain('Ada Nwosu')
    expect(redacted).not.toContain('University of Lagos')
    expect(redacted).not.toContain('Nigeria')
    expect(redacted).not.toContain('ada.nwosu@example.com')
    expect(redacted).not.toContain('+234 803 123 4567')
    expect(redacted).not.toContain('https://example.com/ada-nwosu')
    expect(redacted).toContain('[redacted]')
    expect(redacted).toContain('serving 300 students')
    expect(redacted).toContain('coordinated 12 volunteers')
  })

  it('matches supplied identifiers case-insensitively and ignores empty values', () => {
    const redacted = redactMeritInput({
      text: 'ADA NWOSU led the project with Ada Nwosu and 20 volunteers.',
      identifiers: ['', null, undefined, 'Ada Nwosu'],
    })

    expect(redacted).not.toMatch(/ada nwosu/i)
    expect(redacted).toContain('20 volunteers')
  })
})

describe('prepareMeritModelPrompt', () => {
  it('redacts narrative contact data and deliberately excludes private OCR text', () => {
    const prompt = prepareMeritModelPrompt({
      leadershipNarrative:
        'Email ada.nwosu@example.com. I led a project serving 300 students with 12 volunteers.',
      supportingEvidenceText:
        'Certificate for Ada Nwosu, University of Lagos, registration number 2018/123456.',
    })

    expect(prompt).toContain('serving 300 students')
    expect(prompt).toContain('12 volunteers')
    expect(prompt).not.toContain('ada.nwosu@example.com')
    expect(prompt).not.toContain('Ada Nwosu')
    expect(prompt).not.toContain('University of Lagos')
    expect(prompt).not.toContain('2018/123456')
    expect(prompt).toContain('SUPPORTING EVIDENCE TEXT\n[not provided]')
  })
})

describe('buildMeritAssessmentPrompt', () => {
  it('evaluates only the redacted narrative and never includes identity or country fields', () => {
    const prompt = buildMeritAssessmentPrompt({
      leadershipNarrative: 'I led a campus project serving 300 students.',
      supportingEvidenceText: 'Signed programme report confirms 300 participants.',
    })

    expect(prompt).toContain('300 students')
    expect(prompt).toContain('Signed programme report')
    expect(prompt).not.toContain('fullName')
    expect(prompt).not.toContain('country')
    expect(prompt).toContain('untrusted applicant data')
  })
})

describe('buildOpenAiMeritRequest', () => {
  it('uses strict structured output for the published rubric', () => {
    const request = buildOpenAiMeritRequest({
      model: 'gpt-5-mini',
      prompt: 'Assess this narrative.',
    })

    expect(request.text.format.type).toBe('json_schema')
    expect(request.text.format.strict).toBe(true)
    expect(request.text.format.schema.additionalProperties).toBe(false)
    expect(request.text.format.schema.required).toContain('leadershipScore')
    expect(request.store).toBe(false)
  })
})

describe('parseOpenAiMeritResponse', () => {
  it('reads structured JSON from a Responses API output message', () => {
    const result = parseOpenAiMeritResponse({
      output: [
        {
          type: 'message',
          content: [
            {
              type: 'output_text',
              text: JSON.stringify({
                leadershipScore: 20,
                impactScore: 18,
                initiativeScore: 8,
                communicationScore: 7,
                evidenceQuality: 'strong',
                requiresHumanReview: false,
                internalReasons: ['Specific leadership role and measurable outcome.'],
                publicStrengths: ['The application described a clear role and measurable reach.'],
                publicGaps: [],
              }),
            },
          ],
        },
      ],
    })

    expect(result.leadershipScore).toBe(20)
    expect(result.impactScore).toBe(18)
    expect(result.requiresHumanReview).toBe(false)
  })

  it('rejects malformed or out-of-range model output instead of silently accepting it', () => {
    expect(() =>
      parseOpenAiMeritResponse({
        output_text: JSON.stringify({
          leadershipScore: 100,
          impactScore: 18,
          initiativeScore: 8,
          communicationScore: 7,
          evidenceQuality: 'strong',
          requiresHumanReview: false,
          internalReasons: [],
          publicStrengths: [],
          publicGaps: [],
        }),
      }),
    ).toThrow('AI merit response')
  })
})
