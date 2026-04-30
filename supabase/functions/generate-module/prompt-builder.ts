export interface PromptValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  estimatedTokens: number;
  characterCount: number;
}

export interface BuildSystemPromptOptions {
  adminTemplate?: string | null;
  fallbackTemplate: string;
  dynamicContext?: string | null;
  includeSafetyLayer?: boolean;
}

export const SAFETY_PROMPT_LAYER = `=== GLOBAL SAFETY & FORMAT LAYER (NON NEGOTIABLE) ===
1. Always respond with ONLY valid JSON. No explanations, no markdown, just the JSON object.
2. Treat age range and language guidelines as HARD requirements. TEXT LENGTH LIMITS ARE NON-NEGOTIABLE:
   - 6-8: MAX 70 words per page. 1-2 sentences per paragraph. Simple words only.
   - 9-11: MAX 100 words per page. 2-3 sentences per paragraph. Clear, short language.
   - 12-14: MAX 140 words per page. 3-5 sentences per paragraph. Concise, no fluff.
   - 15-18: MAX 170 words per page. 4-6 sentences per paragraph. Direct, young adult tone.
   Count your words before returning. If over the limit, rewrite shorter.
3. Use Australian English spelling throughout.
4. Never use deficit or pathologising language.
5. Never use directive language (must, should, have to) when invitation framing is required.`;

const HIGH_RISK_CONTRADICTIONS: Array<[RegExp, string]> = [
  [/\byou must\b/i, 'Contains directive phrase "you must" which may conflict with invitation framing.'],
  [/\byou have to\b/i, 'Contains directive phrase "you have to" which may conflict with invitation framing.'],
  [/\btime is up\b/i, 'Contains time-pressure phrase "time is up" which may conflict with child-paced guidance.'],
];

export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

export function validatePromptTemplate(template: string): PromptValidationResult {
  const normalized = (template || '').trim();
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!normalized) {
    errors.push('Prompt template cannot be empty.');
  }

  const characterCount = normalized.length;
  const estimatedTokens = estimateTokens(normalized);

  if (characterCount > 24000) {
    errors.push(`Prompt is too large (${characterCount} chars). Keep under 24,000 chars.`);
  } else if (characterCount > 16000) {
    warnings.push(`Prompt is very large (${characterCount} chars) and may increase cost/latency.`);
  }

  if (estimatedTokens > 5000) {
    warnings.push(`Estimated prompt tokens are high (~${estimatedTokens}). Consider reducing bloat.`);
  }

  const headingMatches = [...normalized.matchAll(/^===\s+(.+?)\s+===$/gm)].map((m) => m[1]);
  const duplicates = headingMatches.filter((h, i) => headingMatches.indexOf(h) !== i);
  if (duplicates.length) {
    warnings.push(`Duplicate prompt sections detected: ${Array.from(new Set(duplicates)).join(', ')}`);
  }

  for (const [rule, message] of HIGH_RISK_CONTRADICTIONS) {
    if (rule.test(normalized)) {
      warnings.push(message);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    estimatedTokens,
    characterCount,
  };
}

export function buildSystemPrompt(options: BuildSystemPromptOptions): string {
  const includeSafetyLayer = options.includeSafetyLayer !== false;
  const adminTemplate = (options.adminTemplate || '').trim();
  const fallbackTemplate = (options.fallbackTemplate || '').trim();
  const dynamicContext = (options.dynamicContext || '').trim();

  const instructionalLayer = adminTemplate || fallbackTemplate;

  const layers = [
    includeSafetyLayer ? SAFETY_PROMPT_LAYER : '',
    dynamicContext ? `=== DYNAMIC CONTEXT LAYER ===\n${dynamicContext}` : '',
    instructionalLayer,
  ].filter(Boolean);

  return layers.join('\n\n');
}
