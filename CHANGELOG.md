# Changelog

## 2026-02-09
- Added production-readiness hardening changes:
  - fail-fast Supabase env handling in production with dev-only setup messaging
  - moved child credential hashing/verification to server-side Supabase Edge Function (`child-credentials`)
  - added SQL migration for secure child credential RPC functions with ownership checks
  - introduced shared client factory and contract validation helpers
  - added CI workflow and root quality scripts (`lint`, `typecheck`, `test`, `build:all`)
  - added baseline automated tests and production-readiness documentation
  - started modular refactor by extracting admin/dashboard/modules helpers into feature/service folders
