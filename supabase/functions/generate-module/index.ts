/**
 * AI Module Generator v3.0
 * ==========================
 * 
 * FIXES FROM v2:
 * - Fixed template literal escaping (${getChildName()} now works)
 * - Variable page count (18-24 pages, randomly varied)
 * - Proper CSS stylesheet references
 * 
 * ARCHITECTURE:
 * - Claude generates content (text only)
 * - Code controls structure (guaranteed minimum 18 pages)
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

interface GeneratedContent {
  metadata: ModuleMetadata;
  welcome: { heading: string; paragraphs: string[] };
  chapters: ChapterDivider[];
  lessons: LessonContent[];
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

/**
 * Generate a variable page structure between MIN_PAGES and MAX_PAGES
 * Base structure (18 pages) + optional extra lessons/activities (up to 6 more)
 */
function generatePageStructure(): PageTemplate[] {
  const targetPages = randomInt(MIN_PAGES, MAX_PAGES);
  
  // All available interactive activity types (excluding lessons, chapters, fixed pages)
  const interactiveTypes: PageTemplate[] = [
    { type: "checklist",          starReward: true  },
    { type: "reflection",         starReward: true  },
    { type: "quiz",               starReward: true  },
    { type: "drawing",            starReward: true  },
    { type: "breathing",          starReward: true  },
    { type: "scenario",           starReward: true  },
    { type: "feeling-thermometer", starReward: true  },
    { type: "body-map",           starReward: true  },
    { type: "feeling-selector",   starReward: true  },
    { type: "calm-den-builder",   starReward: true  },
    { type: "action-plan",        starReward: true  },
    { type: "warning-signs",      starReward: true  },
    { type: "matching-activity",  starReward: true  },
  ];
  
  // Shuffle interactive types to get random selection
  const shuffledActivities = [...interactiveTypes].sort(() => Math.random() - 0.5);
  
  // Pick 6-8 activities for this module (ensures variety)
  const numActivities = randomInt(6, 8);
  const selectedActivities = shuffledActivities.slice(0, numActivities);
  
  // Build structure with randomized activity placement
  const structure: PageTemplate[] = [
    { type: "cover",           starReward: false },
    { type: "welcome",         starReward: false },
  ];
  
  // Chapter 1: Introduction + 2 lessons + 1-2 activities
  structure.push({ type: "chapter-divider", starReward: false });
  structure.push({ type: "lesson", starReward: false });
  structure.push({ type: "lesson", starReward: false });
  if (selectedActivities.length > 0) structure.push(selectedActivities.shift()!);
  structure.push({ type: "lesson", starReward: false });
  if (selectedActivities.length > 0) structure.push(selectedActivities.shift()!);
  
  // Chapter 2: Deeper exploration + lessons + activities
  structure.push({ type: "chapter-divider", starReward: false });
  structure.push({ type: "lesson", starReward: false });
  if (selectedActivities.length > 0) structure.push(selectedActivities.shift()!);
  structure.push({ type: "lesson", starReward: false });
  if (selectedActivities.length > 0) structure.push(selectedActivities.shift()!);
  structure.push({ type: "lesson", starReward: false });
  
  // Chapter 3 (optional based on target pages): Practice + remaining activities
  if (targetPages >= 20) {
    structure.push({ type: "chapter-divider", starReward: false });
    structure.push({ type: "lesson", starReward: false });
  }
  
  // Add remaining activities
  while (selectedActivities.length > 0) {
    structure.push(selectedActivities.shift()!);
    if (selectedActivities.length > 0 && structure.length < targetPages - 3) {
      structure.push({ type: "lesson", starReward: false });
    }
  }
  
  // Ensure we have enough lessons to reach target
  while (structure.length < targetPages - 2) {
    structure.push({ type: "lesson", starReward: false });
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
  contentBrief: string
): Promise<ModuleMetadata> {
  const prompt = `Based on this content brief, create module metadata.

CONTENT BRIEF:
${contentBrief}

Respond with ONLY this JSON structure:
{
  "title": "Main module title (catchy, child-friendly)",
  "subtitle": "Brief tagline (10 words max)",
  "series": "Series name if mentioned, otherwise 'custom'",
  "targetAge": "Age range like '5-8' or '8-12'",
  "theme": "Core psychological theme (e.g., 'anxiety management', 'emotional regulation')",
  "characterName": "Friendly mascot name (animal preferred)",
  "characterEmoji": "Single emoji representing the mascot"
}`;

  const response = await callClaude(apiKey, SYSTEM_PROMPT, prompt, TOKENS_METADATA);
  const parsed = safeJsonParse<ModuleMetadata>(response);
  
  if (!parsed || !parsed.title) {
    return {
      title: "My Feelings Adventure",
      subtitle: "Learning about emotions together",
      series: "custom",
      targetAge: "5-10",
      theme: "emotional awareness",
      characterName: "Buddy",
      characterEmoji: "🐕"
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
        { "name": "Head", "emoji": "🧠", "description": "What happens here when you feel this emotion" },
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
        { name: "Head", emoji: "🧠", description: "Racing thoughts or foggy thinking" },
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
        { "name": "Angry", "emoji": "😠", "color": "#fecaca" },
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
        { name: "Angry", emoji: "😠", color: "#fecaca" },
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
        { "id": "blanket", "name": "Soft blanket", "emoji": "🧸" },
        { "id": "pillow", "name": "Comfy pillow", "emoji": "🛏️" },
        { "id": "music", "name": "Calm music", "emoji": "🎵" },
        { "id": "book", "name": "Favorite book", "emoji": "📚" },
        { "id": "toy", "name": "Special toy", "emoji": "🧸" },
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
        { id: "blanket", name: "Soft blanket", emoji: "🧣" },
        { id: "pillow", name: "Comfy pillow", emoji: "🛏️" },
        { id: "music", name: "Calm music", emoji: "🎵" },
        { id: "book", name: "Favorite book", emoji: "📚" },
        { id: "toy", name: "Special toy", emoji: "🧸" },
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
      heading: "⚠️ My Early Warning Signs",
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

// ====================
// ORCHESTRATOR
// ====================

async function generateAllContent(
  apiKey: string,
  contentBrief: string,
  pageStructure: PageTemplate[],
  updateProgress: (step: string, message: string) => Promise<void>
): Promise<GeneratedContent> {
  
  // Count how many of each type we need
  const counts = {
    chapters: pageStructure.filter(p => p.type === "chapter-divider").length,
    lessons: pageStructure.filter(p => p.type === "lesson").length,
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
  };
  
  await updateProgress("metadata", "Creating module theme and character...");
  const metadata = await generateMetadata(apiKey, contentBrief);
  
  await updateProgress("structure", "Planning module structure...");
  const [chapters, welcome] = await Promise.all([
    generateChapterDividers(apiKey, metadata, contentBrief, counts.chapters),
    generateWelcome(apiKey, metadata, contentBrief),
  ]);
  
  await updateProgress("lessons", "Creating lesson content...");
  const lessons = await generateLessons(apiKey, metadata, contentBrief, counts.lessons);
  
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
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(metadata.title)}</title>
  
  <!-- Google Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Fredoka+One&display=swap" rel="stylesheet">
  <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  
  <!-- Tailwind CSS -->
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://cdn.jsdelivr.net/gh/supabase/supabase@master/examples/edge-functions/supabase/functions/_shared/module-response-tracker.js" type="module"></script>
  
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
      
      // Restore form state after rendering the page
      setTimeout(() => {
        if (typeof window.restoreModuleFormState === 'function') {
          window.restoreModuleFormState();
        }
      }, 50);
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
      star.textContent = '⭐';
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
          <p class="text-lg font-body" style="color: var(--secondary);">⭐ Earn stars by completing activities! ⭐</p>
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
            <label class="font-title text-xl" style="color: var(--dark);">I completed this activity! ⭐</label>
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
            <label class="font-title text-xl" style="color: var(--dark);">I finished my reflection! ⭐</label>
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
            <label class="font-title text-xl" style="color: var(--dark);">I completed the quiz! ⭐</label>
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
            <label class="font-title text-xl" style="color: var(--dark);">I completed my drawing! ⭐</label>
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
            <label class="font-title text-xl" style="color: var(--dark);">I practiced calm breathing! ⭐</label>
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
            <label class="font-title text-xl" style="color: var(--dark);">I thought about this scenario! ⭐</label>
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
            <input type="range" min="1" max="10" value="5" class="thermometer-slider w-full" onchange="saveFormData('thermometer_${starIndex}', this.value)">
            <div class="text-center mt-4"><span class="thermometer-value text-4xl font-title" style="color: var(--primary);">5</span></div>
          </div>
          <div class="mb-6">
            <label class="block font-semibold mb-2 font-body" style="color: var(--dark);">${escapeForTemplate(thermometer.followUpQuestion)}</label>
            <textarea class="w-full rounded-xl p-4 font-body text-lg" style="background-color: var(--cream); border: 3px solid var(--primary); color: var(--dark); min-height: 100px;" placeholder="Write your thoughts here..." onchange="saveFormData('thermometer_followup_${starIndex}', this.value)">\${formData['thermometer_followup_${starIndex}'] || ''}</textarea>
          </div>
          <div class="rounded-xl p-4 flex items-center gap-3" style="background-color: var(--light-green);">
            <input type="checkbox" class="w-8 h-8 rounded cursor-pointer" style="accent-color: var(--primary);" data-activity="${activityId}" onchange="markActivityComplete('${activityId}')" \${completedActivities['${activityId}'] ? 'checked disabled' : ''}>
            <label class="font-title text-xl" style="color: var(--dark);">I checked my feelings thermometer! ⭐</label>
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
            <label class="font-title text-xl" style="color: var(--dark);">I explored my body map! ⭐</label>
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
            <label class="font-title text-xl" style="color: var(--dark);">I identified my feelings! ⭐</label>
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
            <label class="font-title text-xl" style="color: var(--dark);">I built my calm-down den! ⭐</label>
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
            <label class="font-title text-xl" style="color: var(--dark);">I created my action plan! ⭐</label>
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
            <label class="font-title text-xl" style="color: var(--dark);">I identified my warning signs! ⭐</label>
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
            <label class="font-title text-xl" style="color: var(--dark);">I matched the feelings! ⭐</label>
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

// ====================
// MAIN GENERATOR
// ====================

async function generateModule(
  supabaseClient: any,
  contentBrief: string,
  jobId?: string
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
  const content = await generateAllContent(settings.claude_api_key, contentBrief, pageStructure, updateProgress);
  
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
  contentBrief: string
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
    
    const generationPromise = generateModule(supabaseClient, contentBrief, jobId);
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
    
    if (!contentBrief) {
      return jsonResponse({ error: "contentBrief is required" }, 400);
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
        anyGlobal.EdgeRuntime.waitUntil(runAsyncGeneration(supabaseClient, jobId, contentBrief));
      } else {
        runAsyncGeneration(supabaseClient, jobId, contentBrief).catch(console.error);
      }
      
      return jsonResponse({ jobId });
    }
    
    // Sync mode
    const result = await generateModule(supabaseClient, contentBrief);
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