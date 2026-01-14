/**
 * Challenge Activity Generators (v5)
 * ===================================
 * Generates interactive game-like challenges.
 */

import { TOKENS_ACTIVITY } from "../config.ts";
import { callClaude, SYSTEM_PROMPT } from "../claude.ts";
import { safeJsonParse } from "../utils.ts";
import type { 
  ModuleMetadata,
  WeatherControllerContent,
  PowerUpCollectorContent,
  EmotionMazeContent,
  StrengthShieldContent,
  FeelingVolcanoContent,
} from "../types.ts";

// ====================
// WEATHER CONTROLLER
// ====================

export async function generateWeatherControllers(
  apiKey: string,
  metadata: ModuleMetadata,
  contentBrief: string,
  count: number
): Promise<WeatherControllerContent[]> {
  const prompt = `Create ${count} weather controller activities for children about "${metadata.theme}".

This is a game where children "calm the weather" (metaphor for emotions) using calming techniques.

Respond with ONLY this JSON:
{
  "weatherControllers": [
    {
      "heading": "Activity title with weather emoji",
      "instructions": "Instructions explaining the game (2 sentences)",
      "weatherType": "storm",
      "calmingActions": [
        { "id": "a1", "label": "Take a deep breath", "emoji": "🌬️", "points": 20, "feedbackText": "Feel the calm air..." },
        { "id": "a2", "label": "Count to 5", "emoji": "🔢", "points": 15, "feedbackText": "Slowing down helps..." },
        { "id": "a3", "label": "Think of something happy", "emoji": "😊", "points": 25, "feedbackText": "Warm thoughts calm the storm..." },
        { "id": "a4", "label": "Squeeze and release", "emoji": "✊", "points": 20, "feedbackText": "Releasing tension..." }
      ],
      "winText": "You calmed the storm!",
      "encouragement": "You have the power to calm any inner storm!"
    }
  ]
}

weatherType can be: "storm", "rain", "fog", "heat"
Make the content relevant to ${metadata.theme}.`;

  const response = await callClaude(apiKey, SYSTEM_PROMPT, prompt, TOKENS_ACTIVITY);
  const parsed = safeJsonParse<{ weatherControllers: WeatherControllerContent[] }>(response);
  
  const controllers = parsed?.weatherControllers || [];
  while (controllers.length < count) {
    controllers.push({
      heading: "⛈️ Calm the Storm!",
      instructions: "Sometimes our feelings feel like a big storm inside. Use your calming powers to clear the sky!",
      weatherType: "storm",
      calmingActions: [
        { id: "a1", label: "Take a deep breath", emoji: "🌬️", points: 20, feedbackText: "Feel the calm air filling you up..." },
        { id: "a2", label: "Count backwards from 5", emoji: "🔢", points: 15, feedbackText: "5... 4... 3... 2... 1... Slowing down..." },
        { id: "a3", label: "Think of something happy", emoji: "😊", points: 25, feedbackText: "Warm thoughts help calm the storm..." },
        { id: "a4", label: "Squeeze and release your hands", emoji: "✊", points: 20, feedbackText: "Releasing tension from your body..." }
      ],
      winText: "🌈 You calmed the storm! The sky is clear!",
      encouragement: `${metadata.characterName} says: You have the power to calm any inner storm! ${metadata.characterEmoji}`
    });
  }
  
  return controllers.slice(0, count);
}

// ====================
// POWER-UP COLLECTOR
// ====================

export async function generatePowerUpCollectors(
  apiKey: string,
  metadata: ModuleMetadata,
  contentBrief: string,
  count: number
): Promise<PowerUpCollectorContent[]> {
  const prompt = `Create ${count} power-up collector activities for children about "${metadata.theme}".

This is a game where children collect helpful strategies (power-ups) while avoiding unhelpful ones.

Respond with ONLY this JSON:
{
  "powerUpCollectors": [
    {
      "heading": "Activity title with star/power emoji",
      "instructions": "Instructions explaining the game (2 sentences)",
      "powerUps": [
        { "id": "p1", "name": "Deep Breathing", "emoji": "🌬️", "description": "Calms your body", "isPositive": true },
        { "id": "p2", "name": "Talking to Someone", "emoji": "💬", "description": "Sharing helps", "isPositive": true },
        { "id": "p3", "name": "Bottling Up", "emoji": "🍾", "description": "Keeping it all inside", "isPositive": false },
        { "id": "p4", "name": "Yelling", "emoji": "😤", "description": "Shouting at others", "isPositive": false }
      ],
      "targetCount": 4,
      "winText": "You collected all the good power-ups!",
      "tipText": "Tip about recognizing good strategies"
    }
  ]
}

Include a mix of positive (isPositive: true) and negative (isPositive: false) power-ups.
Make the content relevant to ${metadata.theme}.`;

  const response = await callClaude(apiKey, SYSTEM_PROMPT, prompt, TOKENS_ACTIVITY);
  const parsed = safeJsonParse<{ powerUpCollectors: PowerUpCollectorContent[] }>(response);
  
  const collectors = parsed?.powerUpCollectors || [];
  while (collectors.length < count) {
    collectors.push({
      heading: "⚡ Collect Your Power-Ups!",
      instructions: "Collect the HELPFUL strategies to fill your power meter! Avoid the ones that won't help.",
      powerUps: [
        { id: "p1", name: "Deep Breathing", emoji: "🌬️", description: "Calms your body and mind", isPositive: true },
        { id: "p2", name: "Talking to Someone", emoji: "💬", description: "Sharing helps lighten the load", isPositive: true },
        { id: "p3", name: "Taking a Walk", emoji: "🚶", description: "Movement helps release feelings", isPositive: true },
        { id: "p4", name: "Drawing or Creating", emoji: "🎨", description: "Express feelings through art", isPositive: true },
        { id: "p5", name: "Bottling Up", emoji: "🍾", description: "Keeping everything inside", isPositive: false },
        { id: "p6", name: "Yelling at Others", emoji: "😤", description: "Taking it out on people", isPositive: false }
      ],
      targetCount: 4,
      winText: `🎉 You collected all the power-ups! ${metadata.characterName} is impressed!`,
      tipText: "Helpful strategies make us feel better AND don't hurt others!"
    });
  }
  
  return collectors.slice(0, count);
}

// ====================
// EMOTION MAZE
// ====================

export async function generateEmotionMazes(
  apiKey: string,
  metadata: ModuleMetadata,
  contentBrief: string,
  count: number
): Promise<EmotionMazeContent[]> {
  const prompt = `Create ${count} emotion maze activities for children about "${metadata.theme}".

This is a choice-based game where children navigate from a difficult emotion to a calmer state.

Respond with ONLY this JSON:
{
  "emotionMazes": [
    {
      "heading": "Activity title with maze emoji",
      "instructions": "Instructions explaining the game (2 sentences)",
      "startEmotion": { "name": "Worried", "emoji": "😰" },
      "goalEmotion": { "name": "Calm", "emoji": "😌" },
      "pathChoices": [
        {
          "step": 1,
          "situation": "You're feeling worried about something.",
          "options": [
            { "text": "Take 3 deep breaths", "emoji": "🌬️", "isCorrect": true, "feedback": "Great choice! Breathing helps calm your body." },
            { "text": "Stay up all night worrying", "emoji": "😫", "isCorrect": false, "feedback": "This might make you more tired. Try again!" }
          ]
        },
        {
          "step": 2,
          "situation": "You still feel a little worried.",
          "options": [
            { "text": "Talk to a grown-up", "emoji": "💬", "isCorrect": true, "feedback": "Sharing worries makes them smaller!" },
            { "text": "Keep it to yourself", "emoji": "🤐", "isCorrect": false, "feedback": "Keeping worries inside can make them grow." }
          ]
        }
      ],
      "completionMessage": "You made it through the maze!"
    }
  ]
}

Include 3 pathChoices steps with 2 options each.
Make the content relevant to ${metadata.theme}.`;

  const response = await callClaude(apiKey, SYSTEM_PROMPT, prompt, TOKENS_ACTIVITY);
  const parsed = safeJsonParse<{ emotionMazes: EmotionMazeContent[] }>(response);
  
  const mazes = parsed?.emotionMazes || [];
  while (mazes.length < count) {
    mazes.push({
      heading: "🗺️ Navigate Your Feelings",
      instructions: "Help find the path from a big feeling to a calmer place! Choose wisely at each step.",
      startEmotion: { name: "Worried", emoji: "😰" },
      goalEmotion: { name: "Calm", emoji: "😌" },
      pathChoices: [
        {
          step: 1,
          situation: "You're feeling worried about something at school.",
          options: [
            { text: "Take 3 deep breaths", emoji: "🌬️", isCorrect: true, feedback: "Great choice! Breathing helps calm your body." },
            { text: "Stay up all night worrying", emoji: "😫", isCorrect: false, feedback: "This might make you more tired and worried. Try again!" }
          ]
        },
        {
          step: 2,
          situation: "You still feel a little worried after breathing.",
          options: [
            { text: "Talk to someone you trust", emoji: "💬", isCorrect: true, feedback: "Sharing worries makes them feel smaller!" },
            { text: "Keep the worry inside", emoji: "🤐", isCorrect: false, feedback: "Keeping worries inside can make them grow bigger. Try again!" }
          ]
        },
        {
          step: 3,
          situation: "You talked about it and feel a bit better. What now?",
          options: [
            { text: "Make a plan for tomorrow", emoji: "📋", isCorrect: true, feedback: "Having a plan helps you feel ready!" },
            { text: "Keep thinking about what might go wrong", emoji: "😟", isCorrect: false, feedback: "Focusing on worries keeps them strong. Try again!" }
          ]
        }
      ],
      completionMessage: `🎉 You navigated the maze! ${metadata.characterName} is so proud of you!`
    });
  }
  
  return mazes.slice(0, count);
}

// ====================
// STRENGTH SHIELD
// ====================

export async function generateStrengthShields(
  apiKey: string,
  metadata: ModuleMetadata,
  contentBrief: string,
  count: number
): Promise<StrengthShieldContent[]> {
  const prompt = `Create ${count} strength shield builder activities for children about "${metadata.theme}".

This is an activity where children build a protective shield with their personal strengths.

Respond with ONLY this JSON:
{
  "strengthShields": [
    {
      "heading": "Activity title with shield emoji",
      "instructions": "Instructions explaining how to build the shield (2 sentences)",
      "shieldSections": [
        { "id": "s1", "title": "My Superpower", "emoji": "⚡", "prompt": "What are you really good at?", "placeholder": "I'm good at..." },
        { "id": "s2", "title": "My Support Team", "emoji": "👥", "prompt": "Who helps you when things are hard?", "placeholder": "People who help me..." },
        { "id": "s3", "title": "My Calm Tools", "emoji": "🧘", "prompt": "What helps you feel calm?", "placeholder": "When I need calm, I..." },
        { "id": "s4", "title": "My Brave Moment", "emoji": "🦁", "prompt": "When were you brave?", "placeholder": "I was brave when..." }
      ],
      "decorations": ["⭐", "🌟", "💪", "🛡️", "✨", "💖"],
      "completionMessage": "Your shield is complete! You are stronger than you know!"
    }
  ]
}

Make the content relevant to ${metadata.theme}.`;

  const response = await callClaude(apiKey, SYSTEM_PROMPT, prompt, TOKENS_ACTIVITY);
  const parsed = safeJsonParse<{ strengthShields: StrengthShieldContent[] }>(response);
  
  const shields = parsed?.strengthShields || [];
  while (shields.length < count) {
    shields.push({
      heading: "🛡️ Build Your Strength Shield",
      instructions: "Every hero needs a shield! Fill in each section to build YOUR personal strength shield.",
      shieldSections: [
        { id: "s1", title: "My Superpower", emoji: "⚡", prompt: "What are you really good at?", placeholder: "I'm good at..." },
        { id: "s2", title: "My Support Team", emoji: "👥", prompt: "Who helps you when things are hard?", placeholder: "People who help me..." },
        { id: "s3", title: "My Calm Tools", emoji: "🧘", prompt: "What helps you feel calm?", placeholder: "When I need calm, I..." },
        { id: "s4", title: "My Brave Moment", emoji: "🦁", prompt: "Tell about a time you were brave!", placeholder: "I was brave when..." }
      ],
      decorations: ["⭐", "🌟", "💪", "🛡️", "✨", "💖"],
      completionMessage: `🛡️ Your shield is complete! ${metadata.characterName} says: You are stronger than you know!`
    });
  }
  
  return shields.slice(0, count);
}

// ====================
// FEELING VOLCANO
// ====================

export async function generateFeelingVolcanoes(
  apiKey: string,
  metadata: ModuleMetadata,
  contentBrief: string,
  count: number
): Promise<FeelingVolcanoContent[]> {
  const prompt = `Create ${count} feeling volcano activities for children about "${metadata.theme}".

This is a game where children learn to "cool down" a volcano of big feelings before it erupts.

Respond with ONLY this JSON:
{
  "feelingVolcanoes": [
    {
      "heading": "Activity title with volcano emoji",
      "instructions": "Instructions explaining the game (2 sentences)",
      "triggerScenario": "A scenario that might cause big feelings (1-2 sentences)",
      "coolingActions": [
        { "id": "c1", "action": "Take a deep breath", "emoji": "🌬️", "coolingPower": 20 },
        { "id": "c2", "action": "Count to 5", "emoji": "🔢", "coolingPower": 15 },
        { "id": "c3", "action": "Squeeze a pillow", "emoji": "🛏️", "coolingPower": 25 },
        { "id": "c4", "action": "Walk away for a moment", "emoji": "🚶", "coolingPower": 20 }
      ],
      "levels": [
        { "level": 5, "emoji": "🌋", "label": "About to Erupt!", "color": "#ef4444" },
        { "level": 4, "emoji": "🔥", "label": "Very Hot", "color": "#f97316" },
        { "level": 3, "emoji": "😤", "label": "Getting Warm", "color": "#eab308" },
        { "level": 2, "emoji": "😊", "label": "Cooling Down", "color": "#84cc16" },
        { "level": 1, "emoji": "😌", "label": "Cool and Calm", "color": "#22c55e" }
      ],
      "safeMessage": "You kept the volcano cool! Great job managing big feelings!"
    }
  ]
}

Make the content relevant to ${metadata.theme}.`;

  const response = await callClaude(apiKey, SYSTEM_PROMPT, prompt, TOKENS_ACTIVITY);
  const parsed = safeJsonParse<{ feelingVolcanoes: FeelingVolcanoContent[] }>(response);
  
  const volcanoes = parsed?.feelingVolcanoes || [];
  while (volcanoes.length < count) {
    volcanoes.push({
      heading: "🌋 Cool the Volcano!",
      instructions: "When big feelings build up, they can feel like a volcano! Use your cooling tools before it erupts.",
      triggerScenario: "Someone took your favorite toy without asking and you're feeling really angry inside.",
      coolingActions: [
        { id: "c1", action: "Take a deep breath", emoji: "🌬️", coolingPower: 20 },
        { id: "c2", action: "Count backwards from 5", emoji: "🔢", coolingPower: 15 },
        { id: "c3", action: "Squeeze something soft", emoji: "🧸", coolingPower: 25 },
        { id: "c4", action: "Walk away for a moment", emoji: "🚶", coolingPower: 20 }
      ],
      levels: [
        { level: 5, emoji: "🌋", label: "About to Erupt!", color: "#ef4444" },
        { level: 4, emoji: "🔥", label: "Very Hot", color: "#f97316" },
        { level: 3, emoji: "😤", label: "Getting Warm", color: "#eab308" },
        { level: 2, emoji: "😊", label: "Cooling Down", color: "#84cc16" },
        { level: 1, emoji: "😌", label: "Cool and Calm", color: "#22c55e" }
      ],
      safeMessage: `🎉 You kept the volcano cool! ${metadata.characterName} is so proud of your self-control!`
    });
  }
  
  return volcanoes.slice(0, count);
}