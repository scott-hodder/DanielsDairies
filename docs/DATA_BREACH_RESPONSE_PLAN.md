# Data Breach Response Plan

**Organisation:** Foundational Minds (Daniel's Diaries)
**Version:** 1.0
**Effective date:** 26 April 2026
**Review schedule:** Annually, or after any breach event

---

## 1. Purpose

This plan outlines how Foundational Minds will respond to a data breach in accordance with the **Notifiable Data Breaches (NDB) scheme** under Part IIIC of the **Privacy Act 1988 (Cth)**.

---

## 2. Definitions

**Personal information breach:** Unauthorised access to, disclosure of, or loss of personal information held by the organisation.

**Eligible data breach:** A breach where:
- There is unauthorised access, disclosure, or loss of personal information
- A reasonable person would conclude it is likely to result in **serious harm** to affected individuals
- The organisation has not been able to prevent the likely risk of serious harm through remedial action

**Serious harm** includes: identity theft, financial loss, damage to reputation, emotional distress (particularly relevant for children's psychological data).

---

## 3. Breach Response Team

| Role | Responsibility |
|---|---|
| **Privacy Officer** (Scott) | Leads the response, makes OAIC notification decisions |
| **Technical Lead** | Investigates the breach, implements containment |
| **Communications Lead** | Notifies affected individuals |

---

## 4. Response Steps

### Step 1: Contain (Immediate — within hours)

- [ ] Identify the source and scope of the breach
- [ ] Take immediate steps to limit the breach (e.g., revoke compromised credentials, disable affected accounts, patch vulnerability)
- [ ] Preserve evidence (logs, screenshots, database snapshots)
- [ ] Do NOT delete evidence

### Step 2: Assess (Within 48 hours)

- [ ] Determine what data was accessed/disclosed/lost
- [ ] Identify affected individuals
- [ ] Assess the likelihood of serious harm considering:
  - Type of data (children's psychological data is high sensitivity)
  - Whether data is encrypted or protected
  - Who gained access (malicious actor vs accidental disclosure)
  - Whether remedial action has reduced the risk
- [ ] Document your assessment with reasoning

### Step 3: Notify (Within 30 days of becoming aware — sooner if possible)

**If the breach is an eligible data breach:**

#### Notify the OAIC
- Submit a statement via the [OAIC Notifiable Data Breach form](https://www.oaic.gov.au/privacy/notifiable-data-breaches/report-a-data-breach)
- Include:
  - Organisation name and contact details
  - Description of the breach
  - Types of information involved
  - Recommended steps for affected individuals

#### Notify affected individuals
- Contact affected individuals directly (email) as soon as practicable
- Include:
  - What happened
  - What data was involved
  - What we are doing about it
  - What they should do (e.g., change passwords, monitor accounts)
  - How to contact us for more information
  - Their right to complain to the OAIC

### Step 4: Remediate

- [ ] Fix the root cause of the breach
- [ ] Review and update security measures
- [ ] Consider whether additional monitoring is needed
- [ ] Update this response plan if gaps were identified

### Step 5: Post-Incident Review (Within 2 weeks of resolution)

- [ ] Document a full timeline of events
- [ ] Identify what worked and what didn't in the response
- [ ] Implement improvements to prevent recurrence
- [ ] Update security policies and procedures
- [ ] Brief the team on lessons learned

---

## 5. Key Contacts

| Contact | Details |
|---|---|
| **Privacy Officer** | privacy@danielsdiaries.com |
| **OAIC** | 1300 363 992 / www.oaic.gov.au |
| **Supabase Support** | support@supabase.io |
| **Stripe Support** | support.stripe.com |

---

## 6. Record Keeping

Maintain a breach register recording:
- Date breach discovered
- Description of breach
- Data types involved
- Number of individuals affected
- Assessment of serious harm likelihood
- Actions taken
- OAIC notification (if applicable)
- Outcome and follow-up actions

---

## 7. Special Considerations for Children's Data

Given that Daniel's Diaries handles children's psychological and emotional data:
- Any breach involving children's mood data, emotional responses, or assessment data should be treated as **high severity by default**
- Parents/guardians must be notified (not the children directly)
- Consider whether the breach may cause distress to families and tailor communications with care
- Seek legal advice if the breach involves a large number of children's records
