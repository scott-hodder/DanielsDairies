# Production Readiness Review (DanielsDairies)

This review focuses on **code cleanliness, production hardening, scalability, and developer onboarding**.

## Executive summary

Your project has strong momentum and clear product intent, but it currently behaves like a fast-moving prototype:

- There are multiple very large files that combine UI rendering, business logic, and data access.
- Security-sensitive concerns (auth config behavior, child-password flow, payment flow assumptions) should be tightened before scaling.
- Developer experience is not yet standardized (no lint/test scripts, no CI checks, duplicated logic between app surfaces).

The good news: this is very fixable with a staged plan over 2–6 weeks.

---

## What to fix first (priority order)

### P0 (this week): protect users + prevent regressions

1. **Fail closed for missing environment config**
   - Do not construct a placeholder Supabase client in production paths.
   - Throw a clear startup error and render a setup message only in development.

2. **Move child credential handling fully server-side**
   - The browser currently hashes and verifies child passwords via direct table access patterns.
   - Replace with server-side RPC/Edge Function endpoints and strict RLS policies.

3. **Harden payment integration boundaries**
   - Stripe code calls `/api/create-checkout-session` and `/api/verify-payment` but no guaranteed server contract exists in this repo.
   - Introduce explicit backend handlers + idempotency + signed webhook reconciliation.

4. **Add a minimum CI gate**
   - Required checks: install, build (both apps), lint, tests.
   - Block merges on failures.

### P1 (next 2 weeks): clean architecture for maintainability

1. **Split monolithic files into feature modules**
   - Start with `admin`, `dashboard`, and module generator areas.
   - Enforce folder boundaries: `features/*`, `lib/*`, `services/*`, `ui/*`.

2. **Define one source of truth for auth/data clients**
   - You currently have duplicated auth/supabase wrappers in vanilla and React sidecar.
   - Extract shared contracts/utilities, or formally separate them with clear ownership docs.

3. **Centralize state and side effects**
   - Reduce global `window.*` coupling and direct DOM mutation by introducing typed state services/events.

4. **Introduce schema and API typing**
   - Add DB types generation and request/response schema validation (Zod or equivalent).

### P2 (month 1+): scale and team-readiness

1. **Observability + auditability**
   - Structured logging, error tracking, trace IDs, and operational dashboards.

2. **Performance budgets**
   - Chunk splitting, route-level loading, image optimization, and Lighthouse thresholds.

3. **Formal engineering standards**
   - PR template, architecture decision records (ADRs), coding conventions, release process.

---

## Key findings and recommendations

### 1) Architecture and code organization

#### Findings
- Several files are extremely large, making review/testing difficult and increasing regression risk.
- UI logic, data access, and orchestration are often colocated.
- Cross-cutting behavior is frequently attached to globals (`window.*`), which increases hidden coupling.

#### Recommendations
- Use a **feature-first structure** per domain (auth, dashboard, modules, admin).
- Cap file size (e.g., soft limit 300–500 LOC; hard limit 800 LOC).
- Introduce a clear layering rule:
  - `ui` → `application/services` → `infrastructure/data`.
- Add import boundaries (ESLint rules) to prevent layer violations.

---

### 2) Security hardening

#### Findings
- Supabase client currently falls back to placeholder values when env vars are missing.
- Child-password operations are handled in front-end code paths.
- Payment flow assumes backend endpoints without clear guarantee in this codebase.

#### Recommendations
- **Startup policy**: fail fast if required env vars are missing outside development.
- **Credential policy**: no password hashing/verification logic in browser-delivered code.
- **DB policy**:
  - enforce RLS for every table;
  - remove broad `select('*')` where not required;
  - add service-role-only paths for sensitive operations.
- **Payment policy**:
  - create checkout session on backend;
  - verify payment only via webhook + signature;
  - persist entitlement changes in idempotent transactions.

---

### 3) Developer experience and onboarding

#### Findings
- No standardized lint/test scripts at the repository root.
- Sidecar build currently fails in this environment due to missing plugin install.
- Two UI stacks (vanilla + React sidecar) increase cognitive load without an explicit contribution model.

#### Recommendations
- Add root scripts:
  - `lint`, `typecheck`, `test`, `test:e2e`, `build:all`.
- Add a `CONTRIBUTING.md` with:
  - local setup;
  - branch/commit conventions;
  - required checks before PR.
- Clarify product direction:
  - either migrate progressively to React;
  - or keep dual-stack but document ownership and boundaries.

---

### 4) Reliability and quality controls

#### Findings
- No enforced automated quality gate in-repo.
- Heavy usage of manual DOM mutation and global state can create brittle behavior.

#### Recommendations
- Add test pyramid baseline:
  - unit tests for pure logic;
  - integration tests for data/services;
  - Playwright smoke tests for auth/dashboard critical paths.
- Add pre-commit hooks for formatting/linting.
- Add CI environments for preview deployments and smoke tests.

---

### 5) Production operations

#### Recommendations
- Add environment matrix and secret management policy (`dev/staging/prod`).
- Add runbooks:
  - auth outage;
  - payment webhook delay;
  - module generation failure.
- Add SLOs/alerts for critical journeys (login, module load, purchase).

---

## Suggested 30-day cleanup roadmap

### Week 1
- Add CI gate for build + lint + tests.
- Implement env fail-fast behavior.
- Create security backlog for credential/payment/RLS hardening.

### Week 2
- Split `admin` into feature modules.
- Introduce shared API/service layer with typed contracts.
- Add baseline unit/integration tests.

### Week 3
- Split `dashboard` flows and remove high-risk `window.*` couplings.
- Add error tracking and structured logs.

### Week 4
- Stabilize release process (versioning/changelog/rollback).
- Document architecture + onboarding + ownership map.

---

## “If I hire another developer tomorrow” checklist

Use this as your hiring-readiness bar:

- [ ] One-command setup works from clean machine.
- [ ] CI is green and required for merge.
- [ ] `CONTRIBUTING.md` explains codebase layout and standards.
- [ ] Architecture diagram + data flow docs exist.
- [ ] Secrets/env docs are complete and safe.
- [ ] Core paths covered by automated tests.
- [ ] Incident/runbook docs exist for top production risks.

If these are true, new engineers can contribute safely in days, not weeks.
