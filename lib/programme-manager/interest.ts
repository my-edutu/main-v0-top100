import { z } from 'zod'
export const interestSchema = z.object({ kind: z.enum(['mentor', 'volunteer', 'programme']), activity_id: z.guid().nullable(), consent: z.literal(true) }).refine(x => x.kind === 'programme' ? x.activity_id !== null : x.activity_id === null)
