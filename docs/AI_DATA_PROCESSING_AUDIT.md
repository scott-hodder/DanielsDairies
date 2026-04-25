# AI Data Processing Audit — Daniel's Diaries

**Date:** 26 April 2026
**Auditor:** Internal review
**Service:** Anthropic Claude API (module content generation)
**Edge function:** `supabase/functions/generate-module/`

---

## Summary

**Finding: No child-identifying data is sent to the Anthropic Claude API.**

The module generation system sends only educational content parameters to generate learning modules. Personal information about children or parents is never included in API requests.

---

## What IS Sent to the API

| Data | Source | Example |
|---|---|---|
| Category name | `module_categories` table | "Emotional Regulation" |
| Super skill name/description | `super_skills` table | "Managing Big Feelings" |
| Age range identifier | `age_ranges` table | "5-7" |
| Core theory name/description | `core_theories` table | "Cognitive Behavioural Therapy" |
| Series information | `module_series` table | Series title, description |
| Brain Town analogies | `brain_town_analogies` table | Character descriptions |
| Additional context | Admin-provided text | Teaching notes |

All of the above is **reference data** — shared across all users and contains no personal information.

---

## What is NOT Sent to the API

| Data | Confirmed Not Sent |
|---|---|
| Child names | Yes — `childDisplayName` is resolved client-side only |
| Child IDs | Yes — not referenced in prompt construction |
| Child dates of birth | Yes |
| Parent names or email | Yes |
| Mood check-in data | Yes |
| Module response data | Yes |
| Assessment results | Yes |
| Any user-generated free text | Yes |

---

## How This Was Verified

1. Reviewed `buildEnhancedContentBrief()` in `generators-core.ts` — constructs prompts from reference data only
2. Reviewed `callClaude()` — sends the constructed brief to Anthropic; no user data injected
3. Reviewed the request body construction in `index.ts` — accepts `seriesId`, `category`, `superSkillId`, `ageRangeId`, `coreTheoryId`, `additionalContext`, `title` — all reference data identifiers
4. Confirmed `childDisplayName` is only used in client-side HTML rendering, never transmitted to the API

---

## Anthropic Data Policy

Per Anthropic's usage policy, API inputs and outputs are not used to train models. Data is retained for a limited period for trust and safety purposes.

---

## Ongoing Compliance

- This audit should be repeated when the module generation prompts are significantly changed
- Any future feature that personalises AI prompts with child data must go through a privacy impact assessment before deployment
- A code comment has been added near `callClaude()` to flag this requirement for future developers
