# React Sidecar Migration

This folder is a separate React project so the existing production app remains untouched.

## Scope now covered in React sidecar

- `/` Auth flow (sign in, sign up, forgot password, recovery update)
- `/landing` Parent landing page (children list, add child, module preview)
- `/dashboard` Parent dashboard (child selection + progress summary)
- `/module` Module library and per-child status updates
- `/parent-insights` Child progress + weekly check-in insights
- `/admin` Admin centre for module management

## Run locally

```bash
cd react-sidecar
npm install
npm run dev
```

## Environment variables

Create `react-sidecar/.env`:

```bash
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

## Notes

- Legacy app files in project root were not edited.
- This sidecar is now a full React route map for the existing pages, ready for parity hardening and UX refinements.


If these values are missing, the sidecar auth screen will show a configuration warning and disable submit actions until configured.
