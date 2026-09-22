import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import ImpactSeriesSection from '@/app/components/ImpactSeriesSection'

describe('impact series theme', () => {
  it('marks the dark homepage section for scoped light-theme text overrides', () => {
    const markup = renderToStaticMarkup(<ImpactSeriesSection videos={[{ title: 'Interview title', image: '/cover.jpg' }]} />)
    expect(markup).toContain('impact-series-dark')
    expect(markup).toContain('text-white')
  })
})
