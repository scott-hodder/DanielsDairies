// ================================================
// SUPER SKILL THEME CONFIGURATIONS
// ================================================

export const SUPER_SKILL_THEMES = {
  all: {
    name: 'All Adventures',
    emoji: '\u{1F5FA}\uFE0F',
    color: '#405878',
    description: 'View all your skill adventures',
    skyGradientStart: ['#B0C4DE', '#A8B8CC', '#9AACBE', '#8CA0B0', '#7E94A2'],
    skyGradientEnd: ['#87CEEB', '#98D8C8', '#7CCD7C', '#90EE90', '#98FB98'],
    decorationsStart: ['\u{1F332}', '\u{1F333}', '\u{1F342}', '\u{1F343}'],
    decorationsEnd: ['\u{1F338}', '\u{1F33B}', '\u{1F33C}', '\u{1F98B}', '\u{1F426}', '\u{1F308}'],
    pathColor: { main: '#A08868', light: '#C4A882', shadow: 'rgba(101, 78, 55, 0.3)' },
    startMarker: '\u{1F3E0}',
    endMarker: '\u{1F3C1}',
    destination: { name: "Adventure's End", emoji: '\u{1F3C6}' },
    nodeEmojis: { incomplete: '\u{1F4D8}', complete: '\u2728' },
    danielExpressions: { start: 'focused', middle: 'happy', end: 'proud' }
  },

  'brain-builder': {
    name: 'Brain Builder',
    emoji: '\u{1F9E0}',
    color: '#6366F1',
    description: 'Master your mind through understanding how your brain works',
    skyGradientStart: ['#778899', '#8899AA', '#99AABB', '#AABBCC', '#BBCCDD'],
    skyGradientEnd: ['#00CED1', '#48D1CC', '#40E0D0', '#7FFFD4', '#AFEEEE'],
    decorationsStart: ['\u{1F4AD}', '\u{1F32B}\uFE0F', '\u2753', '\u{1F914}'],
    decorationsEnd: ['\u{1F4A1}', '\u2B50', '\u{1F31F}', '\u2728', '\u{1F3AF}', '\u{1F3C6}'],
    pathColor: { main: '#6366F1', light: '#818CF8', shadow: 'rgba(99, 102, 241, 0.3)' },
    startMarker: '\u{1F4AD}',
    endMarker: '\u{1F4A1}',
    destination: { name: 'Clarity Peak', emoji: '\u{1F4A1}' },
    nodeEmojis: { incomplete: '\u{1F914}', complete: '\u{1F9E0}' },
    danielExpressions: { start: 'curious', middle: 'thinking', end: 'enlightened' }
  },

  'thought-driver': {
    name: 'Thought Driver',
    emoji: '\u{1F4AD}',
    color: '#8B5CF6',
    description: 'Take control of your thoughts and steer them positively',
    skyGradientStart: ['#DDA0DD', '#DA70D6', '#BA55D3', '#9370DB', '#8A2BE2'],
    skyGradientEnd: ['#E0FFFF', '#B0E0E6', '#ADD8E6', '#87CEEB', '#87CEFA'],
    decorationsStart: ['\u{1F4AD}', '\u{1F300}', '\u2753', '\u{1F4AB}'],
    decorationsEnd: ['\u{1F4A1}', '\u{1F3AF}', '\u2B50', '\u2728', '\u{1F308}', '\u{1F98B}'],
    pathColor: { main: '#8B5CF6', light: '#A78BFA', shadow: 'rgba(139, 92, 246, 0.3)' },
    startMarker: '\u{1F4AD}',
    endMarker: '\u{1F3AF}',
    destination: { name: 'Focus Point', emoji: '\u{1F3AF}' },
    nodeEmojis: { incomplete: '\u{1F914}', complete: '\u{1F4A1}' },
    danielExpressions: { start: 'confused', middle: 'focused', end: 'clear' }
  },

  'emotion-navigator': {
    name: 'Emotion Navigator',
    emoji: '\u{1F9ED}',
    color: '#EC4899',
    description: 'Navigate through all emotions with confidence',
    skyGradientStart: ['#DDA0DD', '#DA70D6', '#BA55D3', '#9370DB', '#8A2BE2'],
    skyGradientEnd: ['#FFB6C1', '#FFC0CB', '#FFE4E1', '#FFF0F5', '#FFFAFA'],
    decorationsStart: ['\u{1F4AD}', '\u2753', '\u{1F300}', '\u{1F4AB}'],
    decorationsEnd: ['\u{1F496}', '\u{1F60A}', '\u{1F308}', '\u2728', '\u{1F98B}', '\u{1F338}'],
    pathColor: { main: '#EC4899', light: '#F472B6', shadow: 'rgba(236, 72, 153, 0.3)' },
    startMarker: '\u{1F9ED}',
    endMarker: '\u{1F496}',
    destination: { name: 'Heart Haven', emoji: '\u{1F496}' },
    nodeEmojis: { incomplete: '\u{1F914}', complete: '\u{1F60A}' },
    danielExpressions: { start: 'curious', middle: 'understanding', end: 'loving' }
  },

  'body-boss': {
    name: 'Body Boss',
    emoji: '\u{1F4AA}',
    color: '#10B981',
    description: 'Understand and control your body signals',
    skyGradientStart: ['#FF8C00', '#FFA500', '#FFB347', '#FFCC00', '#FFD700'],
    skyGradientEnd: ['#87CEEB', '#B0E0E6', '#ADD8E6', '#E0FFFF', '#F0FFFF'],
    decorationsStart: ['\u26A1', '\u{1F4A8}', '\u{1F525}', '\u{1F4AA}'],
    decorationsEnd: ['\u{1F9D8}', '\u{1F30A}', '\u{1F343}', '\u{1F98B}', '\u{1F338}', '\u2600\uFE0F'],
    pathColor: { main: '#10B981', light: '#34D399', shadow: 'rgba(16, 185, 129, 0.3)' },
    startMarker: '\u26A1',
    endMarker: '\u{1F9D8}',
    destination: { name: 'Zen Garden', emoji: '\u{1F9D8}' },
    nodeEmojis: { incomplete: '\u{1F624}', complete: '\u{1F60C}' },
    danielExpressions: { start: 'tense', middle: 'relaxing', end: 'zen' }
  },

  'connection-captain': {
    name: 'Connection Captain',
    emoji: '\u{1F91D}',
    color: '#F59E0B',
    description: 'Build strong relationships and communicate well',
    skyGradientStart: ['#90A4AE', '#A5B5BF', '#B0BEC5', '#CFD8DC', '#ECEFF1'],
    skyGradientEnd: ['#98FB98', '#90EE90', '#7CCD7C', '#66CDAA', '#3CB371'],
    decorationsStart: ['\u{1F3E0}', '\u{1F6AA}', '\u{1F332}'],
    decorationsEnd: ['\u{1F46B}', '\u{1F91D}', '\u2764\uFE0F', '\u{1F389}', '\u{1F38A}', '\u{1F98B}', '\u{1F308}'],
    pathColor: { main: '#F59E0B', light: '#FBBF24', shadow: 'rgba(245, 158, 11, 0.3)' },
    startMarker: '\u{1F3E0}',
    endMarker: '\u{1F389}',
    destination: { name: 'Friendship Circle', emoji: '\u{1F389}' },
    nodeEmojis: { incomplete: '\u{1F642}', complete: '\u{1F604}' },
    danielExpressions: { start: 'shy', middle: 'friendly', end: 'celebrating' }
  },

  'calm-controller': {
    name: 'Calm Controller',
    emoji: '\u{1F9D8}',
    color: '#06B6D4',
    description: 'Master techniques to find peace and stay centered',
    skyGradientStart: ['#4A5568', '#5A6578', '#6B7B8C', '#7C8B9C', '#8D9BAC'],
    skyGradientEnd: ['#87CEEB', '#FFE4B5', '#FFFACD', '#FFF8DC', '#FFFFF0'],
    decorationsStart: ['\u{1F327}\uFE0F', '\u{1F4A8}', '\u2601\uFE0F', '\u{1F32B}\uFE0F', '\u26C8\uFE0F'],
    decorationsEnd: ['\u2600\uFE0F', '\u{1F308}', '\u{1F33B}', '\u{1F98B}', '\u{1F426}', '\u{1F338}'],
    pathColor: { main: '#06B6D4', light: '#22D3EE', shadow: 'rgba(6, 182, 212, 0.3)' },
    startMarker: '\u{1F327}\uFE0F',
    endMarker: '\u2600\uFE0F',
    destination: { name: 'Sunny Clearing', emoji: '\u{1F305}' },
    nodeEmojis: { incomplete: '\u{1F630}', complete: '\u{1F60C}' },
    danielExpressions: { start: 'worried', middle: 'hopeful', end: 'peaceful' }
  },

  'resilience-ranger': {
    name: 'Resilience Ranger',
    emoji: '\u{1F3D4}\uFE0F',
    color: '#EF4444',
    description: 'Bounce back from challenges and grow stronger',
    skyGradientStart: ['#1a1a2e', '#16213e', '#1f3460', '#2C3E50', '#34495E'],
    skyGradientEnd: ['#87CEEB', '#FFB347', '#FFCC33', '#FFD700', '#FFF8DC'],
    decorationsStart: ['\u{1F319}', '\u2728', '\u{1F311}', '\u{1F4AB}'],
    decorationsEnd: ['\u{1F33B}', '\u{1F337}', '\u{1F338}', '\u{1F98B}', '\u{1F426}', '\u2600\uFE0F', '\u{1F308}'],
    pathColor: { main: '#EF4444', light: '#F87171', shadow: 'rgba(239, 68, 68, 0.3)' },
    startMarker: '\u{1F319}',
    endMarker: '\u{1F33B}',
    destination: { name: 'Bright Garden', emoji: '\u{1F33B}' },
    nodeEmojis: { incomplete: '\u{1F614}', complete: '\u{1F60A}' },
    danielExpressions: { start: 'sad', middle: 'hopeful', end: 'joyful' }
  }
};

// For backward compatibility, CATEGORY_THEMES points to SUPER_SKILL_THEMES
export const CATEGORY_THEMES = SUPER_SKILL_THEMES;

// Kid-friendly copy for skill picker cards & preview modal
export const KID_FRIENDLY_COPY = {
  'brain-builder': {
    description: 'Learn how your brain works and how to grow it.',
    pickThisIf: 'You want to understand learning, focus, and big feelings.',
    youllLearn: ['Focus better', 'Understand big feelings', 'Make smart choices', 'Grow your brain like a muscle'],
    tag: 'Your Brain & Learning',
    bgColor: '#eef0ff',
    borderColor: '#c7cbf2',
    btnColor: '#6366F1',
    decos: ['\u{1F4A1}', '\u{1F9E9}', '\u2728'],
    speechNew: 'Ready to power up your brain?',
    speechCurrent: "You're already making progress here!"
  },
  'thought-driver': {
    description: 'Learn how to steer your thoughts in a helpful direction.',
    pickThisIf: 'Your thoughts sometimes get stuck or feel unhelpful.',
    youllLearn: ['Spot unhelpful thoughts', 'Think in a more helpful way', 'Stop worrying so much', 'Feel more in control of your mind'],
    tag: 'Helpful Thinking',
    bgColor: '#ecfdf5',
    borderColor: '#a7f3d0',
    btnColor: '#059669',
    decos: ['\u{1FAA7}', '\u27A1\uFE0F', '\u{1F5FA}\uFE0F'],
    speechNew: 'Want to explore new ways to think?',
    speechCurrent: 'Keep steering those thoughts!'
  },
  'emotion-navigator': {
    description: 'Understand your feelings and learn what to do with them.',
    pickThisIf: 'You have big feelings and want to understand them better.',
    youllLearn: ['Name how you feel', 'Handle anger and sadness', 'Talk about feelings', 'Feel more in control'],
    tag: 'Feelings & Emotions',
    bgColor: '#fff1f2',
    borderColor: '#fecdd3',
    btnColor: '#e11d48',
    decos: ['\u{1F496}', '\u{1F9ED}', '\u{1F308}'],
    speechNew: 'This adventure helps with big feelings!',
    speechCurrent: "You're navigating feelings like a pro!"
  },
  'body-boss': {
    description: 'Learn to listen to your body and feel more in control.',
    pickThisIf: 'Your body feels fidgety, tense, or hard to control.',
    youllLearn: ['Calm your body down', 'Notice body signals', 'Use movement to feel better', 'Relax when things get tough'],
    tag: 'Your Body & Energy',
    bgColor: '#ecfdf5',
    borderColor: '#a7f3d0',
    btnColor: '#10B981',
    decos: ['\u26A1', '\u{1F9D8}', '\u{1F30A}'],
    speechNew: 'Want to become the boss of your body?',
    speechCurrent: "You're learning to listen to your body!"
  },
  'connection-captain': {
    description: 'Get better at making friends and talking to people.',
    pickThisIf: 'You want to feel more confident around other people.',
    youllLearn: ['Make new friends', 'Listen and talk better', 'Work things out with others', 'Feel part of a group'],
    tag: 'Friends & People',
    bgColor: '#fffbeb',
    borderColor: '#fde68a',
    btnColor: '#d97706',
    decos: ['\u{1F46B}', '\u{1F3E0}', '\u{1F4AC}'],
    speechNew: 'Ready to build amazing friendships?',
    speechCurrent: 'Your friendship skills are growing!'
  },
  'calm-controller': {
    description: 'Find your calm when everything feels too much.',
    pickThisIf: 'You sometimes feel worried, overwhelmed, or stressed.',
    youllLearn: ['Calm down when upset', 'Breathe and relax', 'Handle stressful moments', 'Feel peaceful inside'],
    tag: 'Staying Calm',
    bgColor: '#ecfeff',
    borderColor: '#a5f3fc',
    btnColor: '#0891b2',
    decos: ['\u{1F338}', '\u2600\uFE0F', '\u{1F98B}'],
    speechNew: 'Want to find your inner calm?',
    speechCurrent: "You're getting calmer every day!"
  },
  'resilience-ranger': {
    description: 'Bounce back when things go wrong and keep going.',
    pickThisIf: 'You want to feel braver and handle tough times better.',
    youllLearn: ['Get back up after setbacks', 'Feel braver', 'Keep trying when it\'s hard', 'Grow stronger from challenges'],
    tag: 'Bouncing Back',
    bgColor: '#fef2f2',
    borderColor: '#fecaca',
    btnColor: '#dc2626',
    decos: ['\u{1F3D4}\uFE0F', '\u{1F6E1}\uFE0F', '\u2B50'],
    speechNew: 'Ready to become super brave?',
    speechCurrent: "You're bouncing back stronger!"
  },
  'future-designer': {
    description: 'Dream big, set goals, and design your future.',
    pickThisIf: 'You want to plan ahead and work towards your dreams.',
    youllLearn: ['Set goals you can reach', 'Plan your next steps', 'Believe in yourself', 'Picture your future'],
    tag: 'Goals & Your Future',
    bgColor: '#f5f3ff',
    borderColor: '#ddd6fe',
    btnColor: '#7c3aed',
    decos: ['\u{1F52D}', '\u2B50', '\u{1F3C1}'],
    speechNew: 'Want to design your awesome future?',
    speechCurrent: "You're building your dream future!"
  },
  'social-mapper': {
    description: 'Understand people better and build stronger friendships.',
    pickThisIf: 'You want to get along better with the people around you.',
    youllLearn: ['Read how others feel', 'Be a better friend', 'Handle tricky situations', 'Feel more connected'],
    tag: 'Friends & People',
    bgColor: '#f0fdfa',
    borderColor: '#99f6e4',
    btnColor: '#0d9488',
    decos: ['\u{1F5FA}\uFE0F', '\u{1F44B}', '\u2764\uFE0F'],
    speechNew: 'Ready to explore the world of people?',
    speechCurrent: "You're mapping out great friendships!"
  },
  'behaviour-engineer': {
    description: 'Build good habits and make choices you feel proud of.',
    pickThisIf: 'You want to break bad habits or build new good ones.',
    youllLearn: ['Build good habits', 'Make better choices', 'Stick with new routines', 'Feel proud of yourself'],
    tag: 'Habits & Choices',
    bgColor: '#fffbeb',
    borderColor: '#fde68a',
    btnColor: '#d97706',
    decos: ['\u26A1', '\u{1F527}', '\u2705'],
    speechNew: 'Want to build awesome new habits?',
    speechCurrent: "You're engineering great habits!"
  },
  'resilience-architect': {
    description: 'Bounce back when things go wrong and keep going.',
    pickThisIf: 'You want to feel braver and handle tough times better.',
    youllLearn: ['Get back up after setbacks', 'Feel braver', 'Keep trying when it\'s hard', 'Grow stronger from challenges'],
    tag: 'Bouncing Back',
    bgColor: '#fff7ed',
    borderColor: '#fed7aa',
    btnColor: '#ea580c',
    decos: ['\u{1F3D4}\uFE0F', '\u{1F6E1}\uFE0F', '\u{1F9F1}'],
    speechNew: 'Ready to build your inner strength?',
    speechCurrent: "You're getting stronger every day!"
  }
};

// Mapping from old category names to super skill slugs (for backward compatibility)
export const CATEGORY_TO_SUPERSKILL = {
  'anger': 'emotion-navigator',
  'anxiety': 'calm-controller',
  'depression': 'resilience-ranger',
  'emotions': 'emotion-navigator',
  'body': 'body-boss',
  'cognitive': 'brain-builder',
  'social': 'connection-captain',
  'general': 'all'
};

// Map zone progression system (4-zone)
export const MAP_ZONE_PROGRESSION = [
  { range: '1-3', label: 'Zone 1: Foundations', unlocksAfterModules: 0 },
  { range: '4-6', label: 'Zone 2: Momentum', unlocksAfterModules: 3 },
  { range: '7-9', label: 'Zone 3: Mastery Building', unlocksAfterModules: 6 },
  { range: '10-12', label: 'Zone 4: Celebration', unlocksAfterModules: 9 }
];

// Daniel expression images mapping
export const DANIEL_EXPRESSIONS = {
  stressed: '/images/characters/DanielTheDog.webp',
  worried: '/images/characters/DanielTheDog.webp',
  sad: '/images/characters/DanielTheDog.webp',
  tense: '/images/characters/DanielTheDog.webp',
  confused: '/images/characters/DanielTheDog.webp',
  shy: '/images/characters/DanielTheDog.webp',
  curious: '/images/characters/DanielTheDog.webp',
  focused: '/images/characters/DanielTheDog.webp',
  hopeful: '/images/characters/DanielTheDog.webp',
  relaxing: '/images/characters/DanielTheDog.webp',
  thinking: '/images/characters/DanielTheDog.webp',
  friendly: '/images/characters/DanielTheDog.webp',
  learning: '/images/characters/DanielTheDog.webp',
  understanding: '/images/characters/DanielTheDog.webp',
  happy: '/images/characters/DanielTheDog.webp',
  calm: '/images/characters/DanielTheDog.webp',
  peaceful: '/images/characters/DanielTheDog.webp',
  joyful: '/images/characters/DanielTheDog.webp',
  loving: '/images/characters/DanielTheDog.webp',
  zen: '/images/characters/DanielTheDog.webp',
  enlightened: '/images/characters/DanielTheDog.webp',
  celebrating: '/images/characters/DanielTheDog.webp',
  proud: '/images/characters/DanielTheDog.webp'
};
