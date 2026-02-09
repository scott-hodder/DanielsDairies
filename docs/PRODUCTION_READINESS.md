# Production Readiness

## Required environment variables

### Development
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_STRIPE_PUBLISHABLE_KEY` (optional for this hardening pass)

### Staging / Production
- `VITE_SUPABASE_URL` (required, app fails fast if missing)
- `VITE_SUPABASE_ANON_KEY` (required, app fails fast if missing)
- Supabase Edge Function secrets:
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`

## Child credential flow (server-side)

Browser code no longer hashes or verifies child passwords.

1. Front-end calls Supabase Edge Function `child-credentials`.
2. Function validates request payload (Zod schema).
3. Function checks authenticated parent (`supabase.auth.getUser()`).
4. Function calls secured SQL RPC:
   - `set_child_password_secure(p_child_id, p_password)`
   - `verify_child_password_secure(p_child_id, p_password)`
5. SQL function verifies `auth.uid()` matches `children.parent_user_id` before update/verify.

Security notes:
- Password hashing happens in Postgres via `crypt(..., gen_salt('bf'))`.
- Unauthorized parent access raises an exception and is rejected.
- Request/response contracts are validated in both edge and client service layers.

## Local quality checks

Run from repository root:

- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run build:all`

## CI gate

GitHub Actions runs install + lint + typecheck + test + build:all for every push/PR.
