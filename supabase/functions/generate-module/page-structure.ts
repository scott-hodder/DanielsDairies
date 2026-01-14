/**
 * Page Structure Generator
 * ========================
 * Generates the structure of pages for a module.
 * 
 * Activities are selected from 5 CATEGORIES for maximum diversity:
 * - CORE: Classic activities (checklist, quiz, reflection, etc.)
 * - FEELINGS: Emotional awareness activities 
 * - CREATIVE: Artistic/building activities
 * - COGNITIVE: Thinking/problem-solving activities
 * - CHALLENGE: V5 interactive game-like challenges
 */

import { MIN_PAGES, MAX_PAGES } from "./config.ts";
import { randomInt, shuffleArray } from "./utils.ts";
import type { PageTemplate } from "./types.ts";

/**
 * Generate a variable page structure between MIN_PAGES and MAX_PAGES
 */
export function generatePageStructure(): PageTemplate[] {
  const targetPages = randomInt(MIN_PAGES, MAX_PAGES);
  
  // ====================
  // ACTIVITY POOLS
  // ====================
  
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
  
  // V5 CHALLENGE activities (interactive games)
  const challengeActivities: PageTemplate[] = [
    { type: "weather-controller",  starReward: true },
    { type: "power-up-collector",  starReward: true },
    { type: "emotion-maze",        starReward: true },
    { type: "strength-shield",     starReward: true },
    { type: "feeling-volcano",     starReward: true },
  ];
  
  // ====================
  // SELECT ACTIVITIES
  // ====================
  
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
  
  // V5: Always include 1-2 challenge activities for engagement
  const shuffledChallenge = shuffleArray(challengeActivities);
  selectedActivities.push(...shuffledChallenge.slice(0, randomInt(1, 2)));
  
  // Shuffle all selected activities for random placement
  const activities = shuffleArray(selectedActivities);
  
  // ====================
  // BUILD STRUCTURE
  // ====================
  
  const structure: PageTemplate[] = [
    { type: "cover",           starReward: false },
    { type: "welcome",         starReward: false },
  ];
  
  // Chapter 1: Introduction - mix interactive lessons with activities
  structure.push({ type: "chapter-divider", starReward: false });
  structure.push({ type: "interactive-lesson", starReward: false });
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

/**
 * Count occurrences of each page type in a structure
 */
export function countPageTypes(pageStructure: PageTemplate[]): Record<string, number> {
  return {
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
    weatherControllers: pageStructure.filter(p => p.type === "weather-controller").length,
    powerUpCollectors: pageStructure.filter(p => p.type === "power-up-collector").length,
    emotionMazes: pageStructure.filter(p => p.type === "emotion-maze").length,
    strengthShields: pageStructure.filter(p => p.type === "strength-shield").length,
    feelingVolcanoes: pageStructure.filter(p => p.type === "feeling-volcano").length,
  };
}