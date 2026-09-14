import { describe, expect, it } from 'vitest'

import { getPortfolioGenerationProgress } from '@/lib/portfolio-cover/progress'

describe('portfolio cover generation progress', () => {
  it('advances through honest stages without claiming completion early', () => {
    expect(getPortfolioGenerationProgress(0)).toEqual({ value: 12, title: 'Preparing your portrait', detail: 'Checking the crop and protecting your identity.' })
    expect(getPortfolioGenerationProgress(9_000)).toEqual({ value: 42, title: 'Creating your editorial portrait', detail: 'Adding corporate styling and a studio background.' })
    expect(getPortfolioGenerationProgress(22_000)).toEqual({ value: 76, title: 'Applying the Top100 cover', detail: 'Setting the brand, headline and awardee details.' })
    expect(getPortfolioGenerationProgress(90_000).value).toBe(92)
  })
})
