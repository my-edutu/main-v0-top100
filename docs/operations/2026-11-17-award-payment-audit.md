# Direct Bachs award-payment audit — 17 November 2026

## Result

The former 95-name list was incomplete. Production Bachs contains 107 terminal-success payments: 101 award fees, five delivery fees and one magazine fee. The other 746 payment records are incomplete or failed. The 101 award payments belong to 101 distinct platform profiles.

Every award payment was independently checked using the authenticated Bachs checkout API and the existing exact-price verifier: original checkout ID/reference, order/attempt metadata and purpose, contracted amount/currency, terminal paid checkout and charge states, captured amount/fee evidence and absence of refunds. Provider charge IDs were matched back to the successful Bachs payment list. One payment used a different billing email. Its bound checkout and charge records independently confirmed the match. The remaining 100 matched the account email.

## Six recovered award payments

Each had an original coupon checkout for NGN 20,000, fully completed by Bachs in a different collection currency (XAF, KES, USD, GHS or XOF). The application and reconciliation RPC explicitly restrict automatic coupon confirmation to NGN charge currency. Therefore these legitimate completed NGN contracts were still open/failed in the platform.

This was a narrowly scoped operator recovery authorized by the user's instruction to record all missing successful award payments. It does not change the application-wide coupon/FX rule. The automatic delivery synchronization deployed earlier remains separate and enabled. Future foreign-currency coupon collections can still require the same review until the coupon rule is revised.

## Data recovery and verification

Restricted before/after evidence and the replay-safe recovery SQL are retained on the active Dokploy host under `/var/tmp/top100-award-payment-audit-20261117/` (directory mode 0700, files 0600). No provider key is in these files.

The transaction locked each original order and attempt, rechecked IDs, exact coupon principal, currency and coupon snapshot, and then used the existing `claim_bachs_award_payment_success` function. Original Bachs completion timestamps were passed into the canonical claim. The actual collection currency/gross amount and the provider-verified NGN contract were retained together in `provider_response.direct_bachs_audit_20261117`, with a processed `payment_webhook_events` audit record per attempt. Historical callback evidence and coupon snapshots remain intact. Coupon sales exclusions continue to apply.

Recovery first passed a rollback-only transaction (95 → 101), then committed. Replaying the same recovery under rollback performed no duplicate claims or audit inserts. Fresh Data API reads verified all 101 canonical order/attempt/charge links, exact captured principals and the six original completion timestamps. The five delivery payment records remain paid. No emails, new checkouts, charges, refunds or courier bookings were initiated.

The revised plaque list contains 101 verified names, including the six recovered payments. The named lists are kept with the restricted audit material.
