type Block =
  | { type: 'paragraph'; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'facts'; items: { label: string; value: string }[] }

type Section = { heading: string; blocks: Block[] }

const sectionTitles = [
  'Overview', 'Quick Overview', 'Detailed Description', 'About the Opportunity',
  'Available Online Courses', 'Eligibility', 'Eligibility Criteria', 'Requirements',
  'Benefits', 'Funding', 'Certificate Requirements', 'Documents Required',
  'Application Process', 'How to Apply', 'Selection Criteria', 'Timeline',
  'Why This Opportunity?', 'Frequently Asked Questions', 'FAQs',
]
const listSections = new Set([
  'eligibility', 'eligibility criteria', 'requirements', 'benefits',
  'documents required', 'selection criteria', 'why this opportunity?',
])
const overviewLabels = new Set([
  'host organisation', 'host organization', 'host country', 'location', 'learning platform',
  'opportunity type', 'degree/academic level', 'funding status', 'number of courses', 'duration',
  'weekly study commitment', 'eligible applicants', 'course fees', 'learning recognition',
  'academic credits', 'deadline',
])

const textKey = (text: string) => text.replace(/\s+/g, ' ').trim().toLowerCase()
const compactKey = (text: string) => textKey(text).replace(/\s/g, '')
const bullet = /^(?:[-*•]|\d+[.)])\s+/
const markdownHeading = /^#{1,6}\s+(.+)$/

function regularBlocks(paragraphs: string[], asList: boolean): Block[] {
  const blocks: Block[] = []
  let items: string[] = []

  function flushList() {
    if (items.length) blocks.push({ type: 'list', items })
    items = []
  }

  for (const text of paragraphs) {
    const lines = text.split('\n').map(line => line.trim()).filter(Boolean)
    if (lines.length && lines.every(line => bullet.test(line))) {
      items.push(...lines.map(line => line.replace(bullet, '')))
    } else if (asList && !text.endsWith(':')) {
      items.push(text)
    } else {
      flushList()
      blocks.push({ type: 'paragraph', text })
    }
  }
  flushList()
  return blocks
}

function overviewBlocks(paragraphs: string[]): Block[] {
  const blocks: Block[] = []
  const items: { label: string; value: string }[] = []
  for (let index = 0; index < paragraphs.length; index++) {
    const label = paragraphs[index]
    const value = paragraphs[index + 1]
    if (!overviewLabels.has(textKey(label))) {
      if (items.length) blocks.push({ type: 'facts', items: items.splice(0) })
      blocks.push({ type: 'paragraph', text: label })
    } else if (value && !overviewLabels.has(textKey(value))) {
      items.push({ label, value })
      index++
    }
  }
  if (items.length) blocks.push({ type: 'facts', items })
  return blocks
}

function courseBlocks(paragraphs: string[]): Block[] {
  const blocks: Block[] = []
  const courses: string[] = []
  for (const text of paragraphs) {
    if (['course', 'duration', 'weekly study'].includes(textKey(text))) continue
    if (/^\d+(?:[–-]\d+)?\s+(?:weeks?|hours?)$/i.test(text) && courses.length) {
      courses[courses.length - 1] += ' · ' + text
    } else if (!/[.:!?]$/.test(text) && text.length <= 150) {
      courses.push(text)
    } else {
      if (courses.length) blocks.push({ type: 'list', items: courses.splice(0) })
      blocks.push({ type: 'paragraph', text })
    }
  }
  if (courses.length) blocks.push({ type: 'list', items: courses })
  return blocks
}

export function formatEdutuDescription(title: string, summary: string | null, description: string | null): Section[] {
  const titleKey = textKey(title)
  const source = (description ?? '').replace(/\r\n?/g, '\n')
  const raw = source.replace(/^(#{1,6}\s+[^\n]+)\n(?!\n)/gm, '$1\n\n').split(/\n\s*\n|\n(?=#{1,6}\s)/).map(text => text.trim()).filter(Boolean)
  const paragraphs = raw.filter((text, index) => {
    const key = textKey(text)
    if (key === titleKey || (key.startsWith(titleKey + ' in ') && key.length < titleKey.length + 65 && !key.endsWith('.'))) return false
    const keyWithoutSpaces = compactKey(text)
    const next = raw[index + 1]
    const after = raw[index + 2]
    const previous = raw[index - 1]
    const before = raw[index - 2]
    return !((next && after && keyWithoutSpaces === compactKey(next + after)) ||
      (previous && before && keyWithoutSpaces === compactKey(before + previous)))
  })
  const sections: Section[] = []
  const standaloneSummary = summary?.trim() ?? ''
  const cleanSummary = textKey(standaloneSummary).startsWith(titleKey + ' ')
    ? standaloneSummary.slice(title.length).trim()
    : standaloneSummary
  let heading = ''
  let content: string[] = []

  if (cleanSummary && textKey(cleanSummary) !== titleKey && !textKey(source).includes(textKey(cleanSummary))) {
    content.push(cleanSummary)
  }

  function flush() {
    if (!content.length) return
    const key = textKey(heading)
    const blocks = key === 'quick overview' ? overviewBlocks(content)
      : key === 'available online courses' ? courseBlocks(content)
      : regularBlocks(content, listSections.has(key))
    if (blocks.length) sections.push({ heading, blocks })
    content = []
  }

  for (const text of paragraphs) {
    const nextHeading = text.match(markdownHeading)?.[1]
      ?? sectionTitles.find(label => textKey(label) === textKey(text.replace(/:$/, '')))
    if (nextHeading) {
      flush()
      heading = nextHeading
    } else {
      content.push(text)
    }
  }
  flush()
  return sections
}
