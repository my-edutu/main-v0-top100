// lib/courier/gig.ts
// GIG Logistics adapter. Implemented in Task 6 against the GIG API docs.
import { manualCourier } from './manual'
import type { CourierAdapter } from './types'

export const gigCourier: CourierAdapter = { ...manualCourier, name: 'gig-unconfigured' }
