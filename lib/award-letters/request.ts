import { z } from 'zod'

const field = (max: number) => z.string().trim().max(max).regex(/^[^\p{Cc}\p{Cf}]*$/u)
export const letterFields = { name: field(90), recipient: field(90), purpose: field(160) }
const schema = z.object({ kind: z.enum(['invitation','recommendation']), ...letterFields })
  .refine(data => Boolean(data.name && (data.kind !== 'recommendation' || data.purpose)))

export async function parseLetterRequest(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null))
  return parsed.success ? parsed.data : null
}
