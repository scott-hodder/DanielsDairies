# AI Prompt Audit (Admin "Generate Module" flow)

This document describes the **likely initial prompt context** sent to the AI when an admin generates a module from the Add New Module modal.

It is based on:
- Client request construction in `src/features/admin/adminPage.js`
- Server-side enrichment and prompt assembly in `supabase/functions/generate-module/index.ts` and `supabase/functions/generate-module/generators-core.ts`

---

## 1) Request payload shape sent from Admin UI

When **Generate Module with AI** is clicked, the browser sends a JSON payload to:
- `POST /functions/v1/generate-module`

Payload now includes:

```json
{
  "title": "Test",
  "superSkillId": "<uuid>",
  "subSkillId": "<uuid>",
  "cycleId": "<uuid>",
  "ageRangeId": "<uuid>",
  "coreTheoryId": "<uuid>",
  "brainTownAnalogy": "Your brain is a town with roads...",
  "additionalContext": "...",
  "weekNumber": 1,
  "xpReward": 100,
  "starsReward": 10,

  "neuroscienceConcept": "Dopamine",
  "secondaryTheoryIds": ["<uuid>", "<uuid>", "<uuid>"],
  "diagnosisPathways": ["adhd"],
  "fasdStrategies": "...optional...",
  "ndisDomainId": "<uuid>",
  "dssSediId": "<uuid>",

  "lookupContext": {
    "superSkill": {
      "name": "Brain Builder",
      "domain": "Neuroscience and Brain Development",
      "personality": "energetic, zoomy...",
      "ndAffirmation": "...",
      "relevantTheories": "..."
    },
    "subSkill": { "name": "Neuroplasticity Awareness", "description": "..." },
    "cycle": { "cycleNumber": 1, "name": "Awareness", "focus": "..." },
    "ageBand": {
      "ageRange": "12-14",
      "displayName": "Early Adolescence",
      "languageGuidelines": "...",
      "developmentalStage": "..."
    },
    "coreTheory": {
      "name": "Neuroplasticity",
      "description": "The brain can change...",
      "primaryResearchers": "..."
    },
    "secondaryTheories": [
      { "name": "Cognitive Control", "description": "..." }
    ],
    "theoryConnection": {
      "citation": "Merzenich, 1998",
      "brainTownApplication": "Your brain is a town with roads..."
    },
    "neuroscienceConcept": "Dopamine",
    "diagnosisPathways": ["adhd"],
    "ndisDomain": { "name": "Learning" },
    "dssSediCategory": { "code": "SEDI_4", "name": "Health & Disability" }
  },

  "seriesId": "...",
  "category": "...",
  "async": true
}
```

---

## 2) Server-side enrichment before prompt creation

The function also performs DB lookups (authoritative server-side):
- `super_skills`: name, description, **domain, personality, nd_affirmation, relevant_theories**
- `age_ranges`: age_range, display_name, **language_guidelines, developmental_stage**
- `core_theories`: theory_name, **description, primary_researchers**
- `sub_skills`: name, description
- `core_theories` (secondary theory names)
- `ndis_domains` (domain_name)
- `dss_sedi_categories` (sedi_code, sedi_name)

Then it composes a **Selected Reference Data (Authoritative Context)** block and injects it into high-priority creator instructions.

---

## 3) Likely prompt skeleton sent to LLM

The generated prompt is assembled by `buildEnhancedContentBrief(...)` and includes sections like:

1. `=== MODULE BRIEF ===`
   - Title, target age, super skill, sub-skill, objective
2. `CRITICAL — NON-NEGOTIABLE REQUIREMENTS`
   - Must keep title/age/theory/brain-town constraints
3. `=== HIGH-PRIORITY CREATOR INSTRUCTIONS (MUST FOLLOW) ===`
   - Includes freeform admin context
   - Includes **Selected Reference Data (Authoritative Context)** with:
     - Super Skill domain/personality/ND affirmation/relevant theories
     - Sub-skill description
     - Cycle context/focus
     - Core theory description + researchers/citation
     - Age language guidelines + developmental stage
     - Theory connection application text
     - Secondary theory descriptions
     - Diagnosis, neuroscience, NDIS, SEDI context
4. `=== PSYCHOLOGICAL FOUNDATION ===`
   - Primary theory name + description
5. `=== LANGUAGE GUIDELINES ===`
   - Age-band language/development instructions
6. `=== BRAIN TOWN ANALOGY (MUST BE USED THROUGHOUT) ===`
7. Optional sections:
   - Neuroscience tie-in
   - Diagnosis adaptations
   - Outcome frameworks (NDIS/DSS SEDI)
8. `=== GENERATION RULES ===`
   - Structural and quality constraints

---

## 4) Audit conclusion

With current wiring, the AI receives both:
- **IDs and explicit lookup context from the admin client**, and
- **server-validated DB lookups** used in prompt composition.

This provides materially stronger grounding for theory fidelity, developmental appropriateness, and evidence alignment.
