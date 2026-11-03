# Recover WhatsApp launch when browser tabs are blocked

The report did not identify a rep, number, device or exact error. A live check
confirmed wa.me responds with its normal redirect. WhatsApp documents that the
recipient must have an active account; the app cannot infer registration from a
phone number or from a tracked click.

A controlled browser reproduction found that blocking window.open records the
attempt but leaves WhatsApp unopened until a second click. Continue in the
current tab if a placeholder window is blocked, closed or inaccessible, after
the existing authenticated tracking request succeeds. Keep the server-owned
number, prefilled message and awardee confirmation link. Never launch when
tracking fails, and do not change contact-proof or commission rules.

Use a shared destination validator for automatic launch and retry links, safe
popup cleanup, a synchronous in-flight guard, and a secure getRandomValues UUID
fallback for older mobile browsers. Explain that unregistered WhatsApp numbers
need a call or email instead.

Validation: 26 team tests and TypeScript passed, including eight launch tests.
The actual button with a synthetic API and blocked popups navigated to the
WhatsApp launch page with one tracked attempt and the full prefilled message.
No real member was contacted and no message was sent. Publish through the
Top100 Dokploy server. No database migration is required.

Official click-to-chat guidance: https://faq.whatsapp.com/5913398998672934
