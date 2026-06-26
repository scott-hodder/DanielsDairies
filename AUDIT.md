# Daniel's Diaries — Full Product Audit

## 1. PERFORMANCE

### Critical Issues

- [ ] **dashboard.css is 7,160 lines (161 KB)** — Every page that imports it downloads the entire file, including adventure map, rewards, modals, and admin styles that aren't needed on most pages. Split this into per-feature CSS modules. **Priority: High | Effort: Medium | Impact: High**

- [ ] **Unoptimized images remain in production** — DanielTheDog.png (2.3 MB), DanielTheDogThumbsUp.png (2.3 MB), Map.png (2.7 MB), FM-LOGO-Light.png (609 KB). The WebP versions exist but PNG originals are still served in some places. Delete the PNGs and compress the logo below 100 KB. **Priority: High | Effort: Low | Impact: High**

- [ ] **No code splitting in Vite config** — All 18 pages build separate bundles but share no lazy-loaded chunks. `databaseService.js` (2,236 lines) gets bundled into every page that imports it, even if only 2 functions are used. Add `manualChunks` in vite.config.js to split vendor, supabase, and shared utilities. **Priority: Medium | Effort: Medium | Impact: Medium**

- [ ] **N+1 query in `updateChildCredits`** (`databaseService.js:690-696`) — Loops through children with individual UPDATE queries. Should be a single batch UPDATE. **Priority: High | Effort: Low | Impact: Medium**

- [ ] **129+ event listeners in `dashboardPage.js` with no visible cleanup** — If users navigate between sections, orphaned listeners accumulate. No `removeEventListener` pattern is used. **Priority: Medium | Effort: Medium | Impact: Medium**

- [ ] **No lazy loading on map image (2.7 MB)** — The adventure map loads eagerly. Add `loading="lazy"` and consider progressive loading. **Priority: Medium | Effort: Low | Impact: Medium**

### Minor Issues

- [ ] Cache TTL values are hardcoded magic numbers (120000, 300000ms) — extract to config constants
- [ ] `checkPathwayHasModules` fetches full module records when a `COUNT(*)` query would suffice
- [ ] `module.html` has duplicate font imports (lines 14-16 and 17-20 are identical)

---

## 2. SECURITY

### Critical

- [x] **Widespread XSS via innerHTML** — 30+ files use `innerHTML` with unsanitized data from Supabase. `dashboard-enhanced.js`, `daniel-relationship-system.js`, `daily-quest-system.js`, `roadblock-system.js`, `profile.js`, `billing.js`, `signup.js`, and admin files all inject database content directly into the DOM. An attacker who can modify a module name, quest title, or roadblock name in the database can execute arbitrary JavaScript in every user's browser. **Fix: Replace with `textContent` or add DOMPurify. Priority: Critical | Effort: Medium | Impact: Critical**

- [x] **Client-side-only admin authorization** — Admin access is checked by reading `is_admin` from `parent_profiles` and toggling UI visibility. An attacker can navigate to `/admin.html` directly, set `window.state.isCurrentUserAdmin = true` in the console, or intercept the Supabase response. The redirect on line 122-124 of `adminPage.js` can be intercepted by the browser. **Fix: Every admin RPC and edge function must verify `is_admin` server-side. Priority: Critical | Effort: Medium | Impact: Critical**

### High

- [x] **All edge functions use `Access-Control-Allow-Origin: '*'`** — This means any website can make authenticated requests to your API if they have a user's token. Restrict to your actual domain(s). **Priority: High | Effort: Low | Impact: High**

- [x] **Stripe webhook exposes error stack traces** (`stripe-webhook/index.ts:563`) — Returns `error.message` and `error.stack` to the client in 500 responses. Attackers can use stack traces to map your server-side code. **Priority: High | Effort: Low | Impact: Medium**

- [x] **Push notification endpoint takes `user_id` from request body** (`send-push-notification/index.ts:37`) — An authenticated user could send push notifications to any other user by providing their ID. The `user_id` should come from the authenticated session, not the request. **Priority: High | Effort: Low | Impact: High**

- [ ] **School users only need 6-character passwords** (`schools-auth/index.ts:77`) — Industry standard is 12+. These accounts access children's data. **Priority: High | Effort: Low | Impact: Medium**

### Medium

- [ ] No Content-Security-Policy, X-Frame-Options, or X-Content-Type-Options headers on any HTML page
- [ ] No CSRF tokens on forms (mitigated somewhat by Supabase auth)
- [ ] No rate limiting on signup, checkout, or delete-account endpoints
- [ ] Console.log in edge functions exposes customer IDs, subscription IDs, and child names in Supabase logs
- [ ] `child_modules` INSERT RLS policy uses `WITH CHECK (true)` — any authenticated user can insert records for any child
- [ ] Stripe webhook has no idempotency checking — retries could grant duplicate credits
- [ ] Account deletion doesn't invalidate active JWT sessions

---

## 3. UI DESIGN

### What Looks Amateur

- [ ] **Three competing CSS variable systems** — `dashboard.css` uses `--fm-*`, `signup.css` uses `--dd-*`, `parent-insights.css` uses bare `--primary`. Same color `#405878` is defined three different ways. This creates visual inconsistency when pages share components. **Fix: Unify to one variable system. Priority: Medium | Effort: Medium | Impact: Medium**

- [ ] **137 `!important` declarations across CSS** — 123 of them in `dashboard.css` alone. This is a sign of specificity wars and makes the CSS nearly impossible to override predictably. **Fix: Refactor specificity instead of using !important. Priority: Medium | Effort: High | Impact: Medium**

- [ ] **9 different responsive breakpoints** — 480, 600, 640, 768, 880, 900, 1024, 1200px used inconsistently across files. No mobile-first approach. Some pages break at tablet sizes because breakpoints don't match. **Fix: Standardize to 4-5 breakpoints and use mobile-first. Priority: Medium | Effort: Medium | Impact: Medium**

- [ ] **6 different font families across pages** — Fredoka, League Spartan, Nunito, Fredoka One, DM Sans, JetBrains Mono. Only 2 should be needed (one display, one body). Each additional font adds ~100KB and hurts load time. **Fix: Consolidate to Fredoka + one sans-serif. Priority: Medium | Effort: Low | Impact: Medium**

- [ ] **No unified button component** — `dashboard.css` uses gradient buttons, `landing.css` has `.btn-signup/.btn-login/.btn-trial`, `signup.css` has `.btn-next/.btn-back`, `parent-insights.css` has `.btn-header`. Every page feels slightly different. **Fix: Create one button system with variants. Priority: Medium | Effort: Medium | Impact: High**

### What Works Well
- The landing page (index.html) with animated clouds and character bob is charming and on-brand
- Loading screens with motivational quotes and character images are a nice touch
- Form validation with inline error messages follows accessibility patterns
- All critical images have alt text

---

## 4. UX AND USER JOURNEY

### Confusing Flows

- [ ] **Landing page (index.html) has no product explanation** — It's a beautiful sky-and-dog animation with two buttons: "Start Your Journey" and "Log In." A parent arriving for the first time has no idea what Daniel's Diaries actually does. No features, no benefits, no screenshots, no testimonials. They're being asked to sign up for something they don't understand. **Fix: Add a scrollable landing page with value proposition, features, and social proof before the CTA. Priority: Critical | Effort: High | Impact: Critical**

- [ ] **`user-scalable=no` on the landing page (index.html:5)** — Prevents zooming, which is an accessibility violation (WCAG 2.1). Users with visual impairments cannot enlarge text. **Fix: Remove `user-scalable=no`. Priority: High | Effort: Low | Impact: Medium**

- [ ] **No onboarding after signup** — The `onboardingWalkthrough.js` exists (610 lines) but it's unclear when it triggers. A new parent who signs up, adds a child, and lands on the dashboard needs guided orientation to understand modules, the adventure map, mood check-ins, and the weekly rhythm. **Fix: Ensure onboarding runs on first login with clear step-by-step. Priority: High | Effort: Medium | Impact: High**

- [ ] **Dashboard is information-dense without hierarchy** — The dashboard has an adventure map, mood check-in, module cards, rewards, focus plan, and stats all competing for attention. A parent opening this for the first time doesn't know where to start. **Fix: Progressive disclosure — show one clear action first ("Start your first module"), reveal complexity as they progress. Priority: High | Effort: High | Impact: High**

- [ ] **Practitioner Hub has no explanation of what data means** — Raw numbers like "26 modules completed" and "Avg Level 4" are shown without context. A practitioner needs to know: Is 26 good for this age? What does Level 4 mean clinically? **Fix: Add benchmarks, norms, or contextual labels. Priority: Medium | Effort: Medium | Impact: Medium**

### Missing UX Elements
- [ ] No toast/snackbar notification system — some actions use `alert()`, some use modals, some are silent
- [ ] No confirmation feedback after saving goals, notes, or behaviours in the practitioner hub
- [ ] No undo functionality for destructive actions (removing a client, deleting a goal)
- [ ] Empty states in the practitioner dashboard say "No clients linked yet" but don't explain the value of linking clients

---

## 5. PRODUCT VALUE AND SELLING POINTS

### Core Value Proposition (Currently Unclear)

The app tries to be three things at once: (1) a children's emotional intelligence workbook, (2) a parent engagement tracker, and (3) a practitioner clinical tool. The landing page communicates none of these clearly.

**What it should say**: "Daniel's Diaries helps children aged 5-13 build emotional intelligence through interactive story-based modules — while giving parents and practitioners real-time insight into their progress."

### Weak Points
- [ ] **No demo or preview** — Parents can't see what a module looks like before paying
- [ ] **No free tier mentioned on landing** — If there's a trial, it's buried in the signup flow
- [ ] **No social proof** — No testimonials, no user count, no practitioner endorsements
- [ ] **No outcome data** — "Helps build emotional intelligence" is vague. What specific outcomes?
- [ ] **The Schools Program exists but isn't marketed** — Schools are high-value B2B customers. There's no dedicated landing page explaining the schools offering

### Strong Differentiators (Not Marketed)
- AI-generated personalised modules with narration — this is genuinely unique
- Practitioner data sharing — bridges the gap between home practice and clinical sessions
- Adventure map gamification — makes emotional learning feel like a game
- Weekly check-in system — creates a structured rhythm that clinicians would love

---

## 6. CONVERSION AND RETENTION

### Drop-off Risks

- [ ] **Signup to First Module is too many steps** — Parent signs up, creates child profile, lands on dashboard, has to find and start a module. Each step loses users. **Fix: Auto-start the first module after child setup. Priority: High | Effort: Medium | Impact: High**

- [ ] **No re-engagement mechanism** — Push notifications are being built (Capacitor integration in progress) but there's currently no email reminders, no "your child hasn't practiced this week" nudges, no streak-break alerts. **Fix: Implement email-based weekly summary and re-engagement. Priority: High | Effort: Medium | Impact: High**

- [ ] **No visible progress toward a goal** — The adventure map shows progress but it's abstract. Parents need concrete milestones: "3 of 10 Emotional Regulation modules complete." **Fix: Add explicit progress bars per skill area. Priority: Medium | Effort: Low | Impact: Medium**

- [ ] **Weekly check-ins don't feed back into the experience** — Parents fill out weekly check-ins but don't see how the data influences their child's module recommendations. The loop feels broken. **Fix: Show "Based on your check-in, we recommend..." after each submission. Priority: Medium | Effort: Medium | Impact: High**

---

## 7. TRUST, CREDIBILITY, AND PROFESSIONALISM

### Red Flags for Parents/Schools/Practitioners

- [ ] **No privacy policy link on the landing page** — `privacy-policy.html` exists but isn't linked from the main entry point. Parents entrusting their children's emotional data need to see this upfront
- [ ] **No data security statement** — "Where is my child's data stored? Who can see it? Is it encrypted?" These questions are unanswered
- [ ] **The practitioner guardrail banner ("Educational, not clinical") is dismissable** — Once closed, there's no reminder. This is a liability risk if a practitioner over-relies on the tool
- [ ] **No terms of service link on signup** — `terms-of-service.html` exists but isn't referenced in the signup flow
- [ ] **"Practitioner Hub" has no credential verification** — Any user with `is_practitioner: true` gets access. There's no verification that they're actually a qualified practitioner
- [ ] **Module content is AI-generated** — This should be disclosed somewhere, especially for a children's mental health tool. Parents and practitioners need to know

---

## 8. FEATURE GAPS AND OPPORTUNITIES

### Must-Have (Missing)

| Feature | Why It Matters |
|---------|---------------|
| **Proper marketing landing page** | Currently zero product explanation before signup |
| **Email notifications** | No re-engagement = users forget the app exists |
| **Progress dashboard for parents** | Parents need to see concrete skill development over time |
| **Practitioner credential verification** | Liability risk without it |
| **Data export for parents** | GDPR requirement, trust builder |
| **Offline module access** | Children often use tablets without wifi |

### Nice-to-Have

| Feature | Why It Matters |
|---------|---------------|
| Multi-language support | i18n infrastructure exists in minigames but isn't used app-wide |
| Parent-practitioner messaging | Currently no communication channel within the app |
| Comparative benchmarks | "Your child is progressing faster than 70% of peers in their age group" |
| PDF report generation for practitioners | Currently auto-generated in-app but not downloadable as formatted PDF |
| Dark mode | Standard modern app expectation |

---

## 9. COMPETITIVE STANDARD

Compared to competitors like **Moshi Kids**, **Calm Kids**, **Headspace for Kids**, and **SuperBetter**:

| Area | Daniel's Diaries | Industry Standard | Gap |
|------|-----------------|-------------------|-----|
| Landing page | Animated splash, no info | Feature-rich, testimonials, video | Large |
| Onboarding | Exists but unclear trigger | Guided 3-step tour | Medium |
| Content library | AI-generated, personalised | Curated, branded | Different (potential advantage) |
| Gamification | Adventure map, stars, streaks | Badges, streaks, leaderboards | On par |
| Parent dashboard | Basic stats | Progress reports, recommendations | Medium gap |
| Practitioner tools | Exists (unique!) | Most competitors don't have this | Advantage |
| Mobile app | In progress (Capacitor) | Native iOS/Android | Medium gap |
| Pricing page | None visible | Transparent tier comparison | Large gap |
| Social proof | None | Testimonials, press, user count | Large gap |

---

## 10. CODEBASE, ARCHITECTURE, AND MAINTAINABILITY

### Critical

- [x] **`dashboardPage.js` is 6,425 lines** — Split into 6 feature modules: dashboardCelebrations.js, dashboardCheckin.js, dashboardCheckinInterception.js, dashboardMoodCheckin.js, dashboardProfileHub.js, dashboardRewards.js. Main file reduced from 6,433 to 3,568 lines. **Fix: Split into 5-8 feature modules (map, rewards, modules, mood, focus plan, navigation). Priority: Critical | Effort: High | Impact: Critical**

- [ ] **`dashboard-enhanced.js` is 3,629 lines of unclear status** — It appears to be an alternative/abandoned dashboard implementation. If it's dead code, delete it. If it's active, it duplicates massive amounts of logic. **Fix: Clarify status, delete if unused. Priority: High | Effort: Low | Impact: Medium**

- [ ] **0.6% test coverage** — 250 lines of tests for 42,000 lines of source code. Critical paths like authentication, module completion, credit granting, and subscription management have zero tests. **Fix: Add integration tests for the 10 most critical user flows. Priority: High | Effort: High | Impact: High**

### High

- [ ] **Three state management patterns coexist** — `dashboardState.js` (centralized reactive), `window.*` globals (scattered throughout), and `eventBus.js` (pub/sub). No clear single source of truth. **Fix: Pick one pattern and migrate. Priority: High | Effort: High | Impact: Medium**

- [ ] **7 wrapper re-export files add confusion** — `database.js`, `dashboard.js`, `loading-screen.js`, `focus-plan.js`, `dashboard-rewards.js`, `module-builder-integration.js`, `module-content-creator.js` are all 1-line files that re-export from `features/`. This creates two valid import paths for every module. **Fix: Delete wrappers, update all imports to use direct paths. Priority: Medium | Effort: Low | Impact: Medium**

- [ ] **No TypeScript, no JSDoc types** — 95 JS files with no type safety. The `databaseService.js` exports 40+ functions whose parameter shapes are completely undocumented. A new developer must read the Supabase schema and reverse-engineer every function signature. **Fix: At minimum, add JSDoc annotations to all exported functions. Priority: Medium | Effort: Medium | Impact: High**

- [ ] **Environment variables accessed directly in 4+ files** instead of using the centralized `env.js` factory. **Fix: Route all env access through `getAppEnv()`. Priority: Low | Effort: Low | Impact: Low**

### Medium

- [ ] `databaseService.js` (2,236 lines) exports 40+ functions — should be split by domain (children, modules, subscriptions, admin)
- [ ] `adminModuleBuilder.js` (2,044 lines) mixes TTS generation, module creation, and overlay UI
- [ ] `profile.js` (1,635 lines) handles profile display, child management, password reset, and avatar selection all in one file
- [ ] No CI/CD pipeline — lint and test scripts exist but aren't enforced on commit or PR
- [ ] Error handling is inconsistent: some functions use `alert()`, some use modals, some log silently
- [ ] `ExampleModule.html` and `practitioner-dashboard-example.html` are leftover templates cluttering the root

---

## 11. FINAL PRIORITISED ACTION PLAN

### Immediate Fixes (This Week)

| # | Issue | Fix | Priority | Effort | Impact | Status |
|---|-------|-----|----------|--------|--------|--------|
| 1 | XSS via innerHTML (30+ files) | Add DOMPurify + sanitize all innerHTML assignments | Critical | Medium | Critical | [x] |
| 2 | Client-side admin auth bypass | Add server-side is_admin checks to all RPCs/edge functions | Critical | Medium | Critical | [x] |
| 3 | Push notification user_id from request body | Use authenticated session user_id instead | High | Low | High | [x] |
| 4 | Stripe webhook exposes stack traces | Return generic error message, log details server-side only | High | Low | Medium | [x] |
| 5 | CORS wildcard on all edge functions | Restrict to actual domain(s) | High | Low | High | [x] |

### High-Impact Improvements (Next 2-4 Weeks)

| # | Issue | Fix | Priority | Effort | Impact | Status |
|---|-------|-----|----------|--------|--------|--------|
| 6 | No product landing page | Build a marketing page with value prop, features, testimonials | Critical | High | Critical | [x] |
| 7 | Split dashboardPage.js (6,425 lines) | Decompose into 5-8 feature modules | Critical | High | Critical | [x] |
| 8 | Unoptimized images (7.3 MB total) | Delete PNGs, compress logo, lazy load map | High | Low | High | [x] |
| 9 | Add privacy/ToS links to signup & landing | Link existing pages in signup flow and landing footer | High | Low | High | [x] |
| 10 | Signup to First Module flow too many steps | Auto-start first module after child setup | High | Medium | High | [x] |
| 11 | School password policy (6 chars) | Increase to 12 characters minimum | High | Low | Medium | [ ] |
| 12 | Delete dead code & wrapper files | Remove 12 identified files | Medium | Low | Medium | [x] |

### Polish Improvements (Month 1-2)

| # | Issue | Fix | Priority | Effort | Impact | Status |
|---|-------|-----|----------|--------|--------|--------|
| 13 | Unify CSS variable systems (3 competing) | Migrate all to `--fm-*` prefix | Medium | Medium | Medium | [ ] |
| 14 | Standardize breakpoints (9 different) | Pick 4-5 breakpoints, migrate all CSS | Medium | Medium | Medium | [ ] |
| 15 | Consolidate fonts (6 families) | Reduce to 2 families (Fredoka + 1 sans-serif) | Medium | Low | Medium | [x] |
| 16 | Add JSDoc types to exported functions | Annotate databaseService.js and dashboardPage.js first | Medium | Medium | High | [ ] |
| 17 | Consistent error/notification system | Build one toast/notification component used everywhere | Medium | Medium | Medium | [x] |
| 18 | Add security headers (CSP, X-Frame-Options) | Add headers via Vite HTML plugin or meta tags | Medium | Low | Medium | [x] |
| 19 | Reduce !important usage (137 instances) | Refactor specificity in dashboard.css | Medium | High | Medium | [ ] |
| 20 | Split dashboard.css (7,160 lines) | Break into per-feature CSS modules | Medium | Medium | Medium | [ ] |

### Future Opportunities (Quarter 2+)

| # | Issue | Fix | Priority | Effort | Impact | Status |
|---|-------|-----|----------|--------|--------|--------|
| 21 | Email re-engagement system | Weekly parent summary emails with child progress | High | High | High | [ ] |
| 22 | Migrate to TypeScript | Incremental migration starting with services layer | Medium | High | High | [ ] |
| 23 | Add integration tests (currently 0.6% coverage) | Write tests for top 10 user flows | High | High | High | [ ] |
| 24 | Offline module support | Service worker + IndexedDB for cached modules | Medium | High | Medium | [ ] |
| 25 | Dedicated schools landing page | Build landing page with school-specific value prop | Medium | Medium | High | [ ] |
| 26 | Practitioner credential verification | Verification flow or manual admin approval | Medium | Medium | Medium | [ ] |
| 27 | CI/CD pipeline with lint + test gates | GitHub Actions with pre-merge checks | Medium | Medium | Medium | [ ] |
| 28 | Parent-facing progress reports | Structured report with benchmarks per skill area | Medium | High | High | [ ] |

---

### Bottom Line

Daniel's Diaries has a genuinely unique product in the children's wellbeing space — AI-personalised content, practitioner integration, and gamified emotional learning is a strong combination that competitors don't offer. The core product mechanics work.

But right now it's being held back by three things: (1) **security gaps** that would fail any enterprise/school procurement review, (2) **no marketing surface** that explains the product's value, and (3) **a codebase that's becoming unmaintainable** as it scales. Fix the innerHTML XSS and admin auth bypass this week. Build a proper landing page next. Then systematically decompose the monolithic files so you can ship features faster without breaking things.
