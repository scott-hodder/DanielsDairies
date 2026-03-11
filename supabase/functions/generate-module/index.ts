/**
 * AI Module Generator - HTML Rendering & Main Handler
 * ====================================================
 * 
 * This file contains:
 * - All HTML page render functions
 * - Main HTML template with CSS and JavaScript
 * - HTTP request handler
 * - Async job runner
 * 
 * Content generation is in a separate file: generators.ts
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import {
  // Types
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
  type VerificationReport,
  type ModuleSummary,
  type GrownUpNote,
  buildEnhancedContentBrief,
  
  // Configuration
  corsHeaders,
  JOB_TIMEOUT_MS,
  
  // Utilities
  jsonResponse,
  escapeHtml,
  escapeForTemplate,
  escapeForOnclick,
  
  // Claude API
  getSettings,
  
  // Page Structure & Content Generation
  generatePageStructure,
  generateAllContent,
} from "./generators.ts";
import { generatePaletteFromColor, type CategoryPalette } from "./palettes.ts";

// ====================
// HTML RENDERER

function getAgeRangeKey(targetAge?: string): string {
  if (!targetAge) {
    return "6-8";
  }
  const normalized = targetAge.replace(/[–—]/g, "-").trim();
  const match = normalized.match(/(\d{1,2})\s*-\s*(\d{1,2})/);
  if (match) {
    return `${match[1]}-${match[2]}`;
  }
  return normalized || "6-8";
}

function extractTitleFromContentBrief(contentBrief?: string): string | null {
  if (!contentBrief) return null;
  const titleMatch = contentBrief.match(/^Title:\s*(.+)$/im);
  const title = titleMatch?.[1]?.trim();
  return title || null;
}

function firstNonEmptyString(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return "";
}

function firstPresent<T>(...values: Array<T | null | undefined>): T | null {
  for (const value of values) {
    if (value !== null && value !== undefined) {
      return value;
    }
  }
  return null;
}

function renderHtml(content: GeneratedContent, pageStructure: PageTemplate[], moduleCode: string, categoryColor?: string | null, seriesInfo?: SeriesInfo | null): string {
  const { metadata } = content;
  const palette = generatePaletteFromColor(categoryColor);
  const ageRangeKey = getAgeRangeKey(metadata.targetAge);
  
  // Helper function to render character (image or emoji)
  const renderCharacter = (size: string = 'text-6xl') => {
    if (seriesInfo?.character_image_url) {
      return `<img src="${escapeForTemplate(seriesInfo.character_image_url)}" alt="${escapeForTemplate(metadata.characterName)}" class="object-contain mx-auto m-character-img">`;
    }
    return `<span class="${size}">${escapeForTemplate(metadata.characterEmoji)}</span>`;
  };
  
  /**
   * Helper function to render a grown-up note accordion
   * Returns empty string if no note exists for this page
   */
  const renderGrownUpNote = (pageIndex: number): string => {
    const note = content.grownUpNotes?.[pageIndex];
    if (!note) return '';
    
    const accordionId = `grownup-note-${pageIndex}`;
    const promptsHtml = note.parentPrompts.map(prompt => 
      `<li class="mb-1">"${escapeForTemplate(prompt)}"</li>`
    ).join('');
    
    return `
      <div class="mt-6 rounded-xl border-2 overflow-hidden" style="border-color: var(--secondary); background-color: rgba(255,255,255,0.7);">
        <button 
          onclick="toggleGrownUpNote('${accordionId}')"
          class="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-white/50 transition-colors m-color-secondary"
        >
          <span class="flex items-center gap-2 font-semibold text-sm">
            <span>👨‍👩‍👧</span>
            <span>Grown-Up Note</span>
          </span>
          <svg id="${accordionId}-icon" class="w-5 h-5 transform transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
          </svg>
        </button>
        <div id="${accordionId}" class="hidden px-4 pb-4">
          <div class="text-xs font-semibold uppercase tracking-wide mb-2 m-color-secondary">
            ${escapeForTemplate(note.evidenceBase)}
          </div>
          <p class="text-sm mb-3 m-color-dark">
            ${escapeForTemplate(note.briefExplanation)}
          </p>
          <div class="text-xs font-semibold uppercase tracking-wide mb-1 m-color-secondary">
            Try asking:
          </div>
          <ul class="text-sm list-disc list-inside m-color-dark">
            ${promptsHtml}
          </ul>
        </div>
      </div>`;
  };
  
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
    // v5 NEW CHALLENGE INDICES
    weatherController: 0,
    powerUpCollector: 0,
    emotionMaze: 0,
    strengthShield: 0,
    feelingVolcano: 0,
    balloonPop: 0,
    treasureHunt: 0,
    monsterTamer: 0,
    gardenGrower: 0,
    superheroCreator: 0,
    feelingsOrchestra: 0,
    calmAquarium: 0,
    rocketLauncher: 0,
    magicPotion: 0,
    feelingsBingo: 0,
    spinTheWheel: 0,
    stickerCollector: 0,
    mindfulAdventure: 0,
    emotionDetective: 0,
    star: 0,
  };
  
  // Build page functions - using function body strings, not template literals
  const pageFunctions: string[] = [];
  
  for (let pageIndex = 0; pageIndex < pageStructure.length; pageIndex++) {
    const template = pageStructure[pageIndex];
    let pageHtml = "";
    
    switch (template.type) {
      case "cover":
        pageHtml = renderCoverPage(content, seriesInfo);
        break;
      case "welcome":
        pageHtml = renderWelcomePage(content, seriesInfo);
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
      // v5 NEW CHALLENGE PAGE TYPES
      case "weather-controller":
        pageHtml = renderWeatherControllerPage(content.weatherControllers[indices.weatherController] || content.weatherControllers[0], indices.star, metadata);
        indices.weatherController++;
        indices.star++;
        break;
      case "power-up-collector":
        pageHtml = renderPowerUpCollectorPage(content.powerUpCollectors[indices.powerUpCollector] || content.powerUpCollectors[0], indices.star, metadata);
        indices.powerUpCollector++;
        indices.star++;
        break;
      case "emotion-maze":
        pageHtml = renderEmotionMazePage(content.emotionMazes[indices.emotionMaze] || content.emotionMazes[0], indices.star, metadata);
        indices.emotionMaze++;
        indices.star++;
        break;
      case "strength-shield":
        pageHtml = renderStrengthShieldPage(content.strengthShields[indices.strengthShield] || content.strengthShields[0], indices.star, metadata);
        indices.strengthShield++;
        indices.star++;
        break;
      case "feeling-volcano":
        pageHtml = renderFeelingVolcanoPage(content.feelingVolcanoes[indices.feelingVolcano] || content.feelingVolcanoes[0], indices.star, metadata);
        indices.feelingVolcano++;
        indices.star++;
        break;
      
        // v6 ACTIVITY TYPES
      case "spin-the-wheel":
        pageHtml = renderSpinTheWheelPage(content.spinTheWheels[indices.spinTheWheel] || content.spinTheWheels[0], indices.star, metadata);
        indices.spinTheWheel++;
        indices.star++;
        break;
      case "sticker-collector":
        pageHtml = renderStickerCollectorPage(content.stickerCollectors[indices.stickerCollector] || content.stickerCollectors[0], indices.star, metadata);
        indices.stickerCollector++;
        indices.star++;
        break;
      case "mindful-adventure":
        pageHtml = renderMindfulAdventurePage(content.mindfulAdventures[indices.mindfulAdventure] || content.mindfulAdventures[0], indices.star, metadata);
        indices.mindfulAdventure++;
        indices.star++;
        break;
      case "emotion-detective":
        pageHtml = renderEmotionDetectivePage(content.emotionDetectives[indices.emotionDetective] || content.emotionDetectives[0], indices.star, metadata);
        indices.emotionDetective++;
        indices.star++;
        break;

       // v7 NEW GAME PAGE TYPES
      case "balloon-pop":
        pageHtml = renderBalloonPopPage(content.balloonPops[indices.balloonPop] || content.balloonPops[0], indices.star, metadata);
        indices.balloonPop++;
        indices.star++;
        break;
      case "treasure-hunt":
        pageHtml = renderTreasureHuntPage(content.treasureHunts[indices.treasureHunt] || content.treasureHunts[0], indices.star, metadata);
        indices.treasureHunt++;
        indices.star++;
        break;
      case "monster-tamer":
        pageHtml = renderMonsterTamerPage(content.monsterTamers[indices.monsterTamer] || content.monsterTamers[0], indices.star, metadata);
        indices.monsterTamer++;
        indices.star++;
        break;
      case "garden-grower":
        pageHtml = renderGardenGrowerPage(content.gardenGrowers[indices.gardenGrower] || content.gardenGrowers[0], indices.star, metadata);
        indices.gardenGrower++;
        indices.star++;
        break;
      case "superhero-creator":
        pageHtml = renderSuperheroCreatorPage(content.superheroCreators[indices.superheroCreator] || content.superheroCreators[0], indices.star, metadata);
        indices.superheroCreator++;
        indices.star++;
        break;
      case "feelings-orchestra":
        pageHtml = renderFeelingsOrchestraPage(content.feelingsOrchestras[indices.feelingsOrchestra] || content.feelingsOrchestras[0], indices.star, metadata);
        indices.feelingsOrchestra++;
        indices.star++;
        break;
      case "calm-aquarium":
        pageHtml = renderCalmAquariumPage(content.calmAquariums[indices.calmAquarium] || content.calmAquariums[0], indices.star, metadata);
        indices.calmAquarium++;
        indices.star++;
        break;
      case "rocket-launcher":
        pageHtml = renderRocketLauncherPage(content.rocketLaunchers[indices.rocketLauncher] || content.rocketLaunchers[0], indices.star, metadata);
        indices.rocketLauncher++;
        indices.star++;
        break;
      case "magic-potion":
        pageHtml = renderMagicPotionPage(content.magicPotions[indices.magicPotion] || content.magicPotions[0], indices.star, metadata);
        indices.magicPotion++;
        indices.star++;
        break;
      case "feelings-bingo":
        pageHtml = renderFeelingsBingoPage(content.feelingsBingos[indices.feelingsBingo] || content.feelingsBingos[0], indices.star, metadata);
        indices.feelingsBingo++;
        indices.star++;
        break;
      case "summary":
        pageHtml = renderSummaryPage(content.summary, metadata);
        break;
      case "completion":
        pageHtml = renderCompletionPage(content.completion, metadata);
        break;
       
    }
    
    // Inject grown-up note if this page has one
    // Insert before the closing </div> of the max-w-4xl container
    const grownUpNoteHtml = renderGrownUpNote(pageIndex);
    if (grownUpNoteHtml && pageHtml.includes('</div>')) {
      // Find the last </div></div> pattern (end of content container)
      const lastDivPattern = /<\/div>\s*<\/div>\s*$/;
      if (lastDivPattern.test(pageHtml)) {
        pageHtml = pageHtml.replace(lastDivPattern, `${grownUpNoteHtml}</div></div>`);
      }
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
  <!-- CATEGORY_COLOR: ${categoryColor || 'NOT_PROVIDED'} -->
  <!-- PALETTE: primary=${palette.primary} secondary=${palette.secondary} accent=${palette.accent} -->
  
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
  <link rel="stylesheet" href="./modules/shared/module-utilities.css">
  
  <style>
    /* Brand Colors - Dynamic based on category */
    :root {
      --primary: ${palette.primary};
      --secondary: ${palette.secondary};
      --accent: ${palette.accent};
      --dark: #264653;
      --cream: ${palette.cream};
      --light-green: #A8E6CF;
      --soft-yellow: ${palette.softYellow};
      --success: #A8E6CF;
    }
    
    /* Typography */
    .font-title { font-family: 'Fredoka One', cursive; }
    .font-body { font-family: 'Nunito', sans-serif; }
    body { font-family: 'Nunito', sans-serif; background: var(--cream); }
    h1, h2, h3, h4, h5, h6 { font-family: 'Fredoka One', cursive; }
    
    /* Page Layout */
    .page { min-height: 100vh; padding-top: 80px; padding-bottom: 100px; }
    .page.chapter-scene-page { min-height: 0 !important; height: calc(100vh - 75px) !important; max-height: calc(100vh - 75px) !important; padding: 0 !important; overflow: hidden !important; }
    
    /* Animations */
    @keyframes bounce-slow {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-10px); }
    }
    .animate-bounce-slow { animation: bounce-slow 2s ease-in-out infinite; }
    
    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      15% { transform: translateX(-8px); }
      30% { transform: translateX(8px); }
      45% { transform: translateX(-6px); }
      60% { transform: translateX(6px); }
      75% { transform: translateX(-3px); }
      90% { transform: translateX(3px); }
    }
    
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
    .quiz-answer.selected.correct { background-color: var(--success) !important; border-color: var(--secondary) !important; }
    .quiz-answer.selected.incorrect { background-color: #fecaca !important; border-color: var(--accent) !important; }
    
    /* Scenario Styles */
    .scenario-option.selected.good { background-color: var(--success) !important; }
    .scenario-option.selected.not-good { background-color: #fef3c7 !important; }
    
    /* Interactive Option Styles */
    .interactive-option { background-color: white; }
    .interactive-option.option-selected { background-color: var(--success) !important; }
    .interactive-option.option-incorrect { background-color: #fecaca !important; }
    
    /* Print Styles */
    @media print {
      .no-print { display: none !important; }
      .page { page-break-after: always; min-height: 100vh; }
    }
  </style>
</head>
<body class="module-theme" data-series="${escapeHtml(metadata.series || "custom")}" data-age-range="${escapeHtml(ageRangeKey)}">
  <div id="moduleHeaderRoot"></div>
  
  <main class="module-content">
    <section id="pageContainer"></section>
  </main>
  
  <script type="module">
    // Import external module header component
    import { initModuleHeader } from './modules/shared/module-header.js';
    
    // Embedded module functions (no external dependencies)
    
    // Module database functions - stub implementation for local preview
    async function initializeModule() {
      return true;
    }

    async function loadStarsFromDB() {
      const saved = localStorage.getItem('moduleStars');
      return saved ? parseInt(saved, 10) : 0;
    }

    async function saveStarsToDB(stars) {
      localStorage.setItem('moduleStars', String(stars));
      return stars;
    }

    async function awardSingleStar(currentStars) {
      const newStars = currentStars + 1;
      await saveStarsToDB(newStars);
      return newStars;
    }

    async function resolveChildDisplayName() {
      const params = new URLSearchParams(window.location.search);
      return params.get('childName') || 'Friend';
    }

    async function getChildId() {
      const params = new URLSearchParams(window.location.search);
      return params.get('childId') || 'unknown';
    }

    async function completeModuleDB() {
      // Stub implementation - just mark as completed
      localStorage.setItem('moduleCompleted', 'true');
      return true;
    }
    
    // Module completion handling
    let moduleCompletionHandled = false;

    function handleModuleCompletion() {
      // Prevent multiple completions
      if (moduleCompletionHandled) {
        return;
      }
      moduleCompletionHandled = true;


      // Get module parameters from URL
      try {
        const params = new URLSearchParams(window.location.search);
        const childId = params.get('childId');
        const moduleId = params.get('moduleId');
        
        
        if (childId && moduleId) {
          // Mark module as completed
          completeModule(childId, moduleId);
        } else {
          console.error('[ModuleHeader] Missing childId or moduleId in URL');
        }
      } catch (error) {
        console.error('[ModuleHeader] Error parsing URL for module completion:', error);
      }
    }

    async function completeModule(childId, moduleId) {
      try {
        // Use the completeModuleDB function for generated modules
        if (typeof window.completeModuleDB === 'function') {
          await window.completeModuleDB();
        }
        
        
        // Navigate back to dashboard
        goHome();
      } catch (error) {
        console.error('[ModuleHeader] Error completing module:', error);
      }
    }

    function showCompletionCelebration() {
      try {
        // Create celebration modal
        const celebrationModal = document.createElement('div');
        celebrationModal.className = 'module-completion-modal';
        celebrationModal.innerHTML = '<div class="module-completion-content"><div class="completion-emoji">🎉</div><h2 class="completion-title">Module Complete!</h2><p class="completion-message">Congratulations! You have finished this module and learned valuable emotional skills.</p><div class="completion-confetti" id="completionConfetti"></div><button class="completion-btn" onclick="closeCompletionModal()">Continue Journey</button></div>';
        
        document.body.appendChild(celebrationModal);
        
        // Generate confetti
        if (typeof generateCompletionConfetti === 'function') {
          generateCompletionConfetti();
        }
        
        // Auto-close after 5 seconds
        setTimeout(() => {
          closeCompletionModal();
        }, 5000);
      } catch (e) {
        console.error('Error showing completion celebration:', e);
      }
    }

    function generateCompletionConfetti() {
      const container = document.getElementById('completionConfetti');
      if (!container) return;
      
      container.innerHTML = '';
      const pieceCount = 40;
      
      for (let i = 0; i < pieceCount; i++) {
        const piece = document.createElement('div');
        piece.className = 'completion-confetti-piece';
        
        const randomX = Math.random() * 300 - 150;
        const randomDelay = Math.random() * 0.3;
        const colors = ['#f4a261', '#e76f51', '#2a9d8f', '#405878', '#4c6c96', '#ab47bc'];
        const randomColor = colors[Math.floor(Math.random() * colors.length)];
        
        piece.style.left = Math.random() * 100 + '%';
        piece.style.top = Math.random() * 50 + '%';
        piece.style.setProperty('--tx', randomX + 'px');
        piece.style.animationDelay = randomDelay + 's';
        piece.style.backgroundColor = randomColor;
        
        container.appendChild(piece);
      }
    }

    // Make close function globally accessible
    window.closeCompletionModal = function() {
      const modal = document.querySelector('.module-completion-modal');
      if (modal) {
        modal.remove();
      }
    };
    
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
    
    // Check if current page has an uncompleted required activity
    function getCurrentPageActivityStatus() {
      const page = document.querySelector('.page');
      if (!page) return { hasActivity: false, isComplete: true };
      
      // Check for activity checkbox on the page
      const activityCheckbox = page.querySelector('[data-activity]');
      if (!activityCheckbox) return { hasActivity: false, isComplete: true };
      
      const activityId = activityCheckbox.getAttribute('data-activity');
      const isComplete = completedActivities[activityId] || activityCheckbox.checked;
      
      return { hasActivity: true, isComplete, activityId };
    }
    
    // Show a gentle reminder to complete the activity
    function showActivityReminder() {
      // Remove any existing reminder
      const existing = document.querySelector('.activity-reminder');
      if (existing) existing.remove();
      
      const reminder = document.createElement('div');
      reminder.className = 'activity-reminder';
      reminder.innerHTML = \`
        <div style="position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); 
                    background: var(--primary); color: white; padding: 16px 24px; 
                    border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.2); 
                    z-index: 9999; font-family: var(--font-body); font-size: 1rem;
                    display: flex; align-items: center; gap: 10px;">
          <span class="m-toast__emoji">✨</span>
          <span>Complete the activity first to continue!</span>
        </div>
      \`;
      document.body.appendChild(reminder);
      
      // Auto-remove after 3 seconds
      setTimeout(() => reminder.remove(), 3000);
      
      // Scroll to the activity checkbox
      const activityCheckbox = document.querySelector('[data-activity]');
      if (activityCheckbox) {
        activityCheckbox.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Add a brief highlight effect
        const parent = activityCheckbox.closest('.rounded-xl, .rounded-2xl, div');
        if (parent) {
          parent.style.transition = 'box-shadow 0.3s';
          parent.style.boxShadow = '0 0 0 3px var(--primary)';
          setTimeout(() => { parent.style.boxShadow = ''; }, 2000);
        }
      }
    }
    
    // Navigation
    function nextPage() {
      if (currentPage < pages.length - 1) {
        // Check if current page requires activity completion
        const status = getCurrentPageActivityStatus();
        if (status.hasActivity && !status.isComplete) {
          showActivityReminder();
          return;
        }
        
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
        // Only check activity completion when moving forward
        if (pageNum > currentPage) {
          const status = getCurrentPageActivityStatus();
          if (status.hasActivity && !status.isComplete) {
            showActivityReminder();
            return;
          }
        }
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
      const certificateDateEl = document.getElementById('certificateDate');
      if (certificateDateEl) {
        const savedDate = formData.certificateDate || new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
        certificateDateEl.textContent = savedDate;
        if (!formData.certificateDate) saveFormData('certificateDate', savedDate);
      }
    }
    
    // Restore form values from localStorage
    function restoreFormState() {
      // Restore all text inputs with data-form-key
      document.querySelectorAll('input[type="text"][data-form-key]').forEach(input => {
        const key = input.getAttribute('data-form-key');
        if (key && formData[key]) {
          input.value = formData[key];
        }
      });
      
      // Restore all text inputs by parsing onchange
      document.querySelectorAll('input[type="text"]').forEach(input => {
        const onchange = input.getAttribute('onchange') || '';
        const match = onchange.match(/saveFormData\\(['"]([^'"]+)['"]/);
        if (match && formData[match[1]]) {
          input.value = formData[match[1]];
        }
      });
      
      // Restore all textareas with data-form-key
      document.querySelectorAll('textarea[data-form-key]').forEach(textarea => {
        const key = textarea.getAttribute('data-form-key');
        if (key && formData[key]) {
          textarea.value = formData[key];
        }
      });
      
      // Restore all textareas by parsing onchange
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
      
      // Restore completed activity checkboxes
      document.querySelectorAll('input[type="checkbox"][data-activity]').forEach(checkbox => {
        const activityId = checkbox.getAttribute('data-activity');
        if (activityId && completedActivities[activityId]) {
          checkbox.checked = true;
          checkbox.disabled = true;
        }
      });

      // Restore drawing canvases from cache
      document.querySelectorAll('.drawing-canvas[data-drawing-key], .comic-drawing-canvas[data-drawing-key]').forEach(canvas => {
        const drawingKey = canvas.getAttribute('data-drawing-key');
        if (!drawingKey || !formData[drawingKey]) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const img = new Image();
        img.onload = () => {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        };
        img.src = formData[drawingKey];
      });

      // Restore strength shield completion visibility
      const shieldPage = document.querySelector('[data-page="strength-shield"]');
      if (shieldPage) {
        const shieldInputs = shieldPage.querySelectorAll('.shield-input');
        const totalSections = shieldInputs.length;
        const filled = Array.from(shieldInputs).filter(input => input.value.trim().length > 0).length;
        const progressEl = document.getElementById('shieldProgress');
        if (progressEl) progressEl.textContent = String(filled);
        const shieldActivityId = shieldPage.getAttribute('data-activity') || '';
        if (shieldActivityId) {
          const savedDecorations = (formData['shield_' + shieldActivityId + '_decorations'] || '').split(',').filter(Boolean);
          if (savedDecorations.length) {
            const display = document.getElementById('shieldDecorations');
            if (display) {
              display.innerHTML = '🛡️';
              savedDecorations.forEach(emoji => {
                const span = document.createElement('span');
                span.textContent = emoji;
                span.style.display = 'inline-block';
                span.style.margin = '2px';
                display.appendChild(span);
              });
            }
          }
        }
        if (filled >= totalSections && totalSections > 0) {
          const win = document.getElementById('shieldWin');
          const complete = document.getElementById('shieldComplete');
          if (win) win.style.display = 'block';
          if (complete) complete.style.display = 'flex';
        }
      }

      // Restore potion state and brewed result visibility
      const potionPage = document.querySelector('[data-page="magic-potion"]');
      if (potionPage) {
        const activityId = potionPage.getAttribute('data-activity') || '';
        const starIndex = activityId.split('_')[1];
        if (starIndex) {
          const savedIngredients = formData['potion_' + starIndex + '_ingredients'];
          if (savedIngredients) {
            const cauldron = document.getElementById('cauldron_' + starIndex);
            if (cauldron) {
              cauldron.innerHTML = savedIngredients
                .split(',')
                .filter(Boolean)
                .map(emoji => '<span class="text-4xl">' + emoji + '</span>')
                .join('');
            }
          }

          if (formData['potion_' + starIndex + '_brewed'] === 'true') {
            const result = document.getElementById('potionResult_' + starIndex);
            const complete = document.getElementById('potionComplete_' + starIndex);
            if (result) result.style.display = 'block';
            if (complete) complete.style.display = 'flex';
          }
        }
      }

      // Restore volcano state and UI
      const volcanoPage = document.querySelector('[data-page="feeling-volcano"]');
      if (volcanoPage) {
        const activityId = volcanoPage.getAttribute('data-activity') || '';
        const savedTemp = Number(formData['volcano_' + activityId]);
        if (!Number.isNaN(savedTemp) && savedTemp >= 0) {
          volcanoTemp = savedTemp;
          const tempEl = document.getElementById('volcanoTemp');
          const lavaEl = document.getElementById('volcanoLava');
          const indicatorEl = document.getElementById('volcanoIndicator');
          if (tempEl) tempEl.textContent = String(volcanoTemp);
          if (lavaEl) lavaEl.style.opacity = String(Math.max(0, Math.min(1, volcanoTemp / 100)));
          const emojis = ['😌', '😊', '😤', '🔥', '🌋'];
          const level = Math.max(1, Math.ceil(volcanoTemp / 25));
          if (indicatorEl) indicatorEl.textContent = emojis[Math.min(level, 4)];
          for (let i = 1; i <= 5; i++) {
            const lvl = document.getElementById('volcanoLevel' + i);
            if (lvl) lvl.classList.toggle('active', i === level);
          }
          if (volcanoTemp <= 0) {
            const safeEl = document.getElementById('volcanoSafe');
            const completeEl = document.getElementById('volcanoComplete');
            if (safeEl) safeEl.style.display = 'block';
            if (completeEl) completeEl.style.display = 'flex';
          }
        }
      }
      
      // Update child name display
      const childNameEl = document.getElementById('childNameDisplay');
      if (childNameEl) {
        childNameEl.textContent = getChildName();
      }
      
      // Restore button selections (rate-scale only - not polls, as those should be re-answered)
      Object.keys(formData).forEach(key => {
        if (key.startsWith('rate_')) {
          const buttons = document.querySelectorAll('.interactive-option');
          buttons.forEach(btn => {
            if (btn.textContent.trim() === String(formData[key])) {
              btn.classList.add('option-selected');
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
            if (formData[key] === 'agree' && btns[0]) btns[0].classList.add('option-selected');
            if (formData[key] === 'disagree' && btns[1]) btns[1].classList.add('option-incorrect');
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
    
    // Toggle grown-up note accordion
    function toggleGrownUpNote(accordionId) {
      const content = document.getElementById(accordionId);
      const icon = document.getElementById(accordionId + '-icon');
      if (content && icon) {
        const isHidden = content.classList.contains('hidden');
        content.classList.toggle('hidden');
        icon.style.transform = isHidden ? 'rotate(180deg)' : 'rotate(0deg)';
      }
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
      star.innerHTML = '⭐';
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

      // Matching activity
      document.querySelectorAll('.matching-activity').forEach(activity => {
        initMatchingActivity(activity);
      });
      
      // Drawing canvas - init ALL drawing canvases (not just the first)
      document.querySelectorAll('.drawing-canvas').forEach(canvas => {
        initDrawingCanvas(canvas);
      });
      
      // Comic strip canvases
      document.querySelectorAll('.comic-drawing-canvas').forEach(canvas => {
        initDrawingCanvas(canvas);
      });

      // Volcano drag and drop
      const volcanoPage = document.querySelector('[data-page="feeling-volcano"]');
      if (volcanoPage) {
        const dropZone = volcanoPage.querySelector('.volcano-drop-zone');
        const tools = volcanoPage.querySelectorAll('.cooling-action[draggable="true"]');
        let draggedTool = null;

        tools.forEach(tool => {
          tool.addEventListener('dragstart', () => {
            draggedTool = tool;
            tool.classList.add('opacity-70');
          });
          tool.addEventListener('dragend', () => {
            tool.classList.remove('opacity-70');
          });
        });

        if (dropZone) {
          dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('ring-4');
            dropZone.style.setProperty('box-shadow', '0 0 0 4px rgba(76,108,150,0.35)');
          });
          dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('ring-4');
            dropZone.style.boxShadow = 'none';
          });
          dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('ring-4');
            dropZone.style.boxShadow = 'none';
            if (!draggedTool) return;
            const activityId = dropZone.getAttribute('data-activity-id');
            const power = Number(draggedTool.getAttribute('data-power') || '0');
            if (!activityId || power <= 0) return;
            window.handleVolcanoCool(draggedTool, activityId, power);
          });
        }
      }
    }

    function initMatchingActivity(activity) {
      const board = activity.querySelector('.matching-board');
      const svg = activity.querySelector('.matching-lines');
      const leftItems = Array.from(activity.querySelectorAll('.match-item-left'));
      const rightColumn = activity.querySelector('.match-column-right');
      const status = activity.querySelector('.matching-status');
      const completeBox = activity.closest('.rounded-3xl')?.querySelector('[data-activity^="matching_"]');

      if (!board || !svg || !rightColumn) return;

      const shuffle = (arr) => {
        for (let i = arr.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
      };

      const rightItems = shuffle(Array.from(rightColumn.querySelectorAll('.match-item-right')));
      rightItems.forEach(item => rightColumn.appendChild(item));

      let selectedLeft = null;
      const connections = new Map();

      const updateStatus = () => {
        if (!status) return;
        if (connections.size === 0) {
          status.textContent = 'Tap a left item, then a right item to draw a line.';
          return;
        }
        const allMatched = connections.size === leftItems.length;
        const allCorrect = Array.from(connections.entries()).every(([leftId, rightId]) => leftId === rightId);
        if (allMatched && allCorrect) {
          status.textContent = 'All matched correctly! 🎉';
        } else if (allMatched) {
          status.textContent = 'Nice try! Some lines need adjusting.';
        } else {
          status.textContent = 'Keep going! Connect all the pairs.';
        }
      };

      const updateCompleteBox = () => {
        if (!completeBox) return;
        const allMatched = connections.size === leftItems.length;
        const allCorrect = Array.from(connections.entries()).every(([leftId, rightId]) => leftId === rightId);
        completeBox.disabled = !(allMatched && allCorrect);
      };

      const drawLines = () => {
        if (!document.body.contains(activity)) return;
        const rect = board.getBoundingClientRect();
        svg.setAttribute('width', rect.width);
        svg.setAttribute('height', rect.height);
        svg.setAttribute('viewBox', '0 0 ' + rect.width + ' ' + rect.height);
        svg.innerHTML = '';
        connections.forEach((rightId, leftId) => {
          const leftEl = activity.querySelector('.match-item-left[data-match-id="' + leftId + '"]');
          const rightEl = activity.querySelector('.match-item-right[data-match-id="' + rightId + '"]');
          if (!leftEl || !rightEl) return;
          const leftRect = leftEl.getBoundingClientRect();
          const rightRect = rightEl.getBoundingClientRect();
          const x1 = leftRect.right - rect.left;
          const y1 = leftRect.top + leftRect.height / 2 - rect.top;
          const x2 = rightRect.left - rect.left;
          const y2 = rightRect.top + rightRect.height / 2 - rect.top;
          const correct = leftId === rightId;
          const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
          line.setAttribute('x1', x1);
          line.setAttribute('y1', y1);
          line.setAttribute('x2', x2);
          line.setAttribute('y2', y2);
          line.setAttribute('stroke', correct ? 'var(--primary)' : 'var(--accent)');
          line.setAttribute('stroke-width', '4');
          line.setAttribute('stroke-linecap', 'round');
          svg.appendChild(line);
        });
      };

      const handleLeftClick = (item) => {
        leftItems.forEach(el => el.classList.remove('selected'));
        if (selectedLeft === item) {
          selectedLeft = null;
        } else {
          selectedLeft = item;
          item.classList.add('selected');
        }
      };

      const handleRightClick = (item) => {
        if (!selectedLeft) return;
        const leftId = selectedLeft.dataset.matchId;
        const rightId = item.dataset.matchId;
        connections.forEach((value, key) => {
          if (value === rightId) connections.delete(key);
        });
        connections.delete(leftId);
        connections.set(leftId, rightId);
        selectedLeft.classList.remove('selected');
        selectedLeft = null;
        updateStatus();
        updateCompleteBox();
        drawLines();
      };

      leftItems.forEach(item => item.addEventListener('click', () => handleLeftClick(item)));
      rightItems.forEach(item => item.addEventListener('click', () => handleRightClick(item)));

      const resizeHandler = () => {
        if (!document.body.contains(activity)) {
          window.removeEventListener('resize', resizeHandler);
          return;
        }
        drawLines();
      };
      window.addEventListener('resize', resizeHandler);

      updateStatus();
      updateCompleteBox();
      drawLines();
    }
    
    function initDrawingCanvas(canvas) {
      const ctx = canvas.getContext('2d');
      let drawing = false;
      let currentColor = '#264653';
      const drawingKey = canvas.getAttribute('data-drawing-key');
      const container = canvas.closest('.rounded-3xl') || canvas.parentElement?.parentElement;
      
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
      
      const saveCanvasState = () => {
        if (!drawingKey) return;
        try {
          saveFormData(drawingKey, canvas.toDataURL('image/png'));
        } catch (e) {
          console.warn('Failed to save drawing state:', e);
        }
      };

      const end = () => {
        if (!drawing) return;
        drawing = false;
        saveCanvasState();
      };
      
      canvas.addEventListener('mousedown', start);
      canvas.addEventListener('mousemove', move);
      canvas.addEventListener('mouseup', end);
      canvas.addEventListener('mouseleave', end);
      canvas.addEventListener('touchstart', start, { passive: false });
      canvas.addEventListener('touchmove', move, { passive: false });
      canvas.addEventListener('touchend', end);
      
      // Color buttons - scope to this canvas's container
      const colorBtns = container ? container.querySelectorAll('.color-btn') : document.querySelectorAll('.color-btn');
      colorBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          currentColor = btn.dataset.color;
        });
      });
      
      // Clear button - scope to this canvas's container
      const clearBtn = container ? container.querySelector('.clear-canvas-btn') : document.querySelector('.clear-canvas-btn');
      if (clearBtn) {
        clearBtn.addEventListener('click', () => {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          saveCanvasState();
        });
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
    window.toggleGrownUpNote = toggleGrownUpNote;
    window.pages = pages;  // Expose pages array for print functionality
    window.updateAffirmation = function() { const s = document.querySelector('.starter[style*="border-color: var(--dark)"]'), m = document.querySelector('.middle[style*="border-color: var(--dark)"]'), e = document.querySelector('.ending[style*="border-color: var(--dark)"]'), d = document.querySelector('.affirmation-display'); if (d) { const p = [s,m,e].filter(Boolean).map(x => x.textContent.trim()); d.textContent = p.length ? p.join(' ') : 'Tap the words above!'; } };
    
    // Interactive lesson choice handler
    window.handleInteractiveChoice = function(btn, starIndex, hasCorrectAnswer, correctIdx) {
      const page = btn.closest('.page');
      const buttons = btn.parentElement.querySelectorAll('.interactive-option');
      const feedbackEl = page.querySelector('.interactive-feedback');
      const ffEl = page.querySelector('.followup-feedback');
      const mfEl = page.querySelector('.mascot-feedback');
      const selectedIdx = parseInt(btn.dataset.index);
      
      // Reset all buttons - remove selection classes
      buttons.forEach(b => {
        b.classList.remove('option-selected', 'option-incorrect');
        b.style.borderColor = 'var(--secondary)';
      });
      
      if (hasCorrectAnswer) {
        // Has a correct answer - show feedback
        const isCorrect = selectedIdx === correctIdx;
        btn.classList.add(isCorrect ? 'option-selected' : 'option-incorrect');
        btn.style.borderColor = isCorrect ? 'var(--secondary)' : 'var(--accent)';
        
        if (feedbackEl) {
          feedbackEl.style.display = 'block';
          feedbackEl.style.backgroundColor = isCorrect ? 'var(--success)' : '#fecaca';
          feedbackEl.innerHTML = isCorrect 
            ? '<span class="font-body m-color-dark">✓ Great choice! That is right!</span>'
            : '<span class="font-body m-color-dark">✗ Not quite - try again or tap another option!</span>';
        }
        
        // Only show followup and mascot feedback on correct answer, and enable completion
        if (isCorrect) {
          if (ffEl) ffEl.style.display = 'block';
          if (mfEl) mfEl.style.display = 'flex';
          // Enable the completion checkbox
          const completeBox = page.querySelector('[data-activity]');
          if (completeBox) completeBox.disabled = false;
        }
      } else {
        // Opinion-based - all answers valid
        btn.classList.add('option-selected');
        if (ffEl) ffEl.style.display = 'block';
        if (mfEl) mfEl.style.display = 'flex';
        // Enable the completion checkbox for opinion-based questions
        const completeBox = page.querySelector('[data-activity]');
        if (completeBox) completeBox.disabled = false;
      }
      
      saveFormData('poll_' + starIndex, btn.textContent.trim());
    };
    
    // Breathing exercise animation
    const breathingStates = {};
    window.toggleBreathing = function(breathingId) {
      if (breathingStates[breathingId]?.running) {
        stopBreathing(breathingId);
      } else {
        startBreathing(breathingId);
      }
    };
    
    function startBreathing(breathingId) {
      const circle = document.getElementById(breathingId);
      const inhaleCard = document.getElementById(breathingId + '_inhale');
      const holdCard = document.getElementById(breathingId + '_hold');
      const exhaleCard = document.getElementById(breathingId + '_exhale');
      const countEl = document.getElementById(breathingId + '_count');
      
      if (!circle) return;
      
      breathingStates[breathingId] = { running: true, count: 0, phase: 'ready' };
      
      const textEl = circle.querySelector('.breathing-text');
      const emojiEl = circle.querySelector('.breathing-emoji');
      
      function resetCards() {
        [inhaleCard, holdCard, exhaleCard].forEach(card => {
          if (card) {
            card.style.opacity = '0.5';
            card.style.transform = 'scale(0.95)';
            const timer = card.querySelector('.breathing-timer');
            if (timer) timer.style.display = 'none';
          }
        });
      }
      
      function activateCard(card, duration) {
        resetCards();
        if (card) {
          card.style.opacity = '1';
          card.style.transform = 'scale(1.02)';
          const timer = card.querySelector('.breathing-timer');
          if (timer) {
            timer.style.display = 'block';
            let remaining = duration;
            timer.textContent = remaining;
            const interval = setInterval(() => {
              remaining--;
              if (remaining > 0 && breathingStates[breathingId]?.running) {
                timer.textContent = remaining;
              } else {
                clearInterval(interval);
              }
            }, 1000);
          }
        }
      }
      
      function runBreathCycle() {
        if (!breathingStates[breathingId]?.running) return;
        
        // INHALE - 4 seconds
        breathingStates[breathingId].phase = 'inhale';
        circle.style.transform = 'scale(1.3)';
        circle.style.boxShadow = '0 0 40px rgba(168, 230, 207, 0.6)';
        if (textEl) textEl.textContent = 'Breathe In...';
        if (emojiEl) emojiEl.textContent = '😤';
        activateCard(inhaleCard, 4);
        
        setTimeout(() => {
          if (!breathingStates[breathingId]?.running) return;
          
          // HOLD - 4 seconds
          breathingStates[breathingId].phase = 'hold';
          circle.style.transform = 'scale(1.3)';
          circle.style.boxShadow = '0 0 30px rgba(255, 232, 163, 0.6)';
          if (textEl) textEl.textContent = 'Hold...';
          if (emojiEl) emojiEl.textContent = '😊';
          activateCard(holdCard, 4);
          
          setTimeout(() => {
            if (!breathingStates[breathingId]?.running) return;
            
            // EXHALE - 4 seconds
            breathingStates[breathingId].phase = 'exhale';
            circle.style.transform = 'scale(1)';
            circle.style.boxShadow = '0 0 20px rgba(125, 44, 52, 0.3)';
            if (textEl) textEl.textContent = 'Breathe Out...';
            if (emojiEl) emojiEl.textContent = '😌';
            activateCard(exhaleCard, 4);
            
            setTimeout(() => {
              if (!breathingStates[breathingId]?.running) return;
              
              // Increment breath count
              breathingStates[breathingId].count++;
              if (countEl) countEl.textContent = breathingStates[breathingId].count;
              
              // Check if completed 3 breaths
              if (breathingStates[breathingId].count >= 3) {
                stopBreathing(breathingId);
                if (textEl) textEl.textContent = 'Great job! 🎉';
                if (emojiEl) emojiEl.textContent = '⭐';
                resetCards();
                // Auto-check the checkbox
                const checkbox = document.getElementById('breathing_' + breathingId.split('_')[1] + '_checkbox');
                if (checkbox && !checkbox.checked) {
                  checkbox.checked = true;
                  checkbox.dispatchEvent(new Event('change'));
                }
              } else {
                // Continue to next breath
                runBreathCycle();
              }
            }, 4000);
          }, 4000);
        }, 4000);
      }
      
      runBreathCycle();
    }
    
    function stopBreathing(breathingId) {
      const circle = document.getElementById(breathingId);
      if (breathingStates[breathingId]) {
        breathingStates[breathingId].running = false;
      }
      if (circle) {
        circle.style.transform = 'scale(1)';
        circle.style.boxShadow = 'none';
        const textEl = circle.querySelector('.breathing-text');
        if (textEl) textEl.textContent = 'Tap to Start';
        const emojiEl = circle.querySelector('.breathing-emoji');
        if (emojiEl) emojiEl.textContent = '🌬️';
      }
    }
    
    // Fill-blank input handler for inline text fields
    window.handleFillBlankInput = function(input, starIndex) {
      const page = input.closest('.page');
      const blankIndex = input.dataset.blankIndex;
      
      // Save this blank's value
      saveFormData('fillblank_' + starIndex + '_' + blankIndex, input.value);
      
      // Enable completion checkbox when user fills in something
      if (input.value.trim().length > 0) {
        const completeBox = page.querySelector('[data-activity]');
        if (completeBox) completeBox.disabled = false;
      }
    };
    
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
      
      var droppedArea = category.querySelector('.dropped-items');
      var itemText = selectedSortItem.textContent.trim();
      var correctCategory = selectedSortItem.dataset.correctCategory;
      var explanation = selectedSortItem.dataset.explanation;
      var isCorrect = correctCategory === categoryName;
      
      if (isCorrect) {
        // Correct: move item to the category box
        var sortedItem = document.createElement('div');
        sortedItem.className = 'p-2 rounded-lg font-body text-sm mb-1';
        sortedItem.style.backgroundColor = 'white';
        sortedItem.style.border = '2px solid var(--secondary)';
        sortedItem.innerHTML = '✓ ' + itemText;
        sortedItem.title = explanation;
        droppedArea.appendChild(sortedItem);
        
        // Remove from items list
        selectedSortItem.remove();
        selectedSortItem = null;
      } else {
        // Wrong: shake the item and show feedback, do NOT move it to the box
        var item = selectedSortItem;
        item.style.backgroundColor = '#fecaca';
        item.style.borderColor = 'var(--accent)';
        item.style.animation = 'shake 0.5s ease-in-out';
        
        // Show inline feedback briefly
        var feedbackSpan = document.createElement('span');
        feedbackSpan.className = 'font-body text-xs';
        feedbackSpan.style.color = 'var(--accent)';
        feedbackSpan.style.display = 'block';
        feedbackSpan.style.marginTop = '4px';
        feedbackSpan.textContent = '✗ Try a different category!';
        item.appendChild(feedbackSpan);
        
        // Reset after delay
        setTimeout(function() {
          item.style.backgroundColor = 'white';
          item.style.borderColor = 'var(--primary)';
          item.style.animation = '';
          item.classList.remove('selected');
          if (feedbackSpan.parentNode) feedbackSpan.remove();
        }, 1500);
        
        selectedSortItem = null;
      }
      
      // Save to form data
      saveFormData('sort_' + starIndex + '_' + itemText.substring(0,20), categoryName + (isCorrect ? '_correct' : '_wrong'));
    };
    
    // v5 CHALLENGE HANDLERS
    let weatherCalmLevel = 0;
    let weatherCooldown = false;
    let weatherClickedButtons = new Set();
    window.handleWeatherAction = function(btn, activityId, points) {
      if (weatherCooldown || completedActivities[activityId]) return;
      
      // Get total number of action buttons to calculate percentage
      const allButtons = btn.parentElement.querySelectorAll('.weather-action');
      const totalButtons = allButtons.length;
      const pointsPerButton = Math.floor(100 / totalButtons);
      
      // Only add points if this button hasn't been clicked yet
      const buttonId = btn.dataset.actionId;
      if (weatherClickedButtons.has(buttonId)) return;
      
      weatherCooldown = true;
      btn.classList.add('cooldown');
      setTimeout(() => { weatherCooldown = false; btn.classList.remove('cooldown'); }, 800);
      
      weatherClickedButtons.add(buttonId);
      weatherCalmLevel = Math.min(100, weatherCalmLevel + pointsPerButton);
      
      const meterEl = document.getElementById('calmMeter');
      const percentEl = document.getElementById('calmPercent');
      const feedbackEl = document.getElementById('weatherFeedback');
      const feedbackText = document.getElementById('feedbackText');
      if (meterEl) meterEl.style.width = weatherCalmLevel + '%';
      if (percentEl) percentEl.textContent = weatherCalmLevel;
      if (feedbackEl && feedbackText) { feedbackEl.style.display = 'block'; feedbackText.textContent = btn.dataset.feedback; setTimeout(() => { feedbackEl.style.display = 'none'; }, 1500); }
      const overlayEl = document.getElementById('weatherOverlay');
      const clearEl = document.getElementById('weatherClear');
      if (overlayEl) overlayEl.style.opacity = 1 - (weatherCalmLevel / 100);
      if (clearEl) clearEl.style.opacity = weatherCalmLevel / 100;
      btn.classList.add('used');
      btn.disabled = true;
      
      // Check if all buttons clicked
      if (weatherClickedButtons.size >= totalButtons) { 
        weatherCalmLevel = 100;
        if (meterEl) meterEl.style.width = '100%';
        if (percentEl) percentEl.textContent = '100';
        document.getElementById('weatherWin').style.display = 'block'; 
        document.getElementById('weatherComplete').style.display = 'flex'; 
      }
      saveFormData('weather_' + activityId, weatherCalmLevel);
    };
    
    let collectedPowerUps = [];
    window.handlePowerUpClick = function(btn, activityId, targetCount) {
      if (btn.classList.contains('collected') || completedActivities[activityId]) return;
      const isPositive = btn.dataset.positive === 'true';
      const feedbackEl = document.getElementById('powerupFeedback');
      const feedbackText = document.getElementById('powerupFeedbackText');
      const displayEl = document.getElementById('collectedDisplay');
      const countEl = document.getElementById('collectedCount');
      if (isPositive) {
        btn.classList.add('collected');
        collectedPowerUps.push(btn.dataset.name);
        if (collectedPowerUps.length === 1 && displayEl) displayEl.innerHTML = '';
        const badge = document.createElement('span');
        badge.className = 'inline-block px-3 py-1 m-1 rounded-full font-body text-sm';
        badge.style.backgroundColor = 'var(--light-green)';
        badge.textContent = btn.querySelector('.text-4xl').textContent + ' ' + btn.dataset.name;
        if (displayEl) displayEl.appendChild(badge);
        if (countEl) countEl.textContent = collectedPowerUps.length;
        if (feedbackEl) { feedbackEl.style.display = 'block'; feedbackEl.style.backgroundColor = 'var(--light-green)'; feedbackText.textContent = '✓ Great choice!'; setTimeout(() => { feedbackEl.style.display = 'none'; }, 1000); }
        if (collectedPowerUps.length >= targetCount) { 
          document.getElementById('powerupWin').style.display = 'block'; 
          // Don't automatically show completion checkbox - user must manually check it
        }
      } else {
        btn.classList.add('wrong');
        setTimeout(() => btn.classList.remove('wrong'), 500);
        if (feedbackEl) { feedbackEl.style.display = 'block'; feedbackEl.style.backgroundColor = '#fecaca'; feedbackText.textContent = '✗ That one might not help - try another!'; setTimeout(() => { feedbackEl.style.display = 'none'; }, 1500); }
      }
      saveFormData('powerup_' + activityId, collectedPowerUps.join(','));
    };
    
    let mazeStep = 0;
    window.handleMazeChoice = function(btn, stepIdx, totalSteps, activityId) {
      if (btn.classList.contains('disabled') || completedActivities[activityId]) return;
      const isCorrect = btn.dataset.correct === 'true';
      const feedback = btn.dataset.feedback;
      const feedbackEl = document.getElementById('mazeFeedback' + stepIdx);
      
      if (isCorrect) {
        // Correct: disable all options and highlight the correct one
        btn.parentElement.querySelectorAll('.maze-option').forEach(b => b.classList.add('disabled'));
        btn.classList.add('correct');
      } else {
        // Wrong: only disable the wrong button so user can try other options
        btn.classList.add('wrong', 'disabled');
      }
      
      if (feedbackEl) { feedbackEl.style.display = 'block'; feedbackEl.style.backgroundColor = isCorrect ? 'var(--light-green)' : '#fecaca'; feedbackEl.innerHTML = isCorrect ? '<p class="font-body">' + feedback + '</p>' : '<p class="font-body">' + feedback + ' Try another path!</p>'; }
      if (isCorrect) {
        mazeStep++;
        const progress = (mazeStep / totalSteps) * 100;
        const progressEl = document.getElementById('mazeProgress');
        const markerEl = document.getElementById('mazeMarker');
        if (progressEl) progressEl.style.width = progress + '%';
        if (markerEl) markerEl.style.left = progress + '%';
        setTimeout(() => {
          if (mazeStep < totalSteps) {
            document.getElementById('mazeStep' + stepIdx).style.display = 'none';
            document.getElementById('mazeStep' + (stepIdx + 1)).style.display = 'block';
          } else {
            document.getElementById('mazeStep' + stepIdx).style.display = 'none';
            document.getElementById('mazeWin').style.display = 'block';
            document.getElementById('mazeComplete').style.display = 'flex';
          }
        }, 1500);
      }
      saveFormData('maze_' + activityId + '_step' + stepIdx, isCorrect ? 'correct' : 'wrong');
    };
    
    window.handleShieldInput = function(activityId, totalSections) {
      const inputs = document.querySelectorAll('.shield-input');
      let filled = 0;
      inputs.forEach(input => { if (input.value.trim().length > 0) filled++; });
      const progressEl = document.getElementById('shieldProgress');
      if (progressEl) progressEl.textContent = filled;
      if (filled >= totalSections) { document.getElementById('shieldWin').style.display = 'block'; document.getElementById('shieldComplete').style.display = 'flex'; }
    };
    
    window.addShieldDecoration = function(emoji, activityId) {
      const display = document.getElementById('shieldDecorations');
      if (display) {
        // Create a span for each decoration to allow proper wrapping and display
        const span = document.createElement('span');
        span.textContent = emoji;
        span.style.display = 'inline-block';
        span.style.margin = '2px';
        display.appendChild(span);
      }
      if (activityId) {
        const existing = (formData['shield_' + activityId + '_decorations'] || '').split(',').filter(Boolean);
        existing.push(emoji);
        saveFormData('shield_' + activityId + '_decorations', existing.join(','));
      }
    };
    
    let volcanoTemp = 100;
    let volcanoCooldown = false;
    window.handleVolcanoCool = function(btn, activityId, coolingPower) {
      if (volcanoCooldown || volcanoTemp <= 0 || completedActivities[activityId]) return;
      volcanoCooldown = true;
      btn.classList.add('cooldown');
      setTimeout(() => { volcanoCooldown = false; btn.classList.remove('cooldown'); }, 600);
      volcanoTemp = Math.max(0, volcanoTemp - coolingPower);
      const tempEl = document.getElementById('volcanoTemp');
      const lavaEl = document.getElementById('volcanoLava');
      const indicatorEl = document.getElementById('volcanoIndicator');
      const feedbackEl = document.getElementById('volcanoFeedback');
      const feedbackText = document.getElementById('volcanoFeedbackText');
      if (tempEl) tempEl.textContent = volcanoTemp;
      if (lavaEl) lavaEl.style.opacity = volcanoTemp / 100;
      const emojis = ['😌', '😊', '😤', '🔥', '🌋'];
      const level = Math.ceil(volcanoTemp / 25);
      if (indicatorEl) indicatorEl.textContent = emojis[Math.min(level, 4)];
      for (let i = 1; i <= 5; i++) { const lvl = document.getElementById('volcanoLevel' + i); if (lvl) lvl.classList.toggle('active', i === level); }
      if (feedbackEl && feedbackText) { feedbackEl.style.display = 'block'; feedbackEl.style.backgroundColor = 'var(--light-green)'; feedbackText.textContent = '❄️ ' + btn.dataset.action + ' - Cooling down!'; setTimeout(() => { feedbackEl.style.display = 'none'; }, 1000); }
      if (volcanoTemp <= 0) { document.getElementById('volcanoSafe').style.display = 'block'; document.getElementById('volcanoComplete').style.display = 'flex'; }
      saveFormData('volcano_' + activityId, volcanoTemp);
    };

    // ===== v7 GAME ACTIVITY HANDLERS =====
    const balloonState = {};
    window.useCalmingTool = function(toolId, power, toolName) {
      const page = document.querySelector('[data-page="balloon-pop"]');
      if (!page) return;
      const activityId = page.dataset.activity;
      const starIndex = activityId.split('_')[1];
      
      if (!balloonState[starIndex]) balloonState[starIndex] = { power: 0, popped: [] };
      balloonState[starIndex].power = Math.min(100, balloonState[starIndex].power + power);
      
      document.getElementById('balloonPower_' + starIndex).textContent = balloonState[starIndex].power + '%';
      document.getElementById('balloonPowerBar_' + starIndex).style.width = balloonState[starIndex].power + '%';
  
      window.showFeedback('balloonFeedback_' + starIndex, 'balloonFeedbackText_' + starIndex, '💪 +' + power + ' calming power! (' + balloonState[starIndex].power + '%)');
      
      // At 100% power, show encouraging message to pop balloons
      if (balloonState[starIndex].power >= 100) {
        window.showFeedback('balloonFeedback_' + starIndex, 'balloonFeedbackText_' + starIndex, '🌟 Full calming power! Now tap the worry balloons to pop them!');
      }
    };

    window.popBalloon = function(balloonId, activityId, total) {
      const starIndex = activityId.split('_')[1];
      if (!balloonState[starIndex]) balloonState[starIndex] = { power: 0, popped: [] };
      
      if (balloonState[starIndex].power < 20) {
        window.showFeedback('balloonFeedback_' + starIndex, 'balloonFeedbackText_' + starIndex, '🧰 Build up your calming power first using the tools above!');
        return;
      }
      
      const balloon = document.getElementById('balloon_' + balloonId);
      if (balloon.classList.contains('popped')) return;
      
      balloon.classList.add('popped');
      balloonState[starIndex].popped.push(balloonId);
      
      // Deduct some power per pop (but less than before so it feels fair)
      balloonState[starIndex].power = Math.max(0, balloonState[starIndex].power - 15);
      document.getElementById('balloonPower_' + starIndex).textContent = balloonState[starIndex].power + '%';
      document.getElementById('balloonPowerBar_' + starIndex).style.width = balloonState[starIndex].power + '%';
      
      window.showFeedback('balloonFeedback_' + starIndex, 'balloonFeedbackText_' + starIndex, '💥 POP! ' + balloon.dataset.response);
      
      if (balloonState[starIndex].popped.length >= total) {
        document.getElementById('balloonVictory_' + starIndex).style.display = 'block';
        document.getElementById('balloonComplete_' + starIndex).style.display = 'flex';
      }
    };

    // ===== TREASURE HUNT =====
    const treasureState = {};
    window.exploreTreasure = function(starIndex, locId, total) {
      const loc = document.getElementById('loc_' + starIndex + '_' + locId);
      if (loc.classList.contains('explored')) return;
      
      loc.classList.add('explored');
      document.getElementById('tc_' + starIndex + '_' + locId).style.display = 'block';
      
      if (!treasureState[starIndex]) treasureState[starIndex] = [];
      treasureState[starIndex].push(locId);
      document.getElementById('treasureCount_' + starIndex).textContent = treasureState[starIndex].length;
      
      if (treasureState[starIndex].length >= total) {
        document.getElementById('treasureVictory_' + starIndex).style.display = 'block';
        document.getElementById('treasureComplete_' + starIndex).style.display = 'flex';
      }
    };

    // ===== MONSTER TAMER =====
    const monsterState = {};
    window.tameMonster = function(starIndex, shrinkPower, message) {
      if (!monsterState[starIndex]) monsterState[starIndex] = 100;
      monsterState[starIndex] = Math.max(0, monsterState[starIndex] - shrinkPower);
      
      const visual = document.getElementById('monsterVisual_' + starIndex);
      visual.style.fontSize = (8 * Math.max(0.3, monsterState[starIndex] / 100)) + 'rem';
      
      document.getElementById('monsterSize_' + starIndex).textContent = monsterState[starIndex] + '%';
      document.getElementById('monsterBar_' + starIndex).style.width = monsterState[starIndex] + '%';
      
      window.showFeedback('monsterFeedback_' + starIndex, 'monsterFeedbackText_' + starIndex, message);
      
      // Update stages
      const stage = monsterState[starIndex] > 75 ? 4 : monsterState[starIndex] > 50 ? 3 : monsterState[starIndex] > 25 ? 2 : 1;
      for (let i = 1; i <= 4; i++) {
        const el = document.getElementById('stage_' + starIndex + '_' + i);
        if (el) el.style.backgroundColor = i === stage ? 'var(--primary)' : 'var(--cream)';
      }
      
      if (monsterState[starIndex] <= 0) {
        visual.textContent = '😊';
        document.getElementById('monsterFriend_' + starIndex).style.display = 'block';
        document.getElementById('monsterComplete_' + starIndex).style.display = 'flex';
      }
    };

    // ===== GARDEN GROWER =====
    const gardenState = {};
    window.waterPlant = function(starIndex, plantId, stages, total) {
      if (!gardenState[starIndex]) gardenState[starIndex] = {};
      if (!gardenState[starIndex][plantId]) gardenState[starIndex][plantId] = 0;
      if (gardenState[starIndex][plantId] >= stages.length - 1) return;
      
      gardenState[starIndex][plantId]++;
      const currentStage = gardenState[starIndex][plantId];
      
      // Update the plant emoji
      var emojiEl = document.getElementById('plantEmoji_' + starIndex + '_' + plantId);
      if (emojiEl) {
        emojiEl.textContent = stages[currentStage];
        // Quick grow animation
        emojiEl.style.transform = 'scale(1.3)';
        setTimeout(function() { emojiEl.style.transform = 'scale(1)'; }, 300);
      }
      
      // Update the action text to show progress
      var actionEl = document.getElementById('plantAction_' + starIndex + '_' + plantId);
      if (actionEl) {
        if (currentStage >= stages.length - 1) {
          actionEl.textContent = '🌟 Fully grown!';
          actionEl.style.backgroundColor = 'var(--light-green)';
        } else {
          actionEl.textContent = '💧 Growing... (' + (currentStage + 1) + '/' + stages.length + ')';
        }
      }
      
      // Update progress dots
      for (var i = 0; i <= currentStage; i++) {
        var dot = document.getElementById('growth_' + starIndex + '_' + plantId + '_' + i);
        if (dot) dot.style.backgroundColor = 'var(--primary)';
      }
      
      if (currentStage >= stages.length - 1) {
        var plantEl = document.getElementById('plant_' + starIndex + '_' + plantId);
        if (plantEl) plantEl.classList.add('grown');
      }
      
      // Count fully grown - compare against each plant's own stage count
      var fullyGrown = 0;
      var keys = Object.keys(gardenState[starIndex]);
      for (var k = 0; k < keys.length; k++) {
        // A plant is fully grown if its stage >= stages.length - 1
        // Since all plants in this garden have same stages length, this works
        if (gardenState[starIndex][keys[k]] >= stages.length - 1) fullyGrown++;
      }
      document.getElementById('gardenProgress_' + starIndex).textContent = fullyGrown;
      
      if (fullyGrown >= total) {
        document.getElementById('gardenHarvest_' + starIndex).style.display = 'block';
        document.getElementById('gardenComplete_' + starIndex).style.display = 'flex';
      }
    };

    // ===== SUPERHERO CREATOR =====
    const heroState = {};
    window.selectHero = function(starIndex, type, emoji) {
      if (!heroState[starIndex]) heroState[starIndex] = {};
      heroState[starIndex][type] = emoji;
      document.getElementById('hero_' + starIndex + '_' + type).textContent = emoji;
      window.checkHeroComplete(starIndex);
    };

    window.checkHeroComplete = function(starIndex) {
      const state = heroState[starIndex] || {};
      if (state.power && state.costume && state.sidekick) {
        document.getElementById('heroDone_' + starIndex).style.display = 'block';
        document.getElementById('heroComplete_' + starIndex).style.display = 'flex';
      }
    };

    // ===== FEELINGS ORCHESTRA =====
    window.playInstrument = function(starIndex, emoji, sound, feeling, instrumentName) {
      const display = document.getElementById('soundDisplay_' + starIndex);
      display.innerHTML = '<p class="text-5xl">' + emoji + '</p><p class="font-title text-2xl">' + sound + '</p><p class="font-body">' + feeling + '</p>';

      try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) return;
        if (!window.__instrumentAudioCtx) {
          window.__instrumentAudioCtx = new AudioContextClass();
        }
        const ctx = window.__instrumentAudioCtx;
        if (ctx.state === 'suspended') ctx.resume();
        const now = ctx.currentTime;
        
        // Combine all text fields for keyword matching
        const allText = ((sound || '') + ' ' + (instrumentName || '') + ' ' + (feeling || '')).toLowerCase();
        
        // Helper to detect instrument type from any of the text fields
        function has(keyword) { return allText.includes(keyword); }
        
        // ========== VIOLIN / STRINGS ==========
        if (has('violin') || has('string') || has('cello') || has('viola') || has('fiddle')) {
          // Violin: layered sawtooth oscillators with vibrato and slow attack for bowing effect
          var baseFreq = has('cello') ? 220 : has('viola') ? 330 : 440;
          var duration = 2.0;
          
          // Main tone - two detuned sawtooths for richness
          for (var d = 0; d < 2; d++) {
            var osc = ctx.createOscillator();
            var gn = ctx.createGain();
            var filt = ctx.createBiquadFilter();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(baseFreq + (d * 1.5 - 0.75), now); // slight detune
            filt.type = 'lowpass';
            filt.frequency.setValueAtTime(1200, now);
            filt.frequency.linearRampToValueAtTime(2500, now + 0.3);
            filt.frequency.linearRampToValueAtTime(1800, now + duration);
            filt.Q.value = 1.5;
            // Slow attack like a bow stroke
            gn.gain.setValueAtTime(0.0001, now);
            gn.gain.linearRampToValueAtTime(0.12, now + 0.15);
            gn.gain.linearRampToValueAtTime(0.10, now + duration * 0.7);
            gn.gain.exponentialRampToValueAtTime(0.0001, now + duration);
            // Vibrato
            var lfo = ctx.createOscillator();
            var lfoGn = ctx.createGain();
            lfo.frequency.value = 5.5;
            lfoGn.gain.value = 4;
            lfo.connect(lfoGn);
            lfoGn.connect(osc.frequency);
            lfo.start(now + 0.2);
            lfo.stop(now + duration);
            osc.connect(filt);
            filt.connect(gn);
            gn.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + duration + 0.1);
          }
          return;
        }
        
        // ========== DRUMS ==========
        if (has('drum') || has('thunder') || has('boom') || has('thump') || has('beat') || has('snare') || has('percussion')) {
          var duration = 0.6;
          // Kick/body - low sine with pitch drop
          var kick = ctx.createOscillator();
          var kickGn = ctx.createGain();
          kick.type = 'sine';
          kick.frequency.setValueAtTime(150, now);
          kick.frequency.exponentialRampToValueAtTime(40, now + 0.15);
          kickGn.gain.setValueAtTime(0.5, now);
          kickGn.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);
          kick.connect(kickGn);
          kickGn.connect(ctx.destination);
          kick.start(now);
          kick.stop(now + 0.5);
          
          // Snare/hit noise layer
          var bufSize = ctx.sampleRate * 0.2;
          var noiseBuf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
          var noiseData = noiseBuf.getChannelData(0);
          for (var s = 0; s < bufSize; s++) noiseData[s] = Math.random() * 2 - 1;
          var noise = ctx.createBufferSource();
          noise.buffer = noiseBuf;
          var noiseFilt = ctx.createBiquadFilter();
          noiseFilt.type = 'highpass';
          noiseFilt.frequency.value = 1000;
          var noiseGn = ctx.createGain();
          noiseGn.gain.setValueAtTime(0.3, now);
          noiseGn.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);
          noise.connect(noiseFilt);
          noiseFilt.connect(noiseGn);
          noiseGn.connect(ctx.destination);
          noise.start(now);
          noise.stop(now + 0.3);
          
          // Second hit slightly delayed for thunder effect
          if (has('thunder')) {
            var kick2 = ctx.createOscillator();
            var kick2Gn = ctx.createGain();
            kick2.type = 'sine';
            kick2.frequency.setValueAtTime(120, now + 0.12);
            kick2.frequency.exponentialRampToValueAtTime(30, now + 0.35);
            kick2Gn.gain.setValueAtTime(0.0001, now);
            kick2Gn.gain.linearRampToValueAtTime(0.35, now + 0.12);
            kick2Gn.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);
            kick2.connect(kick2Gn);
            kick2Gn.connect(ctx.destination);
            kick2.start(now);
            kick2.stop(now + 0.6);
          }
          return;
        }
        
        // ========== CYMBALS / CRASH ==========
        if (has('cymbal') || has('crash') || has('clash') || has('clang')) {
          var duration = 1.5;
          var bufSize = ctx.sampleRate * duration;
          var noiseBuf = ctx.createBuffer(2, bufSize, ctx.sampleRate);
          for (var ch = 0; ch < 2; ch++) {
            var data = noiseBuf.getChannelData(ch);
            for (var s = 0; s < bufSize; s++) data[s] = Math.random() * 2 - 1;
          }
          var noise = ctx.createBufferSource();
          noise.buffer = noiseBuf;
          // Band pass to get metallic shimmer
          var bp1 = ctx.createBiquadFilter();
          bp1.type = 'bandpass';
          bp1.frequency.value = 5000;
          bp1.Q.value = 0.5;
          var hp = ctx.createBiquadFilter();
          hp.type = 'highpass';
          hp.frequency.value = 3000;
          var noiseGn = ctx.createGain();
          noiseGn.gain.setValueAtTime(0.0001, now);
          noiseGn.gain.linearRampToValueAtTime(0.35, now + 0.005);
          noiseGn.gain.exponentialRampToValueAtTime(0.08, now + 0.3);
          noiseGn.gain.exponentialRampToValueAtTime(0.0001, now + duration);
          noise.connect(bp1);
          bp1.connect(hp);
          hp.connect(noiseGn);
          noiseGn.connect(ctx.destination);
          // Add a metallic ring
          var ring = ctx.createOscillator();
          var ringGn = ctx.createGain();
          ring.type = 'square';
          ring.frequency.value = 340;
          ringGn.gain.setValueAtTime(0.04, now);
          ringGn.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);
          ring.connect(ringGn);
          ringGn.connect(ctx.destination);
          ring.start(now);
          ring.stop(now + 1.0);
          noise.start(now);
          noise.stop(now + duration + 0.1);
          return;
        }
        
        // ========== FLUTE ==========
        if (has('flute') || has('whistle') || has('breeze') || has('wind') || has('ocean flute') || has('pipe')) {
          var baseFreq = 580;
          var duration = 1.8;
          // Pure sine with breathy noise layer and vibrato
          var osc = ctx.createOscillator();
          var oscGn = ctx.createGain();
          var filt = ctx.createBiquadFilter();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(baseFreq, now);
          // Gentle pitch rise
          osc.frequency.linearRampToValueAtTime(baseFreq * 1.02, now + 0.5);
          osc.frequency.linearRampToValueAtTime(baseFreq, now + duration);
          filt.type = 'lowpass';
          filt.frequency.value = 3000;
          // Breath-like attack
          oscGn.gain.setValueAtTime(0.0001, now);
          oscGn.gain.linearRampToValueAtTime(0.15, now + 0.12);
          oscGn.gain.linearRampToValueAtTime(0.12, now + duration * 0.8);
          oscGn.gain.exponentialRampToValueAtTime(0.0001, now + duration);
          // Vibrato
          var lfo = ctx.createOscillator();
          var lfoGn = ctx.createGain();
          lfo.frequency.value = 5;
          lfoGn.gain.value = 6;
          lfo.connect(lfoGn);
          lfoGn.connect(osc.frequency);
          lfo.start(now + 0.3);
          lfo.stop(now + duration);
          osc.connect(filt);
          filt.connect(oscGn);
          oscGn.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + duration + 0.1);
          // Breath noise layer
          var breathSize = ctx.sampleRate * duration;
          var breathBuf = ctx.createBuffer(1, breathSize, ctx.sampleRate);
          var bData = breathBuf.getChannelData(0);
          for (var s = 0; s < breathSize; s++) bData[s] = Math.random() * 2 - 1;
          var breath = ctx.createBufferSource();
          breath.buffer = breathBuf;
          var breathFilt = ctx.createBiquadFilter();
          breathFilt.type = 'bandpass';
          breathFilt.frequency.value = 2000;
          breathFilt.Q.value = 2;
          var breathGn = ctx.createGain();
          breathGn.gain.setValueAtTime(0.0001, now);
          breathGn.gain.linearRampToValueAtTime(0.025, now + 0.1);
          breathGn.gain.linearRampToValueAtTime(0.015, now + duration * 0.8);
          breathGn.gain.exponentialRampToValueAtTime(0.0001, now + duration);
          breath.connect(breathFilt);
          breathFilt.connect(breathGn);
          breathGn.connect(ctx.destination);
          breath.start(now);
          breath.stop(now + duration + 0.1);
          return;
        }
        
        // ========== TRUMPET / HORN / BRASS ==========
        if (has('trumpet') || has('horn') || has('brass') || has('fanfare') || has('trombone') || has('tuba')) {
          var baseFreq = 370;
          var duration = 1.5;
          // Brass: sawtooth with lowpass filter sweep
          var osc = ctx.createOscillator();
          var osc2 = ctx.createOscillator();
          var oscGn = ctx.createGain();
          var filt = ctx.createBiquadFilter();
          osc.type = 'sawtooth';
          osc2.type = 'square';
          osc.frequency.setValueAtTime(baseFreq, now);
          osc2.frequency.setValueAtTime(baseFreq * 1.003, now); // slight detune for fatness
          filt.type = 'lowpass';
          filt.frequency.setValueAtTime(400, now);
          filt.frequency.linearRampToValueAtTime(2800, now + 0.08); // bright attack
          filt.frequency.linearRampToValueAtTime(1800, now + 0.5);
          filt.frequency.linearRampToValueAtTime(1200, now + duration);
          filt.Q.value = 2;
          // Brass attack envelope
          oscGn.gain.setValueAtTime(0.0001, now);
          oscGn.gain.linearRampToValueAtTime(0.14, now + 0.04);
          oscGn.gain.linearRampToValueAtTime(0.11, now + 0.2);
          oscGn.gain.linearRampToValueAtTime(0.09, now + duration * 0.8);
          oscGn.gain.exponentialRampToValueAtTime(0.0001, now + duration);
          // Vibrato
          var lfo = ctx.createOscillator();
          var lfoGn = ctx.createGain();
          lfo.frequency.value = 5;
          lfoGn.gain.value = 3;
          lfo.connect(lfoGn);
          lfoGn.connect(osc.frequency);
          lfo.start(now + 0.4);
          lfo.stop(now + duration);
          var merge = ctx.createGain();
          merge.gain.value = 0.5;
          osc.connect(merge);
          osc2.connect(merge);
          merge.connect(filt);
          filt.connect(oscGn);
          oscGn.connect(ctx.destination);
          osc.start(now);
          osc2.start(now);
          osc.stop(now + duration + 0.1);
          osc2.stop(now + duration + 0.1);
          return;
        }
        
        // ========== HARP ==========
        if (has('harp') || has('lyre') || has('pluck') || has('strum')) {
          // Harp arpeggio: series of plucked notes
          var baseFreq = 330;
          var ratios = [1, 5/4, 3/2, 2, 5/2, 3];
          ratios.forEach(function(ratio, idx) {
            var freq = baseFreq * ratio;
            var startTime = now + idx * 0.1;
            var dur = 1.5 - idx * 0.1;
            var osc = ctx.createOscillator();
            var gn = ctx.createGain();
            var filt = ctx.createBiquadFilter();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, startTime);
            filt.type = 'lowpass';
            filt.frequency.setValueAtTime(4000, startTime);
            filt.frequency.exponentialRampToValueAtTime(800, startTime + dur);
            // Pluck envelope: instant attack, slow decay
            gn.gain.setValueAtTime(0.0001, now);
            gn.gain.linearRampToValueAtTime(0.18 / (idx + 1), startTime + 0.005);
            gn.gain.exponentialRampToValueAtTime(0.0001, startTime + dur);
            osc.connect(filt);
            filt.connect(gn);
            gn.connect(ctx.destination);
            osc.start(startTime);
            osc.stop(startTime + dur + 0.1);
          });
          return;
        }
        
        // ========== BELL / CHIME ==========
        if (has('bell') || has('chime') || has('ding') || has('gong') || has('ring') || has('tinkle')) {
          var baseFreq = 660;
          var duration = 2.5;
          // Bells have inharmonic partials
          var partials = [1, 2.0, 2.76, 4.07, 5.4, 6.8];
          var amps = [0.15, 0.08, 0.06, 0.03, 0.02, 0.01];
          partials.forEach(function(p, idx) {
            var osc = ctx.createOscillator();
            var gn = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(baseFreq * p, now);
            gn.gain.setValueAtTime(0.0001, now);
            gn.gain.linearRampToValueAtTime(amps[idx], now + 0.003);
            gn.gain.exponentialRampToValueAtTime(0.0001, now + duration - idx * 0.2);
            osc.connect(gn);
            gn.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + duration + 0.1);
          });
          return;
        }
        
        // ========== XYLOPHONE / MARIMBA ==========
        if (has('xylophone') || has('marimba') || has('glockenspiel') || has('kalimba')) {
          var baseFreq = 520;
          var duration = 0.8;
          // Xylophone: sine + 3rd harmonic, fast decay
          [1, 3].forEach(function(h) {
            var osc = ctx.createOscillator();
            var gn = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(baseFreq * h, now);
            gn.gain.setValueAtTime(0.0001, now);
            gn.gain.linearRampToValueAtTime(0.2 / h, now + 0.003);
            gn.gain.exponentialRampToValueAtTime(0.0001, now + duration);
            osc.connect(gn);
            gn.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + duration + 0.1);
          });
          return;
        }
        
        // ========== PIANO ==========
        if (has('piano') || has('key')) {
          var baseFreq = 440;
          var duration = 2.0;
          var harmonics = [1, 2, 3, 4, 5, 6];
          var amps = [0.15, 0.10, 0.05, 0.03, 0.015, 0.008];
          harmonics.forEach(function(h, idx) {
            var osc = ctx.createOscillator();
            var gn = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(baseFreq * h, now);
            gn.gain.setValueAtTime(0.0001, now);
            gn.gain.linearRampToValueAtTime(amps[idx], now + 0.005);
            gn.gain.exponentialRampToValueAtTime(amps[idx] * 0.3, now + 0.5);
            gn.gain.exponentialRampToValueAtTime(0.0001, now + duration);
            osc.connect(gn);
            gn.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + duration + 0.1);
          });
          return;
        }
        
        // ========== GUITAR ==========
        if (has('guitar') || has('ukulele') || has('strum') || has('chord')) {
          var baseFreq = 330;
          var duration = 1.2;
          // Plucked string with harmonics
          [1, 2, 3, 4, 5].forEach(function(h) {
            var osc = ctx.createOscillator();
            var gn = ctx.createGain();
            var filt = ctx.createBiquadFilter();
            osc.type = h <= 2 ? 'triangle' : 'sine';
            osc.frequency.setValueAtTime(baseFreq * h, now);
            filt.type = 'lowpass';
            filt.frequency.setValueAtTime(3000, now);
            filt.frequency.exponentialRampToValueAtTime(500, now + duration);
            gn.gain.setValueAtTime(0.0001, now);
            gn.gain.linearRampToValueAtTime(0.12 / h, now + 0.003);
            gn.gain.exponentialRampToValueAtTime(0.0001, now + duration);
            osc.connect(filt);
            filt.connect(gn);
            gn.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + duration + 0.1);
          });
          return;
        }
        
        // ========== DEFAULT: gentle melodic tone ==========
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(0.15, now + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.0);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 1.2);
      } catch (e) {
        console.warn('Instrument audio failed:', e);
      }
    };

    // ===== CALM AQUARIUM =====
    window.addToAquarium = function(starIndex, type, emoji, trait) {
      const tank = document.getElementById('tank_' + starIndex);
      const item = document.createElement('span');
      item.className = 'text-4xl';
      item.textContent = emoji;
      item.style.animation = 'float 3s ease-in-out infinite';
      tank.appendChild(item);
    };

    // ===== ROCKET LAUNCHER =====
    const rocketState = {};
    window.addFuel = function(starIndex, amount) {
      if (!rocketState[starIndex]) rocketState[starIndex] = 0;
      rocketState[starIndex] = Math.min(100, rocketState[starIndex] + amount);
      document.getElementById('fuelDisplay_' + starIndex).textContent = rocketState[starIndex] + '%';
      document.getElementById('fuelBar_' + starIndex).style.width = rocketState[starIndex] + '%';
    };

    window.launchRocket = function(starIndex) {
      if (!rocketState[starIndex] || rocketState[starIndex] < 100) {
        alert('Need 100% fuel to launch!');
        return;
      }
      document.getElementById('planets_' + starIndex).style.display = 'block';
      document.getElementById('rocketReturn_' + starIndex).style.display = 'block';
      document.getElementById('rocketComplete_' + starIndex).style.display = 'flex';
    };

    // ===== MAGIC POTION =====
    const potionState = {};
    window.addIngredient = function(starIndex, id, emoji, name) {
      if (!potionState[starIndex]) potionState[starIndex] = [];
      if (potionState[starIndex].length >= 3) return;
      if (potionState[starIndex].some(i => i.id === id)) return;
      potionState[starIndex].push({ id, emoji, name });
      const cauldron = document.getElementById('cauldron_' + starIndex);
      cauldron.innerHTML = potionState[starIndex].map(i => '<span class="text-4xl">' + i.emoji + '</span>').join('');
      saveFormData('potion_' + starIndex + '_ingredients', potionState[starIndex].map(i => i.emoji).join(','));
    };

    window.brewPotion = function(starIndex) {
      if (!potionState[starIndex] || potionState[starIndex].length < 2) {
        alert('Add at least 2 ingredients!');
        return;
      }
      const resultEl = document.getElementById('potionResult_' + starIndex);
      const messageEl = document.getElementById('potionMessage_' + starIndex);
      const emojiEl = document.getElementById('potionEmoji_' + starIndex);
      const recipeTag = potionState[starIndex].map(i => i.id).sort().join('-');

      if (messageEl && emojiEl) {
        if (recipeTag.includes('calm') || recipeTag.includes('breathe')) {
          emojiEl.textContent = '😌';
          messageEl.textContent = 'Calm Potion brewed! You made a soothing blend for big feelings.';
        } else if (recipeTag.includes('brave') || recipeTag.includes('lion')) {
          emojiEl.textContent = '🦁';
          messageEl.textContent = 'Brave Potion brewed! You mixed courage to face tricky moments.';
        } else {
          emojiEl.textContent = '✨';
          messageEl.textContent = 'Friendship Potion brewed! Your mix helps feelings feel safer.';
        }
      }

      if (resultEl) resultEl.style.display = 'block';
      const complete = document.getElementById('potionComplete_' + starIndex);
      if (complete) complete.style.display = 'flex';
      saveFormData('potion_' + starIndex + '_brewed', 'true');
      saveFormData('potion_' + starIndex + '_recipe', recipeTag);
    };

    // ===== FEELINGS BINGO =====
    window.markBingoSquare = function(starIndex, squareId) {
      const square = document.getElementById('bingo_' + starIndex + '_' + squareId);
      square.classList.toggle('marked');
    };

    // ===== HELPER =====
    window.showFeedback = function(containerId, textId, message) {
      const container = document.getElementById(containerId);
      const text = document.getElementById(textId);
      if (container && text) {
        text.textContent = message;
        container.style.display = 'block';
        setTimeout(() => { container.style.display = 'none'; }, 3000);
      }
    };

// =====================================================
    // v6 ACTIVITY HANDLERS
    // =====================================================
    
    // Spin the Wheel
    window.spinWheel = function(starIndex, segmentCount) {
      const wheel = document.querySelector('.wheel-container');
      if (!wheel) return;
      
      const randomDeg = Math.floor(Math.random() * 360) + 720; // At least 2 full spins
      wheel.style.transition = 'transform 3s ease-out';
      wheel.style.transform = 'rotate(' + randomDeg + 'deg)';
      
      setTimeout(() => {
        const finalAngle = randomDeg % 360;
        const segmentAngle = 360 / segmentCount;
        const selectedIdx = Math.floor((360 - finalAngle + segmentAngle/2) % 360 / segmentAngle);
        
        document.getElementById('wheelCelebration_' + starIndex).style.display = 'block';
        document.getElementById('wheelComplete_' + starIndex).style.display = 'flex';
      }, 3000);
    };
    
    window.selectWheelSegment = function(starIndex, segId, response) {
      // Show result
      document.getElementById('wheelResult_' + starIndex).style.display = 'block';
      document.getElementById('wheelResultText_' + starIndex).textContent = response;
      document.getElementById('wheelCelebration_' + starIndex).style.display = 'block';
      document.getElementById('wheelComplete_' + starIndex).style.display = 'flex';
      
      // Highlight selected segment
      document.querySelectorAll('[id^="seg_' + starIndex + '_"]').forEach(seg => {
        seg.style.opacity = seg.id === 'seg_' + starIndex + '_' + segId ? '1' : '0.5';
      });
      
      saveFormData('wheel_' + starIndex, segId);
    };
    
    // Sticker Collector
    const collectedStickers = {};
    window.collectSticker = function(starIndex, challengeId, emoji, total) {
      const challenge = document.getElementById('challenge_' + starIndex + '_' + challengeId);
      if (challenge.classList.contains('collected')) return;
      
      challenge.classList.add('collected');
      
      if (!collectedStickers[starIndex]) collectedStickers[starIndex] = [];
      collectedStickers[starIndex].push(emoji);
      
      // Update collection display
      const collection = document.getElementById('stickerCollection_' + starIndex);
      if (collectedStickers[starIndex].length === 1) collection.innerHTML = '';
      
      const stickerSpan = document.createElement('span');
      stickerSpan.className = 'text-3xl animate-bounce-slow';
      stickerSpan.textContent = emoji;
      collection.appendChild(stickerSpan);
      
      document.getElementById('stickerCount_' + starIndex).textContent = collectedStickers[starIndex].length;
      
      if (collectedStickers[starIndex].length >= total) {
        document.getElementById('stickerComplete_' + starIndex).style.display = 'block';
        document.getElementById('stickerDone_' + starIndex).style.display = 'flex';
      }
      
      saveFormData('stickers_' + starIndex, collectedStickers[starIndex].join(','));
    };
    
    // Mindful Adventure
    const adventureProgress = {};
    window.checkAdventureComplete = function(starIndex, totalScenes) {
      if (!adventureProgress[starIndex]) adventureProgress[starIndex] = new Set();
      
      // Check all textareas in scenes
      document.querySelectorAll('[id^="scene_' + starIndex + '_"] textarea').forEach(textarea => {
        if (textarea.value.trim().length > 0) {
          const sceneId = textarea.closest('[id^="scene_"]').id.split('_').pop();
          adventureProgress[starIndex].add(sceneId);
        }
      });
      
      document.getElementById('adventureProgress_' + starIndex).textContent = adventureProgress[starIndex].size;
      
      if (adventureProgress[starIndex].size >= totalScenes) {
        document.getElementById('adventureClosing_' + starIndex).style.display = 'block';
        document.getElementById('adventureDone_' + starIndex).style.display = 'flex';
      }
    };
    
    // Emotion Detective
    window.solveCase = function(starIndex, optionIdx, isCorrect, explanation) {
      const feedbackEl = document.getElementById('detectiveFeedback_' + starIndex);
      const feedbackText = document.getElementById('detectiveFeedbackText_' + starIndex);
      
      // Reset all options
      document.querySelectorAll('.detective-option').forEach(opt => {
        opt.classList.remove('correct', 'wrong');
      });
      
      // Mark selected option
      const selectedBtn = document.querySelectorAll('.detective-option')[optionIdx];
      selectedBtn.classList.add(isCorrect ? 'correct' : 'wrong');
      
      feedbackEl.style.display = 'block';
      feedbackEl.style.backgroundColor = isCorrect ? 'var(--light-green)' : '#fecaca';
      feedbackText.textContent = explanation;
      
      if (isCorrect) {
        document.getElementById('detectiveReveal_' + starIndex).style.display = 'block';
        document.getElementById('detectiveDone_' + starIndex).style.display = 'flex';
      }
      
      saveFormData('detective_' + starIndex, isCorrect ? 'solved' : 'attempted');
    };
  </script>
</body>
</html>`;
}
// PAGE RENDERERS
// ====================

function renderCoverPage(content: GeneratedContent, seriesInfo?: SeriesInfo | null): string {
  const { metadata } = content;
  
  // Helper function to render character (image or emoji) - made bigger for cover
  const renderCharacter = () => {
    if (seriesInfo?.character_image_url) {
      return `<img src="${escapeForTemplate(seriesInfo.character_image_url)}" alt="${escapeForTemplate(metadata.characterName)}" class="object-contain mx-auto drop-shadow-2xl m-character-img--cover">`;
    }
    return `<span class="m-character-emoji--cover">${escapeForTemplate(metadata.characterEmoji)}</span>`;
  };
  
  return `
    <div class="page min-h-screen flex items-center justify-center p-8 m-page-cover" data-page="cover">
      <div class="text-center max-w-4xl m-cover-center">
        <!-- Big Character Front and Center -->
        <div class="mb-4 animate-bounce-slow">
          ${renderCharacter()}
        </div>
        
        <!-- Character Name Badge -->
        <div class="inline-block px-6 py-2 rounded-full mb-4 m-bg-primary">
          <span class="text-white font-title text-xl">Meet ${escapeForTemplate(metadata.characterName)}!</span>
        </div>
        
        <h1 class="text-5xl md:text-6xl mb-3 font-title m-color-dark">${escapeForTemplate(metadata.title)}</h1>
        <h2 class="text-2xl md:text-3xl mb-6 font-title m-color-primary">${escapeForTemplate(metadata.subtitle)}</h2>
        <div class="text-xl mb-6 font-body m-color-secondary">
          <p class="mb-2">An Interactive Adventure for Ages ${escapeForTemplate(metadata.targetAge)}</p>
        </div>
        <div class="border-4 rounded-3xl p-6 inline-block animate-glow m-border-primary m-bg-white">
          <p class="font-semibold mb-2 font-body text-lg m-color-dark">This adventure belongs to:</p>
          <div class="text-3xl font-title m-color-primary" id="childNameDisplay">
            Friend
          </div>
        </div>
        <div class="mt-6">
          <p class="text-lg font-body m-color-secondary">⭐ Earn stars by completing activities! ⭐</p>
        </div>
      </div>
    </div>`;
}

function renderWelcomePage(content: GeneratedContent, seriesInfo?: SeriesInfo | null): string {
  const { metadata, welcome } = content;
  
  // Helper function to render character (image or emoji) - sized well for welcome
  const renderCharacter = () => {
    if (seriesInfo?.character_image_url) {
      return `<img src="${escapeForTemplate(seriesInfo.character_image_url)}" alt="${escapeForTemplate(metadata.characterName)}" class="object-contain flex-shrink-0 m-character-img--welcome">`;
    }
    return `<span class="text-8xl flex-shrink-0">${escapeForTemplate(metadata.characterEmoji)}</span>`;
  };
  
  return `
    <div class="page min-h-screen p-6 md:p-8 m-bg-cream" data-page="welcome">
      <div class="max-w-4xl mx-auto">
        <div class="flex items-center gap-4 mb-4">
          ${renderCharacter()}
          <h1 class="text-3xl md:text-4xl font-title m-color-dark">${escapeForTemplate(welcome.heading)}</h1>
        </div>
        
        <div class="rounded-3xl shadow-xl p-6 mb-4" style="background-color: white; border-left: 6px solid var(--primary);">
          ${welcome.paragraphs.map(p => `<p class="text-lg mb-3 last:mb-0 leading-relaxed font-body m-color-dark">${escapeForTemplate(p)}</p>`).join("")}
        </div>
        
        <div class="rounded-xl p-4 text-center m-bg-soft-yellow">
          <p class="text-lg font-semibold font-body m-color-dark">
            "All feelings are okay—even the big ones!" 💛
          </p>
        </div>
      </div>
    </div>`;
}

function renderChapterDivider(chapter: ChapterDivider): string {
  const ch = chapter.chapterNumber;

  // Journey labels per stage
  const journeyLabel = ch <= 1 ? 'Setting Out' : ch === 2 ? 'Growing Stronger' : 'Welcome to Brain Town';
  const journeyEmoji = ch <= 1 ? '🌿' : ch === 2 ? '🏡' : '🏘️';

  // ── SVG scene builders using CSS vars for colour harmony ──
  // Hills use darkened primary/secondary, buildings use dark + primary tints,
  // windows use soft-yellow (lit) and cream-tinted (unlit), road uses dark + accent dashes.

  // Stage 1: Rolling hills, a tree, a fence — open countryside
  const hillsOnly = `
    <!-- Far hills -->
    <ellipse cx="150" cy="200" rx="280" ry="90" fill="var(--hill-far)"/>
    <ellipse cx="550" cy="200" rx="350" ry="110" fill="var(--hill-near)"/>
    <ellipse cx="950" cy="200" rx="300" ry="95" fill="var(--hill-far)"/>
    <ellipse cx="1150" cy="200" rx="200" ry="70" fill="var(--hill-near)"/>
    <!-- Trees -->
    <rect x="220" y="128" width="6" height="32" fill="var(--tree-trunk)"/>
    <ellipse cx="223" cy="122" rx="20" ry="18" fill="var(--tree-crown)"/>
    <rect x="700" y="135" width="5" height="28" fill="var(--tree-trunk)"/>
    <ellipse cx="702" cy="130" rx="16" ry="15" fill="var(--tree-crown-alt)"/>
    <!-- Fence -->
    <rect x="430" y="155" width="3" height="22" fill="var(--fence)"/>
    <rect x="460" y="155" width="3" height="22" fill="var(--fence)"/>
    <rect x="490" y="155" width="3" height="22" fill="var(--fence)"/>
    <rect x="520" y="155" width="3" height="22" fill="var(--fence)"/>
    <line x1="430" y1="162" x2="520" y2="162" stroke="var(--fence)" stroke-width="2"/>
    <line x1="430" y1="170" x2="520" y2="170" stroke="var(--fence)" stroke-width="2"/>
    <!-- Flowers -->
    <circle cx="340" cy="172" r="4" fill="var(--accent)"/>
    <circle cx="355" cy="168" r="3" fill="var(--soft-yellow)"/>
    <circle cx="365" cy="174" r="4" fill="var(--accent)"/>
    <circle cx="800" cy="165" r="3" fill="var(--soft-yellow)"/>
    <circle cx="815" cy="170" r="4" fill="var(--accent)"/>`;

  // Stage 2: Hills + small village with houses
  const smallVillage = `
    <ellipse cx="200" cy="200" rx="300" ry="100" fill="var(--hill-far)"/>
    <ellipse cx="650" cy="200" rx="380" ry="115" fill="var(--hill-near)"/>
    <ellipse cx="1050" cy="200" rx="280" ry="90" fill="var(--hill-far)"/>
    <!-- House 1 -->
    <rect x="130" y="148" width="42" height="52" rx="2" fill="var(--bld-light)"/>
    <polygon points="125,148 172,148 151,128" fill="var(--bld-roof)"/>
    <rect x="139" y="162" width="10" height="12" rx="1" fill="var(--win-lit)"/>
    <rect x="155" y="162" width="10" height="12" rx="1" fill="var(--win-dim)"/>
    <rect x="147" y="182" width="12" height="18" rx="1" fill="var(--bld-door)"/>
    <!-- House 2 with chimney -->
    <rect x="280" y="138" width="52" height="62" rx="2" fill="var(--bld-dark)"/>
    <polygon points="275,138 332,138 303,115" fill="var(--bld-roof)"/>
    <rect x="315" y="110" width="8" height="28" fill="var(--bld-dark)"/>
    <rect x="289" y="150" width="10" height="12" rx="1" fill="var(--win-lit)"/>
    <rect x="305" y="150" width="10" height="12" rx="1" fill="var(--win-dim)"/>
    <rect x="289" y="170" width="10" height="12" rx="1" fill="var(--win-dim)"/>
    <rect x="305" y="170" width="10" height="12" rx="1" fill="var(--win-lit)"/>
    <!-- Small shop -->
    <rect x="450" y="155" width="48" height="45" rx="2" fill="var(--bld-light)"/>
    <rect x="452" y="155" width="44" height="6" fill="var(--accent)"/>
    <rect x="459" y="168" width="10" height="12" rx="1" fill="var(--win-lit)"/>
    <rect x="479" y="168" width="10" height="12" rx="1" fill="var(--win-lit)"/>
    <!-- House 3 -->
    <rect x="720" y="145" width="42" height="55" rx="2" fill="var(--bld-dark)"/>
    <polygon points="715,145 762,145 738,125" fill="var(--bld-roof)"/>
    <rect x="729" y="158" width="10" height="12" rx="1" fill="var(--win-dim)"/>
    <rect x="745" y="158" width="10" height="12" rx="1" fill="var(--win-lit)"/>
    <!-- Tree -->
    <rect x="600" y="142" width="5" height="25" fill="var(--tree-trunk)"/>
    <ellipse cx="602" cy="137" rx="16" ry="14" fill="var(--tree-crown)"/>
    <!-- Signpost -->
    <rect x="880" y="152" width="4" height="28" fill="var(--fence)"/>
    <rect x="870" y="150" width="32" height="14" rx="3" fill="var(--bld-light)"/>
    <!-- Flowers -->
    <circle cx="390" cy="175" r="4" fill="var(--accent)"/>
    <circle cx="405" cy="178" r="3" fill="var(--soft-yellow)"/>
    <circle cx="660" cy="170" r="3" fill="var(--accent)"/>`;

  // Stage 3: Full Brain Town skyline
  const brainTownCity = `
    <ellipse cx="200" cy="200" rx="300" ry="100" fill="var(--hill-far)"/>
    <ellipse cx="600" cy="200" rx="420" ry="120" fill="var(--hill-near)"/>
    <ellipse cx="1000" cy="200" rx="320" ry="100" fill="var(--hill-far)"/>
    <!-- Tall building left -->
    <rect x="75" y="108" width="46" height="92" rx="2" fill="var(--bld-dark)"/>
    <rect x="83" y="118" width="10" height="12" rx="1" fill="var(--win-dim)"/>
    <rect x="99" y="118" width="10" height="12" rx="1" fill="var(--win-lit)"/>
    <rect x="83" y="138" width="10" height="12" rx="1" fill="var(--win-lit)"/>
    <rect x="99" y="138" width="10" height="12" rx="1" fill="var(--win-dim)"/>
    <rect x="83" y="158" width="10" height="12" rx="1" fill="var(--win-dim)"/>
    <rect x="99" y="158" width="10" height="12" rx="1" fill="var(--win-lit)"/>
    <rect x="83" y="178" width="10" height="12" rx="1" fill="var(--win-lit)"/>
    <!-- Medium building -->
    <rect x="135" y="128" width="56" height="72" rx="2" fill="var(--bld-light)"/>
    <rect x="137" y="128" width="52" height="6" fill="var(--accent)" opacity="0.6"/>
    <rect x="144" y="142" width="10" height="12" rx="1" fill="var(--win-lit)"/>
    <rect x="162" y="142" width="10" height="12" rx="1" fill="var(--win-dim)"/>
    <rect x="144" y="162" width="10" height="12" rx="1" fill="var(--win-dim)"/>
    <rect x="162" y="162" width="10" height="12" rx="1" fill="var(--win-lit)"/>
    <!-- Small house -->
    <rect x="215" y="152" width="42" height="48" rx="2" fill="var(--bld-dark)"/>
    <polygon points="210,152 257,152 233,134" fill="var(--bld-roof)"/>
    <rect x="224" y="165" width="10" height="12" rx="1" fill="var(--win-lit)"/>
    <rect x="240" y="165" width="10" height="12" rx="1" fill="var(--win-dim)"/>
    <!-- ★ Brain Town Tower (HQ) -->
    <rect x="315" y="88" width="52" height="112" rx="2" fill="var(--bld-tower)"/>
    <rect x="317" y="88" width="48" height="8" fill="var(--accent)" opacity="0.7"/>
    <rect x="323" y="104" width="10" height="12" rx="1" fill="var(--win-lit)"/>
    <rect x="343" y="104" width="10" height="12" rx="1" fill="var(--win-lit)"/>
    <rect x="323" y="124" width="10" height="12" rx="1" fill="var(--win-dim)"/>
    <rect x="343" y="124" width="10" height="12" rx="1" fill="var(--win-lit)"/>
    <rect x="323" y="144" width="10" height="12" rx="1" fill="var(--win-lit)"/>
    <rect x="343" y="144" width="10" height="12" rx="1" fill="var(--win-dim)"/>
    <rect x="323" y="164" width="10" height="12" rx="1" fill="var(--win-dim)"/>
    <rect x="343" y="164" width="10" height="12" rx="1" fill="var(--win-lit)"/>
    <rect x="323" y="180" width="10" height="12" rx="1" fill="var(--win-lit)"/>
    <rect x="343" y="180" width="10" height="12" rx="1" fill="var(--win-lit)"/>
    <!-- Antenna + beacon -->
    <line x1="341" y1="88" x2="341" y2="72" stroke="var(--fence)" stroke-width="2"/>
    <circle cx="341" cy="70" r="4" fill="var(--accent)"/>
    <!-- Clock face -->
    <circle cx="341" cy="97" r="6" fill="var(--win-dim)" opacity="0.5"/>
    <circle cx="341" cy="97" r="5" fill="none" stroke="var(--bld-dark)" stroke-width="1"/>
    <!-- Buildings cluster mid -->
    <rect x="415" y="138" width="46" height="62" rx="2" fill="var(--bld-light)"/>
    <rect x="423" y="150" width="10" height="12" rx="1" fill="var(--win-lit)"/>
    <rect x="439" y="150" width="10" height="12" rx="1" fill="var(--win-dim)"/>
    <rect x="423" y="170" width="10" height="12" rx="1" fill="var(--win-dim)"/>
    <rect x="439" y="170" width="10" height="12" rx="1" fill="var(--win-lit)"/>
    <rect x="475" y="122" width="56" height="78" rx="2" fill="var(--bld-dark)"/>
    <rect x="483" y="134" width="10" height="12" rx="1" fill="var(--win-dim)"/>
    <rect x="503" y="134" width="10" height="12" rx="1" fill="var(--win-lit)"/>
    <rect x="483" y="154" width="10" height="12" rx="1" fill="var(--win-lit)"/>
    <rect x="503" y="154" width="10" height="12" rx="1" fill="var(--win-dim)"/>
    <rect x="483" y="174" width="10" height="12" rx="1" fill="var(--win-lit)"/>
    <!-- Park trees -->
    <rect x="558" y="158" width="5" height="22" fill="var(--tree-trunk)"/>
    <ellipse cx="560" cy="153" rx="15" ry="13" fill="var(--tree-crown)"/>
    <rect x="590" y="152" width="5" height="26" fill="var(--tree-trunk)"/>
    <ellipse cx="592" cy="147" rx="17" ry="15" fill="var(--tree-crown-alt)"/>
    <!-- Right buildings -->
    <rect x="695" y="132" width="50" height="68" rx="2" fill="var(--bld-light)"/>
    <polygon points="690,132 745,132 717,112" fill="var(--bld-roof)"/>
    <rect x="704" y="145" width="10" height="12" rx="1" fill="var(--win-lit)"/>
    <rect x="722" y="145" width="10" height="12" rx="1" fill="var(--win-dim)"/>
    <rect x="704" y="165" width="10" height="12" rx="1" fill="var(--win-dim)"/>
    <rect x="722" y="165" width="10" height="12" rx="1" fill="var(--win-lit)"/>
    <rect x="765" y="148" width="40" height="52" rx="2" fill="var(--bld-dark)"/>
    <rect x="773" y="160" width="10" height="12" rx="1" fill="var(--win-lit)"/>
    <rect x="789" y="160" width="10" height="12" rx="1" fill="var(--win-dim)"/>
    <rect x="835" y="118" width="58" height="82" rx="2" fill="var(--bld-light)"/>
    <rect x="837" y="118" width="54" height="6" fill="var(--accent)" opacity="0.5"/>
    <rect x="844" y="132" width="10" height="12" rx="1" fill="var(--win-dim)"/>
    <rect x="864" y="132" width="10" height="12" rx="1" fill="var(--win-lit)"/>
    <rect x="844" y="152" width="10" height="12" rx="1" fill="var(--win-lit)"/>
    <rect x="864" y="152" width="10" height="12" rx="1" fill="var(--win-dim)"/>
    <rect x="844" y="172" width="10" height="12" rx="1" fill="var(--win-dim)"/>
    <rect x="864" y="172" width="10" height="12" rx="1" fill="var(--win-lit)"/>
    <!-- Far right houses -->
    <rect x="945" y="155" width="42" height="45" rx="2" fill="var(--bld-dark)"/>
    <polygon points="940,155 987,155 963,138" fill="var(--bld-roof)"/>
    <rect x="954" y="168" width="10" height="12" rx="1" fill="var(--win-lit)"/>
    <rect x="1020" y="162" width="36" height="38" rx="2" fill="var(--bld-light)"/>
    <rect x="1028" y="172" width="10" height="12" rx="1" fill="var(--win-dim)"/>`;

  const scene = ch <= 1 ? hillsOnly : ch === 2 ? smallVillage : brainTownCity;

  return `
    <div class="page chapter-scene-page m-chapter-scene" data-page="chapter">

      <!-- Daytime sky -->
      <div style="position:absolute;inset:0;background:linear-gradient(180deg,
        color-mix(in srgb, var(--primary) 12%, #e0f0ff) 0%,
        color-mix(in srgb, var(--primary) 8%, #f0f7ff) 25%,
        color-mix(in srgb, var(--cream) 50%, #f8fbff) 55%,
        var(--cream) 100%
      );"></div>

      <!-- Sun glow -->
      <div class="m-chapter-sun"></div>

      <!-- Soft clouds (pure CSS) -->
      <div class="m-chapter-stars">
        <div class="ch-cloud ch-cloud-1"></div>
        <div class="ch-cloud ch-cloud-2"></div>
        <div class="ch-cloud ch-cloud-3"></div>
        <div class="ch-cloud ch-cloud-4"></div>
      </div>

      <!-- Landscape at bottom — 280px -->
      <div class="m-chapter-hills">
        <svg viewBox="0 0 1200 200" preserveAspectRatio="xMidYMax slice" class="w-full h-full">
          ${scene}
          <!-- Road surface -->
          <rect x="0" y="185" width="1200" height="15" fill="color-mix(in srgb, var(--dark) 85%, var(--primary))" rx="0"/>
          <!-- Road centre line -->
          <line x1="0" y1="192" x2="1200" y2="192" stroke="var(--accent)" stroke-width="2" stroke-dasharray="12 12" class="ch-road-dash"/>
        </svg>
      </div>

      <!-- Content — centred above scene -->
      <div class="m-chapter-content">
        <!-- Journey badge -->
        <div class="m-chapter-badge">
          <span class="m-chapter-badge__emoji">${journeyEmoji}</span>
          <span class="m-chapter-badge__label">${escapeForTemplate(journeyLabel)}</span>
        </div>

        <!-- Chapter number + title -->
        <div class="m-chapter-title-wrap">
          <h1 class="m-chapter-number">
            Chapter ${chapter.chapterNumber}
          </h1>
          <h2 class="m-chapter-heading">
            ${escapeForTemplate(chapter.chapterTitle)}
          </h2>
        </div>

        <!-- Decorative dashes in accent colour -->
        <div class="m-chapter-dots">
          <div class="m-chapter-dot"></div>
          <div class="m-chapter-dot"></div>
          <div class="m-chapter-dot--active"></div>
          <div class="m-chapter-dot"></div>
          <div class="m-chapter-dot"></div>
        </div>

        <!-- Subtitle -->
        <p class="m-chapter-subtitle">
          ${escapeForTemplate(chapter.chapterSubtitle)}
        </p>
      </div>

      <!-- Scoped styles — all derived from theme vars for colour harmony -->
      <style>
        .chapter-scene-page {
          /* Hill colours: darken primary & secondary to earthy greens */
          --hill-near: color-mix(in srgb, var(--secondary) 40%, #3a7a5a);
          --hill-far: color-mix(in srgb, var(--primary) 30%, #4a8a6a);
          /* Tree colours */
          --tree-trunk: color-mix(in srgb, var(--dark) 60%, #6b5b3a);
          --tree-crown: color-mix(in srgb, var(--secondary) 45%, #4a8a5a);
          --tree-crown-alt: color-mix(in srgb, var(--primary) 35%, #5a9a6a);
          /* Building colours */
          --bld-dark: color-mix(in srgb, var(--dark) 80%, var(--primary));
          --bld-light: color-mix(in srgb, var(--dark) 60%, var(--cream));
          --bld-tower: color-mix(in srgb, var(--primary) 55%, var(--dark));
          --bld-roof: color-mix(in srgb, var(--accent) 60%, var(--dark));
          --bld-door: color-mix(in srgb, var(--dark) 85%, var(--accent));
          /* Window colours */
          --win-lit: var(--soft-yellow);
          --win-dim: color-mix(in srgb, var(--cream) 50%, var(--secondary) 20%);
          /* Fence */
          --fence: color-mix(in srgb, var(--dark) 45%, var(--cream));
        }
        @keyframes chRoadDash{from{stroke-dashoffset:24}to{stroke-dashoffset:0}}
        .ch-road-dash{animation:chRoadDash 1s linear infinite}
        @keyframes chCloudDrift{from{transform:translateX(-300px)}to{transform:translateX(calc(100vw + 300px))}}
        .ch-cloud{position:absolute;border-radius:200px;background:rgba(255,255,255,0.45);filter:blur(8px);animation:chCloudDrift linear infinite;will-change:transform}
        .ch-cloud-1{top:10%;width:140px;height:50px;animation-duration:55s;animation-delay:-10s;opacity:0.3}
        .ch-cloud-2{top:18%;width:100px;height:38px;animation-duration:45s;animation-delay:-25s;opacity:0.25}
        .ch-cloud-3{top:8%;width:170px;height:60px;animation-duration:65s;animation-delay:-40s;opacity:0.2}
        .ch-cloud-4{top:25%;width:110px;height:42px;animation-duration:50s;animation-delay:-5s;opacity:0.3}
      </style>
    </div>`;
}

function renderLessonPage(lesson: LessonContent, metadata: ModuleMetadata): string {
  const calloutHtml = lesson.calloutTitle && lesson.calloutText ? `
    <div class="rounded-2xl p-6 mb-6 m-bg-soft-yellow">
      <h3 class="text-xl font-title mb-2 m-color-dark">💡 ${escapeForTemplate(lesson.calloutTitle)}</h3>
      <p class="font-body m-color-dark">${escapeForTemplate(lesson.calloutText)}</p>
    </div>` : "";
    
  const tipHtml = lesson.tipText ? `
    <div class="rounded-xl p-4 flex items-center gap-3 m-bg-light-green">
      <span class="text-3xl">${escapeForTemplate(metadata.characterEmoji)}</span>
      <p class="font-body font-semibold m-color-dark">${escapeForTemplate(lesson.tipText)}</p>
    </div>` : "";

  return `
    <div class="page min-h-screen p-8 m-bg-cream" data-page="lesson">
      <div class="max-w-4xl mx-auto">
        <h1 class="text-3xl md:text-4xl mb-6 font-title m-color-dark">${escapeForTemplate(lesson.heading)}</h1>
        
        <div class="rounded-3xl shadow-xl p-8 mb-6 m-bg-white">
          ${lesson.paragraphs.map(p => `<p class="text-lg mb-4 leading-relaxed font-body m-color-dark">${escapeForTemplate(p)}</p>`).join("")}
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
      <input type="checkbox" class="checklist-item w-6 h-6 rounded m-accent-primary">
      <span class="font-body text-lg m-color-dark">${escapeForTemplate(item)}</span>
    </label>`).join("");

  return `
    <div class="page min-h-screen p-8 m-bg-cream" data-page="checklist">
      <div class="max-w-4xl mx-auto">
        <h1 class="text-3xl md:text-4xl mb-6 font-title m-color-dark">${escapeForTemplate(checklist.heading)}</h1>
        
        <div class="rounded-3xl shadow-xl p-8 m-bg-white">
          <p class="text-lg mb-6 font-body m-color-dark">${escapeForTemplate(checklist.instructions)}</p>
          
          <div class="space-y-3 mb-6">
            ${itemsHtml}
          </div>
          
          <div class="rounded-xl p-4 flex items-center gap-3 m-bg-light-green">
            <input 
              type="checkbox" 
              class="w-8 h-8 rounded cursor-pointer m-accent-primary"
              data-activity="${activityId}"
              disabled
              onchange="markActivityComplete('${activityId}')"
              
            >
            <label class="font-title text-xl m-color-dark">I completed this activity! ⭐</label>
          </div>
        </div>
      </div>
    </div>`;
}

function renderReflectionPage(reflection: ReflectionContent, starIndex: number): string {
  const activityId = `reflection_${starIndex}`;
  return `
    <div class="page min-h-screen p-8 m-bg-cream" data-page="reflection">
      <div class="max-w-4xl mx-auto">
        <h1 class="text-3xl md:text-4xl mb-6 font-title m-color-dark">${escapeForTemplate(reflection.heading)}</h1>
        
        <div class="rounded-3xl shadow-xl p-8 m-bg-white">
          <p class="text-lg mb-6 font-body m-color-dark">${escapeForTemplate(reflection.prompt)}</p>
          
          <textarea 
            class="reflection-input w-full rounded-xl p-4 border-3 font-body text-lg mb-6 m-input-cream"
            placeholder="${escapeForTemplate(reflection.placeholder)}"
            data-form-key="reflection_${starIndex}"
            onchange="saveFormData('reflection_${starIndex}', this.value)"
          ></textarea>
          
          <div class="rounded-xl p-4 flex items-center gap-3 m-bg-light-green">
            <input 
              type="checkbox" 
              class="w-8 h-8 rounded cursor-pointer m-accent-primary"
              data-activity="${activityId}"
              disabled
              onchange="markActivityComplete('${activityId}')"
              
            >
            <label class="font-title text-xl m-color-dark">I finished my reflection! ⭐</label>
          </div>
        </div>
      </div>
    </div>`;
}

function renderQuizPage(quiz: QuizContent, starIndex: number): string {
  const activityId = `quiz_${starIndex}`;
  const answersHtml = quiz.answers.map((ans) => `
    <button 
      class="quiz-answer w-full text-left p-4 rounded-xl border-2 font-body text-lg transition-all hover:shadow-md cursor-pointer m-option-secondary"
      data-correct="${ans.isCorrect}"
      data-feedback="${escapeForTemplate(ans.feedback)}"
    >
      ${escapeForTemplate(ans.text)}
    </button>`).join("");

  return `
    <div class="page min-h-screen p-8 m-bg-cream" data-page="quiz">
      <div class="max-w-4xl mx-auto">
        <h1 class="text-3xl md:text-4xl mb-6 font-title m-color-dark">${escapeForTemplate(quiz.heading)}</h1>
        
        <div class="rounded-3xl shadow-xl p-8 m-bg-white">
          <p class="text-xl mb-6 font-body font-semibold m-color-dark">${escapeForTemplate(quiz.question)}</p>
          
          <div class="space-y-3 mb-6">
            ${answersHtml}
          </div>
          
          <p class="quiz-feedback text-lg font-body mb-6 p-4 rounded-xl" style="display: none; background-color: var(--soft-yellow); color: var(--dark);"></p>
          
          <div class="rounded-xl p-4 flex items-center gap-3 m-bg-light-green">
            <input 
              type="checkbox" 
              class="w-8 h-8 rounded cursor-pointer m-accent-primary"
              data-activity="${activityId}"
              disabled
              onchange="markActivityComplete('${activityId}')"
              
            >
            <label class="font-title text-xl m-color-dark">I completed the quiz! ⭐</label>
          </div>
        </div>
      </div>
    </div>`;
}

function renderDrawingPage(drawing: DrawingContent, starIndex: number): string {
  const activityId = `drawing_${starIndex}`;
  const drawingCacheKey = `drawing_canvas_${starIndex}`;
  return `
    <div class="page min-h-screen p-8 m-bg-cream" data-page="drawing">
      <div class="max-w-4xl mx-auto">
        <h1 class="text-3xl md:text-4xl mb-6 font-title m-color-dark">${escapeForTemplate(drawing.heading)}</h1>
        
        <div class="rounded-3xl shadow-xl p-8 m-bg-white">
          <p class="text-lg mb-6 font-body m-color-dark">${escapeForTemplate(drawing.instructions)}</p>
          
          <div class="border-4 rounded-xl mb-4 overflow-hidden m-border-primary m-bg-white">
            <canvas class="drawing-canvas w-full cursor-crosshair" width="700" height="400" data-drawing-key="${drawingCacheKey}" style="touch-action: none; display: block;"></canvas>
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
            <label class="block font-semibold mb-2 font-body m-color-dark">${escapeForTemplate(drawing.promptQuestion)}</label>
            <input 
              type="text" 
              class="w-full rounded-xl p-3 font-body text-lg m-input-cream" style="min-height: auto;"
              placeholder="Type your answer here..."
              data-form-key="drawing_answer_${starIndex}"
              onchange="saveFormData('drawing_answer_${starIndex}', this.value)"
            >
          </div>
          
          <div class="rounded-xl p-4 flex items-center gap-3 m-bg-light-green">
            <input 
              type="checkbox" 
              class="w-8 h-8 rounded cursor-pointer m-accent-primary"
              data-activity="${activityId}"
              onchange="markActivityComplete('${activityId}')"
              
            >
            <label class="font-title text-xl m-color-dark">I completed my drawing! ⭐</label>
          </div>
        </div>
      </div>
    </div>`;
}

function renderBreathingPage(breathing: BreathingContent, starIndex: number): string {
  const activityId = `breathing_${starIndex}`;
  const breathingId = `breathingExercise_${starIndex}`;
  return `
    <div class="page min-h-screen p-8 m-bg-cream" data-page="breathing">
      <div class="max-w-4xl mx-auto">
        <h1 class="text-3xl md:text-4xl mb-6 font-title m-color-dark">${escapeForTemplate(breathing.heading)}</h1>
        
        <div class="rounded-3xl shadow-xl p-8 m-bg-white">
          <p class="text-lg mb-6 font-body text-center m-color-dark">${escapeForTemplate(breathing.instructions)}</p>
          
          <!-- Animated Breathing Circle -->
          <div class="text-center mb-6">
            <div id="${breathingId}" class="breathing-circle mx-auto rounded-full flex items-center justify-center cursor-pointer"
                 style="width: 160px; height: 160px; background: linear-gradient(135deg, var(--light-green), var(--secondary)); transition: transform 4s ease-in-out, box-shadow 4s ease-in-out;"
                 onclick="window.toggleBreathing('${breathingId}')">
              <div class="text-center">
                <div class="breathing-emoji text-5xl mb-1">🌬️</div>
                <div class="breathing-text font-title text-lg m-color-dark">Tap to Start</div>
              </div>
            </div>
            <div class="mt-3 font-body text-sm" style="color: var(--dark); opacity: 0.7;">Tap the circle to begin</div>
          </div>
          
          <!-- Phase Cards -->
          <div class="grid md:grid-cols-3 gap-4 mb-6">
            <div id="${breathingId}_inhale" class="breathing-phase rounded-2xl p-5 text-center transition-all duration-300" style="background-color: var(--light-green); opacity: 0.5; transform: scale(0.95);">
              <div class="text-3xl mb-2">😤</div>
              <h3 class="font-title text-lg mb-1 m-color-dark">Breathe In</h3>
              <p class="font-body text-sm m-color-dark">${escapeForTemplate(breathing.inhaleText)}</p>
              <div class="breathing-timer font-title text-2xl mt-2 m-feedback-hidden-primary">4</div>
            </div>
            <div id="${breathingId}_hold" class="breathing-phase rounded-2xl p-5 text-center transition-all duration-300" style="background-color: var(--soft-yellow); opacity: 0.5; transform: scale(0.95);">
              <div class="text-3xl mb-2">😊</div>
              <h3 class="font-title text-lg mb-1 m-color-dark">Hold</h3>
              <p class="font-body text-sm m-color-dark">${escapeForTemplate(breathing.holdText)}</p>
              <div class="breathing-timer font-title text-2xl mt-2 m-feedback-hidden-primary">4</div>
            </div>
            <div id="${breathingId}_exhale" class="breathing-phase rounded-2xl p-5 text-center transition-all duration-300" style="background-color: var(--primary); opacity: 0.5; transform: scale(0.95);">
              <div class="text-3xl mb-2">😌</div>
              <h3 class="font-title text-lg mb-1 m-color-white">Breathe Out</h3>
              <p class="font-body text-sm m-color-white">${escapeForTemplate(breathing.exhaleText)}</p>
              <div class="breathing-timer font-title text-2xl mt-2" style="color: white; display: none;">4</div>
            </div>
          </div>
          
          <!-- Breath Counter -->
          <div class="text-center mb-6">
            <span class="font-body m-color-dark">Breaths completed: </span>
            <span id="${breathingId}_count" class="font-title text-xl m-color-primary">0</span>
            <span class="font-body m-color-dark"> / 3</span>
          </div>
          
          <div class="rounded-xl p-4 flex items-center gap-3 m-bg-light-green">
            <input 
              type="checkbox" 
              id="${activityId}_checkbox"
              class="w-8 h-8 rounded cursor-pointer m-accent-primary"
              data-activity="${activityId}"
              onchange="markActivityComplete('${activityId}')"
              
            />
            <label class="font-title text-xl m-color-dark">I practiced calm breathing! ⭐</label>
          </div>
        </div>
      </div>
    </div>`;
}


function renderScenarioPage(scenario: ScenarioContent, starIndex: number): string {
  const activityId = `scenario_${starIndex}`;
  const optionsHtml = scenario.options.map((opt) => `
    <button class="scenario-option w-full text-left p-4 rounded-xl border-2 font-body text-lg transition-all hover:shadow-md cursor-pointer m-option-secondary" data-good="${opt.isGood}" data-feedback="${escapeForTemplate(opt.feedback)}">${escapeForTemplate(opt.text)}</button>`).join("");
  return `
    <div class="page min-h-screen p-8 m-bg-cream" data-page="scenario">
      <div class="max-w-4xl mx-auto">
        <h1 class="text-3xl md:text-4xl mb-6 font-title m-color-dark">${escapeForTemplate(scenario.heading)}</h1>
        <div class="rounded-3xl shadow-xl p-8 m-bg-white">
          <div class="rounded-2xl p-6 mb-6 m-bg-soft-yellow"><p class="text-lg font-body m-color-dark">${escapeForTemplate(scenario.scenario)}</p></div>
          <p class="text-xl mb-6 font-body font-semibold m-color-dark">${escapeForTemplate(scenario.question)}</p>
          <div class="space-y-3 mb-6">${optionsHtml}</div>
          <p class="scenario-feedback text-lg font-body mb-6 p-4 rounded-xl" style="display: none; background-color: var(--light-green); color: var(--dark);"></p>
          <div class="rounded-xl p-4 flex items-center gap-3 m-bg-light-green">
            <input type="checkbox" class="w-8 h-8 rounded cursor-pointer m-accent-primary" data-activity="${activityId}" onchange="markActivityComplete('${activityId}')" >
            <label class="font-title text-xl m-color-dark">I thought about this scenario! ⭐</label>
          </div>
        </div>
      </div>
    </div>`;
}

function renderFeelingThermometerPage(thermometer: FeelingThermometerContent, starIndex: number): string {
  const activityId = `thermometer_${starIndex}`;
  return `
    <div class="page min-h-screen p-8 m-bg-cream" data-page="feeling-thermometer">
      <div class="max-w-4xl mx-auto">
        <h1 class="text-3xl md:text-4xl mb-6 font-title m-color-dark">${escapeForTemplate(thermometer.heading)}</h1>
        <div class="rounded-3xl shadow-xl p-8 m-bg-white">
          <p class="text-lg mb-6 font-body m-color-dark">${escapeForTemplate(thermometer.instructions)}</p>
          <div class="mb-8">
            <div class="flex justify-between mb-2">
              <span class="font-body text-sm m-color-secondary">${escapeForTemplate(thermometer.lowLabel)}</span>
              <span class="font-body text-sm m-color-accent">${escapeForTemplate(thermometer.highLabel)}</span>
            </div>
            <input type="range" min="1" max="10" value="5" class="thermometer-slider w-full" oninput="this.parentElement.querySelector('.thermometer-value').textContent = this.value; saveFormData('thermometer_${starIndex}', this.value)">
            <div class="text-center mt-4"><span class="thermometer-value text-4xl font-title m-color-primary">5</span></div>
          </div>
          <div class="mb-6">
            <label class="block font-semibold mb-2 font-body m-color-dark">${escapeForTemplate(thermometer.followUpQuestion)}</label>
            <textarea class="w-full rounded-xl p-4 font-body text-lg m-input-cream" style="min-height: 100px;" placeholder="Write your thoughts here..." data-form-key="thermometer_followup_${starIndex}" onchange="saveFormData('thermometer_followup_${starIndex}', this.value)"></textarea>
          </div>
          <div class="rounded-xl p-4 flex items-center gap-3 m-bg-light-green">
            <input type="checkbox" class="w-8 h-8 rounded cursor-pointer m-accent-primary" data-activity="${activityId}" onchange="markActivityComplete('${activityId}')" >
            <label class="font-title text-xl m-color-dark">I checked my feelings thermometer! ⭐</label>
          </div>
        </div>
      </div>
    </div>`;
}

function renderBodyMapPage(bodyMap: BodyMapContent, starIndex: number): string {
  const activityId = `bodymap_${starIndex}`;
  const partsHtml = bodyMap.bodyParts.map((part) => `
    <button class="body-part-btn flex items-center gap-3 p-4 rounded-xl border-2 transition-all hover:shadow-md cursor-pointer w-full text-left m-option-secondary" onclick="this.classList.toggle('selected'); this.style.backgroundColor = this.classList.contains('selected') ? 'var(--light-green)' : 'white';">
      <span class="text-3xl">${escapeForTemplate(part.emoji)}</span>
      <div>
        <span class="font-title text-lg">${escapeForTemplate(part.name)}</span>
        <p class="font-body text-sm m-color-secondary">${escapeForTemplate(part.description)}</p>
      </div>
    </button>`).join("");

  return `
    <div class="page min-h-screen p-8 m-bg-cream" data-page="body-map">
      <div class="max-w-4xl mx-auto">
        <h1 class="text-3xl md:text-4xl mb-6 font-title m-color-dark">${escapeForTemplate(bodyMap.heading)}</h1>
        
        <div class="rounded-3xl shadow-xl p-8 m-bg-white">
          <p class="text-lg mb-6 font-body m-color-dark">${escapeForTemplate(bodyMap.instructions)}</p>
          <div class="grid gap-3 mb-6">${partsHtml}</div>
          <div class="rounded-xl p-4 flex items-center gap-3 m-bg-light-green">
            <input type="checkbox" class="w-8 h-8 rounded cursor-pointer m-accent-primary" data-activity="${activityId}" onchange="markActivityComplete('${activityId}')" >
            <label class="font-title text-xl m-color-dark">I explored my body map! ⭐</label>
          </div>
        </div>
      </div>
    </div>`;
}

function renderFeelingSelectorPage(selector: FeelingSelectorContent, starIndex: number): string {
  const activityId = `feeling_${starIndex}`;
  const feelingsHtml = selector.feelings.map((f) => `
    <button class="feeling-btn flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all hover:shadow-md cursor-pointer" style="border-color: ${f.color}; background-color: white;" onclick="this.classList.toggle('selected'); this.style.backgroundColor = this.classList.contains('selected') ? '${f.color}' : 'white'; var followUp = this.closest('.page').querySelector('.feeling-followup'); if(followUp) followUp.style.display = 'block';">
      <span class="text-4xl">${escapeForTemplate(f.emoji)}</span>
      <span class="font-body font-semibold m-color-dark">${escapeForTemplate(f.name)}</span>
    </button>`).join("");

  return `
    <div class="page min-h-screen p-8 m-bg-cream" data-page="feeling-selector">
      <div class="max-w-4xl mx-auto">
        <h1 class="text-3xl md:text-4xl mb-6 font-title m-color-dark">${escapeForTemplate(selector.heading)}</h1>
        
        <div class="rounded-3xl shadow-xl p-8 m-bg-white">
          <p class="text-lg mb-6 font-body m-color-dark">${escapeForTemplate(selector.instructions)}</p>
          <div class="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">${feelingsHtml}</div>
          <div class="feeling-followup mb-6 m-hidden">
            <label class="block font-semibold mb-2 font-body m-color-dark">${escapeForTemplate(selector.followUpQuestion)}</label>
            <textarea class="w-full rounded-xl p-4 font-body text-lg m-input-cream" style="min-height: 100px;" placeholder="Write your thoughts here..." data-form-key="feeling_followup_${starIndex}" onchange="saveFormData('feeling_followup_${starIndex}', this.value)"></textarea>
          </div>
          <div class="rounded-xl p-4 flex items-center gap-3 m-bg-light-green">
            <input type="checkbox" class="w-8 h-8 rounded cursor-pointer m-accent-primary" data-activity="${activityId}" onchange="markActivityComplete('${activityId}')" >
            <label class="font-title text-xl m-color-dark">I identified my feelings! ⭐</label>
          </div>
        </div>
      </div>
    </div>`;
}

function renderCalmDenBuilderPage(denBuilder: CalmDenBuilderContent, starIndex: number, metadata: ModuleMetadata): string {
  const activityId = `calmden_${starIndex}`;
  const itemsHtml = denBuilder.items.map((item) => `
    <button class="den-item-btn flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all hover:shadow-md cursor-pointer m-card-bordered" onclick="this.classList.toggle('selected'); this.style.backgroundColor = this.classList.contains('selected') ? 'var(--light-green)' : 'white';">
      <span class="text-4xl">${escapeForTemplate(item.emoji)}</span>
      <span class="font-body font-semibold text-center m-color-dark">${escapeForTemplate(item.name)}</span>
    </button>`).join("");

  return `
    <div class="page min-h-screen p-8 m-bg-cream" data-page="calm-den-builder">
      <div class="max-w-4xl mx-auto">
        <h1 class="text-3xl md:text-4xl mb-6 font-title m-color-dark">${escapeForTemplate(denBuilder.heading)}</h1>
        
        <div class="rounded-3xl shadow-xl p-8 m-bg-white">
          <div class="rounded-2xl p-6 mb-6 flex items-start gap-4 m-bg-soft-yellow">
            <span class="text-4xl">${escapeForTemplate(metadata.characterEmoji)}</span>
            <p class="text-lg font-body m-color-dark">${escapeForTemplate(denBuilder.storyText)}</p>
          </div>
          <p class="text-lg mb-6 font-body font-semibold m-color-dark">${escapeForTemplate(denBuilder.instructions)}</p>
          <div class="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">${itemsHtml}</div>
          <div class="mb-6">
            <label class="block font-semibold mb-2 font-body m-color-dark">${escapeForTemplate(denBuilder.locationQuestion)}</label>
            <input type="text" class="w-full rounded-xl p-4 font-body text-lg m-input-cream" style="min-height: auto;" placeholder="e.g., My bedroom, under my blanket..." data-form-key="calmden_location_${starIndex}" onchange="saveFormData('calmden_location_${starIndex}', this.value)">
          </div>
          <div class="rounded-xl p-4 flex items-center gap-3 m-bg-light-green">
            <input type="checkbox" class="w-8 h-8 rounded cursor-pointer m-accent-primary" data-activity="${activityId}" onchange="markActivityComplete('${activityId}')" >
            <label class="font-title text-xl m-color-dark">I built my calm-down den! ⭐</label>
          </div>
        </div>
      </div>
    </div>`;
}

function renderActionPlanPage(actionPlan: ActionPlanContent, starIndex: number): string {
  const activityId = `actionplan_${starIndex}`;
  const stepsHtml = actionPlan.steps.map((step) => `
    <div class="rounded-xl p-4 mb-4 m-bg-soft-yellow">
      <div class="flex items-center gap-3 mb-2">
        <span class="w-8 h-8 rounded-full flex items-center justify-center font-title text-white m-bg-primary">${step.stepNumber}</span>
        <h3 class="font-title text-xl m-color-dark">${escapeForTemplate(step.title)}</h3>
      </div>
      <p class="font-body mb-2 m-color-dark">${escapeForTemplate(step.prompt)}</p>
      <input type="text" class="w-full rounded-lg p-3 font-body" style="background-color: white; border: 2px solid var(--primary); color: var(--dark);" placeholder="${escapeForTemplate(step.placeholder)}" data-form-key="actionplan_step${step.stepNumber}_${starIndex}" onchange="saveFormData('actionplan_step${step.stepNumber}_${starIndex}', this.value)">
    </div>`).join("");

  return `
    <div class="page min-h-screen p-8 m-bg-cream" data-page="action-plan">
      <div class="max-w-4xl mx-auto">
        <h1 class="text-3xl md:text-4xl mb-6 font-title m-color-dark">${escapeForTemplate(actionPlan.heading)}</h1>
        
        <div class="rounded-3xl shadow-xl p-8 m-bg-white">
          <p class="text-lg mb-6 font-body m-color-dark">${escapeForTemplate(actionPlan.instructions)}</p>
          ${stepsHtml}
          <div class="rounded-xl p-4 flex items-center gap-3 m-bg-light-green">
            <input type="checkbox" class="w-8 h-8 rounded cursor-pointer m-accent-primary" data-activity="${activityId}" onchange="markActivityComplete('${activityId}')" >
            <label class="font-title text-xl m-color-dark">I created my action plan! ⭐</label>
          </div>
        </div>
      </div>
    </div>`;
}

function renderWarningSignsPage(warningSigns: WarningSingsContent, starIndex: number): string {
  const activityId = `warningsigns_${starIndex}`;
  const categoriesHtml = warningSigns.categories.map((cat) => `
    <div class="rounded-xl p-4 mb-4 m-bg-soft-yellow">
      <div class="flex items-center gap-2 mb-3">
        <span class="text-2xl">${escapeForTemplate(cat.emoji)}</span>
        <h3 class="font-title text-xl m-color-dark">${escapeForTemplate(cat.category)}</h3>
      </div>
      <div class="space-y-2">
        ${cat.examples.map((ex, i) => `
          <label class="flex items-center gap-3 p-2 rounded-lg bg-white cursor-pointer hover:shadow-sm transition-all">
            <input type="checkbox" class="warning-sign-item w-5 h-5 rounded m-accent-primary">
            <span class="font-body m-color-dark">${escapeForTemplate(ex)}</span>
          </label>
        `).join("")}
      </div>
    </div>`).join("");

  return `
    <div class="page min-h-screen p-8 m-bg-cream" data-page="warning-signs">
      <div class="max-w-4xl mx-auto">
        <h1 class="text-3xl md:text-4xl mb-6 font-title m-color-dark">${escapeForTemplate(warningSigns.heading)}</h1>
        
        <div class="rounded-3xl shadow-xl p-8 m-bg-white">
          <p class="text-lg mb-6 font-body m-color-dark">${escapeForTemplate(warningSigns.instructions)}</p>
          
          ${categoriesHtml}
          
          <div class="rounded-xl p-4 flex items-center gap-3 m-bg-light-green">
            <input 
              type="checkbox" 
              class="w-8 h-8 rounded cursor-pointer m-accent-primary"
              data-activity="${activityId}"
              onchange="markActivityComplete('${activityId}')"
              
            >
            <label class="font-title text-xl m-color-dark">I identified my warning signs! ⭐</label>
          </div>
        </div>
      </div>
    </div>`;
}

function renderBalloonPopPage(balloon: BalloonPopContent, starIndex: number, metadata: ModuleMetadata): string {
  const activityId = `balloon_${starIndex}`;
  
  const balloonsHtml = balloon.balloons.map(b => `
    <div class="balloon-item flex flex-col items-center p-4 rounded-2xl border-3 cursor-pointer transition-all hover:scale-105"
         id="balloon_${b.id}"
         style="background-color: ${b.color}20; border-color: ${b.color};"
         data-response="${escapeForTemplate(b.popResponse)}"
         onclick="window.popBalloon('${b.id}', '${activityId}', ${balloon.balloons.length})">
      <span class="text-5xl mb-2 animate-bounce-slow">🎈</span>
      <span class="text-2xl mb-1">${b.emoji}</span>
      <p class="font-body text-sm text-center m-color-dark">"${escapeForTemplate(b.worryText)}"</p>
    </div>
  `).join("");
  
  const toolsHtml = balloon.calmingTools.map(t => `
    <button class="calming-tool p-4 rounded-xl border-2 transition-all hover:scale-105 cursor-pointer flex flex-col items-center gap-2"
            style="background-color: var(--light-green); border-color: var(--secondary);"
            onclick="window.useCalmingTool('${t.id}', ${t.power}, '${escapeForOnclick(t.tool)}')">
      <span class="text-3xl">${t.emoji}</span>
      <span class="font-body text-sm m-color-dark">${escapeForTemplate(t.tool)}</span>
      <span class="text-xs px-2 py-1 rounded-full m-bg-soft-yellow">+${t.power}</span>
    </button>
  `).join("");

  return `
    <div class="page min-h-screen p-8 m-bg-cream" data-page="balloon-pop" data-activity="${activityId}">
      <div class="max-w-4xl mx-auto">
        <h1 class="text-3xl md:text-4xl mb-4 font-title m-color-dark">${escapeForTemplate(balloon.heading)}</h1>
        
        <div class="rounded-3xl shadow-xl p-8 m-bg-white">
          <p class="text-lg mb-4 font-body text-center m-color-dark">${escapeForTemplate(balloon.instructions)}</p>
          
          <div class="p-4 rounded-xl mb-6 m-bg-soft-yellow">
            <p class="font-body text-center m-color-dark">${escapeForTemplate(balloon.scenario)}</p>
          </div>
          
          <div class="mb-6 p-4 rounded-xl m-bg-cream">
            <div class="flex justify-between mb-2">
              <span class="font-title m-color-dark">Calming Power:</span>
              <span class="font-title text-xl" id="balloonPower_${starIndex}" class="m-color-primary">0%</span>
            </div>
            <div class="h-6 rounded-full overflow-hidden m-bg-gray">
              <div class="h-full rounded-full transition-all duration-500" id="balloonPowerBar_${starIndex}" style="width: 0%; background: linear-gradient(90deg, var(--light-green), var(--primary));"></div>
            </div>
          </div>
          
          <p class="font-title text-lg text-center mb-3 m-color-dark">Step 1: Build Calming Power 🧰</p>
          <p class="font-body text-sm text-center mb-3 m-color-secondary">Tap the calming tools to fill your power bar!</p>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">${toolsHtml}</div>
          
          <p class="font-title text-lg text-center mb-3 m-color-dark">Step 2: Pop the Worry Balloons 🎈</p>
          <p class="font-body text-sm text-center mb-3 m-color-secondary">Once you have enough calming power, tap each balloon to pop it!</p>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6" id="balloons_${starIndex}">${balloonsHtml}</div>
          
          <div class="p-4 rounded-xl text-center mb-4" id="balloonFeedback_${starIndex}" class="m-feedback-hidden-green">
            <p class="font-body text-lg" id="balloonFeedbackText_${starIndex}"></p>
          </div>
          
          <div class="p-6 rounded-2xl text-center" id="balloonVictory_${starIndex}" class="m-feedback-hidden">
            <p class="text-5xl mb-2">🎉</p>
            <p class="font-title text-2xl m-color-dark">${escapeForTemplate(balloon.victoryMessage)}</p>
          </div>
          
          <div class="rounded-xl p-4 flex items-center gap-3 mt-4 m-feedback-hidden-green" id="balloonComplete_${starIndex}">
            <input type="checkbox" class="w-8 h-8 rounded cursor-pointer m-accent-primary" data-activity="${activityId}" onchange="markActivityComplete('${activityId}')" >
            <label class="font-title text-xl m-color-dark">I popped all my worries! ⭐</label>
          </div>
        </div>
      </div>
      <style>.balloon-item.popped { opacity: 0.3; pointer-events: none; transform: scale(0.8); }</style>
    </div>`;
}

// ====================
// 2. TREASURE HUNT RENDERER
// ====================

function renderTreasureHuntPage(hunt: TreasureHuntContent, starIndex: number, metadata: ModuleMetadata): string {
  const activityId = `treasure_${starIndex}`;
  
  const locationsHtml = hunt.locations.map(loc => `
    <div class="treasure-location p-4 rounded-2xl border-3 cursor-pointer transition-all hover:scale-105" id="loc_${starIndex}_${loc.id}" class="m-card-bordered" onclick="window.exploreTreasure('${starIndex}', '${loc.id}', ${hunt.locations.length})">
      <div class="flex items-center gap-3 mb-2">
        <span class="text-4xl">${loc.emoji}</span>
        <div>
          <h3 class="font-title text-lg m-color-dark">${escapeForTemplate(loc.name)}</h3>
          <p class="font-body text-sm m-color-secondary">${escapeForTemplate(loc.description)}</p>
        </div>
      </div>
      <div class="treasure-content" id="tc_${starIndex}_${loc.id}" class="m-hidden">
        <div class="p-3 rounded-xl my-3 m-bg-soft-yellow">
          <div class="flex items-center gap-2 mb-2">
            <span class="text-2xl">${loc.treasure.emoji}</span>
            <span class="font-title m-color-dark">Found: ${escapeForTemplate(loc.treasure.name)}!</span>
          </div>
          <p class="font-body text-sm m-color-dark">${escapeForTemplate(loc.treasure.lesson)}</p>
        </div>
        <p class="font-body text-sm mb-2 m-color-dark">${escapeForTemplate(loc.question)}</p>
        <textarea class="w-full p-2 rounded-lg border-2 font-body text-sm m-input-bordered-primary" placeholder="${escapeForTemplate(loc.placeholder)}" onchange="saveFormData('treasure_${starIndex}_${loc.id}', this.value)"></textarea>
      </div>
      <div class="explore-btn mt-2 text-center"><span class="font-body text-sm px-4 py-2 rounded-full m-btn-primary">🔍 Explore</span></div>
    </div>
  `).join("");

  return `
    <div class="page min-h-screen p-8 m-bg-cream" data-page="treasure-hunt" data-activity="${activityId}">
      <div class="max-w-4xl mx-auto">
        <h1 class="text-3xl md:text-4xl mb-4 font-title m-color-dark">${escapeForTemplate(hunt.heading)}</h1>
        <div class="rounded-3xl shadow-xl p-8 m-bg-white">
          <div class="flex items-center justify-center gap-2 mb-4">
            <span class="text-4xl">${hunt.mapEmoji}</span>
            <p class="text-lg font-body m-color-dark">${escapeForTemplate(hunt.storyIntro)}</p>
          </div>
          <p class="text-center mb-6 font-body m-color-secondary">${escapeForTemplate(hunt.instructions)}</p>
          <div class="mb-6 p-3 rounded-xl text-center m-bg-cream">
            <p class="font-title m-color-dark">Treasures: <span id="treasureCount_${starIndex}">0</span>/${hunt.locations.length}</p>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">${locationsHtml}</div>
          <div class="p-6 rounded-2xl text-center" id="treasureVictory_${starIndex}" class="m-feedback-hidden">
            <p class="text-5xl mb-2">🏆</p>
            <p class="font-title text-2xl m-color-dark">${escapeForTemplate(hunt.completionMessage)}</p>
          </div>
          <div class="rounded-xl p-4 flex items-center gap-3 mt-4 m-feedback-hidden-green" id="treasureComplete_${starIndex}">
            <input type="checkbox" class="w-8 h-8 rounded cursor-pointer m-accent-primary" data-activity="${activityId}" onchange="markActivityComplete('${activityId}')" >
            <label class="font-title text-xl m-color-dark">I found all treasures! ⭐</label>
          </div>
        </div>
      </div>
      <style>.treasure-location.explored { border-color: var(--light-green) !important; background-color: var(--light-green)20 !important; } .treasure-location.explored .explore-btn { display: none; }</style>
    </div>`;
}

// ====================
// 3. MONSTER TAMER RENDERER
// ====================

function renderMonsterTamerPage(tamer: MonsterTamerContent, starIndex: number, metadata: ModuleMetadata): string {
  const activityId = `monster_${starIndex}`;
  
  const actionsHtml = tamer.tamingActions.map(a => `
    <button class="taming-action p-4 rounded-xl border-2 transition-all hover:scale-105 cursor-pointer flex flex-col items-center gap-2 m-card-bordered" onclick="window.tameMonster('${starIndex}', ${a.shrinkPower}, '${escapeForOnclick(a.message)}')">
      <span class="text-3xl">${a.emoji}</span>
      <span class="font-body text-sm text-center m-color-dark">${escapeForTemplate(a.action)}</span>
      <span class="text-xs px-2 py-1 rounded-full m-bg-light-green">-${a.shrinkPower}</span>
    </button>
  `).join("");

  const stagesHtml = tamer.stages.map((s, i) => `
    <div class="p-2 rounded-lg text-center transition-all" id="stage_${starIndex}_${s.level}" style="background-color: ${i === 0 ? 'var(--accent)' : 'var(--cream)'};">
      <span class="text-2xl">${s.emoji}</span>
      <p class="font-body text-xs">${escapeForTemplate(s.description)}</p>
    </div>
  `).join("");

  return `
    <div class="page min-h-screen p-8 m-bg-cream" data-page="monster-tamer" data-activity="${activityId}">
      <div class="max-w-4xl mx-auto">
        <h1 class="text-3xl md:text-4xl mb-4 font-title m-color-dark">${escapeForTemplate(tamer.heading)}</h1>
        <div class="rounded-3xl shadow-xl p-8 m-bg-white">
          <p class="text-lg mb-4 font-body text-center m-color-dark">${escapeForTemplate(tamer.instructions)}</p>
          <div class="flex flex-col items-center mb-6 p-6 rounded-2xl m-bg-cream">
            <div class="transition-all duration-500" id="monsterVisual_${starIndex}" style="font-size: 8rem;">${tamer.monster.emoji}</div>
            <h3 class="font-title text-xl mt-2 m-color-dark">${escapeForTemplate(tamer.monster.name)}</h3>
            <p class="font-body text-sm text-center m-color-secondary">${escapeForTemplate(tamer.monster.description)}</p>
            <div class="mt-4 w-full">
              <div class="flex justify-between mb-1">
                <span class="font-body text-sm">Monster Size:</span>
                <span class="font-title" id="monsterSize_${starIndex}" class="m-color-accent">100%</span>
              </div>
              <div class="h-4 rounded-full overflow-hidden m-bg-gray">
                <div class="h-full rounded-full transition-all duration-500" id="monsterBar_${starIndex}" style="width: 100%; background: linear-gradient(90deg, var(--accent), #ef4444);"></div>
              </div>
            </div>
          </div>
          <div class="flex justify-center gap-2 mb-6">${stagesHtml}</div>
          <p class="font-title text-lg text-center mb-3 m-color-dark">Taming Powers 💫</p>
          <div class="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">${actionsHtml}</div>
          <div class="p-4 rounded-xl text-center mb-4" id="monsterFeedback_${starIndex}" style="display: none; background-color: var(--soft-yellow);">
            <p class="font-body text-lg" id="monsterFeedbackText_${starIndex}"></p>
          </div>
          <div class="p-6 rounded-2xl text-center" id="monsterFriend_${starIndex}" class="m-feedback-hidden">
            <p class="text-5xl mb-2">😊🤝👾</p>
            <p class="font-title text-2xl m-color-dark">${escapeForTemplate(tamer.friendMessage)}</p>
          </div>
          <div class="rounded-xl p-4 flex items-center gap-3 mt-4 m-feedback-hidden-green" id="monsterComplete_${starIndex}">
            <input type="checkbox" class="w-8 h-8 rounded cursor-pointer m-accent-primary" data-activity="${activityId}" onchange="markActivityComplete('${activityId}')" >
            <label class="font-title text-xl m-color-dark">I tamed the monster! ⭐</label>
          </div>
        </div>
      </div>
    </div>`;
}

// ====================
// 4. GARDEN GROWER RENDERER
// ====================

function renderGardenGrowerPage(garden: GardenGrowerContent, starIndex: number, metadata: ModuleMetadata): string {
  const activityId = `garden_${starIndex}`;
  
  const plantsHtml = garden.plants.map(p => {
    const stagesAttr = p.growthStages.map(s => escapeForTemplate(s)).join('|');
    return `
    <div class="garden-plant p-4 rounded-2xl border-2 transition-all" id="plant_${starIndex}_${p.id}" class="m-card-bordered">
      <div class="text-center mb-2"><span class="text-5xl" id="plantEmoji_${starIndex}_${p.id}">${p.growthStages[0]}</span></div>
      <h3 class="font-title text-center mb-1 m-color-dark">${escapeForTemplate(p.name)}</h3>
      <p class="font-body text-xs text-center mb-2 m-color-secondary">${escapeForTemplate(p.feeling)}</p>
      <p class="font-body text-sm text-center mb-3 p-2 rounded-lg" id="plantAction_${starIndex}_${p.id}" class="m-bg-cream">${escapeForTemplate(p.nurturingAction)}</p>
      <div class="flex justify-center gap-1 mb-2">
        ${p.growthStages.map((_, i) => `<div class="w-3 h-3 rounded-full" id="growth_${starIndex}_${p.id}_${i}" style="background-color: ${i === 0 ? 'var(--primary)' : '#e5e7eb'};"></div>`).join("")}
      </div>
      <button class="w-full py-2 rounded-lg font-title cursor-pointer hover:scale-105 transition-all m-bg-light-green" data-stages="${stagesAttr}" data-plant-id="${p.id}" data-star-index="${starIndex}" data-total="${garden.plants.length}" onclick="window.waterPlant(this.dataset.starIndex, this.dataset.plantId, this.dataset.stages.split('|'), parseInt(this.dataset.total))">💧 Water!</button>
    </div>`;
  }).join("");

  return `
    <div class="page min-h-screen p-8 m-bg-cream" data-page="garden-grower" data-activity="${activityId}">
      <div class="max-w-4xl mx-auto">
        <h1 class="text-3xl md:text-4xl mb-4 font-title m-color-dark">${escapeForTemplate(garden.heading)}</h1>
        <div class="rounded-3xl shadow-xl p-8 m-bg-white">
          <p class="text-lg mb-4 font-body text-center m-color-dark">${escapeForTemplate(garden.instructions)}</p>
          <div class="p-4 rounded-xl mb-6 m-bg-soft-yellow">
            <p class="font-body text-center m-color-dark">${escapeForTemplate(garden.gardenStory)}</p>
          </div>
          <div class="text-center mb-4"><span class="text-6xl animate-bounce-slow">${garden.wateringCan.emoji}</span></div>
          <div class="mb-6 p-3 rounded-xl text-center m-bg-cream">
            <p class="font-title">Plants Grown: <span id="gardenProgress_${starIndex}">0</span>/${garden.plants.length}</p>
          </div>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">${plantsHtml}</div>
          <div class="p-6 rounded-2xl text-center" id="gardenHarvest_${starIndex}" class="m-feedback-hidden">
            <p class="text-5xl mb-2">🌸🌻🌹🌷</p>
            <p class="font-title text-2xl m-color-dark">${escapeForTemplate(garden.harvestMessage)}</p>
          </div>
          <div class="rounded-xl p-4 flex items-center gap-3 mt-4 m-feedback-hidden-green" id="gardenComplete_${starIndex}">
            <input type="checkbox" class="w-8 h-8 rounded cursor-pointer m-accent-primary" data-activity="${activityId}" onchange="markActivityComplete('${activityId}')" >
            <label class="font-title text-xl m-color-dark">My garden blooms! ⭐</label>
          </div>
        </div>
      </div>
      <style>.garden-plant.grown { border-color: var(--light-green) !important; background-color: var(--light-green)20 !important; }</style>
    </div>`;
}

// ====================
// 5. SUPERHERO CREATOR RENDERER
// ====================

function renderSuperheroCreatorPage(hero: SuperheroCreatorContent, starIndex: number, metadata: ModuleMetadata): string {
  const activityId = `superhero_${starIndex}`;
  
  const powersHtml = hero.heroElements.powers.map(p => `<button class="p-3 rounded-xl border-2 transition-all hover:scale-105 cursor-pointer m-bg-white m-border-transparent" onclick="window.selectHero('${starIndex}', 'power', '${p.emoji}')"><span class="text-2xl">${p.emoji}</span><p class="font-body text-xs mt-1">${escapeForTemplate(p.name)}</p></button>`).join("");
  const costumesHtml = hero.heroElements.costumes.map(c => `<button class="p-3 rounded-xl border-2 transition-all hover:scale-105 cursor-pointer" style="background-color: ${c.color}20; border-color: transparent;" onclick="window.selectHero('${starIndex}', 'costume', '${c.emoji}')"><span class="text-2xl">${c.emoji}</span><p class="font-body text-xs mt-1">${escapeForTemplate(c.name)}</p></button>`).join("");
  const sidekicksHtml = hero.heroElements.sidekicks.map(s => `<button class="p-3 rounded-xl border-2 transition-all hover:scale-105 cursor-pointer m-bg-white m-border-transparent" onclick="window.selectHero('${starIndex}', 'sidekick', '${s.emoji}')"><span class="text-2xl">${s.emoji}</span><p class="font-body text-xs mt-1">${escapeForTemplate(s.name)}</p></button>`).join("");

  return `
    <div class="page min-h-screen p-8 m-bg-cream" data-page="superhero-creator" data-activity="${activityId}">
      <div class="max-w-4xl mx-auto">
        <h1 class="text-3xl md:text-4xl mb-4 font-title m-color-dark">${escapeForTemplate(hero.heading)}</h1>
        <div class="rounded-3xl shadow-xl p-8 m-bg-white">
          <p class="text-lg mb-4 font-body text-center m-color-dark">${escapeForTemplate(hero.instructions)}</p>
          <div class="p-4 rounded-xl mb-6 m-bg-soft-yellow">
            <p class="font-body text-center">${escapeForTemplate(hero.storyIntro)}</p>
          </div>
          <div class="p-6 rounded-2xl mb-6 text-center" style="background: linear-gradient(135deg, var(--cream), var(--soft-yellow));">
            <p class="font-title mb-2">Your Superhero:</p>
            <div class="flex justify-center items-center gap-4 text-6xl">
              <span id="hero_${starIndex}_costume">❓</span>
              <span id="hero_${starIndex}_power">❓</span>
              <span id="hero_${starIndex}_sidekick">❓</span>
            </div>
            <input type="text" class="mt-4 p-2 rounded-lg border-2 font-title text-center text-xl w-full max-w-xs m-border-primary" placeholder="Hero name..." onchange="saveFormData('hero_name_${starIndex}', this.value); checkHeroComplete('${starIndex}')">
          </div>
          <div class="mb-4"><p class="font-title mb-2">⚡ Power:</p><div class="flex flex-wrap gap-2">${powersHtml}</div></div>
          <div class="mb-4"><p class="font-title mb-2">🦸 Costume:</p><div class="flex flex-wrap gap-2">${costumesHtml}</div></div>
          <div class="mb-4"><p class="font-title mb-2">🐾 Sidekick:</p><div class="flex flex-wrap gap-2">${sidekicksHtml}</div></div>
          <div class="p-4 rounded-xl mb-6 m-bg-cream">
            <p class="font-title mb-2">${escapeForTemplate(hero.missionPrompt)}</p>
            <textarea class="w-full p-2 rounded-lg border-2 font-body m-input-bordered-secondary" placeholder="My hero will..." onchange="saveFormData('hero_mission_${starIndex}', this.value); checkHeroComplete('${starIndex}')"></textarea>
          </div>
          <div class="p-6 rounded-2xl text-center" id="heroDone_${starIndex}" class="m-feedback-hidden">
            <p class="text-5xl mb-2">🦸‍♂️✨🦸‍♀️</p>
            <p class="font-title text-2xl">${escapeForTemplate(hero.completionMessage)}</p>
          </div>
          <div class="rounded-xl p-4 flex items-center gap-3 mt-4 m-feedback-hidden-green" id="heroComplete_${starIndex}">
            <input type="checkbox" class="w-8 h-8 rounded cursor-pointer m-accent-primary" data-activity="${activityId}" onchange="markActivityComplete('${activityId}')" >
            <label class="font-title text-xl m-color-dark">My superhero is ready! ⭐</label>
          </div>
        </div>
      </div>
    </div>`;
}

// ====================
// 6. FEELINGS ORCHESTRA RENDERER
// ====================

function renderFeelingsOrchestraPage(orchestra: FeelingsOrchestraContent, starIndex: number, metadata: ModuleMetadata): string {
  const activityId = `orchestra_${starIndex}`;
  
  const instrumentsHtml = orchestra.instruments.map(i => `
    <button class="p-4 rounded-2xl border-3 transition-all hover:scale-110 cursor-pointer flex flex-col items-center" style="background-color: ${i.color}20; border-color: ${i.color};" onclick="window.playInstrument('${starIndex}', '${i.emoji}', '${escapeForOnclick(i.sound)}', '${escapeForOnclick(i.feeling)}', '${escapeForOnclick(i.name)}')">
      <span class="text-5xl">${i.emoji}</span>
      <p class="font-title text-sm mt-2">${escapeForTemplate(i.name)}</p>
      <p class="font-body text-xs m-color-secondary">${escapeForTemplate(i.feeling)}</p>
    </button>
  `).join("");

  return `
    <div class="page min-h-screen p-8 m-bg-cream" data-page="feelings-orchestra" data-activity="${activityId}">
      <div class="max-w-4xl mx-auto">
        <h1 class="text-3xl md:text-4xl mb-4 font-title m-color-dark">${escapeForTemplate(orchestra.heading)}</h1>
        <div class="rounded-3xl shadow-xl p-8 m-bg-white">
          <p class="text-lg mb-4 font-body text-center m-color-dark">${escapeForTemplate(orchestra.instructions)}</p>
          <div class="p-4 rounded-xl mb-6 m-bg-soft-yellow">
            <p class="font-body text-center">${escapeForTemplate(orchestra.orchestraStory)}</p>
          </div>
          <div class="p-4 rounded-xl mb-6 text-center" id="soundDisplay_${starIndex}" style="background-color: var(--cream); min-height: 80px;">
            <p class="font-body">🎵 Tap an instrument to play!</p>
          </div>
          <div class="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">${instrumentsHtml}</div>
          <div class="p-4 rounded-xl mb-6 m-bg-cream">
            <p class="font-title mb-2">${escapeForTemplate(orchestra.compositionPrompt)}</p>
            <textarea class="w-full p-2 rounded-lg border-2 font-body m-input-bordered-secondary" placeholder="My feelings music is..." onchange="saveFormData('orchestra_${starIndex}', this.value)"></textarea>
          </div>
          <div class="p-6 rounded-2xl text-center m-bg-callout-gradient">
            <p class="text-4xl mb-2">🎶</p>
            <p class="font-title text-xl">${escapeForTemplate(orchestra.performanceMessage)}</p>
          </div>
          <div class="rounded-xl p-4 flex items-center gap-3 mt-4 m-bg-light-green">
            <input type="checkbox" class="w-8 h-8 rounded cursor-pointer m-accent-primary" data-activity="${activityId}" onchange="markActivityComplete('${activityId}')" >
            <label class="font-title text-xl m-color-dark">I made music! ⭐</label>
          </div>
        </div>
      </div>
    </div>`;
}

// ====================
// 7. CALM AQUARIUM RENDERER
// ====================

function renderCalmAquariumPage(aquarium: CalmAquariumContent, starIndex: number, metadata: ModuleMetadata): string {
  const activityId = `aquarium_${starIndex}`;
  
  const creaturesHtml = aquarium.creatures.map(c => `<button class="p-3 rounded-xl border-2 transition-all hover:scale-110 cursor-pointer m-card-bordered" onclick="window.addToAquarium('${starIndex}', 'creature', '${c.emoji}', '${escapeForOnclick(c.calmingTrait)}')"><span class="text-3xl">${c.emoji}</span><p class="font-body text-xs mt-1">${escapeForTemplate(c.name)}</p></button>`).join("");
  const decorationsHtml = aquarium.decorations.map(d => `<button class="p-3 rounded-xl border-2 transition-all hover:scale-110 cursor-pointer m-card-bordered" onclick="window.addToAquarium('${starIndex}', 'decor', '${d.emoji}', '${escapeForOnclick(d.calmingEffect)}')"><span class="text-3xl">${d.emoji}</span><p class="font-body text-xs mt-1">${escapeForTemplate(d.name)}</p></button>`).join("");

  return `
    <div class="page min-h-screen p-8 m-bg-cream" data-page="calm-aquarium" data-activity="${activityId}">
      <div class="max-w-4xl mx-auto">
        <h1 class="text-3xl md:text-4xl mb-4 font-title m-color-dark">${escapeForTemplate(aquarium.heading)}</h1>
        <div class="rounded-3xl shadow-xl p-8 m-bg-white">
          <p class="text-lg mb-4 font-body text-center m-color-dark">${escapeForTemplate(aquarium.instructions)}</p>
          <div class="p-4 rounded-xl mb-6 m-bg-soft-yellow">
            <p class="font-body text-center">${escapeForTemplate(aquarium.aquariumStory)}</p>
          </div>
          <div class="aquarium-tank p-6 rounded-2xl mb-6 min-h-48 flex flex-wrap items-center justify-center gap-2" id="tank_${starIndex}" style="background: linear-gradient(180deg, #a8d8ea, #3b82f6);">
            <p class="font-body text-white">🌊 Your peaceful aquarium 🌊</p>
          </div>
          <div class="p-4 rounded-xl mb-4 text-center m-bg-light-green">
            <p class="font-title mb-2">${escapeForTemplate(aquarium.breathingBubbles.message)}</p>
            <div class="flex justify-center gap-4">
              <span>Breathe in: ${aquarium.breathingBubbles.inhaleTime}s 💭</span>
              <span>Breathe out: ${aquarium.breathingBubbles.exhaleTime}s 💨</span>
            </div>
          </div>
          <div class="mb-4"><p class="font-title mb-2">🐠 Add Creatures:</p><div class="flex flex-wrap gap-2">${creaturesHtml}</div></div>
          <div class="mb-4"><p class="font-title mb-2">🌊 Add Decorations:</p><div class="flex flex-wrap gap-2">${decorationsHtml}</div></div>
          <div class="p-6 rounded-2xl text-center m-bg-callout-gradient">
            <p class="text-4xl mb-2">🌊</p>
            <p class="font-title text-xl">${escapeForTemplate(aquarium.peaceMessage)}</p>
          </div>
          <div class="rounded-xl p-4 flex items-center gap-3 mt-4 m-bg-light-green">
            <input type="checkbox" class="w-8 h-8 rounded cursor-pointer m-accent-primary" data-activity="${activityId}" onchange="markActivityComplete('${activityId}')" >
            <label class="font-title text-xl m-color-dark">My aquarium is peaceful! ⭐</label>
          </div>
        </div>
      </div>
    </div>`;
}

// ====================
// 8. ROCKET LAUNCHER RENDERER
// ====================

function renderRocketLauncherPage(rocket: RocketLauncherContent, starIndex: number, metadata: ModuleMetadata): string {
  const activityId = `rocket_${starIndex}`;
  
  const fuelHtml = rocket.fuelActions.map(f => `<button class="p-3 rounded-xl border-2 transition-all hover:scale-105 cursor-pointer m-card-bordered" onclick="window.addFuel('${starIndex}', ${f.fuelAmount})"><span class="text-2xl">${f.emoji}</span><p class="font-body text-xs mt-1">${escapeForTemplate(f.action)}</p><span class="text-xs px-2 py-1 rounded-full m-bg-soft-yellow">+${f.fuelAmount}%</span></button>`).join("");
  const planetsHtml = rocket.planets.map(p => `<div class="p-4 rounded-2xl border-2" id="planet_${starIndex}_${p.id}" style="background-color: ${p.color}20; border-color: ${p.color};"><div class="flex items-center gap-2 mb-2"><span class="text-3xl">${p.emoji}</span><span class="font-title">${escapeForTemplate(p.name)}</span></div><p class="font-body text-sm mb-2">${escapeForTemplate(p.activity)}</p><p class="font-body text-xs m-color-secondary">Reward: ${escapeForTemplate(p.reward)}</p></div>`).join("");

  return `
    <div class="page min-h-screen p-8 m-bg-cream" data-page="rocket-launcher" data-activity="${activityId}">
      <div class="max-w-4xl mx-auto">
        <h1 class="text-3xl md:text-4xl mb-4 font-title m-color-dark">${escapeForTemplate(rocket.heading)}</h1>
        <div class="rounded-3xl shadow-xl p-8 m-bg-white">
          <p class="text-lg mb-4 font-body text-center m-color-dark">${escapeForTemplate(rocket.instructions)}</p>
          <div class="p-4 rounded-xl mb-6 m-bg-soft-yellow">
            <p class="font-body text-center">${escapeForTemplate(rocket.missionBriefing)}</p>
          </div>
          <div class="text-center mb-4"><span class="text-8xl" id="rocketEmoji_${starIndex}">🚀</span></div>
          <div class="mb-6 p-4 rounded-xl m-bg-cream">
            <div class="flex justify-between mb-2"><span class="font-title">Fuel:</span><span class="font-title text-xl" id="fuelDisplay_${starIndex}" class="m-color-primary">0%</span></div>
            <div class="h-6 rounded-full overflow-hidden m-bg-gray"><div class="h-full rounded-full transition-all duration-500" id="fuelBar_${starIndex}" style="width: 0%; background: linear-gradient(90deg, var(--primary), var(--accent));"></div></div>
          </div>
          <p class="font-title text-lg text-center mb-3">Fuel Actions ⚡</p>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">${fuelHtml}</div>
          <button class="w-full py-4 rounded-xl font-title text-xl cursor-pointer transition-all hover:scale-105" id="launchBtn_${starIndex}" class="m-btn-primary" onclick="window.launchRocket('${starIndex}')">🚀 LAUNCH!</button>
          <div class="mt-6" id="planets_${starIndex}" class="m-hidden">
            <p class="font-title text-lg text-center mb-3">Feeling Planets 🪐</p>
            <div class="grid grid-cols-2 gap-4">${planetsHtml}</div>
          </div>
          <div class="p-6 rounded-2xl text-center mt-4" id="rocketReturn_${starIndex}" class="m-feedback-hidden">
            <p class="text-5xl mb-2">🏠🚀</p>
            <p class="font-title text-2xl">${escapeForTemplate(rocket.returnMessage)}</p>
          </div>
          <div class="rounded-xl p-4 flex items-center gap-3 mt-4 m-feedback-hidden-green" id="rocketComplete_${starIndex}">
            <input type="checkbox" class="w-8 h-8 rounded cursor-pointer m-accent-primary" data-activity="${activityId}" onchange="markActivityComplete('${activityId}')" >
            <label class="font-title text-xl m-color-dark">Space explorer! ⭐</label>
          </div>
        </div>
      </div>
    </div>`;
}

// ====================
// 9. MAGIC POTION RENDERER
// ====================

function renderMagicPotionPage(potion: MagicPotionContent, starIndex: number, metadata: ModuleMetadata): string {
  const activityId = `potion_${starIndex}`;
  
  const ingredientsHtml = potion.ingredients.map(i => `<button class="p-3 rounded-xl border-2 transition-all hover:scale-110 cursor-pointer m-card-bordered" onclick="window.addIngredient('${starIndex}', '${i.id}', '${i.emoji}', '${escapeForOnclick(i.name)}')"><span class="text-3xl">${i.emoji}</span><p class="font-body text-xs mt-1">${escapeForTemplate(i.name)}</p><p class="font-body text-xs m-color-secondary">${escapeForTemplate(i.feeling)}</p></button>`).join("");
  const recipesHtml = potion.recipes.map(r => `<div class="p-3 rounded-xl" style="background-color: ${r.color}20; border: 2px solid ${r.color};"><div class="flex items-center gap-2 mb-1"><span class="text-2xl">${r.emoji}</span><span class="font-title text-sm">${escapeForTemplate(r.potionName)}</span></div><p class="font-body text-xs">${escapeForTemplate(r.effect)}</p></div>`).join("");

  return `
    <div class="page min-h-screen p-8 m-bg-cream" data-page="magic-potion" data-activity="${activityId}">
      <div class="max-w-4xl mx-auto">
        <h1 class="text-3xl md:text-4xl mb-4 font-title m-color-dark">${escapeForTemplate(potion.heading)}</h1>
        <div class="rounded-3xl shadow-xl p-8 m-bg-white">
          <p class="text-lg mb-4 font-body text-center m-color-dark">${escapeForTemplate(potion.instructions)}</p>
          <div class="p-4 rounded-xl mb-6 m-bg-soft-yellow">
            <p class="font-body text-center">${escapeForTemplate(potion.cauldronStory)}</p>
          </div>
          <div class="cauldron p-6 rounded-2xl mb-6 text-center" style="background: linear-gradient(180deg, #4a1d96, #7c3aed);">
            <span class="text-8xl">🧙‍♂️</span>
            <div class="cauldron-contents mt-4 flex justify-center gap-2 flex-wrap" id="cauldron_${starIndex}">
              <span class="font-body text-white">Add ingredients...</span>
            </div>
          </div>
          <button class="w-full py-3 rounded-xl font-title text-lg cursor-pointer mb-6 m-btn-primary" onclick="window.brewPotion('${starIndex}')">✨ Brew Potion!</button>
          <p class="font-title text-lg text-center mb-3">Magical Ingredients ✨</p>
          <div class="grid grid-cols-3 md:grid-cols-6 gap-3 mb-6">${ingredientsHtml}</div>
          <p class="font-title text-lg text-center mb-3">Recipe Book 📖</p>
          <div class="grid grid-cols-2 gap-3 mb-6">${recipesHtml}</div>
          <div class="p-6 rounded-2xl text-center" id="potionResult_${starIndex}" class="m-feedback-hidden">
            <p class="text-5xl mb-2" id="potionEmoji_${starIndex}">✨</p>
            <p class="font-title text-2xl" id="potionMessage_${starIndex}">${escapeForTemplate(potion.magicMessage)}</p>
          </div>
          <div class="rounded-xl p-4 flex items-center gap-3 mt-4 m-feedback-hidden-green" id="potionComplete_${starIndex}">
            <input type="checkbox" class="w-8 h-8 rounded cursor-pointer m-accent-primary" data-activity="${activityId}" onchange="markActivityComplete('${activityId}')" >
            <label class="font-title text-xl m-color-dark">I'm a potion master! ⭐</label>
          </div>
        </div>
      </div>
    </div>`;
}

// ====================
// 10. FEELINGS BINGO RENDERER
// ====================

function renderFeelingsBingoPage(bingo: FeelingsBingoContent, starIndex: number, metadata: ModuleMetadata): string {
  const activityId = `bingo_${starIndex}`;
  
  // Create 3x3 grid (8 squares + 1 free space in middle)
  const squaresHtml = bingo.squares.slice(0, 4).map((s, i) => `<button class="bingo-square p-3 rounded-xl border-2 transition-all cursor-pointer flex flex-col items-center" id="bingo_${starIndex}_${s.id}" class="m-card-bordered" onclick="window.markBingoSquare('${starIndex}', '${s.id}')"><span class="text-3xl">${s.emoji}</span><p class="font-title text-sm">${escapeForTemplate(s.feeling)}</p><p class="font-body text-xs text-center">${escapeForTemplate(s.challenge)}</p></button>`).join("") +
    `<div class="bingo-square p-3 rounded-xl border-2 flex flex-col items-center justify-center" style="background-color: var(--soft-yellow); border-color: var(--primary);"><span class="text-3xl">${bingo.freeSpace.emoji}</span><p class="font-title text-sm">FREE!</p><p class="font-body text-xs text-center">${escapeForTemplate(bingo.freeSpace.message)}</p></div>` +
    bingo.squares.slice(4, 8).map((s, i) => `<button class="bingo-square p-3 rounded-xl border-2 transition-all cursor-pointer flex flex-col items-center" id="bingo_${starIndex}_${s.id}" class="m-card-bordered" onclick="window.markBingoSquare('${starIndex}', '${s.id}')"><span class="text-3xl">${s.emoji}</span><p class="font-title text-sm">${escapeForTemplate(s.feeling)}</p><p class="font-body text-xs text-center">${escapeForTemplate(s.challenge)}</p></button>`).join("");

  return `
    <div class="page min-h-screen p-8 m-bg-cream" data-page="feelings-bingo" data-activity="${activityId}">
      <div class="max-w-4xl mx-auto">
        <h1 class="text-3xl md:text-4xl mb-4 font-title m-color-dark">${escapeForTemplate(bingo.heading)}</h1>
        <div class="rounded-3xl shadow-xl p-8 m-bg-white">
          <p class="text-lg mb-4 font-body text-center m-color-dark">${escapeForTemplate(bingo.instructions)}</p>
          <div class="p-4 rounded-xl mb-6 m-bg-soft-yellow">
            <p class="font-body text-center">${escapeForTemplate(bingo.bingoStory)}</p>
          </div>
          <div class="grid grid-cols-3 gap-3 mb-6 max-w-md mx-auto">${squaresHtml}</div>
          <div class="p-4 rounded-xl mb-6 text-center m-bg-cream">
            <p class="font-title mb-2">Win Patterns:</p>
            <p class="font-body text-sm">${bingo.bingoPatterns.join(' • ')}</p>
          </div>
          <div class="p-6 rounded-2xl text-center" id="bingoWin_${starIndex}" class="m-feedback-hidden">
            <p class="text-5xl mb-2">🎉</p>
            <p class="font-title text-2xl">${escapeForTemplate(bingo.winMessage)}</p>
          </div>
          <div class="rounded-xl p-4 flex items-center gap-3 mt-4 m-bg-light-green">
            <input type="checkbox" class="w-8 h-8 rounded cursor-pointer m-accent-primary" data-activity="${activityId}" onchange="markActivityComplete('${activityId}')" >
            <label class="font-title text-xl m-color-dark">Bingo champion! ⭐</label>
          </div>
        </div>
      </div>
      <style>.bingo-square.marked { background-color: var(--light-green) !important; border-color: var(--secondary) !important; }</style>
    </div>`;
}

function renderSpinTheWheelPage(wheel: SpinTheWheelContent, starIndex: number, metadata: ModuleMetadata): string {
  const activityId = `wheel_${starIndex}`;
  
  const segmentsHtml = wheel.segments.map((seg, idx) => `
    <div class="wheel-segment p-3 rounded-xl border-2 cursor-pointer transition-all hover:scale-105"
         id="seg_${starIndex}_${seg.id}"
         style="background-color: ${seg.color}20; border-color: ${seg.color};"
         data-response="${escapeForTemplate(seg.response)}"
         onclick="window.selectWheelSegment('${starIndex}', '${seg.id}', '${escapeForOnclick(seg.response)}')">
      <div class="flex items-center gap-2">
        <span class="text-3xl">${seg.emoji}</span>
        <span class="font-body m-color-dark">${escapeForTemplate(seg.label)}</span>
      </div>
    </div>
  `).join("");

  return `
    <div class="page min-h-screen p-8 m-bg-cream" data-page="spin-the-wheel" data-activity="${activityId}">
      <div class="max-w-4xl mx-auto">
        <h1 class="text-3xl md:text-4xl mb-4 font-title m-color-dark">${escapeForTemplate(wheel.heading)}</h1>
        
        <div class="rounded-3xl shadow-xl p-8 m-bg-white">
          <p class="text-lg mb-4 font-body text-center m-color-dark">${escapeForTemplate(wheel.instructions)}</p>
          
          <div class="p-4 rounded-xl mb-6 text-center m-bg-soft-yellow">
            <p class="font-title text-xl m-color-dark">🎯 ${escapeForTemplate(wheel.wheelQuestion)}</p>
          </div>
          
          <!-- Wheel Display -->
          <div class="flex justify-center mb-6">
            <div class="wheel-container relative w-64 h-64 rounded-full border-4 flex items-center justify-center" style="border-color: var(--primary); background: conic-gradient(${wheel.segments.map((s, i) => `${s.color} ${i * (360/wheel.segments.length)}deg ${(i+1) * (360/wheel.segments.length)}deg`).join(', ')});">
              <div class="absolute w-12 h-12 rounded-full flex items-center justify-center text-2xl" style="background-color: white; box-shadow: 0 2px 10px rgba(0,0,0,0.2);">
                🎡
              </div>
              <div class="absolute -top-4 text-3xl">▼</div>
            </div>
          </div>
          
          <button class="w-full py-4 rounded-xl font-title text-xl cursor-pointer transition-all hover:scale-105 mb-6" 
                  id="spinBtn_${starIndex}"
                  class="m-btn-primary"
                  onclick="window.spinWheel('${starIndex}', ${wheel.segments.length})">
            🎡 SPIN THE WHEEL!
          </button>
          
          <!-- Segment Options -->
          <p class="font-title text-lg text-center mb-3 m-color-dark">Or tap to choose:</p>
          <div class="grid grid-cols-2 gap-3 mb-6">
            ${segmentsHtml}
          </div>
          
          <!-- Result Display -->
          <div class="p-4 rounded-xl text-center mb-4" id="wheelResult_${starIndex}" class="m-feedback-hidden-green">
            <p class="text-4xl mb-2" id="wheelResultEmoji_${starIndex}"></p>
            <p class="font-body text-lg" id="wheelResultText_${starIndex}"></p>
          </div>
          
          <!-- Celebration -->
          <div class="p-6 rounded-2xl text-center" id="wheelCelebration_${starIndex}" class="m-feedback-hidden">
            <p class="text-5xl mb-2">🎉</p>
            <p class="font-title text-2xl m-color-dark">${escapeForTemplate(wheel.celebrationMessage)}</p>
          </div>
          
          <div class="rounded-xl p-4 flex items-center gap-3 mt-4 m-feedback-hidden-green" id="wheelComplete_${starIndex}">
            <input type="checkbox" class="w-8 h-8 rounded cursor-pointer m-accent-primary" data-activity="${activityId}" onchange="markActivityComplete('${activityId}')" >
            <label class="font-title text-xl m-color-dark">I spun the wheel! ⭐</label>
          </div>
        </div>
      </div>
    </div>`;
}

function renderStickerCollectorPage(sticker: StickerCollectorContent, starIndex: number, metadata: ModuleMetadata): string {
  const activityId = `sticker_${starIndex}`;
  
  const challengesHtml = sticker.challenges.map(ch => `
    <div class="sticker-challenge p-4 rounded-2xl border-2 cursor-pointer transition-all hover:scale-105"
         id="challenge_${starIndex}_${ch.id}"
         class="m-card-bordered"
         onclick="window.collectSticker('${starIndex}', '${ch.id}', '${ch.emoji}', ${sticker.challenges.length})">
      <div class="flex items-center gap-3">
        <span class="text-4xl sticker-emoji" id="stickerEmoji_${starIndex}_${ch.id}">${ch.emoji}</span>
        <div>
          <h3 class="font-title m-color-dark">${escapeForTemplate(ch.title)}</h3>
          <p class="font-body text-sm m-color-secondary">${escapeForTemplate(ch.description)}</p>
        </div>
      </div>
      <div class="collect-btn mt-2 text-center">
        <span class="font-body text-sm px-4 py-1 rounded-full m-bg-soft-yellow">Tap to collect!</span>
      </div>
    </div>
  `).join("");

  return `
    <div class="page min-h-screen p-8 m-bg-cream" data-page="sticker-collector" data-activity="${activityId}">
      <div class="max-w-4xl mx-auto">
        <h1 class="text-3xl md:text-4xl mb-4 font-title m-color-dark">${escapeForTemplate(sticker.heading)}</h1>
        
        <div class="rounded-3xl shadow-xl p-8 m-bg-white">
          <p class="text-lg mb-4 font-body m-color-dark">${escapeForTemplate(sticker.storyText)}</p>
          <p class="text-center mb-6 font-body m-color-secondary">${escapeForTemplate(sticker.instructions)}</p>
          
          <!-- Sticker Collection Display -->
          <div class="mb-6 p-4 rounded-xl text-center m-bg-soft-yellow">
            <p class="font-title mb-2 m-color-dark">Your Sticker Collection:</p>
            <div class="flex justify-center gap-2 flex-wrap min-h-12" id="stickerCollection_${starIndex}">
              <span class="font-body text-sm m-color-secondary">Tap challenges to collect stickers!</span>
            </div>
            <p class="font-title mt-2 m-color-primary"><span id="stickerCount_${starIndex}">0</span> / ${sticker.totalStickers}</p>
          </div>
          
          <!-- Challenges Grid -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            ${challengesHtml}
          </div>
          
          <!-- Completion Message -->
          <div class="p-6 rounded-2xl text-center" id="stickerComplete_${starIndex}" class="m-feedback-hidden">
            <p class="text-5xl mb-2">🏆</p>
            <p class="font-title text-2xl m-color-dark">${escapeForTemplate(sticker.completionMessage)}</p>
          </div>
          
          <div class="rounded-xl p-4 flex items-center gap-3 mt-4 m-feedback-hidden-green" id="stickerDone_${starIndex}">
            <input type="checkbox" class="w-8 h-8 rounded cursor-pointer m-accent-primary" data-activity="${activityId}" onchange="markActivityComplete('${activityId}')" >
            <label class="font-title text-xl m-color-dark">I collected all stickers! ⭐</label>
          </div>
        </div>
      </div>
      <style>
        .sticker-challenge.collected { border-color: var(--light-green) !important; background-color: var(--light-green)20 !important; }
        .sticker-challenge.collected .collect-btn { display: none; }
      </style>
    </div>`;
}

function renderMindfulAdventurePage(adventure: MindfulAdventureContent, starIndex: number, metadata: ModuleMetadata): string {
  const activityId = `adventure_${starIndex}`;
  
  const scenesHtml = adventure.scenes.map((scene, idx) => `
    <div class="adventure-scene p-4 rounded-2xl border-2 mb-4" 
         id="scene_${starIndex}_${scene.id}"
         class="m-card-bordered">
      <div class="flex items-center gap-3 mb-3">
        <span class="text-4xl">${scene.emoji}</span>
        <h3 class="font-title text-lg m-color-dark">${escapeForTemplate(scene.sceneName)}</h3>
      </div>
      <p class="font-body mb-3 m-color-dark">${escapeForTemplate(scene.description)}</p>
      <div class="p-3 rounded-lg mb-3 m-bg-soft-yellow">
        <p class="font-body text-sm m-color-dark">🧘 ${escapeForTemplate(scene.mindfulPrompt)}</p>
      </div>
      <textarea class="w-full p-2 rounded-lg border-2 font-body text-sm m-input-bordered-primary" 
                placeholder="${escapeForTemplate(scene.placeholder)}"
                onchange="saveFormData('adventure_${starIndex}_${scene.id}', this.value); window.checkAdventureComplete('${starIndex}', ${adventure.scenes.length})"></textarea>
    </div>
  `).join("");

  return `
    <div class="page min-h-screen p-8 m-bg-cream" data-page="mindful-adventure" data-activity="${activityId}">
      <div class="max-w-4xl mx-auto">
        <h1 class="text-3xl md:text-4xl mb-4 font-title m-color-dark">${escapeForTemplate(adventure.heading)}</h1>
        
        <div class="rounded-3xl shadow-xl p-8 m-bg-white">
          <div class="p-4 rounded-xl mb-6 m-bg-soft-yellow">
            <p class="font-body text-center m-color-dark">${escapeForTemplate(adventure.introText)}</p>
          </div>
          
          <!-- Progress -->
          <div class="mb-6 p-3 rounded-xl text-center m-bg-cream">
            <p class="font-title m-color-dark">Scenes Explored: <span id="adventureProgress_${starIndex}">0</span> / ${adventure.scenes.length}</p>
          </div>
          
          <!-- Scenes -->
          ${scenesHtml}
          
          <!-- Closing Message -->
          <div class="p-6 rounded-2xl text-center" id="adventureClosing_${starIndex}" class="m-feedback-hidden">
            <p class="text-5xl mb-2">🌟</p>
            <p class="font-title text-2xl m-color-dark">${escapeForTemplate(adventure.closingMessage)}</p>
          </div>
          
          <div class="rounded-xl p-4 flex items-center gap-3 mt-4 m-feedback-hidden-green" id="adventureDone_${starIndex}">
            <input type="checkbox" class="w-8 h-8 rounded cursor-pointer m-accent-primary" data-activity="${activityId}" onchange="markActivityComplete('${activityId}')" >
            <label class="font-title text-xl m-color-dark">Adventure complete! ⭐</label>
          </div>
        </div>
      </div>
    </div>`;
}

function renderEmotionDetectivePage(detective: EmotionDetectiveContent, starIndex: number, metadata: ModuleMetadata): string {
  const activityId = `detective_${starIndex}`;
  
  const cluesHtml = detective.clues.map(clue => `
    <div class="clue-card p-3 rounded-xl border-2 m-card-bordered">
      <div class="flex items-center gap-2">
        <span class="text-2xl">${clue.clueEmoji}</span>
        <p class="font-body m-color-dark">${escapeForTemplate(clue.clueText)}</p>
      </div>
    </div>
  `).join("");
  
  const optionsHtml = detective.emotionOptions.map((opt, idx) => `
    <button class="detective-option p-4 rounded-xl border-2 cursor-pointer transition-all hover:scale-105 flex items-center gap-3 m-card-bordered"
            data-correct="${opt.isCorrect}"
            data-explanation="${escapeForTemplate(opt.explanation)}"
            onclick="window.solveCase('${starIndex}', ${idx}, ${opt.isCorrect}, '${escapeForOnclick(opt.explanation)}')">
      <span class="text-3xl">${opt.emoji}</span>
      <span class="font-title m-color-dark">${escapeForTemplate(opt.emotion)}</span>
    </button>
  `).join("");

  return `
    <div class="page min-h-screen p-8 m-bg-cream" data-page="emotion-detective" data-activity="${activityId}">
      <div class="max-w-4xl mx-auto">
        <h1 class="text-3xl md:text-4xl mb-4 font-title m-color-dark">${escapeForTemplate(detective.heading)}</h1>
        
        <div class="rounded-3xl shadow-xl p-8 m-bg-white">
          <div class="flex items-center gap-3 mb-4">
            <span class="text-5xl">🔍</span>
            <p class="text-lg font-body m-color-dark">${escapeForTemplate(detective.caseDescription)}</p>
          </div>
          
          <p class="text-center mb-6 font-body m-color-secondary">${escapeForTemplate(detective.instructions)}</p>
          
          <!-- Clues -->
          <p class="font-title text-lg mb-3 m-color-dark">🔎 The Clues:</p>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
            ${cluesHtml}
          </div>
          
          <!-- Emotion Options -->
          <p class="font-title text-lg mb-3 m-color-dark">🎯 What emotion is this person feeling?</p>
          <div class="grid grid-cols-2 gap-3 mb-6">
            ${optionsHtml}
          </div>
          
          <!-- Feedback -->
          <div class="p-4 rounded-xl text-center mb-4" id="detectiveFeedback_${starIndex}" class="m-hidden">
            <p class="font-body text-lg" id="detectiveFeedbackText_${starIndex}"></p>
          </div>
          
          <!-- Revelation -->
          <div class="p-6 rounded-2xl text-center" id="detectiveReveal_${starIndex}" class="m-feedback-hidden">
            <p class="text-5xl mb-2">🎉</p>
            <p class="font-title text-2xl m-color-dark">${escapeForTemplate(detective.revelationMessage)}</p>
          </div>
          
          <div class="rounded-xl p-4 flex items-center gap-3 mt-4 m-feedback-hidden-green" id="detectiveDone_${starIndex}">
            <input type="checkbox" class="w-8 h-8 rounded cursor-pointer m-accent-primary" data-activity="${activityId}" onchange="markActivityComplete('${activityId}')" >
            <label class="font-title text-xl m-color-dark">Case solved! ⭐</label>
          </div>
        </div>
      </div>
      <style>
        .detective-option.correct { border-color: var(--light-green) !important; background-color: var(--light-green)20 !important; }
        .detective-option.wrong { border-color: #fecaca !important; background-color: #fecaca !important; }
      </style>
    </div>`;
}

function renderMatchingActivityPage(matching: MatchingActivityContent, starIndex: number): string {
  const activityId = `matching_${starIndex}`;
  const leftHtml = matching.pairs.map((pair, i) => `
    <button class="match-item match-item-left w-full text-left px-4 py-3 rounded-xl font-body"
      data-match-id="${i}">
      ${escapeForTemplate(pair.situation)}
    </button>
  `).join("");

  const rightHtml = matching.pairs.map((pair, i) => `
    <button class="match-item match-item-right w-full text-left px-4 py-3 rounded-xl font-body"
      data-match-id="${i}">
      ${escapeForTemplate(pair.emoji)} ${escapeForTemplate(pair.feeling)}
    </button>
  `).join("");

  return `
    <div class="page min-h-screen p-8 m-bg-cream" data-page="matching-activity">
      <div class="max-w-4xl mx-auto">
        <h1 class="text-3xl md:text-4xl mb-6 font-title m-color-dark">${escapeForTemplate(matching.heading)}</h1>
        
        <div class="rounded-3xl shadow-xl p-8 m-bg-white">
          <p class="text-lg mb-6 font-body m-color-dark">${escapeForTemplate(matching.instructions)}</p>
          <div class="matching-activity" data-activity-id="${activityId}">
            <div class="matching-board rounded-2xl p-4 m-bg-soft-yellow">
              <svg class="matching-lines" aria-hidden="true"></svg>
              <div class="matching-columns">
                <div class="matching-column match-column-left">
                  ${leftHtml}
                </div>
                <div class="matching-column match-column-right">
                  ${rightHtml}
                </div>
              </div>
            </div>
            <p class="matching-status mt-4 font-body text-center m-color-secondary">Tap a left item, then a right item to draw a line.</p>
          </div>
          
          <div class="rounded-xl p-4 flex items-center gap-3 m-bg-light-green">
            <input 
              type="checkbox" 
              class="w-8 h-8 rounded cursor-pointer m-accent-primary"
              data-activity="${activityId}"
              onchange="markActivityComplete('${activityId}')"
              
            >
            <label class="font-title text-xl m-color-dark">I matched the feelings! ⭐</label>
          </div>
        </div>
      </div>
    </div>`;
}



function renderSummaryPage(summary: SummaryContent, metadata: ModuleMetadata): string {
  const takeawaysHtml = summary.takeaways.map(t => `
    <li class="font-body text-lg m-color-dark">${escapeForTemplate(t)}</li>`).join('');

  return `
    <div class="page min-h-screen p-8" style="background: linear-gradient(135deg, #fef9e7, #edf7f2);" data-page="summary">
      <div class="max-w-4xl mx-auto">
        <div class="rounded-3xl shadow-2xl p-8 md:p-10 border-4" style="background-color: white; border-color: #e6c777;">
          <div class="text-center mb-6">
            <p class="font-title text-lg" style="color: #8b6f2f; letter-spacing: 0.08em;">CERTIFICATE OF ACHIEVEMENT</p>
            <h1 class="text-3xl md:text-4xl mt-2 font-title m-color-dark">${escapeForTemplate(summary.heading)}</h1>
            <p class="font-body text-lg mt-2 m-color-secondary">Awarded to <strong id="childNameDisplay">Friend</strong></p>
          </div>

          <div class="p-5 rounded-2xl mb-6" style="background-color: var(--cream); border: 2px dashed var(--primary);">
            <p class="font-title text-xl mb-2 m-color-dark">Sub-skill focus</p>
            <p class="font-body text-lg m-color-dark">In this module, you practiced <strong>${escapeForTemplate(metadata.theme)}</strong> by spotting feelings, choosing calming actions, and using kind self-talk in tricky moments.</p>
          </div>

          <div class="mb-6">
            <p class="font-title text-xl mb-2 m-color-dark">What you learned</p>
            <ul class="list-disc pl-6 space-y-2">${takeawaysHtml}</ul>
          </div>

          <div class="flex flex-col md:flex-row md:items-end md:justify-between gap-4 pt-4" style="border-top: 2px solid #f2e1a8;">
            <div>
              <p class="font-body text-sm m-color-secondary">Completed on</p>
              <p class="font-title text-2xl" id="certificateDate" class="m-color-dark"></p>
            </div>
            <div class="text-right">
              <p class="font-body text-sm m-color-secondary">Guide</p>
              <p class="font-title text-xl m-color-dark">${escapeForTemplate(metadata.characterName)} ${escapeForTemplate(metadata.characterEmoji)}</p>
            </div>
          </div>
        </div>

        <div class="rounded-xl p-6 flex items-center gap-4 mt-6 m-bg-soft-yellow">
          <span class="text-5xl">${escapeForTemplate(metadata.characterEmoji)}</span>
          <p class="font-body text-lg font-semibold m-color-dark">${escapeForTemplate(summary.encouragement)}</p>
        </div>
      </div>
    </div>`;
}

function renderCompletionPage(completion: CompletionContent, metadata: ModuleMetadata): string {
  return `
    <div class="page min-h-screen flex items-center justify-center p-8" style="background: linear-gradient(to bottom right, var(--soft-yellow), var(--light-green));" data-page="completion">
      <div class="text-center max-w-2xl">
        <div class="text-8xl mb-6 animate-bounce-slow">🎉</div>
        <h1 class="text-4xl md:text-5xl mb-6 font-title m-color-dark">${escapeForTemplate(completion.heading)}</h1>
        
        <div class="rounded-3xl shadow-xl p-8 mb-8 m-bg-white">
          <p class="text-xl mb-4 font-body m-color-dark">${escapeForTemplate(completion.celebrationText)}</p>
          <p class="text-lg font-body m-color-secondary">${escapeForTemplate(completion.nextStepsText)}</p>
        </div>
        
        <div class="flex flex-col gap-4">
          <button 
            onclick="const params = new URLSearchParams(window.location.search); const childId = params.get('childId'); const moduleId = params.get('moduleId'); if (childId && moduleId) completeModule(childId, moduleId);"
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
          <p class="font-body text-lg m-color-dark">
            ${escapeForTemplate(metadata.characterName)} is proud of you!
          </p>
        </div>
      </div>
    </div>`;
}

// ========================================
// ADMIN-ONLY VERIFICATION PAGE
// ========================================

function renderAdminVerificationPage(report: VerificationReport | undefined, moduleSummary: ModuleSummary | undefined, metadata: ModuleMetadata): string {
  const r = report || {
    theoriesUsed: [],
    ageRangeTheoriesApplied: "Not available",
    subSkillAlignment: "Not available",
    superSkillAlignment: "Not available",
    brainTownAnalogyUsage: "Not available",
    unselectedConceptsIntroduced: [],
    toneComplianceNotes: "Not available",
    claimTypes: "Not available",
    australianEnglishCheck: "Not available",
    overallAssessment: "NOT VERIFIED",
    flaggedIssues: [],
    autoRevisions: [],
  };
  
  const ms = moduleSummary || {
    summary: "Not available",
    keyConceptsCovered: [],
    skillsIntroduced: [],
    characterProgressionNotes: "Not available",
  };

  const assessmentColour = r.overallAssessment.includes("PASS") && !r.overallAssessment.includes("NEEDS")
    ? "#10B981"
    : r.overallAssessment.includes("NOTES")
      ? "#F59E0B"
      : "#EF4444";

  const theoriesRows = r.theoriesUsed.map(t => `
    <tr>
      <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; font-weight: 600;">${escapeForTemplate(t.theoryName)}</td>
      <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">${escapeForTemplate(t.whereOperationalised)}</td>
    </tr>
  `).join("") || '<tr><td colspan="2" style="padding: 8px 12px; color: #6b7280;">No theories detected</td></tr>';

  const flaggedItems = r.flaggedIssues.length > 0
    ? r.flaggedIssues.map(f => `<li style="margin-bottom: 4px; color: #DC2626;">${escapeForTemplate(f)}</li>`).join("")
    : '<li class="m-color-success">No issues flagged</li>';

  const unselectedItems = r.unselectedConceptsIntroduced.length > 0
    ? r.unselectedConceptsIntroduced.map(c => `<li style="margin-bottom: 4px; color: #F59E0B;">${escapeForTemplate(c)}</li>`).join("")
    : '<li class="m-color-success">None - all concepts were specified</li>';

  return `
    <div class="page min-h-screen p-8" style="background-color: #1a1a2e;" data-page="admin-verification" data-admin-only="true">
      <div class="max-w-4xl mx-auto">
        <div style="background: linear-gradient(135deg, #667eea, #764ba2); border-radius: 16px; padding: 24px; margin-bottom: 24px; text-align: center;">
          <h1 style="font-family: 'Fredoka One', cursive; font-size: 2rem; color: white; margin-bottom: 8px;">
            🔒 Admin Verification Report
          </h1>
          <p style="color: rgba(255,255,255,0.8); font-family: 'Nunito', sans-serif; font-size: 14px;">
            This page is only visible to administrators. It shows the AI self-verification audit results.
          </p>
        </div>
        
        <!-- Overall Assessment -->
        <div style="background: white; border-radius: 12px; padding: 20px; margin-bottom: 16px; border-left: 6px solid ${assessmentColour};">
          <h2 style="font-family: 'Fredoka One', cursive; font-size: 1.4rem; color: #1a1a2e; margin-bottom: 8px;">
            Overall Assessment
          </h2>
          <div style="font-family: 'Nunito', sans-serif; font-size: 1.2rem; font-weight: 700; color: ${assessmentColour};">
            ${escapeForTemplate(r.overallAssessment)}
          </div>
        </div>

        <!-- Theories Used -->
        <div style="background: white; border-radius: 12px; padding: 20px; margin-bottom: 16px;">
          <h3 class="m-grownup-title--lg">
            📚 Theories Used & Where Operationalised
          </h3>
          <table style="width: 100%; border-collapse: collapse; font-family: 'Nunito', sans-serif; font-size: 14px;">
            <thead>
              <tr style="background: #f3f4f6;">
                <th class="m-table-header">Theory</th>
                <th class="m-table-header">Where Operationalised</th>
              </tr>
            </thead>
            <tbody>${theoriesRows}</tbody>
          </table>
        </div>

        <!-- Alignment Checks -->
        <div class="m-grid-2col">
          <div class="m-option-card">
            <h4 class="m-grownup-title">🎯 Age Range Alignment</h4>
            <p class="m-grownup-body">${escapeForTemplate(r.ageRangeTheoriesApplied)}</p>
          </div>
          <div class="m-option-card">
            <h4 class="m-grownup-title">🧩 Sub-Skill Alignment</h4>
            <p class="m-grownup-body">${escapeForTemplate(r.subSkillAlignment)}</p>
          </div>
          <div class="m-option-card">
            <h4 class="m-grownup-title">🏆 Super Skill Alignment</h4>
            <p class="m-grownup-body">${escapeForTemplate(r.superSkillAlignment)}</p>
          </div>
        </div>

        <!-- Tone & Language -->
        <div class="m-grid-2col">
          <div class="m-option-card">
            <h4 class="m-grownup-title">🗣️ Tone Compliance</h4>
            <p class="m-grownup-body">${escapeForTemplate(r.toneComplianceNotes)}</p>
          </div>
          <div class="m-option-card">
            <h4 class="m-grownup-title">🇦🇺 Australian English Check</h4>
            <p class="m-grownup-body">${escapeForTemplate(r.australianEnglishCheck)}</p>
          </div>
          <div class="m-option-card">
            <h4 class="m-grownup-title">📋 Claim Types</h4>
            <p class="m-grownup-body">${escapeForTemplate(r.claimTypes)}</p>
          </div>
          <div class="m-option-card">
            <h4 class="m-grownup-title">⚠️ Unselected Concepts</h4>
            <ul style="font-family: 'Nunito', sans-serif; font-size: 13px; margin: 0; padding-left: 20px;">${unselectedItems}</ul>
          </div>
        </div>

        <!-- Flagged Issues -->
        <div style="background: white; border-radius: 12px; padding: 20px; margin-bottom: 16px; border-left: 6px solid ${r.flaggedIssues.length > 0 ? '#EF4444' : '#10B981'};">
          <h3 class="m-grownup-title--lg">
            🚩 Flagged Issues
          </h3>
          <ul style="font-family: 'Nunito', sans-serif; font-size: 14px; margin: 0; padding-left: 20px;">${flaggedItems}</ul>
        </div>

        <!-- Module Summary (for next week) -->
        <div style="background: linear-gradient(135deg, #f0fdf4, #ecfdf5); border-radius: 12px; padding: 20px; margin-bottom: 16px; border: 2px solid #10B981;">
          <h3 class="m-grownup-title--lg">
            📝 Module Summary (for next week's continuity)
          </h3>
          <p style="font-family: 'Nunito', sans-serif; font-size: 14px; color: #374151; margin-bottom: 12px;">
            ${escapeForTemplate(ms.summary)}
          </p>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            <div>
              <strong class="m-grownup-body--heading">Key Concepts:</strong>
              <p class="m-grownup-body--sm">${ms.keyConceptsCovered.map(c => escapeForTemplate(c)).join(", ") || "None listed"}</p>
            </div>
            <div>
              <strong class="m-grownup-body--heading">Skills Introduced:</strong>
              <p class="m-grownup-body--sm">${ms.skillsIntroduced.map(s => escapeForTemplate(s)).join(", ") || "None listed"}</p>
            </div>
          </div>
          <div style="margin-top: 8px;">
            <strong class="m-grownup-body--heading">Character Progression:</strong>
            <p class="m-grownup-body--sm">${escapeForTemplate(ms.characterProgressionNotes)}</p>
          </div>
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
    case "circle-one": {
      // Check if this has a correct answer (correctAnswerIndex) or is opinion-based
      const hasCorrectAnswer = typeof lesson.correctAnswerIndex === 'number';
      const originalCorrectIdx = lesson.correctAnswerIndex ?? -1;
      
      // Shuffle options to randomize correct answer position
      const indexedOptions = options.map((opt, i) => ({ text: opt, originalIndex: i }));
      // Fisher-Yates shuffle
      for (let i = indexedOptions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [indexedOptions[i], indexedOptions[j]] = [indexedOptions[j], indexedOptions[i]];
      }
      // Find the new position of the correct answer after shuffling
      const shuffledCorrectIdx = hasCorrectAnswer 
        ? indexedOptions.findIndex(o => o.originalIndex === originalCorrectIdx)
        : -1;
      
      interactionHtml = `
        <div class="interactive-group">
          <p class="text-lg mb-4 font-body font-semibold m-color-dark">${escapeForTemplate(lesson.interactionPrompt)}</p>
          <div class="grid grid-cols-2 gap-3 mb-4">
            ${indexedOptions.map((opt, i) => `
              <button class="interactive-option p-4 rounded-xl border-2 font-body text-lg text-left cursor-pointer transition-all" 
                      style="border-color: var(--secondary); background-color: white !important; color: var(--dark);"
                      data-correct="${hasCorrectAnswer ? (i === shuffledCorrectIdx ? 'true' : 'false') : 'opinion'}"
                      data-index="${i}"
                      onclick="handleInteractiveChoice(this, ${starIndex}, ${hasCorrectAnswer}, ${shuffledCorrectIdx})">
                ${escapeForTemplate(opt.text)}
              </button>
            `).join("")}
          </div>
          <div class="interactive-feedback p-3 rounded-xl mb-2 m-hidden"></div>
        </div>`;
      break;
    }
      
    case "fill-blank": {
      // Parse the prompt and replace ___ with inline input fields
      let blankCounter = 0;
      const promptWithInputs = escapeForTemplate(lesson.interactionPrompt).replace(/___+/g, () => {
        blankCounter++;
        return `<input type="text" 
                  class="inline-block w-32 px-2 py-1 mx-1 rounded-lg border-2 font-body text-lg text-center align-baseline" 
                  style="background-color: white; border-color: var(--primary); color: var(--dark); vertical-align: baseline;"
                  placeholder="..."
                  data-blank-index="${blankCounter}"
                  oninput="handleFillBlankInput(this, ${starIndex})">`;
      });
      
      interactionHtml = `
        <div class="interactive-group">
          <p class="text-lg mb-4 font-body leading-relaxed m-color-dark">${promptWithInputs}</p>
        </div>`;
      break;
    }
      
    case "rate-scale":
      interactionHtml = `
        <div class="interactive-group">
          <p class="text-lg mb-4 font-body font-semibold m-color-dark">${escapeForTemplate(lesson.interactionPrompt)}</p>
          <div class="flex justify-between gap-2 mb-4">
            ${[1,2,3,4,5].map(n => `
              <button class="interactive-option w-14 h-14 rounded-full border-2 font-title text-xl flex items-center justify-center cursor-pointer transition-all m-border-secondary m-color-dark"
                      onclick="this.parentElement.querySelectorAll('.interactive-option').forEach(b => b.classList.remove('option-selected')); this.classList.add('option-selected'); saveFormData('rate_${starIndex}', '${n}'); const page = this.closest('.page'); const ff = page.querySelector('.followup-feedback'); if(ff) ff.style.display = 'block'; const mf = page.querySelector('.mascot-feedback'); if(mf) mf.style.display = 'flex'; const cb = page.querySelector('[data-activity]'); if(cb) cb.disabled = false;">
                ${n}
              </button>
            `).join("")}
          </div>
          <div class="flex justify-between text-sm font-body m-color-secondary">
            <span>Not at all</span>
            <span>Very much!</span>
          </div>
        </div>`;
      break;
      
    case "true-false": {
      // Check if this has a correct answer - for true-false, correctAnswerIndex MUST be set
      // 0 = "I Agree" is correct, 1 = "I Disagree" is correct
      const hasCorrectAnswer = typeof lesson.correctAnswerIndex === 'number';
      const correctIdx = lesson.correctAnswerIndex ?? 1; // Default to "I Disagree" for myth-busting statements if not specified
      interactionHtml = `
        <div class="interactive-group">
          <div class="rounded-2xl p-6 mb-4 m-bg-soft-yellow">
            <p class="text-xl font-body font-semibold text-center m-color-dark">"${escapeForTemplate(lesson.interactionPrompt)}"</p>
          </div>
          <div class="flex gap-4 justify-center">
            <button class="interactive-option px-8 py-4 rounded-xl border-2 font-title text-xl cursor-pointer transition-all m-border-secondary m-color-dark"
                    data-correct="${hasCorrectAnswer ? (0 === correctIdx ? 'true' : 'false') : 'opinion'}"
                    data-index="0"
                    onclick="handleInteractiveChoice(this, ${starIndex}, ${hasCorrectAnswer}, ${correctIdx})">
              I Agree
            </button>
            <button class="interactive-option px-8 py-4 rounded-xl border-2 font-title text-xl cursor-pointer transition-all" 
                    style="border-color: var(--accent); color: var(--dark);"
                    data-correct="${hasCorrectAnswer ? (1 === correctIdx ? 'true' : 'false') : 'opinion'}"
                    data-index="1"
                    onclick="handleInteractiveChoice(this, ${starIndex}, ${hasCorrectAnswer}, ${correctIdx})">
              I Disagree
            </button>
          </div>
          <div class="interactive-feedback p-3 rounded-xl mb-2 m-hidden"></div>
        </div>`;
      break;
    }
  }

  return `
    <div class="page min-h-screen p-8 m-bg-cream" data-page="interactive-lesson">
      <div class="max-w-4xl mx-auto">
        <h1 class="text-3xl md:text-4xl mb-6 font-title m-color-dark">${escapeForTemplate(lesson.heading)}</h1>
        
        <div class="rounded-3xl shadow-xl p-8 mb-6 m-bg-white">
          <p class="text-lg mb-6 leading-relaxed font-body m-color-dark">${escapeForTemplate(lesson.introText)}</p>
          
          ${interactionHtml}
          
          <div class="followup-feedback mt-6 p-4 rounded-xl" style="background-color: var(--cream); display: none;">
            <p class="font-body m-color-dark">${escapeForTemplate(lesson.followUpText)}</p>
          </div>
        </div>
        
        <div class="mascot-feedback rounded-xl p-4 flex items-center gap-3 m-feedback-hidden-green">
          <span class="text-3xl">${escapeForTemplate(metadata.characterEmoji)}</span>
          <p class="font-body font-semibold m-color-dark">${escapeForTemplate(lesson.mascotComment)}</p>
        </div>
        
        <div class="rounded-xl p-4 flex items-center gap-3 mt-4 m-bg-soft-yellow">
          <input 
            type="checkbox" 
            class="w-8 h-8 rounded cursor-pointer m-accent-primary"
            data-activity="${activityId}"
            disabled
            onchange="markActivityComplete('${activityId}')"
            
          >
          <label class="font-title text-xl m-color-dark">I participated!</label>
        </div>
      </div>
    </div>`;
}

function renderFillInStoryPage(story: FillInStoryContent, starIndex: number, metadata: ModuleMetadata): string {
  const activityId = `fillin_${starIndex}`;
  
  let storyHtml = escapeForTemplate(story.storyTemplate);
  story.blanks.forEach((blank, i) => {
    // Calculate width based on placeholder length (min 8rem, max 22rem)
    const hintLength = blank.hint.length;
    const widthRem = Math.min(22, Math.max(8, Math.ceil(hintLength * 0.8)));
    storyHtml = storyHtml.replace(
      `[${blank.id}]`,
      `<input type="text" class="story-blank inline-block border-b-3 border-dashed text-center font-body mx-1" style="border-color: var(--primary); background: transparent; width: ${widthRem}rem; min-width: 8rem; max-width: 100%; padding: 0 0.35rem;" placeholder="${escapeForTemplate(blank.hint)}" onchange="saveFormData('story_${starIndex}_${i}', this.value)">`
    );
  });

  return `
    <div class="page min-h-screen p-8 m-bg-cream" data-page="fill-in-story">
      <div class="max-w-4xl mx-auto">
        <h1 class="text-3xl md:text-4xl mb-6 font-title m-color-dark">${escapeForTemplate(story.heading)}</h1>
        
        <div class="rounded-3xl shadow-xl p-8 mb-6 m-bg-white">
          <p class="text-lg mb-6 font-body m-color-dark">${escapeForTemplate(story.instructions)}</p>
          
          <div class="p-6 rounded-2xl mb-6 m-bg-soft-yellow">
            <p class="text-xl leading-loose font-body m-color-dark">${storyHtml}</p>
          </div>
          
          <div class="p-4 rounded-xl m-bg-cream">
            <p class="font-body font-semibold mb-3 m-color-dark">${escapeForTemplate(story.reflection)}</p>
            <textarea class="w-full p-3 rounded-lg border-2 font-body" style="border-color: var(--primary); min-height: 80px;" placeholder="Write your thoughts..." onchange="saveFormData('story_reflection_${starIndex}', this.value)"></textarea>
          </div>
        </div>
        
        <div class="rounded-xl p-4 flex items-center gap-3 m-bg-light-green">
          <input 
            type="checkbox" 
            class="w-8 h-8 rounded cursor-pointer m-accent-primary"
            data-activity="${activityId}"
            onchange="markActivityComplete('${activityId}')"
            
          >
          <label class="font-title text-xl m-color-dark">I completed my story!</label>
        </div>
      </div>
    </div>`;
}

function renderCopingCardsPage(cards: CopingCardsContent, starIndex: number): string {
  const activityId = `coping_${starIndex}`;
  
  const categoriesHtml = cards.categories.map(cat => `
    <div class="rounded-xl p-4 mb-4" style="background-color: ${cat.color};">
      <h3 class="font-title text-lg mb-3 m-color-dark">${cat.emoji} ${escapeForTemplate(cat.name)}</h3>
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
    <div class="page min-h-screen p-8 m-bg-cream" data-page="coping-cards">
      <div class="max-w-4xl mx-auto">
        <h1 class="text-3xl md:text-4xl mb-6 font-title m-color-dark">${escapeForTemplate(cards.heading)}</h1>
        
        <div class="rounded-3xl shadow-xl p-8 mb-6 m-bg-white">
          <p class="text-lg mb-6 font-body m-color-dark">${escapeForTemplate(cards.instructions)}</p>
          
          ${categoriesHtml}
          
          <div class="mt-6 p-4 rounded-xl m-bg-soft-yellow">
            <p class="font-body font-semibold mb-3 m-color-dark">${escapeForTemplate(cards.personalCardPrompt)}</p>
            <input type="text" class="w-full p-3 rounded-lg border-2 font-body m-border-primary" placeholder="My personal coping strategy..." onchange="saveFormData('coping_personal_${starIndex}', this.value)">
          </div>
        </div>
        
        <div class="rounded-xl p-4 flex items-center gap-3 m-bg-light-green">
          <input 
            type="checkbox" 
            class="w-8 h-8 rounded cursor-pointer m-accent-primary"
            data-activity="${activityId}"
            onchange="markActivityComplete('${activityId}')"
            
          >
          <label class="font-title text-xl m-color-dark">I built my coping cards!</label>
        </div>
      </div>
    </div>`;
}

function renderGratitudeJarPage(jar: GratitudeJarContent, starIndex: number): string {
  const activityId = `gratitude_${starIndex}`;
  
  const jarColors = ['#FFB5B5', '#B5D8FF', '#B5FFD8', '#FFE5B5', '#E5B5FF', '#FFB5E5'];
  
  const promptsHtml = jar.promptCategories.map((cat, i) => {
    const jarColor = jarColors[i % jarColors.length];
    return `
    <div class="gratitude-jar-item" style="display: flex; flex-direction: column; align-items: center;">
      <!-- Jar Visual -->
      <div class="gratitude-jar" style="position: relative; width: 220px; margin-bottom: 12px;">
        <!-- Jar Lid -->
        <div style="width: 120px; height: 22px; margin: 0 auto; background: linear-gradient(180deg, #b8860b, #daa520, #b8860b); border-radius: 8px 8px 0 0; border: 2px solid #8b6914; border-bottom: none; position: relative; z-index: 2;"></div>
        <!-- Jar Neck -->
        <div style="width: 110px; height: 12px; margin: 0 auto; background: rgba(255,255,255,0.35); border-left: 2px solid rgba(0,0,0,0.08); border-right: 2px solid rgba(0,0,0,0.08); position: relative; z-index: 1;"></div>
        <!-- Jar Body -->
        <div style="width: 190px; height: 170px; margin: 0 auto; background: linear-gradient(135deg, rgba(255,255,255,0.6), ${jarColor}30, rgba(255,255,255,0.25)); border: 2px solid rgba(0,0,0,0.10); border-radius: 16px 16px 32px 32px; position: relative; overflow: hidden; box-shadow: inset -10px 0 16px rgba(255,255,255,0.35), inset 10px 0 16px rgba(0,0,0,0.04), 0 6px 16px rgba(0,0,0,0.1);">
          <!-- Glass shine -->
          <div style="position: absolute; top: 12px; left: 16px; width: 10px; height: 80px; background: rgba(255,255,255,0.5); border-radius: 5px; transform: rotate(5deg);"></div>
          <!-- Jar fill (colour at bottom) -->
          <div style="position: absolute; bottom: 0; left: 0; right: 0; height: 45%; background: linear-gradient(180deg, ${jarColor}50, ${jarColor}80); border-radius: 0 0 30px 30px;"></div>
          <!-- Jar contents label -->
          <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; padding: 12px; position: relative; z-index: 1;">
            <span style="font-size: 2.8rem;">${cat.emoji}</span>
            <span class="font-title" style="font-size: 1.1rem; color: var(--dark); text-align: center; margin-top: 6px;">${escapeForTemplate(cat.category)}</span>
          </div>
        </div>
      </div>
      <!-- Prompt and Input -->
      <p class="font-body text-sm mb-2 text-center" style="color: var(--dark); max-width: 220px;">${escapeForTemplate(cat.prompt)}</p>
      <input type="text" class="w-full p-3 rounded-lg border-2 font-body" style="border-color: var(--primary); background-color: white; max-width: 220px;" placeholder="I'm grateful for..." data-form-key="gratitude_${starIndex}_${i}" onchange="saveFormData('gratitude_${starIndex}_${i}', this.value)">
    </div>`;
  }).join("");

  return `
    <div class="page min-h-screen p-8 m-bg-cream" data-page="gratitude-jar">
      <div class="max-w-4xl mx-auto">
        <h1 class="text-3xl md:text-4xl mb-6 font-title m-color-dark">${escapeForTemplate(jar.heading)}</h1>
        
        <div class="rounded-3xl shadow-xl p-8 mb-6 m-bg-white">
          <p class="text-lg mb-6 font-body m-color-dark">${escapeForTemplate(jar.introText)}</p>
          
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 28px; justify-items: center;">
            ${promptsHtml}
          </div>
          
          <div class="mt-6 p-4 rounded-xl text-center m-bg-light-green">
            <p class="font-body font-semibold m-color-dark">${escapeForTemplate(jar.encouragement)}</p>
          </div>
        </div>
        
        <div class="rounded-xl p-4 flex items-center gap-3 m-bg-light-green">
          <input 
            type="checkbox" 
            class="w-8 h-8 rounded cursor-pointer m-accent-primary"
            data-activity="${activityId}"
            onchange="markActivityComplete('${activityId}')"
            
          >
          <label class="font-title text-xl m-color-dark">I filled my gratitude jar!</label>
        </div>
      </div>
    </div>`;
}

function renderSortingActivityPage(sorting: SortingActivityContent, starIndex: number): string {
  const activityId = `sorting_${starIndex}`;
  
  const categoriesHtml = sorting.categories.map((cat, ci) => `
    <div class="sort-category rounded-xl p-4 min-h-[150px] border-3 cursor-pointer" style="background-color: ${cat.color}; border-color: var(--dark);" data-category="${escapeForTemplate(cat.name)}" data-category-index="${ci}" onclick="sortSelectedItem(this, '${escapeForTemplate(cat.name)}', ${starIndex})">
      <h3 class="font-title text-lg mb-3 text-center m-color-dark">${cat.emoji} ${escapeForTemplate(cat.name)}</h3>
      <div class="dropped-items space-y-2"></div>
    </div>
  `).join("");
  
  const itemsHtml = sorting.items.map((item, i) => `
    <div class="sort-item p-3 rounded-lg font-body cursor-pointer transition-all hover:scale-102" style="background-color: white; border: 2px solid var(--primary);" data-item-id="item_${i}" data-correct-category="${escapeForTemplate(item.correctCategory)}" data-explanation="${escapeForTemplate(item.explanation)}" onclick="selectSortItem(this)">
      ${escapeForTemplate(item.text)}
    </div>
  `).join("");

  return `
    <div class="page min-h-screen p-8 m-bg-cream" data-page="sorting-activity">
      <div class="max-w-4xl mx-auto">
        <h1 class="text-3xl md:text-4xl mb-6 font-title m-color-dark">${escapeForTemplate(sorting.heading)}</h1>
        
        <div class="rounded-3xl shadow-xl p-8 mb-6 m-bg-white">
          <p class="text-lg mb-6 font-body m-color-dark">${escapeForTemplate(sorting.instructions)}</p>
          
          <div class="grid md:grid-cols-2 gap-4 mb-6">
            ${categoriesHtml}
          </div>
          
          <div class="sort-items-container p-4 rounded-xl m-bg-cream">
            <p class="font-body font-semibold mb-3 m-color-dark">Items to sort (tap item, then tap a category):</p>
            <div class="sort-items-list space-y-2">
              ${itemsHtml}
            </div>
          </div>
        </div>
        
        <div class="rounded-xl p-4 flex items-center gap-3 m-bg-light-green">
          <input 
            type="checkbox" 
            class="w-8 h-8 rounded cursor-pointer m-accent-primary"
            data-activity="${activityId}"
            onchange="markActivityComplete('${activityId}')"
            
          >
          <label class="font-title text-xl m-color-dark">I sorted everything!</label>
        </div>
      </div>
    </div>`;
}

function renderThoughtBubblesPage(thought: ThoughtBubblesContent, starIndex: number): string {
  const activityId = `thought_${starIndex}`;

  return `
    <div class="page min-h-screen p-8 m-bg-cream" data-page="thought-bubbles">
      <div class="max-w-4xl mx-auto">
        <h1 class="text-3xl md:text-4xl mb-6 font-title m-color-dark">${escapeForTemplate(thought.heading)}</h1>
        
        <div class="rounded-3xl shadow-xl p-8 mb-6 m-bg-white">
          <div class="p-4 rounded-xl mb-6 m-bg-soft-yellow">
            <p class="font-body text-lg m-color-dark"><strong>Scenario:</strong> ${escapeForTemplate(thought.scenario)}</p>
          </div>
          
          <div class="flex items-start gap-4 mb-6">
            <span class="text-5xl">${thought.characterEmoji}</span>
            <div class="flex-1 p-4 rounded-2xl relative" style="background-color: #fecaca; border: 2px solid var(--accent);">
              <p class="font-body text-lg m-color-dark"><strong>Unhelpful thought:</strong> "${escapeForTemplate(thought.unhelpfulThought)}"</p>
            </div>
          </div>
          
          <div class="p-4 rounded-xl mb-4 m-bg-light-green">
            <p class="font-body font-semibold mb-3 m-color-dark">${escapeForTemplate(thought.helpfulPrompt)}</p>
            <textarea class="w-full p-3 rounded-lg border-2 font-body" style="border-color: var(--secondary); min-height: 80px;" placeholder="Write a helpful thought..." onchange="saveFormData('helpful_thought_${starIndex}', this.value)"></textarea>
          </div>
          
          <div class="p-3 rounded-lg text-sm m-bg-cream">
            <p class="font-body m-color-secondary"><strong>Example:</strong> "${escapeForTemplate(thought.exampleHelpful)}"</p>
          </div>
          
          <div class="mt-6 p-4 rounded-xl m-bg-soft-yellow">
            <p class="font-body m-color-dark">${escapeForTemplate(thought.reflection)}</p>
          </div>
        </div>
        
        <div class="rounded-xl p-4 flex items-center gap-3 m-bg-light-green">
          <input 
            type="checkbox" 
            class="w-8 h-8 rounded cursor-pointer m-accent-primary"
            data-activity="${activityId}"
            onchange="markActivityComplete('${activityId}')"
            
          >
          <label class="font-title text-xl m-color-dark">I challenged my thoughts!</label>
        </div>
      </div>
    </div>`;
}

function renderEmojiCheckInPage(checkIn: EmojiCheckInContent, starIndex: number): string {
  const activityId = `emoji_${starIndex}`;
  
  const moodGrid = checkIn.timePoints.map((time, ti) => `
    <div class="text-center">
      <div class="text-2xl mb-2">${time.emoji}</div>
      <p class="font-title text-sm mb-3 m-color-dark">${escapeForTemplate(time.label)}</p>
      <div class="flex flex-wrap justify-center gap-2">
        ${checkIn.moodOptions.map((mood, mi) => `
          <button class="mood-option w-14 h-14 rounded-full text-2xl flex items-center justify-center cursor-pointer transition-all border-3 hover:scale-125" 
                  style="background-color: ${mood.color}; border-color: transparent;" 
                  title="${escapeForTemplate(mood.label)}"
                  onclick="
                    this.parentElement.querySelectorAll('.mood-option').forEach(function(b) { b.style.borderColor = 'transparent'; b.style.transform = 'scale(1)'; b.style.boxShadow = 'none'; });
                    this.style.borderColor = 'var(--dark)';
                    this.style.transform = 'scale(1.25)';
                    this.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
                    var label = this.closest('.text-center').querySelector('.mood-selected-label');
                    if (label) { label.textContent = '${escapeForTemplate(mood.label)}'; label.style.display = 'block'; }
                    saveFormData('mood_${starIndex}_${ti}', '${escapeForTemplate(mood.label)}');
                  ">
            ${mood.emoji}
          </button>
        `).join("")}
      </div>
      <p class="mood-selected-label font-body text-xs mt-2 font-semibold m-feedback-hidden-primary"></p>
    </div>
  `).join("");

  return `
    <div class="page min-h-screen p-8 m-bg-cream" data-page="emoji-check-in">
      <div class="max-w-4xl mx-auto">
        <h1 class="text-3xl md:text-4xl mb-6 font-title m-color-dark">${escapeForTemplate(checkIn.heading)}</h1>
        
        <div class="rounded-3xl shadow-xl p-8 mb-6 m-bg-white">
          <p class="text-lg mb-6 font-body m-color-dark">${escapeForTemplate(checkIn.instructions)}</p>
          
          <div class="grid md:grid-cols-3 gap-6 mb-6">
            ${moodGrid}
          </div>
          
          <div class="flex flex-wrap justify-center gap-4 mb-6 p-3 rounded-lg m-bg-cream">
            ${checkIn.moodOptions.map(mood => `
              <div class="flex items-center gap-2">
                <span class="text-xl">${mood.emoji}</span>
                <span class="font-body text-sm m-color-dark">${escapeForTemplate(mood.label)}</span>
              </div>
            `).join("")}
          </div>
          
          <div class="p-4 rounded-xl m-bg-soft-yellow">
            <p class="font-body font-semibold mb-2 m-color-dark">${escapeForTemplate(checkIn.patternQuestion)}</p>
            <textarea class="w-full p-3 rounded-lg border-2 font-body m-input-bordered-primary" placeholder="I noticed..." onchange="saveFormData('mood_pattern_${starIndex}', this.value)"></textarea>
          </div>
        </div>
        
        <div class="rounded-xl p-4 flex items-center gap-3 m-bg-light-green">
          <input 
            type="checkbox" 
            class="w-8 h-8 rounded cursor-pointer m-accent-primary"
            data-activity="${activityId}"
            onchange="markActivityComplete('${activityId}')"
            
          >
          <label class="font-title text-xl m-color-dark">I tracked my moods!</label>
        </div>
      </div>
    </div>`;
}

function renderWordScramblePage(scramble: WordScrambleContent, starIndex: number): string {
  const activityId = `scramble_${starIndex}`;
  
  const wordsHtml = scramble.words.map((word, wi) => `
    <div class="scramble-word p-4 rounded-xl mb-4 m-bg-soft-yellow" data-answer="${word.answer}">
      <div class="flex items-center gap-2 mb-3">
        <span class="text-2xl">${word.emoji}</span>
        <span class="font-body text-sm m-color-secondary">Hint: ${escapeForTemplate(word.hint)}</span>
      </div>
      <p class="font-title text-2xl text-center mb-3 m-color-dark">${word.scrambled}</p>
      <input type="text" class="w-full p-3 rounded-lg border-2 font-body text-lg text-center m-border-primary" placeholder="Your answer..." onchange="const correct = this.value.toUpperCase() === '${word.answer}'; this.style.borderColor = correct ? 'var(--secondary)' : 'var(--accent)'; this.parentElement.querySelector('.word-feedback').textContent = correct ? 'Correct!' : 'Try again!'; this.parentElement.querySelector('.word-feedback').style.color = correct ? 'var(--secondary)' : 'var(--accent)'; saveFormData('scramble_${starIndex}_${wi}', this.value);">
      <p class="word-feedback text-center font-title mt-2"></p>
    </div>
  `).join("");

  return `
    <div class="page min-h-screen p-8 m-bg-cream" data-page="word-scramble">
      <div class="max-w-4xl mx-auto">
        <h1 class="text-3xl md:text-4xl mb-6 font-title m-color-dark">${escapeForTemplate(scramble.heading)}</h1>
        
        <div class="rounded-3xl shadow-xl p-8 mb-6 m-bg-white">
          <p class="text-lg mb-6 font-body m-color-dark">${escapeForTemplate(scramble.instructions)}</p>
          
          ${wordsHtml}
          
          <div class="p-4 rounded-xl text-center m-bg-light-green">
            <p class="font-body font-semibold m-color-dark">${escapeForTemplate(scramble.completionMessage)}</p>
          </div>
        </div>
        
        <div class="rounded-xl p-4 flex items-center gap-3 m-bg-light-green">
          <input 
            type="checkbox" 
            class="w-8 h-8 rounded cursor-pointer m-accent-primary"
            data-activity="${activityId}"
            onchange="markActivityComplete('${activityId}')"
            
          >
          <label class="font-title text-xl m-color-dark">I solved all the scrambles!</label>
        </div>
      </div>
    </div>`;
}

function renderAgreeDisagreePage(activity: AgreeDisagreeContent, starIndex: number): string {
  const activityId = `agree_${starIndex}`;
  
  const statementsHtml = activity.statements.map((stmt, si) => `
    <div class="statement-card p-4 rounded-xl mb-4 m-bg-soft-yellow">
      <p class="font-body text-lg mb-3 m-color-dark">"${escapeForTemplate(stmt.statement)}"</p>
      <div class="flex gap-3 mb-3">
        <button class="agree-btn flex-1 py-3 rounded-lg font-title text-lg cursor-pointer transition-all border-2 m-bg-light-green-flat"
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
        <p class="font-body text-sm m-color-secondary">${escapeForTemplate(stmt.insight)}</p>
      </div>
    </div>
  `).join("");

  return `
    <div class="page min-h-screen p-8 m-bg-cream" data-page="agree-disagree">
      <div class="max-w-4xl mx-auto">
        <h1 class="text-3xl md:text-4xl mb-6 font-title m-color-dark">${escapeForTemplate(activity.heading)}</h1>
        
        <div class="rounded-3xl shadow-xl p-8 mb-6 m-bg-white">
          <p class="text-lg mb-6 font-body m-color-dark">${escapeForTemplate(activity.instructions)}</p>
          
          ${statementsHtml}
          
          <div class="p-4 rounded-xl m-bg-cream">
            <p class="font-body font-semibold mb-2 m-color-dark">${escapeForTemplate(activity.reflection)}</p>
            <textarea class="w-full p-3 rounded-lg border-2 font-body m-input-bordered-primary" placeholder="Write your thoughts..." onchange="saveFormData('agree_reflection_${starIndex}', this.value)"></textarea>
          </div>
        </div>
        
        <div class="rounded-xl p-4 flex items-center gap-3 m-bg-light-green">
          <input 
            type="checkbox" 
            class="w-8 h-8 rounded cursor-pointer m-accent-primary"
            data-activity="${activityId}"
            onchange="markActivityComplete('${activityId}')"
            
          >
          <label class="font-title text-xl m-color-dark">I shared my opinions!</label>
        </div>
      </div>
    </div>`;
}

function renderComicStripPage(comic: ComicStripContent, starIndex: number): string {
  const activityId = `comic_${starIndex}`;
  
  const panelsHtml = comic.panels.map(panel => `
    <div class="comic-panel rounded-xl border-3 p-4" style="border-color: var(--dark); background-color: white;">
      <div class="flex items-center gap-2 mb-2">
        <span class="w-8 h-8 rounded-full flex items-center justify-center font-title text-white m-bg-primary">${panel.panelNumber}</span>
        <p class="font-body text-sm m-color-dark">${escapeForTemplate(panel.prompt)}</p>
      </div>
      <div class="comic-canvas-container w-full rounded-lg mb-2" style="background-color: var(--cream); border: 2px dashed var(--secondary);">
        <canvas class="comic-drawing-canvas w-full cursor-crosshair" width="300" height="150" data-drawing-key="comic_canvas_${starIndex}_${panel.panelNumber}" style="touch-action: none; display: block; border-radius: 0.5rem;"></canvas>
      </div>
      <input type="text" class="w-full p-2 rounded-lg border font-body text-sm m-border-secondary" placeholder="${escapeForTemplate(panel.placeholder)}" onchange="saveFormData('comic_${starIndex}_${panel.panelNumber}', this.value)">
    </div>
  `).join("");

  return `
    <div class="page min-h-screen p-8 m-bg-cream" data-page="comic-strip">
      <div class="max-w-4xl mx-auto">
        <h1 class="text-3xl md:text-4xl mb-6 font-title m-color-dark">${escapeForTemplate(comic.heading)}</h1>
        
        <div class="rounded-3xl shadow-xl p-8 mb-6 m-bg-white">
          <div class="p-4 rounded-xl mb-6 m-bg-soft-yellow">
            <p class="font-body text-lg m-color-dark">${escapeForTemplate(comic.scenario)}</p>
          </div>
          
          <div class="grid md:grid-cols-2 gap-4 mb-6">
            ${panelsHtml}
          </div>
          
          <div class="p-4 rounded-xl m-bg-light-green">
            <p class="font-body font-semibold m-color-dark">${escapeForTemplate(comic.sharePrompt)}</p>
          </div>
        </div>
        
        <div class="rounded-xl p-4 flex items-center gap-3 m-bg-light-green">
          <input 
            type="checkbox" 
            class="w-8 h-8 rounded cursor-pointer m-accent-primary"
            data-activity="${activityId}"
            onchange="markActivityComplete('${activityId}')"
            
          >
          <label class="font-title text-xl m-color-dark">I created my comic!</label>
        </div>
      </div>
    </div>`;
}

function renderAffirmationBuilderPage(builder: AffirmationBuilderContent, starIndex: number): string {
  const activityId = `affirm_${starIndex}`;
  
  const startersHtml = builder.starters.map(s => `<button class="affirmation-part starter px-4 py-2 rounded-lg font-body cursor-pointer transition-all border-2 m-1 m-bg-light-green-flat" onclick="this.parentElement.querySelectorAll('.starter').forEach(b => b.style.borderColor = 'transparent'); this.style.borderColor = 'var(--dark)'; updateAffirmation();">${escapeForTemplate(s)}</button>`).join("");
  const middlesHtml = builder.middles.map(m => `<button class="affirmation-part middle px-4 py-2 rounded-lg font-body cursor-pointer transition-all border-2 m-1" style="background-color: var(--soft-yellow); border-color: transparent; color: var(--dark);" onclick="this.parentElement.querySelectorAll('.middle').forEach(b => b.style.borderColor = 'transparent'); this.style.borderColor = 'var(--dark)'; updateAffirmation();">${escapeForTemplate(m)}</button>`).join("");
  const endingsHtml = builder.endings.map(e => `<button class="affirmation-part ending px-4 py-2 rounded-lg font-body cursor-pointer transition-all border-2 m-1" style="background-color: var(--primary); border-color: transparent; color: white;" onclick="this.parentElement.querySelectorAll('.ending').forEach(b => b.style.borderColor = 'transparent'); this.style.borderColor = 'var(--dark)'; updateAffirmation();">${escapeForTemplate(e)}</button>`).join("");
  const emojisHtml = builder.decorationEmojis.map(e => `<button class="emoji-decoration text-2xl p-1 cursor-pointer hover:scale-125 transition-all" onclick="const display = document.querySelector('.affirmation-display'); display.textContent = '${e} ' + display.textContent + ' ${e}';">${e}</button>`).join("");

  return `
    <div class="page min-h-screen p-8 m-bg-cream" data-page="affirmation-builder">
      <div class="max-w-4xl mx-auto">
        <h1 class="text-3xl md:text-4xl mb-6 font-title m-color-dark">${escapeForTemplate(builder.heading)}</h1>
        
        <div class="rounded-3xl shadow-xl p-8 mb-6 affirmation-container m-bg-white">
          <p class="text-lg mb-6 font-body m-color-dark">${escapeForTemplate(builder.instructions)}</p>
          
          <div class="mb-4">
            <p class="font-body font-semibold mb-2 m-color-dark">Step 1: Pick a starter</p>
            <div class="flex flex-wrap">${startersHtml}</div>
          </div>
          
          <div class="mb-4">
            <p class="font-body font-semibold mb-2 m-color-dark">Step 2: Pick a middle</p>
            <div class="flex flex-wrap">${middlesHtml}</div>
          </div>
          
          <div class="mb-4">
            <p class="font-body font-semibold mb-2 m-color-dark">Step 3: Pick an ending</p>
            <div class="flex flex-wrap">${endingsHtml}</div>
          </div>
          
          <div class="mb-6">
            <p class="font-body font-semibold mb-2 m-color-dark">Decorate with emojis:</p>
            <div class="flex flex-wrap gap-1">${emojisHtml}</div>
          </div>
          
          <div class="p-6 rounded-2xl text-center mb-4 m-bg-callout-gradient">
            <p class="font-body text-sm mb-2 m-color-secondary">Your affirmation:</p>
            <p class="affirmation-display font-title text-2xl m-color-dark">Tap the words above!</p>
          </div>
          
          <div class="p-4 rounded-xl m-bg-soft-yellow">
            <p class="font-body m-color-dark">${escapeForTemplate(builder.savePrompt)}</p>
          </div>
        </div>
        
        <div class="rounded-xl p-4 flex items-center gap-3 m-bg-light-green">
          <input 
            type="checkbox" 
            class="w-8 h-8 rounded cursor-pointer m-accent-primary"
            data-activity="${activityId}"
            onchange="markActivityComplete('${activityId}')"
            
          >
          <label class="font-title text-xl m-color-dark">I built my power phrase!</label>
        </div>
      </div>
    </div>`;
}

// ========================================
// v5 NEW CHALLENGE RENDER FUNCTIONS
// ========================================

function renderWeatherControllerPage(weather: WeatherControllerContent, starIndex: number, metadata: ModuleMetadata): string {
  const activityId = `weather_${starIndex}`;
  
  const actionsHtml = weather.calmingActions.map(action => `
    <button class="weather-action flex flex-col items-center gap-2 p-4 rounded-2xl border-3 transition-all hover:scale-105 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed m-card-bordered"
            data-action-id="${action.id}"
            data-points="${action.points}"
            data-feedback="${escapeForTemplate(action.feedbackText)}"
            onclick="handleWeatherAction(this, '${activityId}', ${action.points})">
      <span class="text-4xl">${action.emoji}</span>
      <span class="font-title text-lg text-center m-color-dark">${escapeForTemplate(action.label)}</span>
    </button>
  `).join("");

  const weatherEmoji = weather.weatherType === "storm" ? "⛈️" : 
                       weather.weatherType === "rain" ? "🌧️" :
                       weather.weatherType === "fog" ? "🌫️" : "🔥";
  const weatherColors = weather.weatherType === "storm" ? "from-gray-600 to-gray-800" :
                        weather.weatherType === "rain" ? "from-blue-400 to-blue-600" :
                        weather.weatherType === "fog" ? "from-gray-300 to-gray-500" : "from-orange-400 to-red-500";

  return `
    <div class="page min-h-screen p-8 m-bg-cream" data-page="weather-controller" data-activity="${activityId}">
      <div class="max-w-4xl mx-auto">
        <h1 class="text-3xl md:text-4xl mb-6 font-title m-color-dark">${escapeForTemplate(weather.heading)}</h1>
        
        <div class="rounded-3xl shadow-xl p-8 m-bg-white">
          <p class="text-lg mb-6 font-body text-center m-color-dark">${escapeForTemplate(weather.instructions)}</p>
          
          <!-- Weather Scene -->
          <div class="weather-scene relative rounded-2xl overflow-hidden mb-6" style="height: 200px; background: linear-gradient(to-b, ${weatherColors});">
            <div class="weather-overlay absolute inset-0 flex items-center justify-center transition-all duration-1000" id="weatherOverlay">
              <span class="weather-emoji text-8xl animate-bounce" id="weatherEmoji">${weatherEmoji}</span>
            </div>
            <div class="weather-clear absolute inset-0 flex items-center justify-center transition-all duration-1000 opacity-0" id="weatherClear" style="background: linear-gradient(to-b, #87CEEB, #E0F6FF);">
              <span class="text-8xl">☀️</span>
            </div>
            <!-- Animated elements -->
            <div class="rain-drops absolute inset-0 pointer-events-none" id="rainDrops" style="opacity: 0.7;">
              ${Array.from({length: 20}, (_, i) => `<div class="rain-drop absolute w-1 h-4 rounded-full" style="background: rgba(255,255,255,0.6); left: ${i * 5}%; animation: rainFall ${0.5 + Math.random()}s linear infinite; animation-delay: ${Math.random()}s;"></div>`).join("")}
            </div>
          </div>
          
          <!-- Calm Meter -->
          <div class="mb-6">
            <div class="flex justify-between mb-2">
              <span class="font-body text-sm m-color-accent">Stormy</span>
              <span class="font-body text-sm m-color-secondary">Calm</span>
            </div>
            <div class="h-8 rounded-full overflow-hidden m-bg-soft-yellow">
              <div class="calm-meter h-full rounded-full transition-all duration-500" id="calmMeter" style="width: 0%; background: linear-gradient(to-r, var(--accent), var(--primary), var(--secondary), var(--light-green));"></div>
            </div>
            <p class="text-center font-title text-2xl mt-2 m-color-primary"><span id="calmPercent">0</span>% Calm</p>
          </div>
          
          <!-- Action Buttons -->
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            ${actionsHtml}
          </div>
          
          <!-- Feedback Area -->
          <div class="weather-feedback p-4 rounded-xl text-center mb-4 transition-all" id="weatherFeedback" class="m-feedback-hidden-green">
            <p class="font-body text-lg m-color-dark" id="feedbackText"></p>
          </div>
          
          <!-- Win Message (hidden initially) -->
          <div class="weather-win p-6 rounded-2xl text-center" id="weatherWin" class="m-feedback-hidden">
            <p class="text-4xl mb-2">☀️</p>
            <p class="font-title text-2xl mb-2 m-color-dark">${escapeForTemplate(weather.winText)}</p>
            <p class="font-body m-color-secondary">${escapeForTemplate(weather.encouragement)}</p>
          </div>
          
          <!-- Completion Checkbox (appears after win) -->
          <div class="rounded-xl p-4 flex items-center gap-3 mt-4 m-feedback-hidden-green" id="weatherComplete">
            <input 
              type="checkbox" 
              class="w-8 h-8 rounded cursor-pointer m-accent-primary"
              data-activity="${activityId}"
              onchange="markActivityComplete('${activityId}')"
              
            >
            <label class="font-title text-xl m-color-dark">I calmed the storm! ⭐</label>
          </div>
        </div>
      </div>
      
      <style>
        @keyframes rainFall {
          0% { transform: translateY(-20px); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(200px); opacity: 0; }
        }
        .weather-action:active { transform: scale(0.95); }
        .weather-action.cooldown { opacity: 0.5; pointer-events: none; }
        .weather-action.used { background-color: var(--light-green) !important; }
      </style>
    </div>`;
}

function renderPowerUpCollectorPage(collector: PowerUpCollectorContent, starIndex: number, metadata: ModuleMetadata): string {
  const activityId = `powerup_${starIndex}`;
  
  const powerUpsHtml = collector.powerUps.map(pu => `
    <button class="power-up-item p-4 rounded-xl border-3 transition-all hover:scale-105 cursor-pointer"
            style="background-color: white; border-color: var(--primary);"
            data-positive="${pu.isPositive}"
            data-name="${escapeForTemplate(pu.name)}"
            onclick="handlePowerUpClick(this, '${activityId}', ${collector.targetCount})">
      <div class="text-4xl mb-2">${pu.emoji}</div>
      <p class="font-title text-lg m-color-dark">${escapeForTemplate(pu.name)}</p>
      <p class="font-body text-sm m-color-secondary">${escapeForTemplate(pu.description)}</p>
    </button>
  `).join("");

  return `
    <div class="page min-h-screen p-8 m-bg-cream" data-page="power-up-collector" data-activity="${activityId}">
      <div class="max-w-4xl mx-auto">
        <h1 class="text-3xl md:text-4xl mb-6 font-title m-color-dark">${escapeForTemplate(collector.heading)}</h1>
        
        <div class="rounded-3xl shadow-xl p-8 m-bg-white">
          <p class="text-lg mb-6 font-body text-center m-color-dark">${escapeForTemplate(collector.instructions)}</p>
          
          <!-- Collection Progress -->
          <div class="flex justify-center items-center gap-4 mb-6">
            <div class="collection-bag flex items-center gap-2 p-4 rounded-2xl m-bg-soft-yellow">
              <span class="text-3xl">🎒</span>
              <span class="font-title text-2xl m-color-dark"><span id="collectedCount">0</span> / ${collector.targetCount}</span>
            </div>
          </div>
          
          <!-- Collected Items Display -->
          <div class="collected-display flex flex-wrap justify-center gap-2 mb-6 min-h-[60px] p-4 rounded-xl m-bg-cream" id="collectedDisplay">
            <p class="font-body text-sm self-center m-color-secondary">Your collected power-ups will appear here!</p>
          </div>
          
          <!-- Power-Up Grid -->
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6" id="powerUpGrid">
            ${powerUpsHtml}
          </div>
          
          <!-- Feedback Area -->
          <div class="powerup-feedback p-4 rounded-xl text-center mb-4 transition-all" id="powerupFeedback" class="m-hidden">
            <p class="font-body text-lg" id="powerupFeedbackText"></p>
          </div>
          
          <!-- Win Message (hidden initially) -->
          <div class="powerup-win p-6 rounded-2xl text-center" id="powerupWin" class="m-feedback-hidden">
            <p class="text-4xl mb-2">🎉</p>
            <p class="font-title text-2xl mb-2 m-color-dark">${escapeForTemplate(collector.winText)}</p>
            <p class="font-body m-color-secondary">${escapeForTemplate(collector.tipText)}</p>
          </div>
          
          <!-- Completion Checkbox -->
          <div class="rounded-xl p-4 flex items-center gap-3 mt-4 m-bg-light-green" id="powerupComplete">
            <input 
              type="checkbox" 
              class="w-8 h-8 rounded cursor-pointer m-accent-primary"
              data-activity="${activityId}"
              onchange="markActivityComplete('${activityId}')"
              
            >
            <label class="font-title text-xl m-color-dark">I collected my power-ups! ⭐</label>
          </div>
        </div>
      </div>
      
      <style>
        .power-up-item:active { transform: scale(0.95); }
        .power-up-item.collected { opacity: 0.5; pointer-events: none; border-color: var(--light-green) !important; }
        .power-up-item.wrong { animation: shake 0.5s; background-color: #fecaca !important; }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
      </style>
    </div>`;
}

function renderEmotionMazePage(maze: EmotionMazeContent, starIndex: number, metadata: ModuleMetadata): string {
  const activityId = `maze_${starIndex}`;
  
  const stepsHtml = maze.pathChoices.map((choice, idx) => `
    <div class="maze-step rounded-2xl p-6 mb-4 transition-all" id="mazeStep${idx}" style="background-color: var(--soft-yellow); display: ${idx === 0 ? 'block' : 'none'};">
      <div class="flex items-center gap-2 mb-3">
        <span class="w-8 h-8 rounded-full flex items-center justify-center font-title text-white m-bg-primary">${choice.step}</span>
        <p class="font-body text-lg m-color-dark">${escapeForTemplate(choice.situation)}</p>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        ${choice.options.map((opt, oi) => `
          <button class="maze-option p-4 rounded-xl border-2 transition-all hover:scale-102 cursor-pointer text-left m-card-bordered"
                  data-correct="${opt.isCorrect}"
                  data-feedback="${escapeForTemplate(opt.feedback)}"
                  data-step="${idx}"
                  onclick="handleMazeChoice(this, ${idx}, ${maze.pathChoices.length}, '${activityId}')">
            <span class="text-2xl mr-2">${opt.emoji}</span>
            <span class="font-body m-color-dark">${escapeForTemplate(opt.text)}</span>
          </button>
        `).join("")}
      </div>
      <div class="maze-step-feedback p-3 rounded-lg mt-3 text-center" id="mazeFeedback${idx}" class="m-hidden"></div>
    </div>
  `).join("");

  return `
    <div class="page min-h-screen p-8 m-bg-cream" data-page="emotion-maze" data-activity="${activityId}">
      <div class="max-w-4xl mx-auto">
        <h1 class="text-3xl md:text-4xl mb-6 font-title m-color-dark">${escapeForTemplate(maze.heading)}</h1>
        
        <div class="rounded-3xl shadow-xl p-8 m-bg-white">
          <p class="text-lg mb-6 font-body text-center m-color-dark">${escapeForTemplate(maze.instructions)}</p>
          
          <!-- Journey Progress -->
          <div class="flex justify-between items-center mb-6 p-4 rounded-xl m-bg-cream">
            <div class="text-center">
              <span class="text-4xl">${maze.startEmotion.emoji}</span>
              <p class="font-body text-sm m-color-dark">${escapeForTemplate(maze.startEmotion.name)}</p>
            </div>
            <div class="flex-1 mx-4 relative">
              <div class="h-3 rounded-full m-bg-soft-yellow">
                <div class="maze-progress h-full rounded-full transition-all duration-500" id="mazeProgress" style="width: 0%; background-color: var(--light-green);"></div>
              </div>
              <div class="maze-marker absolute top-1/2 -translate-y-1/2 text-2xl transition-all duration-500" id="mazeMarker" style="left: 0%;">🚶</div>
            </div>
            <div class="text-center">
              <span class="text-4xl">${maze.goalEmotion.emoji}</span>
              <p class="font-body text-sm m-color-dark">${escapeForTemplate(maze.goalEmotion.name)}</p>
            </div>
          </div>
          
          <!-- Steps -->
          ${stepsHtml}
          
          <!-- Win Message -->
          <div class="maze-win p-6 rounded-2xl text-center" id="mazeWin" class="m-feedback-hidden">
            <p class="text-4xl mb-2">${maze.goalEmotion.emoji}</p>
            <p class="font-title text-2xl mb-2 m-color-dark">${escapeForTemplate(maze.completionMessage)}</p>
          </div>
          
          <!-- Completion Checkbox -->
          <div class="rounded-xl p-4 flex items-center gap-3 mt-4 m-feedback-hidden-green" id="mazeComplete">
            <input 
              type="checkbox" 
              class="w-8 h-8 rounded cursor-pointer m-accent-primary"
              data-activity="${activityId}"
              onchange="markActivityComplete('${activityId}')"
              
            >
            <label class="font-title text-xl m-color-dark">I navigated the maze! ⭐</label>
          </div>
        </div>
      </div>
      
      <style>
        .maze-option:active { transform: scale(0.98); }
        .maze-option.correct { background-color: var(--light-green) !important; border-color: var(--secondary) !important; }
        .maze-option.wrong { background-color: #fecaca !important; border-color: var(--accent) !important; }
        .maze-option.disabled { opacity: 0.5; pointer-events: none; }
      </style>
    </div>`;
}

function renderStrengthShieldPage(shield: StrengthShieldContent, starIndex: number, metadata: ModuleMetadata): string {
  const activityId = `shield_${starIndex}`;
  
  const sectionsHtml = shield.shieldSections.map((section, idx) => `
    <div class="shield-section p-4 rounded-xl transition-all" style="background-color: ${['var(--light-green)', 'var(--soft-yellow)', 'var(--primary)', '#a8d8ea'][idx % 4]};">
      <div class="flex items-center gap-2 mb-2">
        <span class="text-2xl">${section.emoji}</span>
        <h3 class="font-title text-lg m-color-dark">${escapeForTemplate(section.title)}</h3>
      </div>
      <p class="font-body text-sm mb-2 m-color-dark">${escapeForTemplate(section.prompt)}</p>
      <input type="text" class="shield-input w-full p-2 rounded-lg border-2 font-body m-card-bordered"
             placeholder="${escapeForTemplate(section.placeholder)}"
             data-section="${section.id}"
             data-form-key="shield_${starIndex}_${section.id}"
             onchange="handleShieldInput('${activityId}', ${shield.shieldSections.length}); saveFormData('shield_${starIndex}_${section.id}', this.value)">
    </div>
  `).join("");

  const decorationsHtml = shield.decorations.map(d => `
    <button class="text-3xl p-2 hover:scale-125 transition-all cursor-pointer" onclick="addShieldDecoration('${d}', '${activityId}')">${d}</button>
  `).join("");

  return `
    <div class="page min-h-screen p-8 m-bg-cream" data-page="strength-shield" data-activity="${activityId}">
      <div class="max-w-4xl mx-auto">
        <h1 class="text-3xl md:text-4xl mb-6 font-title m-color-dark">${escapeForTemplate(shield.heading)}</h1>
        
        <div class="rounded-3xl shadow-xl p-8 m-bg-white">
          <p class="text-lg mb-6 font-body text-center m-color-dark">${escapeForTemplate(shield.instructions)}</p>
          
          <!-- Shield Visual -->
          <div class="flex justify-center mb-6">
            <div class="shield-container relative w-64 h-72">
              <svg viewBox="0 0 200 220" class="w-full h-full">
                <path d="M100 10 L180 50 L180 130 Q180 200 100 210 Q20 200 20 130 L20 50 Z" 
                      fill="url(#shieldGradient)" stroke="var(--dark)" stroke-width="4"/>
                <defs>
                  <linearGradient id="shieldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:var(--soft-yellow)"/>
                    <stop offset="100%" style="stop-color:var(--light-green)"/>
                  </linearGradient>
                </defs>
              </svg>
              <div class="shield-decorations absolute inset-0 flex items-center justify-center text-3xl flex-wrap gap-1 p-8" id="shieldDecorations" style="pointer-events: none;">
                🛡️
              </div>
            </div>
          </div>
          
          <!-- Decoration Buttons -->
          <div class="flex justify-center gap-2 mb-6 p-3 rounded-lg m-bg-cream">
            <span class="font-body text-sm self-center mr-2 m-color-dark">Add decorations:</span>
            ${decorationsHtml}
          </div>
          
          <!-- Shield Sections -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            ${sectionsHtml}
          </div>
          
          <!-- Progress Indicator -->
          <div class="text-center mb-4">
            <p class="font-body m-color-secondary">Sections filled: <span id="shieldProgress">0</span> / ${shield.shieldSections.length}</p>
          </div>
          
          <!-- Win Message -->
          <div class="shield-win p-6 rounded-2xl text-center" id="shieldWin" class="m-feedback-hidden">
            <p class="text-4xl mb-2">🛡️</p>
            <p class="font-title text-2xl mb-2 m-color-dark">${escapeForTemplate(shield.completionMessage)}</p>
          </div>
          
          <!-- Completion Checkbox -->
          <div class="rounded-xl p-4 flex items-center gap-3 mt-4 m-feedback-hidden-green" id="shieldComplete">
            <input 
              type="checkbox" 
              class="w-8 h-8 rounded cursor-pointer m-accent-primary"
              data-activity="${activityId}"
              onchange="markActivityComplete('${activityId}')"
              
            >
            <label class="font-title text-xl m-color-dark">I built my strength shield! ⭐</label>
          </div>
        </div>
      </div>
    </div>`;
}

function renderFeelingVolcanoPage(volcano: FeelingVolcanoContent, starIndex: number, metadata: ModuleMetadata): string {
  const activityId = `volcano_${starIndex}`;
  
  const actionsHtml = volcano.coolingActions.map(action => `
    <button class="cooling-action flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all hover:scale-105 cursor-grab"
            draggable="true"
            class="m-card-bordered"
            data-cooling="${action.coolingPower}"
            data-power="${action.coolingPower}"
            data-action="${escapeForTemplate(action.action)}">
      <span class="text-3xl">${action.emoji}</span>
      <span class="font-body text-sm text-center m-color-dark">${escapeForTemplate(action.action)}</span>
    </button>
  `).join("");

  const levelsHtml = volcano.levels.map(level => `
    <div class="volcano-level flex items-center gap-2 p-2 rounded-lg transition-all" id="volcanoLevel${level.level}" style="background-color: ${level.color}20;">
      <span class="text-xl">${level.emoji}</span>
      <span class="font-body text-sm m-color-dark">${escapeForTemplate(level.label)}</span>
    </div>
  `).join("");

  return `
    <div class="page min-h-screen p-8 m-bg-cream" data-page="feeling-volcano" data-activity="${activityId}">
      <div class="max-w-4xl mx-auto">
        <h1 class="text-3xl md:text-4xl mb-6 font-title m-color-dark">${escapeForTemplate(volcano.heading)}</h1>
        
        <div class="rounded-3xl shadow-xl p-8 m-bg-white">
          <p class="text-lg mb-4 font-body text-center m-color-dark">${escapeForTemplate(volcano.instructions)}</p>
          
          <!-- Scenario -->
          <div class="p-4 rounded-xl mb-6 m-bg-soft-yellow">
            <p class="font-body text-center m-color-dark"><strong>The situation:</strong> ${escapeForTemplate(volcano.triggerScenario)}</p>
          </div>
          
          <!-- Volcano Visual -->
          <div class="flex justify-center items-end gap-8 mb-6">
            <!-- Level Indicator -->
            <div class="flex flex-col-reverse gap-1">
              ${levelsHtml}
            </div>
            
            <!-- Volcano -->
            <div class="volcano-container relative volcano-drop-zone" data-activity-id="${activityId}">
              <svg viewBox="0 0 200 200" class="w-48 h-48">
                <!-- Volcano body -->
                <path d="M20 200 L60 80 L80 90 L100 60 L120 90 L140 80 L180 200 Z" 
                      fill="#8B4513" stroke="#5D3A1A" stroke-width="3"/>
                <!-- Lava inside -->
                <path d="M65 95 L80 95 L100 70 L120 95 L135 95 L120 130 L80 130 Z" 
                      class="volcano-lava" id="volcanoLava"
                      fill="#ef4444" opacity="0.9"/>
                <!-- Bubbles -->
                <circle class="lava-bubble" cx="90" cy="100" r="5" fill="#fbbf24" opacity="0.8">
                  <animate attributeName="cy" values="100;85;100" dur="1s" repeatCount="indefinite"/>
                </circle>
                <circle class="lava-bubble" cx="110" cy="105" r="4" fill="#fbbf24" opacity="0.8">
                  <animate attributeName="cy" values="105;90;105" dur="1.2s" repeatCount="indefinite"/>
                </circle>
              </svg>
              <div class="volcano-indicator absolute -top-6 left-1/2 -translate-x-1/2 text-4xl transition-all" id="volcanoIndicator">🌋</div>
            </div>
            
            <!-- Temperature Display -->
            <div class="text-center">
              <p class="font-title text-3xl m-color-accent"><span id="volcanoTemp">100</span>°</p>
              <p class="font-body text-sm m-color-dark">Heat Level</p>
            </div>
          </div>
          
          <!-- Cooling Actions -->
          <p class="font-title text-lg text-center mb-3 m-color-dark">Drag your cooling tools into the volcano! 🧊</p>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            ${actionsHtml}
          </div>
          
          <!-- Feedback -->
          <div class="volcano-feedback p-4 rounded-xl text-center mb-4" id="volcanoFeedback" class="m-hidden">
            <p class="font-body text-lg" id="volcanoFeedbackText"></p>
          </div>
          
          <!-- Safe Message -->
          <div class="volcano-safe p-6 rounded-2xl text-center" id="volcanoSafe" class="m-feedback-hidden">
            <p class="text-4xl mb-2">😌</p>
            <p class="font-title text-2xl mb-2 m-color-dark">${escapeForTemplate(volcano.safeMessage)}</p>
          </div>
          
          <!-- Completion Checkbox -->
          <div class="rounded-xl p-4 flex items-center gap-3 mt-4 m-feedback-hidden-green" id="volcanoComplete">
            <input 
              type="checkbox" 
              class="w-8 h-8 rounded cursor-pointer m-accent-primary"
              data-activity="${activityId}"
              onchange="markActivityComplete('${activityId}')"
              
            >
            <label class="font-title text-xl m-color-dark">I cooled the volcano! ⭐</label>
          </div>
        </div>
      </div>
      
      <style>
        .cooling-action:active { transform: scale(0.95); }
        .cooling-action.cooldown { opacity: 0.5; pointer-events: none; }
        .volcano-level.active { transform: scale(1.1); font-weight: bold; }
      </style>
    </div>`;
}

// ====================
// MAIN GENERATOR
// ====================

async function generateModule(
  supabaseClient: any,
  contentBrief: string,
  jobId?: string,
  seriesInfo?: SeriesInfo | null,
  categoryColor?: string | null,
  forcedTitle?: string | null
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
  const content = await generateAllContent(settings.claude_api_key, contentBrief, pageStructure, updateProgress, seriesInfo, settings.ai_prompt_template);
  
  // Generate module code
  const moduleCode = `MOD_${Date.now().toString(36).toUpperCase()}`;
  
  await updateProgress("rendering", "Building interactive HTML...");
  const html = renderHtml(content, pageStructure, moduleCode, categoryColor, seriesInfo);
  
  const pageCount = pageStructure.length;
  const characterCount = html.length;
  
  await updateProgress("complete", `Module generation complete! (${pageCount} pages)`);
  
  const spec = {
    version: "3.0",
    moduleCode,
    pageCount,
    starCount: pageStructure.filter(p => p.starReward).length,
    metadata: content.metadata,
    moduleSummary: content.moduleSummary,
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
  seriesInfo?: SeriesInfo | null,
  categoryColor?: string | null,
  forcedTitle?: string | null
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
    
    const generationPromise = generateModule(supabaseClient, contentBrief, jobId, seriesInfo, categoryColor, forcedTitle);
    const result = await Promise.race([generationPromise, timeoutPromise]) as any;
    
    await supabaseClient
      .from("ai_generation_jobs")
      .update({
        status: "completed",
        result,
        updated_at: new Date().toISOString(),
      })
      .eq("id", jobId);
    
    // Save module_summary to the modules table if available
    if (result?.spec?.moduleSummary?.summary) {
      try {
        // Find the module associated with this job and update its module_summary
        const { data: jobData } = await supabaseClient
          .from("ai_generation_jobs")
          .select("result")
          .eq("id", jobId)
          .single();
        
        // The module_summary is stored in the job result for the admin to use
        // It will be written to the modules table when the module is saved
        console.log("[AI] Module summary generated for continuity:", result.spec.moduleSummary.summary.substring(0, 100) + "...");
      } catch (e) {
        console.warn("[AI] Could not save module summary:", e);
      }
    }
    

    
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
  
  // GET /status/:id - Check job status (EXISTING - keep as is)
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
  
  // NEW: GET /age-ranges - List all active age ranges for dropdown
  if (req.method === "GET" && req.url.includes("/age-ranges")) {
    try {
      const { data, error } = await supabaseClient
        .from("age_ranges")
        .select("id, age_range, display_name, age_min, age_max")
        .eq("is_active", true)
        .order("age_min", { ascending: true });
      
      if (error) {
        console.error("[API] Age ranges error:", error);
        return jsonResponse({ error: "Failed to fetch age ranges" }, 500);
      }
      
      return jsonResponse({ ageRanges: data || [] });
    } catch (e) {
      console.error("[API] Error fetching age ranges:", e);
      return jsonResponse({ error: "Internal server error" }, 500);
    }
  }
  
  // NEW: GET /core-theories - List all active theories for dropdown
  if (req.method === "GET" && req.url.includes("/core-theories")) {
    try {
      const { data, error } = await supabaseClient
        .from("core_theories")
        .select("id, theory_name, theory_code, description, category")
        .eq("is_active", true)
        .order("category", { ascending: true })
        .order("theory_name", { ascending: true });
      
      if (error) {
        console.error("[API] Core theories error:", error);
        return jsonResponse({ error: "Failed to fetch core theories" }, 500);
      }
      
      return jsonResponse({ coreTheories: data || [] });
    } catch (e) {
      console.error("[API] Error fetching core theories:", e);
      return jsonResponse({ error: "Internal server error" }, 500);
    }
  }
  
  if (req.method !== "POST") {
    return jsonResponse({ error: "Use POST" }, 405);
  }
  
  try {
    const body = await req.json().catch(() => ({}));
    const asyncMode = body?.async === true;
    const seriesId = body?.seriesId;
    const category = body?.category;
    const superSkillId = body?.superSkillId;
    let forcedTitle: string | null = null;
    
    // =====================
    // SUPER SKILL LOOKUP (needed by both enhanced and legacy modes, AND by content brief)
    // Must run BEFORE buildEnhancedContentBrief so name/description are available
    // =====================
    let themeColor: string | null = null;
    let seriesInfo: SeriesInfo | null = null;
    let superSkillName: string | undefined;
    let superSkillDescription: string | undefined;
    let superSkillDomain: string | undefined;
    let superSkillPersonality: string | undefined;
    let superSkillNdAffirmation: string | undefined;
    let superSkillRelevantTheories: string | undefined;
    if (superSkillId) {
      const { data: superSkillData, error: superSkillError } = await supabaseClient
        .from("super_skills")
        .select("name, description, domain, personality, nd_affirmation, relevant_theories, emoji, theme_color, character_name, character_image_url")
        .eq("id", superSkillId)
        .single();
      
      if (!superSkillError && superSkillData) {
        themeColor = superSkillData.theme_color;
        superSkillName = superSkillData.name;
        superSkillDescription = superSkillData.description;
        superSkillDomain = superSkillData.domain || superSkillData.description;
        superSkillPersonality = superSkillData.personality;
        superSkillNdAffirmation = superSkillData.nd_affirmation;
        superSkillRelevantTheories = superSkillData.relevant_theories;
        
        if (superSkillData.character_name) {
          let cleanName = superSkillData.character_name;
          if (cleanName.includes(' the ')) {
            cleanName = cleanName.split(' the ')[0];
          }
          
          // Use the emoji field from the database directly
          const superSkillEmoji = superSkillData.emoji || '';
          
          seriesInfo = {
            label: cleanName,
            character_type: cleanName.toLowerCase().replace(/\s+/g, '_'),
            emoji: superSkillEmoji,
            character_image_url: superSkillData.character_image_url || null,
          };
          
          // Only fall back to extraction/guessing if the DB emoji field is empty
          if (!seriesInfo.emoji && superSkillData.character_image_url) {
            const urlParts = superSkillData.character_image_url.split('/');
            const fileName = urlParts[urlParts.length - 1];
            const emojiMatch = fileName.match(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]/u);
            if (emojiMatch) {
              seriesInfo.emoji = emojiMatch[0];
            }
          }
          
          if (seriesInfo && !seriesInfo.emoji) {
            const characterTypeToEmoji: Record<string, string> = {
              'bear': '🐻', 'dog': '🐕', 'cat': '🐱', 'rabbit': '🐰',
              'fox': '🦊', 'owl': '🦉', 'penguin': '🐧', 'lion': '🦁',
              'elephant': '🐘', 'monkey': '🐵', 'panda': '🐼', 'professor': '🎓',
              'turtle': '🐢',
            };
            
            const characterLower = cleanName.toLowerCase();
            for (const [type, emoji] of Object.entries(characterTypeToEmoji)) {
              if (characterLower.includes(type)) {
                seriesInfo.emoji = emoji;
                break;
              }
            }
            
            if (!seriesInfo.emoji) {
              seriesInfo.emoji = '🌟';
            }
          }
        }
      }
    }
    
    // NEW: Check if this is enhanced mode or legacy mode
    const enhancedAgeRef = firstPresent(body?.adminAge, body?.ageRangeId, body?.age_range_id);
    const enhancedTheoryRef = firstPresent(body?.briefTheory, body?.coreTheoryId, body?.primary_theory_id);
    const isEnhancedMode = Boolean(enhancedAgeRef && enhancedTheoryRef);
    
    let contentBrief: string;
    
    if (isEnhancedMode) {
      // =====================
      // ENHANCED MODE (NEW)
      // =====================
      // Accept both camelCase and snake_case field names
      const ageRangeRef = firstPresent(body.adminAge, body.ageRangeId, body.age_range_id);
      const coreTheoryRef = firstPresent(body.briefTheory, body.coreTheoryId, body.primary_theory_id);
      const { 
        additionalContext,
      } = body;
      const title = firstNonEmptyString(body.adminTitle, body.title, body.module_title);
      forcedTitle = title?.trim() || null;
      
      // Accept multiple possible field names for brain town analogy
      const brainTownAnalogy = firstNonEmptyString(
        body.brainTownAnalogy,
        body.brain_town_analogy,
        body.brainTownMetaphor,
        body.brain_town_metaphor
      );

      const superSkillBrief = firstNonEmptyString(body.briefSuperSkill, body.superSkillName);
      const subSkillBrief = firstNonEmptyString(body.briefSubSkill, body.subSkillName);
      
      if (!brainTownAnalogy) {
        return jsonResponse({ 
          error: "Enhanced mode requires: ageRangeId, coreTheoryId, brainTownAnalogy (or brain_town_analogy / brain_town_metaphor)" 
        }, 400);
      }
      
      // Accept snake_case variants for all fields
      const secondaryTheoryIds = body.secondaryTheoryIds || body.secondary_theory_ids || [];
      const neuroscienceConcept = firstNonEmptyString(body.neuroscienceConcept, body.neuroscience_concept);
      const diagnosisPathways = body.diagnosisPathways || body.diagnosis_pathways || [];
      const fasdStrategies = firstNonEmptyString(body.fasdStrategies, body.fasd_strategies);
      const ndisDomainIds = body.ndisDomainIds || body.ndis_domain_ids || [];
      const dssSediIds = body.dssSediIds || body.dss_sedi_ids || [];
      const moduleObjective = firstNonEmptyString(body.moduleObjective, body.module_objective);
      const facilitatorTip = firstNonEmptyString(body.facilitatorTip, body.facilitator_tip);
      const reflectionPrompt = firstNonEmptyString(body.reflectionPrompt, body.reflection_prompt);
      const rewardText = firstNonEmptyString(body.rewardText, body.reward_text);
      const cycleId = firstNonEmptyString(body.cycleId, body.cycle_id);
      const previousModuleSummaryFromRequest = firstNonEmptyString(body.previousModuleSummary, body.previous_module_summary);
      const weekNumber = firstPresent(body.weekNumber, body.week_number, body.cycleWeek, body.cycle_week);
      const parsedWeekNumber = Number(weekNumber);
      const hasValidWeekNumber = Number.isFinite(parsedWeekNumber) && parsedWeekNumber > 0;
      let previousModuleSummary = previousModuleSummaryFromRequest;

      if (!previousModuleSummary && hasValidWeekNumber && parsedWeekNumber > 1) {
        const previousWeekNumber = parsedWeekNumber - 1;
        let previousModuleQuery = supabaseClient
          .from("modules")
          .select("module_summary, title, week_number")
          .eq("week_number", previousWeekNumber)
          .eq("is_active", true)
          .not("module_summary", "is", null)
          .order("updated_at", { ascending: false })
          .limit(1);

        if (cycleId) {
          previousModuleQuery = previousModuleQuery.eq("cycle_id", cycleId);
        }

        if (superSkillId) {
          previousModuleQuery = previousModuleQuery.eq("super_skill_id", superSkillId);
        }

        const { data: previousModuleData, error: previousModuleError } = await previousModuleQuery.maybeSingle();

        if (previousModuleError) {
          console.warn("[AI] Could not fetch previous module summary:", previousModuleError.message);
        } else if (previousModuleData?.module_summary?.trim()) {
          previousModuleSummary = previousModuleData.module_summary.trim();
          console.log(`[AI] Using previous module summary from Week ${previousModuleData.week_number} (${previousModuleData.title || "Untitled"})`);
        }
      }
      
      // Fetch secondary theory names if provided
      let secondaryTheories: string[] = [];
      if (secondaryTheoryIds && Array.isArray(secondaryTheoryIds) && secondaryTheoryIds.length > 0) {
        const { data: secondaryData } = await supabaseClient
          .from("core_theories")
          .select("theory_name")
          .in("id", secondaryTheoryIds);
        secondaryTheories = secondaryData?.map(t => t.theory_name) || [];
      }
      
      // Fetch NDIS domain names if provided (now supports arrays)
      let ndisDomains: string[] = [];
      if (ndisDomainIds && Array.isArray(ndisDomainIds) && ndisDomainIds.length > 0) {
        const { data: ndisData } = await supabaseClient
          .from("ndis_domains")
          .select("domain_name")
          .in("id", ndisDomainIds);
        ndisDomains = ndisData?.map(d => d.domain_name) || [];
      }
      const ndisDomain = ndisDomains.length > 0 ? ndisDomains.join(', ') : undefined;
      
      // Fetch SEDI names if provided (now supports arrays)
      let dssSediList: string[] = [];
      if (dssSediIds && Array.isArray(dssSediIds) && dssSediIds.length > 0) {
        const { data: sediData } = await supabaseClient
          .from("dss_sedi_categories")
          .select("sedi_code, sedi_name")
          .in("id", dssSediIds);
        dssSediList = sediData?.map(s => `${s.sedi_code}: ${s.sedi_name}`) || [];
      }
      const dssSedi = dssSediList.length > 0 ? dssSediList.join(', ') : undefined;
      
      // Fetch audit rules from database to include in AI prompt
      let auditRulesPrompt = "";
      try {
        const { data: auditSections } = await supabaseClient
          .from("audit_sections")
          .select("section_number, section_name, severity, ai_instruction")
          .eq("is_active", true)
          .order("section_number");
        
        if (auditSections && auditSections.length > 0) {
          auditRulesPrompt = `

═══════════════════════════════════════════════════════════════
⚠️  MANDATORY AUDIT COMPLIANCE RULES - READ CAREFULLY  ⚠️
═══════════════════════════════════════════════════════════════

Your generated content will be AUTOMATICALLY VALIDATED against these rules.
Failure to comply will result in the module being REJECTED.
Follow EVERY rule precisely. There are no exceptions.

`;
          auditSections.forEach((sec: { section_number: number; section_name: string; severity: string; ai_instruction: string }) => {
            if (sec.ai_instruction) {
              const sevLabel = sec.severity === 'CRITICAL' ? '🚨 CRITICAL (MUST PASS)' : sec.severity === 'IMPORTANT' ? '⚠️ IMPORTANT' : 'ℹ️ ADVISORY';
              auditRulesPrompt += `${sevLabel} — ${sec.section_number}. ${sec.section_name}:\n${sec.ai_instruction}\n\n`;
            }
          });
          auditRulesPrompt += `═══════════════════════════════════════════════════════════════
REMINDER: All CRITICAL rules must pass or the module will be rejected.
═══════════════════════════════════════════════════════════════\n`;
          console.log("[AI] Loaded", auditSections.length, "audit sections for prompt");
        }
      } catch (auditErr) {
        console.warn("[AI] Could not load audit rules:", auditErr);
      }
      
      // Fetch age range data - only fetch simplified fields sent to AI
      console.log("[DEBUG] ageRangeRef value:", ageRangeRef, "type:", typeof ageRangeRef);
      console.log("[DEBUG] body.adminAge:", body.adminAge, "body.ageRangeId:", body.ageRangeId, "body.age_range_id:", body.age_range_id);
      
      let ageQuery = supabaseClient
        .from("age_ranges")
        .select("id, age_range, display_name, language_guidelines, developmental_stage")
        .eq("is_active", true);

      if (typeof ageRangeRef === "string" && /^[0-9a-fA-F-]{32,36}$/.test(ageRangeRef)) {
        console.log("[DEBUG] Using UUID lookup for age range");
        ageQuery = ageQuery.eq("id", ageRangeRef);
      } else {
        console.log("[DEBUG] Using name lookup for age range:", ageRangeRef);
        ageQuery = ageQuery.or(`age_range.eq.${ageRangeRef},display_name.eq.${ageRangeRef}`);
      }

      const { data: ageData, error: ageError } = await ageQuery.single();
      
      if (ageError || !ageData) {
        console.error("[API] Age range lookup failed:", ageError, "ageRangeRef was:", ageRangeRef);
        return jsonResponse({ error: "Invalid or inactive age range" }, 400);
      }
      
      // Fetch core theory data - only fetch simplified fields sent to AI
      let theoryQuery = supabaseClient
        .from("core_theories")
        .select("id, theory_name, description, primary_researchers")
        .eq("is_active", true);

      if (typeof coreTheoryRef === "string" && /^[0-9a-fA-F-]{32,36}$/.test(coreTheoryRef)) {
        theoryQuery = theoryQuery.eq("id", coreTheoryRef);
      } else {
        theoryQuery = theoryQuery.eq("theory_name", coreTheoryRef);
      }

      const { data: theoryData, error: theoryError } = await theoryQuery.single();
      
      if (theoryError || !theoryData) {
        console.error("[API] Core theory lookup failed:", theoryError);
        return jsonResponse({ error: "Invalid or inactive core theory" }, 400);
      }
      
      // Fetch sub skill name and description if provided
      const subSkillId = body.subSkillId || body.sub_skill_id || '';
      let subSkillName: string | undefined;
      let subSkillDescription: string | undefined;
      if (subSkillId) {
        const { data: subData } = await supabaseClient
          .from("sub_skills")
          .select("name, description")
          .eq("id", subSkillId)
          .single();
        subSkillName = subData?.name;
        subSkillDescription = subData?.description;
      }
      
      // superSkillName and superSkillDescription were already fetched above
      // (in the super_skills lookup that runs before the enhanced/legacy mode check)

      const lookupContext = body.lookupContext || body.lookup_context || {};
      const lookupSuperSkill = lookupContext?.superSkill || {};
      const lookupSubSkill = lookupContext?.subSkill || {};
      const lookupCycle = lookupContext?.cycle || {};
      const lookupTheoryConnection = lookupContext?.theoryConnection || {};
      const lookupCoreTheory = lookupContext?.coreTheory || {};
      const lookupSecondaryTheories = Array.isArray(lookupContext?.secondaryTheories) ? lookupContext.secondaryTheories : [];
      const lookupNdisDomains = Array.isArray(lookupContext?.ndisDomains) ? lookupContext.ndisDomains : [];
      const lookupSediCategories = Array.isArray(lookupContext?.dssSediCategories) ? lookupContext.dssSediCategories : [];

      const referenceContextLines = [
        '=== SELECTED REFERENCE DATA (AUTHORITATIVE CONTEXT) ===',
        `Super Skill Domain: ${superSkillDomain || lookupSuperSkill.domain || 'Not provided'}`,
        `Character Personality: ${superSkillPersonality || lookupSuperSkill.personality || 'Not provided'}`,
        `ND-Affirmation Guidance: ${superSkillNdAffirmation || lookupSuperSkill.ndAffirmation || 'Not provided'}`,
        `Relevant Theories for Super Skill: ${superSkillRelevantTheories || lookupSuperSkill.relevantTheories || 'Not provided'}`,
        `Sub-Skill Description: ${subSkillDescription || lookupSubSkill.description || 'Not provided'}`,
        `Cycle Context: ${lookupCycle?.cycleNumber ? `Cycle ${lookupCycle.cycleNumber}: ${lookupCycle.name || ''}`.trim() : (cycleId || 'Not provided')}`,
        `Cycle Focus: ${lookupCycle.focus || lookupCycle.objective || lookupCycle.evidenceFocus || 'Not provided'}`,
        `Theory Description: ${theoryData.description || lookupCoreTheory.description || 'Not provided'}`,
        `Primary Researchers/Citation: ${theoryData.primary_researchers || lookupCoreTheory.primaryResearchers || lookupTheoryConnection.citation || 'Not provided'}`,
        `Age Language Guidelines: ${ageData.language_guidelines || lookupContext?.ageBand?.languageGuidelines || 'Not provided'}`,
        `Age Developmental Stage: ${ageData.developmental_stage || lookupContext?.ageBand?.developmentalStage || 'Not provided'}`,
        `Theory Connection Brain Town Application: ${lookupTheoryConnection.brainTownApplication || 'Not provided'}`,
        lookupSecondaryTheories.length > 0
          ? `Secondary Theory Descriptions: ${lookupSecondaryTheories.map((t: any) => `${t?.name || 'Unknown'}${t?.description ? ` — ${t.description}` : ''}`).join(' | ')}`
          : 'Secondary Theory Descriptions: Not provided',
        `Neuroscience concept detail: ${neuroscienceConcept || lookupContext?.neuroscienceConcept || 'Not provided'}`,
        diagnosisPathways?.length ? `Diagnosis pathways selected: ${diagnosisPathways.join(', ')}` : 'Diagnosis pathways selected: None',
        `NDIS context: ${ndisDomain || (lookupNdisDomains.length > 0 ? lookupNdisDomains.map((d: any) => d.name).join(', ') : 'Not provided')}`,
        `DSS SEDI context: ${dssSedi || (lookupSediCategories.length > 0 ? lookupSediCategories.map((s: any) => `${s.code}: ${s.name}`).join(', ') : 'Not provided')}`,
      ];
      
      // Build the enhanced content brief
      contentBrief = buildEnhancedContentBrief({
        title: title || "My Feelings Adventure",
        ageRange: ageData.age_range,
        ageData,
        theoryData,
        brainTownAnalogy,
        additionalContext: [
          superSkillBrief ? `Super Skill Focus: ${superSkillBrief}` : "",
          subSkillBrief ? `Sub Skill Focus: ${subSkillBrief}` : "",
          referenceContextLines.join("\n"),
          additionalContext || ""
        ].filter(Boolean).join("\n\n"),
        secondaryTheories,
        neuroscienceConcept,
        diagnosisPathways,
        fasdStrategies,
        ndisDomain,
        dssSedi,
        moduleObjective,
        facilitatorTip,
        reflectionPrompt,
        rewardText,
        previousModuleSummary,
        weekNumber,
        superSkillName,
        superSkillDescription,
        subSkillName,
        subSkillDescription,
      });
      
      // Append audit rules to content brief if loaded
      if (auditRulesPrompt) {
        contentBrief += auditRulesPrompt;
      }
      
      console.log("[AI] Using enhanced psychology-based content brief");
      
    } else {
      // =====================
      // LEGACY MODE (existing behavior)
      // =====================
      contentBrief = body?.contentBrief;
      
      if (!contentBrief) {
        return jsonResponse({ 
          error: "contentBrief is required (or use enhanced mode with ageRangeId + coreTheoryId + brainTownAnalogy)" 
        }, 400);
      }

      forcedTitle = (body?.title || body?.module_title || '').trim() || extractTitleFromContentBrief(contentBrief);
    }
    
    // =====================
    // REST OF EXISTING CODE (keep everything below as-is)
    // =====================
    // NOTE: super_skills lookup (themeColor, seriesInfo, superSkillName, superSkillDescription) 
    // has been moved ABOVE the enhanced/legacy mode block so it's available to buildEnhancedContentBrief
    
    // Fallback to category color
    let categoryColor: string | null = themeColor;
    if (!categoryColor && category) {
      const { data: categoryData, error: categoryError } = await supabaseClient
        .from("category_colors")
        .select("color")
        .eq("category", category)
        .single();
      
      if (!categoryError && categoryData?.color) {
        categoryColor = categoryData.color;
      }
    }
    
    // Fetch series info if seriesId provided
    if (seriesId && !seriesInfo) {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(seriesId);
      
      let series = null;
      let seriesError = null;
      
      if (isUUID) {
        const result = await supabaseClient
          .from("series")
          .select("label, character_type, emoji")
          .eq("id", seriesId)
          .single();
        series = result.data;
        seriesError = result.error;
      } else {
        const result = await supabaseClient
          .from("series")
          .select("label, character_type, emoji")
          .ilike("label", seriesId)
          .single();
        series = result.data;
        seriesError = result.error;
        
        if (seriesError && seriesError.code === 'PGRST116') {
          const partialResult = await supabaseClient
            .from("series")
            .select("label, character_type, emoji")
            .ilike("label", `%${seriesId}%`)
            .limit(1)
            .single();
          series = partialResult.data;
          seriesError = partialResult.error;
        }
      }
      
      if (!seriesError && series) {
        const characterTypeToEmoji: Record<string, string> = {
          'dog': '🐕', 'Dog': '🐕', 'cat': '🐱', 'Cat': '🐱',
          'rabbit': '🐰', 'Rabbit': '🐰', 'bear': '🐻', 'Bear': '🐻',
          'fox': '🦊', 'Fox': '🦊', 'owl': '🦉', 'Owl': '🦉',
          'penguin': '🐧', 'Penguin': '🐧', 'lion': '🦁', 'Lion': '🦁',
          'elephant': '🐘', 'Elephant': '🐘', 'monkey': '🐵', 'Monkey': '🐵',
        };
        
        const emoji = series.emoji || characterTypeToEmoji[series.character_type] || '🐾';
        
        seriesInfo = {
          label: series.label,
          character_type: series.character_type,
          emoji: emoji
        };
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
        anyGlobal.EdgeRuntime.waitUntil(runAsyncGeneration(supabaseClient, jobId, contentBrief, seriesInfo, categoryColor, forcedTitle));
      } else {
        runAsyncGeneration(supabaseClient, jobId, contentBrief, seriesInfo, categoryColor, forcedTitle).catch(console.error);
      }
      
      return jsonResponse({ jobId });
    }
    
    // Sync mode
    const result = await generateModule(supabaseClient, contentBrief, undefined, seriesInfo, categoryColor, forcedTitle);
    return jsonResponse({
      html: result.html,
      pageCount: result.pageCount,
      characterCount: result.characterCount,
      spec: result.spec,
      moduleSummary: result.spec.moduleSummary?.summary || null,
    });
    
  } catch (e) {
    console.error("[AI] Error:", e);
    const error = e instanceof Error ? e : new Error(String(e));
    return jsonResponse({ error: error.message }, 500);
  }
});