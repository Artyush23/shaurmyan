# Roadmap

This roadmap reflects gaps and extension points visible in the current codebase. It is not a release commitment.

## Near term

- Align Firestore rules with the checkout payment values used by the frontend
- Allow authenticated customers to read only their own orders
- Consolidate administrator authorization around server-managed custom claims
- Remove project-specific fallback configuration from client source
- Add production routing for Firebase Functions and OTP endpoints
- Expand i18n coverage to checkout, profile, and admin copy

## Product and data

- Persist menu items and pricing in Firestore
- Persist reviews and moderation state in Firestore
- Add inventory and item-availability controls
- Add restaurant hours and delivery-zone validation
- Add order cancellation and customer status tracking
- Replace random order identifiers with collision-safe server-generated IDs

## Payments

- Replace mock card tokenization with a PCI-compliant payment provider
- Move OTP and payment confirmation to trusted server-side code
- Add payment webhooks and idempotent order confirmation
- Store only provider tokens and non-sensitive card metadata
- Add refund and failed-payment handling

## Banking

- Complete provider-specific Open Banking contracts and mappings
- Add token refresh and reconnection handling
- Implement statement and summary exports
- Add audit logging for protected financial actions
- Move rate limiting to shared infrastructure suitable for multiple Function instances

## Engineering

- Add unit tests for pricing, cart, authentication, and payment helpers
- Add Firestore rules tests with the Emulator Suite
- Add integration tests for checkout and admin order workflows
- Add end-to-end browser tests for critical customer paths
- Add continuous integration for type checks, tests, and builds
- Add error monitoring and structured production observability

## Documentation and governance

- Add a repository license selected by the project owner
- Add contribution and security-reporting guidelines
- Document production data retention and privacy requirements
- Add release notes and versioning conventions
