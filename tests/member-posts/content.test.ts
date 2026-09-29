import { describe, expect, it } from 'vitest'

import { renderMemberPostBody } from '@/lib/member-posts/content'

describe('member post body rendering', () => {
  it('renders formatted Markdown for published post content', () => {
    expect(renderMemberPostBody('## A heading\n\nA **bold** paragraph.')).toContain(
      '<h2>A heading</h2>',
    )
    expect(renderMemberPostBody('## A heading\n\nA **bold** paragraph.')).toContain(
      '<strong>bold</strong>',
    )
  })

  it('keeps legacy plain-text newlines readable', () => {
    expect(renderMemberPostBody('First line\nsecond line\n\nNext paragraph')).toContain(
      '<p>First line<br>\nsecond line</p>',
    )
  })

  it('escapes raw HTML and rejects unsafe link protocols', () => {
    const rendered = renderMemberPostBody(
      '<img src=x onerror=alert(1)>\n\n[unsafe](javascript:alert(1))',
    )

    expect(rendered).not.toContain('<img')
    expect(rendered).toContain('&lt;img src=x onerror=alert(1)&gt;')
    expect(rendered).not.toContain('href="javascript:')
  })
})
