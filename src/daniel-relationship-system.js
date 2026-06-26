// ================================================
// DANIEL RELATIONSHIP SYSTEM
// Making Daniel central - The child helps Daniel grow
// ================================================
import { escapeHtml } from './lib/sanitize.js'

// Daniel's emotional states and expressions
const DANIEL_EMOTIONS = {
  curious: {
    image: '/images/characters/DanielTheDog.webp',
    fallbackEmoji: '🐕',
    color: '#6366F1'
  },
  nervous: {
    image: '/images/characters/DanielTheDog.webp',
    fallbackEmoji: '🐕',
    color: '#F59E0B'
  },
  hopeful: {
    image: '/images/characters/DanielTheDog.webp',
    fallbackEmoji: '🐕',
    color: '#10B981'
  },
  proud: {
    image: '/images/characters/DanielTheDog.webp',
    fallbackEmoji: '🐕',
    color: '#EC4899'
  },
  relieved: {
    image: '/images/characters/DanielTheDog.webp',
    fallbackEmoji: '🐕',
    color: '#06B6D4'
  },
  grateful: {
    image: '/images/characters/DanielTheDog.webp',
    fallbackEmoji: '🐕',
    color: '#8B5CF6'
  },
  thinking: {
    image: '/images/characters/DanielTheDog.webp',
    fallbackEmoji: '🐕',
    color: '#64748B'
  }
};

// Daniel's pre-activity moments - relatable situations with choice questions
const DANIEL_PRE_ACTIVITY = {
  'emotion-navigator': [
    {
      emotion: 'nervous',
      situation: "I got a bit upset at my friend today and now my tummy feels funny. I'm not sure if I should say sorry or wait...",
      question: "What do you think - should we figure this out together?",
      skillHint: 'understanding feelings'
    },
    {
      emotion: 'curious',
      situation: "Sometimes I feel SO many feelings at once, like a big swirly storm inside me!",
      question: "Do you ever feel that way too? Want to help me learn what to do?",
      skillHint: 'naming emotions'
    },
    {
      emotion: 'nervous',
      situation: "My sister got a bigger treat than me and I felt really mad. But also a bit sad?",
      question: "Is it okay to feel two things at once? Let's find out!",
      skillHint: 'mixed emotions'
    }
  ],
  'calm-controller': [
    {
      emotion: 'nervous',
      situation: "My heart is beating really fast right now. There's a big dog show coming up and I keep thinking about everything that could go wrong...",
      question: "Do you know any tricks to help a worried pup like me?",
      skillHint: 'calming techniques'
    },
    {
      emotion: 'thinking',
      situation: "I heard a loud noise and I jumped under the bed! My body moved before I even thought about it.",
      question: "Does your body ever do that? Want to explore why together?",
      skillHint: 'body signals'
    },
    {
      emotion: 'curious',
      situation: "Everyone says 'just calm down' but I don't know HOW. It's like telling me to fly!",
      question: "Maybe we can figure out some actual steps? Want to try?",
      skillHint: 'calming strategies'
    }
  ],
  'brain-builder': [
    {
      emotion: 'curious',
      situation: "I keep forgetting things! Like where I put my favorite toy... and what I was just doing...",
      question: "I wonder if there are tricks to help our brains remember better?",
      skillHint: 'memory skills'
    },
    {
      emotion: 'thinking',
      situation: "Sometimes my brain feels like a TV with too many channels on at once!",
      question: "Do you know how to find the 'focus' button? Let's look together!",
      skillHint: 'focus techniques'
    },
    {
      emotion: 'nervous',
      situation: "I made a mistake and my brain keeps replaying it over and over like a broken record...",
      question: "How do we tell our brains it's okay and move on? Any ideas?",
      skillHint: 'thought management'
    }
  ],
  'thought-driver': [
    {
      emotion: 'thinking',
      situation: "I caught myself thinking 'I'm the worst at everything' but... that can't be true, right?",
      question: "Want to help me check if my thoughts are being fair to me?",
      skillHint: 'thought challenging'
    },
    {
      emotion: 'curious',
      situation: "My friend said something and my brain immediately decided they were being mean. But maybe I got it wrong?",
      question: "How do we know when our thoughts are telling us the truth?",
      skillHint: 'perspective taking'
    },
    {
      emotion: 'nervous',
      situation: "I keep imagining the WORST thing happening, even when everything is fine!",
      question: "Does your brain do that too? Want to figure out how to stop it?",
      skillHint: 'catastrophic thinking'
    }
  ],
  'body-boss': [
    {
      emotion: 'curious',
      situation: "I noticed my shoulders were up by my ears! I didn't even tell them to do that!",
      question: "Want to explore what our bodies are trying to tell us?",
      skillHint: 'body awareness'
    },
    {
      emotion: 'nervous',
      situation: "When I get really upset, my whole body goes stiff like a statue. I can't move properly!",
      question: "Do you know any ways to help a stiff pup get unstuck?",
      skillHint: 'tension release'
    },
    {
      emotion: 'thinking',
      situation: "I wonder why my tummy hurts when I'm worried but not when I'm happy...",
      question: "Our bodies are so mysterious! Want to be body detectives together?",
      skillHint: 'emotion-body connection'
    }
  ],
  'connection-captain': [
    {
      emotion: 'nervous',
      situation: "I want to make friends at the dog park but I always stand in the corner by myself...",
      question: "Do you ever feel shy too? Maybe we can practice being brave together?",
      skillHint: 'social confidence'
    },
    {
      emotion: 'thinking',
      situation: "My friend looked upset and I didn't know what to say. So I just... licked their face?",
      question: "What do YOU do when someone's sad? I need better ideas!",
      skillHint: 'empathy skills'
    },
    {
      emotion: 'curious',
      situation: "Sometimes people say things and I'm not sure if they're joking or serious...",
      question: "How do you figure out what people really mean? Teach me!",
      skillHint: 'social cues'
    }
  ],
  'resilience-ranger': [
    {
      emotion: 'nervous',
      situation: "I failed at learning a new trick today. Now I feel like giving up forever...",
      question: "How do you pick yourself up when things go wrong? I really need to know!",
      skillHint: 'bouncing back'
    },
    {
      emotion: 'thinking',
      situation: "Something sad happened and I can't stop thinking about it. It's like a heavy blanket on me.",
      question: "Do you know how to make heavy feelings lighter? Let's figure it out!",
      skillHint: 'processing sadness'
    },
    {
      emotion: 'hopeful',
      situation: "Things were really hard, but I'm trying to believe they can get better...",
      question: "Will you help me find some hope? I think we can do it together!",
      skillHint: 'building hope'
    }
  ],
  'all': [
    {
      emotion: 'curious',
      situation: "I'm learning so many new things about feelings and brains! But sometimes I forget what I learned...",
      question: "Want to practice together so we both remember?",
      skillHint: 'general practice'
    },
    {
      emotion: 'hopeful',
      situation: "Every time we do an activity, I feel a little bit braver. Thank you for helping me!",
      question: "Ready to learn something new together?",
      skillHint: 'continued learning'
    }
  ]
};

// Daniel's post-activity reactions with skill naming
const DANIEL_POST_ACTIVITY = {
  completed: [
    {
      emotion: 'proud',
      message: "Wow! We actually did it! I feel a little more confident now.",
      skillAcknowledgment: "Thanks for helping me practice {skill}.",
      confidenceBoost: "Maybe I CAN handle tricky feelings!"
    },
    {
      emotion: 'relieved',
      message: "Phew! That was hard but we got through it together.",
      skillAcknowledgment: "I learned about {skill} today because of you!",
      confidenceBoost: "I'm going to remember this next time I'm stuck."
    },
    {
      emotion: 'grateful',
      message: "I couldn't have done that without you, friend.",
      skillAcknowledgment: "You helped me understand {skill} better.",
      confidenceBoost: "I feel a tiny bit braver now!"
    },
    {
      emotion: 'hopeful',
      message: "Hey, that actually worked! My worry-brain is a bit quieter now.",
      skillAcknowledgment: "So THAT's how {skill} works!",
      confidenceBoost: "I want to try more things now."
    }
  ],
  firstTime: [
    {
      emotion: 'proud',
      message: "That was my FIRST time doing that! And we did it!",
      skillAcknowledgment: "I never knew about {skill} before you showed me.",
      confidenceBoost: "I feel like a real learning pup!"
    }
  ],
  returning: [
    {
      emotion: 'relieved',
      message: "Remember when we learned about this before? I'm getting better at it!",
      skillAcknowledgment: "Practicing {skill} again really helps!",
      confidenceBoost: "My brain is remembering more each time!"
    }
  ]
};

// References to past activities for continuity
const DANIEL_MEMORY_PHRASES = [
  "Remember when we learned about {pastSkill}? This is kind of like that!",
  "Last time you helped me with {pastSkill}. I've been practicing!",
  "You know how we figured out {pastSkill} together? I used it yesterday!",
  "I thought about what we learned about {pastSkill} when I got worried today.",
  "My friend asked how I stay calm now and I told them about {pastSkill}!"
];

// Town evolution explanations
const TOWN_EVOLUTION_MESSAGES = {
  zone2: {
    emotion: 'proud',
    message: "Look! The path is getting smoother because we've been practicing!",
    explanation: "Every time we learn something new, our thoughts make stronger connections.",
    danielGrowth: "I feel more sure about where I'm going now."
  },
  zone3: {
    emotion: 'hopeful',
    message: "Wow, there are little houses appearing! That's because we're building good habits!",
    explanation: "When you practice skills, they become like cozy homes in your brain.",
    danielGrowth: "I used to be scared of this path. Now it feels like home."
  },
  zone4: {
    emotion: 'grateful',
    message: "The whole town grew because of all our hard work together!",
    explanation: "You've helped me learn so much. Now I have a whole toolkit of skills!",
    danielGrowth: "I went from a worried pup to someone who knows how to help himself."
  }
};

// ================================================
// DANIEL DIALOGUE MODAL SYSTEM
// ================================================

class DanielDialogueSystem {
  constructor() {
    this.modalElement = null;
    this.completedModules = [];
    this.learnedSkills = [];
    this.currentZone = 1;
    this.onClose = null;
    this.onContinue = null;
  }

  init() {
    this.createModalStructure();
    this.loadProgress();
  }

  loadProgress() {
    try {
      const saved = localStorage.getItem('danielProgress');
      if (saved) {
        const data = JSON.parse(saved);
        this.completedModules = data.completedModules || [];
        this.learnedSkills = data.learnedSkills || [];
        this.currentZone = data.currentZone || 1;
      }
    } catch (e) {
      console.log('Could not load Daniel progress');
    }
  }

  saveProgress() {
    try {
      localStorage.setItem('danielProgress', JSON.stringify({
        completedModules: this.completedModules,
        learnedSkills: this.learnedSkills,
        currentZone: this.currentZone
      }));
    } catch (e) {
      console.log('Could not save Daniel progress');
    }
  }

  createModalStructure() {
    // Remove existing modal if present
    const existing = document.getElementById('danielDialogueModal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'danielDialogueModal';
    modal.className = 'daniel-dialogue-modal';
    modal.innerHTML = `
      <div class="daniel-dialogue-backdrop"></div>
      <div class="daniel-dialogue-container">
        <div class="daniel-dialogue-content">
          <div class="daniel-image-section">
            <div class="daniel-image-wrapper">
              <img src="/images/characters/DanielTheDog.webp" alt="Daniel the Dog" class="daniel-modal-image" id="danielModalImage">
              <div class="daniel-emotion-indicator" id="danielEmotionIndicator"></div>
            </div>
            <div class="daniel-name-tag">Daniel</div>
          </div>
          <div class="daniel-speech-section">
            <div class="daniel-speech-bubble" id="danielSpeechBubble">
              <div class="daniel-module-details">
                <div class="daniel-module-title" id="danielModuleTitle"></div>
                <div class="daniel-module-description" id="danielModuleDescription"></div>
              </div>
              <div class="daniel-situation" id="danielSituation"></div>
              <div class="daniel-question" id="danielQuestion"></div>
              <div class="daniel-skill-hint" id="danielSkillHint"></div>
            </div>
            <div class="daniel-dialogue-actions" id="danielDialogueActions">
              <button class="daniel-action-btn primary" id="danielContinueBtn">
                <span class="btn-text">Let's do it together!</span>
                <span class="btn-icon">→</span>
              </button>
              <button class="daniel-action-btn secondary" id="danielLaterBtn">
                Maybe later
              </button>
            </div>
          </div>
        </div>
        <button class="daniel-close-btn" id="danielCloseBtn">×</button>
      </div>
    `;

    // Add styles
    const styles = document.createElement('style');
    styles.textContent = this.getStyles();
    modal.appendChild(styles);

    document.body.appendChild(modal);
    this.modalElement = modal;
    this.setupEventListeners();
  }

  getStyles() {
    return `
      .daniel-dialogue-modal {
        position: fixed;
        inset: 0;
        z-index: 10000;
        display: none;
        align-items: center;
        justify-content: center;
        padding: 20px;
        font-family: 'Fredoka', 'Fredoka', system-ui, sans-serif;
      }

      .daniel-dialogue-modal.visible {
        display: flex;
        animation: modalFadeIn 0.3s ease-out;
      }

      @keyframes modalFadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }

      .daniel-dialogue-backdrop {
        position: absolute;
        inset: 0;
        background: rgba(15, 23, 42, 0.75);
        backdrop-filter: blur(8px);
      }

      .daniel-dialogue-container {
        position: relative;
        background: linear-gradient(145deg, #ffffff 0%, #f8fafc 100%);
        border-radius: 28px;
        max-width: 680px;
        width: 100%;
        box-shadow: 
          0 25px 50px -12px rgba(0, 0, 0, 0.25),
          0 0 0 1px rgba(255, 255, 255, 0.1),
          inset 0 1px 0 rgba(255, 255, 255, 0.8);
        overflow: hidden;
        animation: modalSlideUp 0.4s ease-out;
      }

      @keyframes modalSlideUp {
        from { 
          opacity: 0;
          transform: translateY(30px) scale(0.95);
        }
        to { 
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }

      .daniel-dialogue-content {
        display: flex;
        gap: 0;
        min-height: 340px;
      }

      .daniel-image-section {
        flex: 0 0 200px;
        background: linear-gradient(180deg, #FEF3C7 0%, #FDE68A 50%, #FBBF24 100%);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 30px 20px;
        position: relative;
        overflow: hidden;
      }

      .daniel-image-section::before {
        content: '';
        position: absolute;
        inset: 0;
        background: 
          radial-gradient(circle at 30% 20%, rgba(255,255,255,0.4) 0%, transparent 50%),
          radial-gradient(circle at 70% 80%, rgba(251,191,36,0.3) 0%, transparent 50%);
        pointer-events: none;
      }

      .daniel-image-section::after {
        content: '✨';
        position: absolute;
        top: 20px;
        right: 20px;
        font-size: 24px;
        animation: sparkle 2s ease-in-out infinite;
      }

      @keyframes sparkle {
        0%, 100% { opacity: 0.5; transform: scale(1) rotate(0deg); }
        50% { opacity: 1; transform: scale(1.2) rotate(15deg); }
      }

      .daniel-image-wrapper {
        position: relative;
        width: 140px;
        height: 140px;
        background: rgba(255,255,255,0.9);
        border-radius: 50%;
        padding: 8px;
        box-shadow: 
          0 8px 24px rgba(251,191,36,0.4),
          0 0 0 4px rgba(255,255,255,0.5);
        animation: danielBounce 3s ease-in-out infinite;
      }

      @keyframes danielBounce {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-8px); }
      }

      .daniel-modal-image {
        width: 100%;
        height: 100%;
        object-fit: contain;
        border-radius: 50%;
        filter: drop-shadow(0 4px 8px rgba(0,0,0,0.1));
      }

      .daniel-emotion-indicator {
        position: absolute;
        bottom: -5px;
        right: -5px;
        width: 36px;
        height: 36px;
        background: white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 20px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        border: 3px solid #FEF3C7;
      }

      .daniel-name-tag {
        margin-top: 16px;
        padding: 6px 18px;
        background: rgba(255,255,255,0.95);
        border-radius: 20px;
        font-size: 16px;
        font-weight: 700;
        color: #92400E;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        letter-spacing: 0.5px;
      }

      .daniel-speech-section {
        flex: 1;
        padding: 32px 32px 28px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
      }

      .daniel-speech-bubble {
        position: relative;
        background: #F1F5F9;
        border-radius: 20px;
        padding: 24px;
        margin-bottom: 20px;
        border: 1px solid rgba(148, 163, 184, 0.2);
      }

      .daniel-module-details {
        margin-bottom: 16px;
        padding-bottom: 12px;
        border-bottom: 1px solid rgba(148, 163, 184, 0.3);
      }

      .daniel-module-title {
        font-size: 18px;
        font-weight: 700;
        color: #1E293B;
        margin-bottom: 6px;
      }

      .daniel-module-description {
        font-size: 14px;
        line-height: 1.5;
        color: #475569;
      }

      .daniel-speech-bubble::before {
        content: '';
        position: absolute;
        left: -12px;
        top: 30px;
        width: 0;
        height: 0;
        border-top: 12px solid transparent;
        border-bottom: 12px solid transparent;
        border-right: 12px solid #F1F5F9;
      }

      .daniel-situation {
        font-size: 17px;
        line-height: 1.6;
        color: #334155;
        margin-bottom: 16px;
      }

      .daniel-question {
        font-size: 18px;
        font-weight: 600;
        color: #1E293B;
        line-height: 1.5;
      }

      .daniel-skill-hint {
        margin-top: 14px;
        padding: 8px 14px;
        background: linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 100%);
        border-radius: 12px;
        font-size: 13px;
        color: #4338CA;
        font-weight: 500;
        display: inline-block;
      }

      .daniel-skill-hint::before {
        content: '💡 ';
      }

      .daniel-dialogue-actions {
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
      }

      .daniel-action-btn {
        flex: 1;
        min-width: 140px;
        padding: 14px 24px;
        border-radius: 16px;
        font-size: 16px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
        border: none;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        font-family: inherit;
      }

      .daniel-action-btn.primary {
        background: linear-gradient(135deg, #FBBF24 0%, #F59E0B 100%);
        color: #78350F;
        box-shadow: 0 4px 14px rgba(251, 191, 36, 0.4);
      }

      .daniel-action-btn.primary:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(251, 191, 36, 0.5);
      }

      .daniel-action-btn.primary:active {
        transform: translateY(0);
      }

      .daniel-action-btn.primary .btn-icon {
        transition: transform 0.2s ease;
      }

      .daniel-action-btn.primary:hover .btn-icon {
        transform: translateX(4px);
      }

      .daniel-action-btn.secondary {
        background: rgba(148, 163, 184, 0.15);
        color: #64748B;
        border: 1px solid rgba(148, 163, 184, 0.3);
      }

      .daniel-action-btn.secondary:hover {
        background: rgba(148, 163, 184, 0.25);
      }

      .daniel-close-btn {
        position: absolute;
        top: 16px;
        right: 16px;
        width: 36px;
        height: 36px;
        border-radius: 50%;
        background: rgba(148, 163, 184, 0.1);
        border: none;
        font-size: 24px;
        color: #94A3B8;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
      }

      .daniel-close-btn:hover {
        background: rgba(148, 163, 184, 0.2);
        color: #64748B;
      }

      /* Post-activity success state */
      .daniel-dialogue-modal.success .daniel-image-section {
        background: linear-gradient(180deg, #D1FAE5 0%, #6EE7B7 50%, #10B981 100%);
      }

      .daniel-dialogue-modal.success .daniel-emotion-indicator {
        border-color: #D1FAE5;
      }

      .daniel-dialogue-modal.success .daniel-name-tag {
        color: #065F46;
      }

      .daniel-dialogue-modal.success .daniel-action-btn.primary {
        background: linear-gradient(135deg, #10B981 0%, #059669 100%);
        color: white;
        box-shadow: 0 4px 14px rgba(16, 185, 129, 0.4);
      }

      /* Responsive */
      @media (max-width: 640px) {
        .daniel-dialogue-content {
          flex-direction: column;
        }
        
        .daniel-image-section {
          flex: 0 0 auto;
          padding: 24px;
        }
        
        .daniel-image-wrapper {
          width: 100px;
          height: 100px;
        }
        
        .daniel-speech-section {
          padding: 20px;
        }
        
        .daniel-speech-bubble::before {
          display: none;
        }
        
        .daniel-action-btn {
          min-width: 100%;
        }
      }
    `;
  }

  setupEventListeners() {
    const continueBtn = document.getElementById('danielContinueBtn');
    const laterBtn = document.getElementById('danielLaterBtn');
    const closeBtn = document.getElementById('danielCloseBtn');
    const backdrop = this.modalElement.querySelector('.daniel-dialogue-backdrop');

    if (continueBtn) {
      continueBtn.onclick = () => {
        if (this.onContinue) this.onContinue();
        this.hide();
      };
    }

    if (laterBtn) {
      laterBtn.addEventListener('click', () => {
        this.hide();
      });
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.hide();
      });
    }

    if (backdrop) {
      backdrop.addEventListener('click', () => {
        this.hide();
      });
    }
  }

  getEmotionEmoji(emotion) {
    const emojis = {
      curious: '🤔',
      nervous: '😰',
      hopeful: '🌟',
      proud: '😊',
      relieved: '😌',
      grateful: '💝',
      thinking: '💭'
    };
    return emojis[emotion] || '🐕';
  }

  showPreActivity(module, category, onContinue) {
    const categoryKey = category || 'all';
    const situations = DANIEL_PRE_ACTIVITY[categoryKey] || DANIEL_PRE_ACTIVITY['all'];
    const situation = situations[Math.floor(Math.random() * situations.length)];

    // Check for memory reference
    let memoryPhrase = '';
    if (this.learnedSkills.length > 0 && Math.random() > 0.5) {
      const pastSkill = this.learnedSkills[Math.floor(Math.random() * this.learnedSkills.length)];
      const phrases = DANIEL_MEMORY_PHRASES;
      memoryPhrase = phrases[Math.floor(Math.random() * phrases.length)].replace('{pastSkill}', pastSkill);
    }

    const situationEl = document.getElementById('danielSituation');
    const questionEl = document.getElementById('danielQuestion');
    const skillHintEl = document.getElementById('danielSkillHint');
    const emotionIndicator = document.getElementById('danielEmotionIndicator');
    const actionsEl = document.getElementById('danielDialogueActions');
    const moduleTitleEl = document.getElementById('danielModuleTitle');
    const moduleDescriptionEl = document.getElementById('danielModuleDescription');

    const moduleTitle = (module?.module && (module.module.title || module.module.name)) || module?.title || module?.name || 'Module';
    const moduleDescription = (module?.module && (module.module.short_description || module.module.description || module.module.long_description)) || module?.short_description || module?.description || '';

    if (moduleTitleEl) {
      moduleTitleEl.textContent = moduleTitle;
    }

    if (moduleDescriptionEl) {
      if (moduleDescription && moduleDescription.trim()) {
        moduleDescriptionEl.textContent = moduleDescription;
        moduleDescriptionEl.style.display = 'block';
      } else {
        moduleDescriptionEl.textContent = '';
        moduleDescriptionEl.style.display = 'none';
      }
    }

    if (situationEl) {
      let text = situation.situation;
      if (memoryPhrase) {
        text = memoryPhrase + ' ' + text;
      }
      situationEl.textContent = text;
    }

    if (questionEl) {
      questionEl.textContent = situation.question;
    }

    if (skillHintEl) {
      skillHintEl.textContent = `We'll practice ${situation.skillHint}`;
      skillHintEl.style.display = 'inline-block';
    }

    if (emotionIndicator) {
      emotionIndicator.textContent = this.getEmotionEmoji(situation.emotion);
    }

    if (actionsEl) {
      actionsEl.innerHTML = `
        <button class="daniel-action-btn primary" id="danielContinueBtn">
          <span class="btn-text">Let's do it together!</span>
          <span class="btn-icon">→</span>
        </button>
        <button class="daniel-action-btn secondary" id="danielLaterBtn">
          Maybe later
        </button>
      `;
      this.setupEventListeners();
    }

    this.onContinue = onContinue;
    this.modalElement.classList.remove('success');
    this.show();
  }

  showPostActivity(module, skill, isFirstTime, onContinue) {
    const reactions = isFirstTime 
      ? DANIEL_POST_ACTIVITY.firstTime 
      : (this.completedModules.includes(module.id) ? DANIEL_POST_ACTIVITY.returning : DANIEL_POST_ACTIVITY.completed);
    
    const reaction = reactions[Math.floor(Math.random() * reactions.length)];

    const situationEl = document.getElementById('danielSituation');
    const questionEl = document.getElementById('danielQuestion');
    const skillHintEl = document.getElementById('danielSkillHint');
    const emotionIndicator = document.getElementById('danielEmotionIndicator');
    const actionsEl = document.getElementById('danielDialogueActions');

    if (situationEl) {
      situationEl.textContent = reaction.message;
    }

    if (questionEl) {
      const skillText = reaction.skillAcknowledgment.replace('{skill}', escapeHtml(skill || 'this skill'));
      questionEl.innerHTML = `${skillText}<br><em style="font-size: 15px; color: #64748B; font-weight: 400;">${reaction.confidenceBoost}</em>`;
    }

    if (skillHintEl) {
      skillHintEl.style.display = 'none';
    }

    if (emotionIndicator) {
      emotionIndicator.textContent = this.getEmotionEmoji(reaction.emotion);
    }

    if (actionsEl) {
      actionsEl.innerHTML = `
        <button class="daniel-action-btn primary" id="danielContinueBtn">
          <span class="btn-text">Awesome! 🎉</span>
        </button>
      `;
      this.setupEventListeners();
    }

    // Track progress
    if (!this.completedModules.includes(module.id)) {
      this.completedModules.push(module.id);
    }
    if (skill && !this.learnedSkills.includes(skill)) {
      this.learnedSkills.push(skill);
    }
    this.saveProgress();

    this.onContinue = onContinue;
    this.modalElement.classList.add('success');
    this.show();
  }

  showZoneEvolution(newZone, onContinue) {
    const zoneData = TOWN_EVOLUTION_MESSAGES[`zone${newZone}`];
    if (!zoneData) return;

    const situationEl = document.getElementById('danielSituation');
    const questionEl = document.getElementById('danielQuestion');
    const skillHintEl = document.getElementById('danielSkillHint');
    const emotionIndicator = document.getElementById('danielEmotionIndicator');
    const actionsEl = document.getElementById('danielDialogueActions');

    if (situationEl) {
      situationEl.textContent = zoneData.message;
    }

    if (questionEl) {
      questionEl.innerHTML = `${zoneData.explanation}<br><em style="font-size: 15px; color: #64748B; font-weight: 400;">${zoneData.danielGrowth}</em>`;
    }

    if (skillHintEl) {
      skillHintEl.textContent = `🎉 Zone ${newZone} Unlocked!`;
      skillHintEl.style.display = 'inline-block';
    }

    if (emotionIndicator) {
      emotionIndicator.textContent = this.getEmotionEmoji(zoneData.emotion);
    }

    if (actionsEl) {
      actionsEl.innerHTML = `
        <button class="daniel-action-btn primary" id="danielContinueBtn">
          <span class="btn-text">This is amazing!</span>
        </button>
      `;
      this.setupEventListeners();
    }

    this.currentZone = newZone;
    this.saveProgress();

    this.onContinue = onContinue;
    this.modalElement.classList.add('success');
    this.show();
  }

  show() {
    if (this.modalElement) {
      this.modalElement.classList.add('visible');
      document.body.style.overflow = 'hidden';
    }
  }

  hide() {
    if (this.modalElement) {
      this.modalElement.classList.remove('visible');
      document.body.style.overflow = '';
    }
    if (this.onClose) {
      this.onClose();
    }
  }
}

// ================================================
// ENHANCED MODULE PREVIEW WITH DANIEL
// ================================================

class DanielModulePreview {
  constructor(dialogueSystem) {
    this.dialogueSystem = dialogueSystem;
    this.originalShowPreview = null;
  }

  init() {
    // Hook into the existing module preview system
    if (window.enhancedDashboard) {
      this.originalShowPreview = window.enhancedDashboard.showModulePreview.bind(window.enhancedDashboard);
      window.enhancedDashboard.showModulePreview = this.showModulePreviewWithDaniel.bind(this);
    }
  }

  async showModulePreviewWithDaniel(module) {
    const category = window.enhancedDashboard?.adventureMap?.currentCategory || 'all';
    const child = window.state?.selectedChild;
    const self = this;

    // Helper to clear the node loading animation
    const clearLoading = () => {
      if (typeof window._clearNodeLoading === 'function') window._clearNodeLoading();
    };
    
    // Get module order/position - check if this is the first module
    // The module object from adventure map has pathwayOrder as a direct property
    const rawMod = module.module || module;
    const moduleOrder = module.pathwayOrder; // Direct property from adventure map module
    
    // Check if this is the first module in the current adventure map (index 0)
    const adventureMap = window.enhancedDashboard?.adventureMap;
    let moduleIndex = -1;
    if (adventureMap && adventureMap.modules && adventureMap.modules.length > 0) {
      moduleIndex = adventureMap.modules.findIndex(m => m.id === module.id);
    }
    const isFirstModuleInMap = moduleIndex === 0;
    
    // First module if pathwayOrder is 1 OR if it's the first in the current map view
    const isFirstModule = moduleOrder === 1 || isFirstModuleInMap;
    const superSkillId = rawMod.super_skill_id || null;

    // Check periodic check-in FIRST - it takes priority over super skill intro
    // (e.g. module 4 needs a check-in, even if it's the first module of a new super skill)
    if (child && typeof window.showCheckinPopup === 'function') {
      try {
        const needsCheckin = await self.shouldTriggerCheckinForModuleCount(child.id, superSkillId);
        console.log('[DanielSystem] Periodic check-in check - needsCheckin:', needsCheckin);
        if (needsCheckin) {
          clearLoading();
          console.log('[DanielSystem] Showing ENCOURAGEMENT (periodic check-in, skipIntro=true)');
          const moduleUrl = '/module.html?childId=' + child.id + '&moduleId=' + rawMod.id + '&code=' + (module.code || rawMod.code) + '&childName=' + encodeURIComponent(child.name || '') + ((window.state && window.state.isCurrentUserAdmin) ? '&isAdmin=true' : '');
          window.showCheckinPopup(rawMod, function() {
            window.location.href = moduleUrl;
          }, true);
          return;
        }
      } catch (e) {
        console.error('[Daniel] Error checking periodic check-in:', e);
      }
    }

    // Check super skill intro - show character introduction on first module of each super skill
    console.log('[DanielSystem] Intro check - isFirstModule:', isFirstModule, 'superSkillId:', superSkillId);
    if (isFirstModule && superSkillId && child && typeof window.showCheckinPopup === 'function') {
      const introKey = 'superSkillIntroSeen_' + child.id + '_' + superSkillId;
      const alreadySeen = localStorage.getItem(introKey);
      console.log('[DanielSystem] introKey:', introKey, 'alreadySeen:', alreadySeen);
      if (!alreadySeen) {
        clearLoading();
        console.log('[DanielSystem] Showing INTRO (first module for this super skill)');
        const moduleUrl = '/module.html?childId=' + child.id + '&moduleId=' + rawMod.id + '&code=' + (module.code || rawMod.code) + '&childName=' + encodeURIComponent(child.name || '') + ((window.state && window.state.isCurrentUserAdmin) ? '&isAdmin=true' : '');
        window.showCheckinPopup(rawMod, function() {
          localStorage.setItem(introKey, 'true');
          window.location.href = moduleUrl;
        });
        return;
      }
    }

    // Show Daniel's pre-activity dialogue immediately for fast UI response
    clearLoading();
    this.dialogueSystem.showPreActivity(module, category, async () => {
      if (child && module) {
        const moduleUrl = '/module.html?childId=' + child.id + '&moduleId=' + (rawMod.id || module.id) + '&code=' + (module.code || rawMod.code) + '&childName=' + encodeURIComponent(child.name || '') + ((window.state && window.state.isCurrentUserAdmin) ? '&isAdmin=true' : '');

        window.location.href = moduleUrl;
        return;
      }

      // Fallback to other methods if direct navigation fails
      if (typeof startModule === 'function') {
        startModule(module);
      } else if (window.enhancedDashboard && window.enhancedDashboard.startModule) {
        // Wrap the module in the expected structure for enhanced dashboard
        const wrappedModule = {
          module: module,
          code: module.code
        };
        window.enhancedDashboard.startModule(wrappedModule);
      }
    });
  }
  
  // Check if any check-in has been completed for this child
  async hasCompletedAnyCheckin(childId) {
    if (!childId || !window.supabase) return false;
    
    try {
      const { data: completedCheckins, error } = await window.supabase
        .from('pathway_assessments')
        .select('id')
        .eq('child_id', childId)
        .in('assessment_type', ['checkin', 'check_in'])
        .limit(1);
      
      if (error) {
        console.error('[Daniel] Error checking for completed check-ins:', error);
        return false;
      }
      
      return completedCheckins && completedCheckins.length > 0;
    } catch (e) {
      console.error('[Daniel] Error checking for completed check-ins:', e);
      return false;
    }
  }
  
  // Check if a check-in is needed for this super skill based on completed module count
  // Check-in every 3 completed modules within the same super skill
  async shouldTriggerCheckinForModuleCount(childId, superSkillId) {
    console.log('[Daniel Check-in] === START === childId:', childId, 'superSkillId:', superSkillId);
    if (!childId || !window.supabase) {
      console.log('[Daniel Check-in] BAIL: no childId or supabase', { childId: !!childId, supabase: !!window.supabase });
      return false;
    }
    const CHECKIN_MODULE_INTERVAL = 3;

    try {
      // Count completed modules for this child IN this super skill
      var completedCount = 0;
      if (superSkillId) {
        console.log('[Daniel Check-in] Counting completed modules for superSkillId:', superSkillId);
        const { data: completedModules, error: countError } = await window.supabase
          .from('child_modules')
          .select('id, modules!inner(super_skill_id)')
          .eq('child_id', childId)
          .eq('is_completed', true)
          .eq('modules.super_skill_id', superSkillId);

        if (countError) {
          console.error('[Daniel Check-in] Error counting completed modules:', countError);
          return false;
        }
        completedCount = completedModules?.length || 0;
        console.log('[Daniel Check-in] Per-skill completed modules:', completedCount, 'raw data:', JSON.stringify(completedModules));
      } else {
        console.log('[Daniel Check-in] No superSkillId - counting ALL completed modules');
        const { data: completedModules, error: countError } = await window.supabase
          .from('child_modules')
          .select('id')
          .eq('child_id', childId)
          .eq('is_completed', true);

        if (countError) return false;
        completedCount = completedModules?.length || 0;
        console.log('[Daniel Check-in] Global completed modules:', completedCount);
      }

      // Count check-ins for this child for this super skill's pathway
      var checkinCount = 0;
      if (superSkillId) {
        // Look up the super skill slug to match against pathway_assessments
        const { data: skillData, error: slugError } = await window.supabase
          .from('super_skills')
          .select('slug')
          .eq('id', superSkillId)
          .single();

        console.log('[Daniel Check-in] Super skill slug lookup - data:', JSON.stringify(skillData), 'error:', slugError);
        const slug = skillData?.slug;
        if (slug) {
          const { data: completedCheckins, error: checkinError } = await window.supabase
            .from('pathway_assessments')
            .select('id, pathway_category, assessment_type')
            .eq('child_id', childId)
            .eq('pathway_category', slug)
            .in('assessment_type', ['checkin', 'check_in']);

          console.log('[Daniel Check-in] Per-skill check-ins for slug "' + slug + '":', JSON.stringify(completedCheckins), 'error:', checkinError);
          if (!checkinError) {
            checkinCount = completedCheckins?.length || 0;
          }
        }
      }
      // If no super skill or slug lookup failed, count all check-ins
      if (!superSkillId || checkinCount === 0) {
        console.log('[Daniel Check-in] Falling back to count ALL check-ins (superSkillId:', superSkillId, ', checkinCount was:', checkinCount, ')');
        const { data: allCheckins } = await window.supabase
          .from('pathway_assessments')
          .select('id, pathway_category, assessment_type')
          .eq('child_id', childId)
          .in('assessment_type', ['checkin', 'check_in']);
        console.log('[Daniel Check-in] All check-ins:', JSON.stringify(allCheckins));
        checkinCount = allCheckins?.length || 0;
      }

      // Expected check-ins: one per 3 completed modules (at 3, 6, 9...)
      // Don't include the initial intro check-in (that's separate)
      const expectedCheckins = Math.floor(completedCount / CHECKIN_MODULE_INTERVAL);

      console.log('[Daniel Check-in] === RESULT === SuperSkill:', superSkillId, 'Completed:', completedCount, 'Check-ins done:', checkinCount, 'Expected:', expectedCheckins);
      console.log('[Daniel Check-in] Decision: expectedCheckins > 0 ?', expectedCheckins > 0, '&& checkinCount < expectedCheckins ?', checkinCount < expectedCheckins);

      if (expectedCheckins > 0 && checkinCount < expectedCheckins) {
        console.log('[Daniel Check-in] >>> TRIGGERING check-in');
        return true;
      }

      console.log('[Daniel Check-in] >>> NOT triggering check-in');
      return false;
    } catch (e) {
      console.error('[Daniel Check-in] Error checking checkin status:', e);
      return false;
    }
  }
}

// ================================================
// DANIEL HUB ENHANCEMENT
// ================================================


function isDanielMoodCheckinEnabled() {
  return Boolean(window.__danielMoodCheckinEnabled || document.getElementById('danielMoodModal'))
}

class DanielHubEnhancer {
  constructor(dialogueSystem) {
    this.dialogueSystem = dialogueSystem;
    this.currentMessage = '';
  }

  init() {
    this.enhanceExistingHub();
    this.updateDanielMessage();
  }

  enhanceExistingHub() {
    if (isDanielMoodCheckinEnabled()) return;

    const danielHub = document.getElementById('danielHub');
    if (!danielHub) return;

    // Make Daniel clickable
    const danielCharacter = document.getElementById('danielCharacter');
    if (danielCharacter) {
      danielCharacter.style.cursor = 'pointer';
      danielCharacter.addEventListener('click', () => {
        this.showDanielGreeting();
      });
    }

    // Add pulsing hint to show Daniel is interactive
    const danielAvatar = danielHub.querySelector('.hero-daniel-img') || danielHub.querySelector('.daniel-avatar');
    if (danielAvatar) {
      danielAvatar.style.transition = 'transform 0.3s ease, box-shadow 0.3s ease';
      danielAvatar.addEventListener('mouseenter', () => {
        danielAvatar.style.transform = 'scale(1.05)';
        danielAvatar.style.boxShadow = '0 8px 25px rgba(251, 191, 36, 0.4)';
      });
      danielAvatar.addEventListener('mouseleave', () => {
        danielAvatar.style.transform = 'scale(1)';
        danielAvatar.style.boxShadow = '';
      });
    }
  }

  updateDanielMessage() {
    if (isDanielMoodCheckinEnabled()) return;

    const moodText = document.getElementById('moodText');
    const danielStatus = document.getElementById('danielStatus');

    const completedCount = this.dialogueSystem.completedModules.length;
    const messages = this.getContextualMessages(completedCount);
    const message = messages[Math.floor(Math.random() * messages.length)];
    
    if (moodText) {
      moodText.textContent = message.bubble;
    }
    if (danielStatus) {
      danielStatus.textContent = message.status;
    }
  }

  getContextualMessages(completedCount) {
    if (completedCount === 0) {
      return [
        { bubble: "I'm a bit nervous... will you help me?", status: "Hoping for a friend" },
        { bubble: "Hi! I'm still learning too!", status: "Ready to try together" },
        { bubble: "Want to figure things out with me?", status: "Curious but unsure" }
      ];
    } else if (completedCount < 3) {
      return [
        { bubble: "Thanks for helping me last time!", status: "Feeling a bit braver" },
        { bubble: "I remembered what we learned!", status: "Growing more confident" },
        { bubble: "Can we practice more together?", status: "Eager to learn" }
      ];
    } else if (completedCount < 6) {
      return [
        { bubble: "Look how much we've learned!", status: "Really getting it now" },
        { bubble: "I used our skills yesterday!", status: "Putting it into practice" },
        { bubble: "You're helping me grow!", status: "Building confidence" }
      ];
    } else {
      return [
        { bubble: "We make a great team!", status: "Confident and capable" },
        { bubble: "I feel so much stronger now!", status: "Ready for anything" },
        { bubble: "Thank you for believing in me!", status: "Thriving together" }
      ];
    }
  }

  showDanielGreeting() {
    if (isDanielMoodCheckinEnabled()) return;

    const completedCount = this.dialogueSystem.completedModules.length;
    const greetings = this.getGreetings(completedCount);
    const greeting = greetings[Math.floor(Math.random() * greetings.length)];

    const situationEl = document.getElementById('danielSituation');
    const questionEl = document.getElementById('danielQuestion');
    const skillHintEl = document.getElementById('danielSkillHint');
    const emotionIndicator = document.getElementById('danielEmotionIndicator');
    const actionsEl = document.getElementById('danielDialogueActions');

    if (situationEl) {
      situationEl.textContent = greeting.message;
    }

    if (questionEl) {
      questionEl.textContent = greeting.question || '';
    }

    if (skillHintEl) {
      if (greeting.hint) {
        skillHintEl.textContent = greeting.hint;
        skillHintEl.style.display = 'inline-block';
      } else {
        skillHintEl.style.display = 'none';
      }
    }

    if (emotionIndicator) {
      emotionIndicator.textContent = this.dialogueSystem.getEmotionEmoji(greeting.emotion);
    }

    if (actionsEl) {
      actionsEl.innerHTML = `
        <button class="daniel-action-btn primary" id="danielContinueBtn">
          <span class="btn-text">${greeting.buttonText || 'Okay!'}</span>
        </button>
      `;
      this.dialogueSystem.setupEventListeners();
    }

    this.dialogueSystem.modalElement.classList.remove('success');
    this.dialogueSystem.show();
  }

  getGreetings(completedCount) {
    if (completedCount === 0) {
      return [
        {
          emotion: 'nervous',
          message: "Hi there! I'm Daniel. I'm trying to learn about feelings and stuff, but it's kind of hard on my own...",
          question: "Would you be my learning buddy?",
          buttonText: "I'd love to help!"
        },
        {
          emotion: 'curious',
          message: "Oh! You clicked on me! I was just thinking about how confusing feelings can be sometimes...",
          question: "Do you ever feel that way too?",
          buttonText: "Yeah, sometimes!"
        }
      ];
    } else {
      return [
        {
          emotion: 'hopeful',
          message: `We've done ${completedCount} activities together! I feel like I'm really learning.`,
          question: "Want to keep going?",
          hint: `${completedCount} skills practiced!`,
          buttonText: "Let's do more!"
        },
        {
          emotion: 'grateful',
          message: "Thanks for checking on me! I was just thinking about all the things you've taught me.",
          question: "You're a really good teacher, you know?",
          buttonText: "Aw, thanks Daniel!"
        }
      ];
    }
  }
}

// ================================================
// INITIALIZATION
// ================================================

window.danielRelationshipSystem = {
  dialogueSystem: null,
  modulePreview: null,
  hubEnhancer: null,

  init() {
    // Initialize dialogue system
    this.dialogueSystem = new DanielDialogueSystem();
    this.dialogueSystem.init();

    // Initialize module preview enhancement
    this.modulePreview = new DanielModulePreview(this.dialogueSystem);
    
    // Initialize hub enhancer
    this.hubEnhancer = new DanielHubEnhancer(this.dialogueSystem);

    // Wait for enhanced dashboard to be ready
    const waitForDashboard = () => {
      if (window.enhancedDashboard) {
        this.modulePreview.init();
        this.hubEnhancer.init();
      } else {
        setTimeout(waitForDashboard, 200);
      }
    };

    waitForDashboard();
  }
};

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => window.danielRelationshipSystem.init(), 500);
  });
} else {
  setTimeout(() => window.danielRelationshipSystem.init(), 500);
}

export { DanielDialogueSystem, DanielModulePreview, DanielHubEnhancer };
