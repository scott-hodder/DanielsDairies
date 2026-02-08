# React Sidecar Migration

This folder is a separate React project so the existing production app remains untouched.

## What is included

- Vite + React + React Router scaffold
- React auth page (`/`) using Supabase
- Starter dashboard route (`/dashboard`)
- Placeholder routes for current pages (`/landing`, `/admin`, `/module`)

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

## Migration plan

1. Move shared API/auth/data functions from `/src` to this project's `src/lib`.
2. Convert each HTML page into a React route/component.
3. Reuse existing CSS gradually, then replace with component-based styles.
4. Add tests after each route conversion.
