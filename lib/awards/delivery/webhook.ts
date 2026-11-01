import { bachsConfig } from '@/lib/payments/bachs/config'
import type { BachsConfig } from '@/lib/payments/bachs/types'
import { verifyBachsSignature } from '@/lib/payments/bachs/signature'
import { parseBachsEvent } from '@/lib/payments/bachs/events'
import { DELIVERY_PURPOSE } from './types'
import { reconcileDeliveryRow, type DeliveryDB, type DeliveryRow } from './server'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
/** Return null for unrelated events; never use webhook amount or URL as payment proof. */
export async function handleDeliveryWebhook(raw: string, headers: Headers, db: DeliveryDB, config: BachsConfig = bachsConfig()): Promise<number | null> {
  if (!config.awardWebhookSecret || !verifyBachsSignature({ rawBody: raw, timestampHeader: headers.get('x-bachs-timestamp'), signatureHeader: headers.get('x-bachs-signature'), secret: config.awardWebhookSecret, toleranceSeconds: config.webhookToleranceSeconds })) return null
  let event
  try { event = parseBachsEvent(JSON.parse(raw)) } catch { return null }
  if (!config.organizationId || event.organization_id !== config.organizationId) return 400
  const purpose = event.data.metadata?.purpose
  if (purpose && purpose !== DELIVERY_PURPOSE) return null
  const id = event.data.metadata?.payment_attempt_id
  let query = db.from('award_delivery_orders').select('*')
  if (id && UUID.test(id)) query = query.eq('id', id)
  else if (event.data.checkout_id) query = query.eq('checkout_id', event.data.checkout_id)
  else if (event.data.reference) query = query.eq('reference', event.data.reference)
  else return purpose === DELIVERY_PURPOSE ? 503 : null
  const { data, error } = await query.maybeSingle()
  // Older live deployments can receive unrelated award events before this
  // additive table exists. Do not fail award-fee webhooks for that case.
  if (error) return purpose === DELIVERY_PURPOSE ? 503 : null
  const row = data as DeliveryRow | null
  if (!row) return purpose === DELIVERY_PURPOSE ? 503 : null
  if ((event.data.reference && event.data.reference !== row.reference) ||
      (event.data.metadata?.order_id && event.data.metadata.order_id !== row.id) ||
      (event.data.checkout_id && row.checkout_id && event.data.checkout_id !== row.checkout_id)) return 400
  if (!row.checkout_id) return 503 // Creation/binding is still in flight; ask for the same signed event again.
  try { await reconcileDeliveryRow(row, db); return 200 }
  catch { return 503 }
}
