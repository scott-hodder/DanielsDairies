# Production Deployment Checklist

Use this after merging the production-hardening work. Repository changes cannot alter hosted Supabase, Stripe, DNS/CDN, backup, or legal settings by themselves.

## 1. Deploy safely

- Create a fresh staging Supabase project from every migration in timestamp order.
- Deploy all Edge Functions after setting their secrets.
- Deploy the static build and confirm the host applies `public/_headers` (or translate it to the host's header configuration).
- Keep dev, staging, and production projects and keys separate.

Required function secrets vary by function and include:

- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- `APP_URL`, `CRON_SECRET`
- configured email provider/RPC secrets
- TTS/AI provider keys used by admin generation
- APNs credentials when iOS push is enabled

Never place server secrets in `VITE_*` variables.

## 2. Supabase hosted settings

- Require email confirmation for parent accounts.
- Require recent reauthentication for password changes.
- Enable leaked-password protection and an appropriate password policy.
- Enable CAPTCHA/abuse controls for signup and recovery.
- Require MFA for every administrator and practitioner account.
- Use exact production redirect URLs; remove dev/local URLs from production.
- Confirm JWT verification is enabled for every user-facing Edge Function.
- Confirm RLS is enabled on every exposed table and review every `SECURITY DEFINER` function.
- Run cross-tenant tests as parent A, parent B, practitioner, school, admin, and anon.

## 3. Stripe test-mode drill

- Successful paid signup and account activation.
- Checkout cancellation, expiration, and resume.
- Renewal, failed renewal, recovery, upgrade, downgrade, annual/monthly switch, cancellation, and portal return.
- Invalid webhook signatures are rejected.
- Replay every webhook; credits/subscriptions must remain idempotent.
- Confirm the production endpoint subscribes to every event handled in `stripe-webhook/index.ts`, including checkout expiration and invoice/subscription events.
- Confirm refund and support procedures with the business owner.

## 4. Automated production probe

Set safe public variables and run:

```powershell
$env:PROD_BASE_URL='https://app.danielsdiaries.com.au'
$env:VITE_SUPABASE_URL='https://PROJECT.supabase.co'
$env:VITE_SUPABASE_ANON_KEY='PUBLIC_ANON_KEY'
npm run verify:production
```

This checks public routes, response security headers, and that anonymous callers cannot invoke privileged functions.

## 5. Recovery and operations

- Enable production backups/PITR appropriate to the plan.
- Restore a backup into an isolated project and record actual recovery time/data loss.
- Rehearse frontend rollback and database forward-fix procedures.
- Configure alerts for auth failures, Stripe/webhook errors, client errors, and module-load failures.
- Assign a named incident owner and support escalation path.
- Schedule telemetry pruning and monitor weekly-email runs.

## 6. Human sign-off

- Independent privacy/legal review.
- Clinical/practitioner content review.
- Accessibility pass with keyboard, screen reader, reduced motion, zoom, phone, and tablet.
- Support, refund, breach-response, and incident-communication readiness.
- Small invited beta before broad promotion.
