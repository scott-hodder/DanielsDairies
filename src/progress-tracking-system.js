// ================================================
// PROGRESS TRACKING SYSTEM
// Psychology-Based Assessment & Progress Monitoring
// ================================================

// This system uses validated psychological frameworks to track measurable progress:
// - SDQ (Strengths and Difficulties Questionnaire) adapted for specific domains
// - SCARED-5 for anxiety screening
// - Modified RCADS for depression indicators
// - Visual Analogue Scales (VAS) for quick check-ins
// - Likert scales for self-efficacy measurement

const PROGRESS_TRACKING_VERSION = '1.0.0';

// ================================================
// SUPER SKILL TO ASSESSMENT MAPPING
// ================================================
// Maps new Super Skill slugs to their corresponding assessments

const SUPERSKILL_TO_ASSESSMENT = {
  'brain-builder': 'cognitive',
  'thought-driver': 'cognitive',
  'emotion-navigator': 'emotions',
  'body-boss': 'body',
  'connection-captain': 'social',
  'calm-controller': 'anxiety',
  'resilience-ranger': 'depression'
};

// Reverse mapping - category to super skill (for backward compatibility)
const CATEGORY_TO_SUPERSKILL = {
  'anger': 'emotion-navigator',
  'anxiety': 'calm-controller',
  'depression': 'resilience-ranger',
  'emotions': 'emotion-navigator',
  'body': 'body-boss',
  'cognitive': 'brain-builder',
  'social': 'connection-captain',
  'general': 'brain-builder'
};

// ================================================
// ASSESSMENT CONFIGURATIONS BY PATHWAY/CATEGORY
// ================================================

const PATHWAY_ASSESSMENTS = {
  anger: {
    name: 'Anger Management Assessment',
    description: 'Understanding how you handle frustration and anger',
    icon: '🔥',
    color: '#8B0000',
    // Based on Novaco Anger Scale (adapted for children) and emotion regulation measures
    questions: [
      {
        id: 'anger_frequency',
        text: 'In the past week, how often did you feel really angry?',
        type: 'frequency',
        options: [
          { value: 0, label: 'Never', emoji: '😊' },
          { value: 1, label: 'Once or twice', emoji: '🙂' },
          { value: 2, label: 'A few times', emoji: '😐' },
          { value: 3, label: 'Almost every day', emoji: '😠' },
          { value: 4, label: 'Multiple times every day', emoji: '🤬' }
        ],
        reverseScore: false
      },
      {
        id: 'anger_intensity',
        text: 'When you feel angry, how strong is the feeling usually?',
        type: 'intensity',
        options: [
          { value: 0, label: 'Very mild - easy to handle', emoji: '😌' },
          { value: 1, label: 'Mild - a bit uncomfortable', emoji: '🙂' },
          { value: 2, label: 'Medium - hard to ignore', emoji: '😤' },
          { value: 3, label: 'Strong - really hard to control', emoji: '😡' },
          { value: 4, label: 'Very strong - feels explosive', emoji: '🌋' }
        ],
        reverseScore: false
      },
      {
        id: 'anger_physical',
        text: 'When angry, do you notice body feelings like hot face, tight muscles, or fast heartbeat?',
        type: 'awareness',
        options: [
          { value: 4, label: 'Yes, I notice them and can describe them', emoji: '💪' },
          { value: 3, label: 'Yes, I notice some feelings', emoji: '👍' },
          { value: 2, label: 'Sometimes I notice', emoji: '🤔' },
          { value: 1, label: 'Not really sure', emoji: '😐' },
          { value: 0, label: 'No, I don\'t notice anything', emoji: '❓' }
        ],
        reverseScore: true,
        category: 'awareness'
      },
      {
        id: 'anger_expression',
        text: 'When you get angry, what usually happens?',
        type: 'behavior',
        options: [
          { value: 0, label: 'I can calm myself down quickly', emoji: '🧘' },
          { value: 1, label: 'I talk about why I\'m upset', emoji: '💬' },
          { value: 2, label: 'I need to be alone for a while', emoji: '🚪' },
          { value: 3, label: 'I might say mean things', emoji: '😤' },
          { value: 4, label: 'I sometimes break things or hit', emoji: '💥' }
        ],
        reverseScore: false
      },
      {
        id: 'anger_recovery',
        text: 'After feeling angry, how long does it usually take to feel calm again?',
        type: 'regulation',
        options: [
          { value: 0, label: 'A few minutes', emoji: '⏱️' },
          { value: 1, label: 'About 30 minutes', emoji: '🕐' },
          { value: 2, label: 'An hour or so', emoji: '🕐' },
          { value: 3, label: 'Several hours', emoji: '😔' },
          { value: 4, label: 'Most of the day or longer', emoji: '😓' }
        ],
        reverseScore: false
      },
      {
        id: 'anger_coping_confidence',
        text: 'How confident do you feel about handling your anger?',
        type: 'self_efficacy',
        options: [
          { value: 4, label: 'Very confident - I have good strategies', emoji: '💪' },
          { value: 3, label: 'Pretty confident most of the time', emoji: '👍' },
          { value: 2, label: 'Somewhat confident', emoji: '🤷' },
          { value: 1, label: 'Not very confident', emoji: '😕' },
          { value: 0, label: 'Not confident at all', emoji: '😰' }
        ],
        reverseScore: true,
        category: 'efficacy'
      }
    ],
    scoringGuide: {
      maxScore: 24,
      interpretation: {
        low: { range: [0, 8], label: 'Good anger management', color: '#4CAF50' },
        moderate: { range: [9, 16], label: 'Some challenges with anger', color: '#FF9800' },
        high: { range: [17, 24], label: 'Significant anger concerns', color: '#F44336' }
      }
    }
  },

  anxiety: {
    name: 'Worry & Anxiety Check-In',
    description: 'Understanding your worries and nervous feelings',
    icon: '🌧️',
    color: '#ab47bc',
    // Based on SCARED-5 and GAD-7 adapted for children
    questions: [
      {
        id: 'anxiety_worry_frequency',
        text: 'In the past week, how often did you feel worried or nervous?',
        type: 'frequency',
        options: [
          { value: 0, label: 'Never', emoji: '😊' },
          { value: 1, label: 'Once or twice', emoji: '🙂' },
          { value: 2, label: 'A few times', emoji: '😐' },
          { value: 3, label: 'Almost every day', emoji: '😰' },
          { value: 4, label: 'Multiple times every day', emoji: '😨' }
        ],
        reverseScore: false
      },
      {
        id: 'anxiety_physical',
        text: 'Do you get tummy aches, headaches, or feel sick when worried?',
        type: 'somatic',
        options: [
          { value: 0, label: 'Never', emoji: '😊' },
          { value: 1, label: 'Rarely', emoji: '🙂' },
          { value: 2, label: 'Sometimes', emoji: '😐' },
          { value: 3, label: 'Often', emoji: '🤢' },
          { value: 4, label: 'Almost always', emoji: '😣' }
        ],
        reverseScore: false
      },
      {
        id: 'anxiety_avoidance',
        text: 'Do your worries stop you from doing things you want to do?',
        type: 'avoidance',
        options: [
          { value: 0, label: 'Never - I do what I want', emoji: '💪' },
          { value: 1, label: 'Rarely - only small things', emoji: '🙂' },
          { value: 2, label: 'Sometimes - a few things', emoji: '😐' },
          { value: 3, label: 'Often - many things', emoji: '😔' },
          { value: 4, label: 'Very often - lots of things', emoji: '😢' }
        ],
        reverseScore: false
      },
      {
        id: 'anxiety_sleep',
        text: 'Do worries make it hard to fall asleep or wake you up at night?',
        type: 'sleep',
        options: [
          { value: 0, label: 'Never - I sleep well', emoji: '😴' },
          { value: 1, label: 'Rarely', emoji: '🙂' },
          { value: 2, label: 'Sometimes', emoji: '😐' },
          { value: 3, label: 'Often', emoji: '😫' },
          { value: 4, label: 'Most nights', emoji: '😰' }
        ],
        reverseScore: false
      },
      {
        id: 'anxiety_control',
        text: 'When worries come, can you calm yourself down?',
        type: 'regulation',
        options: [
          { value: 4, label: 'Yes, easily', emoji: '💪' },
          { value: 3, label: 'Usually I can', emoji: '👍' },
          { value: 2, label: 'Sometimes I can', emoji: '🤷' },
          { value: 1, label: 'It\'s hard to', emoji: '😕' },
          { value: 0, label: 'I can\'t calm down', emoji: '😰' }
        ],
        reverseScore: true,
        category: 'efficacy'
      },
      {
        id: 'anxiety_coping_confidence',
        text: 'How confident do you feel about handling your worries?',
        type: 'self_efficacy',
        options: [
          { value: 4, label: 'Very confident', emoji: '💪' },
          { value: 3, label: 'Pretty confident', emoji: '👍' },
          { value: 2, label: 'Somewhat confident', emoji: '🤷' },
          { value: 1, label: 'Not very confident', emoji: '😕' },
          { value: 0, label: 'Not confident at all', emoji: '😰' }
        ],
        reverseScore: true,
        category: 'efficacy'
      }
    ],
    scoringGuide: {
      maxScore: 24,
      interpretation: {
        low: { range: [0, 8], label: 'Low anxiety levels', color: '#4CAF50' },
        moderate: { range: [9, 16], label: 'Moderate anxiety', color: '#FF9800' },
        high: { range: [17, 24], label: 'High anxiety levels', color: '#F44336' }
      }
    }
  },

  depression: {
    name: 'Mood & Energy Check-In',
    description: 'Understanding your mood and energy levels',
    icon: '🌙',
    color: '#002657',
    // Based on PHQ-A and RCADS adapted for children
    questions: [
      {
        id: 'depression_mood',
        text: 'In the past week, how often did you feel sad or down?',
        type: 'frequency',
        options: [
          { value: 0, label: 'Never', emoji: '😊' },
          { value: 1, label: 'Once or twice', emoji: '🙂' },
          { value: 2, label: 'A few times', emoji: '😐' },
          { value: 3, label: 'Almost every day', emoji: '😔' },
          { value: 4, label: 'All the time', emoji: '😢' }
        ],
        reverseScore: false
      },
      {
        id: 'depression_interest',
        text: 'How much did you enjoy doing things you usually like?',
        type: 'anhedonia',
        options: [
          { value: 0, label: 'Enjoyed them a lot', emoji: '🎉' },
          { value: 1, label: 'Enjoyed them mostly', emoji: '😊' },
          { value: 2, label: 'Enjoyed them a little', emoji: '😐' },
          { value: 3, label: 'Didn\'t enjoy much', emoji: '😕' },
          { value: 4, label: 'Nothing felt fun', emoji: '😔' }
        ],
        reverseScore: false
      },
      {
        id: 'depression_energy',
        text: 'How was your energy level this week?',
        type: 'energy',
        options: [
          { value: 0, label: 'Good energy', emoji: '⚡' },
          { value: 1, label: 'Mostly okay', emoji: '🙂' },
          { value: 2, label: 'Sometimes tired', emoji: '😐' },
          { value: 3, label: 'Often tired', emoji: '😫' },
          { value: 4, label: 'Exhausted all the time', emoji: '😴' }
        ],
        reverseScore: false
      },
      {
        id: 'depression_worth',
        text: 'How did you feel about yourself this week?',
        type: 'self_esteem',
        options: [
          { value: 0, label: 'Really good about myself', emoji: '⭐' },
          { value: 1, label: 'Pretty good', emoji: '😊' },
          { value: 2, label: 'Okay I guess', emoji: '😐' },
          { value: 3, label: 'Not great', emoji: '😕' },
          { value: 4, label: 'Pretty bad about myself', emoji: '😔' }
        ],
        reverseScore: false
      },
      {
        id: 'depression_connection',
        text: 'How connected did you feel to family and friends?',
        type: 'social',
        options: [
          { value: 0, label: 'Very connected', emoji: '💖' },
          { value: 1, label: 'Pretty connected', emoji: '😊' },
          { value: 2, label: 'Somewhat connected', emoji: '😐' },
          { value: 3, label: 'A bit lonely', emoji: '😕' },
          { value: 4, label: 'Very alone', emoji: '😢' }
        ],
        reverseScore: false
      },
      {
        id: 'depression_hope',
        text: 'How hopeful do you feel about things getting better?',
        type: 'hope',
        options: [
          { value: 4, label: 'Very hopeful', emoji: '🌟' },
          { value: 3, label: 'Pretty hopeful', emoji: '😊' },
          { value: 2, label: 'Somewhat hopeful', emoji: '🤷' },
          { value: 1, label: 'Not very hopeful', emoji: '😕' },
          { value: 0, label: 'Not hopeful at all', emoji: '😔' }
        ],
        reverseScore: true,
        category: 'efficacy'
      }
    ],
    scoringGuide: {
      maxScore: 24,
      interpretation: {
        low: { range: [0, 8], label: 'Positive mood', color: '#4CAF50' },
        moderate: { range: [9, 16], label: 'Some mood concerns', color: '#FF9800' },
        high: { range: [17, 24], label: 'Low mood indicators', color: '#F44336' }
      }
    }
  },

  emotions: {
    name: 'Emotional Awareness Check-In',
    description: 'Understanding and managing your feelings',
    icon: '💭',
    color: '#f46b6b',
    // Based on Emotion Regulation Questionnaire for Children (ERQ-C)
    questions: [
      {
        id: 'emotions_identify',
        text: 'How easy is it for you to know what feeling you\'re having?',
        type: 'awareness',
        options: [
          { value: 4, label: 'Very easy - I always know', emoji: '💡' },
          { value: 3, label: 'Pretty easy', emoji: '😊' },
          { value: 2, label: 'Sometimes easy', emoji: '🤔' },
          { value: 1, label: 'Hard to tell', emoji: '😕' },
          { value: 0, label: 'I often don\'t know', emoji: '❓' }
        ],
        reverseScore: true,
        category: 'awareness'
      },
      {
        id: 'emotions_express',
        text: 'How comfortable are you sharing your feelings with others?',
        type: 'expression',
        options: [
          { value: 4, label: 'Very comfortable', emoji: '💬' },
          { value: 3, label: 'Pretty comfortable', emoji: '😊' },
          { value: 2, label: 'Somewhat comfortable', emoji: '🤷' },
          { value: 1, label: 'Not very comfortable', emoji: '😕' },
          { value: 0, label: 'I keep feelings inside', emoji: '🤐' }
        ],
        reverseScore: true,
        category: 'expression'
      },
      {
        id: 'emotions_variety',
        text: 'This week, how many different feelings did you notice?',
        type: 'range',
        options: [
          { value: 4, label: 'Many different feelings', emoji: '🌈' },
          { value: 3, label: 'Several feelings', emoji: '😊' },
          { value: 2, label: 'A few feelings', emoji: '😐' },
          { value: 1, label: 'Only 1 or 2 feelings', emoji: '😕' },
          { value: 0, label: 'Mostly just one feeling', emoji: '😐' }
        ],
        reverseScore: true,
        category: 'awareness'
      },
      {
        id: 'emotions_overwhelm',
        text: 'How often did feelings feel too big to handle?',
        type: 'regulation',
        options: [
          { value: 0, label: 'Never - I could handle them', emoji: '💪' },
          { value: 1, label: 'Rarely', emoji: '🙂' },
          { value: 2, label: 'Sometimes', emoji: '😐' },
          { value: 3, label: 'Often', emoji: '😰' },
          { value: 4, label: 'Very often', emoji: '🌊' }
        ],
        reverseScore: false
      },
      {
        id: 'emotions_strategies',
        text: 'Do you know good ways to help yourself feel better?',
        type: 'coping',
        options: [
          { value: 4, label: 'Yes, many ways', emoji: '🧰' },
          { value: 3, label: 'Yes, several ways', emoji: '👍' },
          { value: 2, label: 'A few ways', emoji: '🤷' },
          { value: 1, label: 'Only 1 or 2 ways', emoji: '😕' },
          { value: 0, label: 'Not really', emoji: '😔' }
        ],
        reverseScore: true,
        category: 'efficacy'
      },
      {
        id: 'emotions_confidence',
        text: 'How confident do you feel about understanding your emotions?',
        type: 'self_efficacy',
        options: [
          { value: 4, label: 'Very confident', emoji: '💪' },
          { value: 3, label: 'Pretty confident', emoji: '👍' },
          { value: 2, label: 'Somewhat confident', emoji: '🤷' },
          { value: 1, label: 'Not very confident', emoji: '😕' },
          { value: 0, label: 'Not confident at all', emoji: '😰' }
        ],
        reverseScore: true,
        category: 'efficacy'
      }
    ],
    scoringGuide: {
      maxScore: 24,
      interpretation: {
        low: { range: [16, 24], label: 'Strong emotional skills', color: '#4CAF50' },
        moderate: { range: [8, 15], label: 'Developing emotional skills', color: '#FF9800' },
        high: { range: [0, 7], label: 'Building emotional foundation', color: '#2196F3' }
      }
    }
  },

  social: {
    name: 'Friendship & Social Skills Check-In',
    description: 'Understanding how you connect with others',
    icon: '👫',
    color: '#4caf50',
    // Based on Social Skills Improvement System (SSIS)
    questions: [
      {
        id: 'social_comfort',
        text: 'How comfortable do you feel around other kids?',
        type: 'comfort',
        options: [
          { value: 4, label: 'Very comfortable', emoji: '😊' },
          { value: 3, label: 'Pretty comfortable', emoji: '🙂' },
          { value: 2, label: 'Somewhat comfortable', emoji: '😐' },
          { value: 1, label: 'A bit nervous', emoji: '😕' },
          { value: 0, label: 'Very nervous', emoji: '😰' }
        ],
        reverseScore: true,
        category: 'comfort'
      },
      {
        id: 'social_friends',
        text: 'How satisfied are you with your friendships?',
        type: 'satisfaction',
        options: [
          { value: 4, label: 'Very satisfied', emoji: '💖' },
          { value: 3, label: 'Pretty satisfied', emoji: '😊' },
          { value: 2, label: 'Somewhat satisfied', emoji: '😐' },
          { value: 1, label: 'Not very satisfied', emoji: '😕' },
          { value: 0, label: 'Not satisfied', emoji: '😔' }
        ],
        reverseScore: true,
        category: 'satisfaction'
      },
      {
        id: 'social_joining',
        text: 'How easy is it to join in when others are playing?',
        type: 'initiation',
        options: [
          { value: 4, label: 'Very easy', emoji: '🎉' },
          { value: 3, label: 'Pretty easy', emoji: '🙂' },
          { value: 2, label: 'Sometimes easy', emoji: '🤷' },
          { value: 1, label: 'Hard', emoji: '😕' },
          { value: 0, label: 'Very hard', emoji: '😔' }
        ],
        reverseScore: true,
        category: 'skills'
      },
      {
        id: 'social_conflict',
        text: 'When you disagree with a friend, can you work it out?',
        type: 'conflict_resolution',
        options: [
          { value: 4, label: 'Yes, usually pretty easily', emoji: '🤝' },
          { value: 3, label: 'Yes, most of the time', emoji: '👍' },
          { value: 2, label: 'Sometimes', emoji: '🤷' },
          { value: 1, label: 'It\'s hard', emoji: '😕' },
          { value: 0, label: 'We usually stay upset', emoji: '😔' }
        ],
        reverseScore: true,
        category: 'skills'
      },
      {
        id: 'social_listening',
        text: 'Are you a good listener when friends talk to you?',
        type: 'listening',
        options: [
          { value: 4, label: 'Yes, very good', emoji: '👂' },
          { value: 3, label: 'Pretty good', emoji: '😊' },
          { value: 2, label: 'Okay I guess', emoji: '😐' },
          { value: 1, label: 'I try but get distracted', emoji: '😕' },
          { value: 0, label: 'I find it hard', emoji: '😔' }
        ],
        reverseScore: true,
        category: 'skills'
      },
      {
        id: 'social_confidence',
        text: 'How confident do you feel about making and keeping friends?',
        type: 'self_efficacy',
        options: [
          { value: 4, label: 'Very confident', emoji: '💪' },
          { value: 3, label: 'Pretty confident', emoji: '👍' },
          { value: 2, label: 'Somewhat confident', emoji: '🤷' },
          { value: 1, label: 'Not very confident', emoji: '😕' },
          { value: 0, label: 'Not confident at all', emoji: '😰' }
        ],
        reverseScore: true,
        category: 'efficacy'
      }
    ],
    scoringGuide: {
      maxScore: 24,
      interpretation: {
        low: { range: [16, 24], label: 'Strong social skills', color: '#4CAF50' },
        moderate: { range: [8, 15], label: 'Developing social skills', color: '#FF9800' },
        high: { range: [0, 7], label: 'Building social foundation', color: '#2196F3' }
      }
    }
  },

  body: {
    name: 'Body Awareness Check-In',
    description: 'Understanding your body\'s signals',
    icon: '💪',
    color: '#f4a73b',
    questions: [
      {
        id: 'body_awareness',
        text: 'How well can you notice feelings in your body (like tight shoulders, tummy butterflies)?',
        type: 'awareness',
        options: [
          { value: 4, label: 'Very well - I notice lots of signals', emoji: '💡' },
          { value: 3, label: 'Pretty well', emoji: '😊' },
          { value: 2, label: 'Sometimes', emoji: '🤔' },
          { value: 1, label: 'Not very well', emoji: '😕' },
          { value: 0, label: 'I don\'t notice much', emoji: '❓' }
        ],
        reverseScore: true,
        category: 'awareness'
      },
      {
        id: 'body_tension',
        text: 'How often does your body feel tense or tight?',
        type: 'tension',
        options: [
          { value: 0, label: 'Never', emoji: '😌' },
          { value: 1, label: 'Rarely', emoji: '🙂' },
          { value: 2, label: 'Sometimes', emoji: '😐' },
          { value: 3, label: 'Often', emoji: '😣' },
          { value: 4, label: 'Almost always', emoji: '😫' }
        ],
        reverseScore: false
      },
      {
        id: 'body_relax',
        text: 'Can you relax your body when it feels tense?',
        type: 'regulation',
        options: [
          { value: 4, label: 'Yes, easily', emoji: '🧘' },
          { value: 3, label: 'Usually I can', emoji: '👍' },
          { value: 2, label: 'Sometimes', emoji: '🤷' },
          { value: 1, label: 'It\'s hard', emoji: '😕' },
          { value: 0, label: 'I don\'t know how', emoji: '😔' }
        ],
        reverseScore: true,
        category: 'skills'
      },
      {
        id: 'body_breathing',
        text: 'Do you use deep breathing when you\'re upset?',
        type: 'coping',
        options: [
          { value: 4, label: 'Yes, it helps a lot', emoji: '🌬️' },
          { value: 3, label: 'Yes, sometimes', emoji: '😊' },
          { value: 2, label: 'I\'ve tried it', emoji: '🤷' },
          { value: 1, label: 'Not really', emoji: '😕' },
          { value: 0, label: 'No / I don\'t know how', emoji: '❓' }
        ],
        reverseScore: true,
        category: 'skills'
      },
      {
        id: 'body_movement',
        text: 'Does moving your body (walking, stretching) help you feel better?',
        type: 'movement',
        options: [
          { value: 4, label: 'Yes, a lot', emoji: '🏃' },
          { value: 3, label: 'Yes, usually', emoji: '😊' },
          { value: 2, label: 'Sometimes', emoji: '🤷' },
          { value: 1, label: 'Not really', emoji: '😕' },
          { value: 0, label: 'I haven\'t tried', emoji: '❓' }
        ],
        reverseScore: true,
        category: 'skills'
      },
      {
        id: 'body_confidence',
        text: 'How confident do you feel about using your body to help manage feelings?',
        type: 'self_efficacy',
        options: [
          { value: 4, label: 'Very confident', emoji: '💪' },
          { value: 3, label: 'Pretty confident', emoji: '👍' },
          { value: 2, label: 'Somewhat confident', emoji: '🤷' },
          { value: 1, label: 'Not very confident', emoji: '😕' },
          { value: 0, label: 'Not confident at all', emoji: '😰' }
        ],
        reverseScore: true,
        category: 'efficacy'
      }
    ],
    scoringGuide: {
      maxScore: 24,
      interpretation: {
        low: { range: [16, 24], label: 'Strong body awareness', color: '#4CAF50' },
        moderate: { range: [8, 15], label: 'Developing body awareness', color: '#FF9800' },
        high: { range: [0, 7], label: 'Building body awareness', color: '#2196F3' }
      }
    }
  },

  cognitive: {
    name: 'Thinking Skills Check-In',
    description: 'Understanding your thinking patterns',
    icon: '🧠',
    color: '#35a4d4',
    questions: [
      {
        id: 'cognitive_thoughts',
        text: 'Can you notice when you\'re having unhelpful thoughts?',
        type: 'awareness',
        options: [
          { value: 4, label: 'Yes, I notice quickly', emoji: '💡' },
          { value: 3, label: 'Usually I notice', emoji: '😊' },
          { value: 2, label: 'Sometimes', emoji: '🤔' },
          { value: 1, label: 'Not very often', emoji: '😕' },
          { value: 0, label: 'I don\'t really notice', emoji: '❓' }
        ],
        reverseScore: true,
        category: 'awareness'
      },
      {
        id: 'cognitive_negative',
        text: 'How often do you have negative thoughts about yourself or situations?',
        type: 'frequency',
        options: [
          { value: 0, label: 'Never', emoji: '😊' },
          { value: 1, label: 'Rarely', emoji: '🙂' },
          { value: 2, label: 'Sometimes', emoji: '😐' },
          { value: 3, label: 'Often', emoji: '😕' },
          { value: 4, label: 'Very often', emoji: '😔' }
        ],
        reverseScore: false
      },
      {
        id: 'cognitive_challenge',
        text: 'Can you question whether your worried thoughts are true?',
        type: 'reframing',
        options: [
          { value: 4, label: 'Yes, I\'m good at that', emoji: '🔍' },
          { value: 3, label: 'Usually I can', emoji: '👍' },
          { value: 2, label: 'Sometimes', emoji: '🤷' },
          { value: 1, label: 'It\'s hard', emoji: '😕' },
          { value: 0, label: 'No, they feel very real', emoji: '😔' }
        ],
        reverseScore: true,
        category: 'skills'
      },
      {
        id: 'cognitive_perspective',
        text: 'Can you think of different ways to see a situation?',
        type: 'flexibility',
        options: [
          { value: 4, label: 'Yes, easily', emoji: '🌈' },
          { value: 3, label: 'Usually', emoji: '😊' },
          { value: 2, label: 'Sometimes', emoji: '🤷' },
          { value: 1, label: 'It\'s hard', emoji: '😕' },
          { value: 0, label: 'I get stuck on one view', emoji: '😔' }
        ],
        reverseScore: true,
        category: 'skills'
      },
      {
        id: 'cognitive_problem',
        text: 'When you have a problem, can you think of solutions?',
        type: 'problem_solving',
        options: [
          { value: 4, label: 'Yes, I think of many', emoji: '💡' },
          { value: 3, label: 'Usually some ideas', emoji: '👍' },
          { value: 2, label: 'Sometimes', emoji: '🤷' },
          { value: 1, label: 'It\'s hard', emoji: '😕' },
          { value: 0, label: 'I feel stuck', emoji: '😔' }
        ],
        reverseScore: true,
        category: 'skills'
      },
      {
        id: 'cognitive_confidence',
        text: 'How confident do you feel about managing your thoughts?',
        type: 'self_efficacy',
        options: [
          { value: 4, label: 'Very confident', emoji: '💪' },
          { value: 3, label: 'Pretty confident', emoji: '👍' },
          { value: 2, label: 'Somewhat confident', emoji: '🤷' },
          { value: 1, label: 'Not very confident', emoji: '😕' },
          { value: 0, label: 'Not confident at all', emoji: '😰' }
        ],
        reverseScore: true,
        category: 'efficacy'
      }
    ],
    scoringGuide: {
      maxScore: 24,
      interpretation: {
        low: { range: [16, 24], label: 'Strong thinking skills', color: '#4CAF50' },
        moderate: { range: [8, 15], label: 'Developing thinking skills', color: '#FF9800' },
        high: { range: [0, 7], label: 'Building thinking foundation', color: '#2196F3' }
      }
    }
  },

  general: {
    name: 'General Wellbeing Check-In',
    description: 'How are you doing overall?',
    icon: '📚',
    color: '#4c6c96',
    questions: [
      {
        id: 'general_happy',
        text: 'Overall, how happy have you felt this week?',
        type: 'happiness',
        options: [
          { value: 4, label: 'Very happy', emoji: '😄' },
          { value: 3, label: 'Pretty happy', emoji: '😊' },
          { value: 2, label: 'Okay', emoji: '😐' },
          { value: 1, label: 'A bit unhappy', emoji: '😕' },
          { value: 0, label: 'Unhappy', emoji: '😔' }
        ],
        reverseScore: true,
        category: 'wellbeing'
      },
      {
        id: 'general_coping',
        text: 'How well did you handle difficult situations this week?',
        type: 'coping',
        options: [
          { value: 4, label: 'Very well', emoji: '💪' },
          { value: 3, label: 'Pretty well', emoji: '👍' },
          { value: 2, label: 'Okay', emoji: '🤷' },
          { value: 1, label: 'Not great', emoji: '😕' },
          { value: 0, label: 'Struggled a lot', emoji: '😔' }
        ],
        reverseScore: true,
        category: 'coping'
      },
      {
        id: 'general_school',
        text: 'How was school/learning this week?',
        type: 'functioning',
        options: [
          { value: 4, label: 'Great', emoji: '⭐' },
          { value: 3, label: 'Good', emoji: '😊' },
          { value: 2, label: 'Okay', emoji: '😐' },
          { value: 1, label: 'Not great', emoji: '😕' },
          { value: 0, label: 'Really hard', emoji: '😔' }
        ],
        reverseScore: true,
        category: 'functioning'
      },
      {
        id: 'general_family',
        text: 'How did things go with your family this week?',
        type: 'relationships',
        options: [
          { value: 4, label: 'Really well', emoji: '💖' },
          { value: 3, label: 'Good', emoji: '😊' },
          { value: 2, label: 'Okay', emoji: '😐' },
          { value: 1, label: 'Some problems', emoji: '😕' },
          { value: 0, label: 'A lot of problems', emoji: '😔' }
        ],
        reverseScore: true,
        category: 'relationships'
      },
      {
        id: 'general_sleep',
        text: 'How well did you sleep this week?',
        type: 'sleep',
        options: [
          { value: 4, label: 'Very well', emoji: '😴' },
          { value: 3, label: 'Pretty well', emoji: '😊' },
          { value: 2, label: 'Okay', emoji: '😐' },
          { value: 1, label: 'Not great', emoji: '😫' },
          { value: 0, label: 'Poorly', emoji: '😩' }
        ],
        reverseScore: true,
        category: 'health'
      },
      {
        id: 'general_confidence',
        text: 'How confident do you feel about handling challenges?',
        type: 'self_efficacy',
        options: [
          { value: 4, label: 'Very confident', emoji: '💪' },
          { value: 3, label: 'Pretty confident', emoji: '👍' },
          { value: 2, label: 'Somewhat confident', emoji: '🤷' },
          { value: 1, label: 'Not very confident', emoji: '😕' },
          { value: 0, label: 'Not confident at all', emoji: '😰' }
        ],
        reverseScore: true,
        category: 'efficacy'
      }
    ],
    scoringGuide: {
      maxScore: 24,
      interpretation: {
        low: { range: [16, 24], label: 'Doing well', color: '#4CAF50' },
        moderate: { range: [8, 15], label: 'Some challenges', color: '#FF9800' },
        high: { range: [0, 7], label: 'Needs support', color: '#2196F3' }
      }
    }
  }
};

// Assessment timing configuration
const ASSESSMENT_TIMING = {
  BASELINE: 'baseline',      // Before starting modules
  MIDPOINT: 'midpoint',      // At 50% completion
  ENDPOINT: 'endpoint'       // After completing all modules
};

// ================================================
// PROGRESS TRACKING SYSTEM CLASS
// ================================================

class ProgressTrackingSystem {
  constructor() {
    this.currentAssessment = null;
    this.currentQuestionIndex = 0;
    this.responses = {};
    this.childId = null;
    this.pathwayId = null;
    this.assessmentType = null;
    this.supabaseClient = null;
  }

  async init(supabase) {
    this.supabaseClient = supabase;
    this.injectStyles();
    console.log('Progress Tracking System initialized');
  }

  injectStyles() {
    if (document.getElementById('progress-tracking-styles')) return;
    
    const css = `
      /* Assessment Modal Overlay */
      .assessment-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        animation: fadeIn 0.3s ease;
      }

      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }

      /* Assessment Modal */
      .assessment-modal {
        background: white;
        border-radius: 24px;
        max-width: 600px;
        width: 90%;
        max-height: 90vh;
        overflow-y: auto;
        box-shadow: 0 25px 80px rgba(0, 0, 0, 0.3);
        animation: slideUp 0.4s ease;
      }

      @keyframes slideUp {
        from { transform: translateY(50px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }

      /* Assessment Header */
      .assessment-header {
        padding: 28px 32px;
        border-bottom: 1px solid #eee;
        text-align: center;
        position: relative;
      }

      .assessment-icon {
        font-size: 56px;
        margin-bottom: 12px;
        display: block;
      }

      .assessment-title {
        font-family: 'Fredoka', 'League Spartan', sans-serif;
        font-size: 26px;
        font-weight: 700;
        margin: 0 0 8px 0;
        color: #405878;
      }

      .assessment-description {
        color: #6d86a8;
        font-size: 15px;
        margin: 0;
      }

      .assessment-disclaimer {
        color: #9e9e9e;
        font-size: 13px;
        font-style: italic;
        margin: 8px 0 0 0;
      }

      .assessment-timing-badge {
        display: inline-block;
        padding: 6px 14px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 700;
        text-transform: uppercase;
        margin-top: 12px;
      }

      .assessment-timing-badge.baseline {
        background: #e3f2fd;
        color: #1976d2;
      }

      .assessment-timing-badge.midpoint {
        background: #fff3e0;
        color: #f57c00;
      }

      .assessment-timing-badge.checkin {
        background: #f3e5f5;
        color: #7b1fa2;
      }

      .assessment-timing-badge.endpoint {
        background: #e8f5e9;
        color: #388e3c;
      }

      /* Progress Bar */
      .assessment-progress {
        padding: 16px 32px;
        background: #f8f9fa;
      }

      .progress-info {
        display: flex;
        justify-content: space-between;
        margin-bottom: 8px;
        font-size: 13px;
        color: #6d86a8;
        font-weight: 600;
      }

      .progress-track {
        height: 8px;
        background: #e0e0e0;
        border-radius: 4px;
        overflow: hidden;
      }

      .progress-fill {
        height: 100%;
        border-radius: 4px;
        transition: width 0.4s ease;
      }

      /* Question Area */
      .assessment-question {
        padding: 32px;
      }

      .question-number {
        font-size: 13px;
        color: #6d86a8;
        font-weight: 700;
        text-transform: uppercase;
        margin-bottom: 12px;
      }

      .question-text {
        font-family: 'Fredoka', 'League Spartan', sans-serif;
        font-size: 22px;
        font-weight: 600;
        color: #405878;
        margin: 0 0 28px 0;
        line-height: 1.4;
      }

      /* Answer Options */
      .answer-options {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .answer-option {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 16px 20px;
        border: 3px solid #e8ecf4;
        border-radius: 16px;
        cursor: pointer;
        transition: all 0.2s ease;
        background: white;
      }

      .answer-option:hover {
        border-color: #b8c5d9;
        transform: translateX(4px);
      }

      .answer-option.selected {
        border-color: #4CAF50;
        background: #f1f8f1;
      }

      .answer-emoji {
        font-size: 32px;
        flex-shrink: 0;
      }

      .answer-text {
        font-size: 16px;
        font-weight: 600;
        color: #405878;
      }

      .answer-radio {
        width: 24px;
        height: 24px;
        border: 3px solid #d0d7e2;
        border-radius: 50%;
        margin-left: auto;
        flex-shrink: 0;
        position: relative;
        transition: all 0.2s ease;
      }

      .answer-option.selected .answer-radio {
        border-color: #4CAF50;
      }

      .answer-option.selected .answer-radio::after {
        content: '';
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 12px;
        height: 12px;
        background: #4CAF50;
        border-radius: 50%;
      }

      /* Navigation Buttons */
      .assessment-nav {
        padding: 24px 32px;
        border-top: 1px solid #eee;
        display: flex;
        gap: 12px;
        justify-content: flex-end;
      }

      .assessment-btn {
        padding: 14px 28px;
        border-radius: 12px;
        font-family: 'League Spartan', sans-serif;
        font-size: 16px;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.2s ease;
        border: none;
      }

      .assessment-btn.secondary {
        background: #f0f2f5;
        color: #6d86a8;
      }

      .assessment-btn.secondary:hover {
        background: #e4e7ec;
      }

      .assessment-btn.primary {
        background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
        color: white;
        box-shadow: 0 4px 14px rgba(76, 175, 80, 0.35);
      }

      .assessment-btn.primary:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(76, 175, 80, 0.45);
      }

      .assessment-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
        transform: none;
      }

      /* Results Screen */
      .assessment-results {
        padding: 40px 32px;
        text-align: center;
      }

      .results-icon {
        font-size: 72px;
        margin-bottom: 20px;
      }

      .results-title {
        font-family: 'Fredoka', 'League Spartan', sans-serif;
        font-size: 28px;
        font-weight: 700;
        color: #405878;
        margin: 0 0 12px 0;
      }

      .results-message {
        color: #6d86a8;
        font-size: 16px;
        margin-bottom: 32px;
        line-height: 1.6;
      }

      .score-display {
        background: linear-gradient(135deg, #f8f9fa 0%, #e8ecf4 100%);
        border-radius: 20px;
        padding: 28px;
        margin-bottom: 28px;
      }

      .score-label {
        font-size: 14px;
        color: #6d86a8;
        font-weight: 600;
        text-transform: uppercase;
        margin-bottom: 8px;
      }

      .score-value {
        font-family: 'Fredoka', sans-serif;
        font-size: 48px;
        font-weight: 700;
        color: #405878;
      }

      .score-interpretation {
        display: inline-block;
        padding: 8px 20px;
        border-radius: 20px;
        font-size: 14px;
        font-weight: 700;
        margin-top: 12px;
        color: white;
      }

      /* Comparison Display for midpoint/endpoint */
      .score-comparison {
        display: flex;
        justify-content: center;
        gap: 24px;
        margin-top: 20px;
        flex-wrap: wrap;
      }

      .comparison-item {
        background: white;
        border-radius: 12px;
        padding: 16px 24px;
        min-width: 120px;
      }

      .comparison-label {
        font-size: 12px;
        color: #6d86a8;
        font-weight: 600;
        text-transform: uppercase;
        margin-bottom: 4px;
      }

      .comparison-value {
        font-family: 'Fredoka', sans-serif;
        font-size: 28px;
        font-weight: 700;
        color: #405878;
      }

      .comparison-change {
        font-size: 14px;
        font-weight: 700;
        margin-top: 4px;
      }

      .comparison-change.improved {
        color: #4CAF50;
      }

      .comparison-change.declined {
        color: #F44336;
      }

      .comparison-change.same {
        color: #9e9e9e;
      }

      /* Close button */
      .assessment-close {
        position: absolute;
        top: 16px;
        right: 16px;
        width: 36px;
        height: 36px;
        border-radius: 50%;
        border: none;
        background: #f0f2f5;
        cursor: pointer;
        font-size: 18px;
        color: #6d86a8;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
      }

      .assessment-close:hover {
        background: #e4e7ec;
        color: #405878;
      }

      /* Skip link */
      .skip-assessment {
        text-align: center;
        padding: 0 32px 24px;
      }

      .skip-link {
        color: #9e9e9e;
        font-size: 14px;
        cursor: pointer;
        text-decoration: underline;
      }

      .skip-link:hover {
        color: #6d86a8;
      }

      /* Mobile responsiveness */
      @media (max-width: 600px) {
        .assessment-modal {
          width: 95%;
          border-radius: 20px;
        }

        .assessment-header {
          padding: 20px 24px;
        }

        .assessment-icon {
          font-size: 48px;
        }

        .assessment-title {
          font-size: 22px;
        }

        .assessment-question {
          padding: 24px;
        }

        .question-text {
          font-size: 18px;
        }

        .answer-option {
          padding: 12px 16px;
        }

        .answer-emoji {
          font-size: 28px;
        }

        .answer-text {
          font-size: 14px;
        }

        .assessment-nav {
          padding: 20px 24px;
        }
      }
    `;

    const style = document.createElement('style');
    style.id = 'progress-tracking-styles';
    style.textContent = css;
    document.head.appendChild(style);
  }

  // Check if an assessment is needed before starting a module
  async checkAssessmentNeeded(childId, pathwayOrSuperSkill, completedModules, totalModules) {
    if (!this.supabaseClient) {
      console.warn('Supabase client not initialized');
      return null;
    }

    this.childId = childId;
    
    // Handle both super skill slugs and old category names
    let pathway = pathwayOrSuperSkill.toLowerCase();
    if (SUPERSKILL_TO_ASSESSMENT[pathway]) {
      pathway = SUPERSKILL_TO_ASSESSMENT[pathway];
    }

    // Check for existing assessments
    const { data: assessments, error } = await this.supabaseClient
      .from('pathway_assessments')
      .select('*')
      .eq('child_id', childId)
      .eq('pathway_category', pathway)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching assessments:', error);
      return null;
    }

    const hasBaseline = assessments?.some(a => a.assessment_type === 'baseline');
    const hasMidpoint = assessments?.some(a => a.assessment_type === 'midpoint');
    const hasEndpoint = assessments?.some(a => a.assessment_type === 'endpoint');

    const progressPercent = totalModules > 0 ? (completedModules / totalModules) * 100 : 0;

    // Check-ins after every 3 modules
    const checkInModuleCount = 3;
    const nextCheckInTarget = Math.floor(completedModules / checkInModuleCount) * checkInModuleCount + checkInModuleCount;
    
    // Count how many check-ins have been completed
    const completedCheckIns = assessments?.filter(a => 
      a.assessment_type !== 'baseline' && 
      a.assessment_type !== 'midpoint' && 
      a.assessment_type !== 'endpoint'
    ).length || 0;
    
    const expectedCheckIns = Math.floor(completedModules / checkInModuleCount);

    // Determine which assessment is needed
    if (!hasBaseline && completedModules === 0) {
      return ASSESSMENT_TIMING.BASELINE;
    }

    // Check if we need a check-in after every 3 modules
    if (completedModules > 0 && completedModules % checkInModuleCount === 0 && completedCheckIns < expectedCheckIns) {
      return 'checkin';
    }

    // Keep midpoint and endpoint for overall progress
    if (hasBaseline && !hasMidpoint && progressPercent >= 40 && progressPercent < 90) {
      return ASSESSMENT_TIMING.MIDPOINT;
    }

    if (hasBaseline && hasMidpoint && !hasEndpoint && progressPercent >= 90) {
      return ASSESSMENT_TIMING.ENDPOINT;
    }

    // Also trigger endpoint if all modules complete and no endpoint yet
    if (hasBaseline && !hasEndpoint && completedModules >= totalModules && totalModules > 0) {
      return ASSESSMENT_TIMING.ENDPOINT;
    }

    return null;
  }

  // Show assessment modal
  async showAssessment(childId, pathwayOrSuperSkill, assessmentType, onComplete, onSkip) {
    this.childId = childId;
    
    // Handle both super skill slugs and old category names
    let assessmentKey = pathwayOrSuperSkill.toLowerCase();
    
    // If it's a super skill slug, map it to the assessment category
    if (SUPERSKILL_TO_ASSESSMENT[assessmentKey]) {
      assessmentKey = SUPERSKILL_TO_ASSESSMENT[assessmentKey];
    }
    
    this.pathwayId = assessmentKey;
    this.assessmentType = assessmentType;
    this.currentQuestionIndex = 0;
    this.responses = {};

    const assessment = PATHWAY_ASSESSMENTS[this.pathwayId] || PATHWAY_ASSESSMENTS.general;
    this.currentAssessment = assessment;

    const overlay = document.createElement('div');
    overlay.className = 'assessment-overlay';
    overlay.id = 'assessmentOverlay';

    const timingLabels = {
      baseline: 'Starting Point Check-In',
      midpoint: 'Halfway Progress Check',
      endpoint: 'Journey Complete Check-In',
      checkin: 'Progress Check-In'
    };

    const timingDescriptions = {
      baseline: 'Let\'s see how you\'re doing before we start. This helps us track your progress!',
      midpoint: 'You\'re halfway there! Let\'s check in and see how you\'re progressing.',
      endpoint: 'Amazing work completing your journey! Let\'s see how much you\'ve grown.',
      checkin: 'Great progress! Let\'s check in and see how you\'re doing.'
    };

    overlay.innerHTML = `
      <div class="assessment-modal">
        <div class="assessment-header">
          <span class="assessment-icon">${assessment.icon}</span>
          <h2 class="assessment-title">${assessment.name}</h2>
          <p class="assessment-description">${timingDescriptions[assessmentType]}</p>
          <p class="assessment-disclaimer">These questions are not a diagnosis. They help track emotional skills over time.</p>
          <span class="assessment-timing-badge ${assessmentType}">${timingLabels[assessmentType]}</span>
        </div>
        
        <div class="assessment-progress">
          <div class="progress-info">
            <span>Question <span id="currentQuestion">1</span> of ${assessment.questions.length}</span>
            <span id="progressPercent">0%</span>
          </div>
          <div class="progress-track">
            <div class="progress-fill" id="progressFill" style="width: 0%; background: ${assessment.color}"></div>
          </div>
        </div>

        <div class="assessment-question" id="questionArea">
          <!-- Question content will be inserted here -->
        </div>

        <div class="assessment-nav">
          <button class="assessment-btn secondary" id="prevBtn" style="display: none;">← Back</button>
          <button class="assessment-btn primary" id="nextBtn" disabled>Next →</button>
        </div>

        ${assessmentType === 'baseline' ? `
          <div class="skip-assessment">
            <span class="skip-link" id="skipAssessment">Skip for now</span>
          </div>
        ` : ''}
      </div>
    `;

    document.body.appendChild(overlay);
    this.renderQuestion();
    this.setupEventListeners(onComplete, onSkip);
  }

  renderQuestion() {
    const questionArea = document.getElementById('questionArea');
    const question = this.currentAssessment.questions[this.currentQuestionIndex];
    const savedResponse = this.responses[question.id];

    questionArea.innerHTML = `
      <div class="question-number">Question ${this.currentQuestionIndex + 1}</div>
      <h3 class="question-text">${question.text}</h3>
      <div class="answer-options">
        ${question.options.map((opt, idx) => `
          <div class="answer-option ${savedResponse === opt.value ? 'selected' : ''}" data-value="${opt.value}">
            <span class="answer-emoji">${opt.emoji}</span>
            <span class="answer-text">${opt.label}</span>
            <div class="answer-radio"></div>
          </div>
        `).join('')}
      </div>
    `;

    // Update progress
    const progress = ((this.currentQuestionIndex) / this.currentAssessment.questions.length) * 100;
    document.getElementById('currentQuestion').textContent = this.currentQuestionIndex + 1;
    document.getElementById('progressPercent').textContent = Math.round(progress) + '%';
    document.getElementById('progressFill').style.width = progress + '%';

    // Update navigation buttons
    document.getElementById('prevBtn').style.display = this.currentQuestionIndex > 0 ? 'block' : 'none';
    document.getElementById('nextBtn').disabled = savedResponse === undefined;
    document.getElementById('nextBtn').textContent = 
      this.currentQuestionIndex === this.currentAssessment.questions.length - 1 ? 'Finish ✓' : 'Next →';

    // Add click handlers for options
    const options = questionArea.querySelectorAll('.answer-option');
    options.forEach(opt => {
      opt.addEventListener('click', () => {
        options.forEach(o => o.classList.remove('selected'));
        opt.classList.add('selected');
        this.responses[question.id] = parseInt(opt.dataset.value);
        document.getElementById('nextBtn').disabled = false;
      });
    });
  }

  setupEventListeners(onComplete, onSkip) {
    const overlay = document.getElementById('assessmentOverlay');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const skipLink = document.getElementById('skipAssessment');

    prevBtn.addEventListener('click', () => {
      if (this.currentQuestionIndex > 0) {
        this.currentQuestionIndex--;
        this.renderQuestion();
      }
    });

    nextBtn.addEventListener('click', async () => {
      if (this.currentQuestionIndex < this.currentAssessment.questions.length - 1) {
        this.currentQuestionIndex++;
        this.renderQuestion();
      } else {
        // Complete assessment
        const results = await this.calculateAndSaveResults();
        this.showResults(results, onComplete);
      }
    });

    if (skipLink) {
      skipLink.addEventListener('click', () => {
        overlay.remove();
        if (onSkip) onSkip();
      });
    }
  }

  async calculateAndSaveResults() {
    const questions = this.currentAssessment.questions;
    let totalScore = 0;
    let efficacyScore = 0;
    let efficacyCount = 0;

    const questionScores = {};

    questions.forEach(q => {
      const response = this.responses[q.id];
      if (response !== undefined) {
        const maxOptionValue = Array.isArray(q.options)
          ? q.options.reduce((max, opt) => Math.max(max, Number(opt.value)), 0)
          : 4;

        // If reverseScore is true, higher response indicates better functioning.
        // Reverse it so that better functioning lowers the total symptom score.
        const score = q.reverseScore ? (maxOptionValue - response) : response;
        questionScores[q.id] = score;
        totalScore += score;

        if (q.category === 'efficacy' || q.type === 'self_efficacy') {
          // Efficacy should remain "higher = better" for reporting, even if the item is reverse-scored for total symptoms.
          efficacyScore += response;
          efficacyCount++;
        }
      }
    });

    // Get previous assessments for comparison
    let previousAssessments = [];
    if (this.supabaseClient) {
      const { data } = await this.supabaseClient
        .from('pathway_assessments')
        .select('*')
        .eq('child_id', this.childId)
        .eq('pathway_category', this.pathwayId)
        .order('created_at', { ascending: true });
      previousAssessments = data || [];
    }

    const results = {
      childId: this.childId,
      pathwayCategory: this.pathwayId,
      assessmentType: this.assessmentType,
      totalScore: totalScore,
      maxScore: this.currentAssessment.scoringGuide.maxScore,
      efficacyScore: efficacyCount > 0 ? Math.round(efficacyScore / efficacyCount * 100) / 100 : null,
      questionScores: questionScores,
      responses: this.responses,
      previousAssessments: previousAssessments,
      timestamp: new Date().toISOString()
    };

    // Save to database
    await this.saveAssessment(results);

    return results;
  }

  async saveAssessment(results) {
    if (!this.supabaseClient) {
      console.warn('Cannot save assessment - Supabase not initialized');
      return;
    }

    const { error } = await this.supabaseClient
      .from('pathway_assessments')
      .insert({
        child_id: results.childId,
        pathway_category: results.pathwayCategory,
        assessment_type: results.assessmentType,
        total_score: results.totalScore,
        max_score: results.maxScore,
        efficacy_score: results.efficacyScore,
        question_scores: results.questionScores,
        responses: results.responses,
        created_at: results.timestamp
      });

    if (error) {
      console.error('Error saving assessment:', error);
    } else {
      console.log('Assessment saved successfully');
    }
  }

  showResults(results, onComplete) {
    const overlay = document.getElementById('assessmentOverlay');
    const modal = overlay.querySelector('.assessment-modal');
    
    const guide = this.currentAssessment.scoringGuide;
    let interpretation = guide.interpretation.moderate;
    
    // Find the correct interpretation based on score
    for (const key of ['low', 'moderate', 'high']) {
      const range = guide.interpretation[key].range;
      if (results.totalScore >= range[0] && results.totalScore <= range[1]) {
        interpretation = guide.interpretation[key];
        break;
      }
    }

    // Calculate comparison if we have previous data
    let comparisonHTML = '';
    if (results.previousAssessments && results.previousAssessments.length > 0) {
      const baseline = results.previousAssessments.find(a => a.assessment_type === 'baseline');
      const midpoint = results.previousAssessments.find(a => a.assessment_type === 'midpoint');
      
      if (baseline || midpoint) {
        comparisonHTML = `
          <div class="score-comparison">
            ${baseline ? `
              <div class="comparison-item">
                <div class="comparison-label">Baseline</div>
                <div class="comparison-value">${baseline.total_score}</div>
              </div>
            ` : ''}
            ${midpoint ? `
              <div class="comparison-item">
                <div class="comparison-label">Midpoint</div>
                <div class="comparison-value">${midpoint.total_score}</div>
              </div>
            ` : ''}
            <div class="comparison-item">
              <div class="comparison-label">Now</div>
              <div class="comparison-value">${results.totalScore}</div>
              ${this.getChangeIndicator(baseline?.total_score, results.totalScore)}
            </div>
          </div>
        `;
      }
    }

    const messages = {
      baseline: 'Great job completing your check-in! This helps us understand where you\'re starting from.',
      midpoint: 'Awesome work! You\'re making great progress on your journey.',
      endpoint: 'Congratulations on completing your journey! Let\'s see how much you\'ve grown!',
      checkin: 'Great progress! Keep up the amazing work on your journey!'
    };

    modal.innerHTML = `
      <div class="assessment-results">
        <div class="results-icon">${results.assessmentType === 'endpoint' ? '🎉' : '✨'}</div>
        <h2 class="results-title">Check-In Complete!</h2>
        <p class="results-message">${messages[results.assessmentType]}</p>
        
        <div class="score-display">
          <div class="score-label">Your Score</div>
          <div class="score-value">${results.totalScore}/${results.maxScore}</div>
          <div class="score-interpretation" style="background: ${interpretation.color}">
            ${interpretation.label}
          </div>
          ${comparisonHTML}
        </div>
        
        <button class="assessment-btn primary" id="continueBtn" style="margin: 0 auto;">
          ${results.assessmentType === 'endpoint' ? 'See Your Journey 🗺️' : 'Continue to Adventure! 🚀'}
        </button>
      </div>
    `;

    document.getElementById('continueBtn').addEventListener('click', () => {
      overlay.remove();
      if (onComplete) onComplete(results);
    });
  }

  getChangeIndicator(baseline, current) {
    if (!baseline) return '';
    
    const diff = current - baseline;
    // For most assessments, lower score = better (less symptoms)
    // But we need to check the assessment type
    const assessmentType = this.currentAssessment;
    
    // For "negative" assessments (anger, anxiety, depression), lower is better
    // For "positive" assessments (emotions, social, cognitive, body, general), higher is better
    const lowerIsBetter = ['anger', 'anxiety', 'depression'].includes(this.pathwayId);
    
    let improved = lowerIsBetter ? diff < 0 : diff > 0;
    let changeClass = diff === 0 ? 'same' : (improved ? 'improved' : 'declined');
    let changeText = diff === 0 ? 'No change' : (improved ? `↓ ${Math.abs(diff)} improved` : `↑ ${Math.abs(diff)}`);
    
    if (!lowerIsBetter) {
      changeText = diff === 0 ? 'No change' : (improved ? `↑ ${Math.abs(diff)} improved` : `↓ ${Math.abs(diff)}`);
    }
    
    return `<div class="comparison-change ${changeClass}">${changeText}</div>`;
  }

  // Get assessment data for parent insights
  async getProgressData(childId, pathwayOrSuperSkill) {
    if (!this.supabaseClient) return null;

    // Handle both super skill slugs and old category names
    let pathway = pathwayOrSuperSkill.toLowerCase();
    if (SUPERSKILL_TO_ASSESSMENT[pathway]) {
      pathway = SUPERSKILL_TO_ASSESSMENT[pathway];
    }

    const { data, error } = await this.supabaseClient
      .from('pathway_assessments')
      .select('*')
      .eq('child_id', childId)
      .eq('pathway_category', pathway)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching progress data:', error);
      return null;
    }

    return data;
  }

  // Generate progress report for parent insights
  generateProgressReport(assessments) {
    if (!assessments || assessments.length === 0) return null;

    const baseline = assessments.find(a => a.assessment_type === 'baseline');
    const midpoint = assessments.find(a => a.assessment_type === 'midpoint');
    const endpoint = assessments.find(a => a.assessment_type === 'endpoint');

    return {
      hasBaseline: !!baseline,
      hasMidpoint: !!midpoint,
      hasEndpoint: !!endpoint,
      baseline: baseline ? {
        score: baseline.total_score,
        maxScore: baseline.max_score,
        efficacy: baseline.efficacy_score,
        date: baseline.created_at
      } : null,
      midpoint: midpoint ? {
        score: midpoint.total_score,
        maxScore: midpoint.max_score,
        efficacy: midpoint.efficacy_score,
        date: midpoint.created_at,
        changeFromBaseline: baseline ? midpoint.total_score - baseline.total_score : null
      } : null,
      endpoint: endpoint ? {
        score: endpoint.total_score,
        maxScore: endpoint.max_score,
        efficacy: endpoint.efficacy_score,
        date: endpoint.created_at,
        changeFromBaseline: baseline ? endpoint.total_score - baseline.total_score : null,
        changeFromMidpoint: midpoint ? endpoint.total_score - midpoint.total_score : null
      } : null
    };
  }
}

// ================================================
// EXPORT AND INITIALIZATION
// ================================================

// Create global instance
window.progressTrackingSystem = new ProgressTrackingSystem();
window.PATHWAY_ASSESSMENTS = PATHWAY_ASSESSMENTS;
window.ASSESSMENT_TIMING = ASSESSMENT_TIMING;
window.SUPERSKILL_TO_ASSESSMENT = SUPERSKILL_TO_ASSESSMENT;
window.CATEGORY_TO_SUPERSKILL_PROGRESS = CATEGORY_TO_SUPERSKILL;

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    ProgressTrackingSystem,
    PATHWAY_ASSESSMENTS,
    ASSESSMENT_TIMING,
    SUPERSKILL_TO_ASSESSMENT,
    CATEGORY_TO_SUPERSKILL
  };
}

console.log('Progress Tracking System loaded - Version ' + PROGRESS_TRACKING_VERSION);