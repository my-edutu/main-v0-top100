export async function readSocialResponse(response: Response) {
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.message || 'Could not load Social Sharing. Please try again.')
  return data
}
