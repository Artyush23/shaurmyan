# Features

## Storefront

- Responsive navigation and mobile menu
- Animated hero and product showcase
- Menu categories for signature items, classics, combos, drinks, and sides
- Configurable product sizes, quantities, spice levels, and extras
- Persistent cart between browser sessions
- Free-delivery calculation for qualifying orders

## Localization

The navigation and core customer labels support:

- Georgian
- English
- Russian
- Armenian

Language selection is detected and cached with i18next. Some administrative and checkout copy remains directly embedded in components rather than fully translated.

## Authentication

- Email/password registration and sign-in
- Google sign-in
- Apple sign-in
- Password reset
- Firestore-backed profile synchronization
- Protected profile, admin, and banking views

Provider availability depends on the Firebase Authentication configuration for the deployed project.

## Checkout and orders

- Delivery contact and address collection
- Online-card and cash-on-delivery options
- Authentication gate before an order is written
- Firestore order creation with items, totals, notes, user identity, and status
- Recent-order display in the customer profile
- Real-time admin order subscription
- Admin status transitions and order deletion

## Customer profile

- Editable first name, last name, and phone number
- Firebase account identity and role display
- Recent Firestore order history
- Locally saved masked card reference
- Sign-out controls

## Reviews

- Approved-review display
- Customer review submission
- Admin approval and deletion

Review moderation currently persists only in the current browser through `localStorage`.

## Admin tools

- Delivered-order revenue summary
- Total and active order counts
- Product popularity calculation
- Live order notifications
- Menu item creation, deletion, and price updates
- Review moderation

Only order data is currently persisted in Firestore. Menu and review changes remain browser-local.

## Banking dashboard

- Firebase ID-token authentication
- Admin authorization checks
- Connected-account balances
- Transaction summaries
- TBC and Bank of Georgia provider support in the Functions API
- CORS controls, request IDs, security headers, payload limits, and rate limiting

The dashboard requires valid provider credentials, endpoints, OAuth setup, and production routing to the deployed Function.

## Payment implementation status

The card checkout is a demonstration flow. It includes input validation, Luhn checking, mock token generation, a test card registry, and optional SMS OTP delivery. It does not connect to a payment processor or move money.

Do not use this flow for real card processing without replacing it with a PCI-compliant payment provider.
