# Production Launch Audit — 22 July 2026

## Verdict

**Repository remediation is complete, but an unrestricted public launch still requires the hosted-system and business sign-offs below.** The codebase is suitable for a staged deployment drill or invited beta after the new Edge Functions are deployed. Do not accept live payments until the Supabase, Stripe, backup/restore, alerting, and legal checks in [`docs/PRODUCTION_DEPLOYMENT_CHECKLIST.md`](docs/PRODUCTION_DEPLOYMENT_CHECKLIST.md) are completed.

The production build succeeds, lint/type guards pass, all 39 unit tests pass, the production dependency audit is clear, public browser and accessibility tests pass, every table-creation occurrence in the migration set has a corresponding RLS-enable occurrence, the Stripe webhook verifies signatures and implements idempotency, privacy export/deletion endpoints exist, and client-side telemetry is implemented.

## Change completed in this review

- Removed the decorative Daniel/Coco/Kip pseudo-elements from the sides of the desktop Adventures map.
- Preserved the wide desktop map width, centering, and 600px viewport.
- Confirmed the production output contains no references to the removed side decorations.
- Added shared user/admin/service-role authorization guards to privileged Edge Functions and switched admin generation calls to signed-in session tokens.
- Cleared production dependency advisories and added an audit gate to CI.
- Added production headers, safe environment documentation, deterministic Playwright configuration, public smoke tests, and automated axe accessibility checks.
- Converted seven oversized character PNGs to lazy-loaded WebP assets and split the main production bundles.
- Added a deployed-site verification command and a separate checklist for controls that require access to hosting, Supabase, Stripe, DNS, backups, and business owners.

## Automated evidence

| Check | Result |
|---|---|
| `npm run lint -- --quiet` | Pass — 126 files scanned |
| `npm run typecheck` | Pass — static guards |
| `npm test -- --run` | Pass — 39/39 tests |
| `npm run build:all` | Pass — 222 modules transformed; optional unconfigured sidecar skipped |
| `npm audit --omit=dev --audit-level=high` | Pass — 0 vulnerabilities |
| Browser smoke suite | Pass — 3 public flows; 5 staging-credential/payment flows correctly skipped |
| Accessibility automation | Pass — landing, login, signup, privacy, and terms have no serious/critical axe findings |

Build observations:

- Dashboard JavaScript: 331.58 KB minified / 89.69 KB gzip (down from 873.86 KB / 230.81 KB gzip).
- Built site: approximately 5.87 MB (down from 23.13 MB).
- Seven crew-avatar WebPs total approximately 377 KB (down from 17.6 MB of PNGs).
- All emitted JavaScript chunks are below 500 KB.
- `caniuse-lite` is out of date.

## P0 — launch blockers

### 1. Enforce server-side roles in privileged Edge Functions

**Repository status: remediated.** Shared guards now validate users server-side, verify administrator roles for AI/admin functions, require the service role for the internal payment email, and validate authenticated feedback/push requests. Static regression tests cover these boundaries. Deploy the functions and run the anonymous/non-admin production probes before launch.

`generate-module` creates a service-role Supabase client and performs privileged reads/writes, but it does not authenticate the caller or verify `is_admin`. Its frontend caller deliberately sends the public anon key as the bearer token. This lets anyone who obtains the public anon key invoke an expensive AI/admin workflow if the function accepts anon JWTs. The job-status route also returns complete job results without checking ownership.

`generate-narration` similarly uses service-role access and paid TTS providers without checking that the caller is an admin. A valid normal user session is not sufficient authorization for an admin-only operation.

`send-payment-failure-email` accepts an arbitrary recipient, subject, retry URL, and name, then calls a service-role mail RPC without verifying that the caller is the Stripe webhook/service role. `send-feedback-email` also has no caller/rate-limit validation. `send-push-notification` contains a no-Authorization path that proceeds when `user_id` is supplied; gateway JWT settings should not be the only safeguard.

Required fix:

1. Add a shared `requireUser` / `requireAdmin` guard that validates the caller JWT with `auth.getUser()` and checks `parent_profiles.is_admin` server-side.
2. Apply `requireAdmin` to module generation, narration, audit-fix, admin notification, and every service-role-backed admin function.
3. Make `send-payment-failure-email` internal-only by requiring the service-role bearer or a dedicated signed secret.
4. Rate-limit feedback and other public functions; validate body sizes and field bounds.
5. Ensure hosted function `verify_jwt` settings are explicit and reviewed, not assumed.
6. Add negative integration tests proving anon and ordinary authenticated users receive 401/403.

### 2. Clear known production dependency advisories

**Repository status: remediated.** Runtime packages and the lockfile were upgraded, build-only Capacitor CLI and Sharp packages were moved to development dependencies, and CI now blocks high-severity production advisories. The current audit reports zero vulnerabilities.

`npm audit --omit=dev` currently reports:

- Critical: `tar@7.5.16` denial-of-service advisories, via `@capacitor/cli`.
- High: `sharp@0.34.5` inherited libvips vulnerabilities.
- High: `ws@8.18.3`, via Supabase Realtime.
- High: `brace-expansion@5.0.6`, via Capacitor CLI tooling.
- Low: `dompurify@3.4.11` custom-element sanitization bypass.

Required fix:

1. Upgrade the affected packages/lockfile and rerun the full suite plus `npm audit --omit=dev`.
2. Move build-only packages such as `@capacitor/cli` and `sharp` to `devDependencies` if they are not required at runtime.
3. Confirm the upgraded DOMPurify still passes module-content sanitization tests.
4. Add a dependency audit step to CI with an agreed severity threshold.

### 3. Complete the money-path and database deployment drill

The repository's release notes already state that the new payment flow has not been exercised end-to-end against Stripe test mode. Before launch, prove all of the following against a staging Supabase project created from migrations:

- Paid signup success, cancellation, expiration, resume, and failed payment.
- Webhook signature rejection and retry behaviour.
- Duplicate `invoice.paid` and duplicate webhook delivery do not grant credits twice.
- Upgrade, downgrade, annual/monthly switching, cancellation, and customer portal return.
- Stripe webhook subscriptions include every event used by the code.
- All migrations apply cleanly from a fresh database and match the hosted schema.
- The July table-grant repair is deployed; the migration itself documents that missing grants previously broke payments, Family Gold, arcade, email logs, push tokens, and telemetry.
- Backup/restore is tested, not merely enabled.

Do not use production customer data for this drill.

### 4. Establish a trustworthy browser release gate

**Repository status: partially remediated.** CI now runs deterministic Playwright public smoke and accessibility tests. Authenticated and Stripe flows remain intentionally gated until staging credentials and Stripe test-mode configuration are supplied.

The repo has eight Playwright smoke tests, but CI currently runs only lint, static type guards, unit tests, and build. Authenticated tests skip without staging credentials, Stripe tests skip without a feature flag, and this audit's local public-page run hung.

Required fix:

1. Make Playwright start/stop its own test web server deterministically.
2. Run public smoke tests in every pull request.
3. Run authenticated staging tests before deployment with a dedicated synthetic family.
4. Run the Stripe test-mode flow in a protected pre-release job.
5. Add axe (or equivalent) accessibility checks for landing, signup, login, dashboard, Adventures, profile, parent insights, and modals.
6. Perform manual keyboard, screen-reader, reduced-motion, phone, tablet, and slow-network passes.

## P1 — complete before broad promotion

### Production HTTP security headers

**Repository status: configured.** `public/_headers` now defines the required response headers and cache policy. Confirm the chosen host supports Netlify-style `_headers`, or translate the rules to its native configuration, then run `npm run verify:production`.

The Vite development server defines `X-Frame-Options` and `Permissions-Policy`, but those development headers are not emitted by a static production build. The build injects a CSP meta tag that permits `'unsafe-inline'`; the codebase also contains 12 inline script tags and more than 200 lines with inline event handlers. `X-Content-Type-Options` should be an actual response header, not a meta tag.

At the production CDN/host, set and verify with an external header scan:

- Strict-Transport-Security.
- Content-Security-Policy as an HTTP header, including `frame-ancestors`.
- X-Content-Type-Options.
- Referrer-Policy.
- Permissions-Policy.
- A deliberate framing policy.

Then reduce inline handlers/scripts and move toward a nonce/hash-based CSP without `'unsafe-inline'`.

### Authentication configuration

**Repository status: safer defaults checked in.** Local Supabase configuration now requires mixed-case letters and digits, email confirmation, and secure password changes. CAPTCHA, MFA, leaked-password protection, redirects, and session policy must still be set and verified in the hosted project.

The checked-in local Supabase config has an eight-character minimum password but no complexity requirement, email confirmation disabled, secure password change disabled, and no CAPTCHA. Hosted production settings may differ, so verify them directly.

Recommended production controls:

- Email confirmation enabled for parent accounts.
- Secure password change / recent re-authentication enabled.
- Leaked-password protection and suitable password policy enabled.
- CAPTCHA or equivalent abuse controls on signup/reset after monitoring thresholds are defined.
- MFA required for administrators and strongly recommended for practitioners.
- Exact production redirect allowlist; remove development URLs from production.
- Session lifetime and refresh-token policy documented for shared family devices.

### Performance and mobile delivery

**Repository status: major payload work completed.** Character assets were reduced by about 17.2 MB, the built site by about 17.3 MB, and the dashboard entry chunk by about 62%. Real-device performance budgets and throttled measurements still require deployed staging.

- Convert the seven large crew PNGs to appropriately sized WebP/AVIF variants and use explicit dimensions/lazy loading where possible.
- Split dashboard/minigame/admin code so a child dashboard visit does not download unrelated features.
- Add immutable cache headers for hashed assets and sensible caching for public images.
- Establish budgets for JS, image bytes, LCP, INP, and CLS, then test on a throttled mid-range phone.
- Update Browserslist data.

### Operational readiness

Telemetry is self-hosted and useful, but current operations rely on someone manually querying error tables. Before broad launch:

- Add automatic alerts for login failure rate, checkout/webhook errors, module-load failures, and elevated client errors.
- Define an owner, severity levels, escalation path, support response targets, and incident/status communication process.
- Create rollback and database restore runbooks; perform a restore rehearsal with documented RPO/RTO.
- Schedule telemetry pruning and verify weekly-email job monitoring/double-send protection.
- Maintain separate dev/staging/prod projects and secrets; rotate production secrets after launch rehearsal.

### Database authorization review

Static migration inspection found 97 table-creation and 97 RLS-enable occurrences, plus 761 policy declarations. That is a good baseline, not proof that the hosted database is safe. There are also 55 `SECURITY DEFINER` occurrences, which deserve a focused review for fixed `search_path`, caller checks, least-privilege grants, and revocation from `anon`/`public` where appropriate.

Run a staging authorization matrix for parent A, parent B, child mode, practitioner, school, admin, anon, and service role. Attempt cross-tenant reads and writes for every table/RPC that contains child, family, practitioner, school, billing, or progress data.

## P2 — maintainability and polish

- Add `.env.example` containing variable names and safe setup notes; none currently exists.
- Replace the custom “typecheck” static guards with broader JSDoc/TypeScript coverage over service and billing boundaries.
- Add unit/integration coverage for auth recovery, module completion/star grants, parent PIN gates, RLS/RPC authorization, account deletion/export, school access, and practitioner invites.
- Review remaining `innerHTML` construction. Many paths escape values correctly, but the large sink surface makes regressions easy; prefer DOM APIs or centralized sanitized templates.
- Add bundle analysis and dependency-update automation.
- Remove or archive stale audit/release documents so there is one authoritative launch checklist.
- Obtain independent legal/privacy and clinical-content sign-off; the presence of privacy/terms pages is not a substitute for that review.

## Go-live gates

Launch only when all are true:

- [x] Privileged Edge Functions reject anon and non-admin callers in automated guards; deploy and probe the hosted functions.
- [x] Production dependency audit has no critical/high findings.
- [ ] Fresh staging database migration and authorization matrix pass.
- [ ] Stripe test-mode lifecycle and webhook replay/idempotency pass.
- [ ] Public, authenticated, payment, and accessibility browser suites pass reliably.
- [ ] Production auth/redirect/CORS/function JWT settings are recorded and verified.
- [ ] Production response headers pass an external scan.
- [ ] Backup restore and rollback rehearsals pass.
- [ ] Error/payment/login alerts reach a named on-call owner.
- [ ] Mobile performance budgets pass on a throttled real-device-equivalent test.
- [ ] Privacy/legal, content, support, refund, and incident-response owners sign off.

## Recommended launch sequence

1. Fix function authorization and dependencies.
2. Rebuild a clean staging environment from migrations.
3. Run security/tenant, Stripe, browser, accessibility, and performance gates.
4. Launch to a small invited beta with no broad marketing.
5. Monitor errors, auth, webhooks, refunds, and support daily for at least one full billing cycle.
6. Expand gradually only after the go-live gates remain green.
