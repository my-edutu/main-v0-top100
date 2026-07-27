// app/api/webhooks/paystack/route.ts
// The ONLY thing that can move an order to `paid`, and the only thing that
// books a physical shipment. Two rules govern everything below:
//
//   1. A successful charge is never silently discarded. Paystack retries until
//      it gets a 200, so we always answer 200 — but anything we could not
//      process normally is written onto the order (`admin_note`, a searchable
//      `paystack_status`) and logged at error level, so it surfaces for a human
//      instead of evaporating.
//   2. Idempotency is per ORDER, not per reference. Each checkout attempt mints
//      a fresh `AFL-AWARD-<orderId>-<suffix>` reference, so several Paystack
//      sessions for one order can be payable at once. Keying "have we already
//      handled this?" off the reference would let a member with two tabs open
//      be charged twice and shipped twice.
import { NextRequest, NextResponse } from 'next/server'

import { createAdminClient } from '@/lib/supabase/server'
import { paidAmountMatches, secretKey, verifyPaystackSignature } from '@/lib/payments/paystack'
import { canTransition, isPaid, type AwardStatus } from '@/lib/awards/status'
import { getCourier } from '@/lib/courier'

export const runtime = 'nodejs'

/** Paystack must never retry a request we have seen, whatever we did with it. */
function acknowledge() {
  return NextResponse.json({ received: true })
}

/**
 * `admin_note` is a single column and more than one thing can go wrong on one
 * order, so notes accumulate instead of overwriting each other. Timestamped,
 * because the admin console shows the column verbatim.
 */
function appendNote(existing: unknown, addition: string): string {
  const prior = typeof existing === 'string' ? existing.trim() : ''
  const stamped = `[${new Date().toISOString()}] ${addition}`
  return prior ? `${prior}\n${stamped}` : stamped
}

/**
 * Every anomaly branch below writes `admin_note` / `paystack_status` as a
 * best-effort trace, on top of the `console.error` that already ran. Those
 * writes use the same `{ data, error }` client as everything else, so an
 * unchecked `error` here would fail silently — if these columns were ever
 * missing from the live schema, only the console output would survive.
 * Non-fatal by design: the human-readable log already happened either way.
 */
function logNoteFailure(context: string, orderId: string, error: unknown) {
  if (!error) return
  console.error(`[paystack-webhook] failed to write "${context}" trace onto order`, { orderId, error })
}

/** Paystack echoes metadata as an object, but has been known to echo a string. */
function readMetadata(raw: unknown): Record<string, unknown> {
  if (raw && typeof raw === 'object') return raw as Record<string, unknown>
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed === 'object') return parsed as Record<string, unknown>
    } catch {
      /* not JSON — treated as absent */
    }
  }
  return {}
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value : null
}

/** The note left on an order that a second, separate transaction also paid. */
function duplicateChargeNote(
  status: string,
  recordedReference: unknown,
  duplicateReference: string | null,
  paidKobo: unknown,
): string {
  return (
    `DUPLICATE CHARGE: order already "${status}" against reference ` +
    `${typeof recordedReference === 'string' ? recordedReference : 'unknown'}, but reference ` +
    `${duplicateReference ?? 'unknown'} also paid ${String(paidKobo)} kobo. Refund required. ` +
    `No second shipment was booked.`
  )
}

export async function POST(request: NextRequest) {
  // Read the secret through secretKey(), which throws when it is unset.
  // process.env.PAYSTACK_SECRET_KEY read directly would hand `undefined` to
  // verifyPaystackSignature, which returns false for a falsy secret: a
  // misconfigured deployment would reject 100% of real webhooks in a way that
  // looks exactly like an attack in the logs.
  let secret: string
  try {
    secret = secretKey()
  } catch (configError) {
    console.error('[paystack-webhook] cannot verify signatures:', configError)
    return NextResponse.json({ message: 'Payments are not configured.' }, { status: 500 })
  }

  // Read the RAW body. Parsing first and re-serialising would change the bytes
  // and break signature verification.
  const rawBody = await request.text()
  const signature = request.headers.get('x-paystack-signature')

  if (!verifyPaystackSignature(rawBody, signature, secret)) {
    return NextResponse.json({ message: 'Invalid signature.' }, { status: 401 })
  }

  let event: any
  try {
    event = JSON.parse(rawBody)
  } catch (parseError) {
    console.error('[paystack-webhook] signature-verified body is not valid JSON', parseError)
    return NextResponse.json({ message: 'Invalid payload.' }, { status: 400 })
  }

  // Acknowledge anything that is not a successful charge so Paystack stops retrying.
  if (event?.event !== 'charge.success') {
    return acknowledge()
  }

  // Everything past this point concerns money that has already been captured.
  const reference = asString(event?.data?.reference)
  const metadata = readMetadata(event?.data?.metadata)
  const metadataOrderId = asString(metadata.orderId)
  const paidKobo: unknown = event?.data?.amount

  if (!reference && !metadataOrderId) {
    console.error('[paystack-webhook] successful charge with no reference and no metadata.orderId', {
      amount: paidKobo,
    })
    return acknowledge()
  }

  const supabase = createAdminClient()

  // Match on the reference first. A member who pays an older, abandoned
  // Paystack session presents a reference the order no longer stores (checkout
  // overwrites it on every attempt), so fall back to metadata.orderId, which
  // the checkout route sets for exactly this reason.
  let order: any = null
  let matchedBy: 'reference' | 'metadata' = 'reference'

  if (reference) {
    const { data, error } = await supabase
      .from('award_orders')
      .select('*')
      .eq('paystack_reference', reference)
      .maybeSingle()
    if (error) {
      // A transient database fault must not read as "no such order" — that
      // would answer 200 to a real charge and Paystack would never retry.
      console.error('[paystack-webhook] order lookup by reference failed', { reference, error })
      return NextResponse.json({ message: 'Lookup failed.' }, { status: 500 })
    }
    order = data ?? null
  }

  if (!order && metadataOrderId) {
    const { data, error } = await supabase
      .from('award_orders')
      .select('*')
      .eq('id', metadataOrderId)
      .maybeSingle()
    if (error) {
      console.error('[paystack-webhook] order lookup by metadata.orderId failed', { metadataOrderId, error })
      return NextResponse.json({ message: 'Lookup failed.' }, { status: 500 })
    }
    order = data ?? null
    if (order) matchedBy = 'metadata'
  }

  if (!order) {
    console.warn('[paystack-webhook] no award order for reference', reference, 'or order id', metadataOrderId)
    return acknowledge()
  }

  const status = (order.status ?? 'draft') as AwardStatus
  // The row's note as this request has left it so far. Tracked in memory
  // because one request can write it twice (a fallback match, then a dispatch
  // failure) and the second write must not erase the first.
  let noteSoFar: unknown = order.admin_note
  // The stored reference is what we last handed to Paystack. When the incoming
  // one matches, this is a retry of a charge we have already recorded; when it
  // differs on an already-paid order, it is a second, separate transaction.
  const isSameCharge = reference !== null && order.paystack_reference === reference

  // --- Idempotency, keyed on the ORDER ------------------------------------
  if (isPaid(status)) {
    if (isSameCharge) {
      // Ordinary Paystack retry of an event we already processed. Do not book
      // again, do not touch the payment record, do not add noise.
      return acknowledge()
    }

    // A different Paystack transaction paid an order that is already paid: the
    // member really was charged twice (two checkout sessions, both completed).
    // Never book a second shipment and never overwrite the good payment record
    // — record it so the team can refund.
    console.error('[paystack-webhook] DUPLICATE CHARGE on an already-paid order', {
      orderId: order.id,
      status,
      alreadyRecordedReference: order.paystack_reference,
      duplicateReference: reference,
      duplicatePaidKobo: paidKobo,
    })
    const { error: duplicateNoteError } = await supabase
      .from('award_orders')
      .update({
        admin_note: appendNote(
          noteSoFar,
          duplicateChargeNote(status, order.paystack_reference, reference, paidKobo),
        ),
      })
      .eq('id', order.id)
    logNoteFailure('duplicate charge on already-paid order', order.id, duplicateNoteError)
    return acknowledge()
  }

  // --- Anomalies: never discard, always leave a trace ----------------------
  if (!canTransition(status, 'paid')) {
    // Money captured against an order that has no legal route to `paid`
    // (cancelled, never priced). This needs a human, not a silent 200.
    console.error('[paystack-webhook] paid charge on an order that cannot be marked paid', {
      orderId: order.id,
      status,
      reference,
      paidKobo,
    })
    const { error: unexpectedStatusNoteError } = await supabase
      .from('award_orders')
      .update({
        paystack_status: 'unexpected_status',
        admin_note: appendNote(
          noteSoFar,
          `PAYMENT ON UNEXPECTED STATUS: reference ${reference ?? 'unknown'} paid ${String(paidKobo)} kobo ` +
            `while the order was "${status}", which cannot legally become "paid". Money captured, order NOT marked paid.`,
        ),
      })
      .eq('id', order.id)
    logNoteFailure('payment on unexpected status', order.id, unexpectedStatusNoteError)
    return acknowledge()
  }

  if (typeof paidKobo !== 'number' || !Number.isInteger(paidKobo)) {
    // We cannot verify what was charged, so we must not mark the order paid —
    // but a captured charge still has to leave a trace.
    console.error('[paystack-webhook] successful charge with an unusable amount', {
      orderId: order.id,
      reference,
      amount: paidKobo,
    })
    const { error: amountUnreadableNoteError } = await supabase
      .from('award_orders')
      .update({
        paystack_status: 'amount_unreadable',
        admin_note: appendNote(
          noteSoFar,
          `UNREADABLE AMOUNT: reference ${reference ?? 'unknown'} reported amount ${JSON.stringify(paidKobo)}. ` +
            `Order NOT marked paid — verify the transaction in Paystack.`,
        ),
      })
      .eq('id', order.id)
    logNoteFailure('unreadable amount', order.id, amountUnreadableNoteError)
    return acknowledge()
  }

  if (!paidAmountMatches(paidKobo, order.total_amount_kobo ?? Number.MAX_SAFE_INTEGER)) {
    console.error('[paystack-webhook] amount mismatch', {
      reference,
      paidKobo,
      expected: order.total_amount_kobo,
    })
    const { error: amountMismatchNoteError } = await supabase
      .from('award_orders')
      .update({
        paystack_status: 'amount_mismatch',
        admin_note: appendNote(
          noteSoFar,
          `AMOUNT MISMATCH: reference ${reference ?? 'unknown'} paid ${paidKobo} kobo, expected ${order.total_amount_kobo}. ` +
            `Order NOT marked paid — verify the transaction in Paystack.`,
        ),
      })
      .eq('id', order.id)
    logNoteFailure('amount mismatch', order.id, amountMismatchNoteError)
    return acknowledge()
  }

  // --- Mark paid ------------------------------------------------------------
  // The `.eq('status', ...)` guard makes concurrent retries race-safe: only one
  // update can match, so exactly one invocation proceeds to book a shipment.
  // `paystack_reference` is rewritten to the reference that actually paid, so a
  // retry of a metadata-matched event is recognised as the same charge rather
  // than mistaken for a duplicate.
  const paidUpdate: Record<string, unknown> = {
    status: 'paid',
    paystack_status: 'success',
    paid_at: new Date().toISOString(),
  }
  if (reference) paidUpdate.paystack_reference = reference
  if (matchedBy === 'metadata') {
    console.warn('[paystack-webhook] matched order by metadata.orderId, not by reference', {
      orderId: order.id,
      paidReference: reference,
      storedReference: order.paystack_reference,
    })
    paidUpdate.admin_note = appendNote(
      noteSoFar,
      `Matched by metadata.orderId, not by reference: paid reference ${reference ?? 'unknown'} ` +
        `did not match the stored ${order.paystack_reference ?? 'none'} (payment on an earlier checkout session).`,
    )
  }

  const { data: updated, error: updateError } = await supabase
    .from('award_orders')
    .update(paidUpdate)
    .eq('id', order.id)
    .eq('status', order.status)
    .select('id')
    .maybeSingle()

  if (updateError) {
    // The charge is real and we failed to record it. Loudest possible signal.
    console.error('[paystack-webhook] FAILED TO MARK ORDER PAID', {
      orderId: order.id,
      reference,
      paidKobo,
      error: updateError,
    })
    const { error: notRecordedNoteError } = await supabase
      .from('award_orders')
      .update({
        admin_note: appendNote(
          noteSoFar,
          `PAYMENT NOT RECORDED: reference ${reference ?? 'unknown'} paid ${paidKobo} kobo but the status write failed ` +
            `(${updateError.message ?? 'unknown error'}). Mark this order paid by hand.`,
        ),
      })
      .eq('id', order.id)
    logNoteFailure('payment not recorded (status write failed)', order.id, notRecordedNoteError)
    return acknowledge()
  }

  if (!updated) {
    // Another concurrent invocation may have won the status race and already
    // own the booking — usually a retry of this same charge. But the status
    // can also have moved for a reason that has nothing to do with a second
    // payment (e.g. the member re-entered checkout in another tab and the
    // order went `quoted -> awaiting_payment` between our read and our
    // write), in which case this conditional update simply missed a real,
    // verified charge. Re-read to tell the two apart; every outcome except
    // "this is the same charge, already handled elsewhere" must leave a trace.
    const { data: current, error: currentError } = await supabase
      .from('award_orders')
      .select('status, paystack_reference, admin_note')
      .eq('id', order.id)
      .maybeSingle()

    if (currentError) {
      console.error('[paystack-webhook] re-read failed after a paid-status update matched no rows', {
        orderId: order.id,
        reference,
        paidKobo,
        error: currentError,
      })
    }

    const currentStatus = (current?.status ?? status) as AwardStatus
    const isKnownDuplicate =
      !currentError && current && reference && isPaid(currentStatus) && current.paystack_reference !== reference

    if (isKnownDuplicate && current) {
      console.error('[paystack-webhook] DUPLICATE CHARGE (lost the paid race to another reference)', {
        orderId: order.id,
        status: currentStatus,
        alreadyRecordedReference: current.paystack_reference,
        duplicateReference: reference,
        duplicatePaidKobo: paidKobo,
      })
      const { error: raceDuplicateNoteError } = await supabase
        .from('award_orders')
        .update({
          admin_note: appendNote(
            current.admin_note,
            duplicateChargeNote(currentStatus, current.paystack_reference, reference, paidKobo),
          ),
        })
        .eq('id', order.id)
      logNoteFailure('duplicate charge (lost the paid race)', order.id, raceDuplicateNoteError)
      return acknowledge()
    }

    // Not the well-understood duplicate-reference case: the conditional
    // update matched no rows for some other reason — the status moved out
    // from under us, there was no reference to compare (a metadata-only
    // match), or the re-read itself failed. The charge is still real money
    // and must not vanish with a bare 200.
    console.error('[paystack-webhook] verified charge could not be applied: paid-status update matched no rows', {
      orderId: order.id,
      reference,
      paidKobo,
      statusAtReadTime: status,
      statusOnReRead: currentError ? 'unknown (re-read failed)' : currentStatus,
    })
    const { error: unappliedNoteError } = await supabase
      .from('award_orders')
      .update({
        admin_note: appendNote(
          current && !currentError ? current.admin_note : noteSoFar,
          `PAYMENT NOT RECORDED: reference ${reference ?? 'unknown'} paid ${paidKobo} kobo but the conditional ` +
            `status update matched no rows (order was "${status}" when read, ` +
            `${currentError ? 'and the re-read failed' : `"${currentStatus}" on re-read`}). Mark this order paid by hand.`,
        ),
      })
      .eq('id', order.id)
    logNoteFailure('verified charge not applied (update matched no rows)', order.id, unappliedNoteError)
    return acknowledge()
  }

  // The paid write landed, so any note it carried is now the row's note.
  if (typeof paidUpdate.admin_note === 'string') noteSoFar = paidUpdate.admin_note

  // --- Book the shipment, exactly once -------------------------------------
  // Reached only by the invocation that actually performed `-> paid`, so the
  // order is provably paid before anything is booked. The `gig_waybill` guards
  // stay as the second line of defence.
  if (!order.gig_waybill) {
    try {
      const booking = await getCourier().book({
        orderId: order.id,
        email: order.email ?? '',
        recipientName: order.recipient_name ?? '',
        phone: order.phone ?? '',
        addressLine1: order.address_line1 ?? '',
        addressLine2: order.address_line2 ?? undefined,
        city: order.city ?? '',
        state: order.state ?? '',
        country: order.country ?? '',
        postalCode: order.postal_code ?? undefined,
      })

      const { error: bookingRecordError } = await supabase
        .from('award_orders')
        .update({
          status: 'dispatched',
          gig_waybill: booking.waybill,
          gig_tracking_url: booking.trackingUrl,
          gig_response: booking.raw ?? null,
        })
        .eq('id', order.id)
        .is('gig_waybill', null)

      if (bookingRecordError) {
        // The courier now holds a real, physical shipment for this order, but
        // saving that fact failed. supabase-js reports this via `error`, not a
        // throw, so the surrounding try/catch would never have seen it. Left
        // unchecked, the order stays `paid` with a null waybill and an admin
        // working the paid-without-waybill queue would book it a second time.
        console.error('[paystack-webhook] shipment booked but could not be recorded on the order', {
          orderId: order.id,
          waybill: booking.waybill,
          trackingUrl: booking.trackingUrl,
          error: bookingRecordError,
        })
        const { error: bookingNoteError } = await supabase
          .from('award_orders')
          .update({
            admin_note: appendNote(
              noteSoFar,
              `SHIPMENT BOOKED BUT NOT RECORDED: courier booking succeeded (waybill ${booking.waybill}, tracking ` +
                `${booking.trackingUrl}) but saving it to the order failed ` +
                `(${bookingRecordError.message ?? 'unknown error'}). Reconcile by hand — do not re-book.`,
            ),
          })
          .eq('id', order.id)
        logNoteFailure('shipment booked but not recorded', order.id, bookingNoteError)
      }
    } catch (bookingError) {
      // book() signals failure by throwing — BookResult has no failure variant.
      // The member has paid. A booking failure must never fail the webhook, or
      // Paystack will retry and we risk re-processing a completed payment.
      // The order stays `paid` and surfaces in /admin/awards for manual dispatch.
      console.error('[paystack-webhook] dispatch booking failed', order.id, bookingError)
      const { error: dispatchFailedNoteError } = await supabase
        .from('award_orders')
        .update({
          // Appended rather than overwritten: a note may already be on this row
          // from this same request (e.g. "matched by metadata.orderId"), and
          // erasing a payment trace to report a shipping failure would trade one
          // problem for a worse one.
          admin_note: appendNote(
            noteSoFar,
            `Automatic dispatch failed: ${
              bookingError instanceof Error ? bookingError.message : 'unknown error'
            }`,
          ),
        })
        .eq('id', order.id)
      logNoteFailure('automatic dispatch failed', order.id, dispatchFailedNoteError)
    }
  }

  return acknowledge()
}
