# AI Prompt Recommendations & Supabase Prompt Governance

## Goals
- Keep generation quality high while reducing prompt bloat and contradictions.
- Make the core AI system prompt centrally editable by admins.
- Ensure consistent behaviour across all Supabase functions that call LLMs.

## Current Issues Observed
1. **Large monolithic system prompt**: policy, style, forbidden terms, and output constraints are all mixed into one long block.
2. **Contradiction risk**: hardcoded prompt text plus dynamic content brief/rules can conflict.
3. **Scattered prompt control**: updates currently require code deploys rather than admin editing.
4. **Limited version governance**: no strong versioning/approval workflow for prompt changes.

## Prompt Design Recommendations

### 1) Split Prompt into Layers
Use a layered model instead of one giant string:

1. **Core immutable safety layer** (code-owned):
   - JSON-only response requirements
   - child safety / trauma-informed constraints
   - strict disallowed content classes
2. **Editable instructional layer** (admin-owned):
   - tone, pedagogical framing, brand wording
   - preferred phrase banks
   - style updates over time
3. **Dynamic module context layer** (request-owned):
   - age range, theory, cycle/week, module-specific constraints
   - selected skills and references

This reduces contradiction because each layer has a clear role.

### 2) Add Prompt Priority Ordering
Document and enforce precedence:
1. Safety/format constraints
2. Runtime structured constraints (age/theory/reference)
3. Admin template text
4. Module-specific free-text hints

### 3) Move Constraint Lists to Structured Data
Where possible, avoid giant inline lists in raw text prompts. Instead:
- keep forbidden terms in tables (already done)
- pass compact structured sections (JSON bullets) to prompt builder
- avoid duplicate rules appearing in multiple places

### 4) Add Prompt Linting Before Save
When admins save prompt templates, run checks:
- max character/token estimate
- forbidden phrase conflicts
- missing required placeholders (if using them)
- duplicate sections or repeated directives

### 5) Introduce Prompt Versioning
Recommended schema additions:
- `prompt_templates` (id, name, body, status, created_by, approved_by)
- `prompt_template_versions` (template_id, version, body, diff_summary)
- `active_prompt_config` (function_name, template_version_id)

This enables rollback and auditability.

## Recommendations for Supabase-wide Customisation

### 1) Central Prompt Builder Utility
Create shared prompt builder helpers under `supabase/functions/_shared/`:
- `getPromptTemplate(functionName)`
- `buildSystemPrompt({ template, safety, context })`
- `validatePromptTemplate(template)`

All AI functions should consume this single pathway.

### 2) Function-specific Overrides
Allow each function to choose:
- base template key
- optional section toggles
- additional context appenders

But still enforce core safety + output format globally.

### 3) Add Telemetry for Prompt Quality
Persist per-generation metrics:
- template version used
- estimated prompt tokens
- validation/audit scores
- retries and failure modes

This makes bloat/quality regressions observable.

### 4) Staged Rollout Mechanism
Enable admin-controlled rollout modes:
- draft (test only)
- canary (small %)
- active (100%)

### 5) Recovery Defaults
If DB prompt is empty or invalid:
- fallback to known-good default prompt in code
- log warning + alert in admin panel

## Suggested Admin UX Improvements (next steps)
- Add **Prompt Diff Viewer** to compare current vs previous template.
- Add **Test Prompt** runner using sample module briefs.
- Show **token estimate** and **risk warnings** before saving.
- Add **“Restore safe default”** one-click button.

## Practical Implementation Sequence
1. Keep current code fallback prompt in function code.
2. Store editable admin prompt in `settings.ai_prompt_template` (already implemented in this change).
3. Add prompt validation and versioning tables.
4. Migrate all AI functions to shared prompt builder.
5. Add UI for version history, rollback, and test runs.

## Success Criteria
- Fewer contradictory outputs.
- Lower average prompt tokens.
- Improved pass rate in module audit checks.
- Admins can safely iterate prompt behaviour without deployments.
