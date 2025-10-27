import { cache } from 'react'

export const getCurrentUser = cache(async () => null)

export async function validateRequest(_request: Request) {
  return null
}
