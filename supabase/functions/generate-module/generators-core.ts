/**
 * AI Module Generator - Content Generation
 * =========================================
 * 
 * This file contains:
 * - Configuration constants
 * - TypeScript type definitions
 * - Utility functions
 * - Claude API integration
 * - Page structure generator
 *
 * Content generation lives in generators-content.ts.
 * The HTML rendering is in a separate file: renderers.ts
 * NOTE: This module is stored under supabase/functions/_shared for edge bundling.
 */


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
  | "interactive-lesson"
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
  | "weather-controller"
  | "power-up-collector"
  | "emotion-maze"
  | "strength-shield"
  | "feeling-volcano"
  | "spin-the-wheel"
  | "sticker-collector"
  | "mindful-adventure"
  | "emotion-detective"
  | "balloon-pop"
  | "treasure-hunt"
  | "monster-tamer"
  | "garden-grower"
  | "superhero-creator"
  | "feelings-orchestra"
  | "calm-aquarium"
  | "rocket-launcher"
  | "magic-potion"
  | "feelings-bingo"
  | "summary"
  | "completion";

interface PageTemplate {
  type: PageType;
  starReward: boolean;
}

interface ModuleMetadata {
  title: string;
  subtitle: string;
  shortDescription: string;
  description: string;
  series: string;
  targetAge: string;
  theme: string;
  characterName: string;
  characterEmoji: string;
  characterType?: string;
}

/**
 * Age range data from the database
 * Simplified: Only display_name, language_guidelines, and developmental_stage are sent to AI
 */
interface AgeRangeData {
  id: string;
  age_range: string;
  display_name: string;
  language_guidelines: string;
  developmental_stage: string;
  cognitive_abilities: string;
  emotional_capacity: string;
  attention_span: string | null;
  vocabulary_level: string;
  sentence_complexity: string;
  abstract_thinking: string;
  neurodivergent_adaptations: string | null;
  trauma_sensitive_notes: string | null;
  ageRange?: string;
  ageMin?: number;
  ageMax?: number;
  displayName?: string;
  languageGuidelines?: string;
  developmentalStage?: string;
  cognitiveAbilities?: string;
  emotionalCapacity?: string;
  attentionSpan?: string | null;
  vocabularyLevel?: string;
  sentenceComplexity?: string;
  abstractThinking?: string;
  neurodivergentAdaptations?: string | null;
  traumaSensitiveNotes?: string | null;
}

/**
 * Core theory data from the database
 * Simplified: Only description and primary_researchers (key theorists) are sent to AI
 */
interface CoreTheoryData {
  id: string;
  theory_name: string;
  description: string;
  primary_researchers: string | null;
}

// Series data from the database
interface SeriesInfo {
  label: string;
  character_type: string;
  emoji: string;
  character_image_url?: string | null;
}

interface LessonContent {
  heading: string;
  paragraphs: string[];
  calloutTitle?: string;
  calloutText?: string;
  tipText?: string;
  danielInteraction?: string; // NEW: Specific Daniel dialogue or interaction note
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
  correctAnswerIndex?: number; // For poll/circle-one questions with a correct answer
  followUpText: string;
  mascotComment: string;
  danielInteraction?: string; // NEW: Specific Daniel dialogue or interaction note
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

// ====================
// v5 NEW CHALLENGE INTERFACES
// ====================

interface WeatherControllerContent {
  heading: string;
  instructions: string;
  weatherType: "storm" | "rain" | "fog" | "heat";
  calmingActions: Array<{
    id: string;
    label: string;
    emoji: string;
    points: number;
    feedbackText: string;
  }>;
  winText: string;
  encouragement: string;
}

interface PowerUpCollectorContent {
  heading: string;
  instructions: string;
  powerUps: Array<{
    id: string;
    name: string;
    emoji: string;
    description: string;
    isPositive: boolean;
  }>;
  targetCount: number;
  winText: string;
  tipText: string;
}

interface EmotionMazeContent {
  heading: string;
  instructions: string;
  startEmotion: { name: string; emoji: string };
  goalEmotion: { name: string; emoji: string };
  pathChoices: Array<{
    step: number;
    situation: string;
    options: Array<{
      text: string;
      emoji: string;
      isCorrect: boolean;
      feedback: string;
    }>;
  }>;
  completionMessage: string;
}

interface StrengthShieldContent {
  heading: string;
  instructions: string;
  shieldSections: Array<{
    id: string;
    title: string;
    emoji: string;
    prompt: string;
    placeholder: string;
  }>;
  decorations: string[];
  completionMessage: string;
}

interface FeelingVolcanoContent {
  heading: string;
  instructions: string;
  triggerScenario: string;
  coolingActions: Array<{
    id: string;
    action: string;
    emoji: string;
    coolingPower: number;
  }>;
  levels: Array<{
    level: number;
    emoji: string;
    label: string;
    color: string;
  }>;
  safeMessage: string;
}

// v6 NEW FUN INTERACTIVE LESSON TYPES
interface SpinTheWheelContent {
  heading: string;
  instructions: string;
  wheelQuestion: string;
  segments: Array<{
    id: string;
    label: string;
    emoji: string;
    color: string;
    response: string;
  }>;
  celebrationMessage: string;
}

interface StickerCollectorContent {
  heading: string;
  storyText: string;
  instructions: string;
  challenges: Array<{
    id: string;
    emoji: string;
    title: string;
    description: string;
  }>;
  totalStickers: number;
  completionMessage: string;
}

interface MindfulAdventureContent {
  heading: string;
  introText: string;
  scenes: Array<{
    id: string;
    sceneName: string;
    emoji: string;
    description: string;
    mindfulPrompt: string;
    placeholder: string;
  }>;
  closingMessage: string;
}

interface EmotionDetectiveContent {
  heading: string;
  caseDescription: string;
  instructions: string;
  clues: Array<{
    id: string;
    clueEmoji: string;
    clueText: string;
  }>;
  emotionOptions: Array<{
    emotion: string;
    emoji: string;
    explanation: string;
    isCorrect: boolean;
  }>;
  revelationMessage: string;
}

// ====================
// v7 NEW HIGHLY INTERACTIVE GAME INTERFACES
// ====================

interface BalloonPopContent {
  heading: string;
  instructions: string;
  scenario: string;
  balloons: Array<{
    id: string;
    worryText: string;
    emoji: string;
    color: string;
    popResponse: string;
  }>;
  calmingTools: Array<{
    id: string;
    tool: string;
    emoji: string;
    power: number;
  }>;
  victoryMessage: string;
}

interface TreasureHuntContent {
  heading: string;
  storyIntro: string;
  instructions: string;
  locations: Array<{
    id: string;
    name: string;
    emoji: string;
    description: string;
    treasure: {
      name: string;
      emoji: string;
      lesson: string;
    };
    question: string;
    placeholder: string;
  }>;
  mapEmoji: string;
  completionMessage: string;
}

interface MonsterTamerContent {
  heading: string;
  instructions: string;
  monster: {
    name: string;
    emotion: string;
    emoji: string;
    startingSize: number;
    description: string;
  };
  tamingActions: Array<{
    id: string;
    action: string;
    emoji: string;
    shrinkPower: number;
    message: string;
  }>;
  stages: Array<{
    level: number;
    emoji: string;
    description: string;
  }>;
  friendMessage: string;
}

interface GardenGrowerContent {
  heading: string;
  instructions: string;
  gardenStory: string;
  plants: Array<{
    id: string;
    name: string;
    emoji: string;
    feeling: string;
    growthStages: string[];
    nurturingAction: string;
  }>;
  wateringCan: {
    emoji: string;
    actions: string[];
  };
  harvestMessage: string;
}

interface SuperheroCreatorContent {
  heading: string;
  instructions: string;
  storyIntro: string;
  heroElements: {
    powers: Array<{
      id: string;
      name: string;
      emoji: string;
      description: string;
    }>;
    costumes: Array<{
      id: string;
      name: string;
      emoji: string;
      color: string;
    }>;
    sidekicks: Array<{
      id: string;
      name: string;
      emoji: string;
      ability: string;
    }>;
  };
  missionPrompt: string;
  heroNamePrompt: string;
  completionMessage: string;
}

interface FeelingsOrchestraContent {
  heading: string;
  instructions: string;
  orchestraStory: string;
  instruments: Array<{
    id: string;
    name: string;
    emoji: string;
    feeling: string;
    sound: string;
    color: string;
  }>;
  compositionPrompt: string;
  performanceMessage: string;
}

interface CalmAquariumContent {
  heading: string;
  instructions: string;
  aquariumStory: string;
  creatures: Array<{
    id: string;
    name: string;
    emoji: string;
    calmingTrait: string;
    movement: string;
  }>;
  decorations: Array<{
    id: string;
    name: string;
    emoji: string;
    calmingEffect: string;
  }>;
  breathingBubbles: {
    inhaleTime: number;
    exhaleTime: number;
    message: string;
  };
  peaceMessage: string;
}

interface RocketLauncherContent {
  heading: string;
  instructions: string;
  missionBriefing: string;
  planets: Array<{
    id: string;
    name: string;
    emoji: string;
    feeling: string;
    color: string;
    activity: string;
    reward: string;
  }>;
  fuelActions: Array<{
    id: string;
    action: string;
    emoji: string;
    fuelAmount: number;
  }>;
  launchSequence: string[];
  returnMessage: string;
}

interface MagicPotionContent {
  heading: string;
  instructions: string;
  cauldronStory: string;
  ingredients: Array<{
    id: string;
    name: string;
    emoji: string;
    feeling: string;
    sparkle: string;
    description: string;
  }>;
  recipes: Array<{
    potionName: string;
    emoji: string;
    requiredIngredients: string[];
    effect: string;
    color: string;
  }>;
  brewingSteps: string[];
  magicMessage: string;
}

interface FeelingsBingoContent {
  heading: string;
  instructions: string;
  bingoStory: string;
  squares: Array<{
    id: string;
    emoji: string;
    feeling: string;
    challenge: string;
  }>;
  freeSpace: {
    emoji: string;
    message: string;
  };
  bingoPatterns: string[];
  winMessage: string;
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
  // v5 NEW CHALLENGE TYPES
  weatherControllers: WeatherControllerContent[];
  powerUpCollectors: PowerUpCollectorContent[];
  emotionMazes: EmotionMazeContent[];
  strengthShields: StrengthShieldContent[];
  feelingVolcanoes: FeelingVolcanoContent[];
  // v6 NEW FUN INTERACTIVE LESSONS
  spinTheWheels: SpinTheWheelContent[];
  stickerCollectors: StickerCollectorContent[];
  mindfulAdventures: MindfulAdventureContent[];
  emotionDetectives: EmotionDetectiveContent[];
  balloonPops: BalloonPopContent[];
  treasureHunts: TreasureHuntContent[];
  monsterTamers: MonsterTamerContent[];
  gardenGrowers: GardenGrowerContent[];
  superheroCreators: SuperheroCreatorContent[];
  feelingsOrchestras: FeelingsOrchestraContent[];
  calmAquariums: CalmAquariumContent[];
  rocketLaunchers: RocketLauncherContent[];
  magicPotions: MagicPotionContent[];
  feelingsBingos: FeelingsBingoContent[];
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
  return escapeHtml(s)
    .replace(/\\/g, "\\\\")  // Escape backslashes first
    .replace(/`/g, "\\`")    // Escape backticks
    .replace(/\$/g, "\\$")   // Escape dollar signs to prevent ${} interpretation
    .replace(/'/g, "\\'");   // Escape single quotes for onclick handlers
}

// For use in onclick handlers where single quotes wrap the string
function escapeForOnclick(s: string): string {
  return (s ?? "")
    .replace(/\\/g, "\\\\")  // Escape backslashes first
    .replace(/'/g, "\\'")    // Escape single quotes
    .replace(/"/g, "&quot;") // Escape double quotes for HTML attribute
    .replace(/</g, "&lt;")   // Escape < for HTML safety
    .replace(/>/g, "&gt;");  // Escape > for HTML safety
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

function getAgeRangeKey(ageRange: string, ageData?: AgeRangeData): string {
  // Use age_range from database if available
  if (ageData?.age_range) {
    return ageData.age_range;
  }

  // Fall back to parsing the provided ageRange string
  const normalized = (ageRange || "").replace(/[–—]/g, "-").trim();
  const match = normalized.match(/(\d{1,2})\s*-\s*(\d{1,2})/);
  if (match) {
    return `${match[1]}-${match[2]}`;
  }

  return normalized;
}

function buildAgeRangeStyleGuide(ageRange: string, ageData?: AgeRangeData): string {
  const normalized = getAgeRangeKey(ageRange, ageData);
  switch (normalized) {
    case "6-8":
      return `
EARLY CHILDHOOD (6-8) — Concrete Learners
- Very short text blocks (1-2 sentences max per paragraph) with lots of line breaks.
- Simple, friendly words; avoid abstract terms unless explained with a concrete example.
- Use playful, reassuring tone with lots of encouragement.
- Activities should be highly guided with clear, single-step instructions.
- Prefer visuals, emojis, and imaginative play; minimal reading required.
- Limit concepts to "here and now" experiences (feelings, body cues, simple choices).
`.trim();
    case "9-11":
      return `
LATE CHILDHOOD (9-11) — Bridge Thinkers
- Short to medium text blocks (2-4 sentences).
- Introduce new vocabulary with quick definitions or examples.
- Balance playful tone with growing independence and responsibility.
- Activities can be 2-3 steps with light reflection.
- Encourage perspective-taking and cause-and-effect reasoning.
- Use relatable school/friend scenarios and simple problem-solving.
`.trim();
    case "12-14":
      return `
EARLY ADOLESCENCE (12-14) — Transition Thinkers
- Medium-length text blocks (3-5 sentences) with clear structure.
- Use more sophisticated vocabulary, but keep it approachable.
- Respect autonomy; avoid babyish phrasing.
- Activities can be multi-step with choice and self-directed reflection.
- Introduce abstract ideas (values, identity, beliefs) with concrete examples.
- Use peer/social dynamics and "real-life" challenges.
`.trim();
    case "15-18":
      return `
MID-LATE ADOLESCENCE (15-18) — Abstract Integrators
- Longer, structured text blocks (4-7 sentences) allowed when needed.
- Use mature, nuanced language; avoid oversimplification.
- Encourage metacognition, goal-setting, and personal agency.
- Activities can be multi-part with deeper reflection and planning.
- Emphasize abstract reasoning, systems thinking, and long-term consequences.
- Use authentic, teen-relevant contexts (relationships, stress, future planning).
`.trim();
    default:
      return `
AGE-SPECIFIC DIFFERENTIATION
- Match text length, vocabulary, and activity complexity to the stated age range.
- Ensure a clearly distinct tone and depth between age groups.
`.trim();
  }
}

/**
 * Returns age-specific formatting instructions for content generators.
 * These provide concrete, measurable requirements that differ by age group.
 */
function getAgeSpecificFormatting(ageRange: string, ageData?: AgeRangeData): {
  paragraphLength: string;
  sentenceCount: string;
  vocabularyLevel: string;
  toneDescription: string;
  instructionStyle: string;
  contentComplexity: string;
  welcomeParagraphs: string;
  lessonParagraphs: string;
  itemCount: string;
} {
  const normalized = getAgeRangeKey(ageRange, ageData);
  
  switch (normalized) {
    case "6-8":
      return {
        paragraphLength: "1-2 short sentences maximum per paragraph",
        sentenceCount: "Keep each sentence under 10 words when possible",
        vocabularyLevel: "Use only simple, everyday words a 6-year-old knows",
        toneDescription: "Super friendly, warm, and playful - like talking to a young friend",
        instructionStyle: "One simple step at a time, use 'Let's...' and 'Can you...'",
        contentComplexity: "Focus on feelings they can see/feel RIGHT NOW, use lots of emojis",
        welcomeParagraphs: "2 very short paragraphs (1-2 sentences each), big friendly energy",
        lessonParagraphs: "2 short paragraphs max (1-2 sentences each), use simple story examples",
        itemCount: "3-4 items maximum, each very short"
      };
    case "9-11":
      return {
        paragraphLength: "2-3 sentences per paragraph",
        sentenceCount: "Sentences can be 10-15 words",
        vocabularyLevel: "Simple vocabulary with occasional new words explained briefly",
        toneDescription: "Friendly and encouraging, treats them as capable learners",
        instructionStyle: "Clear 2-3 step instructions, can include 'why' briefly",
        contentComplexity: "Can introduce cause-and-effect, simple reflection questions",
        welcomeParagraphs: "2-3 paragraphs (2-3 sentences each)",
        lessonParagraphs: "2-3 paragraphs (2-3 sentences each), include relatable examples",
        itemCount: "4-5 items"
      };
    case "12-14":
      return {
        paragraphLength: "3-4 sentences per paragraph",
        sentenceCount: "Varied sentence length for natural flow",
        vocabularyLevel: "More sophisticated vocabulary, respecting their intelligence",
        toneDescription: "Supportive but not babyish, peer-like and respectful",
        instructionStyle: "Multi-step with some autonomy and choice",
        contentComplexity: "Can discuss abstract concepts with concrete examples, deeper reflection",
        welcomeParagraphs: "2-3 paragraphs (3-4 sentences each)",
        lessonParagraphs: "3 paragraphs (3-4 sentences each), more nuanced discussion",
        itemCount: "5-6 items"
      };
    case "15-18":
      return {
        paragraphLength: "4-5 sentences per paragraph when needed",
        sentenceCount: "Natural, mature sentence structures",
        vocabularyLevel: "Mature vocabulary, nuanced language",
        toneDescription: "Respectful, empowering, treats them as near-adults",
        instructionStyle: "Self-directed with meaningful choices and deeper exploration",
        contentComplexity: "Abstract reasoning, metacognition, long-term planning",
        welcomeParagraphs: "2-3 substantive paragraphs",
        lessonParagraphs: "3-4 paragraphs with depth and nuance",
        itemCount: "5-7 items with depth"
      };
    default:
      return {
        paragraphLength: "2-3 sentences per paragraph",
        sentenceCount: "Age-appropriate sentence length",
        vocabularyLevel: "Match vocabulary to stated age range",
        toneDescription: "Warm and encouraging",
        instructionStyle: "Clear and supportive",
        contentComplexity: "Appropriate for the age range",
        welcomeParagraphs: "2-3 paragraphs",
        lessonParagraphs: "2-3 paragraphs",
        itemCount: "4-5 items"
      };
  }
}

function getAgeDataText(
  ageData: AgeRangeData,
  snakeKey: keyof AgeRangeData,
  camelKey: keyof AgeRangeData
): string {
  const record = ageData as unknown as Record<string, unknown>;
  return String(record[snakeKey] ?? record[camelKey] ?? "");
}

function getAgeDataOptionalText(
  ageData: AgeRangeData,
  snakeKey: keyof AgeRangeData,
  camelKey: keyof AgeRangeData
): string | null {
  const record = ageData as unknown as Record<string, unknown>;
  const value = record[snakeKey] ?? record[camelKey];
  if (value == null) {
    return null;
  }
  return String(value);
}

/**
 * Builds an enhanced, psychology-informed content brief
 * NOW INCLUDES: secondary theories, diagnosis adaptations, NDIS, SEDI
 * CONTENT STYLE: Less text, less Daniel, more activities
 */
function buildEnhancedContentBrief(resolved: {
  title: string;
  ageRange: string;
  ageData: AgeRangeData;
  theoryData: CoreTheoryData;
  brainTownAnalogy: string;
  additionalContext: string;
  secondaryTheories?: string[];
  neuroscienceConcept?: string;
  diagnosisPathways?: string[];
  fasdStrategies?: string;
  ndisDomain?: string;
  dssSedi?: string;
  moduleObjective?: string;
  facilitatorTip?: string;
  reflectionPrompt?: string;
  rewardText?: string;
}): string {
  const { 
    ageData, theoryData, brainTownAnalogy, additionalContext, title, ageRange,
    secondaryTheories, neuroscienceConcept, diagnosisPathways, fasdStrategies,
    ndisDomain, dssSedi, moduleObjective, facilitatorTip, reflectionPrompt, rewardText
  } = resolved;
  
  const ageStyleGuide = buildAgeRangeStyleGuide(ageRange, ageData);
  const displayName = getAgeDataText(ageData, "display_name", "displayName");
  const languageGuidelines = getAgeDataText(ageData, "language_guidelines", "languageGuidelines");
  
  return `
=== MODULE BRIEF ===
Title: ${title}
Target Age: ${ageRange} (${displayName})
${moduleObjective ? `Objective: ${moduleObjective}` : ''}

=== CRITICAL CONTENT STYLE RULES ===
🚨 READ THESE FIRST - MOST IMPORTANT 🚨

1. SHORTER TEXT BLOCKS
   - Each paragraph: 2-4 sentences MAX
   - Each page should have small, scannable chunks
   - Break up long explanations into bite-sized pieces

2. LESS DANIEL DIALOGUE
   - Daniel appears OCCASIONALLY (2-3 times per module), not constantly
   - Most content is direct teaching, not Daniel talking
   - When Daniel does appear, keep it to 1-2 sentences
   - Example: ✅ "Daniel noticed his hands felt shaky." ❌ "Daniel said, 'Hey, I'm noticing my hands feel shaky, and I wonder what that means...'"

3. MORE ACTIVITIES, LESS READING
   - Prioritize interactive elements
   - Use visual cues, prompts, choices
   - Children should DO more than READ
   
4. CHUNK EVERYTHING
   - Use short paragraphs
   - Add visual breaks
   - One idea per section

=== PSYCHOLOGICAL FOUNDATION ===
PRIMARY THEORY: ${theoryData.theory_name}
${theoryData.description}

${secondaryTheories && secondaryTheories.length > 0 ? `SUPPORTING THEORIES: ${secondaryTheories.join(', ')}` : ''}

=== LANGUAGE GUIDELINES ===
${languageGuidelines}

${ageStyleGuide}

=== BRAIN TOWN ANALOGY ===
${brainTownAnalogy}

Keep Brain Town explanations SHORT (2-3 sentences max).

${neuroscienceConcept ? `=== NEUROSCIENCE TIE-IN ===
Include brief mention of: ${neuroscienceConcept}
Keep it simple - 1-2 sentences only.
` : ''}

${diagnosisPathways && diagnosisPathways.length > 0 ? `=== DIAGNOSIS ADAPTATIONS ===
Adapt for: ${diagnosisPathways.map(d => d.toUpperCase()).join(', ')}

${diagnosisPathways.includes('fasd') ? (fasdStrategies ? `FASD: ${fasdStrategies}` : 'FASD: Use concrete visuals, one-step instructions, memory scaffolds') : ''}
${diagnosisPathways.includes('adhd') ? 'ADHD: Minimal text, movement breaks, chunked info' : ''}
${diagnosisPathways.includes('asd') ? 'ASD: Literal language, explicit instructions, clear structure' : ''}
${diagnosisPathways.includes('pda') ? 'PDA: Offer choices, avoid directives, respect autonomy' : ''}
${diagnosisPathways.includes('trauma') ? 'Trauma: Safety first, no surprises, clear opt-outs' : ''}
` : ''}

${ndisDomain || dssSedi ? `=== OUTCOME FRAMEWORKS ===
${ndisDomain ? `NDIS Domain: ${ndisDomain}` : ''}
${dssSedi ? `DSS SEDI: ${dssSedi}` : ''}
` : ''}

${facilitatorTip ? `=== FACILITATOR GUIDANCE ===
${facilitatorTip}
` : ''}

=== GENERATION RULES ===
1. Keep ALL paragraphs SHORT (2-4 sentences MAX)
2. Use Daniel SPARINGLY - 2-3 brief appearances per module
3. Focus on ACTIVITIES over explanations
4. Break content into SMALL chunks
5. More DOING, less READING
6. Apply ${theoryData.theory_name} theory correctly
7. Use Brain Town analogy but keep brief

${reflectionPrompt ? `Reflection: "${reflectionPrompt}"` : ''}
${rewardText ? `Reward: "${rewardText}"` : ''}
`.trim();
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
 * Activities are selected from 5 CATEGORIES for maximum diversity:
 * - CORE: Classic activities (checklist, quiz, reflection, etc.)
 * - FEELINGS: Emotional awareness activities 
 * - CREATIVE: Artistic/building activities
 * - COGNITIVE: Thinking/problem-solving activities
 * - CHALLENGE: v5 interactive game-like challenges
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
  
  // v5 NEW CHALLENGE activities (interactive games)
  const challengeActivities: PageTemplate[] = [
    { type: "weather-controller",  starReward: true },
    { type: "power-up-collector",  starReward: true },
    { type: "emotion-maze",        starReward: true },
    { type: "strength-shield",     starReward: true },
    { type: "feeling-volcano",     starReward: true },
  ];

  // v7 NEW HIGHLY INTERACTIVE GAME activities (the fun, engaging ones!)
  const gameActivities: PageTemplate[] = [
    { type: "balloon-pop",         starReward: true },
    { type: "treasure-hunt",       starReward: true },
    { type: "monster-tamer",       starReward: true },
    { type: "garden-grower",       starReward: true },
    { type: "superhero-creator",   starReward: true },
    { type: "feelings-orchestra",  starReward: true },
    { type: "calm-aquarium",       starReward: true },
    { type: "rocket-launcher",     starReward: true },
    { type: "magic-potion",        starReward: true },
    { type: "feelings-bingo",      starReward: true },
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
  
  // v5: Always include 1-2 challenge activities for engagement
  const shuffledChallenge = shuffleArray(challengeActivities);
  selectedActivities.push(...shuffledChallenge.slice(0, randomInt(1, 2)));

  // v7: ALWAYS include 2-3 highly interactive game activities - these are the engaging ones!
  const shuffledGames = shuffleArray(gameActivities);
  selectedActivities.push(...shuffledGames.slice(0, randomInt(2, 3)));
  
  type ActivityStage = "intro" | "practice" | "apply";
  const activityStages: Partial<Record<PageType, ActivityStage>> = {
    "feeling-thermometer": "intro",
    "body-map": "intro",
    "feeling-selector": "intro",
    "emoji-check-in": "intro",
    "reflection": "intro",
    "breathing": "intro",
    "checklist": "practice",
    "quiz": "practice",
    "drawing": "practice",
    "scenario": "practice",
    "fill-in-story": "practice",
    "coping-cards": "practice",
    "gratitude-jar": "practice",
    "sorting-activity": "practice",
    "thought-bubbles": "practice",
    "word-scramble": "practice",
    "agree-disagree": "practice",
    "comic-strip": "practice",
    "affirmation-builder": "practice",
    "matching-activity": "practice",
    "calm-den-builder": "practice",
    "action-plan": "apply",
    "warning-signs": "apply",
    "weather-controller": "apply",
    "power-up-collector": "apply",
    "emotion-maze": "apply",
    "strength-shield": "apply",
    "feeling-volcano": "apply",
    "spin-the-wheel": "apply",
    "sticker-collector": "apply",
    "mindful-adventure": "apply",
    "emotion-detective": "apply",
    "balloon-pop": "apply",
    "treasure-hunt": "apply",
    "monster-tamer": "apply",
    "garden-grower": "apply",
    "superhero-creator": "apply",
    "feelings-orchestra": "apply",
    "calm-aquarium": "apply",
    "rocket-launcher": "apply",
    "magic-potion": "apply",
    "feelings-bingo": "apply",
  };

  const stageOrder: ActivityStage[] = ["intro", "practice", "apply"];
  const stagedActivities = stageOrder.flatMap((stage) =>
    shuffleArray(selectedActivities.filter((activity) => (activityStages[activity.type] ?? "practice") === stage))
  );

  // Keep a light shuffle within each stage but preserve overall progression order
  const activities = stagedActivities.length > 0 ? stagedActivities : shuffleArray(selectedActivities);
  
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
// EXPORTS
// ====================

export {
  // Types
  type PageType,
  type PageTemplate,
  type ModuleMetadata,
  type SeriesInfo,
  type GeneratedContent,
  type LessonContent,
  type ChapterDivider,
  type ChecklistContent,
  type ReflectionContent,
  type QuizContent,
  type DrawingContent,
  type BreathingContent,
  type ScenarioContent,
  type SummaryContent,
  type CompletionContent,
  type FeelingThermometerContent,
  type BodyMapContent,
  type FeelingSelectorContent,
  type CalmDenBuilderContent,
  type ActionPlanContent,
  type WarningSingsContent,
  type MatchingActivityContent,
  type InteractiveLessonContent,
  type FillInStoryContent,
  type CopingCardsContent,
  type GratitudeJarContent,
  type SortingActivityContent,
  type ThoughtBubblesContent,
  type EmojiCheckInContent,
  type WordScrambleContent,
  type AgreeDisagreeContent,
  type ComicStripContent,
  type AffirmationBuilderContent,
  type WeatherControllerContent,
  type PowerUpCollectorContent,
  type EmotionMazeContent,
  type StrengthShieldContent,
  type FeelingVolcanoContent,
  type SpinTheWheelContent,
  type StickerCollectorContent,
  type MindfulAdventureContent,
  type EmotionDetectiveContent,
  type BalloonPopContent,
  type TreasureHuntContent,
  type MonsterTamerContent,
  type GardenGrowerContent,
  type SuperheroCreatorContent,
  type FeelingsOrchestraContent,
  type CalmAquariumContent,
  type RocketLauncherContent,
  type MagicPotionContent,
  type FeelingsBingoContent,
  type AgeRangeData,
  type CoreTheoryData,
  buildEnhancedContentBrief,
  
  // Configuration
  corsHeaders,
  CLAUDE_MODEL,
  CLAUDE_TEMPERATURE,
  TOKENS_METADATA,
  TOKENS_LESSON_BATCH,
  TOKENS_ACTIVITY,
  JOB_TIMEOUT_MS,
  CACHE_TTL_MS,
  MIN_PAGES,
  MAX_PAGES,
  
  // Utilities
  jsonResponse,
  escapeHtml,
  escapeForTemplate,
  escapeForOnclick,
  cleanJsonResponse,
  safeJsonParse,
  randomInt,
  shuffleArray,
  getAgeRangeKey,
  getAgeSpecificFormatting,
  
  // Claude API
  getSettings,
  callClaude,
  
  // Page Structure
  generatePageStructure,
};