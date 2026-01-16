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
  
  // Configuration
  corsHeaders,
  JOB_TIMEOUT_MS,
  
  // Utilities
  jsonResponse,
  escapeHtml,
  escapeForTemplate,
  
  // Claude API
  getSettings,
  
  // Page Structure & Content Generation
  generatePageStructure,
  generateAllContent,
} from "./generators.ts";

// ====================
// CATEGORY COLOR PALETTES
// ====================

type CategoryPalette = {
  primary: string;
  secondary: string;
  accent: string;
  cream: string;
  softYellow: string;
};

// Default palette (warm orange - used when no category specified)
const DEFAULT_PALETTE: CategoryPalette = {
  primary: '#F4A261',    // Warm orange
  secondary: '#2A9D8F',  // Teal
  accent: '#E76F51',     // Coral
  cream: '#FFF8F0',      // Warm cream
  softYellow: '#FFE8A3', // Soft yellow
};

// Generate a palette from a base color (the category's color from DB)
function generatePaletteFromColor(baseColor: string | null | undefined): CategoryPalette {
  if (!baseColor) return DEFAULT_PALETTE;
  
  // Normalize hex color
  let hex = baseColor.trim();
  if (!hex.startsWith('#')) hex = '#' + hex;
  if (!/^#[0-9A-Fa-f]{6}$/.test(hex)) return DEFAULT_PALETTE;
  
  // Parse RGB
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  
  // Convert to HSL
  const rNorm = r / 255, gNorm = g / 255, bNorm = b / 255;
  const max = Math.max(rNorm, gNorm, bNorm), min = Math.min(rNorm, gNorm, bNorm);
  let h = 0, s = 0, l = (max + min) / 2;
  
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rNorm: h = ((gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0)) / 6; break;
      case gNorm: h = ((bNorm - rNorm) / d + 2) / 6; break;
      case bNorm: h = ((rNorm - gNorm) / d + 4) / 6; break;
    }
  }
  
  // Helper to convert HSL back to hex
  const hslToHex = (h: number, s: number, l: number): string => {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    
    let rOut, gOut, bOut;
    if (s === 0) {
      rOut = gOut = bOut = l;
    } else {
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      rOut = hue2rgb(p, q, h + 1/3);
      gOut = hue2rgb(p, q, h);
      bOut = hue2rgb(p, q, h - 1/3);
    }
    
    const toHex = (x: number) => Math.round(x * 255).toString(16).padStart(2, '0');
    return '#' + toHex(rOut) + toHex(gOut) + toHex(bOut);
  };
  
  // Generate palette colors based on the base color
  // Primary: The base color itself (slightly adjusted for better visibility)
  const primary = hslToHex(h, Math.min(s * 0.9, 0.7), Math.max(l, 0.45));
  
  // Secondary: Complementary or triadic color
  const secondaryHue = (h + 0.5) % 1; // Complementary
  const secondary = hslToHex(secondaryHue, Math.min(s * 0.8, 0.6), 0.45);
  
  // Accent: Analogous color (30 degrees away)
  const accentHue = (h + 0.083) % 1; 
  const accent = hslToHex(accentHue, Math.min(s * 0.85, 0.65), Math.max(l - 0.1, 0.4));
  
  // Cream: Very light tint of the primary
  const cream = hslToHex(h, Math.min(s * 0.3, 0.2), 0.97);
  
  // Soft yellow: Light warm accent
  const softYellow = hslToHex((h + 0.15) % 1, 0.5, 0.9);
  
  return { primary, secondary, accent, cream, softYellow };
}

// ====================
// HTML RENDERER

function renderHtml(content: GeneratedContent, pageStructure: PageTemplate[], moduleCode: string, categoryColor?: string | null): string {
  const { metadata } = content;
  const palette = generatePaletteFromColor(categoryColor);
  
  // Debug: Log what palette was generated
  console.log(`[renderHtml] categoryColor input: ${categoryColor}`);
  console.log(`[renderHtml] Generated palette:`, JSON.stringify(palette));
  
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
<body class="module-theme" data-series="${escapeHtml(metadata.series || "custom")}">
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
        console.log('[ModuleHeader] Module completion already handled, skipping...');
        return;
      }
      moduleCompletionHandled = true;

      console.log('[ModuleHeader] Handling module completion...');

      // Get module parameters from URL
      try {
        const params = new URLSearchParams(window.location.search);
        const childId = params.get('childId');
        const moduleId = params.get('moduleId');
        
        console.log(\`[ModuleHeader] URL params - childId: \$\{childId}, moduleId: \$\{moduleId}\`);
        
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
        
        console.log('[ModuleHeader] Module completed successfully');
        
        // Navigate back to dashboard
        goHome();
      } catch (error) {
        console.error('[ModuleHeader] Error completing module:', error);
      }
    }

    function showCompletionCelebration() {
      console.log('[showCompletionCelebration] Starting...');
      try {
        // Create celebration modal
        const celebrationModal = document.createElement('div');
        celebrationModal.className = 'module-completion-modal';
        celebrationModal.innerHTML = '<div class="module-completion-content"><div class="completion-emoji">🎉</div><h2 class="completion-title">Module Complete!</h2><p class="completion-message">Congratulations! You have finished this module and learned valuable emotional skills.</p><div class="completion-confetti" id="completionConfetti"></div><button class="completion-btn" onclick="closeCompletionModal()">Continue Journey</button></div>';
        
        document.body.appendChild(celebrationModal);
        console.log('[showCompletionCelebration] Modal appended');
        
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
            ? '<span class="font-body" style="color: var(--dark);">✓ Great choice! That is right!</span>'
            : '<span class="font-body" style="color: var(--dark);">✗ Not quite - try again or tap another option!</span>';
        }
        
        // Only show followup and mascot feedback on correct answer
        if (isCorrect) {
          if (ffEl) ffEl.style.display = 'block';
          if (mfEl) mfEl.style.display = 'flex';
        }
      } else {
        // Opinion-based - all answers valid
        btn.classList.add('option-selected');
        if (ffEl) ffEl.style.display = 'block';
        if (mfEl) mfEl.style.display = 'flex';
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
      
      // Check if all blanks are filled
      const allBlanks = page.querySelectorAll('input[data-blank-index]');
      const allFilled = Array.from(allBlanks).every(b => b.value.trim().length > 0);
      
      if (allFilled) {
        const ffEl = page.querySelector('.followup-feedback');
        const mfEl = page.querySelector('.mascot-feedback');
        if (ffEl) ffEl.style.display = 'block';
        if (mfEl) mfEl.style.display = 'flex';
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
    
    // v5 CHALLENGE HANDLERS
    let weatherCalmLevel = 0;
    let weatherCooldown = false;
    window.handleWeatherAction = function(btn, activityId, points) {
      if (weatherCooldown || completedActivities[activityId]) return;
      weatherCooldown = true;
      btn.classList.add('cooldown');
      setTimeout(() => { weatherCooldown = false; btn.classList.remove('cooldown'); }, 800);
      weatherCalmLevel = Math.min(100, weatherCalmLevel + points);
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
      if (weatherCalmLevel >= 100) { document.getElementById('weatherWin').style.display = 'block'; document.getElementById('weatherComplete').style.display = 'flex'; }
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
        if (collectedPowerUps.length >= targetCount) { document.getElementById('powerupWin').style.display = 'block'; document.getElementById('powerupComplete').style.display = 'flex'; }
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
      btn.parentElement.querySelectorAll('.maze-option').forEach(b => b.classList.add('disabled'));
      btn.classList.add(isCorrect ? 'correct' : 'wrong');
      if (feedbackEl) { feedbackEl.style.display = 'block'; feedbackEl.style.backgroundColor = isCorrect ? 'var(--light-green)' : '#fecaca'; feedbackEl.innerHTML = '<p class="font-body">' + feedback + '</p>'; }
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
    
    window.addShieldDecoration = function(emoji) {
      const display = document.getElementById('shieldDecorations');
      if (display) {
        // Create a span for each decoration to allow proper wrapping and display
        const span = document.createElement('span');
        span.textContent = emoji;
        span.style.display = 'inline-block';
        span.style.margin = '2px';
        display.appendChild(span);
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
          <p class="text-lg font-body" style="color: var(--secondary);">⭐Earn stars by completing activities! ⭐</p>
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
  const breathingId = `breathingExercise_${starIndex}`;
  return `
    <div class="page min-h-screen p-8" style="background-color: var(--cream);" data-page="breathing">
      <div class="max-w-4xl mx-auto">
        <h1 class="text-3xl md:text-4xl mb-6 font-title" style="color: var(--dark);">${escapeForTemplate(breathing.heading)}</h1>
        
        <div class="rounded-3xl shadow-xl p-8" style="background-color: white;">
          <p class="text-lg mb-6 font-body text-center" style="color: var(--dark);">${escapeForTemplate(breathing.instructions)}</p>
          
          <!-- Animated Breathing Circle -->
          <div class="text-center mb-6">
            <div id="${breathingId}" class="breathing-circle mx-auto rounded-full flex items-center justify-center cursor-pointer"
                 style="width: 160px; height: 160px; background: linear-gradient(135deg, var(--light-green), var(--secondary)); transition: transform 4s ease-in-out, box-shadow 4s ease-in-out;"
                 onclick="toggleBreathing('${breathingId}')">
              <div class="text-center">
                <div class="breathing-emoji text-5xl mb-1">🌬️</div>
                <div class="breathing-text font-title text-lg" style="color: var(--dark);">Tap to Start</div>
              </div>
            </div>
            <div class="mt-3 font-body text-sm" style="color: var(--dark); opacity: 0.7;">Tap the circle to begin</div>
          </div>
          
          <!-- Phase Cards -->
          <div class="grid md:grid-cols-3 gap-4 mb-6">
            <div id="${breathingId}_inhale" class="breathing-phase rounded-2xl p-5 text-center transition-all duration-300" style="background-color: var(--light-green); opacity: 0.5; transform: scale(0.95);">
              <div class="text-3xl mb-2">😤</div>
              <h3 class="font-title text-lg mb-1" style="color: var(--dark);">Breathe In</h3>
              <p class="font-body text-sm" style="color: var(--dark);">${escapeForTemplate(breathing.inhaleText)}</p>
              <div class="breathing-timer font-title text-2xl mt-2" style="color: var(--primary); display: none;">4</div>
            </div>
            <div id="${breathingId}_hold" class="breathing-phase rounded-2xl p-5 text-center transition-all duration-300" style="background-color: var(--soft-yellow); opacity: 0.5; transform: scale(0.95);">
              <div class="text-3xl mb-2">😊</div>
              <h3 class="font-title text-lg mb-1" style="color: var(--dark);">Hold</h3>
              <p class="font-body text-sm" style="color: var(--dark);">${escapeForTemplate(breathing.holdText)}</p>
              <div class="breathing-timer font-title text-2xl mt-2" style="color: var(--primary); display: none;">4</div>
            </div>
            <div id="${breathingId}_exhale" class="breathing-phase rounded-2xl p-5 text-center transition-all duration-300" style="background-color: var(--primary); opacity: 0.5; transform: scale(0.95);">
              <div class="text-3xl mb-2">😌</div>
              <h3 class="font-title text-lg mb-1" style="color: white;">Breathe Out</h3>
              <p class="font-body text-sm" style="color: white;">${escapeForTemplate(breathing.exhaleText)}</p>
              <div class="breathing-timer font-title text-2xl mt-2" style="color: white; display: none;">4</div>
            </div>
          </div>
          
          <!-- Breath Counter -->
          <div class="text-center mb-6">
            <span class="font-body" style="color: var(--dark);">Breaths completed: </span>
            <span id="${breathingId}_count" class="font-title text-xl" style="color: var(--primary);">0</span>
            <span class="font-body" style="color: var(--dark);"> / 3</span>
          </div>
          
          <div class="rounded-xl p-4 flex items-center gap-3" style="background-color: var(--light-green);">
            <input 
              type="checkbox" 
              id="${activityId}_checkbox"
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
            <input type="checkbox" class="w-8 h-8 rounded cursor-pointer" style="accent-color: var(--primary);" data-activity="${activityId}" onchange="markActivityComplete('${activityId}')" \${completedActivities['${activityId}'] ? 'checked disabled' : ''}>
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
            <input type="range" min="1" max="10" value="5" class="thermometer-slider w-full" oninput="this.parentElement.querySelector('.thermometer-value').textContent = this.value; saveFormData('thermometer_${starIndex}', this.value)">
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
    case "circle-one": {
      // Check if this has a correct answer (correctAnswerIndex) or is opinion-based
      const hasCorrectAnswer = typeof lesson.correctAnswerIndex === 'number';
      const correctIdx = lesson.correctAnswerIndex ?? -1;
      interactionHtml = `
        <div class="interactive-group">
          <p class="text-lg mb-4 font-body font-semibold" style="color: var(--dark);">${escapeForTemplate(lesson.interactionPrompt)}</p>
          <div class="grid grid-cols-2 gap-3 mb-4">
            ${options.map((opt, i) => `
              <button class="interactive-option p-4 rounded-xl border-2 font-body text-lg text-left cursor-pointer transition-all" 
                      style="border-color: var(--secondary); background-color: white !important; color: var(--dark);"
                      data-correct="${hasCorrectAnswer ? (i === correctIdx ? 'true' : 'false') : 'opinion'}"
                      data-index="${i}"
                      onclick="handleInteractiveChoice(this, ${starIndex}, ${hasCorrectAnswer}, ${correctIdx})">
                ${escapeForTemplate(opt)}
              </button>
            `).join("")}
          </div>
          <div class="interactive-feedback p-3 rounded-xl mb-2" style="display: none;"></div>
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
          <p class="text-lg mb-4 font-body leading-relaxed" style="color: var(--dark);">${promptWithInputs}</p>
        </div>`;
      break;
    }
      
    case "rate-scale":
      interactionHtml = `
        <div class="interactive-group">
          <p class="text-lg mb-4 font-body font-semibold" style="color: var(--dark);">${escapeForTemplate(lesson.interactionPrompt)}</p>
          <div class="flex justify-between gap-2 mb-4">
            ${[1,2,3,4,5].map(n => `
              <button class="interactive-option w-14 h-14 rounded-full border-2 font-title text-xl flex items-center justify-center cursor-pointer transition-all" 
                      style="border-color: var(--secondary); color: var(--dark);"
                      onclick="this.parentElement.querySelectorAll('.interactive-option').forEach(b => b.classList.remove('option-selected')); this.classList.add('option-selected'); saveFormData('rate_${starIndex}', '${n}'); const page = this.closest('.page'); const ff = page.querySelector('.followup-feedback'); if(ff) ff.style.display = 'block'; const mf = page.querySelector('.mascot-feedback'); if(mf) mf.style.display = 'flex';">
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
      
    case "true-false": {
      // Check if this has a correct answer - for true-false, correctAnswerIndex MUST be set
      // 0 = "I Agree" is correct, 1 = "I Disagree" is correct
      const hasCorrectAnswer = typeof lesson.correctAnswerIndex === 'number';
      const correctIdx = lesson.correctAnswerIndex ?? 1; // Default to "I Disagree" for myth-busting statements if not specified
      interactionHtml = `
        <div class="interactive-group">
          <div class="rounded-2xl p-6 mb-4" style="background-color: var(--soft-yellow);">
            <p class="text-xl font-body font-semibold text-center" style="color: var(--dark);">"${escapeForTemplate(lesson.interactionPrompt)}"</p>
          </div>
          <div class="flex gap-4 justify-center">
            <button class="interactive-option px-8 py-4 rounded-xl border-2 font-title text-xl cursor-pointer transition-all" 
                    style="border-color: var(--secondary); color: var(--dark);"
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
          <div class="interactive-feedback p-3 rounded-xl mb-2" style="display: none;"></div>
        </div>`;
      break;
    }
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
    // Calculate width based on placeholder length (min 6rem, max 14rem)
    const hintLength = blank.hint.length;
    const widthRem = Math.min(14, Math.max(6, Math.ceil(hintLength * 0.65)));
    storyHtml = storyHtml.replace(
      `[${blank.id}]`,
      `<input type="text" class="story-blank inline-block border-b-3 border-dashed text-center font-body mx-1" style="border-color: var(--primary); background: transparent; width: ${widthRem}rem; min-width: 6rem;" placeholder="${escapeForTemplate(blank.hint)}" onchange="saveFormData('story_${starIndex}_${i}', this.value)">`
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

// ========================================
// v5 NEW CHALLENGE RENDER FUNCTIONS
// ========================================

function renderWeatherControllerPage(weather: WeatherControllerContent, starIndex: number, metadata: ModuleMetadata): string {
  const activityId = `weather_${starIndex}`;
  
  const actionsHtml = weather.calmingActions.map(action => `
    <button class="weather-action flex flex-col items-center gap-2 p-4 rounded-2xl border-3 transition-all hover:scale-105 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            style="background-color: white; border-color: var(--secondary);"
            data-action-id="${action.id}"
            data-points="${action.points}"
            data-feedback="${escapeForTemplate(action.feedbackText)}"
            onclick="handleWeatherAction(this, '${activityId}', ${action.points})">
      <span class="text-4xl">${action.emoji}</span>
      <span class="font-title text-lg text-center" style="color: var(--dark);">${escapeForTemplate(action.label)}</span>
    </button>
  `).join("");

  const weatherEmoji = weather.weatherType === "storm" ? "⛈️" : 
                       weather.weatherType === "rain" ? "🌧️" :
                       weather.weatherType === "fog" ? "🌫️" : "🔥";
  const weatherColors = weather.weatherType === "storm" ? "from-gray-600 to-gray-800" :
                        weather.weatherType === "rain" ? "from-blue-400 to-blue-600" :
                        weather.weatherType === "fog" ? "from-gray-300 to-gray-500" : "from-orange-400 to-red-500";

  return `
    <div class="page min-h-screen p-8" style="background-color: var(--cream);" data-page="weather-controller" data-activity="${activityId}">
      <div class="max-w-4xl mx-auto">
        <h1 class="text-3xl md:text-4xl mb-6 font-title" style="color: var(--dark);">${escapeForTemplate(weather.heading)}</h1>
        
        <div class="rounded-3xl shadow-xl p-8" style="background-color: white;">
          <p class="text-lg mb-6 font-body text-center" style="color: var(--dark);">${escapeForTemplate(weather.instructions)}</p>
          
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
              <span class="font-body text-sm" style="color: var(--accent);">Stormy</span>
              <span class="font-body text-sm" style="color: var(--secondary);">Calm</span>
            </div>
            <div class="h-8 rounded-full overflow-hidden" style="background-color: var(--soft-yellow);">
              <div class="calm-meter h-full rounded-full transition-all duration-500" id="calmMeter" style="width: 0%; background: linear-gradient(to-r, var(--accent), var(--primary), var(--secondary), var(--light-green));"></div>
            </div>
            <p class="text-center font-title text-2xl mt-2" style="color: var(--primary);"><span id="calmPercent">0</span>% Calm</p>
          </div>
          
          <!-- Action Buttons -->
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            ${actionsHtml}
          </div>
          
          <!-- Feedback Area -->
          <div class="weather-feedback p-4 rounded-xl text-center mb-4 transition-all" id="weatherFeedback" style="background-color: var(--light-green); display: none;">
            <p class="font-body text-lg" style="color: var(--dark);" id="feedbackText"></p>
          </div>
          
          <!-- Win Message (hidden initially) -->
          <div class="weather-win p-6 rounded-2xl text-center" id="weatherWin" style="display: none; background: linear-gradient(135deg, var(--soft-yellow), var(--light-green));">
            <p class="text-4xl mb-2">☀️</p>
            <p class="font-title text-2xl mb-2" style="color: var(--dark);">${escapeForTemplate(weather.winText)}</p>
            <p class="font-body" style="color: var(--secondary);">${escapeForTemplate(weather.encouragement)}</p>
          </div>
          
          <!-- Completion Checkbox (appears after win) -->
          <div class="rounded-xl p-4 flex items-center gap-3 mt-4" style="background-color: var(--light-green); display: none;" id="weatherComplete">
            <input 
              type="checkbox" 
              class="w-8 h-8 rounded cursor-pointer"
              style="accent-color: var(--primary);"
              data-activity="${activityId}"
              onchange="markActivityComplete('${activityId}')"
              \${completedActivities['${activityId}'] ? 'checked disabled' : ''}
            >
            <label class="font-title text-xl" style="color: var(--dark);">I calmed the storm! ⭐</label>
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
      <p class="font-title text-lg" style="color: var(--dark);">${escapeForTemplate(pu.name)}</p>
      <p class="font-body text-sm" style="color: var(--secondary);">${escapeForTemplate(pu.description)}</p>
    </button>
  `).join("");

  return `
    <div class="page min-h-screen p-8" style="background-color: var(--cream);" data-page="power-up-collector" data-activity="${activityId}">
      <div class="max-w-4xl mx-auto">
        <h1 class="text-3xl md:text-4xl mb-6 font-title" style="color: var(--dark);">${escapeForTemplate(collector.heading)}</h1>
        
        <div class="rounded-3xl shadow-xl p-8" style="background-color: white;">
          <p class="text-lg mb-6 font-body text-center" style="color: var(--dark);">${escapeForTemplate(collector.instructions)}</p>
          
          <!-- Collection Progress -->
          <div class="flex justify-center items-center gap-4 mb-6">
            <div class="collection-bag flex items-center gap-2 p-4 rounded-2xl" style="background-color: var(--soft-yellow);">
              <span class="text-3xl">🎒</span>
              <span class="font-title text-2xl" style="color: var(--dark);"><span id="collectedCount">0</span> / ${collector.targetCount}</span>
            </div>
          </div>
          
          <!-- Collected Items Display -->
          <div class="collected-display flex flex-wrap justify-center gap-2 mb-6 min-h-[60px] p-4 rounded-xl" style="background-color: var(--cream);" id="collectedDisplay">
            <p class="font-body text-sm self-center" style="color: var(--secondary);">Your collected power-ups will appear here!</p>
          </div>
          
          <!-- Power-Up Grid -->
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6" id="powerUpGrid">
            ${powerUpsHtml}
          </div>
          
          <!-- Feedback Area -->
          <div class="powerup-feedback p-4 rounded-xl text-center mb-4 transition-all" id="powerupFeedback" style="display: none;">
            <p class="font-body text-lg" id="powerupFeedbackText"></p>
          </div>
          
          <!-- Win Message (hidden initially) -->
          <div class="powerup-win p-6 rounded-2xl text-center" id="powerupWin" style="display: none; background: linear-gradient(135deg, var(--soft-yellow), var(--light-green));">
            <p class="text-4xl mb-2">🎉</p>
            <p class="font-title text-2xl mb-2" style="color: var(--dark);">${escapeForTemplate(collector.winText)}</p>
            <p class="font-body" style="color: var(--secondary);">${escapeForTemplate(collector.tipText)}</p>
          </div>
          
          <!-- Completion Checkbox -->
          <div class="rounded-xl p-4 flex items-center gap-3 mt-4" style="background-color: var(--light-green); display: none;" id="powerupComplete">
            <input 
              type="checkbox" 
              class="w-8 h-8 rounded cursor-pointer"
              style="accent-color: var(--primary);"
              data-activity="${activityId}"
              onchange="markActivityComplete('${activityId}')"
              \${completedActivities['${activityId}'] ? 'checked disabled' : ''}
            >
            <label class="font-title text-xl" style="color: var(--dark);">I collected my power-ups! ⭐</label>
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
        <span class="w-8 h-8 rounded-full flex items-center justify-center font-title text-white" style="background-color: var(--primary);">${choice.step}</span>
        <p class="font-body text-lg" style="color: var(--dark);">${escapeForTemplate(choice.situation)}</p>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        ${choice.options.map((opt, oi) => `
          <button class="maze-option p-4 rounded-xl border-2 transition-all hover:scale-102 cursor-pointer text-left"
                  style="background-color: white; border-color: var(--secondary);"
                  data-correct="${opt.isCorrect}"
                  data-feedback="${escapeForTemplate(opt.feedback)}"
                  data-step="${idx}"
                  onclick="handleMazeChoice(this, ${idx}, ${maze.pathChoices.length}, '${activityId}')">
            <span class="text-2xl mr-2">${opt.emoji}</span>
            <span class="font-body" style="color: var(--dark);">${escapeForTemplate(opt.text)}</span>
          </button>
        `).join("")}
      </div>
      <div class="maze-step-feedback p-3 rounded-lg mt-3 text-center" id="mazeFeedback${idx}" style="display: none;"></div>
    </div>
  `).join("");

  return `
    <div class="page min-h-screen p-8" style="background-color: var(--cream);" data-page="emotion-maze" data-activity="${activityId}">
      <div class="max-w-4xl mx-auto">
        <h1 class="text-3xl md:text-4xl mb-6 font-title" style="color: var(--dark);">${escapeForTemplate(maze.heading)}</h1>
        
        <div class="rounded-3xl shadow-xl p-8" style="background-color: white;">
          <p class="text-lg mb-6 font-body text-center" style="color: var(--dark);">${escapeForTemplate(maze.instructions)}</p>
          
          <!-- Journey Progress -->
          <div class="flex justify-between items-center mb-6 p-4 rounded-xl" style="background-color: var(--cream);">
            <div class="text-center">
              <span class="text-4xl">${maze.startEmotion.emoji}</span>
              <p class="font-body text-sm" style="color: var(--dark);">${escapeForTemplate(maze.startEmotion.name)}</p>
            </div>
            <div class="flex-1 mx-4 relative">
              <div class="h-3 rounded-full" style="background-color: var(--soft-yellow);">
                <div class="maze-progress h-full rounded-full transition-all duration-500" id="mazeProgress" style="width: 0%; background-color: var(--light-green);"></div>
              </div>
              <div class="maze-marker absolute top-1/2 -translate-y-1/2 text-2xl transition-all duration-500" id="mazeMarker" style="left: 0%;">🚶</div>
            </div>
            <div class="text-center">
              <span class="text-4xl">${maze.goalEmotion.emoji}</span>
              <p class="font-body text-sm" style="color: var(--dark);">${escapeForTemplate(maze.goalEmotion.name)}</p>
            </div>
          </div>
          
          <!-- Steps -->
          ${stepsHtml}
          
          <!-- Win Message -->
          <div class="maze-win p-6 rounded-2xl text-center" id="mazeWin" style="display: none; background: linear-gradient(135deg, var(--soft-yellow), var(--light-green));">
            <p class="text-4xl mb-2">${maze.goalEmotion.emoji}</p>
            <p class="font-title text-2xl mb-2" style="color: var(--dark);">${escapeForTemplate(maze.completionMessage)}</p>
          </div>
          
          <!-- Completion Checkbox -->
          <div class="rounded-xl p-4 flex items-center gap-3 mt-4" style="background-color: var(--light-green); display: none;" id="mazeComplete">
            <input 
              type="checkbox" 
              class="w-8 h-8 rounded cursor-pointer"
              style="accent-color: var(--primary);"
              data-activity="${activityId}"
              onchange="markActivityComplete('${activityId}')"
              \${completedActivities['${activityId}'] ? 'checked disabled' : ''}
            >
            <label class="font-title text-xl" style="color: var(--dark);">I navigated the maze! ⭐</label>
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
        <h3 class="font-title text-lg" style="color: var(--dark);">${escapeForTemplate(section.title)}</h3>
      </div>
      <p class="font-body text-sm mb-2" style="color: var(--dark);">${escapeForTemplate(section.prompt)}</p>
      <input type="text" class="shield-input w-full p-2 rounded-lg border-2 font-body" 
             style="border-color: var(--secondary); background-color: white;"
             placeholder="${escapeForTemplate(section.placeholder)}"
             data-section="${section.id}"
             onchange="handleShieldInput('${activityId}', ${shield.shieldSections.length}); saveFormData('shield_${starIndex}_${section.id}', this.value)"
             value="\${formData['shield_${starIndex}_${section.id}'] || ''}">
    </div>
  `).join("");

  const decorationsHtml = shield.decorations.map(d => `
    <button class="text-3xl p-2 hover:scale-125 transition-all cursor-pointer" onclick="addShieldDecoration('${d}')">${d}</button>
  `).join("");

  return `
    <div class="page min-h-screen p-8" style="background-color: var(--cream);" data-page="strength-shield" data-activity="${activityId}">
      <div class="max-w-4xl mx-auto">
        <h1 class="text-3xl md:text-4xl mb-6 font-title" style="color: var(--dark);">${escapeForTemplate(shield.heading)}</h1>
        
        <div class="rounded-3xl shadow-xl p-8" style="background-color: white;">
          <p class="text-lg mb-6 font-body text-center" style="color: var(--dark);">${escapeForTemplate(shield.instructions)}</p>
          
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
              <div class="shield-decorations absolute inset-0 flex items-center justify-center text-4xl flex-wrap" id="shieldDecorations">
                🛡️
              </div>
            </div>
          </div>
          
          <!-- Decoration Buttons -->
          <div class="flex justify-center gap-2 mb-6 p-3 rounded-lg" style="background-color: var(--cream);">
            <span class="font-body text-sm self-center mr-2" style="color: var(--dark);">Add decorations:</span>
            ${decorationsHtml}
          </div>
          
          <!-- Shield Sections -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            ${sectionsHtml}
          </div>
          
          <!-- Progress Indicator -->
          <div class="text-center mb-4">
            <p class="font-body" style="color: var(--secondary);">Sections filled: <span id="shieldProgress">0</span> / ${shield.shieldSections.length}</p>
          </div>
          
          <!-- Win Message -->
          <div class="shield-win p-6 rounded-2xl text-center" id="shieldWin" style="display: none; background: linear-gradient(135deg, var(--soft-yellow), var(--light-green));">
            <p class="text-4xl mb-2">🛡️</p>
            <p class="font-title text-2xl mb-2" style="color: var(--dark);">${escapeForTemplate(shield.completionMessage)}</p>
          </div>
          
          <!-- Completion Checkbox -->
          <div class="rounded-xl p-4 flex items-center gap-3 mt-4" style="background-color: var(--light-green); display: none;" id="shieldComplete">
            <input 
              type="checkbox" 
              class="w-8 h-8 rounded cursor-pointer"
              style="accent-color: var(--primary);"
              data-activity="${activityId}"
              onchange="markActivityComplete('${activityId}')"
              \${completedActivities['${activityId}'] ? 'checked disabled' : ''}
            >
            <label class="font-title text-xl" style="color: var(--dark);">I built my strength shield! ⭐</label>
          </div>
        </div>
      </div>
    </div>`;
}

function renderFeelingVolcanoPage(volcano: FeelingVolcanoContent, starIndex: number, metadata: ModuleMetadata): string {
  const activityId = `volcano_${starIndex}`;
  
  const actionsHtml = volcano.coolingActions.map(action => `
    <button class="cooling-action flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all hover:scale-105 cursor-pointer"
            style="background-color: white; border-color: var(--secondary);"
            data-cooling="${action.coolingPower}"
            data-action="${escapeForTemplate(action.action)}"
            onclick="handleVolcanoCool(this, '${activityId}', ${action.coolingPower})">
      <span class="text-3xl">${action.emoji}</span>
      <span class="font-body text-sm text-center" style="color: var(--dark);">${escapeForTemplate(action.action)}</span>
    </button>
  `).join("");

  const levelsHtml = volcano.levels.map(level => `
    <div class="volcano-level flex items-center gap-2 p-2 rounded-lg transition-all" id="volcanoLevel${level.level}" style="background-color: ${level.color}20;">
      <span class="text-xl">${level.emoji}</span>
      <span class="font-body text-sm" style="color: var(--dark);">${escapeForTemplate(level.label)}</span>
    </div>
  `).join("");

  return `
    <div class="page min-h-screen p-8" style="background-color: var(--cream);" data-page="feeling-volcano" data-activity="${activityId}">
      <div class="max-w-4xl mx-auto">
        <h1 class="text-3xl md:text-4xl mb-6 font-title" style="color: var(--dark);">${escapeForTemplate(volcano.heading)}</h1>
        
        <div class="rounded-3xl shadow-xl p-8" style="background-color: white;">
          <p class="text-lg mb-4 font-body text-center" style="color: var(--dark);">${escapeForTemplate(volcano.instructions)}</p>
          
          <!-- Scenario -->
          <div class="p-4 rounded-xl mb-6" style="background-color: var(--soft-yellow);">
            <p class="font-body text-center" style="color: var(--dark);"><strong>The situation:</strong> ${escapeForTemplate(volcano.triggerScenario)}</p>
          </div>
          
          <!-- Volcano Visual -->
          <div class="flex justify-center items-end gap-8 mb-6">
            <!-- Level Indicator -->
            <div class="flex flex-col-reverse gap-1">
              ${levelsHtml}
            </div>
            
            <!-- Volcano -->
            <div class="volcano-container relative">
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
              <p class="font-title text-3xl" style="color: var(--accent);"><span id="volcanoTemp">100</span>°</p>
              <p class="font-body text-sm" style="color: var(--dark);">Heat Level</p>
            </div>
          </div>
          
          <!-- Cooling Actions -->
          <p class="font-title text-lg text-center mb-3" style="color: var(--dark);">Use your cooling tools! 🧊</p>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            ${actionsHtml}
          </div>
          
          <!-- Feedback -->
          <div class="volcano-feedback p-4 rounded-xl text-center mb-4" id="volcanoFeedback" style="display: none;">
            <p class="font-body text-lg" id="volcanoFeedbackText"></p>
          </div>
          
          <!-- Safe Message -->
          <div class="volcano-safe p-6 rounded-2xl text-center" id="volcanoSafe" style="display: none; background: linear-gradient(135deg, var(--soft-yellow), var(--light-green));">
            <p class="text-4xl mb-2">😌</p>
            <p class="font-title text-2xl mb-2" style="color: var(--dark);">${escapeForTemplate(volcano.safeMessage)}</p>
          </div>
          
          <!-- Completion Checkbox -->
          <div class="rounded-xl p-4 flex items-center gap-3 mt-4" style="background-color: var(--light-green); display: none;" id="volcanoComplete">
            <input 
              type="checkbox" 
              class="w-8 h-8 rounded cursor-pointer"
              style="accent-color: var(--primary);"
              data-activity="${activityId}"
              onchange="markActivityComplete('${activityId}')"
              \${completedActivities['${activityId}'] ? 'checked disabled' : ''}
            >
            <label class="font-title text-xl" style="color: var(--dark);">I cooled the volcano! ⭐</label>
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
  categoryColor?: string | null
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
  const html = renderHtml(content, pageStructure, moduleCode, categoryColor);
  
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
  seriesInfo?: SeriesInfo | null,
  categoryColor?: string | null
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
    
    const generationPromise = generateModule(supabaseClient, contentBrief, jobId, seriesInfo, categoryColor);
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
    const category = body?.category;
    
    // Debug logging
    console.log(`[AI] Request received - seriesId: ${seriesId}, category: ${category}, asyncMode: ${asyncMode}, contentBrief length: ${contentBrief?.length || 0}`);
    console.log(`[AI] Full body keys: ${Object.keys(body || {}).join(', ')}`);
    
    if (!contentBrief) {
      return jsonResponse({ error: "contentBrief is required" }, 400);
    }
    
    // Look up category color if category provided
    let categoryColor: string | null = null;
    if (category) {
      console.log(`[AI] Looking up category color for: ${category}`);
      const { data: categoryData, error: categoryError } = await supabaseClient
        .from("category_colors")
        .select("color")
        .eq("category", category)
        .single();
      
      if (!categoryError && categoryData?.color) {
        categoryColor = categoryData.color;
        console.log(`[AI] Using category color: ${categoryColor}`);
      } else {
        console.log(`[AI] Category lookup failed or no color:`, categoryError);
      }
    }
    
    // Fetch series info if seriesId provided
    let seriesInfo: SeriesInfo | null = null;
    if (seriesId) {
      console.log(`[AI] Looking up series with id/label: ${seriesId}`);
      
      // Check if seriesId looks like a UUID (contains dashes and is ~36 chars)
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(seriesId);
      
      let series = null;
      let seriesError = null;
      
      if (isUUID) {
        // Lookup by UUID
        const result = await supabaseClient
          .from("series")
          .select("label, character_type, emoji")
          .eq("id", seriesId)
          .single();
        series = result.data;
        seriesError = result.error;
      } else {
        // Lookup by label name (case-insensitive)
        const result = await supabaseClient
          .from("series")
          .select("label, character_type, emoji")
          .ilike("label", seriesId)
          .single();
        series = result.data;
        seriesError = result.error;
        
        // If not found by exact label, try partial match
        if (seriesError && seriesError.code === 'PGRST116') {
          console.log(`[AI] Exact label match failed, trying partial match...`);
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
        anyGlobal.EdgeRuntime.waitUntil(runAsyncGeneration(supabaseClient, jobId, contentBrief, seriesInfo, categoryColor));
      } else {
        runAsyncGeneration(supabaseClient, jobId, contentBrief, seriesInfo, categoryColor).catch(console.error);
      }
      
      return jsonResponse({ jobId });
    }
    
    // Sync mode
    const result = await generateModule(supabaseClient, contentBrief, undefined, seriesInfo, categoryColor);
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