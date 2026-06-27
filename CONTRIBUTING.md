# Contributing

Thank you for helping improve Shaurmyan. This project should stay practical,
maintainable, and safe to deploy.

## Development Setup

1. Install Node.js 20 or newer.
2. Install dependencies:

   ```bash
   npm install
   ```

3. Copy `.env.example` to `.env.local` and fill in local Firebase values.
4. Start the Vite development server:

   ```bash
   npm run dev
   ```

## Quality Checks

Before opening a pull request, run:

```bash
npm run build
```

Use `npm run lint` when changing TypeScript-heavy areas.

## Pull Requests

- Keep changes focused and avoid unrelated refactors.
- Do not commit secrets, `.env` files, generated `dist/` output, or local IDE
  settings.
- Update documentation when behavior, setup, deployment, or environment
  variables change.
- Include screenshots or short notes for visible UI changes.
- Mention any Firebase, Firestore rules, Functions, or Vercel configuration
  impact in the pull request description.
