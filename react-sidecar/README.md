# React Sidecar Migration

This folder is a separate React project so the existing production app remains untouched.

## What is included

- Vite + React + React Router scaffold
- React auth flow at `/` (sign in, sign up, forgot password, reset password)
- React landing page at `/landing` with:
  - authenticated user greeting
  - children list
  - add-child form
  - module library preview
- React dashboard page at `/dashboard` with:
  - child selector
  - progress summary
  - child module status cards

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

## Migration status

✅ Started in separate sidecar project (no edits to legacy app files)
✅ Login + landing + dashboard routes migrated to React foundations
🔜 Continue with admin/module routes and deeper dashboard feature parity
