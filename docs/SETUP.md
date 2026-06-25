# Local setup

## Requirements

- Node.js 20 or newer
- npm
- A Firebase project
- Firebase CLI for emulator or deployment work

## Install dependencies

```bash
npm install
npm --prefix functions install
```

## Configure the environment

Copy the environment template:

```bash
cp .env.example .env.local
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env.local
```

Replace the Firebase placeholders with the web-app configuration from Firebase Console. Keep `.env.local` untracked.

### Frontend variables

| Variable | Purpose |
| --- | --- |
| `VITE_FIREBASE_API_KEY` | Firebase web API identifier |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase Auth domain |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase storage bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase sender ID |
| `VITE_FIREBASE_APP_ID` | Firebase web app ID |
| `VITE_FIREBASE_MEASUREMENT_ID` | Optional Analytics measurement ID |

Vite exposes variables prefixed with `VITE_` to browser code. Never place private server credentials in a `VITE_` variable.

### Optional local OTP service

| Variable | Purpose |
| --- | --- |
| `API_PORT` | Express service port; defaults to `3001` |
| `TWILIO_ACCOUNT_SID` | Twilio account identifier |
| `TWILIO_AUTH_TOKEN` | Twilio server credential |
| `TWILIO_PHONE_NUMBER` | Twilio sender number |

These values are read only by `server.js`.

### Firebase Functions variables

The Functions runtime reads `FUNCTION_REGION`, `ALLOWED_ORIGINS`, `BANKING_CALLBACK_URL`, `BANKING_STATE_SECRET`, and the TBC/BOG provider variables listed in `.env.example`.

Store production secrets with the environment or secret-management approach used by your Firebase Functions deployment. Do not place provider secrets in frontend files.

## Start the frontend

```bash
npm run dev
```

Open `http://localhost:3000`.

## Start the optional OTP service

In another terminal:

```bash
npm run dev:api
```

Vite forwards `/api` requests to `http://localhost:3001` during development.

## Validate the project

```bash
npm run lint
npm run build
npm --prefix functions run lint
npm --prefix functions run build
```

## Useful scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start Vite on port 3000 |
| `npm run dev:api` | Start the local Express/Twilio service |
| `npm run build` | Build the frontend into `dist/` |
| `npm run preview` | Preview the production frontend build |
| `npm run lint` | Run the frontend TypeScript check |
| `npm --prefix functions run serve` | Build Functions and start the Functions emulator |
