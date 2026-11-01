# Festival admission and tickets

The festival is for approved awardees with a currently confirmed physical award payment, for either collection preference. On selecting Yes, refresh payment verification. Confirmed members can register; unpaid members see Get your award. Pending and unavailable verification remain distinct and must not issue admission or encourage duplicate payment.

Keep the existing unboxed form and flag picker. Display 30 November 2026, University of Lagos, and time to be confirmed. Explain that members who have not paid must get their award, and that the physical award and certificate will be prepared for collection or dispatched once delivery arrangements are confirmed. Registration itself does not book dispatch.

Use the existing private festival record with a stable ticket UUID and explicit registration timestamp. Old interest records are not tickets. Recheck payment in the save and download services. A refund hides the ticket and blocks downloads. Never trust member-submitted payment, ticket IDs, or email recipients.

Send a transactional ticket through the existing Brevo SMTP transport to the authenticated account email. Attach a branded PNG ticket with the member name, reference, date, venue, collection preference, and admission caveat. The authenticated dashboard also downloads the same image. A PNG avoids new PDF/browser dependencies and works offline on phones.

Persist email acceptance and use an atomic, expiring claim to prevent concurrent sends. Provider failure does not undo registration; show a retry action. SMTP acceptance is reported as sent, not delivered. Retries after SMTP acceptance followed by a database failure can still duplicate a message; a stable Message-ID helps correlation but is not exactly-once delivery.

The user has supplied the behavior and event details and previously requested autonomous implementation. Use the established application stack and additive migration. No messages to real members are sent during verification. No public ticket lookup or event scanner is introduced.
