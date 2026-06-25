# Project overview

Shaurmyan is a single-page restaurant ordering application built for a Tbilisi street-food brand. The customer-facing experience presents the menu, product customizations, reviews, authentication, checkout, and account management in one responsive interface. Administrative views provide operational summaries and live order management.

## Application areas

### Customer storefront

The storefront includes a hero section, product showcase, categorized menu, review section, cart, and checkout drawer. Menu items support multiple sizes and paid extras. Cart, menu, review, and saved-card state use browser storage where noted.

### Authentication and profiles

Firebase Auth supports email/password accounts, Google sign-in, Apple sign-in, password reset, and sign-out. A corresponding `users/{uid}` Firestore document stores profile information and role metadata.

### Orders

Authenticated checkouts create documents in the `orders` collection. The admin dashboard subscribes to this collection in real time, calculates operational summaries, and can update or delete orders when authorized.

### Administration

The protected admin interface contains:

- Revenue, order, and product summaries
- Real-time order status management
- Menu item and price controls
- Review approval and deletion controls
- Audible notification for newly received orders

Menu and review changes are currently held in application state and `localStorage`; they are not written to Firestore.

### Banking integration

The Firebase Functions application exposes authenticated endpoints for:

- Starting TBC or Bank of Georgia OAuth authorization
- Handling OAuth callbacks
- Reading connected accounts
- Reading connected transactions
- Proxying token requests

Access tokens are stored under the authenticated user's Firestore banking subcollection. The dashboard is restricted to users recognized as administrators.

### Payment flow

The card interface validates card input, generates a mock token, optionally stores a masked card reference in `localStorage`, and supports an optional Twilio-based OTP demonstration through the local Express service. It is not a production payment gateway and does not settle funds.

## Data boundaries

| Data | Storage |
| --- | --- |
| User profiles | Cloud Firestore |
| Orders | Cloud Firestore |
| Banking provider tokens | Cloud Firestore, written by Firebase Functions |
| Cart | Browser `localStorage` |
| Menu changes | React state and browser `localStorage` |
| Review changes | React state and browser `localStorage` |
| Saved card reference | Browser `localStorage` |

## Architecture

The Vite frontend communicates directly with Firebase Auth and Firestore. Requests under `/api` are proxied to `http://localhost:3001` during local Vite development. Firebase Functions provide a separate Express API for banking endpoints and must be routed appropriately in production.

## Related documentation

- [Features](FEATURES.md)
- [Setup](SETUP.md)
- [Firebase](FIREBASE.md)
- [Deployment](DEPLOYMENT.md)
- [Roadmap](ROADMAP.md)
