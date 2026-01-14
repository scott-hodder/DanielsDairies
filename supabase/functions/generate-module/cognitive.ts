/**
 * Cognitive Activity Generators
 * =============================
 * Generates thinking and problem-solving activities.
 */

import { TOKENS_ACTIVITY } from "../config.ts";
import { callClaude, SYSTEM_PROMPT } from "../claude.ts";
import { safeJsonParse } from "../utils.ts";
import type { 
  ModuleMetadata,
  ActionPlanContent,
  WarningSignsContent,
  MatchingActivityContent,
  SortingActivityContent,
  ThoughtBubblesContent,
  AgreeDisagreeContent,
  WordScrambleContent,
  CopingCardsContent,
} from "../types.ts";

// ====================
// ACTION PLAN
// ====================

export async function generateActionPlans(
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

// ====================
// WARNING SIGNS
// ====================

export async function generateWarningSigns(
  apiKey: string,
  metadata: ModuleMetadata,
  contentBrief: string,
  count: number
): Promise<WarningSignsContent[]> {
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
  const parsed = safeJsonParse<{ warningSigns: WarningSignsContent[] }>(response);
  
  const signs = parsed?.warningSigns || [];
  while (signs.length < count) {
    signs.push({
      heading: "⚠️ My Warning Signs",
      instructions: "Check off the warning signs that happen to YOU when big feelings are coming.",
      categories: [
        { category: "Body Signs", emoji: "🫀", examples: ["Heart beats fast", "Hands get sweaty", "Tummy feels funny", "Face gets hot"] },
        { category: "Thought Signs", emoji: "💭", examples: ["Can't stop worrying", "Thoughts go fast", "Hard to focus", "Mind goes blank"] },
        { category: "Action Signs", emoji: "🏃", examples: ["Want to run away", "Feel like yelling", "Can't sit still", "Clench my fists"] }
      ]
    });
  }
  
  return signs.slice(0, count);
}

// ====================
// MATCHING ACTIVITY
// ====================

export async function generateMatchingActivities(
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
      "instructions": "Instructions for matching (1-2 sentences)",
      "pairs": [
        { "situation": "When I feel left out at recess", "feeling": "Lonely", "emoji": "😔" },
        { "situation": "When I finish a hard puzzle", "feeling": "Proud", "emoji": "😊" },
        { "situation": "When there's a loud thunderstorm", "feeling": "Scared", "emoji": "😨" }
      ]
    }
  ]
}`;

  const response = await callClaude(apiKey, SYSTEM_PROMPT, prompt, TOKENS_ACTIVITY);
  const parsed = safeJsonParse<{ matchingActivities: MatchingActivityContent[] }>(response);
  
  const activities = parsed?.matchingActivities || [];
  while (activities.length < count) {
    activities.push({
      heading: "🔗 Match the Feeling",
      instructions: "Match each situation to how it might make someone feel!",
      pairs: [
        { situation: "When I feel left out at recess", feeling: "Lonely", emoji: "😔" },
        { situation: "When I finish a hard puzzle", feeling: "Proud", emoji: "😊" },
        { situation: "When there's a loud thunderstorm", feeling: "Scared", emoji: "😨" },
        { situation: "When someone takes my toy", feeling: "Angry", emoji: "😠" },
        { situation: "When my birthday is tomorrow", feeling: "Excited", emoji: "🤩" }
      ]
    });
  }
  
  return activities.slice(0, count);
}

// ====================
// SORTING ACTIVITY
// ====================

export async function generateSortingActivities(
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
        { "name": "Helpful", "emoji": "✓", "color": "#A8E6CF" },
        { "name": "Not Helpful", "emoji": "✗", "color": "#fecaca" }
      ],
      "items": [
        { "text": "Taking deep breaths", "correctCategory": "Helpful", "explanation": "Deep breaths help calm our body" },
        { "text": "Yelling at someone", "correctCategory": "Not Helpful", "explanation": "This can hurt others' feelings" }
      ]
    }
  ]
}`;

  const response = await callClaude(apiKey, SYSTEM_PROMPT, prompt, TOKENS_ACTIVITY);
  const parsed = safeJsonParse<{ sortingActivities: SortingActivityContent[] }>(response);
  
  const activities = parsed?.sortingActivities || [];
  while (activities.length < count) {
    activities.push({
      heading: "🗂️ Sort It Out!",
      instructions: "Drag each item to the correct category!",
      categories: [
        { name: "Helpful", emoji: "✓", color: "#A8E6CF" },
        { name: "Not Helpful", emoji: "✗", color: "#fecaca" }
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

// ====================
// THOUGHT BUBBLES
// ====================

export async function generateThoughtBubbles(
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
      "characterEmoji": "😟",
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
      heading: "💭 Thought Bubble Challenge",
      scenario: "You made a mistake on your homework and feel embarrassed.",
      characterEmoji: "😟",
      unhelpfulThought: "I'm so stupid, I can't do anything right!",
      helpfulPrompt: "What's a kinder thought you could have instead?",
      exampleHelpful: "Everyone makes mistakes - that's how we learn!",
      reflection: "Think of a time when you had an unhelpful thought. What could you say instead?"
    });
  }
  
  return bubbles.slice(0, count);
}

// ====================
// AGREE/DISAGREE
// ====================

export async function generateAgreeDisagrees(
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
      heading: "🤔 Do You Agree?",
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

// ====================
// WORD SCRAMBLE
// ====================

export async function generateWordScrambles(
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
        { "scrambled": "MLCA", "answer": "CALM", "hint": "A peaceful feeling", "emoji": "😌" },
        { "scrambled": "RABEV", "answer": "BRAVE", "hint": "When you face fears", "emoji": "🦁" }
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
      heading: "🧩 Word Scramble Challenge",
      instructions: "Unscramble the letters to find feeling words!",
      words: [
        { scrambled: "MLCA", answer: "CALM", hint: "A peaceful feeling", emoji: "😌" },
        { scrambled: "RABEV", answer: "BRAVE", hint: "When you face your fears", emoji: "🦁" },
        { scrambled: "PPYHA", answer: "HAPPY", hint: "A joyful feeling", emoji: "😊" },
        { scrambled: "EFSA", answer: "SAFE", hint: "When nothing can hurt you", emoji: "🛡️" }
      ],
      completionMessage: "Amazing! You're a word wizard!"
    });
  }
  
  return scrambles.slice(0, count);
}

// ====================
// COPING CARDS
// ====================

export async function generateCopingCards(
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
        { "name": "Body Tools", "emoji": "💪", "color": "#A8E6CF", "strategies": ["Deep breathing", "Stretching", "Running"] },
        { "name": "Mind Tools", "emoji": "🧠", "color": "#a8d8ea", "strategies": ["Counting to 10", "Thinking happy thoughts"] },
        { "name": "Connect Tools", "emoji": "💬", "color": "#FFE8A3", "strategies": ["Talking to someone", "Asking for a hug"] }
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
      heading: "🃏 My Coping Cards",
      instructions: "Tap on strategies you want to remember, then create your own!",
      categories: [
        { name: "Body Tools", emoji: "💪", color: "#A8E6CF", strategies: ["Deep breathing", "Stretching", "Running in place", "Squeezing a ball"] },
        { name: "Mind Tools", emoji: "🧠", color: "#a8d8ea", strategies: ["Counting backwards", "Thinking of happy memories", "Saying kind words to myself"] },
        { name: "Connect Tools", emoji: "💬", color: "#FFE8A3", strategies: ["Talking to a grown-up", "Playing with a pet", "Writing in a journal"] }
      ],
      personalCardPrompt: "Now create YOUR special coping card!"
    });
  }
  
  return cards.slice(0, count);
}