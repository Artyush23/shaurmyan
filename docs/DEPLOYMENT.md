# Deployment

Shaurmyan has two deployable parts:

1. The Vite frontend, intended for Vercel
2. Firebase resources, including Firestore rules and Functions

## Frontend deployment on Vercel

Import the repository into Vercel and use:

| Setting | Value |
| --- | --- |
| Framework preset | Vite |
| Build command | `npm run build` |
| Output directory | `dist` |
| Install command | `npm install` |

Add the `VITE_FIREBASE_*` variables from `.env.example` to the Vercel project for each required environment.

The current application switches views without a client-side URL router, so no SPA fallback rule is required for its present navigation model.

## Firebase deployment

Authenticate and select the intended Firebase project:

```bash
firebase login
firebase use <firebase-project-id>
```

Deploy Firestore rules and Functions:

```bash
firebase deploy --only firestore:rules,functions
```

The default Functions region is `europe-west1` unless `FUNCTION_REGION` is configured.

## API routing

Local Vite development proxies `/api` to `http://localhost:3001`. That proxy does not exist in a Vercel production build.

Before enabling production banking or OTP features, choose and configure one of these approaches:

- Add Vercel rewrites that forward banking routes to the deployed Firebase Function.
- Configure the frontend to call the full Firebase Function URL.
- Deploy equivalent API handlers on Vercel.

The repository currently has no `vercel.json`, so this routing must be added separately. Ensure the deployed Function's `ALLOWED_ORIGINS` includes the exact frontend origin.

The local `server.js` OTP route is not deployed automatically by the Vite build. Host it as a server process or replace it with a serverless/Functions implementation if OTP delivery is required in production.

## Production checklist

- Set frontend Firebase variables in Vercel.
- Configure Functions environment values and provider secrets.
- Add the production domain to Firebase Auth authorized domains.
- Restrict CORS to trusted frontend origins.
- Verify Firestore rules with customer and admin accounts.
- Configure `/api` production routing.
- Confirm banking OAuth callback URLs with each provider.
- Replace the simulated card flow before accepting real payments.
- Run frontend and Functions builds before release.

## Verification

```bash
npm run lint
npm run build
npm --prefix functions run lint
npm --prefix functions run build
```

After deployment, verify sign-in, profile writes, order creation, admin authorization, order updates, CORS behavior, and any configured banking callbacks.
