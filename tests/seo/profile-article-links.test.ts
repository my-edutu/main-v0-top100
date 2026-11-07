import { expect, it } from 'vitest'
import { linkedProfileSlugs } from '@/lib/seo/profile-article-links'

it('recognises explicit profile references without treating unrelated paths as profiles', () => {
  expect(linkedProfileSlugs([
    '<a href="/awardees/amina">Amina</a>',
    "<a href='/bio/amina'>Amina</a>",
    '<a href="/awardees/zo%C3%AB?ref=story">Zoë</a>',
    '<a href="https://other.example/awardees/amina">Elsewhere</a>',
    '<a href="/awardees/amina/posts/essay">Article</a>',
    '<a data-href="/awardees/hidden">Hidden</a>',
  ].join(''))).toEqual(['amina', 'zoë'])
})
