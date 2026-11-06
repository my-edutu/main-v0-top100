import { createHash } from 'node:crypto'
import { publicSnapshot } from './profile'
import type { PublicAwardee } from './types'
export function spotlightSignature(profile: PublicAwardee) {
  return createHash('sha256').update(JSON.stringify(publicSnapshot(profile))).digest('hex')
}
