import { describe, expect, it } from 'vitest'
import { boundedDeploymentId } from '../next.config.mjs'

describe('Next.js deployment ID', () => {
  it('truncates full Git commit hashes to Vercel’s 32-character limit', () => {
    expect(boundedDeploymentId('51704d4ffa9c4e1b08ef1c674c0bbe05250fab1f')).toBe(
      '51704d4ffa9c4e1b08ef1c674c0bbe05',
    )
  })

  it('keeps short deployment IDs unchanged', () => {
    expect(boundedDeploymentId('preview-17')).toBe('preview-17')
  })
})
