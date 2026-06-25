# Firebase configuration

Shaurmyan uses Firebase Authentication, Cloud Firestore, and Firebase Functions.

## Create the project

1. Create or select a Firebase project.
2. Register a web application.
3. Copy the web configuration values into `.env.local` using the `VITE_FIREBASE_*` names from `.env.example`.
4. Update the Firebase CLI project alias:

```bash
firebase use --add
```

The committed `.firebaserc` points to the original project. Use your own project ID before deploying a fork.

## Authentication

Enable the providers required by the application:

- Email/Password
- Google
- Apple, if Apple sign-in will be offered

Add local and production domains to Firebase Authentication's authorized domains. Apple sign-in also requires configuration in the Apple Developer portal.

## Firestore

Create a Firestore database and deploy the included rules:

```bash
firebase deploy --only firestore:rules
```

The application uses these paths:

| Path | Purpose |
| --- | --- |
| `users/{uid}` | Profile data and application role fields |
| `orders/{orderId}` | Customer orders and status |
| `users/{uid}/banking/tokens` | Open Banking token bundles written by Functions |
| `adminPanel/{docId}` | Reserved protected admin documents |

## Administrator access

Administrator checks currently use a combination of:

- The user profile's `role` or `isAdmin` field
- An email comparison in the frontend
- Firebase custom claims in selected rules and Functions paths

Before production use, standardize these checks around Firebase custom claims or a single trusted server-managed role source. Avoid granting admin access by allowing clients to write their own role fields.

## Rules compatibility note

Review `firestore.rules` before deployment. The current rules and frontend do not fully agree on every access path:

- The customer profile queries the user's orders, while the current order read rule is admin-only.
- Admin identity values are not consistently represented across frontend code and Firestore rules.
- The checkout payment method values should be kept aligned with the allowed rule values.

These issues should be resolved and tested with the Firebase Emulator Suite before production launch.

## Firebase Functions

The Functions source is in `functions/src/index.ts` and exports the `api` HTTPS function.

Build and test it locally:

```bash
npm --prefix functions install
npm --prefix functions run serve
```

Deploy it:

```bash
firebase deploy --only functions
```

Configure all required banking environment values before deployment. `BANKING_STATE_SECRET` must be a long, random server-side secret.

## Security guidance

- Keep private provider credentials out of Git.
- Treat Firebase web configuration as client configuration, not as authorization.
- Enforce access through Firestore rules, Functions authorization, and provider restrictions.
- Restrict authorized domains and API key usage in the relevant cloud console.
- Test rules against signed-out, customer, and administrator sessions.
