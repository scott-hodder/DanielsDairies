/**
 * AI Module Generator v4.0
 * ==========================
 * 
 * ENHANCEMENTS FROM v3:
 * - 10+ new interactive activity types for variety
 * - Enhanced "interactive lesson" pages with embedded polls/choices
 * - Smarter activity category distribution (core, feelings, creative, cognitive)
 * - Less text-heavy pages with more engagement
 * - Fill-in stories, coping cards, gratitude jars, sorting activities
 * - Thought bubbles, emoji check-ins, word scrambles, agree/disagree
 * - Comic strips, affirmation builders
 * 
 * ARCHITECTURE:
 * - Claude generates content (text only)
 * - Code controls structure (guaranteed minimum 18 pages)
 * - Activities selected from 4 categories for diversity
 * - Deterministic HTML rendering
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ====================
// CONFIGURATION
// ====================

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
  "Content-Type": "application/json",
};

// Claude configuration
const CLAUDE_MODEL = "claude-sonnet-4-20250514";
const CLAUDE_TEMPERATURE = 0.7;

// Token budgets
const TOKENS_METADATA = 1500;
const TOKENS_LESSON_BATCH = 6000;
const TOKENS_ACTIVITY = 2000;

// Timing
const JOB_TIMEOUT_MS = 8 * 60 * 1000;
const CACHE_TTL_MS = 5 * 60 * 1000;

// Page count range
const MIN_PAGES = 18;
const MAX_PAGES = 24;

// ====================
// TYPES
// ====================

type PageType = 
  | "cover"
  | "welcome"
  | "chapter-divider"
  | "lesson"
  | "interactive-lesson"  // NEW: Lesson with embedded mini-activities
  | "checklist"
  | "reflection"
  | "quiz"
  | "drawing"
  | "breathing"
  | "scenario"
  | "feeling-thermometer"
  | "body-map"
  | "feeling-selector"
  | "calm-den-builder"
  | "action-plan"
  | "warning-signs"
  | "matching-activity"
  // NEW ACTIVITY TYPES
  | "fill-in-story"
  | "coping-cards"
  | "gratitude-jar"
  | "sorting-activity"
  | "thought-bubbles"
  | "emoji-check-in"
  | "word-scramble"
  | "agree-disagree"
  | "comic-strip"
  | "affirmation-builder"
  | "summary"
  | "completion";

interface PageTemplate {
  type: PageType;
  starReward: boolean;
}

interface ModuleMetadata {
  title: string;
  subtitle: string;
  series: string;
  targetAge: string;
  theme: string;
  characterName: string;
  characterEmoji: string;
  characterType?: string;
}

// Series data from the database
interface SeriesInfo {
  label: string;
  character_type: string;
  emoji: string;
}

interface LessonContent {
  heading: string;
  paragraphs: string[];
  calloutTitle?: string;
  calloutText?: string;
  tipText?: string;
}

interface ChapterDivider {
  chapterNumber: number;
  chapterTitle: string;
  chapterSubtitle: string;
}

interface ChecklistContent {
  heading: string;
  instructions: string;
  items: string[];
}

interface ReflectionContent {
  heading: string;
  prompt: string;
  placeholder: string;
}

interface QuizContent {
  heading: string;
  question: string;
  answers: Array<{
    text: string;
    isCorrect: boolean;
    feedback: string;
  }>;
}

interface DrawingContent {
  heading: string;
  instructions: string;
  promptQuestion: string;
}

interface BreathingContent {
  heading: string;
  instructions: string;
  inhaleText: string;
  holdText: string;
  exhaleText: string;
}

interface ScenarioContent {
  heading: string;
  scenario: string;
  question: string;
  options: Array<{
    text: string;
    feedback: string;
    isGood: boolean;
  }>;
}

interface SummaryContent {
  heading: string;
  takeaways: string[];
  encouragement: string;
}

interface CompletionContent {
  heading: string;
  celebrationText: string;
  nextStepsText: string;
}

interface FeelingThermometerContent {
  heading: string;
  instructions: string;
  lowLabel: string;
  highLabel: string;
  followUpQuestion: string;
}

interface BodyMapContent {
  heading: string;
  instructions: string;
  bodyParts: Array<{
    name: string;
    emoji: string;
    description: string;
  }>;
}

interface FeelingSelectorContent {
  heading: string;
  instructions: string;
  feelings: Array<{
    name: string;
    emoji: string;
    color: string;
  }>;
  followUpQuestion: string;
}

interface CalmDenBuilderContent {
  heading: string;
  storyText: string;
  instructions: string;
  items: Array<{
    id: string;
    name: string;
    emoji: string;
  }>;
  locationQuestion: string;
}

interface ActionPlanContent {
  heading: string;
  instructions: string;
  steps: Array<{
    stepNumber: number;
    title: string;
    prompt: string;
    placeholder: string;
  }>;
}

interface WarningSingsContent {
  heading: string;
  instructions: string;
  categories: Array<{
    category: string;
    emoji: string;
    examples: string[];
  }>;
}

interface MatchingActivityContent {
  heading: string;
  instructions: string;
  pairs: Array<{
    situation: string;
    feeling: string;
    emoji: string;
  }>;
}

// NEW: Interactive lesson with embedded mini-activities
interface InteractiveLessonContent {
  heading: string;
  introText: string;
  interactionType: "poll" | "circle-one" | "fill-blank" | "rate-scale" | "true-false";
  interactionPrompt: string;
  interactionOptions?: string[];
  followUpText: string;
  mascotComment: string;
}

interface FillInStoryContent {
  heading: string;
  instructions: string;
  storyTemplate: string;
  blanks: Array<{
    id: string;
    hint: string;
    category: string;
  }>;
  reflection: string;
}

interface CopingCardsContent {
  heading: string;
  instructions: string;
  categories: Array<{
    name: string;
    emoji: string;
    color: string;
    strategies: string[];
  }>;
  personalCardPrompt: string;
}

interface GratitudeJarContent {
  heading: string;
  introText: string;
  promptCategories: Array<{
    category: string;
    emoji: string;
    prompt: string;
  }>;
  encouragement: string;
}

interface SortingActivityContent {
  heading: string;
  instructions: string;
  categories: Array<{
    name: string;
    emoji: string;
    color: string;
  }>;
  items: Array<{
    text: string;
    correctCategory: string;
    explanation: string;
  }>;
}

interface ThoughtBubblesContent {
  heading: string;
  scenario: string;
  characterEmoji: string;
  unhelpfulThought: string;
  helpfulPrompt: string;
  exampleHelpful: string;
  reflection: string;
}

interface EmojiCheckInContent {
  heading: string;
  instructions: string;
  timePoints: Array<{
    label: string;
    emoji: string;
  }>;
  moodOptions: Array<{
    emoji: string;
    label: string;
    color: string;
  }>;
  patternQuestion: string;
}

interface WordScrambleContent {
  heading: string;
  instructions: string;
  words: Array<{
    scrambled: string;
    answer: string;
    hint: string;
    emoji: string;
  }>;
  completionMessage: string;
}

interface AgreeDisagreeContent {
  heading: string;
  instructions: string;
  statements: Array<{
    statement: string;
    insight: string;
  }>;
  reflection: string;
}

interface ComicStripContent {
  heading: string;
  scenario: string;
  panels: Array<{
    panelNumber: number;
    prompt: string;
    placeholder: string;
  }>;
  sharePrompt: string;
}

interface AffirmationBuilderContent {
  heading: string;
  instructions: string;
  starters: string[];
  middles: string[];
  endings: string[];
  decorationEmojis: string[];
  savePrompt: string;
}

interface GeneratedContent {
  metadata: ModuleMetadata;
  welcome: { heading: string; paragraphs: string[] };
  chapters: ChapterDivider[];
  lessons: LessonContent[];
  interactiveLessons: InteractiveLessonContent[];
  checklists: ChecklistContent[];
  reflections: ReflectionContent[];
  quizzes: QuizContent[];
  drawings: DrawingContent[];
  breathing: BreathingContent;
  scenarios: ScenarioContent[];
  feelingThermometers: FeelingThermometerContent[];
  bodyMaps: BodyMapContent[];
  feelingSelectors: FeelingSelectorContent[];
  calmDenBuilders: CalmDenBuilderContent[];
  actionPlans: ActionPlanContent[];
  warningSigns: WarningSingsContent[];
  matchingActivities: MatchingActivityContent[];
  // NEW
  fillInStories: FillInStoryContent[];
  copingCards: CopingCardsContent[];
  gratitudeJars: GratitudeJarContent[];
  sortingActivities: SortingActivityContent[];
  thoughtBubbles: ThoughtBubblesContent[];
  emojiCheckIns: EmojiCheckInContent[];
  wordScrambles: WordScrambleContent[];
  agreeDisagrees: AgreeDisagreeContent[];
  comicStrips: ComicStripContent[];
  affirmationBuilders: AffirmationBuilderContent[];
  summary: SummaryContent;
  completion: CompletionContent;
}

// Cache
let cachedSettings: { claude_api_key: string; fetchedAt: number } | null = null;

// ====================
// UTILITIES
// ====================

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

function escapeHtml(s: string): string {
  return (s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// For use inside template literals that will be rendered at runtime
function escapeForTemplate(s: string): string {
  return escapeHtml(s).replace(/`/g, "\\`");
}

function cleanJsonResponse(text: string): string {
  let t = (text ?? "").trim();
  t = t.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  t = t.replace(/[""]/g, '"').replace(/['']/g, "'");
  const first = t.indexOf("{");
  const last = t.lastIndexOf("}");
  if (first >= 0 && last > first) {
    t = t.slice(first, last + 1);
  }
  t = t.replace(/,\s*([}\]])/g, "$1");
  return t.trim();
}

function safeJsonParse<T>(raw: string): T | null {
  try {
    return JSON.parse(cleanJsonResponse(raw)) as T;
  } catch {
    return null;
  }
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ====================
// PAGE STRUCTURE GENERATOR
// ====================

// Helper to shuffle arrays
function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Generate a variable page structure between MIN_PAGES and MAX_PAGES
 * Activities are selected from 4 CATEGORIES for maximum diversity:
 * - CORE: Classic activities (checklist, quiz, reflection, etc.)
 * - FEELINGS: Emotional awareness activities 
 * - CREATIVE: Artistic/building activities
 * - COGNITIVE: Thinking/problem-solving activities
 */
function generatePageStructure(): PageTemplate[] {
  const targetPages = randomInt(MIN_PAGES, MAX_PAGES);
  
  // CORE activities (classic, well-tested)
  const coreActivities: PageTemplate[] = [
    { type: "checklist",   starReward: true },
    { type: "reflection",  starReward: true },
    { type: "quiz",        starReward: true },
    { type: "drawing",     starReward: true },
    { type: "breathing",   starReward: true },
    { type: "scenario",    starReward: true },
  ];
  
  // FEELINGS-FOCUSED activities
  const feelingsActivities: PageTemplate[] = [
    { type: "feeling-thermometer", starReward: true },
    { type: "body-map",            starReward: true },
    { type: "feeling-selector",    starReward: true },
    { type: "emoji-check-in",      starReward: true },
  ];
  
  // CREATIVE activities
  const creativeActivities: PageTemplate[] = [
    { type: "calm-den-builder",    starReward: true },
    { type: "fill-in-story",       starReward: true },
    { type: "comic-strip",         starReward: true },
    { type: "affirmation-builder", starReward: true },
    { type: "gratitude-jar",       starReward: true },
  ];
  
  // COGNITIVE activities
  const cognitiveActivities: PageTemplate[] = [
    { type: "action-plan",         starReward: true },
    { type: "warning-signs",       starReward: true },
    { type: "matching-activity",   starReward: true },
    { type: "sorting-activity",    starReward: true },
    { type: "thought-bubbles",     starReward: true },
    { type: "agree-disagree",      starReward: true },
    { type: "word-scramble",       starReward: true },
    { type: "coping-cards",        starReward: true },
  ];
  
  // Select activities from each category for guaranteed diversity
  const selectedActivities: PageTemplate[] = [];
  
  // Always include 2-3 core activities
  const shuffledCore = shuffleArray(coreActivities);
  selectedActivities.push(...shuffledCore.slice(0, randomInt(2, 3)));
  
  // Include 1-2 feelings activities  
  const shuffledFeelings = shuffleArray(feelingsActivities);
  selectedActivities.push(...shuffledFeelings.slice(0, randomInt(1, 2)));
  
  // Include 1-2 creative activities
  const shuffledCreative = shuffleArray(creativeActivities);
  selectedActivities.push(...shuffledCreative.slice(0, randomInt(1, 2)));
  
  // Include 1-2 cognitive activities
  const shuffledCognitive = shuffleArray(cognitiveActivities);
  selectedActivities.push(...shuffledCognitive.slice(0, randomInt(1, 2)));
  
  // Shuffle all selected activities for random placement
  const activities = shuffleArray(selectedActivities);
  
  // Build structure with interactive lessons interspersed
  const structure: PageTemplate[] = [
    { type: "cover",           starReward: false },
    { type: "welcome",         starReward: false },
  ];
  
  // Chapter 1: Introduction - mix interactive lessons with activities
  structure.push({ type: "chapter-divider", starReward: false });
  structure.push({ type: "interactive-lesson", starReward: false }); // More engaging than plain lesson
  structure.push({ type: "lesson", starReward: false });
  if (activities.length > 0) structure.push(activities.shift()!);
  structure.push({ type: "interactive-lesson", starReward: false });
  if (activities.length > 0) structure.push(activities.shift()!);
  
  // Chapter 2: Deeper exploration
  structure.push({ type: "chapter-divider", starReward: false });
  structure.push({ type: "lesson", starReward: false });
  if (activities.length > 0) structure.push(activities.shift()!);
  structure.push({ type: "interactive-lesson", starReward: false });
  if (activities.length > 0) structure.push(activities.shift()!);
  structure.push({ type: "lesson", starReward: false });
  
  // Chapter 3 (if room)
  if (targetPages >= 20) {
    structure.push({ type: "chapter-divider", starReward: false });
    structure.push({ type: "interactive-lesson", starReward: false });
  }
  
  // Add remaining activities with interactive lessons between
  while (activities.length > 0) {
    structure.push(activities.shift()!);
    if (activities.length > 0 && structure.length < targetPages - 3) {
      // Alternate between regular and interactive lessons
      if (Math.random() > 0.4) {
        structure.push({ type: "interactive-lesson", starReward: false });
      } else {
        structure.push({ type: "lesson", starReward: false });
      }
    }
  }
  
  // Fill remaining slots - prefer interactive lessons for engagement
  while (structure.length < targetPages - 2) {
    if (Math.random() > 0.3) {
      structure.push({ type: "interactive-lesson", starReward: false });
    } else {
      structure.push({ type: "lesson", starReward: false });
    }
  }
  
  // Always end with summary and completion
  structure.push({ type: "summary", starReward: false });
  structure.push({ type: "completion", starReward: false });
  
  return structure;
}

// ====================
// CLAUDE API
// ====================

async function getSettings(supabaseClient: any) {
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

async function callClaude(
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
// CONTENT GENERATION
// ====================

const SYSTEM_PROMPT = `You are an expert child psychologist and educational content creator specializing in social-emotional learning (SEL) workbooks for children ages 5-12.

Your content must be:
- Age-appropriate, warm, and encouraging
- Psychologically sound with evidence-based techniques
- Engaging with a consistent character/mascot throughout
- Interactive with activities that reinforce learning

CRITICAL: Always respond with ONLY valid JSON. No explanations, no markdown, just the JSON object.`;

async function generateMetadata(
  apiKey: string,
  contentBrief: string,
  seriesInfo?: SeriesInfo | null
): Promise<ModuleMetadata> {
  // Build full character name like "Daniel the Dog" if series info available
  const fullCharacterName = seriesInfo 
    ? `${seriesInfo.label} the ${seriesInfo.character_type.charAt(0).toUpperCase() + seriesInfo.character_type.slice(1)}`
    : null;

  // If we have series info, include it in the prompt to guide the AI
  const seriesContext = seriesInfo 
    ? `\n\nIMPORTANT - SERIES CHARACTER INFO:
This module belongs to the "${seriesInfo.label}" series.
The mascot is "${fullCharacterName}" - a friendly ${seriesInfo.character_type}.
The mascot emoji MUST be: ${seriesInfo.emoji}
The character name MUST be "${fullCharacterName}".
Always refer to the mascot as "${fullCharacterName}" throughout the module.
DO NOT use any other animal or emoji - only use ${seriesInfo.emoji} for the mascot.`
    : "";

  const prompt = `Based on this content brief, create module metadata.

CONTENT BRIEF:
${contentBrief}${seriesContext}

Respond with ONLY this JSON structure:
{
  "title": "Main module title (catchy, child-friendly)",
  "subtitle": "Brief tagline (10 words max)",
  "series": "${seriesInfo?.label || 'custom'}",
  "targetAge": "Age range like '5-8' or '8-12'",
  "theme": "Core psychological theme (e.g., 'anxiety management', 'emotional regulation')",
  "characterName": "${fullCharacterName || 'Friendly mascot name (animal preferred)'}",
  "characterEmoji": "${seriesInfo?.emoji || 'Single emoji representing the mascot'}"
}`;

  const response = await callClaude(apiKey, SYSTEM_PROMPT, prompt, TOKENS_METADATA);
  const parsed = safeJsonParse<ModuleMetadata>(response);
  
  // If we have series info, ALWAYS enforce the character type and emoji (override AI response)
  if (seriesInfo && parsed) {
    parsed.characterEmoji = seriesInfo.emoji;
    parsed.characterName = fullCharacterName || seriesInfo.label;
    parsed.characterType = seriesInfo.character_type;
    parsed.series = seriesInfo.label;
  }
  
  if (!parsed || !parsed.title) {
    return {
      title: "My Feelings Adventure",
      subtitle: "Learning about emotions together",
      series: seriesInfo?.label || "custom",
      targetAge: "5-10",
      theme: "emotional awareness",
      characterName: fullCharacterName || "Buddy",
      characterEmoji: seriesInfo?.emoji || "🐕",
      characterType: seriesInfo?.character_type
    };
  }
  
  return parsed;
}

async function generateWelcome(
  apiKey: string,
  metadata: ModuleMetadata,
  contentBrief: string
): Promise<{ heading: string; paragraphs: string[] }> {
  const prompt = `Create a warm welcome page for a child's workbook.

Module: "${metadata.title}"
Theme: ${metadata.theme}
Mascot: ${metadata.characterName} ${metadata.characterEmoji}
Age: ${metadata.targetAge}

Brief: ${contentBrief}

Respond with ONLY this JSON:
{
  "heading": "Welcoming heading with mascot name",
  "paragraphs": [
    "Warm greeting from mascot introducing themselves (2-3 sentences)",
    "What we'll learn in this adventure (2-3 sentences)",
    "Encouraging message about feelings being okay (2-3 sentences)"
  ]
}`;

  const response = await callClaude(apiKey, SYSTEM_PROMPT, prompt, TOKENS_METADATA);
  const parsed = safeJsonParse<{ heading: string; paragraphs: string[] }>(response);
  
  return parsed || {
    heading: `Welcome, Friend! ${metadata.characterEmoji}`,
    paragraphs: [
      `Hi there! I'm ${metadata.characterName}, and I'm so happy you're here!`,
      "In this adventure, we're going to learn amazing things about our feelings together.",
      "Remember: all feelings are okay, even the big ones!"
    ]
  };
}

async function generateChapterDividers(
  apiKey: string,
  metadata: ModuleMetadata,
  contentBrief: string,
  count: number
): Promise<ChapterDivider[]> {
  const prompt = `Create ${count} chapter dividers for a child's workbook about "${metadata.theme}".

Brief: ${contentBrief}

Respond with ONLY this JSON:
{
  "chapters": [
    {
      "chapterNumber": 1,
      "chapterTitle": "Short engaging title",
      "chapterSubtitle": "What we'll explore"
    }
  ]
}

Create exactly ${count} chapters.`;

  const response = await callClaude(apiKey, SYSTEM_PROMPT, prompt, TOKENS_METADATA);
  const parsed = safeJsonParse<{ chapters: ChapterDivider[] }>(response);
  
  const chapters = parsed?.chapters || [];
  while (chapters.length < count) {
    chapters.push({
      chapterNumber: chapters.length + 1,
      chapterTitle: `Chapter ${chapters.length + 1}`,
      chapterSubtitle: "Let's learn together!"
    });
  }
  
  return chapters.slice(0, count);
}

async function generateLessons(
  apiKey: string,
  metadata: ModuleMetadata,
  contentBrief: string,
  count: number
): Promise<LessonContent[]> {
  const prompt = `Create ${count} lessons for a child's workbook about "${metadata.theme}".

Module: "${metadata.title}"
Mascot: ${metadata.characterName} ${metadata.characterEmoji}
Age: ${metadata.targetAge}

Brief: ${contentBrief}

Respond with ONLY this JSON:
{
  "lessons": [
    {
      "heading": "Engaging lesson title with emoji",
      "paragraphs": [
        "First paragraph introducing the concept (3-4 sentences)",
        "Second paragraph with examples or story element (3-4 sentences)",
        "Third paragraph with practical explanation (3-4 sentences)"
      ],
      "calloutTitle": "Key Point",
      "calloutText": "Important takeaway (1-2 sentences)",
      "tipText": "Fun tip from the mascot"
    }
  ]
}

Create exactly ${count} unique lessons. Make each lesson focus on a different aspect of ${metadata.theme}.`;

  const response = await callClaude(apiKey, SYSTEM_PROMPT, prompt, TOKENS_LESSON_BATCH);
  const parsed = safeJsonParse<{ lessons: LessonContent[] }>(response);
  
  const lessons = parsed?.lessons || [];
  while (lessons.length < count) {
    lessons.push({
      heading: `Lesson ${lessons.length + 1} 📚`,
      paragraphs: [
        "Learning about our feelings helps us understand ourselves better.",
        "Everyone has feelings, and that's perfectly normal.",
        "Let's explore this topic together!"
      ],
      calloutTitle: "Remember",
      calloutText: "All feelings are okay!",
      tipText: `${metadata.characterName} says: You're doing great!`
    });
  }
  
  return lessons.slice(0, count);
}

async function generateChecklists(
  apiKey: string,
  metadata: ModuleMetadata,
  contentBrief: string,
  count: number
): Promise<ChecklistContent[]> {
  const prompt = `Create ${count} checklist activities for children about "${metadata.theme}".

Module: "${metadata.title}"
Mascot: ${metadata.characterName}

Respond with ONLY this JSON:
{
  "checklists": [
    {
      "heading": "Activity title with emoji",
      "instructions": "Clear instructions for the child (1-2 sentences)",
      "items": [
        "First actionable item (start with verb)",
        "Second item",
        "Third item",
        "Fourth item",
        "Fifth item"
      ]
    }
  ]
}

Create exactly ${count} different checklists, each focusing on different skills or actions.`;

  const response = await callClaude(apiKey, SYSTEM_PROMPT, prompt, TOKENS_ACTIVITY);
  const parsed = safeJsonParse<{ checklists: ChecklistContent[] }>(response);
  
  const checklists = parsed?.checklists || [];
  while (checklists.length < count) {
    checklists.push({
      heading: "✅ My Action Checklist",
      instructions: "Check off each item as you practice it!",
      items: [
        "Take a deep breath when I feel big emotions",
        "Tell a grown-up how I'm feeling",
        "Use my words to express myself",
        "Try a calming activity",
        "Be kind to myself"
      ]
    });
  }
  
  return checklists.slice(0, count);
}

async function generateReflections(
  apiKey: string,
  metadata: ModuleMetadata,
  contentBrief: string,
  count: number
): Promise<ReflectionContent[]> {
  const prompt = `Create ${count} reflection writing activities for children about "${metadata.theme}".

Respond with ONLY this JSON:
{
  "reflections": [
    {
      "heading": "Reflection title with emoji",
      "prompt": "Open-ended question that encourages personal reflection (1-2 sentences)",
      "placeholder": "Encouraging placeholder text for the writing area"
    }
  ]
}

Create exactly ${count} different reflection prompts.`;

  const response = await callClaude(apiKey, SYSTEM_PROMPT, prompt, TOKENS_ACTIVITY);
  const parsed = safeJsonParse<{ reflections: ReflectionContent[] }>(response);
  
  const reflections = parsed?.reflections || [];
  while (reflections.length < count) {
    reflections.push({
      heading: "📝 My Thoughts",
      prompt: "Think about a time when you had big feelings. What happened and how did you handle it?",
      placeholder: "Write your thoughts here..."
    });
  }
  
  return reflections.slice(0, count);
}

async function generateQuizzes(
  apiKey: string,
  metadata: ModuleMetadata,
  contentBrief: string,
  count: number
): Promise<QuizContent[]> {
  const prompt = `Create ${count} quiz questions for children about "${metadata.theme}".

Respond with ONLY this JSON:
{
  "quizzes": [
    {
      "heading": "Quiz title with emoji",
      "question": "Simple multiple-choice question",
      "answers": [
        { "text": "Correct answer", "isCorrect": true, "feedback": "Great job! explanation" },
        { "text": "Wrong answer 1", "isCorrect": false, "feedback": "Not quite, but good try!" },
        { "text": "Wrong answer 2", "isCorrect": false, "feedback": "Let's think about this..." },
        { "text": "Wrong answer 3", "isCorrect": false, "feedback": "Almost!" }
      ]
    }
  ]
}

Create exactly ${count} different quiz questions.`;

  const response = await callClaude(apiKey, SYSTEM_PROMPT, prompt, TOKENS_ACTIVITY);
  const parsed = safeJsonParse<{ quizzes: QuizContent[] }>(response);
  
  const quizzes = parsed?.quizzes || [];
  while (quizzes.length < count) {
    quizzes.push({
      heading: "🎯 Quick Quiz!",
      question: "What should you do when you feel really big emotions?",
      answers: [
        { text: "Take deep breaths and find a calm activity", isCorrect: true, feedback: "Excellent! Taking deep breaths helps our body calm down." },
        { text: "Keep it all inside", isCorrect: false, feedback: "It's actually better to express our feelings in healthy ways!" },
        { text: "Yell and scream", isCorrect: false, feedback: "There are gentler ways to express big feelings." },
        { text: "Ignore it completely", isCorrect: false, feedback: "Our feelings are important and deserve attention." }
      ]
    });
  }
  
  return quizzes.slice(0, count);
}

async function generateDrawings(
  apiKey: string,
  metadata: ModuleMetadata,
  contentBrief: string,
  count: number
): Promise<DrawingContent[]> {
  const prompt = `Create ${count} drawing activities for children about "${metadata.theme}".

Respond with ONLY this JSON:
{
  "drawings": [
    {
      "heading": "Drawing activity title with emoji",
      "instructions": "Clear drawing instructions (1-2 sentences)",
      "promptQuestion": "Question to answer after drawing"
    }
  ]
}

Create exactly ${count} different drawing activities.`;

  const response = await callClaude(apiKey, SYSTEM_PROMPT, prompt, TOKENS_ACTIVITY);
  const parsed = safeJsonParse<{ drawings: DrawingContent[] }>(response);
  
  const drawings = parsed?.drawings || [];
  while (drawings.length < count) {
    drawings.push({
      heading: "🎨 Draw Your Feelings",
      instructions: "In the space below, draw a picture that shows how you're feeling today.",
      promptQuestion: "What does your drawing show about your feelings?"
    });
  }
  
  return drawings.slice(0, count);
}

async function generateBreathing(
  apiKey: string,
  metadata: ModuleMetadata
): Promise<BreathingContent> {
  const prompt = `Create a breathing exercise for children.

Respond with ONLY this JSON:
{
  "heading": "Breathing exercise title with emoji",
  "instructions": "Simple explanation of how breathing helps us (1-2 sentences)",
  "inhaleText": "What to think/say while breathing in (short)",
  "holdText": "What to think/say while holding (short)",
  "exhaleText": "What to think/say while breathing out (short)"
}`;

  const response = await callClaude(apiKey, SYSTEM_PROMPT, prompt, TOKENS_ACTIVITY);
  const parsed = safeJsonParse<BreathingContent>(response);
  
  return parsed || {
    heading: "🌬️ Calm Breathing",
    instructions: "Let's do some calm breathing together. This helps our body relax when feelings get too big.",
    inhaleText: "Breathe in calm...",
    holdText: "Hold gently...",
    exhaleText: "Breathe out worries..."
  };
}

async function generateScenarios(
  apiKey: string,
  metadata: ModuleMetadata,
  contentBrief: string,
  count: number
): Promise<ScenarioContent[]> {
  const prompt = `Create ${count} scenario-based activities for children about "${metadata.theme}".

These should present a situation and ask the child to choose the best response.

Respond with ONLY this JSON:
{
  "scenarios": [
    {
      "heading": "Scenario title with emoji",
      "scenario": "Description of a relatable situation (2-3 sentences)",
      "question": "What would you do?",
      "options": [
        { "text": "Good choice", "feedback": "Great thinking! This helps because...", "isGood": true },
        { "text": "Okay choice", "feedback": "This could work, but there might be a better way...", "isGood": false },
        { "text": "Not ideal choice", "feedback": "Let's think about why this might not help...", "isGood": false }
      ]
    }
  ]
}

Create exactly ${count} different scenarios.`;

  const response = await callClaude(apiKey, SYSTEM_PROMPT, prompt, TOKENS_ACTIVITY);
  const parsed = safeJsonParse<{ scenarios: ScenarioContent[] }>(response);
  
  const scenarios = parsed?.scenarios || [];
  while (scenarios.length < count) {
    scenarios.push({
      heading: "🤔 What Would You Do?",
      scenario: "Imagine you're at school and a friend says something that hurts your feelings. You feel sad and a little angry.",
      question: "What would be a good thing to do?",
      options: [
        { text: "Take a deep breath and tell them how you feel", feedback: "Great choice! Expressing our feelings calmly helps others understand us.", isGood: true },
        { text: "Walk away without saying anything", feedback: "Sometimes we need space, but it's also good to talk about our feelings.", isGood: false },
        { text: "Say something mean back", feedback: "This might feel good for a moment, but it usually makes things worse.", isGood: false }
      ]
    });
  }
  
  return scenarios.slice(0, count);
}

async function generateFeelingThermometers(
  apiKey: string,
  metadata: ModuleMetadata,
  contentBrief: string,
  count: number
): Promise<FeelingThermometerContent[]> {
  const prompt = `Create ${count} feeling thermometer activities for children about "${metadata.theme}".

Respond with ONLY this JSON:
{
  "thermometers": [
    {
      "heading": "Activity title with thermometer emoji",
      "instructions": "Instructions for using the feeling scale (1-2 sentences)",
      "lowLabel": "Label for low end (e.g., 'Calm and peaceful')",
      "highLabel": "Label for high end (e.g., 'Very big feelings')",
      "followUpQuestion": "Question to ask after they rate their feeling"
    }
  ]
}`;

  const response = await callClaude(apiKey, SYSTEM_PROMPT, prompt, TOKENS_ACTIVITY);
  const parsed = safeJsonParse<{ thermometers: FeelingThermometerContent[] }>(response);
  
  const thermometers = parsed?.thermometers || [];
  while (thermometers.length < count) {
    thermometers.push({
      heading: "🌡️ My Feelings Thermometer",
      instructions: "Move the slider to show how big your feelings are right now.",
      lowLabel: "Calm and peaceful",
      highLabel: "Very big feelings!",
      followUpQuestion: "What helped you notice where your feelings are today?"
    });
  }
  
  return thermometers.slice(0, count);
}

async function generateBodyMaps(
  apiKey: string,
  metadata: ModuleMetadata,
  contentBrief: string,
  count: number
): Promise<BodyMapContent[]> {
  const prompt = `Create ${count} body map activities for children about "${metadata.theme}".

Respond with ONLY this JSON:
{
  "bodyMaps": [
    {
      "heading": "Activity title with body emoji",
      "instructions": "Instructions for exploring body sensations (1-2 sentences)",
      "bodyParts": [
        { "name": "Head", "emoji": "🧠 ", "description": "What happens here when you feel this emotion" },
        { "name": "Chest", "emoji": "💗", "description": "What happens here" },
        { "name": "Tummy", "emoji": "🦋", "description": "What happens here" },
        { "name": "Hands", "emoji": "✋", "description": "What happens here" },
        { "name": "Legs", "emoji": "🦵", "description": "What happens here" }
      ]
    }
  ]
}`;

  const response = await callClaude(apiKey, SYSTEM_PROMPT, prompt, TOKENS_ACTIVITY);
  const parsed = safeJsonParse<{ bodyMaps: BodyMapContent[] }>(response);
  
  const bodyMaps = parsed?.bodyMaps || [];
  while (bodyMaps.length < count) {
    bodyMaps.push({
      heading: "🫀 Where Do Feelings Live in My Body?",
      instructions: "Tap on different parts of the body to see how feelings show up there!",
      bodyParts: [
        { name: "Head", emoji: "🧠 ", description: "Racing thoughts or foggy thinking" },
        { name: "Chest", emoji: "💗", description: "Heart beating fast or tight feeling" },
        { name: "Tummy", emoji: "🦋", description: "Butterflies or upset stomach" },
        { name: "Hands", emoji: "✋", description: "Shaky or sweaty palms" },
        { name: "Legs", emoji: "🦵", description: "Wobbly or wanting to run" }
      ]
    });
  }
  
  return bodyMaps.slice(0, count);
}

async function generateFeelingSelectors(
  apiKey: string,
  metadata: ModuleMetadata,
  contentBrief: string,
  count: number
): Promise<FeelingSelectorContent[]> {
  const prompt = `Create ${count} feeling selector activities for children about "${metadata.theme}".

Respond with ONLY this JSON:
{
  "selectors": [
    {
      "heading": "Activity title with emoji",
      "instructions": "Instructions for selecting feelings (1-2 sentences)",
      "feelings": [
        { "name": "Happy", "emoji": "😊", "color": "#FFE8A3" },
        { "name": "Sad", "emoji": "😢", "color": "#a8d8ea" },
        { "name": "Angry", "emoji": "😀 ", "color": "#fecaca" },
        { "name": "Scared", "emoji": "😨", "color": "#d4a5ff" },
        { "name": "Calm", "emoji": "😌", "color": "#A8E6CF" },
        { "name": "Excited", "emoji": "🤩", "color": "#F4A261" }
      ],
      "followUpQuestion": "Question after they select their feeling"
    }
  ]
}`;

  const response = await callClaude(apiKey, SYSTEM_PROMPT, prompt, TOKENS_ACTIVITY);
  const parsed = safeJsonParse<{ selectors: FeelingSelectorContent[] }>(response);
  
  const selectors = parsed?.selectors || [];
  while (selectors.length < count) {
    selectors.push({
      heading: "🎭 How Am I Feeling Right Now?",
      instructions: "Tap on the feeling that matches how you feel right now. You can pick more than one!",
      feelings: [
        { name: "Happy", emoji: "😊", color: "#FFE8A3" },
        { name: "Sad", emoji: "😢", color: "#a8d8ea" },
        { name: "Angry", emoji: "😀 ", color: "#fecaca" },
        { name: "Scared", emoji: "😨", color: "#d4a5ff" },
        { name: "Calm", emoji: "😌", color: "#A8E6CF" },
        { name: "Excited", emoji: "🤩", color: "#F4A261" }
      ],
      followUpQuestion: "What made you feel this way today?"
    });
  }
  
  return selectors.slice(0, count);
}

async function generateCalmDenBuilders(
  apiKey: string,
  metadata: ModuleMetadata,
  contentBrief: string,
  count: number
): Promise<CalmDenBuilderContent[]> {
  const prompt = `Create ${count} calm-down den builder activities for children about "${metadata.theme}".

Respond with ONLY this JSON:
{
  "denBuilders": [
    {
      "heading": "Activity title with home emoji",
      "storyText": "Short story about the mascot's calm space (2-3 sentences)",
      "instructions": "Instructions for building their own calm space (1-2 sentences)",
      "items": [
        { "id": "blanket", "name": "Soft blanket", "emoji": "🧠¸" },
        { "id": "pillow", "name": "Comfy pillow", "emoji": "🛏️" },
        { "id": "music", "name": "Calm music", "emoji": "🎵" },
        { "id": "book", "name": "Favorite book", "emoji": "📚" },
        { "id": "toy", "name": "Special toy", "emoji": "🧠¸" },
        { "id": "light", "name": "Dim lights", "emoji": "💡" }
      ],
      "locationQuestion": "Where will your calm-down space be?"
    }
  ]
}`;

  const response = await callClaude(apiKey, SYSTEM_PROMPT, prompt, TOKENS_ACTIVITY);
  const parsed = safeJsonParse<{ denBuilders: CalmDenBuilderContent[] }>(response);
  
  const denBuilders = parsed?.denBuilders || [];
  while (denBuilders.length < count) {
    denBuilders.push({
      heading: "🏠 Build Your Calm-Down Den",
      storyText: `When ${metadata.characterName}'s feelings get too big, they go to their special calm-down space. It's cozy and safe, with all their favorite things to help them feel better.`,
      instructions: "Tap on items to add them to YOUR calm-down den!",
      items: [
        { id: "blanket", name: "Soft blanket", emoji: "🧠£" },
        { id: "pillow", name: "Comfy pillow", emoji: "🛏️" },
        { id: "music", name: "Calm music", emoji: "🎵" },
        { id: "book", name: "Favorite book", emoji: "📚" },
        { id: "toy", name: "Special toy", emoji: "🧠¸" },
        { id: "light", name: "Dim lights", emoji: "💡" }
      ],
      locationQuestion: "Where will your calm-down space be at home?"
    });
  }
  
  return denBuilders.slice(0, count);
}

async function generateActionPlans(
  apiKey: string,
  metadata: ModuleMetadata,
  contentBrief: string,
  count: number
): Promise<ActionPlanContent[]> {
  const prompt = `Create ${count} action plan activities for children about "${metadata.theme}".

Respond with ONLY this JSON:
{
  "actionPlans": [
    {
      "heading": "Activity title with paw/step emoji",
      "instructions": "Instructions for creating their plan (1-2 sentences)",
      "steps": [
        { "stepNumber": 1, "title": "NOTICE", "prompt": "What are my warning signs?", "placeholder": "e.g., tight fists, fast breathing..." },
        { "stepNumber": 2, "title": "STOP", "prompt": "What will I say to myself?", "placeholder": "e.g., I need a break..." },
        { "stepNumber": 3, "title": "CALM", "prompt": "What tool will I use?", "placeholder": "e.g., deep breathing, counting..." },
        { "stepNumber": 4, "title": "HELP", "prompt": "Who can help me?", "placeholder": "e.g., Mum, Dad, teacher..." }
      ]
    }
  ]
}`;

  const response = await callClaude(apiKey, SYSTEM_PROMPT, prompt, TOKENS_ACTIVITY);
  const parsed = safeJsonParse<{ actionPlans: ActionPlanContent[] }>(response);
  
  const actionPlans = parsed?.actionPlans || [];
  while (actionPlans.length < count) {
    actionPlans.push({
      heading: "🐾 My Paw-Steps Plan",
      instructions: "Fill in your personal plan for when feelings get big!",
      steps: [
        { stepNumber: 1, title: "NOTICE", prompt: "What are my warning signs?", placeholder: "e.g., tight fists, fast breathing..." },
        { stepNumber: 2, title: "STOP", prompt: "What will I say to myself?", placeholder: "e.g., I need a break..." },
        { stepNumber: 3, title: "CALM", prompt: "What calm-down tool will I use?", placeholder: "e.g., deep breathing, counting..." },
        { stepNumber: 4, title: "HELP", prompt: "Who can help me if I need it?", placeholder: "e.g., Mum, Dad, teacher..." }
      ]
    });
  }
  
  return actionPlans.slice(0, count);
}

async function generateWarningSigns(
  apiKey: string,
  metadata: ModuleMetadata,
  contentBrief: string,
  count: number
): Promise<WarningSingsContent[]> {
  const prompt = `Create ${count} warning signs identification activities for children about "${metadata.theme}".

Respond with ONLY this JSON:
{
  "warningSigns": [
    {
      "heading": "Activity title with warning emoji",
      "instructions": "Instructions for identifying warning signs (1-2 sentences)",
      "categories": [
        { "category": "Body Signs", "emoji": "🫀", "examples": ["Heart beats fast", "Hands get sweaty", "Tummy feels funny"] },
        { "category": "Thought Signs", "emoji": "💭", "examples": ["Can't stop worrying", "Thoughts go fast", "Hard to focus"] },
        { "category": "Action Signs", "emoji": "🏃", "examples": ["Want to run away", "Feel like yelling", "Can't sit still"] }
      ]
    }
  ]
}`;

  const response = await callClaude(apiKey, SYSTEM_PROMPT, prompt, TOKENS_ACTIVITY);
  const parsed = safeJsonParse<{ warningSigns: WarningSingsContent[] }>(response);
  
  const warningSigns = parsed?.warningSigns || [];
  while (warningSigns.length < count) {
    warningSigns.push({
      heading: "⚠ ï¸ My Early Warning Signs",
      instructions: "Check the signs that happen to YOU when feelings start getting big!",
      categories: [
        { category: "Body Signs", emoji: "🫀", examples: ["Heart beats fast", "Hands get sweaty", "Tummy feels funny", "Face gets hot"] },
        { category: "Thought Signs", emoji: "💭", examples: ["Can't stop worrying", "Thoughts go fast", "Hard to focus", "Feel confused"] },
        { category: "Action Signs", emoji: "🏃", examples: ["Want to run away", "Feel like yelling", "Can't sit still", "Want to hide"] }
      ]
    });
  }
  
  return warningSigns.slice(0, count);
}

async function generateMatchingActivities(
  apiKey: string,
  metadata: ModuleMetadata,
  contentBrief: string,
  count: number
): Promise<MatchingActivityContent[]> {
  const prompt = `Create ${count} matching activities for children about "${metadata.theme}".

Respond with ONLY this JSON:
{
  "matchingActivities": [
    {
      "heading": "Activity title with matching emoji",
      "instructions": "Instructions for the matching game (1-2 sentences)",
      "pairs": [
        { "situation": "A friend shares their toy with you", "feeling": "Happy", "emoji": "😊" },
        { "situation": "Someone takes your turn", "feeling": "Frustrated", "emoji": "😤" },
        { "situation": "You're about to try something new", "feeling": "Nervous", "emoji": "😰" },
        { "situation": "Your pet cuddles with you", "feeling": "Loved", "emoji": "🥰" }
      ]
    }
  ]
}`;

  const response = await callClaude(apiKey, SYSTEM_PROMPT, prompt, TOKENS_ACTIVITY);
  const parsed = safeJsonParse<{ matchingActivities: MatchingActivityContent[] }>(response);
  
  const matchingActivities = parsed?.matchingActivities || [];
  while (matchingActivities.length < count) {
    matchingActivities.push({
      heading: "🎯 Match the Feeling!",
      instructions: "Read each situation and pick the feeling that matches best!",
      pairs: [
        { situation: "A friend shares their toy with you", feeling: "Happy", emoji: "😊" },
        { situation: "Someone takes your turn in a game", feeling: "Frustrated", emoji: "😤" },
        { situation: "You're about to try something new", feeling: "Nervous", emoji: "😰" },
        { situation: "Your pet cuddles with you", feeling: "Loved", emoji: "🥰" },
        { situation: "You can't find your favorite toy", feeling: "Worried", emoji: "😟" }
      ]
    });
  }
  
  return matchingActivities.slice(0, count);
}

async function generateSummary(
  apiKey: string,
  metadata: ModuleMetadata,
  contentBrief: string
): Promise<SummaryContent> {
  // ... (rest of the code remains the same)
  const prompt = `Create a summary page for a child's workbook about "${metadata.theme}".

Respond with ONLY this JSON:
{
  "heading": "Summary title with emoji",
  "takeaways": [
    "Key learning point 1",
    "Key learning point 2",
    "Key learning point 3",
    "Key learning point 4"
  ],
  "encouragement": "Final encouraging message from the mascot"
}`;

  const response = await callClaude(apiKey, SYSTEM_PROMPT, prompt, TOKENS_ACTIVITY);
  const parsed = safeJsonParse<SummaryContent>(response);
  
  return parsed || {
    heading: "🌟 What We Learned",
    takeaways: [
      "All feelings are okay and normal",
      "Our body gives us signals about our feelings",
      "We can use tools like breathing to help calm big feelings",
      "Talking to someone we trust always helps"
    ],
    encouragement: "You did an amazing job! Keep practicing these skills every day."
  };
}

async function generateCompletion(
  apiKey: string,
  metadata: ModuleMetadata
): Promise<CompletionContent> {
  const prompt = `Create a completion/celebration page for a child's workbook.

Mascot: ${metadata.characterName} ${metadata.characterEmoji}

Respond with ONLY this JSON:
{
  "heading": "Celebration heading",
  "celebrationText": "Congratulatory message (2-3 sentences)",
  "nextStepsText": "What to do next (1-2 sentences)"
}`;

  const response = await callClaude(apiKey, SYSTEM_PROMPT, prompt, TOKENS_ACTIVITY);
  const parsed = safeJsonParse<CompletionContent>(response);
  
  return parsed || {
    heading: "🎉 You Did It!",
    celebrationText: `Amazing work! ${metadata.characterName} is so proud of you for completing this adventure. You've learned so many important things about feelings!`,
    nextStepsText: "Keep practicing what you learned, and remember - you can always come back to review!"
  };
}

// ========================================
// NEW ACTIVITY GENERATORS (v4.0)
// ========================================

async function generateInteractiveLessons(
  apiKey: string,
  metadata: ModuleMetadata,
  contentBrief: string,
  count: number
): Promise<InteractiveLessonContent[]> {
  const interactionTypes = ["poll", "circle-one", "fill-blank", "rate-scale", "true-false"];
  
  const prompt = `Create ${count} INTERACTIVE lessons for a child's workbook about "${metadata.theme}".

Module: "${metadata.title}"
Mascot: ${metadata.characterName} ${metadata.characterEmoji}
Age: ${metadata.targetAge}

These lessons should have SHORT text plus a simple interactive element.

Respond with ONLY this JSON:
{
  "interactiveLessons": [
    {
      "heading": "Engaging title with emoji",
      "introText": "Brief introduction to the concept (2-3 sentences max)",
      "interactionType": "poll",
      "interactionPrompt": "Question for the child to interact with",
      "interactionOptions": ["Option 1", "Option 2", "Option 3", "Option 4"],
      "followUpText": "Brief explanation after interaction (1-2 sentences)",
      "mascotComment": "Encouraging comment from mascot"
    }
  ]
}

IMPORTANT:
- interactionType must be one of: "poll", "circle-one", "fill-blank", "rate-scale", "true-false"
- For "poll" and "circle-one": provide 3-4 options
- For "fill-blank": the prompt should have ___ where the child fills in
- For "rate-scale": prompt asks to rate something 1-5
- For "true-false": the prompt is a statement to agree/disagree with
- Vary the interaction types across lessons
- Keep text SHORT - focus on the interaction`;

  const response = await callClaude(apiKey, SYSTEM_PROMPT, prompt, TOKENS_LESSON_BATCH);
  const parsed = safeJsonParse<{ interactiveLessons: InteractiveLessonContent[] }>(response);
  
  const lessons = parsed?.interactiveLessons || [];
  
  let typeIndex = 0;
  while (lessons.length < count) {
    const type = interactionTypes[typeIndex % interactionTypes.length] as InteractiveLessonContent["interactionType"];
    lessons.push({
      heading: "Let's Think!",
      introText: "Sometimes our feelings can be tricky to understand. Let's explore together!",
      interactionType: type,
      interactionPrompt: type === "poll" ? "How do you usually feel when trying something new?" :
                         type === "fill-blank" ? "When I feel worried, I can ___" :
                         type === "rate-scale" ? "How much do you like talking about your feelings?" :
                         type === "true-false" ? "It's okay to feel scared sometimes" :
                         "What helps you feel calm?",
      interactionOptions: (type === "poll" || type === "circle-one") ? ["Excited", "Nervous", "Curious", "Unsure"] : undefined,
      followUpText: "Whatever you chose is perfectly okay!",
      mascotComment: `${metadata.characterName} says: Great thinking!`
    });
    typeIndex++;
  }
  
  return lessons.slice(0, count);
}

async function generateFillInStories(
  apiKey: string,
  metadata: ModuleMetadata,
  contentBrief: string,
  count: number
): Promise<FillInStoryContent[]> {
  const prompt = `Create ${count} fill-in-the-blank story activities for children about "${metadata.theme}".

Mascot: ${metadata.characterName} ${metadata.characterEmoji}

Respond with ONLY this JSON:
{
  "fillInStories": [
    {
      "heading": "Story activity title with book emoji",
      "instructions": "Instructions for completing the story (1 sentence)",
      "storyTemplate": "A short story with [BLANK1], [BLANK2], [BLANK3] placeholders where children fill in words",
      "blanks": [
        { "id": "BLANK1", "hint": "a feeling word", "category": "feeling" },
        { "id": "BLANK2", "hint": "something you can do", "category": "action" },
        { "id": "BLANK3", "hint": "a person who helps", "category": "person" }
      ],
      "reflection": "Question about their completed story"
    }
  ]
}`;

  const response = await callClaude(apiKey, SYSTEM_PROMPT, prompt, TOKENS_ACTIVITY);
  const parsed = safeJsonParse<{ fillInStories: FillInStoryContent[] }>(response);
  
  const stories = parsed?.fillInStories || [];
  while (stories.length < count) {
    stories.push({
      heading: "Complete My Story",
      instructions: "Fill in the blanks to create your own story!",
      storyTemplate: `One day, ${metadata.characterName} felt [BLANK1]. They decided to [BLANK2] to feel better. Then they talked to [BLANK3] about it, and everything felt a little easier.`,
      blanks: [
        { id: "BLANK1", hint: "a feeling word", category: "feeling" },
        { id: "BLANK2", hint: "something calming", category: "action" },
        { id: "BLANK3", hint: "someone who helps", category: "person" }
      ],
      reflection: "How would YOU feel in this story?"
    });
  }
  
  return stories.slice(0, count);
}

async function generateCopingCards(
  apiKey: string,
  metadata: ModuleMetadata,
  contentBrief: string,
  count: number
): Promise<CopingCardsContent[]> {
  const prompt = `Create ${count} coping cards builder activities for children about "${metadata.theme}".

Respond with ONLY this JSON:
{
  "copingCards": [
    {
      "heading": "Activity title with card emoji",
      "instructions": "Instructions for building coping cards (1-2 sentences)",
      "categories": [
        { "name": "Body Tools", "emoji": "muscle", "color": "#A8E6CF", "strategies": ["Deep breathing", "Stretching", "Running"] },
        { "name": "Mind Tools", "emoji": "brain", "color": "#a8d8ea", "strategies": ["Counting to 10", "Thinking happy thoughts"] },
        { "name": "Connect Tools", "emoji": "speech", "color": "#FFE8A3", "strategies": ["Talking to someone", "Asking for a hug"] }
      ],
      "personalCardPrompt": "Create your own special coping card below!"
    }
  ]
}`;

  const response = await callClaude(apiKey, SYSTEM_PROMPT, prompt, TOKENS_ACTIVITY);
  const parsed = safeJsonParse<{ copingCards: CopingCardsContent[] }>(response);
  
  const cards = parsed?.copingCards || [];
  while (cards.length < count) {
    cards.push({
      heading: "My Coping Cards",
      instructions: "Tap on strategies you want to remember, then create your own!",
      categories: [
        { name: "Body Tools", emoji: "muscle", color: "#A8E6CF", strategies: ["Deep breathing", "Stretching", "Running in place", "Squeezing a ball"] },
        { name: "Mind Tools", emoji: "brain", color: "#a8d8ea", strategies: ["Counting backwards", "Thinking of happy memories", "Saying kind words to myself"] },
        { name: "Connect Tools", emoji: "speech", color: "#FFE8A3", strategies: ["Talking to a grown-up", "Playing with a pet", "Writing in a journal"] }
      ],
      personalCardPrompt: "Now create YOUR special coping card!"
    });
  }
  
  return cards.slice(0, count);
}

async function generateGratitudeJars(
  apiKey: string,
  metadata: ModuleMetadata,
  contentBrief: string,
  count: number
): Promise<GratitudeJarContent[]> {
  const prompt = `Create ${count} gratitude jar activities for children about "${metadata.theme}".

Respond with ONLY this JSON:
{
  "gratitudeJars": [
    {
      "heading": "Activity title with jar/star emoji",
      "introText": "Brief explanation of gratitude (2 sentences)",
      "promptCategories": [
        { "category": "People", "emoji": "family", "prompt": "Someone who makes me smile..." },
        { "category": "Places", "emoji": "house", "prompt": "A place where I feel safe..." },
        { "category": "Things", "emoji": "gift", "prompt": "Something I'm glad I have..." },
        { "category": "Moments", "emoji": "sparkles", "prompt": "A happy memory..." }
      ],
      "encouragement": "Encouraging message about gratitude"
    }
  ]
}`;

  const response = await callClaude(apiKey, SYSTEM_PROMPT, prompt, TOKENS_ACTIVITY);
  const parsed = safeJsonParse<{ gratitudeJars: GratitudeJarContent[] }>(response);
  
  const jars = parsed?.gratitudeJars || [];
  while (jars.length < count) {
    jars.push({
      heading: "My Gratitude Jar",
      introText: "Gratitude means thinking about good things in our life. When we feel grateful, it can help us feel happier!",
      promptCategories: [
        { category: "People", emoji: "family", prompt: "Someone who makes me smile..." },
        { category: "Places", emoji: "house", prompt: "A place where I feel safe..." },
        { category: "Things", emoji: "gift", prompt: "Something I'm glad I have..." },
        { category: "Moments", emoji: "sparkles", prompt: "A happy memory..." }
      ],
      encouragement: "You can come back to your gratitude jar anytime you need a happiness boost!"
    });
  }
  
  return jars.slice(0, count);
}

async function generateSortingActivities(
  apiKey: string,
  metadata: ModuleMetadata,
  contentBrief: string,
  count: number
): Promise<SortingActivityContent[]> {
  const prompt = `Create ${count} sorting activities for children about "${metadata.theme}".

Respond with ONLY this JSON:
{
  "sortingActivities": [
    {
      "heading": "Activity title with sorting emoji",
      "instructions": "Instructions for sorting (1-2 sentences)",
      "categories": [
        { "name": "Helpful", "emoji": "checkmark", "color": "#A8E6CF" },
        { "name": "Not Helpful", "emoji": "x", "color": "#fecaca" }
      ],
      "items": [
        { "text": "Taking deep breaths", "correctCategory": "Helpful", "explanation": "Deep breaths help calm our body" },
        { "text": "Yelling at someone", "correctCategory": "Not Helpful", "explanation": "This can hurt others" }
      ]
    }
  ]
}`;

  const response = await callClaude(apiKey, SYSTEM_PROMPT, prompt, TOKENS_ACTIVITY);
  const parsed = safeJsonParse<{ sortingActivities: SortingActivityContent[] }>(response);
  
  const activities = parsed?.sortingActivities || [];
  while (activities.length < count) {
    activities.push({
      heading: "Sort It Out!",
      instructions: "Drag each item to the correct category!",
      categories: [
        { name: "Helpful", emoji: "checkmark", color: "#A8E6CF" },
        { name: "Not Helpful", emoji: "x", color: "#fecaca" }
      ],
      items: [
        { text: "Taking deep breaths", correctCategory: "Helpful", explanation: "Deep breaths help calm our body" },
        { text: "Hitting something", correctCategory: "Not Helpful", explanation: "This can hurt us or others" },
        { text: "Talking to someone you trust", correctCategory: "Helpful", explanation: "Sharing helps us feel understood" },
        { text: "Keeping it all inside", correctCategory: "Not Helpful", explanation: "Bottling up feelings can make them bigger" },
        { text: "Going for a walk", correctCategory: "Helpful", explanation: "Movement helps release big feelings" }
      ]
    });
  }
  
  return activities.slice(0, count);
}

async function generateThoughtBubbles(
  apiKey: string,
  metadata: ModuleMetadata,
  contentBrief: string,
  count: number
): Promise<ThoughtBubblesContent[]> {
  const prompt = `Create ${count} thought bubble challenge activities for children about "${metadata.theme}".

Respond with ONLY this JSON:
{
  "thoughtBubbles": [
    {
      "heading": "Activity title with thought bubble emoji",
      "scenario": "A relatable scenario (1-2 sentences)",
      "characterEmoji": "worried face",
      "unhelpfulThought": "An unhelpful thought the character might have",
      "helpfulPrompt": "Prompt to help child think of a better thought",
      "exampleHelpful": "Example of a helpful alternative thought",
      "reflection": "Question about their own thoughts"
    }
  ]
}`;

  const response = await callClaude(apiKey, SYSTEM_PROMPT, prompt, TOKENS_ACTIVITY);
  const parsed = safeJsonParse<{ thoughtBubbles: ThoughtBubblesContent[] }>(response);
  
  const bubbles = parsed?.thoughtBubbles || [];
  while (bubbles.length < count) {
    bubbles.push({
      heading: "Thought Bubble Challenge",
      scenario: "You made a mistake on your homework and feel embarrassed.",
      characterEmoji: "worried",
      unhelpfulThought: "I'm so stupid, I can't do anything right!",
      helpfulPrompt: "What's a kinder thought you could have instead?",
      exampleHelpful: "Everyone makes mistakes - that's how we learn!",
      reflection: "Think of a time when you had an unhelpful thought. What could you say instead?"
    });
  }
  
  return bubbles.slice(0, count);
}

async function generateEmojiCheckIns(
  apiKey: string,
  metadata: ModuleMetadata,
  contentBrief: string,
  count: number
): Promise<EmojiCheckInContent[]> {
  const prompt = `Create ${count} emoji check-in activities for children about "${metadata.theme}".

IMPORTANT: Use actual emoji characters, not text names!

Respond with ONLY this JSON:
{
  "emojiCheckIns": [
    {
      "heading": "🎭 Activity title with emoji",
      "instructions": "Instructions for the emoji check-in (1-2 sentences)",
      "timePoints": [
        { "label": "Morning", "emoji": "🌅" },
        { "label": "Afternoon", "emoji": "☀️" },
        { "label": "Evening", "emoji": "🌙" }
      ],
      "moodOptions": [
        { "emoji": "😊", "label": "Great", "color": "#A8E6CF" },
        { "emoji": "🙂", "label": "Good", "color": "#FFE8A3" },
        { "emoji": "😐", "label": "Okay", "color": "#e5e7eb" },
        { "emoji": "😕", "label": "Not great", "color": "#fecaca" },
        { "emoji": "😢", "label": "Sad", "color": "#a8d8ea" }
      ],
      "patternQuestion": "Question about patterns they notice"
    }
  ]
}`;

  const response = await callClaude(apiKey, SYSTEM_PROMPT, prompt, TOKENS_ACTIVITY);
  const parsed = safeJsonParse<{ emojiCheckIns: EmojiCheckInContent[] }>(response);
  
  const checkIns = parsed?.emojiCheckIns || [];
  while (checkIns.length < count) {
    checkIns.push({
      heading: "🎭 My Emoji Mood Tracker",
      instructions: "Pick an emoji for how you felt at each time today!",
      timePoints: [
        { label: "Morning", emoji: "🌅" },
        { label: "Afternoon", emoji: "☀️" },
        { label: "Evening", emoji: "🌙" }
      ],
      moodOptions: [
        { emoji: "😊", label: "Great", color: "#A8E6CF" },
        { emoji: "🙂", label: "Good", color: "#FFE8A3" },
        { emoji: "😐", label: "Okay", color: "#e5e7eb" },
        { emoji: "😕", label: "Not great", color: "#fecaca" },
        { emoji: "😢", label: "Sad", color: "#a8d8ea" }
      ],
      patternQuestion: "Do you notice any patterns in your moods throughout the day?"
    });
  }
  
  return checkIns.slice(0, count);
}

async function generateWordScrambles(
  apiKey: string,
  metadata: ModuleMetadata,
  contentBrief: string,
  count: number
): Promise<WordScrambleContent[]> {
  const prompt = `Create ${count} word scramble activities for children about "${metadata.theme}".

Respond with ONLY this JSON:
{
  "wordScrambles": [
    {
      "heading": "Activity title with puzzle emoji",
      "instructions": "Instructions for the word scramble (1 sentence)",
      "words": [
        { "scrambled": "MLCA", "answer": "CALM", "hint": "A peaceful feeling", "emoji": "peaceful" },
        { "scrambled": "RABEV", "answer": "BRAVE", "hint": "When you face fears", "emoji": "lion" }
      ],
      "completionMessage": "Message when all words are solved"
    }
  ]
}`;

  const response = await callClaude(apiKey, SYSTEM_PROMPT, prompt, TOKENS_ACTIVITY);
  const parsed = safeJsonParse<{ wordScrambles: WordScrambleContent[] }>(response);
  
  const scrambles = parsed?.wordScrambles || [];
  while (scrambles.length < count) {
    scrambles.push({
      heading: "Word Scramble Challenge",
      instructions: "Unscramble the letters to find feeling words!",
      words: [
        { scrambled: "MLCA", answer: "CALM", hint: "A peaceful feeling", emoji: "peaceful" },
        { scrambled: "RABEV", answer: "BRAVE", hint: "When you face your fears", emoji: "lion" },
        { scrambled: "PPYHA", answer: "HAPPY", hint: "A joyful feeling", emoji: "grin" },
        { scrambled: "EFSA", answer: "SAFE", hint: "When nothing can hurt you", emoji: "shield" }
      ],
      completionMessage: "Amazing! You're a word wizard!"
    });
  }
  
  return scrambles.slice(0, count);
}

async function generateAgreeDisagrees(
  apiKey: string,
  metadata: ModuleMetadata,
  contentBrief: string,
  count: number
): Promise<AgreeDisagreeContent[]> {
  const prompt = `Create ${count} agree/disagree activities for children about "${metadata.theme}".

Respond with ONLY this JSON:
{
  "agreeDisagrees": [
    {
      "heading": "Activity title with thinking emoji",
      "instructions": "Instructions (1 sentence)",
      "statements": [
        { "statement": "It's okay to feel angry sometimes", "insight": "Explanation of why this is true/helpful" },
        { "statement": "Big feelings will last forever", "insight": "Actually, all feelings come and go like clouds" }
      ],
      "reflection": "Final reflection question"
    }
  ]
}`;

  const response = await callClaude(apiKey, SYSTEM_PROMPT, prompt, TOKENS_ACTIVITY);
  const parsed = safeJsonParse<{ agreeDisagrees: AgreeDisagreeContent[] }>(response);
  
  const activities = parsed?.agreeDisagrees || [];
  while (activities.length < count) {
    activities.push({
      heading: "Do You Agree?",
      instructions: "Read each statement and decide if you agree or disagree!",
      statements: [
        { statement: "It's okay to cry when you're sad", insight: "Yes! Crying is a healthy way to release big feelings." },
        { statement: "You should hide your feelings from others", insight: "Actually, sharing feelings with trusted people helps us feel better!" },
        { statement: "Everyone feels scared sometimes", insight: "True! Fear is a normal feeling that everyone experiences." },
        { statement: "If you feel anxious, something is wrong with you", insight: "Not true! Anxiety is common and you can learn to manage it." }
      ],
      reflection: "Which statement surprised you the most?"
    });
  }
  
  return activities.slice(0, count);
}

async function generateComicStrips(
  apiKey: string,
  metadata: ModuleMetadata,
  contentBrief: string,
  count: number
): Promise<ComicStripContent[]> {
  const prompt = `Create ${count} comic strip activities for children about "${metadata.theme}".

Respond with ONLY this JSON:
{
  "comicStrips": [
    {
      "heading": "Activity title with comic emoji",
      "scenario": "A scenario for children to illustrate (1-2 sentences)",
      "panels": [
        { "panelNumber": 1, "prompt": "Draw: The beginning - what happened?", "placeholder": "Draw here..." },
        { "panelNumber": 2, "prompt": "Draw: The feeling - how did they feel?", "placeholder": "Show the emotion..." },
        { "panelNumber": 3, "prompt": "Draw: The solution - what helped?", "placeholder": "Draw the helpful action..." },
        { "panelNumber": 4, "prompt": "Draw: The ending - how did it turn out?", "placeholder": "Happy ending!" }
      ],
      "sharePrompt": "Prompt to share or reflect on their comic"
    }
  ]
}`;

  const response = await callClaude(apiKey, SYSTEM_PROMPT, prompt, TOKENS_ACTIVITY);
  const parsed = safeJsonParse<{ comicStrips: ComicStripContent[] }>(response);
  
  const comics = parsed?.comicStrips || [];
  while (comics.length < count) {
    comics.push({
      heading: "Create Your Comic!",
      scenario: "Create a comic about a time you felt a big feeling and found a way to feel better.",
      panels: [
        { panelNumber: 1, prompt: "What happened? (The situation)", placeholder: "Draw or write here..." },
        { panelNumber: 2, prompt: "How did you feel? (The big feeling)", placeholder: "Show the emotion..." },
        { panelNumber: 3, prompt: "What did you do? (Your coping tool)", placeholder: "Draw your strategy..." },
        { panelNumber: 4, prompt: "How did it end? (Feeling better!)", placeholder: "The happy ending!" }
      ],
      sharePrompt: "Would you like to share your comic with someone you trust?"
    });
  }
  
  return comics.slice(0, count);
}

async function generateAffirmationBuilders(
  apiKey: string,
  metadata: ModuleMetadata,
  contentBrief: string,
  count: number
): Promise<AffirmationBuilderContent[]> {
  const prompt = `Create ${count} affirmation builder activities for children about "${metadata.theme}".

Respond with ONLY this JSON:
{
  "affirmationBuilders": [
    {
      "heading": "Activity title with star/sparkle emoji",
      "instructions": "Instructions for building affirmations (1-2 sentences)",
      "starters": ["I am", "I can", "I choose to", "I believe"],
      "middles": ["brave and", "kind and", "learning to be", "getting better at being"],
      "endings": ["strong", "calm", "confident", "resilient"],
      "decorationEmojis": ["star", "sparkles", "rainbow", "heart"],
      "savePrompt": "Prompt to save/remember their affirmation"
    }
  ]
}`;

  const response = await callClaude(apiKey, SYSTEM_PROMPT, prompt, TOKENS_ACTIVITY);
  const parsed = safeJsonParse<{ affirmationBuilders: AffirmationBuilderContent[] }>(response);
  
  const builders = parsed?.affirmationBuilders || [];
  while (builders.length < count) {
    builders.push({
      heading: "Build Your Power Phrase!",
      instructions: "Pick one word from each row to create your own special affirmation!",
      starters: ["I am", "I can", "I choose to be", "I will be"],
      middles: ["brave and", "calm and", "kind and", "strong and"],
      endings: ["confident", "peaceful", "resilient", "happy"],
      decorationEmojis: ["star", "sparkles", "rainbow", "heart", "butterfly", "flower"],
      savePrompt: "Say your affirmation out loud 3 times! You can write it down and put it somewhere you'll see it every day."
    });
  }
  
  return builders.slice(0, count);
}

// ====================
// ORCHESTRATOR
// ====================

async function generateAllContent(
  apiKey: string,
  contentBrief: string,
  pageStructure: PageTemplate[],
  updateProgress: (step: string, message: string) => Promise<void>,
  seriesInfo?: SeriesInfo | null
): Promise<GeneratedContent> {
  
  // Count how many of each type we need
  const counts = {
    chapters: pageStructure.filter(p => p.type === "chapter-divider").length,
    lessons: pageStructure.filter(p => p.type === "lesson").length,
    interactiveLessons: pageStructure.filter(p => p.type === "interactive-lesson").length,
    checklists: pageStructure.filter(p => p.type === "checklist").length,
    reflections: pageStructure.filter(p => p.type === "reflection").length,
    quizzes: pageStructure.filter(p => p.type === "quiz").length,
    drawings: pageStructure.filter(p => p.type === "drawing").length,
    scenarios: pageStructure.filter(p => p.type === "scenario").length,
    feelingThermometers: pageStructure.filter(p => p.type === "feeling-thermometer").length,
    bodyMaps: pageStructure.filter(p => p.type === "body-map").length,
    feelingSelectors: pageStructure.filter(p => p.type === "feeling-selector").length,
    calmDenBuilders: pageStructure.filter(p => p.type === "calm-den-builder").length,
    actionPlans: pageStructure.filter(p => p.type === "action-plan").length,
    warningSigns: pageStructure.filter(p => p.type === "warning-signs").length,
    matchingActivities: pageStructure.filter(p => p.type === "matching-activity").length,
    // NEW COUNTS
    fillInStories: pageStructure.filter(p => p.type === "fill-in-story").length,
    copingCards: pageStructure.filter(p => p.type === "coping-cards").length,
    gratitudeJars: pageStructure.filter(p => p.type === "gratitude-jar").length,
    sortingActivities: pageStructure.filter(p => p.type === "sorting-activity").length,
    thoughtBubbles: pageStructure.filter(p => p.type === "thought-bubbles").length,
    emojiCheckIns: pageStructure.filter(p => p.type === "emoji-check-in").length,
    wordScrambles: pageStructure.filter(p => p.type === "word-scramble").length,
    agreeDisagrees: pageStructure.filter(p => p.type === "agree-disagree").length,
    comicStrips: pageStructure.filter(p => p.type === "comic-strip").length,
    affirmationBuilders: pageStructure.filter(p => p.type === "affirmation-builder").length,
  };
  
  await updateProgress("metadata", "Creating module theme and character...");
  const metadata = await generateMetadata(apiKey, contentBrief, seriesInfo);
  
  await updateProgress("structure", "Planning module structure...");
  const [chapters, welcome] = await Promise.all([
    generateChapterDividers(apiKey, metadata, contentBrief, counts.chapters),
    generateWelcome(apiKey, metadata, contentBrief),
  ]);
  
  await updateProgress("lessons", "Creating lesson content...");
  const [lessons, interactiveLessons] = await Promise.all([
    counts.lessons > 0 ? generateLessons(apiKey, metadata, contentBrief, counts.lessons) : Promise.resolve([]),
    counts.interactiveLessons > 0 ? generateInteractiveLessons(apiKey, metadata, contentBrief, counts.interactiveLessons) : Promise.resolve([]),
  ]);
  
  await updateProgress("activities", "Designing interactive activities...");
  const [checklists, reflections, quizzes, drawings, scenarios, breathing] = await Promise.all([
    counts.checklists > 0 ? generateChecklists(apiKey, metadata, contentBrief, counts.checklists) : Promise.resolve([]),
    counts.reflections > 0 ? generateReflections(apiKey, metadata, contentBrief, counts.reflections) : Promise.resolve([]),
    counts.quizzes > 0 ? generateQuizzes(apiKey, metadata, contentBrief, counts.quizzes) : Promise.resolve([]),
    counts.drawings > 0 ? generateDrawings(apiKey, metadata, contentBrief, counts.drawings) : Promise.resolve([]),
    counts.scenarios > 0 ? generateScenarios(apiKey, metadata, contentBrief, counts.scenarios) : Promise.resolve([]),
    generateBreathing(apiKey, metadata),
  ]);
  
  await updateProgress("interactive", "Creating interactive experiences...");
  const [feelingThermometers, bodyMaps, feelingSelectors, calmDenBuilders, actionPlans, warningSigns, matchingActivities] = await Promise.all([
    counts.feelingThermometers > 0 ? generateFeelingThermometers(apiKey, metadata, contentBrief, counts.feelingThermometers) : Promise.resolve([]),
    counts.bodyMaps > 0 ? generateBodyMaps(apiKey, metadata, contentBrief, counts.bodyMaps) : Promise.resolve([]),
    counts.feelingSelectors > 0 ? generateFeelingSelectors(apiKey, metadata, contentBrief, counts.feelingSelectors) : Promise.resolve([]),
    counts.calmDenBuilders > 0 ? generateCalmDenBuilders(apiKey, metadata, contentBrief, counts.calmDenBuilders) : Promise.resolve([]),
    counts.actionPlans > 0 ? generateActionPlans(apiKey, metadata, contentBrief, counts.actionPlans) : Promise.resolve([]),
    counts.warningSigns > 0 ? generateWarningSigns(apiKey, metadata, contentBrief, counts.warningSigns) : Promise.resolve([]),
    counts.matchingActivities > 0 ? generateMatchingActivities(apiKey, metadata, contentBrief, counts.matchingActivities) : Promise.resolve([]),
  ]);
  
  await updateProgress("creative", "Creating creative activities...");
  const [fillInStories, copingCards, gratitudeJars, comicStrips, affirmationBuilders] = await Promise.all([
    counts.fillInStories > 0 ? generateFillInStories(apiKey, metadata, contentBrief, counts.fillInStories) : Promise.resolve([]),
    counts.copingCards > 0 ? generateCopingCards(apiKey, metadata, contentBrief, counts.copingCards) : Promise.resolve([]),
    counts.gratitudeJars > 0 ? generateGratitudeJars(apiKey, metadata, contentBrief, counts.gratitudeJars) : Promise.resolve([]),
    counts.comicStrips > 0 ? generateComicStrips(apiKey, metadata, contentBrief, counts.comicStrips) : Promise.resolve([]),
    counts.affirmationBuilders > 0 ? generateAffirmationBuilders(apiKey, metadata, contentBrief, counts.affirmationBuilders) : Promise.resolve([]),
  ]);
  
  await updateProgress("cognitive", "Creating cognitive activities...");
  const [sortingActivities, thoughtBubbles, emojiCheckIns, wordScrambles, agreeDisagrees] = await Promise.all([
    counts.sortingActivities > 0 ? generateSortingActivities(apiKey, metadata, contentBrief, counts.sortingActivities) : Promise.resolve([]),
    counts.thoughtBubbles > 0 ? generateThoughtBubbles(apiKey, metadata, contentBrief, counts.thoughtBubbles) : Promise.resolve([]),
    counts.emojiCheckIns > 0 ? generateEmojiCheckIns(apiKey, metadata, contentBrief, counts.emojiCheckIns) : Promise.resolve([]),
    counts.wordScrambles > 0 ? generateWordScrambles(apiKey, metadata, contentBrief, counts.wordScrambles) : Promise.resolve([]),
    counts.agreeDisagrees > 0 ? generateAgreeDisagrees(apiKey, metadata, contentBrief, counts.agreeDisagrees) : Promise.resolve([]),
  ]);
  
  await updateProgress("summary", "Wrapping up...");
  const [summary, completion] = await Promise.all([
    generateSummary(apiKey, metadata, contentBrief),
    generateCompletion(apiKey, metadata),
  ]);
  
  return {
    metadata,
    welcome,
    chapters,
    lessons,
    interactiveLessons,
    checklists,
    reflections,
    quizzes,
    drawings,
    breathing,
    scenarios,
    feelingThermometers,
    bodyMaps,
    feelingSelectors,
    calmDenBuilders,
    actionPlans,
    warningSigns,
    matchingActivities,
    // NEW
    fillInStories,
    copingCards,
    gratitudeJars,
    sortingActivities,
    thoughtBubbles,
    emojiCheckIns,
    wordScrambles,
    agreeDisagrees,
    comicStrips,
    affirmationBuilders,
    summary,
    completion,
  };
}

// ====================
// HTML RENDERER

function renderHtml(content: GeneratedContent, pageStructure: PageTemplate[], moduleCode: string): string {
  const { metadata } = content;
  
  // Track indices for each content type
  const indices = {
    lesson: 0,
    chapter: 0,
    checklist: 0,
    reflection: 0,
    quiz: 0,
    drawing: 0,
    scenario: 0,
    feelingThermometer: 0,
    bodyMap: 0,
    feelingSelector: 0,
    calmDenBuilder: 0,
    actionPlan: 0,
    warningSigns: 0,
    matchingActivity: 0,
    // NEW
    interactiveLesson: 0,
    fillInStory: 0,
    copingCards: 0,
    gratitudeJar: 0,
    sortingActivity: 0,
    thoughtBubbles: 0,
    emojiCheckIn: 0,
    wordScramble: 0,
    agreeDisagree: 0,
    comicStrip: 0,
    affirmationBuilder: 0,
    star: 0,
  };
  
  // Build page functions - using function body strings, not template literals
  const pageFunctions: string[] = [];
  
  for (let pageIndex = 0; pageIndex < pageStructure.length; pageIndex++) {
    const template = pageStructure[pageIndex];
    let pageHtml = "";
    
    switch (template.type) {
      case "cover":
        pageHtml = renderCoverPage(content);
        break;
      case "welcome":
        pageHtml = renderWelcomePage(content);
        break;
      case "chapter-divider":
        pageHtml = renderChapterDivider(content.chapters[indices.chapter] || content.chapters[0]);
        indices.chapter++;
        break;
      case "lesson":
        pageHtml = renderLessonPage(content.lessons[indices.lesson] || content.lessons[0], metadata);
        indices.lesson++;
        break;
      case "checklist":
        pageHtml = renderChecklistPage(content.checklists[indices.checklist] || content.checklists[0], indices.star);
        indices.checklist++;
        indices.star++;
        break;
      case "reflection":
        pageHtml = renderReflectionPage(content.reflections[indices.reflection] || content.reflections[0], indices.star);
        indices.reflection++;
        indices.star++;
        break;
      case "quiz":
        pageHtml = renderQuizPage(content.quizzes[indices.quiz] || content.quizzes[0], indices.star);
        indices.quiz++;
        indices.star++;
        break;
      case "drawing":
        pageHtml = renderDrawingPage(content.drawings[indices.drawing] || content.drawings[0], indices.star);
        indices.drawing++;
        indices.star++;
        break;
      case "breathing":
        pageHtml = renderBreathingPage(content.breathing, indices.star);
        indices.star++;
        break;
      case "scenario":
        pageHtml = renderScenarioPage(content.scenarios[indices.scenario] || content.scenarios[0], indices.star);
        indices.scenario++;
        indices.star++;
        break;
      case "feeling-thermometer":
        pageHtml = renderFeelingThermometerPage(content.feelingThermometers[indices.feelingThermometer] || content.feelingThermometers[0], indices.star);
        indices.feelingThermometer++;
        indices.star++;
        break;
      case "body-map":
        pageHtml = renderBodyMapPage(content.bodyMaps[indices.bodyMap] || content.bodyMaps[0], indices.star);
        indices.bodyMap++;
        indices.star++;
        break;
      case "feeling-selector":
        pageHtml = renderFeelingSelectorPage(content.feelingSelectors[indices.feelingSelector] || content.feelingSelectors[0], indices.star);
        indices.feelingSelector++;
        indices.star++;
        break;
      case "calm-den-builder":
        pageHtml = renderCalmDenBuilderPage(content.calmDenBuilders[indices.calmDenBuilder] || content.calmDenBuilders[0], indices.star, metadata);
        indices.calmDenBuilder++;
        indices.star++;
        break;
      case "action-plan":
        pageHtml = renderActionPlanPage(content.actionPlans[indices.actionPlan] || content.actionPlans[0], indices.star);
        indices.actionPlan++;
        indices.star++;
        break;
      case "warning-signs":
        pageHtml = renderWarningSignsPage(content.warningSigns[indices.warningSigns] || content.warningSigns[0], indices.star);
        indices.warningSigns++;
        indices.star++;
        break;
      case "matching-activity":
        pageHtml = renderMatchingActivityPage(content.matchingActivities[indices.matchingActivity] || content.matchingActivities[0], indices.star);
        indices.matchingActivity++;
        indices.star++;
        break;
      // NEW PAGE TYPES
      case "interactive-lesson":
        pageHtml = renderInteractiveLessonPage(content.interactiveLessons[indices.interactiveLesson] || content.interactiveLessons[0], metadata, indices.star);
        indices.interactiveLesson++;
        indices.star++;
        break;
      case "fill-in-story":
        pageHtml = renderFillInStoryPage(content.fillInStories[indices.fillInStory] || content.fillInStories[0], indices.star, metadata);
        indices.fillInStory++;
        indices.star++;
        break;
      case "coping-cards":
        pageHtml = renderCopingCardsPage(content.copingCards[indices.copingCards] || content.copingCards[0], indices.star);
        indices.copingCards++;
        indices.star++;
        break;
      case "gratitude-jar":
        pageHtml = renderGratitudeJarPage(content.gratitudeJars[indices.gratitudeJar] || content.gratitudeJars[0], indices.star);
        indices.gratitudeJar++;
        indices.star++;
        break;
      case "sorting-activity":
        pageHtml = renderSortingActivityPage(content.sortingActivities[indices.sortingActivity] || content.sortingActivities[0], indices.star);
        indices.sortingActivity++;
        indices.star++;
        break;
      case "thought-bubbles":
        pageHtml = renderThoughtBubblesPage(content.thoughtBubbles[indices.thoughtBubbles] || content.thoughtBubbles[0], indices.star);
        indices.thoughtBubbles++;
        indices.star++;
        break;
      case "emoji-check-in":
        pageHtml = renderEmojiCheckInPage(content.emojiCheckIns[indices.emojiCheckIn] || content.emojiCheckIns[0], indices.star);
        indices.emojiCheckIn++;
        indices.star++;
        break;
      case "word-scramble":
        pageHtml = renderWordScramblePage(content.wordScrambles[indices.wordScramble] || content.wordScrambles[0], indices.star);
        indices.wordScramble++;
        indices.star++;
        break;
      case "agree-disagree":
        pageHtml = renderAgreeDisagreePage(content.agreeDisagrees[indices.agreeDisagree] || content.agreeDisagrees[0], indices.star);
        indices.agreeDisagree++;
        indices.star++;
        break;
      case "comic-strip":
        pageHtml = renderComicStripPage(content.comicStrips[indices.comicStrip] || content.comicStrips[0], indices.star);
        indices.comicStrip++;
        indices.star++;
        break;
      case "affirmation-builder":
        pageHtml = renderAffirmationBuilderPage(content.affirmationBuilders[indices.affirmationBuilder] || content.affirmationBuilders[0], indices.star);
        indices.affirmationBuilder++;
        indices.star++;
        break;
      case "summary":
        pageHtml = renderSummaryPage(content.summary, metadata);
        break;
      case "completion":
        pageHtml = renderCompletionPage(content.completion, metadata);
        break;
    }
    
    // Escape backticks in the HTML content but preserve ${} for runtime evaluation
    const escapedHtml = pageHtml
      .replace(/\\/g, '\\\\')
      .replace(/`/g, '\\`');
    
    pageFunctions.push(`function generatePage${pageIndex}() {
  return \`${escapedHtml}\`;
}`);
  }
  
  const totalStars = indices.star;
  const totalPages = pageStructure.length;
  
  // Debug info for series
  const debugInfo = `
  Series Info Debug:
  - characterName: ${metadata.characterName}
  - characterEmoji: ${metadata.characterEmoji}
  - characterType: ${metadata.characterType || 'not set'}
  - series: ${metadata.series}
  `;
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(metadata.title)}</title>
  <!-- DEBUG: ${escapeHtml(debugInfo)} -->
  
  <!-- Google Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Fredoka+One&display=swap" rel="stylesheet">
  <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  
  <!-- Tailwind CSS -->
  <script src="https://cdn.tailwindcss.com"></script>
  
  <!-- Module Stylesheets -->
  <link rel="stylesheet" href="./modules/shared/module-theme.css">
  <link rel="stylesheet" href="./modules/shared/module-header.css">
  <link rel="stylesheet" href="./modules/shared/module-base.css">
  
  <style>
    /* Brand Colors */
    :root {
      --primary: #F4A261;
      --secondary: #2A9D8F;
      --accent: #E76F51;
      --dark: #264653;
      --cream: #FFF8F0;
      --light-green: #A8E6CF;
      --soft-yellow: #FFE8A3;
    }
    
    /* Typography */
    .font-title { font-family: 'Fredoka One', cursive; }
    .font-body { font-family: 'Nunito', sans-serif; }
    body { font-family: 'Nunito', sans-serif; background: var(--cream); }
    h1, h2, h3, h4, h5, h6 { font-family: 'Fredoka One', cursive; }
    
    /* Page Layout */
    .page { min-height: 100vh; padding-top: 80px; padding-bottom: 100px; }
    
    /* Animations */
    @keyframes bounce-slow {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-10px); }
    }
    .animate-bounce-slow { animation: bounce-slow 2s ease-in-out infinite; }
    
    @keyframes pulse-glow {
      0%, 100% { box-shadow: 0 0 20px rgba(244, 162, 97, 0.3); }
      50% { box-shadow: 0 0 35px rgba(244, 162, 97, 0.6); }
    }
    .animate-glow { animation: pulse-glow 3s ease-in-out infinite; }
    
    /* Form Elements */
    input[type="range"] {
      -webkit-appearance: none;
      width: 100%;
      height: 30px;
      border-radius: 15px;
      background: linear-gradient(to right, var(--secondary), var(--soft-yellow), var(--primary), var(--accent));
    }
    input[type="range"]::-webkit-slider-thumb {
      -webkit-appearance: none;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: white;
      border: 4px solid var(--dark);
      cursor: pointer;
      box-shadow: 0 4px 10px rgba(0,0,0,0.2);
    }
    
    /* Quiz Styles */
    .quiz-answer.selected.correct { background-color: var(--light-green) !important; border-color: var(--secondary) !important; }
    .quiz-answer.selected.incorrect { background-color: #fecaca !important; border-color: var(--accent) !important; }
    
    /* Scenario Styles */
    .scenario-option.selected.good { background-color: var(--light-green) !important; }
    .scenario-option.selected.not-good { background-color: #fef3c7 !important; }
    
    /* Print Styles */
    @media print {
      .no-print { display: none !important; }
      .page { page-break-after: always; min-height: 100vh; }
    }
  </style>
</head>
<body class="module-theme" data-series="${escapeHtml(metadata.series || "custom")}">
  <div id="moduleHeaderRoot"></div>
  
  <main class="module-content">
    <section id="pageContainer"></section>
  </main>
  
  <script type="module">
    // Use CDN paths for production
    import { initModuleHeader } from 'https://cdn.jsdelivr.net/gh/supabase/supabase@master/examples/edge-functions/supabase/functions/_shared/module-header.js';
    import {
      initializeModule,
      loadStarsFromDB,
      saveStarsToDB,
      awardSingleStar,
      resolveChildDisplayName,
      getChildId,
      completeModuleDB
    } from 'https://cdn.jsdelivr.net/gh/supabase/supabase@master/examples/edge-functions/supabase/functions/_shared/module-db.js';
    
    const WORKBOOK_ID = "${escapeHtml(moduleCode)}";
    const MODULE_CODE = "${escapeHtml(moduleCode)}";
    const MAX_STARS = ${totalStars};
    const TOTAL_PAGES = ${totalPages};
    
    let currentPage = 0;
    let totalStars = 0;
    let completedActivities = {};
    let formData = {};
    let header;
    let childDisplayName = 'Friend';
    
    // Load saved data
    function loadProgress() {
      const saved = localStorage.getItem('cbtProgress_' + WORKBOOK_ID);
      if (saved) {
        try { completedActivities = JSON.parse(saved); } catch (e) {}
      }
    }
    
    function saveProgress() {
      localStorage.setItem('cbtProgress_' + WORKBOOK_ID, JSON.stringify(completedActivities));
    }
    
    function loadFormData() {
      const saved = localStorage.getItem('cbtData_' + WORKBOOK_ID);
      if (saved) {
        try { formData = JSON.parse(saved); } catch (e) {}
      }
    }
    
    function saveFormData(key, value) {
      formData[key] = value;
      localStorage.setItem('cbtData_' + WORKBOOK_ID, JSON.stringify(formData));
    }
    
    // Child name helper - this is called from page templates
    function getChildName() {
      return childDisplayName || formData.userName || 'Friend';
    }
    
    // Page generators
    ${pageFunctions.join('\n\n    ')}
    
    const pages = [${Array.from({ length: totalPages }, (_, i) => `generatePage${i}`).join(', ')}];
    
    // Navigation
    function nextPage() {
      if (currentPage < pages.length - 1) {
        currentPage++;
        renderPage();
      }
    }
    
    function prevPage() {
      if (currentPage > 0) {
        currentPage--;
        renderPage();
      }
    }
    
    function jumpToPage(pageNum) {
      if (pageNum >= 0 && pageNum < pages.length) {
        currentPage = pageNum;
        renderPage();
      }
    }
    
    function renderPage() {
      const container = document.getElementById('pageContainer');
      if (!container) return;
      container.innerHTML = pages[currentPage]();
      
      if (header && typeof header.updatePage === 'function') {
        header.updatePage(currentPage + 1, pages.length, {
          canPrev: currentPage > 0,
          canNext: currentPage < pages.length - 1
        });
      }
      
      window.scrollTo({ top: 0, behavior: 'smooth' });
      bindPageInteractions();
      restoreFormState();
    }
    
    // Restore form values from localStorage
    function restoreFormState() {
      // Restore all text inputs
      document.querySelectorAll('input[type="text"]').forEach(input => {
        const onchange = input.getAttribute('onchange') || '';
        const match = onchange.match(/saveFormData\\(['"]([^'"]+)['"]/);
        if (match && formData[match[1]]) {
          input.value = formData[match[1]];
        }
      });
      
      // Restore all textareas
      document.querySelectorAll('textarea').forEach(textarea => {
        const onchange = textarea.getAttribute('onchange') || '';
        const match = onchange.match(/saveFormData\\(['"]([^'"]+)['"]/);
        if (match && formData[match[1]]) {
          textarea.value = formData[match[1]];
        }
      });
      
      // Restore range sliders
      document.querySelectorAll('input[type="range"]').forEach(range => {
        const oninput = range.getAttribute('oninput') || '';
        const match = oninput.match(/saveFormData\\(['"]([^'"]+)['"]/);
        if (match && formData[match[1]]) {
          range.value = formData[match[1]];
          const valueDisplay = range.parentElement.querySelector('.thermometer-value');
          if (valueDisplay) valueDisplay.textContent = formData[match[1]];
        }
      });
      
      // Restore button selections (poll, rate-scale, true-false)
      Object.keys(formData).forEach(key => {
        if (key.startsWith('poll_') || key.startsWith('rate_')) {
          const buttons = document.querySelectorAll('.interactive-option');
          buttons.forEach(btn => {
            if (btn.textContent.trim() === formData[key] || btn.textContent.trim() === String(formData[key])) {
              btn.style.backgroundColor = 'var(--light-green)';
            }
          });
        }
        if (key.startsWith('tf_')) {
          const page = document.querySelector('[data-page="interactive-lesson"]');
          if (page) {
            const ff = page.querySelector('.followup-feedback');
            const mf = page.querySelector('.mascot-feedback');
            if (ff) ff.style.display = 'block';
            if (mf) mf.style.display = 'flex';
            const btns = page.querySelectorAll('.interactive-option');
            if (formData[key] === 'agree' && btns[0]) btns[0].style.backgroundColor = 'var(--light-green)';
            if (formData[key] === 'disagree' && btns[1]) btns[1].style.backgroundColor = '#fecaca';
          }
        }
      });
    }
    
    // Stars
    async function loadStarData() {
      try {
        totalStars = await loadStarsFromDB();
      } catch (e) {
        totalStars = 0;
      }
      if (header) header.updateStars(totalStars);
    }
    
    async function saveStarData() {
      try {
        await saveStarsToDB(totalStars);
      } catch (e) {
        console.error('Failed to save stars:', e);
      }
      if (header) header.updateStars(totalStars);
    }
    
    async function markActivityComplete(activityId) {
      if (completedActivities[activityId]) return;
      
      completedActivities[activityId] = true;
      try {
        totalStars = await awardSingleStar(totalStars);
      } catch (e) {
        totalStars++;
      }
      await saveStarData();
      saveProgress();
      
      // Star celebration animation
      const star = document.createElement('div');
      star.textContent = '⭐';
      star.style.cssText = 'position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);font-size:4rem;z-index:9999;pointer-events:none;';
      document.body.appendChild(star);
      star.animate([
        { transform: 'translate(-50%,-50%) scale(0.5)', opacity: 1 },
        { transform: 'translate(-50%,-150%) scale(2)', opacity: 0 }
      ], { duration: 1200, easing: 'ease-out' }).onfinish = () => star.remove();
      
      renderPage();
    }
    
    function bindPageInteractions() {
      // Quiz answers
      document.querySelectorAll('.quiz-answer').forEach(btn => {
        btn.addEventListener('click', function() {
          const isCorrect = this.dataset.correct === 'true';
          const feedback = this.dataset.feedback;
          document.querySelectorAll('.quiz-answer').forEach(b => b.classList.remove('selected', 'correct', 'incorrect'));
          this.classList.add('selected', isCorrect ? 'correct' : 'incorrect');
          
          const feedbackEl = document.querySelector('.quiz-feedback');
          if (feedbackEl) {
            feedbackEl.textContent = feedback;
            feedbackEl.style.display = 'block';
          }
          
          const completeBox = document.querySelector('[data-activity^="quiz"]');
          if (completeBox && isCorrect) {
            completeBox.disabled = false;
          }
        });
      });
      
      // Scenario options
      document.querySelectorAll('.scenario-option').forEach(btn => {
        btn.addEventListener('click', function() {
          const isGood = this.dataset.good === 'true';
          const feedback = this.dataset.feedback;
          document.querySelectorAll('.scenario-option').forEach(b => b.classList.remove('selected', 'good', 'not-good'));
          this.classList.add('selected', isGood ? 'good' : 'not-good');
          
          const feedbackEl = document.querySelector('.scenario-feedback');
          if (feedbackEl) {
            feedbackEl.textContent = feedback;
            feedbackEl.style.display = 'block';
          }
          
          const completeBox = document.querySelector('[data-activity^="scenario"]');
          if (completeBox) {
            completeBox.disabled = false;
          }
        });
      });
      
      // Checklists
      const checklistItems = document.querySelectorAll('.checklist-item');
      const checklistComplete = document.querySelector('[data-activity^="checklist"]');
      if (checklistComplete && checklistItems.length) {
        const updateChecklist = () => {
          const allChecked = Array.from(checklistItems).every(item => item.checked);
          checklistComplete.disabled = !allChecked;
        };
        checklistItems.forEach(item => item.addEventListener('change', updateChecklist));
        updateChecklist();
      }
      
      // Reflection
      const reflectionInput = document.querySelector('.reflection-input');
      const reflectionComplete = document.querySelector('[data-activity^="reflection"]');
      if (reflectionComplete && reflectionInput) {
        const updateReflection = () => {
          reflectionComplete.disabled = reflectionInput.value.trim().length < 20;
        };
        reflectionInput.addEventListener('input', updateReflection);
        updateReflection();
      }
      
      // Drawing canvas
      const canvas = document.querySelector('.drawing-canvas');
      if (canvas) initDrawingCanvas(canvas);
      
      // Comic strip canvases
      document.querySelectorAll('.comic-drawing-canvas').forEach(canvas => {
        initDrawingCanvas(canvas);
      });
    }
    
    function initDrawingCanvas(canvas) {
      const ctx = canvas.getContext('2d');
      let drawing = false;
      let currentColor = '#264653';
      
      const getPos = (e) => {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const touch = e.touches?.[0];
        return {
          x: ((touch?.clientX || e.clientX) - rect.left) * scaleX,
          y: ((touch?.clientY || e.clientY) - rect.top) * scaleY
        };
      };
      
      const start = (e) => {
        drawing = true;
        const p = getPos(e);
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
      };
      
      const move = (e) => {
        if (!drawing) return;
        e.preventDefault();
        const p = getPos(e);
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.strokeStyle = currentColor;
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
      };
      
      const end = () => { drawing = false; };
      
      canvas.addEventListener('mousedown', start);
      canvas.addEventListener('mousemove', move);
      canvas.addEventListener('mouseup', end);
      canvas.addEventListener('mouseleave', end);
      canvas.addEventListener('touchstart', start, { passive: false });
      canvas.addEventListener('touchmove', move, { passive: false });
      canvas.addEventListener('touchend', end);
      
      // Color buttons
      document.querySelectorAll('.color-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          currentColor = btn.dataset.color;
        });
      });
      
      // Clear button
      const clearBtn = document.querySelector('.clear-canvas-btn');
      if (clearBtn) {
        clearBtn.addEventListener('click', () => {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        });
      }
    }
    
    async function completeModule() {
      try {
        await completeModuleDB(WORKBOOK_ID);
        const urlParams = new URLSearchParams(window.location.search);
        const childId = urlParams.get('childId');
        window.location.href = childId ? '/dashboard.html?childId=' + childId : '/dashboard.html';
      } catch (e) {
        console.error('Error completing module:', e);
        alert('Error completing module. Please try again.');
      }
    }
    
    function goHome() {
      saveStarData().then(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const childId = urlParams.get('childId');
        window.location.href = childId ? '/dashboard.html?childId=' + childId : '/dashboard.html';
      }).catch(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const childId = urlParams.get('childId');
        window.location.href = childId ? '/dashboard.html?childId=' + childId : '/dashboard.html';
      });
    }
    
    // Initialize
    document.addEventListener('DOMContentLoaded', async () => {
      loadProgress();
      loadFormData();
      
      try {
        await initializeModule(WORKBOOK_ID);
        const childId = getChildId();
        childDisplayName = await resolveChildDisplayName(childId) || 'Friend';
      } catch (e) {
        console.warn('Module DB init failed, using local storage only:', e);
        childDisplayName = formData.userName || 'Friend';
      }
      
      try {
        header = initModuleHeader({
          title: "${escapeForTemplate(metadata.title)}",
          childName: childDisplayName,
          onNext: nextPage,
          onPrev: prevPage,
          onGoToPage: jumpToPage,
          onShowStars: () => {},
          onPrint: () => window.print(),
          initialPage: { current: 1, total: pages.length }
        });
        await loadStarData();
      } catch (e) {
        console.warn('Header init failed:', e);
      }
      
      renderPage();
    });
    
    // Global exports for onclick handlers
    window.nextPage = nextPage;
    window.prevPage = prevPage;
    window.jumpToPage = jumpToPage;
    window.saveFormData = saveFormData;
    window.markActivityComplete = markActivityComplete;
    window.goHome = goHome;
    window.completeModule = completeModule;
    window.getChildName = getChildName;
    window.updateAffirmation = function() { const s = document.querySelector('.starter[style*="border-color: var(--dark)"]'), m = document.querySelector('.middle[style*="border-color: var(--dark)"]'), e = document.querySelector('.ending[style*="border-color: var(--dark)"]'), d = document.querySelector('.affirmation-display'); if (d) { const p = [s,m,e].filter(Boolean).map(x => x.textContent.trim()); d.textContent = p.length ? p.join(' ') : 'Tap the words above!'; } };
    
    // Sorting activity functions
    let selectedSortItem = null;
    window.selectSortItem = function(item) {
      // Deselect previous
      document.querySelectorAll('.sort-item.selected').forEach(el => {
        el.classList.remove('selected');
        el.style.backgroundColor = 'white';
        el.style.borderColor = 'var(--primary)';
      });
      // Select this one
      item.classList.add('selected');
      item.style.backgroundColor = 'var(--soft-yellow)';
      item.style.borderColor = 'var(--dark)';
      selectedSortItem = item;
    };
    
    window.sortSelectedItem = function(category, categoryName, starIndex) {
      if (!selectedSortItem) return;
      
      const droppedArea = category.querySelector('.dropped-items');
      const itemText = selectedSortItem.textContent.trim();
      const correctCategory = selectedSortItem.dataset.correctCategory;
      const explanation = selectedSortItem.dataset.explanation;
      const isCorrect = correctCategory === categoryName;
      
      // Create sorted item display
      const sortedItem = document.createElement('div');
      sortedItem.className = 'p-2 rounded-lg font-body text-sm mb-1';
      sortedItem.style.backgroundColor = isCorrect ? 'white' : '#fecaca';
      sortedItem.style.border = isCorrect ? '2px solid var(--secondary)' : '2px solid var(--accent)';
      sortedItem.innerHTML = (isCorrect ? '✓ ' : '✗ ') + itemText;
      sortedItem.title = explanation;
      droppedArea.appendChild(sortedItem);
      
      // Remove from items list
      selectedSortItem.remove();
      selectedSortItem = null;
      
      // Save to form data
      saveFormData('sort_' + starIndex + '_' + itemText.substring(0,20), categoryName);
    };
  </script>
</body>
</html>`;
}

// ====================
// PAGE RENDERERS
// ====================

function renderCoverPage(content: GeneratedContent): string {
  const { metadata } = content;
  return `
    <div class="page min-h-screen flex items-center justify-center p-8" style="background: linear-gradient(to bottom right, var(--soft-yellow), var(--cream));" data-page="cover">
      <div class="text-center max-w-4xl">
        <div class="mb-6 animate-bounce-slow text-8xl">${escapeForTemplate(metadata.characterEmoji)}</div>
        <h1 class="text-5xl md:text-6xl mb-4 font-title" style="color: var(--dark);">${escapeForTemplate(metadata.title)}</h1>
        <h2 class="text-2xl md:text-3xl mb-8 font-title" style="color: var(--primary);">${escapeForTemplate(metadata.subtitle)}</h2>
        <div class="text-xl mb-8 font-body" style="color: var(--secondary);">
          <p class="mb-2">An Interactive Adventure for Ages ${escapeForTemplate(metadata.targetAge)}</p>
          <p class="italic">Learn with ${escapeForTemplate(metadata.characterName)}! ${escapeForTemplate(metadata.characterEmoji)}</p>
        </div>
        <div class="border-4 rounded-3xl p-6 inline-block animate-glow" style="border-color: var(--primary); background-color: white;">
          <p class="font-semibold mb-2 font-body text-lg" style="color: var(--dark);">This adventure belongs to:</p>
          <div class="text-3xl font-title" style="color: var(--primary);">
            \${getChildName()}
          </div>
        </div>
        <div class="mt-8">
          <p class="text-lg font-body" style="color: var(--secondary);">⭐ Earn stars by completing activities! ⭐</p>
        </div>
      </div>
    </div>`;
}

function renderWelcomePage(content: GeneratedContent): string {
  const { metadata, welcome } = content;
  return `
    <div class="page min-h-screen p-8" style="background-color: var(--cream);" data-page="welcome">
      <div class="max-w-4xl mx-auto">
        <div class="flex items-center gap-4 mb-6">
          <span class="text-6xl">${escapeForTemplate(metadata.characterEmoji)}</span>
          <h1 class="text-4xl md:text-5xl font-title" style="color: var(--dark);">${escapeForTemplate(welcome.heading)}</h1>
        </div>
        
        <div class="rounded-3xl shadow-xl p-8 mb-8" style="background-color: white; border-left: 6px solid var(--primary);">
          ${welcome.paragraphs.map(p => `<p class="text-lg mb-4 leading-relaxed font-body" style="color: var(--dark);">${escapeForTemplate(p)}</p>`).join("")}
        </div>
        
        <div class="rounded-xl p-6 text-center flex items-center justify-center gap-3" style="background-color: var(--soft-yellow);">
          <span class="text-4xl">${escapeForTemplate(metadata.characterEmoji)}</span>
          <p class="text-xl font-semibold font-body" style="color: var(--dark);">
            "All feelings are okay—even the big ones!" 💛
          </p>
        </div>
      </div>
    </div>`;
}

function renderChapterDivider(chapter: ChapterDivider): string {
  return `
    <div class="page min-h-screen flex items-center justify-center p-8" style="background: linear-gradient(to bottom right, var(--primary), var(--accent));" data-page="chapter">
      <div class="text-center">
        <div class="text-8xl mb-6 animate-bounce-slow">📖</div>
        <h1 class="text-5xl md:text-6xl text-white mb-4 font-title">Chapter ${chapter.chapterNumber}</h1>
        <h2 class="text-3xl md:text-4xl text-white mb-8 font-title">${escapeForTemplate(chapter.chapterTitle)}</h2>
        <p class="text-xl md:text-2xl text-white/90 max-w-2xl mx-auto font-body">
          ${escapeForTemplate(chapter.chapterSubtitle)}
        </p>
      </div>
    </div>`;
}

function renderLessonPage(lesson: LessonContent, metadata: ModuleMetadata): string {
  const calloutHtml = lesson.calloutTitle && lesson.calloutText ? `
    <div class="rounded-2xl p-6 mb-6" style="background-color: var(--soft-yellow);">
      <h3 class="text-xl font-title mb-2" style="color: var(--dark);">💡 ${escapeForTemplate(lesson.calloutTitle)}</h3>
      <p class="font-body" style="color: var(--dark);">${escapeForTemplate(lesson.calloutText)}</p>
    </div>` : "";
    
  const tipHtml = lesson.tipText ? `
    <div class="rounded-xl p-4 flex items-center gap-3" style="background-color: var(--light-green);">
      <span class="text-3xl">${escapeForTemplate(metadata.characterEmoji)}</span>
      <p class="font-body font-semibold" style="color: var(--dark);">${escapeForTemplate(lesson.tipText)}</p>
    </div>` : "";

  return `
    <div class="page min-h-screen p-8" style="background-color: var(--cream);" data-page="lesson">
      <div class="max-w-4xl mx-auto">
        <h1 class="text-3xl md:text-4xl mb-6 font-title" style="color: var(--dark);">${escapeForTemplate(lesson.heading)}</h1>
        
        <div class="rounded-3xl shadow-xl p-8 mb-6" style="background-color: white;">
          ${lesson.paragraphs.map(p => `<p class="text-lg mb-4 leading-relaxed font-body" style="color: var(--dark);">${escapeForTemplate(p)}</p>`).join("")}
        </div>
        
        ${calloutHtml}
        ${tipHtml}
      </div>
    </div>`;
}

function renderChecklistPage(checklist: ChecklistContent, starIndex: number): string {
  const activityId = `checklist_${starIndex}`;
  const itemsHtml = checklist.items.map((item, i) => `
    <label class="flex items-center gap-3 p-3 rounded-xl bg-white cursor-pointer hover:shadow-md transition-all">
      <input type="checkbox" class="checklist-item w-6 h-6 rounded" style="accent-color: var(--primary);">
      <span class="font-body text-lg" style="color: var(--dark);">${escapeForTemplate(item)}</span>
    </label>`).join("");

  return `
    <div class="page min-h-screen p-8" style="background-color: var(--cream);" data-page="checklist">
      <div class="max-w-4xl mx-auto">
        <h1 class="text-3xl md:text-4xl mb-6 font-title" style="color: var(--dark);">${escapeForTemplate(checklist.heading)}</h1>
        
        <div class="rounded-3xl shadow-xl p-8" style="background-color: white;">
          <p class="text-lg mb-6 font-body" style="color: var(--dark);">${escapeForTemplate(checklist.instructions)}</p>
          
          <div class="space-y-3 mb-6">
            ${itemsHtml}
          </div>
          
          <div class="rounded-xl p-4 flex items-center gap-3" style="background-color: var(--light-green);">
            <input 
              type="checkbox" 
              class="w-8 h-8 rounded cursor-pointer"
              style="accent-color: var(--primary);"
              data-activity="${activityId}"
              disabled
              onchange="markActivityComplete('${activityId}')"
              \${completedActivities['${activityId}'] ? 'checked disabled' : ''}
            >
            <label class="font-title text-xl" style="color: var(--dark);">I completed this activity! ⭐</label>
          </div>
        </div>
      </div>
    </div>`;
}

function renderReflectionPage(reflection: ReflectionContent, starIndex: number): string {
  const activityId = `reflection_${starIndex}`;
  return `
    <div class="page min-h-screen p-8" style="background-color: var(--cream);" data-page="reflection">
      <div class="max-w-4xl mx-auto">
        <h1 class="text-3xl md:text-4xl mb-6 font-title" style="color: var(--dark);">${escapeForTemplate(reflection.heading)}</h1>
        
        <div class="rounded-3xl shadow-xl p-8" style="background-color: white;">
          <p class="text-lg mb-6 font-body" style="color: var(--dark);">${escapeForTemplate(reflection.prompt)}</p>
          
          <textarea 
            class="reflection-input w-full rounded-xl p-4 border-3 font-body text-lg mb-6" 
            style="background-color: var(--cream); border: 3px solid var(--primary); color: var(--dark); min-height: 150px;"
            placeholder="${escapeForTemplate(reflection.placeholder)}"
            onchange="saveFormData('reflection_${starIndex}', this.value)"
          >\${formData['reflection_${starIndex}'] || ''}</textarea>
          
          <div class="rounded-xl p-4 flex items-center gap-3" style="background-color: var(--light-green);">
            <input 
              type="checkbox" 
              class="w-8 h-8 rounded cursor-pointer"
              style="accent-color: var(--primary);"
              data-activity="${activityId}"
              disabled
              onchange="markActivityComplete('${activityId}')"
              \${completedActivities['${activityId}'] ? 'checked disabled' : ''}
            >
            <label class="font-title text-xl" style="color: var(--dark);">I finished my reflection! ⭐</label>
          </div>
        </div>
      </div>
    </div>`;
}

function renderQuizPage(quiz: QuizContent, starIndex: number): string {
  const activityId = `quiz_${starIndex}`;
  const answersHtml = quiz.answers.map((ans) => `
    <button 
      class="quiz-answer w-full text-left p-4 rounded-xl border-2 font-body text-lg transition-all hover:shadow-md cursor-pointer"
      style="border-color: var(--secondary); background-color: white; color: var(--dark);"
      data-correct="${ans.isCorrect}"
      data-feedback="${escapeForTemplate(ans.feedback)}"
    >
      ${escapeForTemplate(ans.text)}
    </button>`).join("");

  return `
    <div class="page min-h-screen p-8" style="background-color: var(--cream);" data-page="quiz">
      <div class="max-w-4xl mx-auto">
        <h1 class="text-3xl md:text-4xl mb-6 font-title" style="color: var(--dark);">${escapeForTemplate(quiz.heading)}</h1>
        
        <div class="rounded-3xl shadow-xl p-8" style="background-color: white;">
          <p class="text-xl mb-6 font-body font-semibold" style="color: var(--dark);">${escapeForTemplate(quiz.question)}</p>
          
          <div class="space-y-3 mb-6">
            ${answersHtml}
          </div>
          
          <p class="quiz-feedback text-lg font-body mb-6 p-4 rounded-xl" style="display: none; background-color: var(--soft-yellow); color: var(--dark);"></p>
          
          <div class="rounded-xl p-4 flex items-center gap-3" style="background-color: var(--light-green);">
            <input 
              type="checkbox" 
              class="w-8 h-8 rounded cursor-pointer"
              style="accent-color: var(--primary);"
              data-activity="${activityId}"
              disabled
              onchange="markActivityComplete('${activityId}')"
              \${completedActivities['${activityId}'] ? 'checked disabled' : ''}
            >
            <label class="font-title text-xl" style="color: var(--dark);">I completed the quiz! ⭐</label>
          </div>
        </div>
      </div>
    </div>`;
}

function renderDrawingPage(drawing: DrawingContent, starIndex: number): string {
  const activityId = `drawing_${starIndex}`;
  return `
    <div class="page min-h-screen p-8" style="background-color: var(--cream);" data-page="drawing">
      <div class="max-w-4xl mx-auto">
        <h1 class="text-3xl md:text-4xl mb-6 font-title" style="color: var(--dark);">${escapeForTemplate(drawing.heading)}</h1>
        
        <div class="rounded-3xl shadow-xl p-8" style="background-color: white;">
          <p class="text-lg mb-6 font-body" style="color: var(--dark);">${escapeForTemplate(drawing.instructions)}</p>
          
          <div class="border-4 rounded-xl mb-4 overflow-hidden" style="border-color: var(--primary); background-color: white;">
            <canvas class="drawing-canvas w-full cursor-crosshair" width="700" height="400" style="touch-action: none; display: block;"></canvas>
          </div>
          
          <div class="flex flex-wrap gap-2 mb-6">
            <button class="clear-canvas-btn px-4 py-2 rounded-lg text-white font-bold font-body" style="background-color: var(--accent);">
              Clear
            </button>
            <button class="color-btn w-10 h-10 rounded-full border-2 border-white shadow" data-color="#264653" style="background-color: #264653;"></button>
            <button class="color-btn w-10 h-10 rounded-full border-2 border-white shadow" data-color="#F4A261" style="background-color: #F4A261;"></button>
            <button class="color-btn w-10 h-10 rounded-full border-2 border-white shadow" data-color="#E76F51" style="background-color: #E76F51;"></button>
            <button class="color-btn w-10 h-10 rounded-full border-2 border-white shadow" data-color="#2A9D8F" style="background-color: #2A9D8F;"></button>
            <button class="color-btn w-10 h-10 rounded-full border-2 border-white shadow" data-color="#9b59b6" style="background-color: #9b59b6;"></button>
          </div>
          
          <div class="mb-6">
            <label class="block font-semibold mb-2 font-body" style="color: var(--dark);">${escapeForTemplate(drawing.promptQuestion)}</label>
            <input 
              type="text" 
              class="w-full rounded-xl p-3 font-body text-lg" 
              style="background-color: var(--cream); border: 3px solid var(--primary); color: var(--dark);"
              placeholder="Type your answer here..."
              onchange="saveFormData('drawing_answer_${starIndex}', this.value)"
              value="\${formData['drawing_answer_${starIndex}'] || ''}"
            >
          </div>
          
          <div class="rounded-xl p-4 flex items-center gap-3" style="background-color: var(--light-green);">
            <input 
              type="checkbox" 
              class="w-8 h-8 rounded cursor-pointer"
              style="accent-color: var(--primary);"
              data-activity="${activityId}"
              onchange="markActivityComplete('${activityId}')"
              \${completedActivities['${activityId}'] ? 'checked disabled' : ''}
            >
            <label class="font-title text-xl" style="color: var(--dark);">I completed my drawing! ⭐</label>
          </div>
        </div>
      </div>
    </div>`;
}

function renderBreathingPage(breathing: BreathingContent, starIndex: number): string {
  const activityId = `breathing_${starIndex}`;
  return `
    <div class="page min-h-screen p-8" style="background-color: var(--cream);" data-page="breathing">
      <div class="max-w-4xl mx-auto">
        <h1 class="text-3xl md:text-4xl mb-6 font-title" style="color: var(--dark);">${escapeForTemplate(breathing.heading)}</h1>
        
        <div class="rounded-3xl shadow-xl p-8" style="background-color: white;">
          <p class="text-lg mb-8 font-body text-center" style="color: var(--dark);">${escapeForTemplate(breathing.instructions)}</p>
          
          <div class="text-center mb-8">
            <div class="w-48 h-48 mx-auto rounded-full flex items-center justify-center text-6xl animate-pulse" 
                 style="background: linear-gradient(135deg, var(--light-green), var(--secondary));">
              🌬️
            </div>
          </div>
          
          <div class="grid md:grid-cols-3 gap-4 mb-8">
            <div class="rounded-2xl p-6 text-center" style="background-color: var(--light-green);">
              <div class="text-4xl mb-2">😤</div>
              <h3 class="font-title text-xl mb-2" style="color: var(--dark);">Breathe In</h3>
              <p class="font-body" style="color: var(--dark);">${escapeForTemplate(breathing.inhaleText)}</p>
            </div>
            <div class="rounded-2xl p-6 text-center" style="background-color: var(--soft-yellow);">
              <div class="text-4xl mb-2">😊</div>
              <h3 class="font-title text-xl mb-2" style="color: var(--dark);">Hold</h3>
              <p class="font-body" style="color: var(--dark);">${escapeForTemplate(breathing.holdText)}</p>
            </div>
            <div class="rounded-2xl p-6 text-center" style="background-color: var(--primary);">
              <div class="text-4xl mb-2">😌</div>
              <h3 class="font-title text-xl mb-2" style="color: white;">Breathe Out</h3>
              <p class="font-body" style="color: white;">${escapeForTemplate(breathing.exhaleText)}</p>
            </div>
          </div>
          
          <div class="rounded-xl p-4 flex items-center gap-3" style="background-color: var(--light-green);">
            <input 
              type="checkbox" 
              class="w-8 h-8 rounded cursor-pointer"
              style="accent-color: var(--primary);"
              data-activity="${activityId}"
              onchange="markActivityComplete('${activityId}')"
              \${completedActivities['${activityId}'] ? 'checked disabled' : ''}
            />
            <label class="font-title text-xl" style="color: var(--dark);">I practiced calm breathing! ⭐</label>
          </div>
        </div>
      </div>
    </div>`;
}

function renderScenarioPage(scenario: ScenarioContent, starIndex: number): string {
  const activityId = `scenario_${starIndex}`;
  const optionsHtml = scenario.options.map((opt) => `
    <button class="scenario-option w-full text-left p-4 rounded-xl border-2 font-body text-lg transition-all hover:shadow-md cursor-pointer" style="border-color: var(--secondary); background-color: white; color: var(--dark);" data-good="${opt.isGood}" data-feedback="${escapeForTemplate(opt.feedback)}">${escapeForTemplate(opt.text)}</button>`).join("");
  return `
    <div class="page min-h-screen p-8" style="background-color: var(--cream);" data-page="scenario">
      <div class="max-w-4xl mx-auto">
        <h1 class="text-3xl md:text-4xl mb-6 font-title" style="color: var(--dark);">${escapeForTemplate(scenario.heading)}</h1>
        <div class="rounded-3xl shadow-xl p-8" style="background-color: white;">
          <div class="rounded-2xl p-6 mb-6" style="background-color: var(--soft-yellow);"><p class="text-lg font-body" style="color: var(--dark);">${escapeForTemplate(scenario.scenario)}</p></div>
          <p class="text-xl mb-6 font-body font-semibold" style="color: var(--dark);">${escapeForTemplate(scenario.question)}</p>
          <div class="space-y-3 mb-6">${optionsHtml}</div>
          <p class="scenario-feedback text-lg font-body mb-6 p-4 rounded-xl" style="display: none; background-color: var(--light-green); color: var(--dark);"></p>
          <div class="rounded-xl p-4 flex items-center gap-3" style="background-color: var(--light-green);">
            <input type="checkbox" class="w-8 h-8 rounded cursor-pointer" style="accent-color: var(--primary);" data-activity="${activityId}" disabled onchange="markActivityComplete('${activityId}')" \${completedActivities['${activityId}'] ? 'checked disabled' : ''}>
            <label class="font-title text-xl" style="color: var(--dark);">I thought about this scenario! ⭐</label>
          </div>
        </div>
      </div>
    </div>`;
}

function renderFeelingThermometerPage(thermometer: FeelingThermometerContent, starIndex: number): string {
  const activityId = `thermometer_${starIndex}`;
  return `
    <div class="page min-h-screen p-8" style="background-color: var(--cream);" data-page="feeling-thermometer">
      <div class="max-w-4xl mx-auto">
        <h1 class="text-3xl md:text-4xl mb-6 font-title" style="color: var(--dark);">${escapeForTemplate(thermometer.heading)}</h1>
        <div class="rounded-3xl shadow-xl p-8" style="background-color: white;">
          <p class="text-lg mb-6 font-body" style="color: var(--dark);">${escapeForTemplate(thermometer.instructions)}</p>
          <div class="mb-8">
            <div class="flex justify-between mb-2">
              <span class="font-body text-sm" style="color: var(--secondary);">${escapeForTemplate(thermometer.lowLabel)}</span>
              <span class="font-body text-sm" style="color: var(--accent);">${escapeForTemplate(thermometer.highLabel)}</span>
            </div>
            <input type="range" min="1" max="10" value="5" class="thermometer-slider w-full" oninput="this.parentElement.querySelector('.thermometer-value').textContent = this.value; saveFormData('thermometer_${starIndex}', this.value)">
            <div class="text-center mt-4"><span class="thermometer-value text-4xl font-title" style="color: var(--primary);">5</span></div>
          </div>
          <div class="mb-6">
            <label class="block font-semibold mb-2 font-body" style="color: var(--dark);">${escapeForTemplate(thermometer.followUpQuestion)}</label>
            <textarea class="w-full rounded-xl p-4 font-body text-lg" style="background-color: var(--cream); border: 3px solid var(--primary); color: var(--dark); min-height: 100px;" placeholder="Write your thoughts here..." onchange="saveFormData('thermometer_followup_${starIndex}', this.value)">\${formData['thermometer_followup_${starIndex}'] || ''}</textarea>
          </div>
          <div class="rounded-xl p-4 flex items-center gap-3" style="background-color: var(--light-green);">
            <input type="checkbox" class="w-8 h-8 rounded cursor-pointer" style="accent-color: var(--primary);" data-activity="${activityId}" onchange="markActivityComplete('${activityId}')" \${completedActivities['${activityId}'] ? 'checked disabled' : ''}>
            <label class="font-title text-xl" style="color: var(--dark);">I checked my feelings thermometer! ⭐</label>
          </div>
        </div>
      </div>
    </div>`;
}

function renderBodyMapPage(bodyMap: BodyMapContent, starIndex: number): string {
  const activityId = `bodymap_${starIndex}`;
  const partsHtml = bodyMap.bodyParts.map((part) => `
    <button class="body-part-btn flex items-center gap-3 p-4 rounded-xl border-2 transition-all hover:shadow-md cursor-pointer w-full text-left" style="border-color: var(--secondary); background-color: white; color: var(--dark);" onclick="this.classList.toggle('selected'); this.style.backgroundColor = this.classList.contains('selected') ? 'var(--light-green)' : 'white';">
      <span class="text-3xl">${escapeForTemplate(part.emoji)}</span>
      <div>
        <span class="font-title text-lg">${escapeForTemplate(part.name)}</span>
        <p class="font-body text-sm" style="color: var(--secondary);">${escapeForTemplate(part.description)}</p>
      </div>
    </button>`).join("");

  return `
    <div class="page min-h-screen p-8" style="background-color: var(--cream);" data-page="body-map">
      <div class="max-w-4xl mx-auto">
        <h1 class="text-3xl md:text-4xl mb-6 font-title" style="color: var(--dark);">${escapeForTemplate(bodyMap.heading)}</h1>
        
        <div class="rounded-3xl shadow-xl p-8" style="background-color: white;">
          <p class="text-lg mb-6 font-body" style="color: var(--dark);">${escapeForTemplate(bodyMap.instructions)}</p>
          <div class="grid gap-3 mb-6">${partsHtml}</div>
          <div class="rounded-xl p-4 flex items-center gap-3" style="background-color: var(--light-green);">
            <input type="checkbox" class="w-8 h-8 rounded cursor-pointer" style="accent-color: var(--primary);" data-activity="${activityId}" onchange="markActivityComplete('${activityId}')" \${completedActivities['${activityId}'] ? 'checked disabled' : ''}>
            <label class="font-title text-xl" style="color: var(--dark);">I explored my body map! ⭐</label>
          </div>
        </div>
      </div>
    </div>`;
}

function renderFeelingSelectorPage(selector: FeelingSelectorContent, starIndex: number): string {
  const activityId = `feeling_${starIndex}`;
  const feelingsHtml = selector.feelings.map((f) => `
    <button class="feeling-btn flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all hover:shadow-md cursor-pointer" style="border-color: ${f.color}; background-color: white;" onclick="this.classList.toggle('selected'); this.style.backgroundColor = this.classList.contains('selected') ? '${f.color}' : 'white';">
      <span class="text-4xl">${escapeForTemplate(f.emoji)}</span>
      <span class="font-body font-semibold" style="color: var(--dark);">${escapeForTemplate(f.name)}</span>
    </button>`).join("");

  return `
    <div class="page min-h-screen p-8" style="background-color: var(--cream);" data-page="feeling-selector">
      <div class="max-w-4xl mx-auto">
        <h1 class="text-3xl md:text-4xl mb-6 font-title" style="color: var(--dark);">${escapeForTemplate(selector.heading)}</h1>
        
        <div class="rounded-3xl shadow-xl p-8" style="background-color: white;">
          <p class="text-lg mb-6 font-body" style="color: var(--dark);">${escapeForTemplate(selector.instructions)}</p>
          <div class="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">${feelingsHtml}</div>
          <div class="mb-6">
            <label class="block font-semibold mb-2 font-body" style="color: var(--dark);">${escapeForTemplate(selector.followUpQuestion)}</label>
            <textarea class="w-full rounded-xl p-4 font-body text-lg" style="background-color: var(--cream); border: 3px solid var(--primary); color: var(--dark); min-height: 100px;" placeholder="Write your thoughts here..." onchange="saveFormData('feeling_followup_${starIndex}', this.value)">\${formData['feeling_followup_${starIndex}'] || ''}</textarea>
          </div>
          <div class="rounded-xl p-4 flex items-center gap-3" style="background-color: var(--light-green);">
            <input type="checkbox" class="w-8 h-8 rounded cursor-pointer" style="accent-color: var(--primary);" data-activity="${activityId}" onchange="markActivityComplete('${activityId}')" \${completedActivities['${activityId}'] ? 'checked disabled' : ''}>
            <label class="font-title text-xl" style="color: var(--dark);">I identified my feelings! ⭐</label>
          </div>
        </div>
      </div>
    </div>`;
}

function renderCalmDenBuilderPage(denBuilder: CalmDenBuilderContent, starIndex: number, metadata: ModuleMetadata): string {
  const activityId = `calmden_${starIndex}`;
  const itemsHtml = denBuilder.items.map((item) => `
    <button class="den-item-btn flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all hover:shadow-md cursor-pointer" style="border-color: var(--secondary); background-color: white;" onclick="this.classList.toggle('selected'); this.style.backgroundColor = this.classList.contains('selected') ? 'var(--light-green)' : 'white';">
      <span class="text-4xl">${escapeForTemplate(item.emoji)}</span>
      <span class="font-body font-semibold text-center" style="color: var(--dark);">${escapeForTemplate(item.name)}</span>
    </button>`).join("");

  return `
    <div class="page min-h-screen p-8" style="background-color: var(--cream);" data-page="calm-den-builder">
      <div class="max-w-4xl mx-auto">
        <h1 class="text-3xl md:text-4xl mb-6 font-title" style="color: var(--dark);">${escapeForTemplate(denBuilder.heading)}</h1>
        
        <div class="rounded-3xl shadow-xl p-8" style="background-color: white;">
          <div class="rounded-2xl p-6 mb-6 flex items-start gap-4" style="background-color: var(--soft-yellow);">
            <span class="text-4xl">${escapeForTemplate(metadata.characterEmoji)}</span>
            <p class="text-lg font-body" style="color: var(--dark);">${escapeForTemplate(denBuilder.storyText)}</p>
          </div>
          <p class="text-lg mb-6 font-body font-semibold" style="color: var(--dark);">${escapeForTemplate(denBuilder.instructions)}</p>
          <div class="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">${itemsHtml}</div>
          <div class="mb-6">
            <label class="block font-semibold mb-2 font-body" style="color: var(--dark);">${escapeForTemplate(denBuilder.locationQuestion)}</label>
            <input type="text" class="w-full rounded-xl p-4 font-body text-lg" style="background-color: var(--cream); border: 3px solid var(--primary); color: var(--dark);" placeholder="e.g., My bedroom, under my blanket..." onchange="saveFormData('calmden_location_${starIndex}', this.value)" value="\${formData['calmden_location_${starIndex}'] || ''}">
          </div>
          <div class="rounded-xl p-4 flex items-center gap-3" style="background-color: var(--light-green);">
            <input type="checkbox" class="w-8 h-8 rounded cursor-pointer" style="accent-color: var(--primary);" data-activity="${activityId}" onchange="markActivityComplete('${activityId}')" \${completedActivities['${activityId}'] ? 'checked disabled' : ''}>
            <label class="font-title text-xl" style="color: var(--dark);">I built my calm-down den! ⭐</label>
          </div>
        </div>
      </div>
    </div>`;
}

function renderActionPlanPage(actionPlan: ActionPlanContent, starIndex: number): string {
  const activityId = `actionplan_${starIndex}`;
  const stepsHtml = actionPlan.steps.map((step) => `
    <div class="rounded-xl p-4 mb-4" style="background-color: var(--soft-yellow);">
      <div class="flex items-center gap-3 mb-2">
        <span class="w-8 h-8 rounded-full flex items-center justify-center font-title text-white" style="background-color: var(--primary);">${step.stepNumber}</span>
        <h3 class="font-title text-xl" style="color: var(--dark);">${escapeForTemplate(step.title)}</h3>
      </div>
      <p class="font-body mb-2" style="color: var(--dark);">${escapeForTemplate(step.prompt)}</p>
      <input type="text" class="w-full rounded-lg p-3 font-body" style="background-color: white; border: 2px solid var(--primary); color: var(--dark);" placeholder="${escapeForTemplate(step.placeholder)}" onchange="saveFormData('actionplan_step${step.stepNumber}_${starIndex}', this.value)" value="\${formData['actionplan_step${step.stepNumber}_${starIndex}'] || ''}">
    </div>`).join("");

  return `
    <div class="page min-h-screen p-8" style="background-color: var(--cream);" data-page="action-plan">
      <div class="max-w-4xl mx-auto">
        <h1 class="text-3xl md:text-4xl mb-6 font-title" style="color: var(--dark);">${escapeForTemplate(actionPlan.heading)}</h1>
        
        <div class="rounded-3xl shadow-xl p-8" style="background-color: white;">
          <p class="text-lg mb-6 font-body" style="color: var(--dark);">${escapeForTemplate(actionPlan.instructions)}</p>
          ${stepsHtml}
          <div class="rounded-xl p-4 flex items-center gap-3" style="background-color: var(--light-green);">
            <input type="checkbox" class="w-8 h-8 rounded cursor-pointer" style="accent-color: var(--primary);" data-activity="${activityId}" onchange="markActivityComplete('${activityId}')" \${completedActivities['${activityId}'] ? 'checked disabled' : ''}>
            <label class="font-title text-xl" style="color: var(--dark);">I created my action plan! ⭐</label>
          </div>
        </div>
      </div>
    </div>`;
}

function renderWarningSignsPage(warningSigns: WarningSingsContent, starIndex: number): string {
  const activityId = `warningsigns_${starIndex}`;
  const categoriesHtml = warningSigns.categories.map((cat) => `
    <div class="rounded-xl p-4 mb-4" style="background-color: var(--soft-yellow);">
      <div class="flex items-center gap-2 mb-3">
        <span class="text-2xl">${escapeForTemplate(cat.emoji)}</span>
        <h3 class="font-title text-xl" style="color: var(--dark);">${escapeForTemplate(cat.category)}</h3>
      </div>
      <div class="space-y-2">
        ${cat.examples.map((ex, i) => `
          <label class="flex items-center gap-3 p-2 rounded-lg bg-white cursor-pointer hover:shadow-sm transition-all">
            <input type="checkbox" class="warning-sign-item w-5 h-5 rounded" style="accent-color: var(--primary);">
            <span class="font-body" style="color: var(--dark);">${escapeForTemplate(ex)}</span>
          </label>
        `).join("")}
      </div>
    </div>`).join("");

  return `
    <div class="page min-h-screen p-8" style="background-color: var(--cream);" data-page="warning-signs">
      <div class="max-w-4xl mx-auto">
        <h1 class="text-3xl md:text-4xl mb-6 font-title" style="color: var(--dark);">${escapeForTemplate(warningSigns.heading)}</h1>
        
        <div class="rounded-3xl shadow-xl p-8" style="background-color: white;">
          <p class="text-lg mb-6 font-body" style="color: var(--dark);">${escapeForTemplate(warningSigns.instructions)}</p>
          
          ${categoriesHtml}
          
          <div class="rounded-xl p-4 flex items-center gap-3" style="background-color: var(--light-green);">
            <input 
              type="checkbox" 
              class="w-8 h-8 rounded cursor-pointer"
              style="accent-color: var(--primary);"
              data-activity="${activityId}"
              onchange="markActivityComplete('${activityId}')"
              \${completedActivities['${activityId}'] ? 'checked disabled' : ''}
            >
            <label class="font-title text-xl" style="color: var(--dark);">I identified my warning signs! ⭐</label>
          </div>
        </div>
      </div>
    </div>`;
}

function renderMatchingActivityPage(matching: MatchingActivityContent, starIndex: number): string {
  const activityId = `matching_${starIndex}`;
  const pairsHtml = matching.pairs.map((pair, i) => `
    <div class="matching-pair rounded-xl p-4 mb-3" style="background-color: var(--soft-yellow);">
      <p class="font-body mb-3" style="color: var(--dark);">${escapeForTemplate(pair.situation)}</p>
      <div class="flex flex-wrap gap-2">
        <button 
          class="matching-choice px-4 py-2 rounded-lg font-body transition-all cursor-pointer"
          style="background-color: white; border: 2px solid var(--secondary); color: var(--dark);"
          data-correct="${pair.feeling}"
          data-pair="${i}"
          onclick="this.style.backgroundColor = 'var(--light-green)'; this.style.borderColor = 'var(--secondary)';"
        >
          ${escapeForTemplate(pair.emoji)} ${escapeForTemplate(pair.feeling)}
        </button>
      </div>
    </div>`).join("");

  return `
    <div class="page min-h-screen p-8" style="background-color: var(--cream);" data-page="matching-activity">
      <div class="max-w-4xl mx-auto">
        <h1 class="text-3xl md:text-4xl mb-6 font-title" style="color: var(--dark);">${escapeForTemplate(matching.heading)}</h1>
        
        <div class="rounded-3xl shadow-xl p-8" style="background-color: white;">
          <p class="text-lg mb-6 font-body" style="color: var(--dark);">${escapeForTemplate(matching.instructions)}</p>
          
          ${pairsHtml}
          
          <div class="rounded-xl p-4 flex items-center gap-3" style="background-color: var(--light-green);">
            <input 
              type="checkbox" 
              class="w-8 h-8 rounded cursor-pointer"
              style="accent-color: var(--primary);"
              data-activity="${activityId}"
              onchange="markActivityComplete('${activityId}')"
              \${completedActivities['${activityId}'] ? 'checked disabled' : ''}
            >
            <label class="font-title text-xl" style="color: var(--dark);">I matched the feelings! ⭐</label>
          </div>
        </div>
      </div>
    </div>`;
}

function renderSummaryPage(summary: SummaryContent, metadata: ModuleMetadata): string {
  const takeawaysHtml = summary.takeaways.map(t => `
    <div class="flex items-center gap-3 p-4 rounded-xl bg-white">
      <span class="text-2xl">✨</span>
      <span class="font-body text-lg" style="color: var(--dark);">${escapeForTemplate(t)}</span>
    </div>`).join("");

  return `
    <div class="page min-h-screen p-8" style="background-color: var(--cream);" data-page="summary">
      <div class="max-w-4xl mx-auto">
        <h1 class="text-3xl md:text-4xl mb-6 font-title" style="color: var(--dark);">${escapeForTemplate(summary.heading)}</h1>
        
        <div class="rounded-3xl shadow-xl p-8 mb-6" style="background-color: white;">
          <div class="space-y-4 mb-8">
            ${takeawaysHtml}
          </div>
        </div>
        
        <div class="rounded-xl p-6 flex items-center gap-4" style="background-color: var(--soft-yellow);">
          <span class="text-5xl">${escapeForTemplate(metadata.characterEmoji)}</span>
          <p class="font-body text-lg font-semibold" style="color: var(--dark);">${escapeForTemplate(summary.encouragement)}</p>
        </div>
      </div>
    </div>`;
}

function renderCompletionPage(completion: CompletionContent, metadata: ModuleMetadata): string {
  return `
    <div class="page min-h-screen flex items-center justify-center p-8" style="background: linear-gradient(to bottom right, var(--soft-yellow), var(--light-green));" data-page="completion">
      <div class="text-center max-w-2xl">
        <div class="text-8xl mb-6 animate-bounce-slow">🎉</div>
        <h1 class="text-4xl md:text-5xl mb-6 font-title" style="color: var(--dark);">${escapeForTemplate(completion.heading)}</h1>
        
        <div class="rounded-3xl shadow-xl p-8 mb-8" style="background-color: white;">
          <p class="text-xl mb-4 font-body" style="color: var(--dark);">${escapeForTemplate(completion.celebrationText)}</p>
          <p class="text-lg font-body" style="color: var(--secondary);">${escapeForTemplate(completion.nextStepsText)}</p>
        </div>
        
        <div class="flex flex-col gap-4">
          <button 
            onclick="completeModule()"
            class="w-full py-4 px-8 rounded-xl text-white font-bold text-xl font-title shadow-lg hover:shadow-xl transition-all cursor-pointer"
            style="background: linear-gradient(135deg, var(--secondary), #1ABC9C);"
          >
            ✅ Complete Module & Return Home
          </button>
          
          <button 
            onclick="jumpToPage(0)"
            class="w-full py-3 px-6 rounded-xl font-semibold font-body cursor-pointer"
            style="background-color: white; color: var(--dark); border: 2px solid var(--secondary);"
          >
            📖 Review This Module
          </button>
        </div>
        
        <div class="mt-8 flex items-center justify-center gap-2">
          <span class="text-4xl">${escapeForTemplate(metadata.characterEmoji)}</span>
          <p class="font-body text-lg" style="color: var(--dark);">
            ${escapeForTemplate(metadata.characterName)} is proud of you!
          </p>
        </div>
      </div>
    </div>`;
}

// ========================================
// NEW PAGE RENDERERS (v4.0)
// ========================================

function renderInteractiveLessonPage(lesson: InteractiveLessonContent, metadata: ModuleMetadata, starIndex: number): string {
  const activityId = `interactive_${starIndex}`;
  
  let interactionHtml = "";
  const options = lesson.interactionOptions || ["Option 1", "Option 2", "Option 3"];
  
  switch (lesson.interactionType) {
    case "poll":
    case "circle-one":
      interactionHtml = `
        <div class="interactive-group">
          <p class="text-lg mb-4 font-body font-semibold" style="color: var(--dark);">${escapeForTemplate(lesson.interactionPrompt)}</p>
          <div class="grid grid-cols-2 gap-3 mb-4">
            ${options.map((opt, i) => `
              <button class="interactive-option p-4 rounded-xl border-2 font-body text-lg text-left cursor-pointer transition-all" 
                      style="border-color: var(--secondary); background-color: white; color: var(--dark);"
                      onclick="this.parentElement.querySelectorAll('.interactive-option').forEach(b => b.style.backgroundColor = 'white'); this.style.backgroundColor = 'var(--light-green)'; saveFormData('poll_${starIndex}', '${escapeForTemplate(opt)}'); const page = this.closest('.page'); const ff = page.querySelector('.followup-feedback'); if(ff) ff.style.display = 'block'; const mf = page.querySelector('.mascot-feedback'); if(mf) mf.style.display = 'flex';">
                ${escapeForTemplate(opt)}
              </button>
            `).join("")}
          </div>
        </div>`;
      break;
      
    case "fill-blank":
      interactionHtml = `
        <div class="interactive-group">
          <p class="text-lg mb-4 font-body" style="color: var(--dark);">${escapeForTemplate(lesson.interactionPrompt)}</p>
          <input type="text" 
                 class="w-full p-4 rounded-xl border-3 font-body text-lg mb-4" 
                 style="background-color: white; border: 3px solid var(--primary); color: var(--dark);"
                 placeholder="Type your answer here..."
                 onchange="saveFormData('fillblank_${starIndex}', this.value); const page = this.closest('.page'); const ff = page.querySelector('.followup-feedback'); if(ff) ff.style.display = 'block'; const mf = page.querySelector('.mascot-feedback'); if(mf) mf.style.display = 'flex';">
        </div>`;
      break;
      
    case "rate-scale":
      interactionHtml = `
        <div class="interactive-group">
          <p class="text-lg mb-4 font-body font-semibold" style="color: var(--dark);">${escapeForTemplate(lesson.interactionPrompt)}</p>
          <div class="flex justify-between gap-2 mb-4">
            ${[1,2,3,4,5].map(n => `
              <button class="interactive-option w-14 h-14 rounded-full border-2 font-title text-xl flex items-center justify-center cursor-pointer transition-all" 
                      style="border-color: var(--secondary); background-color: white; color: var(--dark);"
                      onclick="this.parentElement.querySelectorAll('.interactive-option').forEach(b => b.style.backgroundColor = 'white'); this.style.backgroundColor = 'var(--light-green)'; saveFormData('rate_${starIndex}', '${n}'); const page = this.closest('.page'); const ff = page.querySelector('.followup-feedback'); if(ff) ff.style.display = 'block'; const mf = page.querySelector('.mascot-feedback'); if(mf) mf.style.display = 'flex';">
                ${n}
              </button>
            `).join("")}
          </div>
          <div class="flex justify-between text-sm font-body" style="color: var(--secondary);">
            <span>Not at all</span>
            <span>Very much!</span>
          </div>
        </div>`;
      break;
      
    case "true-false":
      interactionHtml = `
        <div class="interactive-group">
          <div class="rounded-2xl p-6 mb-4" style="background-color: var(--soft-yellow);">
            <p class="text-xl font-body font-semibold text-center" style="color: var(--dark);">"${escapeForTemplate(lesson.interactionPrompt)}"</p>
          </div>
          <div class="flex gap-4 justify-center">
            <button class="interactive-option px-8 py-4 rounded-xl border-2 font-title text-xl cursor-pointer transition-all" 
                    style="border-color: var(--secondary); background-color: white; color: var(--dark);"
                    onclick="this.style.backgroundColor = 'var(--light-green)'; this.nextElementSibling.style.backgroundColor = 'white'; saveFormData('tf_${starIndex}', 'agree'); const page = this.closest('.page'); const ff = page.querySelector('.followup-feedback'); if(ff) ff.style.display = 'block'; const mf = page.querySelector('.mascot-feedback'); if(mf) mf.style.display = 'flex';">
              I Agree
            </button>
            <button class="interactive-option px-8 py-4 rounded-xl border-2 font-title text-xl cursor-pointer transition-all" 
                    style="border-color: var(--accent); background-color: white; color: var(--dark);"
                    onclick="this.style.backgroundColor = '#fecaca'; this.previousElementSibling.style.backgroundColor = 'white'; saveFormData('tf_${starIndex}', 'disagree'); const page = this.closest('.page'); const ff = page.querySelector('.followup-feedback'); if(ff) ff.style.display = 'block'; const mf = page.querySelector('.mascot-feedback'); if(mf) mf.style.display = 'flex';">
              I Disagree
            </button>
          </div>
        </div>`;
      break;
  }

  return `
    <div class="page min-h-screen p-8" style="background-color: var(--cream);" data-page="interactive-lesson">
      <div class="max-w-4xl mx-auto">
        <h1 class="text-3xl md:text-4xl mb-6 font-title" style="color: var(--dark);">${escapeForTemplate(lesson.heading)}</h1>
        
        <div class="rounded-3xl shadow-xl p-8 mb-6" style="background-color: white;">
          <p class="text-lg mb-6 leading-relaxed font-body" style="color: var(--dark);">${escapeForTemplate(lesson.introText)}</p>
          
          ${interactionHtml}
          
          <div class="followup-feedback mt-6 p-4 rounded-xl" style="background-color: var(--cream); display: none;">
            <p class="font-body" style="color: var(--dark);">${escapeForTemplate(lesson.followUpText)}</p>
          </div>
        </div>
        
        <div class="mascot-feedback rounded-xl p-4 flex items-center gap-3" style="background-color: var(--light-green); display: none;">
          <span class="text-3xl">${escapeForTemplate(metadata.characterEmoji)}</span>
          <p class="font-body font-semibold" style="color: var(--dark);">${escapeForTemplate(lesson.mascotComment)}</p>
        </div>
        
        <div class="rounded-xl p-4 flex items-center gap-3 mt-4" style="background-color: var(--soft-yellow);">
          <input 
            type="checkbox" 
            class="w-8 h-8 rounded cursor-pointer"
            style="accent-color: var(--primary);"
            data-activity="${activityId}"
            onchange="markActivityComplete('${activityId}')"
            \${completedActivities['${activityId}'] ? 'checked disabled' : ''}
          >
          <label class="font-title text-xl" style="color: var(--dark);">I participated!</label>
        </div>
      </div>
    </div>`;
}

function renderFillInStoryPage(story: FillInStoryContent, starIndex: number, metadata: ModuleMetadata): string {
  const activityId = `fillin_${starIndex}`;
  
  let storyHtml = escapeForTemplate(story.storyTemplate);
  story.blanks.forEach((blank, i) => {
    storyHtml = storyHtml.replace(
      `[${blank.id}]`,
      `<input type="text" class="story-blank inline-block w-32 border-b-3 border-dashed text-center font-body mx-1" style="border-color: var(--primary); background: transparent;" placeholder="${escapeForTemplate(blank.hint)}" onchange="saveFormData('story_${starIndex}_${i}', this.value)">`
    );
  });

  return `
    <div class="page min-h-screen p-8" style="background-color: var(--cream);" data-page="fill-in-story">
      <div class="max-w-4xl mx-auto">
        <h1 class="text-3xl md:text-4xl mb-6 font-title" style="color: var(--dark);">${escapeForTemplate(story.heading)}</h1>
        
        <div class="rounded-3xl shadow-xl p-8 mb-6" style="background-color: white;">
          <p class="text-lg mb-6 font-body" style="color: var(--dark);">${escapeForTemplate(story.instructions)}</p>
          
          <div class="p-6 rounded-2xl mb-6" style="background-color: var(--soft-yellow);">
            <p class="text-xl leading-loose font-body" style="color: var(--dark);">${storyHtml}</p>
          </div>
          
          <div class="p-4 rounded-xl" style="background-color: var(--cream);">
            <p class="font-body font-semibold mb-3" style="color: var(--dark);">${escapeForTemplate(story.reflection)}</p>
            <textarea class="w-full p-3 rounded-lg border-2 font-body" style="border-color: var(--primary); min-height: 80px;" placeholder="Write your thoughts..." onchange="saveFormData('story_reflection_${starIndex}', this.value)"></textarea>
          </div>
        </div>
        
        <div class="rounded-xl p-4 flex items-center gap-3" style="background-color: var(--light-green);">
          <input 
            type="checkbox" 
            class="w-8 h-8 rounded cursor-pointer"
            style="accent-color: var(--primary);"
            data-activity="${activityId}"
            onchange="markActivityComplete('${activityId}')"
            \${completedActivities['${activityId}'] ? 'checked disabled' : ''}
          >
          <label class="font-title text-xl" style="color: var(--dark);">I completed my story!</label>
        </div>
      </div>
    </div>`;
}

function renderCopingCardsPage(cards: CopingCardsContent, starIndex: number): string {
  const activityId = `coping_${starIndex}`;
  
  const categoriesHtml = cards.categories.map(cat => `
    <div class="rounded-xl p-4 mb-4" style="background-color: ${cat.color};">
      <h3 class="font-title text-lg mb-3" style="color: var(--dark);">${cat.emoji} ${escapeForTemplate(cat.name)}</h3>
      <div class="flex flex-wrap gap-2">
        ${cat.strategies.map(strat => `
          <button class="coping-strategy px-3 py-2 rounded-lg font-body text-sm cursor-pointer transition-all" 
                  style="background-color: white; color: var(--dark); border: 2px solid transparent;"
                  onclick="this.classList.toggle('selected'); this.style.borderColor = this.classList.contains('selected') ? 'var(--dark)' : 'transparent';">
            ${escapeForTemplate(strat)}
          </button>
        `).join("")}
      </div>
    </div>
  `).join("");

  return `
    <div class="page min-h-screen p-8" style="background-color: var(--cream);" data-page="coping-cards">
      <div class="max-w-4xl mx-auto">
        <h1 class="text-3xl md:text-4xl mb-6 font-title" style="color: var(--dark);">${escapeForTemplate(cards.heading)}</h1>
        
        <div class="rounded-3xl shadow-xl p-8 mb-6" style="background-color: white;">
          <p class="text-lg mb-6 font-body" style="color: var(--dark);">${escapeForTemplate(cards.instructions)}</p>
          
          ${categoriesHtml}
          
          <div class="mt-6 p-4 rounded-xl" style="background-color: var(--soft-yellow);">
            <p class="font-body font-semibold mb-3" style="color: var(--dark);">${escapeForTemplate(cards.personalCardPrompt)}</p>
            <input type="text" class="w-full p-3 rounded-lg border-2 font-body" style="border-color: var(--primary);" placeholder="My personal coping strategy..." onchange="saveFormData('coping_personal_${starIndex}', this.value)">
          </div>
        </div>
        
        <div class="rounded-xl p-4 flex items-center gap-3" style="background-color: var(--light-green);">
          <input 
            type="checkbox" 
            class="w-8 h-8 rounded cursor-pointer"
            style="accent-color: var(--primary);"
            data-activity="${activityId}"
            onchange="markActivityComplete('${activityId}')"
            \${completedActivities['${activityId}'] ? 'checked disabled' : ''}
          >
          <label class="font-title text-xl" style="color: var(--dark);">I built my coping cards!</label>
        </div>
      </div>
    </div>`;
}

function renderGratitudeJarPage(jar: GratitudeJarContent, starIndex: number): string {
  const activityId = `gratitude_${starIndex}`;
  
  const promptsHtml = jar.promptCategories.map((cat, i) => `
    <div class="rounded-xl p-4 mb-3" style="background-color: var(--soft-yellow);">
      <div class="flex items-center gap-2 mb-2">
        <span class="text-2xl">${cat.emoji}</span>
        <span class="font-title text-lg" style="color: var(--dark);">${escapeForTemplate(cat.category)}</span>
      </div>
      <p class="font-body mb-2" style="color: var(--dark);">${escapeForTemplate(cat.prompt)}</p>
      <input type="text" class="w-full p-3 rounded-lg border-2 font-body" style="border-color: var(--primary); background-color: white;" placeholder="I'm grateful for..." onchange="saveFormData('gratitude_${starIndex}_${i}', this.value)">
    </div>
  `).join("");

  return `
    <div class="page min-h-screen p-8" style="background-color: var(--cream);" data-page="gratitude-jar">
      <div class="max-w-4xl mx-auto">
        <h1 class="text-3xl md:text-4xl mb-6 font-title" style="color: var(--dark);">${escapeForTemplate(jar.heading)}</h1>
        
        <div class="rounded-3xl shadow-xl p-8 mb-6" style="background-color: white;">
          <p class="text-lg mb-6 font-body" style="color: var(--dark);">${escapeForTemplate(jar.introText)}</p>
          
          ${promptsHtml}
          
          <div class="mt-6 p-4 rounded-xl text-center" style="background-color: var(--light-green);">
            <p class="font-body font-semibold" style="color: var(--dark);">${escapeForTemplate(jar.encouragement)}</p>
          </div>
        </div>
        
        <div class="rounded-xl p-4 flex items-center gap-3" style="background-color: var(--light-green);">
          <input 
            type="checkbox" 
            class="w-8 h-8 rounded cursor-pointer"
            style="accent-color: var(--primary);"
            data-activity="${activityId}"
            onchange="markActivityComplete('${activityId}')"
            \${completedActivities['${activityId}'] ? 'checked disabled' : ''}
          >
          <label class="font-title text-xl" style="color: var(--dark);">I filled my gratitude jar!</label>
        </div>
      </div>
    </div>`;
}

function renderSortingActivityPage(sorting: SortingActivityContent, starIndex: number): string {
  const activityId = `sorting_${starIndex}`;
  
  const categoriesHtml = sorting.categories.map((cat, ci) => `
    <div class="sort-category rounded-xl p-4 min-h-[150px] border-3 cursor-pointer" style="background-color: ${cat.color}; border-color: var(--dark);" data-category="${escapeForTemplate(cat.name)}" data-category-index="${ci}" onclick="sortSelectedItem(this, '${escapeForTemplate(cat.name)}', ${starIndex})">
      <h3 class="font-title text-lg mb-3 text-center" style="color: var(--dark);">${cat.emoji} ${escapeForTemplate(cat.name)}</h3>
      <div class="dropped-items space-y-2"></div>
    </div>
  `).join("");
  
  const itemsHtml = sorting.items.map((item, i) => `
    <div class="sort-item p-3 rounded-lg font-body cursor-pointer transition-all hover:scale-102" style="background-color: white; border: 2px solid var(--primary);" data-item-id="item_${i}" data-correct-category="${escapeForTemplate(item.correctCategory)}" data-explanation="${escapeForTemplate(item.explanation)}" onclick="selectSortItem(this)">
      ${escapeForTemplate(item.text)}
    </div>
  `).join("");

  return `
    <div class="page min-h-screen p-8" style="background-color: var(--cream);" data-page="sorting-activity">
      <div class="max-w-4xl mx-auto">
        <h1 class="text-3xl md:text-4xl mb-6 font-title" style="color: var(--dark);">${escapeForTemplate(sorting.heading)}</h1>
        
        <div class="rounded-3xl shadow-xl p-8 mb-6" style="background-color: white;">
          <p class="text-lg mb-6 font-body" style="color: var(--dark);">${escapeForTemplate(sorting.instructions)}</p>
          
          <div class="grid md:grid-cols-2 gap-4 mb-6">
            ${categoriesHtml}
          </div>
          
          <div class="sort-items-container p-4 rounded-xl" style="background-color: var(--cream);">
            <p class="font-body font-semibold mb-3" style="color: var(--dark);">Items to sort (tap item, then tap a category):</p>
            <div class="sort-items-list space-y-2">
              ${itemsHtml}
            </div>
          </div>
        </div>
        
        <div class="rounded-xl p-4 flex items-center gap-3" style="background-color: var(--light-green);">
          <input 
            type="checkbox" 
            class="w-8 h-8 rounded cursor-pointer"
            style="accent-color: var(--primary);"
            data-activity="${activityId}"
            onchange="markActivityComplete('${activityId}')"
            \${completedActivities['${activityId}'] ? 'checked disabled' : ''}
          >
          <label class="font-title text-xl" style="color: var(--dark);">I sorted everything!</label>
        </div>
      </div>
    </div>`;
}

function renderThoughtBubblesPage(thought: ThoughtBubblesContent, starIndex: number): string {
  const activityId = `thought_${starIndex}`;

  return `
    <div class="page min-h-screen p-8" style="background-color: var(--cream);" data-page="thought-bubbles">
      <div class="max-w-4xl mx-auto">
        <h1 class="text-3xl md:text-4xl mb-6 font-title" style="color: var(--dark);">${escapeForTemplate(thought.heading)}</h1>
        
        <div class="rounded-3xl shadow-xl p-8 mb-6" style="background-color: white;">
          <div class="p-4 rounded-xl mb-6" style="background-color: var(--soft-yellow);">
            <p class="font-body text-lg" style="color: var(--dark);"><strong>Scenario:</strong> ${escapeForTemplate(thought.scenario)}</p>
          </div>
          
          <div class="flex items-start gap-4 mb-6">
            <span class="text-5xl">${thought.characterEmoji}</span>
            <div class="flex-1 p-4 rounded-2xl relative" style="background-color: #fecaca; border: 2px solid var(--accent);">
              <p class="font-body text-lg" style="color: var(--dark);"><strong>Unhelpful thought:</strong> "${escapeForTemplate(thought.unhelpfulThought)}"</p>
            </div>
          </div>
          
          <div class="p-4 rounded-xl mb-4" style="background-color: var(--light-green);">
            <p class="font-body font-semibold mb-3" style="color: var(--dark);">${escapeForTemplate(thought.helpfulPrompt)}</p>
            <textarea class="w-full p-3 rounded-lg border-2 font-body" style="border-color: var(--secondary); min-height: 80px;" placeholder="Write a helpful thought..." onchange="saveFormData('helpful_thought_${starIndex}', this.value)"></textarea>
          </div>
          
          <div class="p-3 rounded-lg text-sm" style="background-color: var(--cream);">
            <p class="font-body" style="color: var(--secondary);"><strong>Example:</strong> "${escapeForTemplate(thought.exampleHelpful)}"</p>
          </div>
          
          <div class="mt-6 p-4 rounded-xl" style="background-color: var(--soft-yellow);">
            <p class="font-body" style="color: var(--dark);">${escapeForTemplate(thought.reflection)}</p>
          </div>
        </div>
        
        <div class="rounded-xl p-4 flex items-center gap-3" style="background-color: var(--light-green);">
          <input 
            type="checkbox" 
            class="w-8 h-8 rounded cursor-pointer"
            style="accent-color: var(--primary);"
            data-activity="${activityId}"
            onchange="markActivityComplete('${activityId}')"
            \${completedActivities['${activityId}'] ? 'checked disabled' : ''}
          >
          <label class="font-title text-xl" style="color: var(--dark);">I challenged my thoughts!</label>
        </div>
      </div>
    </div>`;
}

function renderEmojiCheckInPage(checkIn: EmojiCheckInContent, starIndex: number): string {
  const activityId = `emoji_${starIndex}`;
  
  const moodGrid = checkIn.timePoints.map((time, ti) => `
    <div class="text-center">
      <div class="text-2xl mb-2">${time.emoji}</div>
      <p class="font-title text-sm mb-3" style="color: var(--dark);">${escapeForTemplate(time.label)}</p>
      <div class="flex flex-wrap justify-center gap-2">
        ${checkIn.moodOptions.map((mood, mi) => `
          <button class="mood-option w-12 h-12 rounded-full text-2xl flex items-center justify-center cursor-pointer transition-all border-2 border-transparent hover:scale-110" 
                  style="background-color: ${mood.color};" 
                  onclick="this.parentElement.querySelectorAll('.mood-option').forEach(b => b.style.borderColor = 'transparent'); this.style.borderColor = 'var(--dark)'; saveFormData('mood_${starIndex}_${ti}', '${escapeForTemplate(mood.label)}');">
            ${mood.emoji}
          </button>
        `).join("")}
      </div>
    </div>
  `).join("");

  return `
    <div class="page min-h-screen p-8" style="background-color: var(--cream);" data-page="emoji-check-in">
      <div class="max-w-4xl mx-auto">
        <h1 class="text-3xl md:text-4xl mb-6 font-title" style="color: var(--dark);">${escapeForTemplate(checkIn.heading)}</h1>
        
        <div class="rounded-3xl shadow-xl p-8 mb-6" style="background-color: white;">
          <p class="text-lg mb-6 font-body" style="color: var(--dark);">${escapeForTemplate(checkIn.instructions)}</p>
          
          <div class="grid md:grid-cols-3 gap-6 mb-6">
            ${moodGrid}
          </div>
          
          <div class="flex flex-wrap justify-center gap-4 mb-6 p-3 rounded-lg" style="background-color: var(--cream);">
            ${checkIn.moodOptions.map(mood => `
              <div class="flex items-center gap-2">
                <span class="text-xl">${mood.emoji}</span>
                <span class="font-body text-sm" style="color: var(--dark);">${escapeForTemplate(mood.label)}</span>
              </div>
            `).join("")}
          </div>
          
          <div class="p-4 rounded-xl" style="background-color: var(--soft-yellow);">
            <p class="font-body font-semibold mb-2" style="color: var(--dark);">${escapeForTemplate(checkIn.patternQuestion)}</p>
            <textarea class="w-full p-3 rounded-lg border-2 font-body" style="border-color: var(--primary); min-height: 60px;" placeholder="I noticed..." onchange="saveFormData('mood_pattern_${starIndex}', this.value)"></textarea>
          </div>
        </div>
        
        <div class="rounded-xl p-4 flex items-center gap-3" style="background-color: var(--light-green);">
          <input 
            type="checkbox" 
            class="w-8 h-8 rounded cursor-pointer"
            style="accent-color: var(--primary);"
            data-activity="${activityId}"
            onchange="markActivityComplete('${activityId}')"
            \${completedActivities['${activityId}'] ? 'checked disabled' : ''}
          >
          <label class="font-title text-xl" style="color: var(--dark);">I tracked my moods!</label>
        </div>
      </div>
    </div>`;
}

function renderWordScramblePage(scramble: WordScrambleContent, starIndex: number): string {
  const activityId = `scramble_${starIndex}`;
  
  const wordsHtml = scramble.words.map((word, wi) => `
    <div class="scramble-word p-4 rounded-xl mb-4" style="background-color: var(--soft-yellow);" data-answer="${word.answer}">
      <div class="flex items-center gap-2 mb-3">
        <span class="text-2xl">${word.emoji}</span>
        <span class="font-body text-sm" style="color: var(--secondary);">Hint: ${escapeForTemplate(word.hint)}</span>
      </div>
      <p class="font-title text-2xl text-center mb-3" style="color: var(--dark);">${word.scrambled}</p>
      <input type="text" class="w-full p-3 rounded-lg border-2 font-body text-lg text-center" style="border-color: var(--primary);" placeholder="Your answer..." onchange="const correct = this.value.toUpperCase() === '${word.answer}'; this.style.borderColor = correct ? 'var(--secondary)' : 'var(--accent)'; this.parentElement.querySelector('.word-feedback').textContent = correct ? 'Correct!' : 'Try again!'; this.parentElement.querySelector('.word-feedback').style.color = correct ? 'var(--secondary)' : 'var(--accent)'; saveFormData('scramble_${starIndex}_${wi}', this.value);">
      <p class="word-feedback text-center font-title mt-2"></p>
    </div>
  `).join("");

  return `
    <div class="page min-h-screen p-8" style="background-color: var(--cream);" data-page="word-scramble">
      <div class="max-w-4xl mx-auto">
        <h1 class="text-3xl md:text-4xl mb-6 font-title" style="color: var(--dark);">${escapeForTemplate(scramble.heading)}</h1>
        
        <div class="rounded-3xl shadow-xl p-8 mb-6" style="background-color: white;">
          <p class="text-lg mb-6 font-body" style="color: var(--dark);">${escapeForTemplate(scramble.instructions)}</p>
          
          ${wordsHtml}
          
          <div class="p-4 rounded-xl text-center" style="background-color: var(--light-green);">
            <p class="font-body font-semibold" style="color: var(--dark);">${escapeForTemplate(scramble.completionMessage)}</p>
          </div>
        </div>
        
        <div class="rounded-xl p-4 flex items-center gap-3" style="background-color: var(--light-green);">
          <input 
            type="checkbox" 
            class="w-8 h-8 rounded cursor-pointer"
            style="accent-color: var(--primary);"
            data-activity="${activityId}"
            onchange="markActivityComplete('${activityId}')"
            \${completedActivities['${activityId}'] ? 'checked disabled' : ''}
          >
          <label class="font-title text-xl" style="color: var(--dark);">I solved all the scrambles!</label>
        </div>
      </div>
    </div>`;
}

function renderAgreeDisagreePage(activity: AgreeDisagreeContent, starIndex: number): string {
  const activityId = `agree_${starIndex}`;
  
  const statementsHtml = activity.statements.map((stmt, si) => `
    <div class="statement-card p-4 rounded-xl mb-4" style="background-color: var(--soft-yellow);">
      <p class="font-body text-lg mb-3" style="color: var(--dark);">"${escapeForTemplate(stmt.statement)}"</p>
      <div class="flex gap-3 mb-3">
        <button class="agree-btn flex-1 py-3 rounded-lg font-title text-lg cursor-pointer transition-all border-2" 
                style="background-color: var(--light-green); border-color: transparent; color: var(--dark);"
                onclick="this.style.borderColor = 'var(--dark)'; this.nextElementSibling.style.borderColor = 'transparent'; this.parentElement.nextElementSibling.style.display = 'block'; saveFormData('agree_${starIndex}_${si}', 'agree');">
          I Agree
        </button>
        <button class="disagree-btn flex-1 py-3 rounded-lg font-title text-lg cursor-pointer transition-all border-2" 
                style="background-color: #fecaca; border-color: transparent; color: var(--dark);"
                onclick="this.style.borderColor = 'var(--dark)'; this.previousElementSibling.style.borderColor = 'transparent'; this.parentElement.nextElementSibling.style.display = 'block'; saveFormData('agree_${starIndex}_${si}', 'disagree');">
          I Disagree
        </button>
      </div>
      <div class="insight p-3 rounded-lg" style="background-color: white; display: none;">
        <p class="font-body text-sm" style="color: var(--secondary);">${escapeForTemplate(stmt.insight)}</p>
      </div>
    </div>
  `).join("");

  return `
    <div class="page min-h-screen p-8" style="background-color: var(--cream);" data-page="agree-disagree">
      <div class="max-w-4xl mx-auto">
        <h1 class="text-3xl md:text-4xl mb-6 font-title" style="color: var(--dark);">${escapeForTemplate(activity.heading)}</h1>
        
        <div class="rounded-3xl shadow-xl p-8 mb-6" style="background-color: white;">
          <p class="text-lg mb-6 font-body" style="color: var(--dark);">${escapeForTemplate(activity.instructions)}</p>
          
          ${statementsHtml}
          
          <div class="p-4 rounded-xl" style="background-color: var(--cream);">
            <p class="font-body font-semibold mb-2" style="color: var(--dark);">${escapeForTemplate(activity.reflection)}</p>
            <textarea class="w-full p-3 rounded-lg border-2 font-body" style="border-color: var(--primary); min-height: 60px;" placeholder="Write your thoughts..." onchange="saveFormData('agree_reflection_${starIndex}', this.value)"></textarea>
          </div>
        </div>
        
        <div class="rounded-xl p-4 flex items-center gap-3" style="background-color: var(--light-green);">
          <input 
            type="checkbox" 
            class="w-8 h-8 rounded cursor-pointer"
            style="accent-color: var(--primary);"
            data-activity="${activityId}"
            onchange="markActivityComplete('${activityId}')"
            \${completedActivities['${activityId}'] ? 'checked disabled' : ''}
          >
          <label class="font-title text-xl" style="color: var(--dark);">I shared my opinions!</label>
        </div>
      </div>
    </div>`;
}

function renderComicStripPage(comic: ComicStripContent, starIndex: number): string {
  const activityId = `comic_${starIndex}`;
  
  const panelsHtml = comic.panels.map(panel => `
    <div class="comic-panel rounded-xl border-3 p-4" style="border-color: var(--dark); background-color: white;">
      <div class="flex items-center gap-2 mb-2">
        <span class="w-8 h-8 rounded-full flex items-center justify-center font-title text-white" style="background-color: var(--primary);">${panel.panelNumber}</span>
        <p class="font-body text-sm" style="color: var(--dark);">${escapeForTemplate(panel.prompt)}</p>
      </div>
      <div class="comic-canvas-container w-full rounded-lg mb-2" style="background-color: var(--cream); border: 2px dashed var(--secondary);">
        <canvas class="comic-drawing-canvas w-full cursor-crosshair" width="300" height="150" style="touch-action: none; display: block; border-radius: 0.5rem;"></canvas>
      </div>
      <input type="text" class="w-full p-2 rounded-lg border font-body text-sm" style="border-color: var(--secondary);" placeholder="${escapeForTemplate(panel.placeholder)}" onchange="saveFormData('comic_${starIndex}_${panel.panelNumber}', this.value)">
    </div>
  `).join("");

  return `
    <div class="page min-h-screen p-8" style="background-color: var(--cream);" data-page="comic-strip">
      <div class="max-w-4xl mx-auto">
        <h1 class="text-3xl md:text-4xl mb-6 font-title" style="color: var(--dark);">${escapeForTemplate(comic.heading)}</h1>
        
        <div class="rounded-3xl shadow-xl p-8 mb-6" style="background-color: white;">
          <div class="p-4 rounded-xl mb-6" style="background-color: var(--soft-yellow);">
            <p class="font-body text-lg" style="color: var(--dark);">${escapeForTemplate(comic.scenario)}</p>
          </div>
          
          <div class="grid md:grid-cols-2 gap-4 mb-6">
            ${panelsHtml}
          </div>
          
          <div class="p-4 rounded-xl" style="background-color: var(--light-green);">
            <p class="font-body font-semibold" style="color: var(--dark);">${escapeForTemplate(comic.sharePrompt)}</p>
          </div>
        </div>
        
        <div class="rounded-xl p-4 flex items-center gap-3" style="background-color: var(--light-green);">
          <input 
            type="checkbox" 
            class="w-8 h-8 rounded cursor-pointer"
            style="accent-color: var(--primary);"
            data-activity="${activityId}"
            onchange="markActivityComplete('${activityId}')"
            \${completedActivities['${activityId}'] ? 'checked disabled' : ''}
          >
          <label class="font-title text-xl" style="color: var(--dark);">I created my comic!</label>
        </div>
      </div>
    </div>`;
}

function renderAffirmationBuilderPage(builder: AffirmationBuilderContent, starIndex: number): string {
  const activityId = `affirm_${starIndex}`;
  
  const startersHtml = builder.starters.map(s => `<button class="affirmation-part starter px-4 py-2 rounded-lg font-body cursor-pointer transition-all border-2 m-1" style="background-color: var(--light-green); border-color: transparent; color: var(--dark);" onclick="this.parentElement.querySelectorAll('.starter').forEach(b => b.style.borderColor = 'transparent'); this.style.borderColor = 'var(--dark)'; updateAffirmation();">${escapeForTemplate(s)}</button>`).join("");
  const middlesHtml = builder.middles.map(m => `<button class="affirmation-part middle px-4 py-2 rounded-lg font-body cursor-pointer transition-all border-2 m-1" style="background-color: var(--soft-yellow); border-color: transparent; color: var(--dark);" onclick="this.parentElement.querySelectorAll('.middle').forEach(b => b.style.borderColor = 'transparent'); this.style.borderColor = 'var(--dark)'; updateAffirmation();">${escapeForTemplate(m)}</button>`).join("");
  const endingsHtml = builder.endings.map(e => `<button class="affirmation-part ending px-4 py-2 rounded-lg font-body cursor-pointer transition-all border-2 m-1" style="background-color: var(--primary); border-color: transparent; color: white;" onclick="this.parentElement.querySelectorAll('.ending').forEach(b => b.style.borderColor = 'transparent'); this.style.borderColor = 'var(--dark)'; updateAffirmation();">${escapeForTemplate(e)}</button>`).join("");
  const emojisHtml = builder.decorationEmojis.map(e => `<button class="emoji-decoration text-2xl p-1 cursor-pointer hover:scale-125 transition-all" onclick="const display = document.querySelector('.affirmation-display'); display.textContent = '${e} ' + display.textContent + ' ${e}';">${e}</button>`).join("");

  return `
    <div class="page min-h-screen p-8" style="background-color: var(--cream);" data-page="affirmation-builder">
      <div class="max-w-4xl mx-auto">
        <h1 class="text-3xl md:text-4xl mb-6 font-title" style="color: var(--dark);">${escapeForTemplate(builder.heading)}</h1>
        
        <div class="rounded-3xl shadow-xl p-8 mb-6 affirmation-container" style="background-color: white;">
          <p class="text-lg mb-6 font-body" style="color: var(--dark);">${escapeForTemplate(builder.instructions)}</p>
          
          <div class="mb-4">
            <p class="font-body font-semibold mb-2" style="color: var(--dark);">Step 1: Pick a starter</p>
            <div class="flex flex-wrap">${startersHtml}</div>
          </div>
          
          <div class="mb-4">
            <p class="font-body font-semibold mb-2" style="color: var(--dark);">Step 2: Pick a middle</p>
            <div class="flex flex-wrap">${middlesHtml}</div>
          </div>
          
          <div class="mb-4">
            <p class="font-body font-semibold mb-2" style="color: var(--dark);">Step 3: Pick an ending</p>
            <div class="flex flex-wrap">${endingsHtml}</div>
          </div>
          
          <div class="mb-6">
            <p class="font-body font-semibold mb-2" style="color: var(--dark);">Decorate with emojis:</p>
            <div class="flex flex-wrap gap-1">${emojisHtml}</div>
          </div>
          
          <div class="p-6 rounded-2xl text-center mb-4" style="background: linear-gradient(135deg, var(--soft-yellow), var(--light-green));">
            <p class="font-body text-sm mb-2" style="color: var(--secondary);">Your affirmation:</p>
            <p class="affirmation-display font-title text-2xl" style="color: var(--dark);">Tap the words above!</p>
          </div>
          
          <div class="p-4 rounded-xl" style="background-color: var(--soft-yellow);">
            <p class="font-body" style="color: var(--dark);">${escapeForTemplate(builder.savePrompt)}</p>
          </div>
        </div>
        
        <div class="rounded-xl p-4 flex items-center gap-3" style="background-color: var(--light-green);">
          <input 
            type="checkbox" 
            class="w-8 h-8 rounded cursor-pointer"
            style="accent-color: var(--primary);"
            data-activity="${activityId}"
            onchange="markActivityComplete('${activityId}')"
            \${completedActivities['${activityId}'] ? 'checked disabled' : ''}
          >
          <label class="font-title text-xl" style="color: var(--dark);">I built my power phrase!</label>
        </div>
      </div>
    </div>`;
}

// ====================
// MAIN GENERATOR
// ====================

async function generateModule(
  supabaseClient: any,
  contentBrief: string,
  jobId?: string,
  seriesInfo?: SeriesInfo | null
): Promise<{ html: string; pageCount: number; characterCount: number; spec: any }> {
  
  const updateProgress = async (step: string, message: string) => {

    if (jobId) {
      try {
        await supabaseClient
          .from("ai_generation_jobs")
          .update({
            result: { progress: { step, message, timestamp: new Date().toISOString() } },
            updated_at: new Date().toISOString(),
          })
          .eq("id", jobId);
      } catch (e) { /* Non-critical */ }
    }
  };
  
  await updateProgress("initializing", "Loading configuration...");
  const settings = await getSettings(supabaseClient);
  
  // Generate variable page structure (18-24 pages)
  const pageStructure = generatePageStructure();

  
  await updateProgress("generating", `Creating ${pageStructure.length}-page module...`);
  const content = await generateAllContent(settings.claude_api_key, contentBrief, pageStructure, updateProgress, seriesInfo);
  
  // Generate module code
  const moduleCode = `MOD_${Date.now().toString(36).toUpperCase()}`;
  
  await updateProgress("rendering", "Building interactive HTML...");
  const html = renderHtml(content, pageStructure, moduleCode);
  
  const pageCount = pageStructure.length;
  const characterCount = html.length;
  
  await updateProgress("complete", `Module generation complete! (${pageCount} pages)`);
  
  const spec = {
    version: "3.0",
    moduleCode,
    pageCount,
    starCount: pageStructure.filter(p => p.starReward).length,
    metadata: content.metadata,
    generatedAt: new Date().toISOString(),
  };
  
  return { html, pageCount, characterCount, spec };
}

// ====================
// ASYNC JOB RUNNER
// ====================

async function runAsyncGeneration(
  supabaseClient: any,
  jobId: string,
  contentBrief: string,
  seriesInfo?: SeriesInfo | null
) {
  const startTime = Date.now();
  
  try {
    await supabaseClient
      .from("ai_generation_jobs")
      .update({ status: "running", updated_at: new Date().toISOString() })
      .eq("id", jobId);
    
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Generation timeout")), JOB_TIMEOUT_MS);
    });
    
    const generationPromise = generateModule(supabaseClient, contentBrief, jobId, seriesInfo);
    const result = await Promise.race([generationPromise, timeoutPromise]) as any;
    
    await supabaseClient
      .from("ai_generation_jobs")
      .update({
        status: "completed",
        result,
        updated_at: new Date().toISOString(),
      })
      .eq("id", jobId);
    

    
  } catch (e) {
    const error = e instanceof Error ? e : new Error(String(e));
    console.error(`[AI] Job ${jobId} failed:`, error.message);
    
    await supabaseClient
      .from("ai_generation_jobs")
      .update({
        status: "failed",
        error: error.message,
        updated_at: new Date().toISOString(),
      })
      .eq("id", jobId);
  }
}

// ====================
// HTTP HANDLER
// ====================

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  
  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );
  
  // GET /status/:id
  if (req.method === "GET" && req.url.includes("/status/")) {
    const url = new URL(req.url);
    const parts = url.pathname.split("/");
    const statusIndex = parts.indexOf("status");
    const jobId = statusIndex !== -1 && statusIndex < parts.length - 1 ? parts[statusIndex + 1] : null;
    
    if (!jobId) return jsonResponse({ error: "Job ID required" }, 400);
    
    const { data: job, error } = await supabaseClient
      .from("ai_generation_jobs")
      .select("*")
      .eq("id", jobId)
      .single();
    
    if (error || !job) return jsonResponse({ error: "Job not found" }, 404);
    
    return jsonResponse({
      status: job.status,
      result: job.result,
      error: job.error,
      created_at: job.created_at,
      updated_at: job.updated_at,
      progress: job.result?.progress || null,
    });
  }
  
  if (req.method !== "POST") {
    return jsonResponse({ error: "Use POST" }, 405);
  }
  
  try {
    const body = await req.json().catch(() => ({}));
    const contentBrief = body?.contentBrief;
    const asyncMode = body?.async === true;
    const seriesId = body?.seriesId;
    
    // Debug logging
    console.log(`[AI] Request received - seriesId: ${seriesId}, asyncMode: ${asyncMode}, contentBrief length: ${contentBrief?.length || 0}`);
    console.log(`[AI] Full body keys: ${Object.keys(body || {}).join(', ')}`);
    
    if (!contentBrief) {
      return jsonResponse({ error: "contentBrief is required" }, 400);
    }
    
    // Fetch series info if seriesId provided
    let seriesInfo: SeriesInfo | null = null;
    if (seriesId) {
      console.log(`[AI] Looking up series with id: ${seriesId}`);
      const { data: series, error: seriesError } = await supabaseClient
        .from("series")
        .select("label, character_type, emoji")
        .eq("id", seriesId)
        .single();
      
      if (!seriesError && series) {
        // Map character_type to emoji if emoji column doesn't exist
        const characterTypeToEmoji: Record<string, string> = {
          'dog': '🐕',
          'Dog': '🐕',
          'cat': '🐱',
          'Cat': '🐱',
          'rabbit': '🐰',
          'Rabbit': '🐰',
          'bear': '🐻',
          'Bear': '🐻',
          'fox': '🦊',
          'Fox': '🦊',
          'owl': '🦉',
          'Owl': '🦉',
          'penguin': '🐧',
          'Penguin': '🐧',
          'lion': '🦁',
          'Lion': '🦁',
          'elephant': '🐘',
          'Elephant': '🐘',
          'monkey': '🐵',
          'Monkey': '🐵',
        };
        
        const emoji = series.emoji || characterTypeToEmoji[series.character_type] || '🐾';
        
        seriesInfo = {
          label: series.label,
          character_type: series.character_type,
          emoji: emoji
        };
        console.log(`[AI] Using series: ${seriesInfo.label} (${seriesInfo.character_type} ${seriesInfo.emoji})`);
      } else {
        console.log(`[AI] Series lookup failed for id ${seriesId}:`, seriesError);
      }
    }
    
    // Async mode
    if (asyncMode) {
      const jobId = crypto.randomUUID();
      
      await supabaseClient
        .from("ai_generation_jobs")
        .insert({
          id: jobId,
          status: "running",
          content_brief: contentBrief,
          created_at: new Date().toISOString(),
        });
      
      const anyGlobal = globalThis as any;
      if (typeof anyGlobal?.EdgeRuntime?.waitUntil === "function") {
        anyGlobal.EdgeRuntime.waitUntil(runAsyncGeneration(supabaseClient, jobId, contentBrief, seriesInfo));
      } else {
        runAsyncGeneration(supabaseClient, jobId, contentBrief, seriesInfo).catch(console.error);
      }
      
      return jsonResponse({ jobId });
    }
    
    // Sync mode
    const result = await generateModule(supabaseClient, contentBrief, undefined, seriesInfo);
    return jsonResponse({
      html: result.html,
      pageCount: result.pageCount,
      characterCount: result.characterCount,
      spec: result.spec,
    });
    
  } catch (e) {
    console.error("[AI] Error:", e);
    const error = e instanceof Error ? e : new Error(String(e));
    return jsonResponse({ error: error.message }, 500);
  }
});