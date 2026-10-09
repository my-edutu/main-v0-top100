# Public 2026 Magazine Feature Applications

## Goal

Let any visitor pay for and submit a 2026 Africa Future Leaders magazine feature application without creating an account, while keeping payment confirmation server-owned and preserving the awardee dashboard flow.

## Approved experience

- The homepage popup announces that 2026 magazine feature applications are open.
- Its cover image is 4:5 and displays the white title on two lines: “AFRICA FUTURE LEADERS” and “2026”. The backdrop behind the popup is blurred without a dimming color overlay.
- The popup CTA leads to a public `/magazine/feature` page. A visitor can start from that page without signing in.
- The visitor provides their name, email, and billing country to start Bachs checkout. The server derives the active campaign and price; the browser cannot set either.
- The server creates a guest order, creates a Bachs hosted checkout session with order/attempt metadata, and sets a high-entropy, HTTP-only, same-site guest access cookie. Only the token hash is stored with the order.
- Bachs returns to `/magazine/feature`. The page checks payment status using the cookie. A successful return URL never counts as payment confirmation; the signed Bachs webhook must first mark the matching order paid.
- The story form is enabled only for that confirmed paid order. Name and contact email come from the checkout order, while title, category, and summary come from the form.
- Public submissions appear in the Admin Member Hub feature-submissions queue alongside awardee submissions. Staff can update their review status through the existing protected admin route.
- Awardees keep their current member-specific payment and dashboard application flow.

## Data and boundaries

- Extend `magazine_feature_orders` with customer identity and a guest-token hash; allow `profile_id` to be null for guest orders. Keep existing member orders and constraints intact.
- Extend `magazine_feature_applications` to allow a null `profile_id` for guests. Keep its unique order relationship and campaign association.
- Allow `member_features.member_id` to be null for guest applications. Existing member queries remain scoped by their non-null authenticated member ID; admin queries can include both sources.
- Add service-role-only database functions for reserving a guest checkout and submitting a guest application. The submission function validates token hash, campaign, paid order status, and one-application-per-order atomically.
- Guest checkout uses the existing Bachs API session builder and webhook metadata contract. The fixed public payment-link URL is not used for this flow because it does not carry the per-order identity required by the webhook.
- Public APIs validate inputs, enforce the active campaign and checkout switch, and apply rate limits. Payer identity and payment status are never accepted from client-submitted form data.
- The guest cookie is scoped to the public magazine API, HTTP-only, `SameSite=Lax`, and time-limited. No access token appears in the URL or browser storage.

## Failure behavior

- Campaign-closed or checkout-disabled visitors see a clear unavailable state and cannot start payment.
- A created/open order can resume its stored checkout session. A successful return with a still-pending webhook remains locked and offers a status refresh.
- A missing or invalid guest cookie cannot reveal order details or submit an application. The page explains that the same browser used for checkout is required and provides the existing support contact.
- A mismatched amount, currency, webhook signature, order, or attempt never unlocks the application.
- An already-submitted order returns its existing submitted state rather than creating another application.

## Out of scope

- Requiring a visitor to create an AFL account.
- Using the legacy `feature_requests` endpoint, which accepts client-controlled payment fields and is not the verified magazine-payment workflow.
- Changing magazine prices, editorial policy, campaign configuration, or the Bachs webhook signature scheme.
- Adding email-based guest-access recovery in this release; the secure cookie supports return and later visits in the same browser until expiry.
