import { describe, expect, it } from 'vitest'

import {
  buildMeritAssessmentPrompt,
  buildOpenAiMeritRequest,
  parseOpenAiMeritResponse,
} from '@/lib/selection/merit/openai'

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
