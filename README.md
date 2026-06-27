# Shaurmyan

Shaurmyan is a responsive online ordering experience for a Tbilisi street-food restaurant. It combines a multilingual customer storefront with configurable menu items, authenticated checkout, customer profiles, live Firestore orders, and protected administration tools.

## Live demo

[Open Shaurmyan](https://shaurmyan.vercel.app)

## Features

- Responsive restaurant storefront with animated product presentation
- Menu browsing by category, size, and optional extras
- Persistent shopping cart and browser-local menu preferences
- Email/password, Google, and Apple authentication through Firebase Auth
- Authenticated checkout with orders stored in Cloud Firestore
- Customer profiles, recent-order history, and locally stored masked card references
- Admin dashboard for order status, revenue summaries, menu management, and review moderation
- Protected banking dashboard backed by Firebase Functions and configurable Open Banking providers
- Georgian, English, Russian, and Armenian language options
- SEO metadata, social sharing tags, and restaurant structured data

See [docs/FEATURES.md](docs/FEATURES.md) for implementation details and current limitations.

## Tech stack

- React 19 and TypeScript
- Vite 6
- Tailwind CSS 4
- Firebase Auth and Cloud Firestore
- Firebase Functions with Express
- Motion, Lucide React, i18next, and React Helmet Async
- Vercel for the frontend deployment

## Project structure

```text
.
├── public/                  Static assets
├── src/
│   ├── components/          Storefront, checkout, profile, admin, and banking UI
│   ├── data/                Initial menu and review data
│   ├── hooks/               Authentication and checkout hooks
│   ├── pages/               Page-level components
│   ├── utils/               Payment helpers and admin notifications
│   ├── App.tsx              Main application state and view orchestration
│   ├── firebase.ts          Firebase client configuration and auth helpers
│   └── i18n.ts              Translation resources and language detection
├── functions/
│   └── src/index.ts         Firebase Functions banking API
├── docs/                    Extended project documentation
├── firestore.rules          Firestore security rules
├── firebase.json            Firebase service configuration
├── server.js                Optional local Twilio OTP service
└── vite.config.ts           Vite, Tailwind, and local API proxy configuration
```

## Installation

### Requirements

- Node.js 20 or newer
- npm
- A Firebase project for authentication and Firestore features
- Firebase CLI for rules or Functions deployment

### Local development

```bash
git clone <repository-url>
cd ShaurmYAN
npm install
cp .env.example .env.local
npm run dev
```

The development server runs at `http://localhost:3000`.

The optional OTP endpoint in `server.js` runs separately:

```bash
npm run dev:api
```

For complete setup instructions, see [docs/SETUP.md](docs/SETUP.md).

## Environment variables

Copy `.env.example` to `.env.local` and replace placeholders only in your local or deployment environment. Never commit credentials.

The browser application uses these Firebase variables:

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_MEASUREMENT_ID=
```

Additional server-side variables support the optional Twilio OTP service and Firebase Functions banking integration. Their complete list and scope are documented in [docs/SETUP.md](docs/SETUP.md).

## Firebase setup

Shaurmyan uses Firebase for:

- Customer authentication
- User profile documents
- Order creation and live admin order updates
- Server-side banking endpoints through Firebase Functions

Create a Firebase web app, enable the required sign-in providers, create a Firestore database, configure local environment variables, and deploy the included rules:

```bash
firebase login
firebase use <firebase-project-id>
firebase deploy --only firestore:rules
```

The repository includes a default Firebase project alias. Replace it with your own project before deployment. Full instructions are in [docs/FIREBASE.md](docs/FIREBASE.md).

## Deployment

Build the frontend with:

```bash
npm run build
```

Deploy the generated Vite application to Vercel with:

- Build command: `npm run build`
- Output directory: `dist`
- Framework preset: Vite

Add the `VITE_FIREBASE_*` values to the Vercel project environment. Deploy Firestore rules and Functions separately with the Firebase CLI:

```bash
firebase deploy --only firestore:rules,functions
```

The banking and OTP routes require an explicit production API routing strategy; this repository does not currently include a Vercel rewrite configuration. See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Roadmap

Planned work is tracked in [docs/ROADMAP.md](docs/ROADMAP.md). Current priorities include:

- Persist menu and review management in Firestore
- Align customer order-history access with Firestore rules
- Replace the simulated card flow with a payment provider
- Complete production routing for API endpoints
- Add automated tests and continuous integration

## Documentation

- [Project overview](docs/PROJECT_OVERVIEW.md)
- [Features](docs/FEATURES.md)
- [Local setup](docs/SETUP.md)
- [Firebase configuration](docs/FIREBASE.md)
- [Deployment](docs/DEPLOYMENT.md)
- [Roadmap](docs/ROADMAP.md)

## License

This project is licensed under the ISC License. See [LICENSE](LICENSE) for details.
