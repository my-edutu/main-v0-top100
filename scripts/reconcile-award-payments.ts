import { config as loadEnv } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { bachsConfig, PRODUCTION_URL } from '../lib/payments/bachs/config'
import { verifyBachsAwardCheckout } from '../lib/payments/bachs/settlement'
import { reconcileAwardAttempt, RECONCILABLE_AWARD_STATUSES } from '../lib/awards/payment-reconciliation'

const apply = process.argv.includes('--apply')
const limitArg = process.argv.find((arg) => arg.startsWith('--limit='))?.slice('--limit='.length)
const limit = Math.min(500, Math.max(1, Number.parseInt(limitArg ?? '100', 10) || 100))
// Support the repository's local deployment environment without printing values.
loadEnv({ path: '.env.local', override: true })

async function main() {
  const config = bachsConfig()
  if (config.apiBaseUrl !== PRODUCTION_URL) throw new Error('This incident tool requires the production Bachs endpoint.')
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) throw new Error('Supabase service credentials are not configured in .env.local.')
  const db = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })
  const { data: attempts, error } = await db.from('award_payment_attempts').select('*')
    .eq('provider', 'bachs').eq('charge_scope', 'award_fee')
    .in('status', RECONCILABLE_AWARD_STATUSES)
    .order('created_at', { ascending: true }).limit(limit)
  if (error) throw new Error('Could not load pending award payments.')

  const counts: Record<string, number> = {}
  for (const attempt of attempts ?? []) {
    try {
      if (!attempt.provider_checkout_id) {
        counts.review_required = (counts.review_required ?? 0) + 1
        continue
      }
      const checkout = await verifyBachsAwardCheckout({
        checkoutId: attempt.provider_checkout_id, reference: attempt.provider_reference,
        orderId: attempt.order_id, attemptId: attempt.id, currency: attempt.currency,
        requestedMinor: Number(attempt.requested_amount_minor),
      }, config)
      if (!checkout) {
        counts.review_required = (counts.review_required ?? 0) + 1
        continue
      }
      if (apply) {
        const result = await reconcileAwardAttempt(db as never, attempt, { config })
        counts[result.outcome] = (counts[result.outcome] ?? 0) + 1
      } else {
        counts[checkout.status] = (counts[checkout.status] ?? 0) + 1
      }
    } catch {
      counts.errors = (counts.errors ?? 0) + 1
    }
  }
  console.log(JSON.stringify({ mode: apply ? 'apply' : 'dry-run', inspected: attempts?.length ?? 0, outcomes: counts }))
  if (counts.errors) process.exitCode = 1
}

main().catch(() => { console.error('Award payment reconciliation failed.'); process.exitCode = 1 })
