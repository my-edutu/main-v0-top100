# Independent contact confirmation

The user selected tracked contact clicks plus awardee confirmation before payment.
Personal dialer and WhatsApp app launches cannot prove a conversation. Notes,
clicks, uploaded screenshots and rep assertions will never qualify by themselves.

## Contract

The rep starts a server-recorded contact attempt from an active assignment. The
server owns the sender, recipient, phone, channel and timestamp. The rep shares
an opaque confirmation link. The awardee signs in to their own matching account,
requests a fresh six-digit code to their recorded awardee email, then explicitly
confirms or declines contact. Existing email auto-confirm flags are insufficient.
The code expires in ten minutes, has five guesses and a sixty-second resend
cooldown, and is limited to three sends per hour. No email is sent on GET/view.

Confirmed proof binds the rep, assignment, awardee, server-stamped click and
server-stamped confirmation. Both events must precede actual payment. A rep
cannot confirm their own attempt, override timestamps, swap destinations, or
alter terminal decisions. Existing provider-backed email evidence remains valid.

SQL functions are service-only; member/rep callers go through authenticated,
same-origin, strictly validated APIs. OTP digests use a server-secret HMAC and
are never returned to either browser. Challenges remain unusable until the
provider explicitly accepts the email and the server activates them. Failed or
uncertain sends never activate proof, even if cleanup is unavailable.
Wrong-code counters commit independently of error responses.

## Work

- Add contact/challenge tables, sealed evidence RPCs, canonical qualification
  and idempotent correction using existing immutable reversal accounting.
- Replace raw Call/WhatsApp actions with tracked attempts and copyable awardee
  confirmation links. Label notes as operational records only.
- Add authenticated recipient confirmation APIs and a public, private/noindex
  landing page with sign-in continuation and explicit code request/decision.
- Test forged actors/evidence, false notes/clicks, identity swapping, after-pay
  acknowledgments, expiry, guessing, resend/replay, email failure and valid proof.
- Verify both applications, independently review, back up and apply on the
  self-hosted Top100 database, publish and verify both live apps/worker.

No real call, WhatsApp message, email or payout is performed as a test.
