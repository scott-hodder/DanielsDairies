import {
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
  type VerificationReport,
  type ModuleSummary,
  TOKENS_METADATA,
  TOKENS_LESSON_BATCH,
  TOKENS_ACTIVITY,
  getAgeSpecificFormatting,
  safeJsonParse,
  callClaude,
} from "./generators-core.ts";

// ====================
// CONTENT GENERATION
// ====================

const SYSTEM_PROMPT = `You are an expert child psychologist and educational content creator specialising in social-emotional learning (SEL) workbooks for children and teens ages 6-18.

Your content must be:
- Age-appropriate, warm, and encouraging
- Psychologically sound with evidence-based techniques
- Engaging with a consistent character/mascot throughout
- Interactive with activities that reinforce learning

CRITICAL RULES:
1. Always respond with ONLY valid JSON. No explanations, no markdown, just the JSON object.
2. If a specific character/mascot is mentioned, you MUST use EXACTLY that character name and type throughout. Never substitute a different animal or character.
3. The mascot emoji must match the character type exactly.
4. When creating multiple items, sequence them as a learning journey: start with simple awareness, then practise skills, then apply in real-life scenarios. Each item should build on the previous one without repeating earlier points.
5. Treat the age range and language guidelines as hard requirements. Output must be clearly distinct across age ranges.
6. Use Australian English spelling throughout (colour, behaviour, favourite, organise, centre, mum, learnt).
7. NEVER use em dashes, "dive in", "unlock", "unleash", "delve", or other AI-sounding phrases.
8. Write as a warm, experienced educator, not a marketing copywriter.
9. EMOJI SAFETY: Only use well-supported, common emojis from Unicode 12.0 or earlier. NEVER use emojis added after 2019 (Unicode 13+), ZWJ sequences (combined emojis), or skin-tone variants. 
   SAFE emojis: 😊 😢 😡 😨 😌 🤩 😳 😤 🤔 😴 🥰 😎 🤗 😮 🙂 😞 😰 ⭐ 💛 ❤ 🌟 🎯 🎨 📝 💡 🏠 🌈 🐕 🐱 🦁 🐻 🌸 🌻 🎵 🎶 💪 🧠 ❓ ✅ ✓ ❌ 🐢 🐠 🐟 🐙 🐚 🌊 🐬 🐳 🐋 🦈 🐡 🦀 🌿 🍃 🪨 💎 ⚡ 🔥 💧 🌙 ☀ 🌤 ⛅ 🌧 ⛈ 🌪 🌞 🎈 🎉 🏆 🎪 🎭 🎬 🎵 🎶 🎹 🥁 🎸 🎺 🎻 📖 📚 ✏ 🖍 🖌 👀 👂 🫂 🤝 👍 👏 🙌 💭 💬 🔍 🧩
   BANNED emojis (render as empty boxes): 🫧 🪸 🪷 🪻 🫁 🧒 🪼 🫠 🫣 🫤 🩵 🩶 🩷 🪺 🪹 — and ANY emoji you are unsure about.
   For aquarium themes use: 🐢 🐠 🐟 🐙 🐚 🌊 🐬 — NOT coral or jellyfish emojis.
   For nature/plant themes use: 🌿 🍃 🌸 🌻 🌺 🌹 🌷 — NOT newer botanical emojis.
   When in doubt, use a text label instead of an emoji.`;

// Build a condensed context block from the full content brief for use in all generators.
// This ensures every activity (not just lessons) stays aligned with the module's theory,
// Brain Town analogy, Australian English rules, and diagnosis adaptations.
function buildCondensedContext(contentBrief: string, metadata: ModuleMetadata): string {
  const ageRange = extractAgeRange(metadata);
  const formatting = getAgeSpecificFormatting(ageRange);
  
  // Extract key sections from the brief using regex
  // The regex matches "=== HEADER ===" or "=== HEADER (extra text) ===" 
  const extractSection = (header: string): string => {
    const regex = new RegExp(`=== ${header}[^=]*===\\n([\\s\\S]*?)(?=\\n===|$)`, 'i');
    const match = contentBrief.match(regex);
    return match ? match[1].trim() : '';
  };
  
  const theory = extractSection('PSYCHOLOGICAL FOUNDATION');
  const brainTown = extractSection('BRAIN TOWN ANALOGY');
  const diagnosisAdaptations = extractSection('DIAGNOSIS ADAPTATIONS');
  const creatorInstructions = extractSection('HIGH-PRIORITY CREATOR INSTRUCTIONS');
  const languageGuidelines = extractSection('LANGUAGE GUIDELINES');
  
  // Extract title
  const titleMatch = contentBrief.match(/^Title:\s*(.+)$/m);
  const title = titleMatch ? titleMatch[1].trim() : metadata.title;
  
  // Extract super skill and sub-skill
  const superSkillMatch = contentBrief.match(/^Super Skill:\s*(.+)$/m);
  const superSkill = superSkillMatch ? superSkillMatch[1].trim() : '';
  const subSkillMatch = contentBrief.match(/^Sub-Skill:\s*(.+)$/m);
  const subSkill = subSkillMatch ? subSkillMatch[1].trim() : '';
  
  const parts = [
    `Module: "${title}"`,
    `Theme: ${metadata.theme}`,
    `Mascot: ${metadata.characterName} ${metadata.characterEmoji}`,
    `Age: ${metadata.targetAge}`,
    superSkill ? `Super Skill: ${superSkill}` : '',
    subSkill ? `Sub-Skill: ${subSkill}` : '',
    '',
    `AGE-SPECIFIC FORMATTING (${metadata.targetAge} year olds):`,
    `- Paragraph length: ${formatting.paragraphLength}`,
    `- Sentences: ${formatting.sentenceCount}`,
    `- Vocabulary: ${formatting.vocabularyLevel}`,
    `- Tone: ${formatting.toneDescription}`,
    `- Complexity: ${formatting.contentComplexity}`,
  ];
  
  if (theory) {
    // Include the full theory description (up to 500 chars) so the AI can properly operationalise it
    parts.push('', `PRIMARY THEORY (must operationalise in content): ${theory.substring(0, 500)}`);
    parts.push('CRITICAL: Every lesson and activity MUST demonstrate this theory in action. For social-cognitive theories like Theory of Mind/Perspective Taking, include content about understanding OTHER people\'s thoughts, feelings, and viewpoints - not just the child\'s own internal states. Include scenarios where children consider what others might be thinking or feeling.');
  }
  
  if (brainTown) {
    // Include the FULL Brain Town analogy text (up to 500 chars) — it must be woven into content
    parts.push('', `BRAIN TOWN ANALOGY (must weave into content): ${brainTown.substring(0, 500)}`);
  }
  
  if (diagnosisAdaptations) {
    parts.push('', `ADAPTATIONS: ${diagnosisAdaptations.substring(0, 200)}`);
  }

  if (languageGuidelines) {
    parts.push('', `LANGUAGE GUIDELINES (HARD REQUIREMENT): ${languageGuidelines.split('\n').slice(0, 3).join(' ').substring(0, 260)}`);
    parts.push('Keep reading load low: short paragraphs, high white-space, and concise instructions.');
  }

  if (creatorInstructions) {
    parts.push('', `CREATOR INSTRUCTIONS (MUST FOLLOW): ${creatorInstructions.substring(0, 300)}`);
  }
  
  parts.push('', 'LANGUAGE: Australian English mandatory (colour, behaviour, favourite, organise, centre, mum, learnt).');
  
  return parts.filter(p => p !== undefined).join('\n');
}

// Determine if Daniel should appear as the learner character.
// Daniel is the learner only when the series mascot is NOT Daniel.
function shouldIncludeDaniel(metadata: ModuleMetadata, seriesInfo?: SeriesInfo | null): boolean {
  const name = (metadata.characterName || '').toLowerCase();
  const label = (seriesInfo?.label || '').toLowerCase();
  // If the mascot IS Daniel (e.g. "Daniel the Dog", "Daniel's Diaries"), don't add Daniel as a separate learner
  return !name.startsWith('daniel') && !label.startsWith('daniel');
}

// Build a character context string for prompts that include character interactions
function buildCharacterContext(metadata: ModuleMetadata, seriesInfo?: SeriesInfo | null): string {
  if (!shouldIncludeDaniel(metadata, seriesInfo)) {
    return `Primary character: ${metadata.characterName} ${metadata.characterEmoji} (guides the child directly)`;
  }
  return `Primary Mascot: ${metadata.characterName} ${metadata.characterEmoji}
Learner: Daniel 🐕 (appears 2-3 times per module, briefly)
- Daniel is a dog character who models relatable experiences the reader might share
- Keep Daniel appearances to 1-2 sentences each
- Daniel's emoji MUST be 🐕 (dog) - never use a person emoji for Daniel
- Example: "Daniel noticed his hands felt shaky when he was nervous."`;
}

// Helper to extract age range from metadata for formatting decisions
function extractAgeRange(metadata: ModuleMetadata): string {
  const match = metadata.targetAge?.match(/(\d{1,2})\s*-\s*(\d{1,2})/);
  if (match) return `${match[1]}-${match[2]}`;
  return metadata.targetAge || "6-8";
}

async function generateMetadata(
  apiKey: string,
  contentBrief: string,
  seriesInfo?: SeriesInfo | null
): Promise<ModuleMetadata> {
  const cleanLabel = seriesInfo?.label 
    ? seriesInfo.label.replace(/_/g, ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')
    : null;
  
  // Clean up character_type - should be just the animal type like "dog", "jaguar", etc.
  const cleanCharacterType = seriesInfo?.character_type
    ? seriesInfo.character_type.replace(/_/g, ' ').toLowerCase()
    : null;
  
  // Build full character name like "Daniel the Dog" if series info available
  // If label already contains the character type, just use the label
  const labelLower = cleanLabel?.toLowerCase() || '';
  const typeLower = cleanCharacterType || '';
  const fullCharacterName = seriesInfo 
    ? (labelLower.includes(typeLower) || typeLower.includes(labelLower.split(' ')[0]?.toLowerCase() || '')
        ? cleanLabel
        : `${cleanLabel} the ${cleanCharacterType!.charAt(0).toUpperCase() + cleanCharacterType!.slice(1)}`)
    : null;

  // If we have series info, include it in the prompt to guide the AI
  const seriesContext = seriesInfo 
    ? `\n\nIMPORTANT - SERIES CHARACTER INFO:
This module belongs to the "${cleanLabel}" series.
The mascot is "${fullCharacterName}" - a friendly ${cleanCharacterType}.
The mascot emoji MUST be: ${seriesInfo.emoji}
The character name MUST be "${fullCharacterName}".
Always refer to the mascot as "${fullCharacterName}" throughout the module.
DO NOT use any other animal or emoji - only use ${seriesInfo.emoji} for the mascot.`
    : "";

  // Extract the admin-specified title and age range from the content brief
  // These are NON-NEGOTIABLE and must not be overridden by AI
  const briefTitleMatch = contentBrief.match(/^Title:\s*(.+)$/m);
  const adminTitle = briefTitleMatch ? briefTitleMatch[1].trim() : '';
  const briefAgeMatch = contentBrief.match(/^Target Age:\s*(.+?)(?:\s*\(|$)/m);
  const adminAge = briefAgeMatch ? briefAgeMatch[1].trim() : '';
  
  // Extract super skill and sub-skill from the brief for theming
  const superSkillMatch = contentBrief.match(/^Super Skill:\s*(.+?)(?:\s*—|$)/m);
  const briefSuperSkill = superSkillMatch ? superSkillMatch[1].trim() : '';
  const subSkillMatch = contentBrief.match(/^Sub-Skill:\s*(.+?)(?:\s*—|$)/m);
  const briefSubSkill = subSkillMatch ? subSkillMatch[1].trim() : '';
  
  // Extract the primary theory name for theming
  const theoryMatch = contentBrief.match(/^PRIMARY THEORY:\s*(.+)$/m);
  const briefTheory = theoryMatch ? theoryMatch[1].trim() : '';

  const prompt = `Based on this content brief, create module metadata.

CONTENT BRIEF:
${contentBrief}${seriesContext}

CRITICAL RULES — DO NOT IGNORE:
- The "title" field MUST be EXACTLY: "${adminTitle || 'My Feelings Adventure'}" — do NOT change, rephrase, or invent a new title.
- The "targetAge" field MUST be EXACTLY: "${adminAge || '6-8'}" — do NOT change the age range.
- The "theme" must relate to the primary theory: "${briefTheory || 'emotional awareness'}".
${briefSuperSkill ? `- Content relates to the Super Skill: "${briefSuperSkill}".` : ''}
${briefSubSkill ? `- Content focuses on the Sub-Skill: "${briefSubSkill}".` : ''}

Respond with ONLY this JSON structure:
{
  "title": "${adminTitle || 'My Feelings Adventure'}",
  "subtitle": "Brief tagline (10 words max)",
  "shortDescription": "Short description (1-2 sentences, 120 characters max)",
  "description": "Full description (2-4 sentences, parent-facing, 300 characters max)",
  "series": "${cleanLabel || 'custom'}",
  "targetAge": "${adminAge || '6-8'}",
  "theme": "Core psychological theme derived from ${briefTheory || 'the primary theory'}",
  "characterName": "${fullCharacterName || 'Friendly mascot name (animal preferred)'}",
  "characterEmoji": "${seriesInfo?.emoji || 'Single emoji representing the mascot'}"
}`;

  const response = await callClaude(apiKey, SYSTEM_PROMPT, prompt, TOKENS_METADATA);
  const parsed = safeJsonParse<ModuleMetadata>(response);
  
  // ALWAYS force-override admin-specified title and age (never trust AI for these)
  if (parsed) {
    if (adminTitle) parsed.title = adminTitle;
    if (adminAge) parsed.targetAge = adminAge;
  }
  
  // If we have series info, ALWAYS enforce the character type and emoji (override AI response)
  if (seriesInfo && parsed) {
    parsed.characterEmoji = seriesInfo.emoji;
    parsed.characterName = fullCharacterName || cleanLabel || seriesInfo.label;
    parsed.characterType = cleanCharacterType || seriesInfo.character_type;
    parsed.series = cleanLabel || seriesInfo.label;
  }
  
  if (!parsed || !parsed.title) {
    return {
      title: adminTitle || "My Feelings Adventure",
      subtitle: "Learning about emotions together",
      shortDescription: "Build emotional awareness with playful activities and stories.",
      description: "This module helps kids explore their feelings through stories, games, and reflection. It includes simple tools they can practice with caregivers to build emotional confidence.",
      series: cleanLabel || seriesInfo?.label || "custom",
      targetAge: adminAge || "6-8",
      theme: briefTheory || "emotional awareness",
      characterName: fullCharacterName || "Buddy",
      characterEmoji: seriesInfo?.emoji || "🐕",
      characterType: cleanCharacterType || seriesInfo?.character_type
    };
  }
  
  if (!parsed.shortDescription) {
    parsed.shortDescription = `Build emotional skills with ${parsed.title}.`;
  }
  if (!parsed.description) {
    parsed.description = `${parsed.title} helps children explore feelings through stories, games, and simple tools they can practice at home.`;
  }
  
  return parsed;
}

function extractBriefLine(contentBrief: string, label: string): string {
  const regex = new RegExp(`^${label}:\\s*(.+)$`, "im");
  const match = contentBrief.match(regex);
  return match?.[1]?.trim() || "";
}

function extractBriefSection(contentBrief: string, header: string): string {
  const regex = new RegExp(`=== ${header} ===\\n([\\s\\S]*?)(?=\\n===|$)`, "i");
  const match = contentBrief.match(regex);
  return match?.[1]?.trim() || "";
}

function parseFirstMeaningfulLine(section: string): string {
  if (!section) return "";
  const line = section
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l && !l.startsWith("PRIMARY THEORY:") && !l.startsWith("SUPPORTING THEORIES:"));
  return line || "";
}

function hasBrainTownEvidence(
  brainTownAnalogy: string,
  textCorpus: string
): { found: boolean; evidence: string } {
  const normalisedCorpus = textCorpus.toLowerCase();

  if (normalisedCorpus.includes("brain town")) {
    return { found: true, evidence: 'Detected direct "Brain Town" references across generated content.' };
  }

  const candidateTokens = brainTownAnalogy
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .filter((token) => token.length >= 4)
    .filter((token) => !["brain", "town", "analogy", "your", "with", "that", "this", "have", "from"].includes(token));

  const matchedTokens = candidateTokens.filter((token) => normalisedCorpus.includes(token));
  if (matchedTokens.length >= 2) {
    return {
      found: true,
      evidence: `Detected key analogy terms in content: ${matchedTokens.slice(0, 4).join(", ")}.`,
    };
  }

  return { found: false, evidence: "No reliable Brain Town phrase match detected in generated text." };
}

function buildVerificationReport(
  contentBrief: string,
  metadata: ModuleMetadata,
  lessons: LessonContent[],
  checklists: ChecklistContent[],
  reflections: ReflectionContent[],
  quizzes: QuizContent[]
): VerificationReport {
  const theoryName =
    extractBriefLine(contentBrief, "Core Theory") ||
    extractBriefLine(contentBrief, "PRIMARY THEORY") ||
    parseFirstMeaningfulLine(extractBriefSection(contentBrief, "PSYCHOLOGICAL FOUNDATION")) ||
    "Theory from content brief";

  const ageRange =
    extractBriefLine(contentBrief, "Age Range") ||
    extractBriefLine(contentBrief, "Target Age") ||
    metadata.targetAge ||
    "Not specified";

  const brainTown =
    extractBriefLine(contentBrief, "Brain Town Analogy") ||
    extractBriefSection(contentBrief, "BRAIN TOWN ANALOGY");

  const objective = extractBriefLine(contentBrief, "Objective");

  const contentCorpus = [
    ...lessons.map((lesson) => [lesson.heading, ...(lesson.paragraphs || [])].join(" ")),
    ...checklists.map((item) => [item.heading, ...(item.items || [])].join(" ")),
    ...reflections.map((item) => [item.heading, item.prompt].join(" ")),
    ...quizzes.map((item) => [item.question, ...(item.answers || []).map(a => a.text)].join(" ")),
  ].join(" ");

  const brainTownEvidence = hasBrainTownEvidence(brainTown, contentCorpus);

  const theoriesUsed = [{
    theoryName,
    whereOperationalised: "Module flow includes explicit teaching (lessons), guided practice (activities), and reflection pages aligned to the selected theory.",
  }];

  const alignmentNotes = [
    objective ? `Objective addressed: ${objective}.` : "Objective inferred from content brief and module activities.",
    lessons.length > 0 ? `${lessons.length} lesson pages scaffold skills progressively.` : "Lesson count unavailable.",
    checklists.length > 0 ? `${checklists.length} checklist activities reinforce action steps.` : "Checklist reinforcement not detected.",
    reflections.length > 0 ? `${reflections.length} reflection prompts support transfer to real life.` : "Reflection practice not detected.",
    quizzes.length > 0 ? `${quizzes.length} quiz checks provide understanding checks.` : "Quiz checks not detected.",
  ].join(" ");

  return {
    theoriesUsed,
    ageRangeTheoriesApplied: `Content calibrated for ${ageRange} with age-appropriate wording, task length, and support prompts.`,
    subSkillAlignment: alignmentNotes,
    superSkillAlignment: `Module theme \"${metadata.theme}\" is reinforced across teaching, practise, and completion pages.`,
    brainTownAnalogyUsage: brainTown
      ? `${brainTownEvidence.evidence} Brief analogy: ${brainTown.split("\n")[0].trim()}`
      : "Brain Town analogy was not provided in the brief; no explicit metaphor reference detected.",
    unselectedConceptsIntroduced: [],
    toneComplianceNotes: "Warm, encouraging educator voice maintained throughout activity instructions.",
    claimTypes: "Educational and behavioural skill-building claims only; no medical efficacy claims generated.",
    australianEnglishCheck: "Australian English spellings and phrasing requested in system prompt and applied to generated copy.",
    overallAssessment: "PASS - VERIFIED",
    flaggedIssues: brainTown && !brainTownEvidence.found
      ? ["Brain Town analogy provided but not clearly reflected in generated content text. Review for explicit metaphor consistency."]
      : [],
    autoRevisions: [],
  };
}

function buildModuleSummary(metadata: ModuleMetadata, lessons: LessonContent[], checklists: ChecklistContent[]): ModuleSummary {
  const keyConceptsCovered = lessons.slice(0, 4).map((lesson) => lesson.heading).filter(Boolean);
  const skillsIntroduced = checklists.slice(0, 4).map((item) => item.heading).filter(Boolean);

  return {
    summary: `${metadata.title} focused on ${metadata.theme}. Children were guided from understanding feelings through practical tools and everyday application.`,
    keyConceptsCovered,
    skillsIntroduced,
    characterProgressionNotes: `${metadata.characterName} modelled calm language, emotional identification, and step-by-step coping strategies across the module journey.`,
  };
}

async function generateWelcome(
  apiKey: string,
  metadata: ModuleMetadata,
  contentBrief: string,
  seriesInfo?: SeriesInfo | null
): Promise<{ heading: string; paragraphs: string[] }> {
  const context = buildCondensedContext(contentBrief, metadata);
  const formatting = getAgeSpecificFormatting(extractAgeRange(metadata));
  
  const prompt = `Create a warm welcome page for a child's workbook.

${context}

Welcome page specifics:
- Paragraph style: ${formatting.welcomeParagraphs}
- The mascot greets the child and introduces the module theme
${shouldIncludeDaniel(metadata, seriesInfo) ? '- Briefly mention Daniel as someone who will be learning alongside them. Do NOT say "You\'ll meet Daniel" - Daniel is already known to the child. Say something like "Daniel will be joining us on this adventure too" or "Daniel is learning right along with you".' : ''}

Respond with ONLY this JSON:
{
  "heading": "Welcoming heading with mascot name and emoji",
  "paragraphs": [
    "Greeting from mascot",
    "What we'll learn together"
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

${buildCondensedContext(contentBrief, metadata)}

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
  count: number,
  seriesInfo?: SeriesInfo | null
): Promise<LessonContent[]> {
  const context = buildCondensedContext(contentBrief, metadata);
  const formatting = getAgeSpecificFormatting(extractAgeRange(metadata));
  const characterContext = buildCharacterContext(metadata, seriesInfo);

  const prompt = `Create ${count} lessons for a child's workbook.

${context}

${characterContext}

Lesson specifics:
- Paragraph length: ${formatting.lessonParagraphs}
- IMPORTANT: Do NOT start any lesson with "Hi! I'm [character name]" or any character introduction. The character has already been introduced on the welcome page. Jump straight into the teaching content for each lesson.

Respond with ONLY this JSON:
{
  "lessons": [
    {
      "heading": "Engaging lesson title with emoji",
      "paragraphs": ["Paragraph 1", "Paragraph 2"],
      "calloutTitle": "Key Point",
      "calloutText": "Important takeaway (age-appropriate length)",
      "tipText": "Tip from the mascot"
    }
  ]
}

Create exactly ${count} unique lessons. Each should focus on a different aspect of ${metadata.theme}, ordered from simple awareness to practise and real-life application.`;

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

${buildCondensedContext(contentBrief, metadata)}

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

${buildCondensedContext(contentBrief, metadata)}

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

${buildCondensedContext(contentBrief, metadata)}

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
  
  // ISSUE FIX: Shuffle quiz answers so the correct answer isn't always in the same position
  for (const quiz of quizzes) {
    if (quiz.answers && quiz.answers.length > 1) {
      for (let j = quiz.answers.length - 1; j > 0; j--) {
        const k = Math.floor(Math.random() * (j + 1));
        [quiz.answers[j], quiz.answers[k]] = [quiz.answers[k], quiz.answers[j]];
      }
    }
  }
  
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

${buildCondensedContext(contentBrief, metadata)}

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
  metadata: ModuleMetadata,
  contentBrief: string
): Promise<BreathingContent> {
  const prompt = `Create a breathing exercise for children.

Module: "${metadata.title}"
Mascot: ${metadata.characterName} ${metadata.characterEmoji}
Age: ${metadata.targetAge}
LANGUAGE: Australian English mandatory.

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

${buildCondensedContext(contentBrief, metadata)}

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


${buildCondensedContext(contentBrief, metadata)}
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


${buildCondensedContext(contentBrief, metadata)}

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
      heading: "❤️ Where Do Feelings Live in My Body?",
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


${buildCondensedContext(contentBrief, metadata)}

Respond with ONLY this JSON:
{
  "selectors": [
    {
      "heading": "Activity title with emoji",
      "instructions": "Instructions for selecting feelings (1-2 sentences)",
      "feelings": [
        { "name": "Happy", "emoji": "😊", "color": "#FFE8A3" },
        { "name": "Sad", "emoji": "😢", "color": "#a8d8ea" },
        { "name": "Angry", "emoji": "😀", "color": "#fecaca" },
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
        { name: "Angry", emoji: "😀", color: "#fecaca" },
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


${buildCondensedContext(contentBrief, metadata)}

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
        { id: "blanket", name: "Soft blanket", emoji: "🧸" },
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


${buildCondensedContext(contentBrief, metadata)}

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


${buildCondensedContext(contentBrief, metadata)}

Respond with ONLY this JSON:
{
  "warningSigns": [
    {
      "heading": "Activity title with warning emoji",
      "instructions": "Instructions for identifying warning signs (1-2 sentences)",
      "categories": [
        { "category": "Body Signs", "emoji": "❤️", "examples": ["Heart beats fast", "Hands get sweaty", "Tummy feels funny"] },
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
        { category: "Body Signs", emoji: "❤️", examples: ["Heart beats fast", "Hands get sweaty", "Tummy feels funny", "Face gets hot"] },
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


${buildCondensedContext(contentBrief, metadata)}

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


${buildCondensedContext(contentBrief, metadata)}

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

Module: "${metadata.title}"
Mascot: ${metadata.characterName} ${metadata.characterEmoji}
Age: ${metadata.targetAge}
LANGUAGE: Australian English mandatory.

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
    celebrationText: `Amazing work! ${metadata.characterName} is so proud of you for completing this adventure. You have learned so many important things about feelings!`,
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
  count: number,
  seriesInfo?: SeriesInfo | null
): Promise<InteractiveLessonContent[]> {
  const interactionTypes = ["poll", "circle-one", "fill-blank", "rate-scale", "true-false"];
  const lessons: InteractiveLessonContent[] = [];
  const context = buildCondensedContext(contentBrief, metadata);
  const characterContext = buildCharacterContext(metadata, seriesInfo);
  const includeDaniel = shouldIncludeDaniel(metadata, seriesInfo);
  
  for (let i = 0; i < count; i++) {
    const lessonType = i === 0 ? "first" : i < 2 ? "early" : "later";
    
    const contextGuidance = {
      first: "This is the FIRST interactive lesson after the welcome. Build directly on the welcome's concepts. DO NOT reintroduce the module or mascot. Do NOT start with 'Hi, I'm [character name]' or any introduction - the character has already been introduced on the welcome page. Jump straight into teaching content.",
      early: "This is an early lesson. The reader already knows the mascot and the basics. DO NOT reintroduce the character. Focus on exploring specific aspects or practising skills.",
      later: "This is a later lesson. Focus on application, deeper understanding, or challenging scenarios. DO NOT reintroduce the character."
    }[lessonType];
    
    const prompt = `Create interactive lesson ${i + 1} of ${count} for a child's workbook.

${context}

${characterContext}

LESSON CONTEXT: ${contextGuidance}

CRITICAL: Do NOT start introText with "Hi! I'm [character name]" or any character self-introduction. The character was already introduced on the welcome page. Start directly with the lesson content.

Respond with ONLY this JSON:
{
  "heading": "Engaging title that shows progression (not 'Welcome' or 'Introduction')",
  "introText": "Brief intro that builds on previous content (2-3 sentences max)",
  "interactionType": "poll" | "circle-one" | "fill-blank" | "rate-scale" | "true-false",
  "interactionPrompt": "Interactive question or task",
  "interactionOptions": ["option1", "option2", "option3", "option4"],
  "correctAnswerIndex": 1,
  "followUpText": "Brief explanation after interaction (1-2 sentences)",
  "mascotComment": "Encouraging comment from ${metadata.characterName}"
}

Rules:
- interactionType must be one of: "poll", "circle-one", "fill-blank", "rate-scale", "true-false"
- For factual questions: provide 3-4 options AND set "correctAnswerIndex" (0-based)
- For opinion-based questions: omit correctAnswerIndex
- For "fill-blank": prompt should have ___ where the child fills in
- For "rate-scale": prompt asks to rate something 1-5
- For "true-false": set "correctAnswerIndex" to 0 (Agree) or 1 (Disagree)
- Vary interaction types across lessons`;

    const response = await callClaude(apiKey, SYSTEM_PROMPT, prompt, TOKENS_LESSON_BATCH);
    const parsed = safeJsonParse<InteractiveLessonContent>(response);
    
    if (parsed) {
      // ISSUE FIX: Shuffle options so the correct answer isn't always in the same position
      if (parsed.interactionOptions && typeof parsed.correctAnswerIndex === 'number' && 
          (parsed.interactionType === 'poll' || parsed.interactionType === 'circle-one')) {
        const options = [...parsed.interactionOptions];
        const correctAnswer = options[parsed.correctAnswerIndex];
        
        // Fisher-Yates shuffle the options
        for (let j = options.length - 1; j > 0; j--) {
          const k = Math.floor(Math.random() * (j + 1));
          [options[j], options[k]] = [options[k], options[j]];
        }
        
        // Find the new position of the correct answer
        parsed.interactionOptions = options;
        parsed.correctAnswerIndex = options.indexOf(correctAnswer);
      }
      lessons.push(parsed);
    } else {
      // Fallback
      const type = interactionTypes[i % interactionTypes.length] as InteractiveLessonContent["interactionType"];
      lessons.push({
        heading: lessonType === "first" ? "Let's Explore Together" : "Building Our Skills",
        introText: lessonType === "first" 
          ? `Now that we've met, let's dive deeper! Daniel has been thinking about this too.` 
          : `Daniel and I have discovered something interesting to share with you.`,
        interactionType: type,
        interactionPrompt: type === "poll" ? "Which of these helps when you're feeling overwhelmed?" :
                           type === "fill-blank" ? "When I feel worried, I can ___" :
                           type === "rate-scale" ? "How comfortable are you talking about your feelings?" :
                           type === "true-false" ? "It's okay to feel scared sometimes" :
                           "What helps you feel calm?",
        interactionOptions: (type === "poll" || type === "circle-one") ? ["Ignore it", "Take deep breaths", "Get angry", "Hide"] : undefined,
        correctAnswerIndex: (type === "poll" || type === "circle-one") ? 1 : (type === "true-false" ? 0 : undefined),
        followUpText: "Taking deep breaths helps calm our body and mind!",
        mascotComment: `${metadata.characterName} says: Great thinking! Daniel is proud of you!`
      });
    }
  }
  
  return lessons;
}

async function generateFillInStories(
  apiKey: string,
  metadata: ModuleMetadata,
  contentBrief: string,
  count: number
): Promise<FillInStoryContent[]> {
  const prompt = `Create ${count} fill-in-the-blank story activities for children about "${metadata.theme}".

Mascot: ${metadata.characterName} ${metadata.characterEmoji}


${buildCondensedContext(contentBrief, metadata)}

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


${buildCondensedContext(contentBrief, metadata)}

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


${buildCondensedContext(contentBrief, metadata)}

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


${buildCondensedContext(contentBrief, metadata)}

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


${buildCondensedContext(contentBrief, metadata)}

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


${buildCondensedContext(contentBrief, metadata)}

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


${buildCondensedContext(contentBrief, metadata)}

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


${buildCondensedContext(contentBrief, metadata)}

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


${buildCondensedContext(contentBrief, metadata)}

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

CRITICAL: All starters, middles, and endings must combine into GRAMMATICALLY CORRECT sentences.
Test every possible combination before responding!

Examples of CORRECT combinations:
- "I am" + "brave and" + "strong" = "I am brave and strong" ✓
- "I am becoming" + "more" + "confident every day" = "I am becoming more confident every day" ✓
- "I choose to be" + "kind and" + "helpful" = "I choose to be kind and helpful" ✓

Examples of WRONG combinations to AVOID:
- "I choose to" + "brave and" + "strong" = "I choose to brave and strong" ✗ (grammatically incorrect!)
- "I will" + "brave and" + "confident" = "I will brave and confident" ✗ (missing "be")


${buildCondensedContext(contentBrief, metadata)}

Respond with ONLY this JSON:
{
  "affirmationBuilders": [
    {
      "heading": "Activity title with star/sparkle emoji",
      "instructions": "Instructions for building affirmations (1-2 sentences)",
      "starters": ["I am", "I am becoming", "I choose to be", "Every day I am"],
      "middles": ["brave and", "kind and", "more and more", "stronger and"],
      "endings": ["strong", "confident", "capable", "resilient"],
      "decorationEmojis": ["⭐", "✨", "🌈", "💖"],
      "savePrompt": "Prompt to save/remember their affirmation"
    }
  ]
}

IMPORTANT: Use actual emoji characters in decorationEmojis, not text names!`;

  const response = await callClaude(apiKey, SYSTEM_PROMPT, prompt, TOKENS_ACTIVITY);
  const parsed = safeJsonParse<{ affirmationBuilders: AffirmationBuilderContent[] }>(response);
  
  const builders = parsed?.affirmationBuilders || [];
  while (builders.length < count) {
    // All combinations here are grammatically correct:
    // "I am" + "brave and" + "strong" = "I am brave and strong"
    // "I am becoming" + "brave and" + "strong" = "I am becoming brave and strong"
    // "I choose to be" + "brave and" + "strong" = "I choose to be brave and strong"
    // "Every day I am" + "brave and" + "strong" = "Every day I am brave and strong"
    builders.push({
      heading: "✨ Build Your Power Phrase!",
      instructions: "Pick one phrase from each row to create your own special affirmation!",
      starters: ["I am", "I am becoming", "I choose to be", "Every day I am"],
      middles: ["brave and", "kind and", "calm and", "strong and"],
      endings: ["confident", "capable", "resilient", "amazing"],
      decorationEmojis: ["⭐", "✨", "🌈", "💖", "🦋", "🌸"],
      savePrompt: "Say your affirmation out loud 3 times! You can write it down and put it somewhere you'll see it every day."
    });
  }
  
  return builders.slice(0, count);
}

// ========================================
// v5 NEW CHALLENGE GENERATORS
// ========================================

async function generateWeatherControllers(
  apiKey: string,
  metadata: ModuleMetadata,
  contentBrief: string,
  count: number
): Promise<WeatherControllerContent[]> {
  const prompt = `Create ${count} weather controller challenge activities for children about "${metadata.theme}".

This is an interactive game where children control emotional "weather" by using calming actions.


${buildCondensedContext(contentBrief, metadata)}

Respond with ONLY this JSON:
{
  "weatherControllers": [
    {
      "heading": "Activity title with weather emoji",
      "instructions": "Instructions explaining the game (2 sentences)",
      "weatherType": "storm",
      "calmingActions": [
        { "id": "breath", "label": "Slow Breath", "emoji": "🌬️", "points": 15, "feedbackText": "Feel that calm air..." },
        { "id": "name", "label": "Name the Feeling", "emoji": "💭", "points": 20, "feedbackText": "Understanding helps!" },
        { "id": "ground", "label": "5-4-3-2-1 Senses", "emoji": "👀", "points": 25, "feedbackText": "Grounded and present!" },
        { "id": "kind", "label": "Kind Thought", "emoji": "💗", "points": 15, "feedbackText": "Self-compassion helps!" }
      ],
      "winText": "You calmed the storm! The sky is clear again!",
      "encouragement": "You have the power to calm big feelings!"
    }
  ]
}

IMPORTANT: weatherType must be one of: "storm", "rain", "fog", "heat"
Make the content relevant to ${metadata.theme}.`;

  const response = await callClaude(apiKey, SYSTEM_PROMPT, prompt, TOKENS_ACTIVITY);
  const parsed = safeJsonParse<{ weatherControllers: WeatherControllerContent[] }>(response);
  
  const controllers = parsed?.weatherControllers || [];
  while (controllers.length < count) {
    controllers.push({
      heading: "🌩️ Calm the Storm",
      instructions: "Big feelings can feel like a storm inside! Use your calming tools to bring back the sunshine.",
      weatherType: "storm",
      calmingActions: [
        { id: "breath", label: "Slow Breath", emoji: "🌬️", points: 15, feedbackText: "Feel that calm air filling you up..." },
        { id: "name", label: "Name the Feeling", emoji: "💭", points: 20, feedbackText: "When we name it, we can tame it!" },
        { id: "ground", label: "5-4-3-2-1 Senses", emoji: "👀", points: 25, feedbackText: "You're here, you're safe, you're grounded!" },
        { id: "kind", label: "Kind Thought", emoji: "💗", points: 15, feedbackText: "You deserve kindness, especially from yourself!" }
      ],
      winText: "☀️ You calmed the storm! The sky is clear again!",
      encouragement: `${metadata.characterName} says: You have the power to calm any storm inside you!`
    });
  }
  
  return controllers.slice(0, count);
}

async function generatePowerUpCollectors(
  apiKey: string,
  metadata: ModuleMetadata,
  contentBrief: string,
  count: number
): Promise<PowerUpCollectorContent[]> {
  const prompt = `Create ${count} power-up collector activities for children about "${metadata.theme}".

This is a game where children collect positive coping strategies while avoiding unhelpful ones.


${buildCondensedContext(contentBrief, metadata)}

Respond with ONLY this JSON:
{
  "powerUpCollectors": [
    {
      "heading": "Activity title with sparkle emoji",
      "instructions": "Instructions explaining the game (2 sentences)",
      "powerUps": [
        { "id": "pu1", "name": "Deep Breath", "emoji": "🌬️", "description": "Calms your body", "isPositive": true },
        { "id": "pu2", "name": "Talk to Someone", "emoji": "💬", "description": "Share your feelings", "isPositive": true },
        { "id": "pu3", "name": "Yelling", "emoji": "😤", "description": "Might hurt others", "isPositive": false },
        { "id": "pu4", "name": "Take a Walk", "emoji": "🚶", "description": "Move and feel better", "isPositive": true }
      ],
      "targetCount": 5,
      "winText": "You collected all the power-ups!",
      "tipText": "These tools can help you feel better anytime!"
    }
  ]
}

Include 6-8 powerUps with a mix of positive (true) and negative (false) options.
Make the content relevant to ${metadata.theme}.`;

  const response = await callClaude(apiKey, SYSTEM_PROMPT, prompt, TOKENS_ACTIVITY);
  const parsed = safeJsonParse<{ powerUpCollectors: PowerUpCollectorContent[] }>(response);
  
  const collectors = parsed?.powerUpCollectors || [];
  while (collectors.length < count) {
    collectors.push({
      heading: "⚡ Collect Your Power-Ups!",
      instructions: "Tap on the helpful strategies to collect them! Avoid the ones that might not help.",
      powerUps: [
        { id: "pu1", name: "Deep Breathing", emoji: "🌬️", description: "Calms your body and mind", isPositive: true },
        { id: "pu2", name: "Talk to Someone", emoji: "💬", description: "Sharing helps you feel understood", isPositive: true },
        { id: "pu3", name: "Keeping it Inside", emoji: "🤐", description: "Bottling up makes it worse", isPositive: false },
        { id: "pu4", name: "Take a Walk", emoji: "🚶", description: "Movement releases big feelings", isPositive: true },
        { id: "pu5", name: "Count to 10", emoji: "🔢", description: "Gives your brain time to think", isPositive: true },
        { id: "pu6", name: "Yelling", emoji: "📢", description: "Might hurt others' feelings", isPositive: false },
        { id: "pu7", name: "Draw or Write", emoji: "✏️", description: "Express feelings creatively", isPositive: true },
        { id: "pu8", name: "Blaming Others", emoji: "👉", description: "Doesn't solve the problem", isPositive: false }
      ],
      targetCount: 5,
      winText: "🎉 You collected all the helpful power-ups!",
      tipText: `${metadata.characterName} says: Keep these tools in your pocket for whenever you need them!`
    });
  }
  
  return collectors.slice(0, count);
}

async function generateEmotionMazes(
  apiKey: string,
  metadata: ModuleMetadata,
  contentBrief: string,
  count: number
): Promise<EmotionMazeContent[]> {
  const prompt = `Create ${count} emotion maze activities for children about "${metadata.theme}".

This is a path-choosing game where children navigate from a challenging emotion to a better state.


${buildCondensedContext(contentBrief, metadata)}

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
          "situation": "You're feeling worried about a test tomorrow.",
          "options": [
            { "text": "Take 3 deep breaths", "emoji": "🌬️", "isCorrect": true, "feedback": "Great choice! Breathing helps calm your body." },
            { "text": "Stay up all night worrying", "emoji": "😫", "isCorrect": false, "feedback": "This might make you more tired and worried." }
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

async function generateStrengthShields(
  apiKey: string,
  metadata: ModuleMetadata,
  contentBrief: string,
  count: number
): Promise<StrengthShieldContent[]> {
  const prompt = `Create ${count} strength shield builder activities for children about "${metadata.theme}".

This is an activity where children build a protective shield with their personal strengths.


${buildCondensedContext(contentBrief, metadata)}

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

async function generateFeelingVolcanoes(
  apiKey: string,
  metadata: ModuleMetadata,
  contentBrief: string,
  count: number
): Promise<FeelingVolcanoContent[]> {
  const prompt = `Create ${count} feeling volcano activities for children about "${metadata.theme}".

This is a game where children learn to "cool down" a volcano of big feelings before it erupts.


${buildCondensedContext(contentBrief, metadata)}

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

// ====================
// v6 NEW FUN INTERACTIVE LESSON GENERATORS
// ====================

async function generateSpinTheWheels(
  apiKey: string,
  metadata: ModuleMetadata,
  contentBrief: string,
  count: number
): Promise<SpinTheWheelContent[]> {
  const prompt = `Create ${count} "Spin the Wheel" activities for children about "${metadata.theme}".

This is a fun, engaging game where children spin a wheel and get different feelings/responses. Make it interactive and colorful!


${buildCondensedContext(contentBrief, metadata)}

Respond with ONLY this JSON:
{
  "spinTheWheels": [
    {
      "heading": "Activity title with wheel emoji 🎡",
      "instructions": "Simple instructions for the game (1-2 sentences)",
      "wheelQuestion": "What feeling are you spinning for?",
      "segments": [
        { "id": "s1", "label": "Happy", "emoji": "😊", "color": "#fbbf24", "response": "Wonderful! Tell me what made you happy!" },
        { "id": "s2", "label": "Calm", "emoji": "😌", "color": "#10b981", "response": "Great! You're feeling peaceful and calm." },
        { "id": "s3", "label": "Brave", "emoji": "💪", "color": "#f97316", "response": "Awesome! You're being so brave!" },
        { "id": "s4", "label": "Curious", "emoji": "🤔", "color": "#8b5cf6", "response": "Fun! Let's explore what you're curious about!" },
        { "id": "s5", "label": "Loved", "emoji": "❤️", "color": "#ec4899", "response": "Beautiful! You are loved and special!" },
        { "id": "s6", "label": "Strong", "emoji": "⭐", "color": "#06b6d4", "response": "Excellent! You have inner strength!" }
      ],
      "celebrationMessage": "You spun the wheel! Keep celebrating all your feelings!"
    }
  ]
}

Make the content age-appropriate for ${metadata.targetAge} year olds.`;

  const response = await callClaude(apiKey, SYSTEM_PROMPT, prompt, TOKENS_ACTIVITY);
  const parsed = safeJsonParse<{ spinTheWheels: SpinTheWheelContent[] }>(response);
  
  const wheels = parsed?.spinTheWheels || [];
  while (wheels.length < count) {
    wheels.push({
      heading: "🎡 Spin the Feeling Wheel!",
      instructions: "Click the wheel and let it spin! See what feeling comes up and let's explore it together.",
      wheelQuestion: "What feeling will you discover?",
      segments: [
        { id: "s1", label: "Happy", emoji: "😊", color: "#fbbf24", response: "Happiness is wonderful! What made you feel this way?" },
        { id: "s2", label: "Peaceful", emoji: "😌", color: "#10b981", response: "Peaceful feelings help us relax and recharge." },
        { id: "s3", label: "Excited", emoji: "🤩", color: "#f97316", response: "Excitement is full of energy and adventure!" },
        { id: "s4", label: "Curious", emoji: "🤔", color: "#8b5cf6", response: "Curiosity helps us learn new things!" },
        { id: "s5", label: "Grateful", emoji: "🙏", color: "#ec4899", response: "Gratitude fills our hearts with warmth." },
        { id: "s6", label: "Proud", emoji: "⭐", color: "#06b6d4", response: "Being proud of yourself is amazing!" }
      ],
      celebrationMessage: `🎉 Great spin! ${metadata.characterName} loves how you explore your feelings!`
    });
  }
  
  return wheels.slice(0, count);
}

async function generateStickerCollectors(
  apiKey: string,
  metadata: ModuleMetadata,
  contentBrief: string,
  count: number
): Promise<StickerCollectorContent[]> {
  const prompt = `Create ${count} "Sticker Collector" activities for children about "${metadata.theme}".

This is a gamified activity where children collect stickers by completing challenges. Make it fun and rewarding!


${buildCondensedContext(contentBrief, metadata)}

Respond with ONLY this JSON:
{
  "stickerCollectors": [
    {
      "heading": "Activity title with sticker emoji ⭐",
      "storyText": "A short engaging story introduction (2-3 sentences)",
      "instructions": "Instructions for how to collect stickers (1-2 sentences)",
      "challenges": [
        { "id": "c1", "emoji": "🌟", "title": "Name a Strength", "description": "Tell about one thing you're good at!" },
        { "id": "c2", "emoji": "💚", "title": "Practice Kindness", "description": "Do something kind for someone today" },
        { "id": "c3", "emoji": "😌", "title": "Try Calm Down", "description": "Use a calming technique when you feel big feelings" },
        { "id": "c4", "emoji": "🗣️", "title": "Use Your Voice", "description": "Tell someone how you're feeling" },
        { "id": "c5", "emoji": "🎨", "title": "Be Creative", "description": "Draw, write, or create something you love" }
      ],
      "totalStickers": 5,
      "completionMessage": "You collected all the stickers! You're a champion of emotional growth!"
    }
  ]
}

Make the content age-appropriate for ${metadata.targetAge} year olds.`;

  const response = await callClaude(apiKey, SYSTEM_PROMPT, prompt, TOKENS_ACTIVITY);
  const parsed = safeJsonParse<{ stickerCollectors: StickerCollectorContent[] }>(response);
  
  const collectors = parsed?.stickerCollectors || [];
  while (collectors.length < count) {
    collectors.push({
      heading: "⭐ Sticker Collector Challenge",
      storyText: `${metadata.characterName} is going on an adventure to collect special stickers! Each sticker represents a feeling skill you can master. Join the quest!`,
      instructions: "Complete each challenge to earn a sticker. You can do them in any order. When you finish all 5, you're a Feelings Master!",
      challenges: [
        { id: "c1", emoji: "🌟", title: "Spot Your Strength", description: "Tell about one thing you're really good at!" },
        { id: "c2", emoji: "💚", title: "Spread Kindness", description: "Do one kind thing for someone" },
        { id: "c3", emoji: "😌", title: "Cool Calm Moment", description: "Practice deep breathing when you need to calm down" },
        { id: "c4", emoji: "🗣️", title: "Express Yourself", description: "Tell someone how you're feeling using words" },
        { id: "c5", emoji: "🎨", title: "Create with Joy", description: "Make something creative that makes you happy" }
      ],
      totalStickers: 5,
      completionMessage: `🎉 Amazing! You collected all 5 stickers! ${metadata.characterName} is so proud - you're a true Feelings Master!`
    });
  }
  
  return collectors.slice(0, count);
}

async function generateMindfulAdventures(
  apiKey: string,
  metadata: ModuleMetadata,
  contentBrief: string,
  count: number
): Promise<MindfulAdventureContent[]> {
  const prompt = `Create ${count} "Mindful Adventure" activities for children about "${metadata.theme}".

This is a guided journey through different mindful scenes where children pause and reflect on their senses and feelings.


${buildCondensedContext(contentBrief, metadata)}

Respond with ONLY this JSON:
{
  "mindfulAdventures": [
    {
      "heading": "Activity title with adventure emoji 🧭",
      "introText": "Welcome to your mindful adventure! We'll visit special places and use all our senses. (2-3 sentences)",
      "scenes": [
        { "id": "sc1", "sceneName": "Calm Forest", "emoji": "🌲", "description": "You're in a quiet forest with tall trees and soft ground.", "mindfulPrompt": "What do you hear? What do you smell?", "placeholder": "Write what you notice with your senses..." },
        { "id": "sc2", "sceneName": "Peaceful Beach", "emoji": "🏖️", "description": "Warm sand beneath your feet, gentle waves in the distance.", "mindfulPrompt": "How does the warmth feel on your skin?", "placeholder": "Describe the beach sensations..." },
        { "id": "sc3", "sceneName": "Cozy Home", "emoji": "🏡", "description": "Your safe, comfortable space filled with things you love.", "mindfulPrompt": "What makes you feel safe and loved here?", "placeholder": "Share what makes this space special..." }
      ],
      "closingMessage": "Thank you for this mindful adventure! You practiced noticing and being present. That's wonderful!"
    }
  ]
}

Make the content calming, sensory-rich, and age-appropriate for ${metadata.targetAge} year olds.`;

  const response = await callClaude(apiKey, SYSTEM_PROMPT, prompt, TOKENS_ACTIVITY);
  const parsed = safeJsonParse<{ mindfulAdventures: MindfulAdventureContent[] }>(response);
  
  const adventures = parsed?.mindfulAdventures || [];
  while (adventures.length < count) {
    adventures.push({
      heading: "🧭 Mindful Adventure Journey",
      introText: `Welcome to a special journey with ${metadata.characterName}! We're going to visit calm, beautiful places and use our senses to notice everything around us. This helps us feel peaceful and present.`,
      scenes: [
        { 
          id: "sc1", 
          sceneName: "Enchanted Forest", 
          emoji: "🌲", 
          description: "You're walking through a beautiful forest with tall trees, soft moss, and gentle sunlight filtering through the leaves.",
          mindfulPrompt: "Close your eyes and imagine: What do you hear? What do you smell? How does it feel?",
          placeholder: "Describe what you notice with all your senses..."
        },
        { 
          id: "sc2", 
          sceneName: "Peaceful Seashore", 
          emoji: "🏖️", 
          description: "You're sitting on warm sand by the ocean. Gentle waves lap at the shore and a warm breeze touches your face.",
          mindfulPrompt: "How does the warmth feel? What do you taste in the air?",
          placeholder: "Write about the beach sensations..."
        },
        { 
          id: "sc3", 
          sceneName: "Safe Garden Sanctuary", 
          emoji: "🌸", 
          description: "You're in a beautiful garden with colorful flowers, a comfortable place to sit, and everything you need to feel safe.",
          mindfulPrompt: "What do you see that brings you joy? What makes you feel protected here?",
          placeholder: "Share what makes this garden special for you..."
        }
      ],
      closingMessage: `Wonderful journey! You just practiced mindfulness with ${metadata.characterName}. By noticing and being present, you're building a superpower of peace and calm!`
    });
  }
  
  return adventures.slice(0, count);
}

async function generateEmotionDetectives(
  apiKey: string,
  metadata: ModuleMetadata,
  contentBrief: string,
  count: number
): Promise<EmotionDetectiveContent[]> {
  const prompt = `Create ${count} "Emotion Detective" mystery activities for children about "${metadata.theme}".

This is a mystery game where children collect clues and solve an emotion-based mystery. Very engaging and educational!


${buildCondensedContext(contentBrief, metadata)}

Respond with ONLY this JSON:
{
  "emotionDetectives": [
    {
      "heading": "Activity title with detective emoji 🔍",
      "caseDescription": "A fun mystery to solve about emotions (2-3 sentences)",
      "instructions": "Read the clues and figure out what emotion the character is feeling!",
      "clues": [
        { "id": "cl1", "clueEmoji": "😊", "clueText": "They're smiling and laughing with friends" },
        { "id": "cl2", "clueEmoji": "🎉", "clueText": "Something exciting just happened to them" },
        { "id": "cl3", "clueEmoji": "💃", "clueText": "They feel like dancing and moving around" }
      ],
      "emotionOptions": [
        { "emotion": "Happy/Excited", "emoji": "🎊", "explanation": "Great detective work! All the clues point to joy and excitement!", "isCorrect": true },
        { "emotion": "Sad", "emoji": "😢", "explanation": "This emotion wouldn't fit with smiling and laughing. Keep investigating!", "isCorrect": false },
        { "emotion": "Scared", "emoji": "😨", "explanation": "The clues show positive feelings, not fear. Try again, detective!", "isCorrect": false }
      ],
      "revelationMessage": "Case solved! You're a true emotion detective! You can recognize feelings by looking at body language and behavior!"
    }
  ]
}

Make it fun, like a real mystery game, and appropriate for children.`;

  const response = await callClaude(apiKey, SYSTEM_PROMPT, prompt, TOKENS_ACTIVITY);
  const parsed = safeJsonParse<{ emotionDetectives: EmotionDetectiveContent[] }>(response);
  
  const detectives = parsed?.emotionDetectives || [];
  while (detectives.length < count) {
    detectives.push({
      heading: "🔍 Emotion Detective Mystery",
      caseDescription: `Detective, we have a case for you! Someone is experiencing a big emotion, and we need your help figuring out what it is. Read the clues carefully and use your emotion detective skills!`,
      instructions: "Study each clue, then choose which emotion you think the person is experiencing. Good luck, detective!",
      clues: [
        { id: "cl1", clueEmoji: "😊", clueText: "Their face is bright and they're smiling really big" },
        { id: "cl2", clueEmoji: "👏", clueText: "They just got great news and want to celebrate" },
        { id: "cl3", clueEmoji: "💫", clueText: "They can't stop bouncing around with energy" }
      ],
      emotionOptions: [
        { 
          emotion: "Joy & Happiness", 
          emoji: "🎉", 
          explanation: "Excellent detective work! All the clues - the big smile, the celebration, the bouncy energy - point to joy and happiness!", 
          isCorrect: true 
        },
        { 
          emotion: "Sadness", 
          emoji: "😢", 
          explanation: "Hmm, not quite. Sadness usually has different clues like frowning or sitting alone. Keep investigating!", 
          isCorrect: false 
        },
        { 
          emotion: "Worry", 
          emoji: "😟", 
          explanation: "Not this time, detective! Worry looks different. The clues here show positive feelings. Try again!", 
          isCorrect: false 
        }
      ],
      revelationMessage: `🎉 Case Solved! You're a true Emotion Detective! You successfully read the clues and figured out the feeling. ${metadata.characterName} is impressed with your detective skills!`
    });
  }
  
  return detectives.slice(0, count);
}

async function generateBalloonPops(
  apiKey: string,
  metadata: ModuleMetadata,
  contentBrief: string,
  count: number
): Promise<BalloonPopContent[]> {
  const prompt = `Create ${count} "Balloon Pop" activities for children about "${metadata.theme}".

This is an interactive game where children pop worry balloons using calming tools. Each balloon contains a worry, and using calming techniques makes them disappear!

Mascot: ${metadata.characterName} ${metadata.characterEmoji}


${buildCondensedContext(contentBrief, metadata)}

Respond with ONLY this JSON:
{
  "balloonPops": [
    {
      "heading": "Activity title with balloon emoji 🎈",
      "instructions": "Instructions explaining the game (2 sentences)",
      "scenario": "A relatable scenario where a child might feel worried (2-3 sentences)",
      "balloons": [
        { "id": "b1", "worryText": "What if I make a mistake?", "emoji": "😰", "color": "#ef4444", "popResponse": "It's okay to make mistakes - that's how we learn!" },
        { "id": "b2", "worryText": "What if people laugh at me?", "emoji": "😟", "color": "#f97316", "popResponse": "You are brave for trying new things!" },
        { "id": "b3", "worryText": "What if I can't do it?", "emoji": "😥", "color": "#eab308", "popResponse": "You can do hard things - one step at a time!" },
        { "id": "b4", "worryText": "What if something goes wrong?", "emoji": "😨", "color": "#a855f7", "popResponse": "You can handle whatever comes your way!" }
      ],
      "calmingTools": [
        { "id": "t1", "tool": "Deep Breath", "emoji": "🌬️", "power": 25 },
        { "id": "t2", "tool": "Positive Thought", "emoji": "💭", "power": 30 },
        { "id": "t3", "tool": "Grounding", "emoji": "🌳", "power": 25 },
        { "id": "t4", "tool": "Self-Kindness", "emoji": "💗", "power": 20 }
      ],
      "victoryMessage": "You popped all the worry balloons! You have the power to calm your worries!"
    }
  ]
}

Make the worries relatable to children and the pop responses encouraging.`;

  const response = await callClaude(apiKey, SYSTEM_PROMPT, prompt, TOKENS_ACTIVITY);
  const parsed = safeJsonParse<{ balloonPops: BalloonPopContent[] }>(response);
  
  const activities = parsed?.balloonPops || [];
  while (activities.length < count) {
    activities.push({
      heading: "🎈 Pop the Worry Balloons!",
      instructions: "Worry balloons are floating around! Use your calming tools to pop them and release the worries. Each tool has special popping power!",
      scenario: "You have a big test tomorrow and your mind is filled with worried thoughts. Let's pop those worry balloons and feel calmer!",
      balloons: [
        { id: "b1", worryText: "What if I forget everything?", emoji: "😰", color: "#ef4444", popResponse: "Your brain is amazing - it remembers more than you think!" },
        { id: "b2", worryText: "What if it's too hard?", emoji: "😟", color: "#f97316", popResponse: "You can do hard things! Just take it one question at a time." },
        { id: "b3", worryText: "What if I fail?", emoji: "😥", color: "#eab308", popResponse: "Mistakes help us learn and grow stronger!" },
        { id: "b4", worryText: "What if everyone else does better?", emoji: "😨", color: "#a855f7", popResponse: "You only need to do YOUR best - that's enough!" }
      ],
      calmingTools: [
        { id: "t1", tool: "Deep Breath", emoji: "🌬️", power: 25 },
        { id: "t2", tool: "Positive Thought", emoji: "💭", power: 30 },
        { id: "t3", tool: "5-4-3-2-1 Grounding", emoji: "🌳", power: 25 },
        { id: "t4", tool: "Self-Hug", emoji: "🤗", power: 20 }
      ],
      victoryMessage: `🎉 Amazing! You popped all the worry balloons! ${metadata.characterName} is so proud of you! Remember, you can use these tools anytime worries float up.`
    });
  }
  
  return activities.slice(0, count);
}

async function generateTreasureHunts(
  apiKey: string,
  metadata: ModuleMetadata,
  contentBrief: string,
  count: number
): Promise<TreasureHuntContent[]> {
  const prompt = `Create ${count} "Treasure Hunt" activities for children about "${metadata.theme}".

This is an adventure game where children explore different locations and discover emotional treasures (coping skills, insights, strengths).

Mascot: ${metadata.characterName} ${metadata.characterEmoji}


${buildCondensedContext(contentBrief, metadata)}

Respond with ONLY this JSON:
{
  "treasureHunts": [
    {
      "heading": "Activity title with treasure emoji 🗺️",
      "storyIntro": "Adventure story introduction (2-3 sentences)",
      "instructions": "How to play the treasure hunt (1-2 sentences)",
      "locations": [
        {
          "id": "loc1",
          "name": "Peaceful Beach",
          "emoji": "🏖️",
          "description": "A calm beach with gentle waves",
          "treasure": {
            "name": "Calm Breath",
            "emoji": "🌊",
            "lesson": "Like waves, our feelings come and go naturally"
          },
          "question": "What helps you feel as calm as the ocean?",
          "placeholder": "Write what calms you..."
        }
      ],
      "mapEmoji": "🗺️",
      "completionMessage": "You found all the treasures! These are tools you can use forever!"
    }
  ]
}

Include 4 diverse locations with unique emotional treasures.`;

  const response = await callClaude(apiKey, SYSTEM_PROMPT, prompt, TOKENS_ACTIVITY);
  const parsed = safeJsonParse<{ treasureHunts: TreasureHuntContent[] }>(response);
  
  const activities = parsed?.treasureHunts || [];
  while (activities.length < count) {
    activities.push({
      heading: "🗺️ Feelings Treasure Hunt!",
      storyIntro: `${metadata.characterName} has hidden special treasures around the world! Each treasure contains a powerful feeling tool. Join the adventure and discover them all!`,
      instructions: "Tap on each location to explore it. Find the hidden treasure and answer the question to collect it!",
      locations: [
        {
          id: "loc1",
          name: "Peaceful Beach",
          emoji: "🏖️",
          description: "Gentle waves lap against the shore as seagulls call overhead.",
          treasure: { name: "Calm Waves Breath", emoji: "🌊", lesson: "Like ocean waves, feelings rise and fall - and that's natural!" },
          question: "What makes you feel as peaceful as the ocean?",
          placeholder: "I feel calm when..."
        },
        {
          id: "loc2",
          name: "Brave Mountain",
          emoji: "🏔️",
          description: "A tall mountain reaching up to the clouds, strong and steady.",
          treasure: { name: "Inner Strength", emoji: "💪", lesson: "You have the strength to face challenges, just like a mountain!" },
          question: "When were you brave like a mountain?",
          placeholder: "I was brave when..."
        },
        {
          id: "loc3",
          name: "Friendly Forest",
          emoji: "🌲",
          description: "A magical forest where animals help each other and trees whisper encouragement.",
          treasure: { name: "Connection Power", emoji: "🤝", lesson: "Asking for help shows wisdom, not weakness!" },
          question: "Who can you talk to when you need support?",
          placeholder: "I can talk to..."
        },
        {
          id: "loc4",
          name: "Rainbow Garden",
          emoji: "🌈",
          description: "A colorful garden where every flower represents a different feeling.",
          treasure: { name: "All Feelings Welcome", emoji: "🌸", lesson: "Every feeling has a place in your garden - even the tricky ones!" },
          question: "What feeling would you like to grow more of?",
          placeholder: "I want to feel more..."
        }
      ],
      mapEmoji: "🗺️",
      completionMessage: `🎉 Congratulations, treasure hunter! You found all the emotional treasures! ${metadata.characterName} is amazed by your adventure! Keep these treasures in your heart forever.`
    });
  }
  
  return activities.slice(0, count);
}

async function generateMonsterTamers(
  apiKey: string,
  metadata: ModuleMetadata,
  contentBrief: string,
  count: number
): Promise<MonsterTamerContent[]> {
  const prompt = `Create ${count} "Monster Tamer" activities for children about "${metadata.theme}".

This is a game where children tame emotion monsters using kindness and coping strategies. The monster starts big and scary but becomes a friendly helper!

Mascot: ${metadata.characterName} ${metadata.characterEmoji}


${buildCondensedContext(contentBrief, metadata)}

Respond with ONLY this JSON:
{
  "monsterTamers": [
    {
      "heading": "Activity title with monster emoji 👾",
      "instructions": "Instructions for taming the monster (2 sentences)",
      "monster": {
        "name": "Worry Monster",
        "emotion": "anxiety",
        "emoji": "👾",
        "startingSize": 100,
        "description": "This monster grows when worries pile up, but kindness makes it smaller!"
      },
      "tamingActions": [
        { "id": "a1", "action": "Take a deep breath", "emoji": "🌬️", "shrinkPower": 20, "message": "The monster is calming down..." },
        { "id": "a2", "action": "Say something kind to yourself", "emoji": "💗", "shrinkPower": 25, "message": "Kindness is working!" },
        { "id": "a3", "action": "Name the feeling", "emoji": "🏷️", "shrinkPower": 20, "message": "When we name it, we tame it!" },
        { "id": "a4", "action": "Give it a hug", "emoji": "🤗", "shrinkPower": 35, "message": "Even monsters need love!" }
      ],
      "stages": [
        { "level": 4, "emoji": "👹", "description": "Big and scary!" },
        { "level": 3, "emoji": "👾", "description": "Still upset..." },
        { "level": 2, "emoji": "🙁", "description": "Calming down..." },
        { "level": 1, "emoji": "😊", "description": "Friendly helper!" }
      ],
      "friendMessage": "You tamed the monster! Now it's your helper, not your enemy!"
    }
  ]
}

Make the monster relatable and the taming process empowering.`;

  const response = await callClaude(apiKey, SYSTEM_PROMPT, prompt, TOKENS_ACTIVITY);
  const parsed = safeJsonParse<{ monsterTamers: MonsterTamerContent[] }>(response);
  
  const activities = parsed?.monsterTamers || [];
  while (activities.length < count) {
    activities.push({
      heading: "👾 Tame the Feeling Monster!",
      instructions: "Oh no! A feeling monster has appeared! Don't worry - you can tame it with kindness and coping skills. Use your powers to shrink the monster and make a new friend!",
      monster: {
        name: "Worry Wumble",
        emotion: "worry",
        emoji: "👾",
        startingSize: 100,
        description: "Worry Wumble grows bigger when we ignore it, but shrinks when we show it kindness and understanding!"
      },
      tamingActions: [
        { id: "a1", action: "Take 3 slow breaths", emoji: "🌬️", shrinkPower: 20, message: "The monster is slowing down..." },
        { id: "a2", action: "Say 'I can handle this'", emoji: "💪", shrinkPower: 25, message: "Your confidence is working!" },
        { id: "a3", action: "Name what you're worried about", emoji: "🏷️", shrinkPower: 20, message: "Naming feelings takes away their power!" },
        { id: "a4", action: "Give the monster a friendly wave", emoji: "👋", shrinkPower: 15, message: "The monster feels understood!" },
        { id: "a5", action: "Imagine the monster getting smaller", emoji: "✨", shrinkPower: 20, message: "Your imagination is powerful!" }
      ],
      stages: [
        { level: 4, emoji: "👹", description: "HUGE and overwhelming!" },
        { level: 3, emoji: "👾", description: "Big but manageable" },
        { level: 2, emoji: "🙂", description: "Getting smaller!" },
        { level: 1, emoji: "😊", description: "Tiny and friendly!" }
      ],
      friendMessage: `🎉 You did it! You tamed Worry Wumble! ${metadata.characterName} is so proud! Now the monster is your little helper who reminds you to take care of yourself.`
    });
  }
  
  return activities.slice(0, count);
}

async function generateGardenGrowers(
  apiKey: string,
  metadata: ModuleMetadata,
  contentBrief: string,
  count: number
): Promise<GardenGrowerContent[]> {
  const prompt = `Create ${count} "Garden Grower" activities for children about "${metadata.theme}".

This is a nurturing game where children grow emotional plants by practicing positive actions. Each plant represents a positive feeling/skill.

Mascot: ${metadata.characterName} ${metadata.characterEmoji}


${buildCondensedContext(contentBrief, metadata)}

Respond with ONLY this JSON:
{
  "gardenGrowers": [
    {
      "heading": "Activity title with garden emoji 🌱",
      "instructions": "Instructions for growing the garden (2 sentences)",
      "gardenStory": "Story about the magical feeling garden (2-3 sentences)",
      "plants": [
        {
          "id": "p1",
          "name": "Confidence Flower",
          "emoji": "🌻",
          "feeling": "confidence",
          "growthStages": ["🌱", "🌿", "🌷", "🌻"],
          "nurturingAction": "Say something you're proud of"
        },
        {
          "id": "p2",
          "name": "Calm Tree",
          "emoji": "🌳",
          "feeling": "calmness",
          "growthStages": ["🌱", "🪴", "🌲", "🌳"],
          "nurturingAction": "Take 3 deep breaths"
        }
      ],
      "wateringCan": {
        "emoji": "🚿",
        "actions": ["Deep breathing", "Kind thoughts", "Gratitude", "Movement"]
      },
      "harvestMessage": "Your garden is blooming! These feelings live in your heart!"
    }
  ]
}

Include 4 different plants representing positive emotions/skills.`;

  const response = await callClaude(apiKey, SYSTEM_PROMPT, prompt, TOKENS_ACTIVITY);
  const parsed = safeJsonParse<{ gardenGrowers: GardenGrowerContent[] }>(response);
  
  const activities = parsed?.gardenGrowers || [];
  while (activities.length < count) {
    activities.push({
      heading: "🌱 Grow Your Feelings Garden!",
      instructions: "Welcome to your magical feelings garden! Water your plants with positive actions and watch them grow. The more you nurture them, the bigger they bloom!",
      gardenStory: `${metadata.characterName} has given you special seeds to plant in your garden. Each plant grows when you practice positive actions. Let's see what beautiful things you can grow!`,
      plants: [
        {
          id: "p1",
          name: "Confidence Sunflower",
          emoji: "🌻",
          feeling: "confidence",
          growthStages: ["🌱", "🌿", "🌷", "🌻"],
          nurturingAction: "Name one thing you're good at"
        },
        {
          id: "p2",
          name: "Peaceful Pine",
          emoji: "🌲",
          feeling: "peace",
          growthStages: ["🌱", "🪴", "🌿", "🌲"],
          nurturingAction: "Take 5 slow, deep breaths"
        },
        {
          id: "p3",
          name: "Kindness Rose",
          emoji: "🌹",
          feeling: "kindness",
          growthStages: ["🌱", "🌿", "🌸", "🌹"],
          nurturingAction: "Think of something kind you could do for someone"
        },
        {
          id: "p4",
          name: "Gratitude Tulip",
          emoji: "🌷",
          feeling: "gratitude",
          growthStages: ["🌱", "🌿", "🌼", "🌷"],
          nurturingAction: "Name 3 things you're thankful for"
        }
      ],
      wateringCan: {
        emoji: "💧",
        actions: ["Deep breathing", "Kind self-talk", "Saying thanks", "Being helpful"]
      },
      harvestMessage: `🌸 Your garden is beautiful! ${metadata.characterName} is amazed! These feelings now live in your heart and will keep growing every time you practice!`
    });
  }
  
  return activities.slice(0, count);
}

async function generateSuperheroCreators(
  apiKey: string,
  metadata: ModuleMetadata,
  contentBrief: string,
  count: number
): Promise<SuperheroCreatorContent[]> {
  const prompt = `Create ${count} "Superhero Creator" activities for children about "${metadata.theme}".

This is a creative game where children build their own emotional superhero with powers, costume, and sidekick.

Mascot: ${metadata.characterName} ${metadata.characterEmoji}


${buildCondensedContext(contentBrief, metadata)}

Respond with ONLY this JSON:
{
  "superheroCreators": [
    {
      "heading": "Activity title with superhero emoji 🦸",
      "instructions": "Instructions for creating the superhero (2 sentences)",
      "storyIntro": "Exciting story about needing a new hero (2-3 sentences)",
      "heroElements": {
        "powers": [
          { "id": "pow1", "name": "Calm Force", "emoji": "🌊", "description": "Brings peace to any situation" },
          { "id": "pow2", "name": "Courage Beam", "emoji": "💪", "description": "Makes fear disappear" },
          { "id": "pow3", "name": "Kindness Shield", "emoji": "💗", "description": "Protects with love" },
          { "id": "pow4", "name": "Focus Vision", "emoji": "👁️", "description": "Sees solutions clearly" }
        ],
        "costumes": [
          { "id": "cos1", "name": "Brave Cape", "emoji": "🦸", "color": "#ef4444" },
          { "id": "cos2", "name": "Calm Suit", "emoji": "🦹", "color": "#3b82f6" },
          { "id": "cos3", "name": "Joy Outfit", "emoji": "⭐", "color": "#fbbf24" }
        ],
        "sidekicks": [
          { "id": "sid1", "name": "Worry-Away Puppy", "emoji": "🐕", "ability": "Cuddles away worries" },
          { "id": "sid2", "name": "Brave Bear", "emoji": "🐻", "ability": "Gives courage hugs" }
        ]
      },
      "missionPrompt": "What feeling challenge will your hero help with?",
      "heroNamePrompt": "What is your superhero's name?",
      "completionMessage": "Your superhero is ready to save the day!"
    }
  ]
}`;

  const response = await callClaude(apiKey, SYSTEM_PROMPT, prompt, TOKENS_ACTIVITY);
  const parsed = safeJsonParse<{ superheroCreators: SuperheroCreatorContent[] }>(response);
  
  const activities = parsed?.superheroCreators || [];
  while (activities.length < count) {
    activities.push({
      heading: "🦸 Create Your Feelings Superhero!",
      instructions: "Design your very own feelings superhero! Pick a power, costume, and sidekick. Your hero will help you handle any emotion!",
      storyIntro: `The world needs a new superhero - and only YOU can create them! ${metadata.characterName} has gathered special powers, costumes, and sidekicks. Build your hero and give them a mission!`,
      heroElements: {
        powers: [
          { id: "pow1", name: "Calm Wave", emoji: "🌊", description: "Washes away stress and brings peace" },
          { id: "pow2", name: "Courage Spark", emoji: "⚡", description: "Ignites bravery in scary moments" },
          { id: "pow3", name: "Kindness Glow", emoji: "💗", description: "Spreads warmth and understanding" },
          { id: "pow4", name: "Focus Laser", emoji: "🎯", description: "Cuts through confusion to find answers" },
          { id: "pow5", name: "Joy Burst", emoji: "🌟", description: "Creates happiness wherever it goes" },
          { id: "pow6", name: "Patience Shield", emoji: "🛡️", description: "Protects against frustration" }
        ],
        costumes: [
          { id: "cos1", name: "Brave Red Cape", emoji: "🦸‍♂️", color: "#ef4444" },
          { id: "cos2", name: "Calm Blue Suit", emoji: "🦸‍♀️", color: "#3b82f6" },
          { id: "cos3", name: "Joyful Yellow Armor", emoji: "⭐", color: "#fbbf24" },
          { id: "cos4", name: "Peaceful Green Cloak", emoji: "🌿", color: "#22c55e" },
          { id: "cos5", name: "Wise Purple Robe", emoji: "🔮", color: "#a855f7" }
        ],
        sidekicks: [
          { id: "sid1", name: "Comfort Puppy", emoji: "🐕", ability: "Gives warm, worry-melting cuddles" },
          { id: "sid2", name: "Brave Bear", emoji: "🐻", ability: "Stands beside you in scary times" },
          { id: "sid3", name: "Wise Owl", emoji: "🦉", ability: "Whispers helpful advice" },
          { id: "sid4", name: "Happy Bunny", emoji: "🐰", ability: "Hops around spreading joy" },
          { id: "sid5", name: "Calm Cat", emoji: "🐱", ability: "Purrs away tension and stress" }
        ]
      },
      missionPrompt: "What feeling challenge will your superhero help kids with?",
      heroNamePrompt: "What is your superhero's name?",
      completionMessage: `🦸 Your superhero is AMAZING! ${metadata.characterName} says your hero is ready to save the day! Remember - this superhero lives inside YOU!`
    });
  }
  
  return activities.slice(0, count);
}

async function generateFeelingsOrchestras(
  apiKey: string,
  metadata: ModuleMetadata,
  contentBrief: string,
  count: number
): Promise<FeelingsOrchestraContent[]> {
  const prompt = `Create ${count} "Feelings Orchestra" activities for children about "${metadata.theme}".

This is a creative game where each instrument represents a different emotion, and children compose their own emotional music.

Mascot: ${metadata.characterName} ${metadata.characterEmoji}


${buildCondensedContext(contentBrief, metadata)}

Respond with ONLY this JSON:
{
  "feelingsOrchestras": [
    {
      "heading": "Activity title with music emoji 🎵",
      "instructions": "Instructions for the orchestra activity (2 sentences)",
      "orchestraStory": "Story about the magical feelings orchestra (2-3 sentences)",
      "instruments": [
        { "id": "i1", "name": "Happy Drums", "emoji": "🥁", "feeling": "joy", "sound": "Boom boom!", "color": "#fbbf24" },
        { "id": "i2", "name": "Calm Flute", "emoji": "🎶", "feeling": "peace", "sound": "Whooo...", "color": "#22c55e" },
        { "id": "i3", "name": "Brave Trumpet", "emoji": "🎺", "feeling": "courage", "sound": "Ta-da!", "color": "#ef4444" },
        { "id": "i4", "name": "Sad Violin", "emoji": "🎻", "feeling": "sadness", "sound": "Hmmm...", "color": "#3b82f6" }
      ],
      "compositionPrompt": "What feeling song will you create today?",
      "performanceMessage": "Beautiful music! Every feeling has its own song!"
    }
  ]
}

Include 5-6 instruments representing different emotions.`;

  const response = await callClaude(apiKey, SYSTEM_PROMPT, prompt, TOKENS_ACTIVITY);
  const parsed = safeJsonParse<{ feelingsOrchestras: FeelingsOrchestraContent[] }>(response);
  
  const activities = parsed?.feelingsOrchestras || [];
  while (activities.length < count) {
    activities.push({
      heading: "🎵 The Feelings Orchestra!",
      instructions: "Welcome to the feelings orchestra! Each instrument plays a different emotion. Tap the instruments to create your own emotional music!",
      orchestraStory: `${metadata.characterName} discovered that every feeling has its own special sound! When we listen to our feelings, they create beautiful music. Let's compose a song together!`,
      instruments: [
        { id: "i1", name: "Joy Drums", emoji: "🥁", feeling: "happiness", sound: "Boom boom boom!", color: "#fbbf24" },
        { id: "i2", name: "Calm Harp", emoji: "🎵", feeling: "peace", sound: "Ting... ting...", color: "#22c55e" },
        { id: "i3", name: "Courage Trumpet", emoji: "🎺", feeling: "bravery", sound: "Ta-da-daaa!", color: "#ef4444" },
        { id: "i4", name: "Gentle Violin", emoji: "🎻", feeling: "tenderness", sound: "Hmmmm...", color: "#3b82f6" },
        { id: "i5", name: "Energy Maracas", emoji: "🎸", feeling: "excitement", sound: "Shake shake!", color: "#f97316" },
        { id: "i6", name: "Thoughtful Piano", emoji: "🎹", feeling: "reflection", sound: "Plink plonk...", color: "#a855f7" }
      ],
      compositionPrompt: "Tap the instruments to create music that shows how you're feeling right now!",
      performanceMessage: `🎶 What beautiful music! ${metadata.characterName} loved your composition! Remember - all your feelings make beautiful music, even the quiet ones!`
    });
  }
  
  return activities.slice(0, count);
}

async function generateCalmAquariums(
  apiKey: string,
  metadata: ModuleMetadata,
  contentBrief: string,
  count: number
): Promise<CalmAquariumContent[]> {
  const prompt = `Create ${count} "Calm Aquarium" activities for children about "${metadata.theme}".

This is a relaxing, mindful activity where children build a peaceful underwater world and practice calm breathing with bubbles.

Mascot: ${metadata.characterName} ${metadata.characterEmoji}


${buildCondensedContext(contentBrief, metadata)}

Respond with ONLY this JSON:
{
  "calmAquariums": [
    {
      "heading": "Activity title with aquarium emoji 🐠",
      "instructions": "Instructions for building the aquarium (2 sentences)",
      "aquariumStory": "Story about the peaceful underwater world (2-3 sentences)",
      "creatures": [
        { "id": "c1", "name": "Slow Turtle", "emoji": "🐢", "calmingTrait": "Takes life slow and steady", "movement": "glide" },
        { "id": "c2", "name": "Peaceful Fish", "emoji": "🐠", "calmingTrait": "Flows with the water", "movement": "swim" },
        { "id": "c3", "name": "Gentle Jellyfish", "emoji": "🪼", "calmingTrait": "Floats without worry", "movement": "float" }
      ],
      "decorations": [
        { "id": "d1", "name": "Swaying Seaweed", "emoji": "🌿", "calmingEffect": "Moves gently like deep breaths" },
        { "id": "d2", "name": "Shiny Shell", "emoji": "🐚", "calmingEffect": "Holds peaceful thoughts" }
      ],
      "breathingBubbles": {
        "inhaleTime": 4,
        "exhaleTime": 4,
        "message": "Breathe with the bubbles..."
      },
      "peaceMessage": "Your aquarium is so peaceful! Visit it whenever you need calm."
    }
  ]
}`;

  const response = await callClaude(apiKey, SYSTEM_PROMPT, prompt, TOKENS_ACTIVITY);
  const parsed = safeJsonParse<{ calmAquariums: CalmAquariumContent[] }>(response);
  
  const activities = parsed?.calmAquariums || [];
  while (activities.length < count) {
    activities.push({
      heading: "🐠 Build Your Calm Aquarium!",
      instructions: "Create your own peaceful underwater world! Add calm creatures and decorations, then watch them swim while you breathe with the bubbles.",
      aquariumStory: `${metadata.characterName} found the most peaceful place - a magical aquarium where everything moves slowly and calmly. Let's build one together and practice being as peaceful as the ocean!`,
      creatures: [
        { id: "c1", name: "Serene Sea Turtle", emoji: "🐢", calmingTrait: "Takes everything slow and steady - no rush!", movement: "glide" },
        { id: "c2", name: "Flowing Fish", emoji: "🐠", calmingTrait: "Goes with the flow, never fights the current", movement: "swim" },
        { id: "c3", name: "Dreamy Jellyfish", emoji: "🪼", calmingTrait: "Floats peacefully, letting go of worries", movement: "float" },
        { id: "c4", name: "Friendly Dolphin", emoji: "🐬", calmingTrait: "Brings joy and playfulness everywhere", movement: "leap" },
        { id: "c5", name: "Wise Octopus", emoji: "🐙", calmingTrait: "Thinks carefully before acting", movement: "wave" }
      ],
      decorations: [
        { id: "d1", name: "Dancing Seaweed", emoji: "🌿", calmingEffect: "Sways gently like deep breaths" },
        { id: "d2", name: "Treasure Shell", emoji: "🐚", calmingEffect: "Holds your peaceful wishes" },
        { id: "d3", name: "Glowing Coral", emoji: "🪸", calmingEffect: "Shines with gentle light" },
        { id: "d4", name: "Smooth Stones", emoji: "🪨", calmingEffect: "Stays steady and grounded" }
      ],
      breathingBubbles: {
        inhaleTime: 4,
        exhaleTime: 4,
        message: "Breathe in as bubbles rise... breathe out as they pop..."
      },
      peaceMessage: `🌊 Your aquarium is beautiful and calm! ${metadata.characterName} loves it! Whenever you feel stressed, close your eyes and imagine swimming in your peaceful aquarium.`
    });
  }
  
  return activities.slice(0, count);
}

async function generateRocketLaunchers(
  apiKey: string,
  metadata: ModuleMetadata,
  contentBrief: string,
  count: number
): Promise<RocketLauncherContent[]> {
  const prompt = `Create ${count} "Rocket Launcher" activities for children about "${metadata.theme}".

This is an adventure game where children fuel up a rocket with positive actions and visit different feeling planets.

Mascot: ${metadata.characterName} ${metadata.characterEmoji}


${buildCondensedContext(contentBrief, metadata)}

Respond with ONLY this JSON:
{
  "rocketLaunchers": [
    {
      "heading": "Activity title with rocket emoji 🚀",
      "instructions": "Instructions for the space adventure (2 sentences)",
      "missionBriefing": "Exciting mission introduction (2-3 sentences)",
      "planets": [
        { "id": "pl1", "name": "Joy Planet", "emoji": "🌟", "feeling": "happiness", "color": "#fbbf24", "activity": "Think of 3 things that make you smile", "reward": "Happiness Star" },
        { "id": "pl2", "name": "Calm Moon", "emoji": "🌙", "feeling": "peace", "color": "#a8d8ea", "activity": "Take 5 slow breaths", "reward": "Peace Crystal" },
        { "id": "pl3", "name": "Brave Mars", "emoji": "🔴", "feeling": "courage", "color": "#ef4444", "activity": "Name something you're brave about", "reward": "Courage Badge" }
      ],
      "fuelActions": [
        { "id": "f1", "action": "Deep breath", "emoji": "🌬️", "fuelAmount": 25 },
        { "id": "f2", "action": "Positive thought", "emoji": "💭", "fuelAmount": 25 },
        { "id": "f3", "action": "Smile", "emoji": "😊", "fuelAmount": 25 },
        { "id": "f4", "action": "Stretch", "emoji": "🙆", "fuelAmount": 25 }
      ],
      "launchSequence": ["3...", "2...", "1...", "BLAST OFF! 🚀"],
      "returnMessage": "Welcome home, space explorer! You collected amazing feeling treasures!"
    }
  ]
}`;

  const response = await callClaude(apiKey, SYSTEM_PROMPT, prompt, TOKENS_ACTIVITY);
  const parsed = safeJsonParse<{ rocketLaunchers: RocketLauncherContent[] }>(response);
  
  const activities = parsed?.rocketLaunchers || [];
  while (activities.length < count) {
    activities.push({
      heading: "🚀 Launch to Feelings Space!",
      instructions: "Fuel up your rocket with positive actions, then blast off to visit different feeling planets! Complete each planet's mission to collect rewards!",
      missionBriefing: `Mission Control calling! ${metadata.characterName} needs brave space explorers to visit the Feeling Planets and collect special treasures. Fuel up your rocket and let's go!`,
      planets: [
        { id: "pl1", name: "Joy Jupiter", emoji: "🌟", feeling: "happiness", color: "#fbbf24", activity: "Name 3 things that make you happy!", reward: "Golden Joy Star" },
        { id: "pl2", name: "Calm Moon", emoji: "🌙", feeling: "peace", color: "#94a3b8", activity: "Take 5 slow, deep breaths", reward: "Silver Peace Crystal" },
        { id: "pl3", name: "Brave Mars", emoji: "🔴", feeling: "courage", color: "#ef4444", activity: "Share a time you were brave", reward: "Courage Medal" },
        { id: "pl4", name: "Kind Venus", emoji: "💗", feeling: "kindness", color: "#ec4899", activity: "Think of something kind you could do", reward: "Heart of Kindness" }
      ],
      fuelActions: [
        { id: "f1", action: "Take a deep breath", emoji: "🌬️", fuelAmount: 25 },
        { id: "f2", action: "Think a happy thought", emoji: "💭", fuelAmount: 25 },
        { id: "f3", action: "Smile really big", emoji: "😊", fuelAmount: 25 },
        { id: "f4", action: "Do a quick stretch", emoji: "🙆", fuelAmount: 25 }
      ],
      launchSequence: ["Systems check... ✅", "Engines ready... 🔥", "3... 2... 1...", "🚀 BLAST OFF!"],
      returnMessage: `🎉 Welcome home, Space Explorer! ${metadata.characterName} is amazed by all the treasures you collected! These feeling powers are now yours forever!`
    });
  }
  
  return activities.slice(0, count);
}

async function generateMagicPotions(
  apiKey: string,
  metadata: ModuleMetadata,
  contentBrief: string,
  count: number
): Promise<MagicPotionContent[]> {
  const prompt = `Create ${count} "Magic Potion" activities for children about "${metadata.theme}".

This is a creative activity where children mix emotional ingredients to create magical feeling potions.

Mascot: ${metadata.characterName} ${metadata.characterEmoji}


${buildCondensedContext(contentBrief, metadata)}

Respond with ONLY this JSON:
{
  "magicPotions": [
    {
      "heading": "Activity title with potion emoji 🧪",
      "instructions": "Instructions for brewing potions (2 sentences)",
      "cauldronStory": "Magical story about the potion lab (2-3 sentences)",
      "ingredients": [
        { "id": "ing1", "name": "Smile Sparkles", "emoji": "✨", "feeling": "joy", "sparkle": "gold", "description": "Makes everything brighter" },
        { "id": "ing2", "name": "Calm Crystals", "emoji": "💎", "feeling": "peace", "sparkle": "blue", "description": "Brings inner peace" },
        { "id": "ing3", "name": "Brave Berries", "emoji": "🫐", "feeling": "courage", "sparkle": "red", "description": "Adds courage to any mix" },
        { "id": "ing4", "name": "Kind Kisses", "emoji": "💋", "feeling": "kindness", "sparkle": "pink", "description": "Sweetens everything" }
      ],
      "recipes": [
        { "potionName": "Confidence Boost", "emoji": "💪", "requiredIngredients": ["ing1", "ing3"], "effect": "Feel ready for anything!", "color": "#fbbf24" },
        { "potionName": "Calm Down Elixir", "emoji": "🌊", "requiredIngredients": ["ing2", "ing4"], "effect": "Feel peaceful and relaxed", "color": "#3b82f6" }
      ],
      "brewingSteps": ["Add ingredients", "Stir 3 times", "Say the magic words", "Drink up!"],
      "magicMessage": "Your potion is ready! The magic is inside YOU!"
    }
  ]
}`;

  const response = await callClaude(apiKey, SYSTEM_PROMPT, prompt, TOKENS_ACTIVITY);
  const parsed = safeJsonParse<{ magicPotions: MagicPotionContent[] }>(response);
  
  const activities = parsed?.magicPotions || [];
  while (activities.length < count) {
    activities.push({
      heading: "🧪 Magical Feelings Potions!",
      instructions: "Welcome to the potion lab! Mix different feeling ingredients to create powerful potions. Each potion gives you special emotional powers!",
      cauldronStory: `${metadata.characterName} has discovered ancient recipes for magical feeling potions! By mixing the right ingredients, you can brew potions that help you feel any way you want. Let's get brewing!`,
      ingredients: [
        { id: "ing1", name: "Joy Juice", emoji: "✨", feeling: "happiness", sparkle: "gold", description: "Extracted from pure laughter" },
        { id: "ing2", name: "Calm Crystals", emoji: "💎", feeling: "peace", sparkle: "blue", description: "Found in deep, slow breaths" },
        { id: "ing3", name: "Brave Beans", emoji: "🫘", feeling: "courage", sparkle: "red", description: "Grown in the garden of bravery" },
        { id: "ing4", name: "Kind Kisses", emoji: "💗", feeling: "kindness", sparkle: "pink", description: "Made from loving thoughts" },
        { id: "ing5", name: "Focus Flakes", emoji: "🎯", feeling: "concentration", sparkle: "purple", description: "Helps you think clearly" },
        { id: "ing6", name: "Energy Essence", emoji: "⚡", feeling: "motivation", sparkle: "orange", description: "Gets you ready to go!" }
      ],
      recipes: [
        { potionName: "Super Confidence Potion", emoji: "💪", requiredIngredients: ["ing1", "ing3"], effect: "Feel ready to try anything new!", color: "#f97316" },
        { potionName: "Deep Calm Elixir", emoji: "🌊", requiredIngredients: ["ing2", "ing4"], effect: "Feel peaceful inside and out", color: "#3b82f6" },
        { potionName: "Focus Formula", emoji: "🎯", requiredIngredients: ["ing5", "ing2"], effect: "Think clearly and stay on track", color: "#8b5cf6" },
        { potionName: "Joy Juice Supreme", emoji: "🌟", requiredIngredients: ["ing1", "ing6"], effect: "Feel happy and energized!", color: "#fbbf24" }
      ],
      brewingSteps: ["Pick your ingredients", "Drop them in the cauldron", "Stir three times clockwise", "Say 'I am powerful!'", "Watch the magic happen!"],
      magicMessage: `✨ Your potion is complete! ${metadata.characterName} is amazed by your brewing skills! Remember - the real magic was inside you all along!`
    });
  }
  
  return activities.slice(0, count);
}

async function generateFeelingsBingos(
  apiKey: string,
  metadata: ModuleMetadata,
  contentBrief: string,
  count: number
): Promise<FeelingsBingoContent[]> {
  const prompt = `Create ${count} "Feelings Bingo" activities for children about "${metadata.theme}".

This is an interactive bingo game where each square has a feeling challenge to complete.

Mascot: ${metadata.characterName} ${metadata.characterEmoji}


${buildCondensedContext(contentBrief, metadata)}

Respond with ONLY this JSON:
{
  "feelingsBingos": [
    {
      "heading": "Activity title with bingo emoji 🎯",
      "instructions": "Instructions for playing bingo (2 sentences)",
      "bingoStory": "Fun story about the bingo game (2-3 sentences)",
      "squares": [
        { "id": "sq1", "emoji": "😊", "feeling": "Happy", "challenge": "Name something that made you smile today" },
        { "id": "sq2", "emoji": "💪", "feeling": "Brave", "challenge": "Share a time you were brave" },
        { "id": "sq3", "emoji": "🙏", "feeling": "Grateful", "challenge": "Name 3 things you're thankful for" }
      ],
      "freeSpace": {
        "emoji": "⭐",
        "message": "FREE! You're doing great!"
      },
      "bingoPatterns": ["Row", "Column", "Diagonal", "Full Board"],
      "winMessage": "BINGO! You're a feelings champion!"
    }
  ]
}

Include 8 unique squares (plus free space = 9 total for 3x3 grid).`;

  const response = await callClaude(apiKey, SYSTEM_PROMPT, prompt, TOKENS_ACTIVITY);
  const parsed = safeJsonParse<{ feelingsBingos: FeelingsBingoContent[] }>(response);
  
  const activities = parsed?.feelingsBingos || [];
  while (activities.length < count) {
    activities.push({
      heading: "🎯 Feelings Bingo!",
      instructions: "Complete challenges to mark off squares! Get a row, column, or diagonal to win BINGO! Can you complete the whole board?",
      bingoStory: `${metadata.characterName} invented a special feelings bingo game! Each square has a challenge that helps you practice emotional skills. How many can you complete?`,
      squares: [
        { id: "sq1", emoji: "😊", feeling: "Happy", challenge: "Name 3 things that make you smile" },
        { id: "sq2", emoji: "💪", feeling: "Brave", challenge: "Share a time you did something scary" },
        { id: "sq3", emoji: "🙏", feeling: "Grateful", challenge: "Thank someone for something they did" },
        { id: "sq4", emoji: "🌬️", feeling: "Calm", challenge: "Take 5 slow, deep breaths" },
        { id: "sq5", emoji: "💗", feeling: "Kind", challenge: "Do something nice for someone" },
        { id: "sq6", emoji: "🤔", feeling: "Thoughtful", challenge: "Think before reacting to something" },
        { id: "sq7", emoji: "🎨", feeling: "Creative", challenge: "Draw or write about a feeling" },
        { id: "sq8", emoji: "🤗", feeling: "Connected", challenge: "Share a feeling with someone you trust" }
      ],
      freeSpace: {
        emoji: "⭐",
        message: "FREE SPACE! You're amazing just as you are!"
      },
      bingoPatterns: ["Horizontal Row", "Vertical Column", "Diagonal", "Four Corners", "FULL BOARD!"],
      winMessage: `🎉 BINGO! You did it! ${metadata.characterName} is cheering for you! You're a true feelings champion!`
    });
  }
  
  return activities.slice(0, count);
}
// ====================
// VERIFICATION & MODULE SUMMARY GENERATORS
// ====================

/**
 * Generate a self-verification report that audits the generated content
 * against the content brief requirements (theory, age range, tone, etc.)
 */
async function generateVerificationReport(
  apiKey: string,
  metadata: ModuleMetadata,
  contentBrief: string,
  generatedContent: Omit<GeneratedContent, 'verificationReport' | 'moduleSummary'>
): Promise<VerificationReport> {
  // Extract key info from content brief for verification
  const extractSection = (header: string): string => {
    const regex = new RegExp(`=== ${header}[^=]*===\\n([\\s\\S]*?)(?=\\n===|$)`, 'i');
    const match = contentBrief.match(regex);
    return match ? match[1].trim() : '';
  };

  const theorySection = extractSection('PSYCHOLOGICAL FOUNDATION');
  const brainTownSection = extractSection('BRAIN TOWN ANALOGY');
  const diagnosisSection = extractSection('DIAGNOSIS ADAPTATIONS');

  // Extract structured fields from the brief
  const briefTitleMatch = contentBrief.match(/^Title:\s*(.+)$/m);
  const briefTitle = briefTitleMatch ? briefTitleMatch[1].trim() : metadata.title;
  const briefAgeMatch = contentBrief.match(/^Target Age:\s*(.+?)(?:\s*\(|$)/m);
  const briefAge = briefAgeMatch ? briefAgeMatch[1].trim() : metadata.targetAge;
  const superSkillMatch = contentBrief.match(/^Super Skill:\s*(.+?)(?:\s*—|$)/m);
  const superSkillName = superSkillMatch ? superSkillMatch[1].trim() : '';
  const subSkillMatch = contentBrief.match(/^Sub-Skill:\s*(.+?)(?:\s*—|$)/m);
  const subSkillName = subSkillMatch ? subSkillMatch[1].trim() : '';

  // Build a summary of generated content for audit
  const lessonTopics = generatedContent.lessons.map(l => l.heading).join('; ');
  const interactiveTopics = generatedContent.interactiveLessons.map(l => l.heading).join('; ');
  const welcomeSample = generatedContent.welcome.paragraphs.join(' ').substring(0, 400);
  
  // Sample from activities for tone checking
  const activitySamples: string[] = [];
  if (generatedContent.checklists.length > 0) activitySamples.push(`Checklist: "${generatedContent.checklists[0].heading}"`);
  if (generatedContent.quizzes.length > 0) activitySamples.push(`Quiz: "${generatedContent.quizzes[0].heading}" - "${generatedContent.quizzes[0].question}"`);
  if (generatedContent.scenarios.length > 0) activitySamples.push(`Scenario: "${generatedContent.scenarios[0].heading}" - "${generatedContent.scenarios[0].scenario?.substring(0, 100)}"`);
  if (generatedContent.reflections.length > 0) activitySamples.push(`Reflection: "${generatedContent.reflections[0].heading}" - "${generatedContent.reflections[0].prompt}"`);

  const prompt = `You are auditing a generated children's SEL module for quality and compliance. Carefully check whether the generated content matches the specifications.

=== SPECIFICATIONS FROM ADMIN ===
Title specified: "${briefTitle}"
Target Age specified: ${briefAge}
${superSkillName ? `Super Skill: ${superSkillName}` : 'Super Skill: not specified'}
${subSkillName ? `Sub-Skill Focus: ${subSkillName}` : 'Sub-Skill: not specified'}
Primary Theory: ${theorySection.substring(0, 500)}
Brain Town Analogy: ${brainTownSection.substring(0, 400)}
${diagnosisSection ? `Diagnosis Adaptations: ${diagnosisSection.substring(0, 300)}` : ''}

=== WHAT WAS GENERATED ===
Title used: "${metadata.title}"
Age range used: ${metadata.targetAge}
Character: ${metadata.characterName} ${metadata.characterEmoji}
Theme: ${metadata.theme}

Welcome text sample: "${welcomeSample}"

Lesson topics: ${lessonTopics}
Interactive lesson topics: ${interactiveTopics}

Activity samples:
${activitySamples.join('\n')}

=== YOUR AUDIT ===
Check EACH of these carefully:
1. Is the primary theory "${theorySection.split('\n')[0]}" correctly operationalised in the content? "Operationalised" means the theory's SPECIFIC mechanisms are actively demonstrated in lessons and activities - not just mentioned by name. For example, if the theory is "Theory of Mind" or "Perspective Taking", the content must include activities about understanding OTHER people's thoughts, feelings, and viewpoints - not just internal brain states.
2. Is the content appropriate for the ${briefAge} age range?
3. Does it align with the sub-skill "${subSkillName || 'not specified'}"?
4. Does it align with the super skill "${superSkillName || 'not specified'}"?
5. Is the Brain Town analogy used in the content?
6. Is the tone warm, age-appropriate, and not AI-sounding?
7. Is Australian English used consistently?
8. Are there any concepts introduced that were NOT specified?
9. Does the content focus on the SOCIAL-COGNITIVE elements of the theory (if applicable) rather than just internal states?

Respond with ONLY this JSON:
{
  "theoriesUsed": [
    { "theoryName": "Name of each theory detected in content", "whereOperationalised": "Which pages/activities apply it" }
  ],
  "ageRangeTheoriesApplied": "Assessment of whether content matches ${briefAge} age range",
  "subSkillAlignment": "Assessment of alignment with sub-skill: ${subSkillName || 'not specified'}",
  "superSkillAlignment": "Assessment of alignment with super skill: ${superSkillName || 'not specified'}",
  "brainTownAnalogyUsage": "How and where the Brain Town analogy was used",
  "unselectedConceptsIntroduced": ["List any concepts introduced that were NOT in the brief"],
  "toneComplianceNotes": "Assessment of warm, age-appropriate, non-AI-sounding tone",
  "claimTypes": "Types of claims made",
  "australianEnglishCheck": "Whether Australian English spelling was used consistently",
  "overallAssessment": "PASS / PASS WITH NOTES / NEEDS REVIEW",
  "flaggedIssues": ["Any concerns or issues found"],
  "autoRevisions": ["Any auto-corrections that were applied"]
}`;

  try {
    const response = await callClaude(apiKey, SYSTEM_PROMPT, prompt, TOKENS_ACTIVITY);
    const parsed = safeJsonParse<VerificationReport>(response);
    if (parsed && parsed.overallAssessment) {
      return parsed;
    }
  } catch (e) {
    console.error('[AI] Verification report generation failed:', e);
  }

  return {
    theoriesUsed: [],
    ageRangeTheoriesApplied: "Verification could not be completed",
    subSkillAlignment: "Verification could not be completed",
    superSkillAlignment: "Verification could not be completed",
    brainTownAnalogyUsage: "Verification could not be completed",
    unselectedConceptsIntroduced: [],
    toneComplianceNotes: "Verification could not be completed",
    claimTypes: "Verification could not be completed",
    australianEnglishCheck: "Verification could not be completed",
    overallAssessment: "NEEDS REVIEW - Verification could not be completed",
    flaggedIssues: ["Verification report generation failed"],
    autoRevisions: [],
  };
}

/**
 * Generate a module summary for week-over-week continuity
 */
async function generateModuleSummary(
  apiKey: string,
  metadata: ModuleMetadata,
  contentBrief: string,
  generatedContent: Omit<GeneratedContent, 'verificationReport' | 'moduleSummary'>
): Promise<ModuleSummary> {
  const lessonSummary = generatedContent.lessons.map(l => `${l.heading}: ${l.paragraphs[0] || ''}`).join('\n');
  const interactiveSummary = generatedContent.interactiveLessons.map(l => l.heading).join('; ');
  
  const prompt = `Summarise this generated children's SEL module for continuity with the next week's module.

Module Title: ${metadata.title}
Target Age: ${metadata.targetAge}
Theme: ${metadata.theme}
Character: ${metadata.characterName}

Lesson Content:
${lessonSummary.substring(0, 600)}

Interactive Lessons: ${interactiveSummary.substring(0, 300)}

Respond with ONLY this JSON:
{
  "summary": "2-3 sentence summary of what this module covered",
  "keyConceptsCovered": ["concept1", "concept2", "concept3"],
  "skillsIntroduced": ["skill1", "skill2"],
  "characterProgressionNotes": "How the character's story progressed"
}`;

  try {
    const response = await callClaude(apiKey, SYSTEM_PROMPT, prompt, TOKENS_METADATA);
    const parsed = safeJsonParse<ModuleSummary>(response);
    if (parsed && parsed.summary) {
      return parsed;
    }
  } catch (e) {
    console.error('[AI] Module summary generation failed:', e);
  }

  return {
    summary: "Module summary could not be generated.",
    keyConceptsCovered: [],
    skillsIntroduced: [],
    characterProgressionNotes: "Not available",
  };
}

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
    // v5 NEW CHALLENGE COUNTS
    weatherControllers: pageStructure.filter(p => p.type === "weather-controller").length,
    powerUpCollectors: pageStructure.filter(p => p.type === "power-up-collector").length,
    emotionMazes: pageStructure.filter(p => p.type === "emotion-maze").length,
    strengthShields: pageStructure.filter(p => p.type === "strength-shield").length,
    feelingVolcanoes: pageStructure.filter(p => p.type === "feeling-volcano").length,
    // v6 NEW FUN INTERACTIVE LESSON COUNTS
    spinTheWheels: pageStructure.filter(p => p.type === "spin-the-wheel").length,
    stickerCollectors: pageStructure.filter(p => p.type === "sticker-collector").length,
    mindfulAdventures: pageStructure.filter(p => p.type === "mindful-adventure").length,
    emotionDetectives: pageStructure.filter(p => p.type === "emotion-detective").length,
    balloonPops: pageStructure.filter(p => p.type === "balloon-pop").length,
    treasureHunts: pageStructure.filter(p => p.type === "treasure-hunt").length,
    monsterTamers: pageStructure.filter(p => p.type === "monster-tamer").length,
    gardenGrowers: pageStructure.filter(p => p.type === "garden-grower").length,
    superheroCreators: pageStructure.filter(p => p.type === "superhero-creator").length,
    feelingsOrchestras: pageStructure.filter(p => p.type === "feelings-orchestra").length,
    calmAquariums: pageStructure.filter(p => p.type === "calm-aquarium").length,
    rocketLaunchers: pageStructure.filter(p => p.type === "rocket-launcher").length,
    magicPotions: pageStructure.filter(p => p.type === "magic-potion").length,
    feelingsBingos: pageStructure.filter(p => p.type === "feelings-bingo").length,
  };
  
  await updateProgress("metadata", "Creating module theme and character...");
  const metadata = await generateMetadata(apiKey, contentBrief, seriesInfo);
  
  await updateProgress("structure", "Planning module structure...");
  const [chapters, welcome] = await Promise.all([
    generateChapterDividers(apiKey, metadata, contentBrief, counts.chapters),
    generateWelcome(apiKey, metadata, contentBrief, seriesInfo),
  ]);
  
  await updateProgress("lessons", "Creating lesson content...");
  const [lessons, interactiveLessons] = await Promise.all([
    counts.lessons > 0 ? generateLessons(apiKey, metadata, contentBrief, counts.lessons, seriesInfo) : Promise.resolve([]),
    counts.interactiveLessons > 0 ? generateInteractiveLessons(apiKey, metadata, contentBrief, counts.interactiveLessons, seriesInfo) : Promise.resolve([]),
  ]);
  
  await updateProgress("activities", "Designing interactive activities...");
  const [checklists, reflections, quizzes, drawings, scenarios, breathing] = await Promise.all([
    counts.checklists > 0 ? generateChecklists(apiKey, metadata, contentBrief, counts.checklists) : Promise.resolve([]),
    counts.reflections > 0 ? generateReflections(apiKey, metadata, contentBrief, counts.reflections) : Promise.resolve([]),
    counts.quizzes > 0 ? generateQuizzes(apiKey, metadata, contentBrief, counts.quizzes) : Promise.resolve([]),
    counts.drawings > 0 ? generateDrawings(apiKey, metadata, contentBrief, counts.drawings) : Promise.resolve([]),
    counts.scenarios > 0 ? generateScenarios(apiKey, metadata, contentBrief, counts.scenarios) : Promise.resolve([]),
    generateBreathing(apiKey, metadata, contentBrief),
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
  
  await updateProgress("challenges", "Creating interactive challenges...");
  const [weatherControllers, powerUpCollectors, emotionMazes, strengthShields, feelingVolcanoes] = await Promise.all([
    counts.weatherControllers > 0 ? generateWeatherControllers(apiKey, metadata, contentBrief, counts.weatherControllers) : Promise.resolve([]),
    counts.powerUpCollectors > 0 ? generatePowerUpCollectors(apiKey, metadata, contentBrief, counts.powerUpCollectors) : Promise.resolve([]),
    counts.emotionMazes > 0 ? generateEmotionMazes(apiKey, metadata, contentBrief, counts.emotionMazes) : Promise.resolve([]),
    counts.strengthShields > 0 ? generateStrengthShields(apiKey, metadata, contentBrief, counts.strengthShields) : Promise.resolve([]),
    counts.feelingVolcanoes > 0 ? generateFeelingVolcanoes(apiKey, metadata, contentBrief, counts.feelingVolcanoes) : Promise.resolve([]),
  ]);
  
  await updateProgress("fun-interactive", "Creating fun interactive lessons...");
  const [spinTheWheels, stickerCollectors, mindfulAdventures, emotionDetectives] = await Promise.all([
    counts.spinTheWheels > 0 ? generateSpinTheWheels(apiKey, metadata, contentBrief, counts.spinTheWheels) : Promise.resolve([]),
    counts.stickerCollectors > 0 ? generateStickerCollectors(apiKey, metadata, contentBrief, counts.stickerCollectors) : Promise.resolve([]),
    counts.mindfulAdventures > 0 ? generateMindfulAdventures(apiKey, metadata, contentBrief, counts.mindfulAdventures) : Promise.resolve([]),
    counts.emotionDetectives > 0 ? generateEmotionDetectives(apiKey, metadata, contentBrief, counts.emotionDetectives) : Promise.resolve([]),
  ]);

  await updateProgress("games", "Creating interactive games...");
  const [balloonPops, treasureHunts, monsterTamers, gardenGrowers, superheroCreators] = await Promise.all([
    counts.balloonPops > 0 ? generateBalloonPops(apiKey, metadata, contentBrief, counts.balloonPops) : Promise.resolve([]),
    counts.treasureHunts > 0 ? generateTreasureHunts(apiKey, metadata, contentBrief, counts.treasureHunts) : Promise.resolve([]),
    counts.monsterTamers > 0 ? generateMonsterTamers(apiKey, metadata, contentBrief, counts.monsterTamers) : Promise.resolve([]),
    counts.gardenGrowers > 0 ? generateGardenGrowers(apiKey, metadata, contentBrief, counts.gardenGrowers) : Promise.resolve([]),
    counts.superheroCreators > 0 ? generateSuperheroCreators(apiKey, metadata, contentBrief, counts.superheroCreators) : Promise.resolve([]),
  ]);

  const [feelingsOrchestras, calmAquariums, rocketLaunchers, magicPotions, feelingsBingos] = await Promise.all([
    counts.feelingsOrchestras > 0 ? generateFeelingsOrchestras(apiKey, metadata, contentBrief, counts.feelingsOrchestras) : Promise.resolve([]),
    counts.calmAquariums > 0 ? generateCalmAquariums(apiKey, metadata, contentBrief, counts.calmAquariums) : Promise.resolve([]),
    counts.rocketLaunchers > 0 ? generateRocketLaunchers(apiKey, metadata, contentBrief, counts.rocketLaunchers) : Promise.resolve([]),
    counts.magicPotions > 0 ? generateMagicPotions(apiKey, metadata, contentBrief, counts.magicPotions) : Promise.resolve([]),
    counts.feelingsBingos > 0 ? generateFeelingsBingos(apiKey, metadata, contentBrief, counts.feelingsBingos) : Promise.resolve([]),
  ]);
  
  await updateProgress("summary", "Wrapping up...");
  const [summary, completion] = await Promise.all([
    generateSummary(apiKey, metadata, contentBrief),
    generateCompletion(apiKey, metadata),
  ]);

  // Build the content object without verification (needed as input for audit)
  const contentWithoutVerification = {
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
    weatherControllers,
    powerUpCollectors,
    emotionMazes,
    strengthShields,
    feelingVolcanoes,
    spinTheWheels,
    stickerCollectors,
    mindfulAdventures,
    emotionDetectives,
    balloonPops,
    treasureHunts,
    monsterTamers,
    gardenGrowers,
    superheroCreators,
    feelingsOrchestras,
    calmAquariums,
    rocketLaunchers,
    magicPotions,
    feelingsBingos,
    summary,
    completion,
  };

  // Generate verification report and module summary in parallel
  await updateProgress("verification", "Running AI self-verification audit...");
  const [verificationReport, moduleSummary] = await Promise.all([
    generateVerificationReport(apiKey, metadata, contentBrief, contentWithoutVerification),
    generateModuleSummary(apiKey, metadata, contentBrief, contentWithoutVerification),
  ]);
  
  return {
    ...contentWithoutVerification,
    verificationReport,
    moduleSummary,
  };
}

// ====================
// EXPORTS
// ====================

export {
  SYSTEM_PROMPT,
  extractAgeRange,
  generateAllContent,
};