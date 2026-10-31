'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { RouteSection } from '../_components/route-section'
import { FestivalInterestSummary } from '../_components/festival-interest-summary'
import { useDashboardMember } from '../_providers/dashboard-member'
import { reconcileAwardPayment } from '@/lib/awards/payment'
import { festivalRequest } from '@/lib/festival/client'
import { FESTIVAL_PAYMENT_PATH } from '@/lib/festival/config'
import {
  festivalInterestSchema,
  pickupPaymentState,
  type FestivalInterestView,
  type FestivalPaymentState,
} from '@/lib/festival/interest'
import '../_components/festival.css'

const endpoint = '/api/member/festival-interest'
type FormField = 'fullName' | 'phone' | 'pickupRequested'
const paymentHelp: Record<FestivalPaymentState, string> = {
  confirmed: 'Award payment confirmed.',
  required:
    'Your physical award needs to be paid for before pickup. Continue to payment after saving.',
  pending:
    'Your award payment is being verified. Review its status before paying again.',
  unavailable:
    'You can save your interest, but we can’t verify your payment right now.',
  not_requested: 'We’ll check your award payment when you save.',
}

export default function FestivalInterestPage() {
  const { member } = useDashboardMember()
  const router = useRouter()
  const [view, setView] = useState<FestivalInterestView | null>(null)
  const [fullName, setFullName] = useState(member.name)
  const [phone, setPhone] = useState('')
  const [pickup, setPickup] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<FormField, string>>
  >({})
  const [saving, setSaving] = useState(false)
  const [checking, setChecking] = useState(false)
  const [editing, setEditing] = useState(false)
  const [saved, setSaved] = useState(false)
  const [retry, setRetry] = useState(0)
  const busy = useRef(false)
  const summaryRef = useRef<HTMLElement>(null)
  const nameRef = useRef<HTMLInputElement>(null)
  const phoneRef = useRef<HTMLInputElement>(null)
  const pickupRef = useRef<HTMLInputElement>(null)
  const validationFocus = useRef<FormField | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    festivalRequest<FestivalInterestView>(endpoint, {
      signal: controller.signal,
    })
      .then((data) => {
        if (controller.signal.aborted) return
        setView(data)
        setFullName(data.interest?.fullName ?? member.name)
        setPhone(data.interest?.phone ?? '')
        setPickup(data.interest?.pickupRequested ?? null)
        setEditing(false)
      })
      .catch((cause) => {
        if (!controller.signal.aborted)
          setLoadError(
            cause instanceof Error
              ? cause.message
              : 'Your interest could not be loaded.',
          )
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [member.id, member.name, retry])

  useEffect(() => {
    if (saved && !editing) summaryRef.current?.focus()
  }, [saved, editing])
  useEffect(() => {
    if (editing) nameRef.current?.focus()
  }, [editing])
  useEffect(() => {
    const field = validationFocus.current
    if (!field) return
    validationFocus.current = null
    const target =
      field === 'fullName' ? nameRef : field === 'phone' ? phoneRef : pickupRef
    target.current?.focus()
  }, [fieldErrors])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy.current) return
    setError('')
    setFieldErrors({})
    const parsed = festivalInterestSchema.safeParse({
      fullName,
      phone,
      pickupRequested: pickup,
    })
    if (!parsed.success) {
      const errors: Partial<Record<FormField, string>> = {}
      for (const issue of parsed.error.issues) {
        const field = issue.path[0]
        if (field === 'fullName' || field === 'phone')
          errors[field] ??= issue.message
        if (field === 'pickupRequested')
          errors.pickupRequested = 'Choose Yes or No.'
      }
      validationFocus.current = errors.fullName
        ? 'fullName'
        : errors.phone
          ? 'phone'
          : 'pickupRequested'
      setFieldErrors(errors)
      return
    }
    busy.current = true
    setSaving(true)
    setSaved(false)
    try {
      const data = await festivalRequest<FestivalInterestView>(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
      })
      setView(data)
      setEditing(false)
      setSaved(true)
      toast.success('Your festival interest is saved.')
      if (
        parsed.data.pickupRequested &&
        (data.payment === 'required' || data.payment === 'pending')
      )
        router.push(FESTIVAL_PAYMENT_PATH)
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Your interest could not be saved.',
      )
    } finally {
      busy.current = false
      setSaving(false)
    }
  }

  async function checkPayment() {
    if (busy.current) return
    busy.current = true
    setChecking(true)
    setError('')
    try {
      const payment = pickupPaymentState(await reconcileAwardPayment())
      setView((current) => (current ? { ...current, payment } : current))
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Payment could not be verified. Please try again.',
      )
    } finally {
      busy.current = false
      setChecking(false)
    }
  }

  function restoreDetails() {
    if (!view?.interest) return
    setFullName(view.interest.fullName)
    setPhone(view.interest.phone)
    setPickup(view.interest.pickupRequested)
    setSaved(false)
    setError('')
    setFieldErrors({})
  }

  function clearFieldError(field: FormField) {
    setFieldErrors((current) => ({ ...current, [field]: undefined }))
  }

  const payment = view?.payment ?? 'unavailable'
  return (
    <RouteSection
      title="Festival attendance"
      description="Africa Future Leaders Festival · 2026"
      className="festival-page"
    >
      {loading ? (
        <div className="festival-loading" role="status">
          Loading your interest…
        </div>
      ) : loadError ? (
        <div className="festival-load-error">
          <p className="festival-error" role="alert">
            {loadError}
          </p>
          <Button
            type="button"
            variant="outline"
            className="festival-secondary"
            onClick={() => {
              setLoading(true)
              setLoadError('')
              setRetry((value) => value + 1)
            }}
          >
            Try again
          </Button>
        </div>
      ) : view?.interest && !editing ? (
        <FestivalInterestSummary
          interest={view.interest}
          payment={payment}
          checking={checking}
          error={error}
          summaryRef={summaryRef}
          onEdit={() => {
            restoreDetails()
            setEditing(true)
          }}
          onCheckPayment={() => void checkPayment()}
        />
      ) : (
        <form
          className="festival-form"
          onSubmit={submit}
          noValidate
          aria-label="Festival attendance interest"
        >
          <div className="festival-field">
            <label htmlFor="festival-name">Full name</label>
            <Input
              ref={nameRef}
              id="festival-name"
              name="name"
              autoComplete="name"
              required
              aria-invalid={Boolean(fieldErrors.fullName)}
              aria-describedby={
                fieldErrors.fullName ? 'festival-name-error' : undefined
              }
              maxLength={150}
              value={fullName}
              disabled={saving || checking}
              onChange={(event) => {
                setFullName(event.target.value)
                clearFieldError('fullName')
              }}
            />
            {fieldErrors.fullName && (
              <p id="festival-name-error" className="festival-error">
                {fieldErrors.fullName}
              </p>
            )}
          </div>
          <div className="festival-field">
            <label htmlFor="festival-phone">Phone number</label>
            <Input
              ref={phoneRef}
              id="festival-phone"
              name="phone"
              type="tel"
              autoComplete="tel"
              inputMode="tel"
              placeholder="+234 803 123 4567"
              required
              maxLength={40}
              value={phone}
              aria-invalid={Boolean(fieldErrors.phone)}
              aria-describedby={
                fieldErrors.phone
                  ? 'festival-phone-help festival-phone-error'
                  : 'festival-phone-help'
              }
              disabled={saving || checking}
              onChange={(event) => {
                setPhone(event.target.value)
                clearFieldError('phone')
              }}
            />
            <p id="festival-phone-help" className="festival-help">
              Include your country code.
            </p>
            {fieldErrors.phone && (
              <p id="festival-phone-error" className="festival-error">
                {fieldErrors.phone}
              </p>
            )}
          </div>
          <fieldset
            className="festival-pickup"
            disabled={saving || checking}
            aria-invalid={Boolean(fieldErrors.pickupRequested)}
            aria-describedby={
              fieldErrors.pickupRequested ? 'festival-pickup-error' : undefined
            }
          >
            <legend>Collect your physical award at the festival?</legend>
            <div className="festival-choices">
              <label className="festival-choice">
                <input
                  ref={pickupRef}
                  type="radio"
                  name="pickup"
                  required
                  aria-describedby={
                    fieldErrors.pickupRequested
                      ? 'festival-pickup-error'
                      : undefined
                  }
                  checked={pickup === true}
                  onChange={() => {
                    setPickup(true)
                    clearFieldError('pickupRequested')
                  }}
                />{' '}
                Yes
              </label>
              <label className="festival-choice">
                <input
                  type="radio"
                  name="pickup"
                  required
                  aria-describedby={
                    fieldErrors.pickupRequested
                      ? 'festival-pickup-error'
                      : undefined
                  }
                  checked={pickup === false}
                  onChange={() => {
                    setPickup(false)
                    clearFieldError('pickupRequested')
                  }}
                />{' '}
                No
              </label>
            </div>
            {fieldErrors.pickupRequested && (
              <p id="festival-pickup-error" className="festival-error mt-2">
                {fieldErrors.pickupRequested}
              </p>
            )}
          </fieldset>
          {pickup && (
            <div className="festival-payment-status" role="status">
              <p
                className={
                  payment === 'confirmed' ? 'festival-confirmed' : undefined
                }
              >
                {payment === 'confirmed' && (
                  <CheckCircle2 size={16} aria-hidden="true" />
                )}
                {paymentHelp[payment]}
              </p>
              {payment !== 'confirmed' && (
                <button
                  className="festival-text-action"
                  type="button"
                  onClick={() => void checkPayment()}
                  disabled={checking || saving}
                >
                  {checking
                    ? 'Checking payment…'
                    : 'Already paid? Check status'}
                </button>
              )}
            </div>
          )}
          {error && (
            <p className="festival-error" role="alert">
              {error}
            </p>
          )}
          <div className="festival-actions">
            <Button
              className="festival-primary"
              type="submit"
              disabled={saving || checking}
            >
              {saving
                ? 'Saving…'
                : pickup && (payment === 'required' || payment === 'pending')
                  ? 'Save & continue to payment'
                  : view?.interest
                    ? 'Save changes'
                    : 'Register interest'}
            </Button>
            {view?.interest && (
              <Button
                type="button"
                variant="ghost"
                className="festival-cancel"
                disabled={saving || checking}
                onClick={() => {
                  restoreDetails()
                  setEditing(false)
                }}
              >
                Cancel
              </Button>
            )}
          </div>
          <p className="festival-help">
            The team will confirm attendance and pickup arrangements.
          </p>
        </form>
      )}
    </RouteSection>
  )
}
