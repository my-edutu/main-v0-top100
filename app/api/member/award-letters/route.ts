import { getCurrentUser } from '@/lib/auth-server'
import { createAdminClient } from '@/lib/supabase/server'
import { renderLetter } from '@/lib/award-letters/render'
import { getAwardLetterAccess } from '@/lib/award-letters/access'
import { parseLetterRequest } from '@/lib/award-letters/request'

const headers = {'Cache-Control':'private, no-store'}
const fail = (message: string, status: number) => Response.json({message},{status,headers})

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user?.id) return fail('Sign in to create your letter.',401)
  const input = await parseLetterRequest(request)
  if (!input) return fail('Check the name, recipient and opportunity fields.',400)
  try {
    if (input.kind !== 'invitation') return fail('Create recommendation letters from Saved letters.', 400)
    const access = await getAwardLetterAccess(createAdminClient(), user.id)
    if (!access) return fail('Letters are available to awardees only.', 403)
    return Response.json(await renderLetter(input, access.year), {headers})
  } catch (error) {
    return error instanceof RangeError ? fail(error.message,400) : fail('Your letter could not be prepared. Please try again.',503)
  }
}
