import MarkdownIt from 'markdown-it'

/**
 * Member post content is Markdown, not trusted HTML. Keep raw HTML disabled so
 * the generated markup is safe to render in both the public page and admin UI.
 */
const memberPostMarkdown = new MarkdownIt({
  breaks: true,
  html: false,
  linkify: false,
  typographer: false,
})

export function renderMemberPostBody(body: string): string {
  return memberPostMarkdown.render(body)
}
