# Daniel's Diaries — Compliance & Risk Overview

**Date:** 26 April 2026
**Scope:** Data storage, Australian privacy law alignment, and actionable risk items

---

## 1. How Is Customer Data Stored? (Customer-Facing Answer)

> **"Your data is stored securely in a hosted PostgreSQL database managed by Supabase, a trusted cloud infrastructure provider. All data is encrypted both in transit (via HTTPS/TLS) and at rest. Passwords are hashed using industry-standard Bcrypt and are never stored in plain text. Access to your data is protected by Row-Level Security, meaning each parent account can only access their own family's information — no other user or staff member can see it unless explicitly authorised. Payment card details are never stored on our servers; all payment processing is handled securely by Stripe, a PCI-DSS compliant payment processor."**

### Technical Detail Behind That Statement

| Layer | How It Works |
|---|---|
| **Database** | Supabase-hosted PostgreSQL 17 with Row-Level Security (RLS) enabled on every table |
| **Authentication** | Supabase Auth — JWT tokens (1-hour expiry), refresh-token rotation |
| **Password storage** | Parent passwords: Supabase Auth (Bcrypt). Child PINs: Bcrypt via `pgcrypto` with `gen_salt('bf')` |
| **In-transit encryption** | All API traffic over HTTPS/TLS |
| **At-rest encryption** | Supabase encrypts data at rest (AES-256 on AWS infrastructure) |
| **Payment data** | Stripe handles all card data; only Stripe customer/subscription IDs are stored locally |
| **Row-Level Security** | Every table enforces ownership checks — parents see only their own children's data |
| **Server-side secrets** | Service role keys, Stripe keys, and API keys are only accessible in Edge Functions, never exposed to the browser |

---

## 2. Australian Privacy Law — What Applies to You

### 2.1 The Privacy Act 1988 (Cth) & Australian Privacy Principles (APPs)

The Privacy Act applies to organisations with annual turnover above $3 million, **but also to organisations that**:
- Provide a **health service** (broadly defined), or
- Handle **health information**

**This is the critical question for Daniel's Diaries.** Child psychology data — mood scores, emotional responses, coping strategies, focus plans, and weekly check-in data (challenges, triggers, goals) — could be classified as **health information** under the Act, even though your Terms of Service disclaim being a medical/mental health service.

> **Risk:** If the OAIC (Office of the Australian Information Commissioner) determines you hold health information, the Privacy Act applies regardless of turnover. **Treat it as applicable.**

### 2.2 The 13 Australian Privacy Principles — Gap Analysis

| APP | Requirement | Your Current Status | Action Needed |
|---|---|---|---|
| **APP 1** — Open & transparent management | Have a clearly expressed privacy policy | Privacy policy exists (March 2026) | Update to reference Australian law specifically (see below) |
| **APP 2** — Anonymity & pseudonymity | Give people the option to interact anonymously where practicable | Children use nicknames/avatars (partial compliance) | Document this as a deliberate design choice |
| **APP 3** — Collection of solicited information | Only collect information reasonably necessary | You collect mood, emotions, triggers, coping data | Audit: can you justify each data field as necessary for the service? |
| **APP 4** — Unsolicited information | Destroy unsolicited info if you wouldn't have been permitted to collect it | Not currently relevant | No action |
| **APP 5** — Notification of collection | Tell people what you collect and why, at or before collection | Privacy policy covers this broadly | Add in-app collection notices (e.g., before mood check-in, before assessment) |
| **APP 6** — Use or disclosure | Only use data for the purpose it was collected | You use data for service delivery, payment, email marketing (Mailchimp) | **Mailchimp integration needs explicit opt-in consent, not auto-subscribe on signup** |
| **APP 7** — Direct marketing | Only direct-market with consent; provide opt-out | Users auto-added to Mailchimp on signup | **Must change to opt-in. Provide one-click unsubscribe.** |
| **APP 8** — Cross-border disclosure | If data goes overseas, ensure equivalent protection | Supabase (AWS), Stripe (US), Mailchimp (US), OpenAI (US) | **Disclose all overseas recipients in your privacy policy. Confirm Supabase region.** |
| **APP 9** — Government identifiers | Don't adopt government identifiers | Not applicable | No action |
| **APP 10** — Quality of information | Take reasonable steps to ensure data is accurate, complete, up-to-date | Parents manage child profiles | Add ability for parents to edit/correct all child data |
| **APP 11** — Security of information | Protect personal information from misuse, loss, unauthorised access | RLS, Bcrypt, HTTPS, server-side keys | **See Section 3 — several gaps to close** |
| **APP 12** — Access to information | Give individuals access to their data on request | No data export feature | **Build a data export/download feature** |
| **APP 13** — Correction of information | Correct data on request | Parents can edit profiles | Ensure all data types (responses, mood logs) can be corrected or annotated |

### 2.3 Notifiable Data Breaches (NDB) Scheme

Under the NDB scheme, if you experience a data breach likely to result in serious harm, **you must notify the OAIC and affected individuals within 30 days**.

**You need:**
- A documented **Data Breach Response Plan**
- A way to identify and assess breaches quickly
- Contact details for the OAIC in your incident plan
- Audit logging sufficient to determine what was accessed (currently limited — see Section 3)

### 2.4 Children's Privacy

Australia doesn't have a direct equivalent of the US COPPA, but:
- The **Online Privacy Code** (registered under the Privacy Act) requires additional protections for children under 18
- The **Online Safety Act 2021** imposes obligations around child safety online
- The OAIC guidance states that children under ~15 generally lack capacity to consent — **parental consent is required**

**Your current model (parent-managed accounts, children have no auth accounts) is a strong foundation.** But you should:
- Explicitly document that parental consent is obtained at signup
- Consider a minimum age notice
- Ensure children cannot independently share data outside the app

### 2.5 Privacy Act Reform (2024–2026)

The Australian Government has been progressing significant reforms to the Privacy Act. Key changes that may affect you:
- **A statutory tort for serious invasion of privacy** — gives individuals a right to sue
- **A Children's Online Privacy Code** — will impose additional requirements for services used by children
- **Strengthened enforcement powers** for the OAIC
- **Mandatory privacy impact assessments** for high-risk processing

> **Action:** Monitor the OAIC website and Attorney-General's Department for updates. Budget for a professional privacy review once the reforms are enacted.

---

## 3. Security & Risk Items — Prioritised Action List

### P0 — Must Fix (Legal/Compliance Risk)

| # | Issue | Detail | Action |
|---|---|---|---|
| 1 | **Mailchimp auto-subscribe** | Users are added to Mailchimp on signup without explicit opt-in consent. Violates APP 7 (direct marketing). | Add a checkbox at signup: "I'd like to receive updates and tips by email." Only subscribe if checked. |
| 2 | **No data export feature** | APP 12 requires you to provide individuals access to their data. You have no way to do this. | Build a "Download My Data" feature or document a manual process with a response SLA. |
| 3 | **No Data Breach Response Plan** | NDB scheme requires you to assess and report breaches within 30 days. | Write and test a breach response plan. Include: detection, assessment, containment, notification steps, OAIC contact. |
| 4 | **No data deletion procedure** | Privacy policy says users can request deletion, but no mechanism exists. | Build account deletion flow that cascades to all child data, responses, mood logs, etc. |
| 5 | **Cross-border disclosure not specific enough** | Privacy policy has generic international transfer language but doesn't name countries or providers. | List: Supabase/AWS (region), Stripe (US), Mailchimp/Intuit (US), OpenAI (US). State what protections each provides. |
| 6 | **Privacy policy doesn't reference Australian law** | Policy is generic — no mention of the Privacy Act, APPs, or OAIC. | Add a section: "For Australian Users" referencing the Privacy Act 1988, your APP compliance, and OAIC complaint rights. |

### P1 — Should Fix (Security Hardening)

| # | Issue | Detail | Action |
|---|---|---|---|
| 7 | **Weak minimum password length** | Both parent and child passwords allow 6 characters. | Increase parent minimum to 8 characters. Consider 4-digit PIN option for young children as an alternative. |
| 8 | **No audit logging for parent data access** | If a parent disputes what was accessed or changed, you have no record. | Add an audit log table for parent profile changes, data access, and child data modifications. |
| 9 | **No rate limiting on child PIN attempts** | Brute-force risk on the child password verification endpoint. | Add rate limiting (e.g., 5 attempts per minute) on the `verify_child_password_secure()` flow. |
| 10 | **Sensitive fields not encrypted at column level** | Mood scores, emotion data, and free-text notes are stored as plain values in the database. | Consider column-level encryption (pgcrypto `pgp_sym_encrypt`) for mood check-in data and free-text fields. |
| 11 | **OpenAI data processing** | Module generation sends prompts to OpenAI. If prompts contain child-specific data, this is a cross-border disclosure of potentially sensitive info. | Audit what data is sent in prompts. Ensure no child-identifying information is included. Document OpenAI's data processing agreement. |
| 12 | **Confirm Supabase hosting region** | You need to know exactly where data is physically stored for APP 8 compliance. | Check your Supabase project settings for the AWS region. Ideally `ap-southeast-2` (Sydney). If not, document the actual region. |

### P2 — Should Plan (Best Practice)

| # | Issue | Action |
|---|---|---|
| 13 | **Privacy Impact Assessment (PIA)** | Conduct a formal PIA. This will become mandatory under reform. Getting ahead of it is good practice. |
| 14 | **Data retention schedule** | Define how long each data type is kept and when it's purged. Document this in the privacy policy. |
| 15 | **In-app consent notices** | Before collecting mood/emotional data, show a brief notice explaining what's collected and why. |
| 16 | **Professional legal review** | Have an Australian privacy lawyer review your privacy policy, terms of service, and data practices. Budget $2,000–$5,000. |
| 17 | **Parental consent record** | Store a timestamped record of parental consent at signup. This is your evidence if ever challenged. |
| 18 | **Annual security review** | Schedule a yearly review of RLS policies, edge function security, and third-party integrations. |

---

## 4. Summary of What You Can Tell Customers

**Short version (for FAQs or in-app):**

> Your family's data is stored in a secure, encrypted database hosted in the cloud. All connections are encrypted, passwords are hashed (never stored in readable form), and each family's data is isolated — only you can access your children's information. We never store your payment card details. We comply with the Australian Privacy Act 1988 and the Australian Privacy Principles.

**If asked "where specifically?":**

> Our database is hosted by Supabase (built on Amazon Web Services). Payments are processed by Stripe. Both providers maintain enterprise-grade security certifications including SOC 2 Type II compliance.

**If asked "can I get my data / delete my account?":**

> Yes. Contact us at privacy@danielsdiaries.com to request a copy of your data or to have your account and all associated data deleted.

*(Note: You need to actually build the mechanism to fulfil these requests — see P0 items above.)*

---

## 5. Recommended Next Steps (In Order)

1. **Fix Mailchimp opt-in** — quick code change, removes immediate legal risk
2. **Update privacy policy** — add Australian law references, specific cross-border disclosures
3. **Write a Data Breach Response Plan** — template available from the OAIC website
4. **Build data export and account deletion** — required for APP 12 compliance
5. **Confirm Supabase region** — one setting to check
6. **Audit OpenAI prompts** — ensure no child-identifying data is sent
7. **Engage a privacy lawyer** — for a formal review before scaling
8. **Implement audit logging** — adds accountability and breach investigation capability
9. **Conduct a Privacy Impact Assessment** — positions you ahead of upcoming reforms
