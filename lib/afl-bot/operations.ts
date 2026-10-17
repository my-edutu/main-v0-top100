/** Fixed bot operations. Browser input never becomes an arbitrary upstream URL. */
export type BotOperation = { method: 'GET' | 'POST'; path: string; data?: Record<string, unknown>; isSend?: boolean }
const recordId = /^[a-f0-9]{12}$/
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid request body.')
  return value as Record<string, unknown>
}
function onlyKeys(value: Record<string, unknown>, keys: string[]) {
  if (Object.keys(value).some((key) => !keys.includes(key))) throw new Error('Unexpected request field.')
}
function text(value: unknown, name: string, max: number, required = false): string | undefined {
  if (value === undefined || value === null || value === '') {
    if (required) throw new Error(`${name} is required.`)
    return undefined
  }
  if (typeof value !== 'string' || value.length > max || !value.trim()) throw new Error(`Invalid ${name}.`)
  return value.trim()
}
function id(value: unknown): string {
  if (typeof value !== 'string' || !recordId.test(value)) throw new Error('Invalid record ID.')
  return value
}
export function readOperation(params: URLSearchParams): BotOperation {
  const resource = params.get('resource') || 'status'
  if (!['status', 'knowledge', 'announcements'].includes(resource)) throw new Error('Unknown bot resource.')
  const entry = params.get('id')
  if (entry && resource === 'status') throw new Error('Status has no record ID.')
  const page = params.get('page') || '1'
  if (!/^\d{1,5}$/.test(page) || Number(page) < 1 || Number(page) > 10000) throw new Error('Invalid page.')
  return { method: 'GET', path: `/v1/admin/${resource}${entry ? `/${id(entry)}` : resource === 'status' ? '' : `?page=${page}`}` }
}
export function writeOperation(value: unknown): BotOperation {
  const body = object(value)
  onlyKeys(body, ['action', 'id', 'data'])
  const data = body.data === undefined ? {} : object(body.data)
  const action = body.action
  if (action === 'createKnowledge') {
    onlyKeys(data, ['title', 'content', 'audience', 'effective_at', 'expires_at', 'replaces', 'source_url', 'pdf_base64', 'filename', 'request_id'])
    const payload: Record<string, unknown> = {
      title: text(data.title, 'Title', 200, true), content: text(data.content, 'Content', 80000),
      request_id: text(data.request_id, 'Request ID', 100, true),
      audience: data.audience || 'admin_only',
    }
    if (!['admin_only', 'members'].includes(String(payload.audience))) throw new Error('Invalid audience.')
    for (const key of ['effective_at', 'expires_at', 'replaces', 'source_url', 'filename']) {
      const item = text(data[key], key, key === 'source_url' ? 2000 : 200)
      if (item) payload[key] = item
    }
    const pdf = text(data.pdf_base64, 'PDF', 14 * 1024 * 1024)
    if (pdf) payload.pdf_base64 = pdf
    if (!payload.content && !pdf) throw new Error('Add knowledge text or a readable PDF.')
    return { method: 'POST', path: '/v1/admin/knowledge', data: payload }
  }
  if (action === 'createAnnouncement') {
    onlyKeys(data, ['title', 'content', 'request_id'])
    return { method: 'POST', path: '/v1/admin/announcements', data: {
      title: text(data.title, 'Title', 200, true), content: text(data.content, 'Announcement', 3500, true),
      request_id: text(data.request_id, 'Request ID', 100, true),
    } }
  }
  const actions: Record<string, [string, string]> = {
    publishKnowledge: ['knowledge', 'publish'], retireKnowledge: ['knowledge', 'retire'],
    knowledgeAudience: ['knowledge', 'audience'], previewAnnouncement: ['announcements', 'preview'],
    sendAnnouncement: ['announcements', 'send'],
  }
  if (typeof action !== 'string' || !Object.hasOwn(actions, action)) throw new Error('Unknown bot action.')
  const [resource, operation] = actions[action]
  let payload: Record<string, unknown> = {}
  if (operation === 'audience') {
    onlyKeys(data, ['audience'])
    if (!['members', 'admin_only'].includes(String(data.audience))) throw new Error('Invalid audience.')
    payload = { audience: data.audience }
  } else if (operation === 'send') {
    onlyKeys(data, ['preview_token', 'confirmation'])
    if (data.confirmation !== 'SEND') throw new Error('Review and confirm the announcement before sending.')
    payload = { preview_token: text(data.preview_token, 'Preview token', 200, true) }
  } else {
    onlyKeys(data, [])
  }
  return { method: 'POST', path: `/v1/admin/${resource}/${id(body.id)}/${operation}`, data: payload,
    isSend: operation === 'send' }
}
