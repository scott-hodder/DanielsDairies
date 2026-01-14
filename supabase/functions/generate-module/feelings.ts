/**
 * Feelings Activity Generators
 * ============================
 * Generates activities focused on emotional awareness and identification.
 */

import { TOKENS_ACTIVITY } from "../config.ts";
import { callClaude, SYSTEM_PROMPT } from "../claude.ts";
import { safeJsonParse } from "../utils.ts";
import type { 
  ModuleMetadata,
  FeelingThermometerContent,
  BodyMapContent,
  FeelingSelectorContent,
  EmojiCheckInContent,
} from "../types.ts";

// ====================
// FEELING THERMOMETER
// ====================

export async function generateFeelingThermometers(
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

// ====================
// BODY MAP
// ====================

export async function generateBodyMaps(
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

// ====================
// FEELING SELECTOR
// ====================

export async function generateFeelingSelectors(
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

// ====================
// EMOJI CHECK-IN
// ====================

export async function generateEmojiCheckIns(
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