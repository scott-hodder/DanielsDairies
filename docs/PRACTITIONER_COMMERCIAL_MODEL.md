# Practitioner Hub — Commercial Model & Goal Tracking

_Last updated: 5 July 2026_

## Pricing model (decision)

**Per-practitioner subscription, tiered by active-client caseload.** Client families keep their
own Daniel's Diaries family subscription (Bronze/Silver/Gold); the practitioner plan pays for the
professional toolset, not child app access.

| Plan | Price (AUD/mo) | Active clients | Practitioner logins |
|---|---|---|---|
| Solo | $79 | 15 | 1 |
| Practice | $179 | 40 | 3 |
| Clinic | $349 | 100 | 10 |

Every practitioner gets a **30-day free trial** with Solo limits, provisioned automatically the
first time they open the hub (or add a client). When the trial lapses the caseload stays visible
(read access is never cut off — that would be unsafe for children mid-support), but adding
clients is blocked until a plan is activated.

Why this model and not per-client or sponsored seats:

- **Caseload size is the honest value metric.** A practitioner supporting 30 children gets far
  more value than one supporting 4; per-practitioner-flat underprices clinics and per-client
  metering feels like a taxi meter to clinicians.
- **Families keeping their own subscription avoids two hard problems**: the family loses app
  access when the practitioner relationship ends (bad for the child), and the credit-refill
  machinery is Stripe-invoice-driven per family — sponsoring it from a practitioner plan would
  need a parallel entitlement path. "Practitioner-funded client seats" is a good phase-2
  upsell once demand is proven (see gaps).
- **Tier jumps replace per-seat add-ons.** Simpler to explain, and the jump points (15/40/100)
  are generous enough that overage is rare.

Data model: `practitioner_plans` (seeded above), `practitioner_subscriptions` (one row per
practitioner, auto-trial), enforced by a DB trigger on `practitioner_clients` so limits hold no
matter which client path is used. Plan usage surfaces in the hub's **Plan & Billing** view.

## Client access flow

Two paths from the **+ Add Client** modal:

1. **Invite a family** (default): generates a private 10-character code + link
   (`/signup.html?invite=CODE`, 30-day expiry, revocable). New families sign up and pick their
   own plan; existing families just sign in. On the next dashboard load the code is redeemed
   (`redeem_practitioner_invite`) and every child on the parent account is linked to the
   practitioner. The parent sees a toast confirming who they're now connected with.
2. **Find existing family**: the original email search + link flow (now an upsert so re-adding a
   previously archived client reactivates the link instead of erroring).

Practitioners only ever see children linked to them via `practitioner_clients` RLS. Removing a
client deactivates the link (goals/notes retained).

## Super Skill tags and goals

- `super_skill_tags` — practitioner-facing developmental areas (Emotional Regulation,
  Anxiety & Worry, Helpful Thinking, Self-Awareness & Learning, Positive Behaviour & Habits,
  Resilience & Coping, Social Skills & Friendships, Confidence & Future Planning).
- `super_skill_tag_map` — which Super Skills teach toward each area (mapped by each skill's
  theory base, e.g. Emotional Regulation → Emotion Navigator; Anxiety & Worry → Thought Driver +
  Emotion Navigator + Resilience Architect). Seeded by slug so it applies cleanly to dev and prod.
- `practitioner_goal_tags` — the areas each goal targets. Goals also gained `target_modules`
  (optional module target) and `completed_at`.
- Old goal categories were migrated onto tags (`anxiety` → Anxiety & Worry, `behaviour` →
  Positive Behaviour & Habits, etc.; `other` gets no tag). The `category` column is retained as
  history but nothing reads or writes it anymore.

**Progress rule** (in `get_practitioner_goal_progress`): a completed module counts toward a goal
when its Super Skill is linked to one of the goal's tags **and** it was completed on/after the
goal was created. Each module counts once per goal (DISTINCT), so overlapping tags never
double-count, and pre-existing history never inflates progress. Goals are never auto-completed —
"Target reached" prompts the practitioner to review and mark complete.

## NDIS support (Australia)

The family-pays model is deliberately NDIS-friendly: the practitioner recommends the program,
and self/plan-managed participants commonly claim low-cost supports of this kind from their plan.
Built to support that flow:

- **Recommendation letter generator** — client workspace → Support Plan tab → "NDIS
  recommendation letter". Pre-fills the child's active goals, focus areas, linked Super Skills,
  live family pricing from `subscription_tiers`, and the practitioner's letterhead details
  (role/credentials, business, ABN, contact — saved per device in localStorage). Print/PDF via
  the existing print flow. Wording is deliberately conservative: recommends the program, states
  the practitioner's professional opinion, and defers claimability to the plan manager.
- **`ndis-funding.html`** — public info page for families, practitioners and plan managers.
  Linked from the hub's Resources view. Never claims "NDIS approved".
- **Plan statement for families** — profile page → plan section → "Print plan statement (for
  NDIS claims)": printable statement with business identity, service description, plan, price
  and billing period. **The ABN is blank in `STATEMENT_BUSINESS` (src/profile.js) and the ABN
  row is hidden until it's set — add the real ABN before release.** Per-charge receipts remain
  Stripe's job (consider adding the ABN to Stripe receipt settings too).

## What still needs deciding before public release

1. ~~**Stripe wiring for practitioner plans.**~~ **Done (6 July 2026).** The
   `practitioner-checkout` edge function creates subscription-mode Checkout sessions priced
   live from `practitioner_plans` (plus a Billing Portal session for card/cancel management),
   and `stripe-webhook` activates/syncs `practitioner_subscriptions`
   (`payment_type: practitioner_plan`). The Plan & Billing view now has Choose/Upgrade buttons
   and a Manage billing button. Requires the Stripe **Billing Portal** to be enabled in the
   Stripe dashboard (Settings → Billing → Customer portal).
2. **Multi-practitioner organisations.** Plans carry `practitioner_seats` and pricing assumes
   them, but there is no org/team table yet — each practitioner account is independent. Needed
   before selling Practice/Clinic tiers as true team accounts.
3. **Practitioner-funded client access (phase 2).** If practitioners ask to cover families' app
   costs, add a sponsored entitlement path (monthly credit grants for linked families + a
   `sponsored` marker on `parent_subscriptions`).
4. **Trial length / price points** are launch assumptions ($79/$179/$349 AUD, 30 days) — held in
   `practitioner_plans`, changeable by DB update without code changes.

## Deployment notes

- Migrations: `20260705000000_super_skill_tags_goal_progress.sql`,
  `20260705001000_practitioner_plans_invites.sql`. Apply to dev and prod with the usual
  `supabase db push` flow. No edge function changes.
- The hub degrades gracefully if migrations aren't applied yet (plan/tag panels show
  "unavailable"), but goal creation requires the tag tables.
