const endpoint = '/api/admin/afl-bot'
async function result<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => null)
  if (!response.ok) throw new Error(typeof body?.message === 'string' ? body.message : 'The bot request failed.')
  return body as T
}
export function loadBot<T>(resource: string, id?: string, page = 1): Promise<T> {
  const query = new URLSearchParams({ resource, page: String(page), ...(id ? { id } : {}) })
  return fetch(`${endpoint}?${query}`, { credentials: 'same-origin', cache: 'no-store' }).then(result<T>)
}
export function changeBot<T>(action: string, data: Record<string, unknown> = {}, id?: string): Promise<T> {
  return fetch(endpoint, { method: 'POST', credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, data, ...(id ? { id } : {}) }) })
    .then(result<T>)
}
export async function pdfBase64(file: File): Promise<string> {
  if (file.size > 10 * 1024 * 1024 || !file.name.toLowerCase().endsWith('.pdf')) {
    throw new Error('Choose a readable PDF of 10 MB or less.')
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result).split(',')[1])
    reader.onerror = () => reject(new Error('The PDF could not be read.'))
    reader.readAsDataURL(file)
  })
}
