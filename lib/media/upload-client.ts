export async function directUpload(file: File, purpose: 'avatar' | 'portrait' | 'editor'): Promise<{ ticket: string } | null> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return null
  const response = await fetch('/api/media/direct-upload', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'prepare', purpose, size: file.size, contentType: file.type }) })
  const data = await response.json()
  if (response.status === 409 && data.fallback) return null
  if (!response.ok) throw new Error(data.error || 'Could not start upload.')
  const uploaded = await fetch(data.url, { method: 'PUT', headers: { 'content-type': file.type }, body: file, credentials: 'omit' })
  if (!uploaded.ok) throw new Error('Image upload failed. Please try again.')
  return { ticket: data.ticket }
}

export async function uploadImage(file: File, purpose: 'avatar' | 'editor') {
  const direct = await directUpload(file, purpose)
  let response: Response
  if (direct) {
    response = await fetch('/api/media/direct-upload', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'complete', purpose, ticket: direct.ticket }) })
  } else {
    const form = new FormData()
    form.set('file', file)
    response = await fetch(purpose === 'avatar' ? '/api/profiles/avatar' : '/api/uploads', { method: 'POST', body: form })
  }
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || 'Image upload failed.')
  return data.url as string
}
