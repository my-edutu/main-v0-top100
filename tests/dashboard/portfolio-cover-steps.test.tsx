import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { CoverStepIndicator } from '@/app/dashboard/me/portfolio-cover/_components/cover-step-indicator'

describe('portfolio cover progress', () => {
  it('keeps Preview inactive during the photo step', () => {
    const markup = renderToStaticMarkup(createElement(CoverStepIndicator, { step: 'photo' }))

    expect(markup).toContain('Name')
    expect(markup).toContain('Photo')
    expect(markup).toContain('Preview')
    expect(markup).toContain('Step 2 of 3: Photo')
    expect(markup).not.toContain('aria-current="step" aria-label="Step 3 of 3: Preview"')
  })

  it('activates Preview only for the preview step', () => {
    const markup = renderToStaticMarkup(createElement(CoverStepIndicator, { step: 'preview' }))

    expect(markup).toContain('Step 3 of 3: Preview')
  })
})
