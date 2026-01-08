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
  
  // Base structure - always included (18 pages minimum)
  const baseStructure: PageTemplate[] = [
    { type: "cover",           starReward: false },  // 0
    { type: "welcome",         starReward: false },  // 1
    { type: "chapter-divider", starReward: false },  // 2
    { type: "lesson",          starReward: false },  // 3
    { type: "lesson",          starReward: false },  // 4
    { type: "checklist",       starReward: true  },  // 5
    { type: "lesson",          starReward: false },  // 6
    { type: "reflection",      starReward: true  },  // 7
    { type: "lesson",          starReward: false },  // 8
    { type: "chapter-divider", starReward: false },  // 9
    { type: "lesson",          starReward: false },  // 10
    { type: "quiz",            starReward: true  },  // 11
    { type: "lesson",          starReward: false },  // 12
    { type: "drawing",         starReward: true  },  // 13
    { type: "breathing",       starReward: true  },  // 14
    { type: "lesson",          starReward: false },  // 15
    { type: "summary",         starReward: false },  // 16
    { type: "completion",      starReward: false },  // 17
  ];
  
  // Extra pages to add (randomly selected)
  const extraOptions: PageTemplate[] = [
    { type: "lesson",          starReward: false },
    { type: "lesson",          starReward: false },
    { type: "checklist",       starReward: true  },
    { type: "reflection",      starReward: true  },
    { type: "scenario",        starReward: true  },
    { type: "quiz",            starReward: true  },
  ];
  
  const extraCount = targetPages - baseStructure.length;
  const structure = [...baseStructure];
  
  if (extraCount > 0) {
    // Insert extra pages before summary (index 16)
    const insertPoint = structure.length - 2; // Before summary
    const shuffled = [...extraOptions].sort(() => Math.random() - 0.5);
    const extras = shuffled.slice(0, extraCount);
    
    structure.splice(insertPoint, 0, ...extras);
  }
  
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

async function generateSummary(
  apiKey: string,
  metadata: ModuleMetadata,
  contentBrief: string
): Promise<SummaryContent> {
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
    summary,
    completion,
  };
}

// ====================
// HTML RENDERER
// ====================

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
            >
            <label class="font-title text-xl" style="color: var(--dark);">I practiced calm breathing! ⭐</label>
          </div>
        </div>
      </div>
    </div>`;
}

function renderScenarioPage(scenario: ScenarioContent, starIndex: number): string {
  const activityId = `scenario_${starIndex}`;
  const optionsHtml = scenario.options.map((opt) => `
    <button 
      class="scenario-option w-full text-left p-4 rounded-xl border-2 font-body text-lg transition-all hover:shadow-md cursor-pointer"
      style="border-color: var(--secondary); background-color: white; color: var(--dark);"
      data-good="${opt.isGood}"
      data-feedback="${escapeForTemplate(opt.feedback)}"
    >
      ${escapeForTemplate(opt.text)}
    </button>`).join("");

  return `
    <div class="page min-h-screen p-8" style="background-color: var(--cream);" data-page="scenario">
      <div class="max-w-4xl mx-auto">
        <h1 class="text-3xl md:text-4xl mb-6 font-title" style="color: var(--dark);">${escapeForTemplate(scenario.heading)}</h1>
        
        <div class="rounded-3xl shadow-xl p-8" style="background-color: white;">
          <div class="rounded-2xl p-6 mb-6" style="background-color: var(--soft-yellow);">
            <p class="text-lg font-body" style="color: var(--dark);">${escapeForTemplate(scenario.scenario)}</p>
          </div>
          
          <p class="text-xl mb-6 font-body font-semibold" style="color: var(--dark);">${escapeForTemplate(scenario.question)}</p>
          
          <div class="space-y-3 mb-6">
            ${optionsHtml}
          </div>
          
          <p class="scenario-feedback text-lg font-body mb-6 p-4 rounded-xl" style="display: none; background-color: var(--light-green); color: var(--dark);"></p>
          
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
            <label class="font-title text-xl" style="color: var(--dark);">I thought about this scenario! ⭐</label>
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