/**
 * Claude API Integration
 * ======================
 * Functions for communicating with the Claude API.
 */

import { CLAUDE_MODEL, CLAUDE_TEMPERATURE, CACHE_TTL_MS } from "./config.ts";

// ====================
// SETTINGS CACHE
// ====================

let cachedSettings: { claude_api_key: string; fetchedAt: number } | null = null;

/**
 * Get settings from database (with caching)
 */
export async function getSettings(supabaseClient: any): Promise<{ claude_api_key: string }> {
  if (cachedSettings && Date.now() - cachedSettings.fetchedAt < CACHE_TTL_MS) {
    return cachedSettings;
  }
  
  const { data: settings, error } = await supabaseClient
    .from("settings")
    .select("claude_api_key")
    .single();
    
  if (error || !settings?.claude_api_key) {
    throw new Error("Claude API key not configured in settings");
  }
  
  cachedSettings = { claude_api_key: settings.claude_api_key, fetchedAt: Date.now() };
  return cachedSettings;
}

/**
 * Call Claude API with a system prompt and user prompt
 */
export async function callClaude(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number
): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: maxTokens,
      temperature: CLAUDE_TEMPERATURE,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Claude API error: ${res.status} ${res.statusText}\n${errText}`);
  }

  const data = await res.json();
  return (data?.content?.[0]?.text ?? "").toString();
}

// ====================
// SYSTEM PROMPT
// ====================

export const SYSTEM_PROMPT = `You are an expert child psychologist and educational content creator specializing in social-emotional learning (SEL) workbooks for children ages 5-12.

Your content must be:
- Age-appropriate, warm, and encouraging
- Psychologically sound with evidence-based techniques
- Engaging with a consistent character/mascot throughout
- Interactive with activities that reinforce learning

CRITICAL RULES:
1. Always respond with ONLY valid JSON. No explanations, no markdown, just the JSON object.
2. If a specific character/mascot is mentioned (like "Daniel the Dog"), you MUST use EXACTLY that character name and type throughout.
3. Never substitute a different animal or character name - if told to use "Daniel the Dog", every reference must be to "Daniel" and a dog, not a fox, bear, or any other animal.
4. The mascot emoji must match the character type exactly.`;