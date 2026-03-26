// ================================================
// DAILY QUEST SYSTEM - Interactive Mini Activities
// ================================================

// Get today's date in Brisbane time (AEST, UTC+10, no DST) as YYYY-MM-DD
function getBrisbaneToday() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Brisbane' }).format(new Date());
}

// Daily Quest Data
const DAILY_QUESTS = [
  {
    id: "check_in_emotion",
    title: "Check in with your feelings",
    description: "Pick the feeling that matches how you feel right now.",
    type: "emotion",
    target: 1
  },
  {
    id: "slow_breath",
    title: "Do a slow breath",
    description: "Take 3 slow belly breaths with Daniel.",
    type: "breathing",
    target: 3
  },
  {
    id: "calm_slider",
    title: "Turn down the worry",
    description: "Move the calm slider to help Daniel feel better.",
    type: "slider",
    target: 1
  },
  {
    id: "draw_feeling",
    title: "Draw your feeling",
    description: "Draw what your feeling looks like today.",
    type: "drawing",
    target: 1
  },
  {
    id: "kind_thought",
    title: "Say something kind",
    description: "Choose or write one kind thought for yourself.",
    type: "thought",
    target: 1
  },
  {
    id: "name_big_feeling",
    title: "Name a big feeling",
    description: "Pick a feeling that's been bothering you.",
    type: "emotion",
    target: 1
  },
  {
    id: "body_check",
    title: "Check your body",
    description: "Tap where you feel something in your body.",
    type: "body",
    target: 1
  },
  {
    id: "happy_memory",
    title: "Think of something happy",
    description: "Choose or draw one happy memory.",
    type: "memory",
    target: 1
  },
  {
    id: "worry_release",
    title: "Let go of a worry",
    description: "Put one worry into Daniel's worry box.",
    type: "release",
    target: 1
  },
  {
    id: "confidence_boost",
    title: "Build your confidence",
    description: "Pick one thing you are good at.",
    type: "strength",
    target: 1
  },
  {
    id: "grounding",
    title: "Ground your body",
    description: "Do a 5-4-3-2-1 grounding exercise.",
    type: "grounding",
    target: 1
  },
  {
    id: "calm_music",
    title: "Listen to something calming",
    description: "Play one calming sound with Daniel.",
    type: "audio",
    target: 1
  },
  {
    id: "brave_thought",
    title: "Find a brave thought",
    description: "Choose something that helps you feel brave.",
    type: "thought",
    target: 1
  },
  {
    id: "mood_change",
    title: "Change Daniel's mood",
    description: "Help Daniel go from sad to calm.",
    type: "mood",
    target: 1
  },
  {
    id: "gratitude",
    title: "Say thank you",
    description: "Pick one thing you are thankful for today.",
    type: "gratitude",
    target: 1
  },
  {
    id: "body_relax",
    title: "Relax your body",
    description: "Tense and relax your muscles with Daniel.",
    type: "body",
    target: 1
  },
  {
    id: "kindness",
    title: "Send kindness",
    description: "Choose a kind message for someone.",
    type: "kindness",
    target: 1
  },
  {
    id: "emotion_match",
    title: "Match the emotion",
    description: "Match the face to the feeling.",
    type: "game",
    target: 1
  },
  {
    id: "energy_check",
    title: "Check your energy",
    description: "Pick how tired or energetic you feel.",
    type: "scale",
    target: 1
  },
  {
    id: "calm_plan",
    title: "Make a calm plan",
    description: "Choose one thing that helps you feel calm.",
    type: "plan",
    target: 1
  }
];

// ================================================
// DAILY QUEST MANAGER CLASS
// ================================================

class DailyQuestManager {
  constructor() {
    this.currentQuest = null;
    this.isCompleted = false;
    this.childId = null;
    this.supabase = window.supabase;
    
    this.injectStyles();
  }

  injectStyles() {
    if (document.getElementById('daily-quest-styles')) return;
    
    const styles = document.createElement('style');
    styles.id = 'daily-quest-styles';
    styles.textContent = `
      /* Daily Quest Button */
      .daily-quest-btn {
        background: linear-gradient(135deg, #fff 0%, #f8f4e8 100%);
        color: #405878;
        border: none;
        padding: 12px 24px;
        border-radius: 12px;
        font-size: 15px;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.2s ease;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        font-family: 'Fredoka', 'Fredoka', sans-serif;
        margin-top: 12px;
      }

      .daily-quest-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 16px rgba(0,0,0,0.2);
      }

      .daily-quest-btn:active {
        transform: translateY(0);
      }

      .daily-quest-btn:disabled {
        background: linear-gradient(135deg, #e8e8e8 0%, #d0d0d0 100%);
        color: #888;
        cursor: not-allowed;
        transform: none;
        box-shadow: none;
      }

      .daily-quest-btn.completed {
        background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
        color: white;
      }

      /* Quest Modal Overlay */
      .quest-modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.6);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        opacity: 0;
        visibility: hidden;
        transition: all 0.3s ease;
        backdrop-filter: blur(4px);
      }

      .quest-modal-overlay.active {
        opacity: 1;
        visibility: visible;
      }

      /* Quest Modal */
      .quest-modal {
        background: linear-gradient(180deg, #fff8f0 0%, #fff 100%);
        border-radius: 24px;
        width: 90%;
        max-width: 420px;
        max-height: 85vh;
        overflow-y: auto;
        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        transform: scale(0.9) translateY(20px);
        transition: transform 0.3s ease;
      }

      .quest-modal-overlay.active .quest-modal {
        transform: scale(1) translateY(0);
      }

      .quest-modal-header {
        background: linear-gradient(135deg, #f4a261 0%, #e76f51 100%);
        color: white;
        padding: 24px;
        border-radius: 24px 24px 0 0;
        text-align: center;
      }

      .quest-modal-icon {
        font-size: 48px;
        margin-bottom: 12px;
      }

      .quest-modal-title {
        font-size: 22px;
        font-weight: 700;
        margin: 0 0 8px 0;
        font-family: 'Fredoka', sans-serif;
      }

      .quest-modal-desc {
        font-size: 14px;
        opacity: 0.95;
        margin: 0;
      }

      .quest-modal-body {
        padding: 24px;
      }

      .quest-modal-close {
        position: absolute;
        top: 16px;
        right: 16px;
        background: rgba(255,255,255,0.2);
        border: none;
        color: white;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        font-size: 18px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.2s;
      }

      .quest-modal-close:hover {
        background: rgba(255,255,255,0.3);
      }

      /* Activity Content Styles */
      .quest-activity {
        min-height: 200px;
      }

      /* Emotion Picker */
      .emotion-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 12px;
        margin: 16px 0;
      }

      .emotion-btn {
        background: #fff;
        border: 3px solid #e8e4d9;
        border-radius: 16px;
        padding: 16px 8px;
        text-align: center;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .emotion-btn:hover {
        border-color: #f4a261;
        transform: scale(1.05);
      }

      .emotion-btn.selected {
        border-color: #4CAF50;
        background: #e8f5e9;
      }

      .emotion-btn .emoji {
        font-size: 32px;
        display: block;
        margin-bottom: 6px;
      }

      .emotion-btn .label {
        font-size: 11px;
        font-weight: 600;
        color: #405878;
      }

      /* Breathing Exercise */
      .breathing-container {
        text-align: center;
        padding: 20px;
      }

      .breathing-circle {
        width: 150px;
        height: 150px;
        border-radius: 50%;
        background: linear-gradient(135deg, #81D4FA 0%, #4FC3F7 100%);
        margin: 20px auto;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 24px;
        color: white;
        font-weight: 700;
        transition: transform 4s ease-in-out;
        box-shadow: 0 8px 30px rgba(79, 195, 247, 0.4);
      }

      .breathing-circle.inhale {
        transform: scale(1.4);
      }

      .breathing-circle.exhale {
        transform: scale(1);
      }

      .breathing-instruction {
        font-size: 20px;
        font-weight: 600;
        color: #405878;
        margin: 16px 0;
      }

      .breathing-count {
        font-size: 16px;
        color: #6d86a8;
      }

      /* Slider Activity */
      .slider-container {
        padding: 20px;
        text-align: center;
      }

      .quest-slider {
        width: 100%;
        height: 12px;
        border-radius: 6px;
        -webkit-appearance: none;
        appearance: none;
        background: linear-gradient(90deg, #e76f51 0%, #f4a261 50%, #4CAF50 100%);
        outline: none;
        margin: 24px 0;
      }

      .quest-slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: white;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        border: 3px solid #405878;
      }

      .slider-emoji {
        font-size: 64px;
        margin-bottom: 16px;
        transition: all 0.3s ease;
      }

      .slider-label {
        font-size: 18px;
        font-weight: 600;
        color: #405878;
      }

      /* Thought/Choice Activity */
      .choice-list {
        display: flex;
        flex-direction: column;
        gap: 10px;
        margin: 16px 0;
      }

      .choice-btn {
        background: #fff;
        border: 2px solid #e8e4d9;
        border-radius: 12px;
        padding: 14px 16px;
        text-align: left;
        cursor: pointer;
        transition: all 0.2s ease;
        font-size: 14px;
        color: #405878;
      }

      .choice-btn:hover {
        border-color: #f4a261;
        background: #fff8f0;
      }

      .choice-btn.selected {
        border-color: #4CAF50;
        background: #e8f5e9;
      }

      /* Body Map */
      .body-map-container {
        text-align: center;
        padding: 20px;
      }

      .body-map {
        position: relative;
        width: 120px;
        margin: 0 auto;
        font-size: 140px;
        line-height: 1;
      }

      .body-tap-zones {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 8px;
        margin-top: 20px;
      }

      .body-zone {
        background: #fff;
        border: 2px solid #e8e4d9;
        border-radius: 10px;
        padding: 10px;
        cursor: pointer;
        font-size: 12px;
        font-weight: 600;
        color: #405878;
        transition: all 0.2s;
      }

      .body-zone:hover {
        border-color: #f4a261;
      }

      .body-zone.selected {
        border-color: #4CAF50;
        background: #e8f5e9;
      }

      /* Drawing Activity */
      .drawing-container {
        text-align: center;
      }

      .drawing-canvas-wrap {
        background: #fff;
        border: 3px solid #e8e4d9;
        border-radius: 16px;
        padding: 8px;
        margin: 16px 0;
      }

      .drawing-canvas {
        width: 100%;
        height: 200px;
        border-radius: 12px;
        cursor: crosshair;
        touch-action: none;
      }

      .drawing-tools {
        display: flex;
        gap: 8px;
        justify-content: center;
        margin-top: 12px;
      }

      .drawing-tool {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        border: 3px solid #e8e4d9;
        cursor: pointer;
        transition: transform 0.2s;
      }

      .drawing-tool:hover {
        transform: scale(1.1);
      }

      .drawing-tool.selected {
        border-color: #405878;
        box-shadow: 0 0 0 3px rgba(64,88,120,0.2);
      }

      /* Grounding Exercise */
      .grounding-container {
        text-align: center;
        padding: 16px;
      }

      .grounding-step {
        background: #fff;
        border: 2px solid #e8e4d9;
        border-radius: 12px;
        padding: 16px;
        margin: 12px 0;
        transition: all 0.3s;
      }

      .grounding-step.active {
        border-color: #f4a261;
        background: #fff8f0;
      }

      .grounding-step.done {
        border-color: #4CAF50;
        background: #e8f5e9;
      }

      .grounding-number {
        font-size: 32px;
        font-weight: 700;
        color: #f4a261;
      }

      .grounding-sense {
        font-size: 14px;
        color: #6d86a8;
        margin-top: 4px;
      }

      .grounding-input {
        width: 100%;
        padding: 10px;
        border: 2px solid #e8e4d9;
        border-radius: 8px;
        margin-top: 8px;
        font-size: 14px;
      }

      /* Audio Activity */
      .audio-container {
        text-align: center;
        padding: 20px;
      }

      .audio-options {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 12px;
        margin: 20px 0;
      }

      .audio-btn {
        background: #fff;
        border: 2px solid #e8e4d9;
        border-radius: 16px;
        padding: 20px 12px;
        cursor: pointer;
        transition: all 0.2s;
      }

      .audio-btn:hover {
        border-color: #f4a261;
        transform: scale(1.03);
      }

      .audio-btn.playing {
        border-color: #4CAF50;
        background: #e8f5e9;
        animation: audioPulse 1s ease-in-out infinite;
      }

      @keyframes audioPulse {
        0%, 100% { box-shadow: 0 0 0 0 rgba(76, 175, 80, 0.4); }
        50% { box-shadow: 0 0 0 10px rgba(76, 175, 80, 0); }
      }

      .audio-btn .emoji {
        font-size: 36px;
        display: block;
        margin-bottom: 8px;
      }

      .audio-btn .label {
        font-size: 13px;
        font-weight: 600;
        color: #405878;
      }

      /* Scale Activity */
      .scale-container {
        padding: 20px;
      }

      .scale-options {
        display: flex;
        justify-content: space-between;
        margin: 20px 0;
      }

      .scale-option {
        flex: 1;
        text-align: center;
        padding: 16px 8px;
        border: 2px solid #e8e4d9;
        cursor: pointer;
        transition: all 0.2s;
      }

      .scale-option:first-child {
        border-radius: 12px 0 0 12px;
      }

      .scale-option:last-child {
        border-radius: 0 12px 12px 0;
      }

      .scale-option:hover {
        background: #fff8f0;
      }

      .scale-option.selected {
        background: #e8f5e9;
        border-color: #4CAF50;
      }

      .scale-option .emoji {
        font-size: 28px;
        display: block;
        margin-bottom: 4px;
      }

      .scale-option .label {
        font-size: 10px;
        color: #6d86a8;
      }

      /* Complete Button */
      .quest-complete-btn {
        width: 100%;
        padding: 16px;
        background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
        color: white;
        border: none;
        border-radius: 14px;
        font-size: 16px;
        font-weight: 700;
        cursor: pointer;
        margin-top: 20px;
        transition: all 0.2s;
        opacity: 0.5;
        pointer-events: none;
      }

      .quest-complete-btn.enabled {
        opacity: 1;
        pointer-events: auto;
      }

      .quest-complete-btn.enabled:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(76, 175, 80, 0.4);
      }

      /* Success Animation */
      .quest-success {
        text-align: center;
        padding: 40px 20px;
      }

      .quest-success-icon {
        font-size: 80px;
        animation: successPop 0.5s ease-out;
      }

      @keyframes successPop {
        0% { transform: scale(0); }
        70% { transform: scale(1.2); }
        100% { transform: scale(1); }
      }

      .quest-success-title {
        font-size: 24px;
        font-weight: 700;
        color: #405878;
        margin: 16px 0 8px;
      }

      .quest-success-reward {
        font-size: 18px;
        color: #f4a261;
        font-weight: 600;
      }

      .quest-success-btn {
        background: linear-gradient(135deg, #405878 0%, #4c6c96 100%);
        color: white;
        border: none;
        padding: 14px 32px;
        border-radius: 12px;
        font-size: 16px;
        font-weight: 600;
        cursor: pointer;
        margin-top: 24px;
        transition: transform 0.2s;
      }

      .quest-success-btn:hover {
        transform: translateY(-2px);
      }

      /* Confetti */
      .quest-confetti {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 10001;
      }

      .confetti-piece {
        position: absolute;
        width: 10px;
        height: 10px;
        animation: confettiFall 3s ease-out forwards;
      }

      @keyframes confettiFall {
        0% {
          transform: translateY(-100px) rotate(0deg);
          opacity: 1;
        }
        100% {
          transform: translateY(100vh) rotate(720deg);
          opacity: 0;
        }
      }
    `;
    document.head.appendChild(styles);
  }

  async init(childId) {
    this.childId = childId;
    await this.loadTodaysQuest();
    this.renderQuestCard();
    this.createModal();
  }

  async loadTodaysQuest() {
    const today = getBrisbaneToday();
    
    // Try to load from database first
    if (this.supabase && this.childId) {
      try {
        const { data, error } = await this.supabase
          .from('daily_quest_completions')
          .select('*')
          .eq('child_id', this.childId)
          .eq('completed_date', today)
          .single();

        if (data && !error) {
          this.isCompleted = true;
          this.currentQuest = DAILY_QUESTS.find(q => q.id === data.quest_id) || DAILY_QUESTS[0];
          return;
        }
      } catch (e) {
        console.log('DB not available or table missing, using localStorage:', e.message);
      }
    }

    // Fallback to localStorage
    const storageKey = `dailyQuest_${this.childId || 'guest'}_${today}`;
    const saved = localStorage.getItem(storageKey);
    
    if (saved) {
      const data = JSON.parse(saved);
      this.currentQuest = DAILY_QUESTS.find(q => q.id === data.questId) || DAILY_QUESTS[0];
      this.isCompleted = data.completed;
    } else {
      // Pick a random quest for today (seeded by date for consistency)
      const seed = today.split('-').join('');
      const index = parseInt(seed) % DAILY_QUESTS.length;
      this.currentQuest = DAILY_QUESTS[index];
      this.isCompleted = false;
    }
  }

  renderQuestCard() {
    const questCard = document.getElementById('dailyQuestCard');
    if (!questCard) return;

    // Update the description
    const descriptionEl = document.getElementById('questDescription');
    if (descriptionEl) {
      descriptionEl.textContent = this.currentQuest.description;
    }

    // Update the existing button
    const btn = document.getElementById('doQuestBtn');
    if (btn) {
      btn.className = `daily-quest-btn ${this.isCompleted ? 'completed' : ''}`;
      btn.disabled = this.isCompleted;
      btn.textContent = this.isCompleted ? 'Completed Today' : 'Do Daily Quest';
      
      // Remove existing listeners and add new one
      const newBtn = btn.cloneNode(true);
      btn.parentNode.replaceChild(newBtn, btn);
      
      if (!this.isCompleted) {
        newBtn.addEventListener('click', () => this.openQuestModal());
      }
    }
  }

  createModal() {
    // Remove existing modal if any
    const existing = document.getElementById('questModalOverlay');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'questModalOverlay';
    modal.className = 'quest-modal-overlay';
    modal.innerHTML = `
      <div class="quest-modal">
        <div class="quest-modal-header" style="position: relative;">
          <button class="quest-modal-close" id="closeQuestModal">×</button>
          <div class="quest-modal-icon" id="questModalIcon">🎯</div>
          <h2 class="quest-modal-title" id="questModalTitle">Daily Quest</h2>
          <p class="quest-modal-desc" id="questModalDesc">Complete this activity to earn a star!</p>
        </div>
        <div class="quest-modal-body">
          <div class="quest-activity" id="questActivityArea"></div>
          <button class="quest-complete-btn" id="questCompleteBtn">Complete Quest</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    // Close handlers
    document.getElementById('closeQuestModal').addEventListener('click', () => this.closeQuestModal());
    modal.addEventListener('click', (e) => {
      if (e.target === modal) this.closeQuestModal();
    });

    document.getElementById('questCompleteBtn').addEventListener('click', () => this.completeQuest());
  }

  openQuestModal() {
    if (this.isCompleted) return;

    const overlay = document.getElementById('questModalOverlay');
    const title = document.getElementById('questModalTitle');
    const desc = document.getElementById('questModalDesc');
    const icon = document.getElementById('questModalIcon');

    title.textContent = this.currentQuest.title;
    desc.textContent = this.currentQuest.description;
    
    // Set icon based on type
    const icons = {
      emotion: '😊', breathing: '🌬️', slider: '🎚️', drawing: '🎨',
      thought: '💭', body: '🧍', memory: '🌈', release: '📦',
      strength: '💪', grounding: '🌍', audio: '🎵', mood: '😌',
      gratitude: '🙏', kindness: '💝', game: '🎮', scale: '⚡', plan: '📋'
    };
    icon.textContent = icons[this.currentQuest.type] || '🎯';

    this.renderActivity();
    overlay.classList.add('active');
  }

  closeQuestModal() {
    const overlay = document.getElementById('questModalOverlay');
    overlay.classList.remove('active');
  }

  renderActivity() {
    const area = document.getElementById('questActivityArea');
    const type = this.currentQuest.type;

    switch (type) {
      case 'emotion':
        area.innerHTML = this.renderEmotionPicker();
        this.setupEmotionPicker();
        break;
      case 'breathing':
        area.innerHTML = this.renderBreathingExercise();
        this.setupBreathingExercise();
        break;
      case 'slider':
      case 'mood':
        area.innerHTML = this.renderSliderActivity();
        this.setupSliderActivity();
        break;
      case 'drawing':
      case 'memory':
        area.innerHTML = this.renderDrawingActivity();
        this.setupDrawingActivity();
        break;
      case 'thought':
      case 'strength':
      case 'gratitude':
      case 'kindness':
      case 'plan':
        area.innerHTML = this.renderChoiceActivity();
        this.setupChoiceActivity();
        break;
      case 'body':
        area.innerHTML = this.renderBodyMap();
        this.setupBodyMap();
        break;
      case 'release':
        area.innerHTML = this.renderReleaseActivity();
        this.setupReleaseActivity();
        break;
      case 'grounding':
        area.innerHTML = this.renderGroundingExercise();
        this.setupGroundingExercise();
        break;
      case 'audio':
        area.innerHTML = this.renderAudioActivity();
        this.setupAudioActivity();
        break;
      case 'scale':
        area.innerHTML = this.renderScaleActivity();
        this.setupScaleActivity();
        break;
      case 'game':
        area.innerHTML = this.renderMatchGame();
        this.setupMatchGame();
        break;
      default:
        area.innerHTML = this.renderEmotionPicker();
        this.setupEmotionPicker();
    }
  }

  // ================== ACTIVITY RENDERERS ==================

  renderEmotionPicker() {
    const emotions = [
      { emoji: '😊', label: 'Happy' },
      { emoji: '😢', label: 'Sad' },
      { emoji: '😠', label: 'Angry' },
      { emoji: '😰', label: 'Worried' },
      { emoji: '😴', label: 'Tired' },
      { emoji: '🤩', label: 'Excited' },
      { emoji: '😌', label: 'Calm' },
      { emoji: '🤔', label: 'Confused' }
    ];

    return `
      <div class="emotion-picker">
        <p style="text-align: center; color: #6d86a8; margin-bottom: 12px;">Tap the feeling that matches you right now:</p>
        <div class="emotion-grid">
          ${emotions.map(e => `
            <button class="emotion-btn" data-emotion="${e.label}">
              <span class="emoji">${e.emoji}</span>
              <span class="label">${e.label}</span>
            </button>
          `).join('')}
        </div>
      </div>
    `;
  }

  setupEmotionPicker() {
    const buttons = document.querySelectorAll('.emotion-btn');
    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        buttons.forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        this.enableCompleteButton();
      });
    });
  }

  renderBreathingExercise() {
    return `
      <div class="breathing-container">
        <p style="color: #6d86a8; margin-bottom: 16px;">Follow the circle - breathe in as it grows, out as it shrinks</p>
        <div class="breathing-circle" id="breathingCircle">
          Ready
        </div>
        <p class="breathing-instruction" id="breathingInstruction">Tap to start</p>
        <p class="breathing-count" id="breathingCount">0 / ${this.currentQuest.target} breaths</p>
        <button class="daily-quest-btn" id="startBreathingBtn" style="margin-top: 16px;">Start Breathing</button>
      </div>
    `;
  }

  setupBreathingExercise() {
    let breathCount = 0;
    let isBreathing = false;
    const circle = document.getElementById('breathingCircle');
    const instruction = document.getElementById('breathingInstruction');
    const count = document.getElementById('breathingCount');
    const startBtn = document.getElementById('startBreathingBtn');
    const target = this.currentQuest.target;

    const doBreathe = () => {
      if (breathCount >= target) return;
      
      // Inhale
      circle.classList.add('inhale');
      circle.textContent = 'Breathe In';
      instruction.textContent = 'Breathe in slowly...';
      
      setTimeout(() => {
        // Exhale
        circle.classList.remove('inhale');
        circle.classList.add('exhale');
        circle.textContent = 'Breathe Out';
        instruction.textContent = 'Breathe out slowly...';
        
        setTimeout(() => {
          circle.classList.remove('exhale');
          breathCount++;
          count.textContent = `${breathCount} / ${target} breaths`;
          
          if (breathCount >= target) {
            circle.textContent = 'Done!';
            instruction.textContent = 'Great job! You did it!';
            startBtn.style.display = 'none';
            this.enableCompleteButton();
          } else {
            circle.textContent = 'Ready';
            instruction.textContent = 'Tap to continue';
            isBreathing = false;
          }
        }, 4000);
      }, 4000);
    };

    startBtn.addEventListener('click', () => {
      if (!isBreathing && breathCount < target) {
        isBreathing = true;
        doBreathe();
      }
    });
  }

  renderSliderActivity() {
    return `
      <div class="slider-container">
        <div class="slider-emoji" id="sliderEmoji">😟</div>
        <p class="slider-label" id="sliderLabel">Move the slider to make Daniel feel calm</p>
        <input type="range" class="quest-slider" id="calmSlider" min="0" max="100" value="20">
        <div style="display: flex; justify-content: space-between; color: #6d86a8; font-size: 12px;">
          <span>Worried</span>
          <span>Calm</span>
        </div>
      </div>
    `;
  }

  setupSliderActivity() {
    const slider = document.getElementById('calmSlider');
    const emoji = document.getElementById('sliderEmoji');
    const label = document.getElementById('sliderLabel');

    slider.addEventListener('input', () => {
      const val = parseInt(slider.value);
      if (val < 30) {
        emoji.textContent = '😟';
        label.textContent = 'Daniel is still worried...';
      } else if (val < 60) {
        emoji.textContent = '😐';
        label.textContent = 'Getting better...';
      } else if (val < 85) {
        emoji.textContent = '🙂';
        label.textContent = 'Daniel is feeling better!';
      } else {
        emoji.textContent = '😌';
        label.textContent = 'Daniel feels calm and peaceful!';
        this.enableCompleteButton();
      }
    });
  }

  renderDrawingActivity() {
    const colors = ['#e76f51', '#f4a261', '#e9c46a', '#2a9d8f', '#264653', '#9c27b0'];
    return `
      <div class="drawing-container">
        <p style="color: #6d86a8; margin-bottom: 8px;">Draw in the box below:</p>
        <div class="drawing-canvas-wrap">
          <canvas id="drawingCanvas" class="drawing-canvas"></canvas>
        </div>
        <div class="drawing-tools">
          ${colors.map((c, i) => `
            <button class="drawing-tool ${i === 0 ? 'selected' : ''}" 
                    style="background: ${c};" 
                    data-color="${c}"></button>
          `).join('')}
          <button class="drawing-tool" style="background: #fff; border-color: #ccc;" data-color="eraser">✕</button>
        </div>
      </div>
    `;
  }

  setupDrawingActivity() {
    const canvas = document.getElementById('drawingCanvas');
    const ctx = canvas.getContext('2d');
    let isDrawing = false;
    let currentColor = '#e76f51';
    let hasDrawn = false;

    // Set canvas size
    canvas.width = canvas.offsetWidth;
    canvas.height = 200;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';

    const getPos = (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
      const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
      return { x, y };
    };

    const startDraw = (e) => {
      isDrawing = true;
      const pos = getPos(e);
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    };

    const draw = (e) => {
      if (!isDrawing) return;
      e.preventDefault();
      hasDrawn = true;
      const pos = getPos(e);
      
      if (currentColor === 'eraser') {
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 20;
      } else {
        ctx.strokeStyle = currentColor;
        ctx.lineWidth = 4;
      }
      
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);

      if (hasDrawn) this.enableCompleteButton();
    };

    const stopDraw = () => {
      isDrawing = false;
    };

    canvas.addEventListener('mousedown', startDraw);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDraw);
    canvas.addEventListener('mouseleave', stopDraw);
    canvas.addEventListener('touchstart', startDraw);
    canvas.addEventListener('touchmove', draw);
    canvas.addEventListener('touchend', stopDraw);

    document.querySelectorAll('.drawing-tool').forEach(tool => {
      tool.addEventListener('click', () => {
        document.querySelectorAll('.drawing-tool').forEach(t => t.classList.remove('selected'));
        tool.classList.add('selected');
        currentColor = tool.dataset.color;
      });
    });
  }

  renderChoiceActivity() {
    const choices = this.getChoicesForType(this.currentQuest.type);
    return `
      <div class="choice-activity">
        <p style="color: #6d86a8; margin-bottom: 12px; text-align: center;">Choose one:</p>
        <div class="choice-list">
          ${choices.map((c, i) => `
            <button class="choice-btn" data-choice="${i}">${c}</button>
          `).join('')}
        </div>
      </div>
    `;
  }

  getChoicesForType(type) {
    const choiceMap = {
      thought: [
        "I am trying my best",
        "It's okay to make mistakes", 
        "I can do hard things",
        "I am loved"
      ],
      strength: [
        "Being a good friend",
        "Being creative",
        "Being kind",
        "Trying new things",
        "Helping others"
      ],
      gratitude: [
        "My family",
        "My friends",
        "My home",
        "Something fun I did today",
        "Someone who helped me"
      ],
      kindness: [
        "I hope you have a great day!",
        "You are special!",
        "Thank you for being you!",
        "You make the world better!"
      ],
      plan: [
        "Take deep breaths",
        "Talk to someone I trust",
        "Do something I enjoy",
        "Go to my calm space",
        "Squeeze a stress ball"
      ]
    };
    return choiceMap[type] || choiceMap.thought;
  }

  setupChoiceActivity() {
    document.querySelectorAll('.choice-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.choice-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        this.enableCompleteButton();
      });
    });
  }

  renderBodyMap() {
    const zones = ['Head', 'Chest', 'Tummy', 'Hands', 'Legs', 'Nowhere'];
    return `
      <div class="body-map-container">
        <p style="color: #6d86a8; margin-bottom: 40px;">Where do you feel something in your body?</p>
        <div class="body-map">🧍</div>
        <div class="body-tap-zones">
          ${zones.map(z => `
            <button class="body-zone" data-zone="${z}">${z}</button>
          `).join('')}
        </div>
      </div>
    `;
  }

  setupBodyMap() {
    document.querySelectorAll('.body-zone').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.body-zone').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        this.enableCompleteButton();
      });
    });
  }

  renderReleaseActivity() {
    return `
      <div class="release-container" style="text-align: center; padding: 20px;">
        <p style="color: #6d86a8; margin-bottom: 16px;">Write or think of one worry, then put it in Daniel's worry box:</p>
        <textarea id="worryInput" placeholder="Type your worry here (optional)..." 
          style="width: 100%; padding: 12px; border: 2px solid #e8e4d9; border-radius: 12px; 
          resize: none; height: 80px; font-size: 14px; margin-bottom: 16px;"></textarea>
        <div id="worryBox" style="font-size: 80px; cursor: pointer; transition: transform 0.3s;">📦</div>
        <p id="releaseText" style="color: #6d86a8; font-size: 14px; margin-top: 8px;">Tap the box to release your worry</p>
      </div>
    `;
  }

  setupReleaseActivity() {
    const box = document.getElementById('worryBox');
    const text = document.getElementById('releaseText');
    const input = document.getElementById('worryInput');
    let released = false;

    box.addEventListener('click', () => {
      if (released) return;
      
      // Check if there's text in the textarea
      const worryText = input.value.trim();
      if (!worryText) {
        text.textContent = 'Please write your worry first!';
        text.style.color = '#e74c3c';
        setTimeout(() => {
          text.textContent = 'Tap the box to release your worry';
          text.style.color = '#6d86a8';
        }, 2000);
        return;
      }
      
      released = true;
      box.style.transform = 'scale(1.2)';
      box.textContent = '✨';
      text.textContent = 'Your worry has been released!';
      setTimeout(() => {
        box.style.transform = 'scale(1)';
        this.enableCompleteButton();
      }, 500);
    });
  }

  renderGroundingExercise() {
    const steps = [
      { num: 5, sense: 'things you can SEE', emoji: '👀' },
      { num: 4, sense: 'things you can TOUCH', emoji: '✋' },
      { num: 3, sense: 'things you can HEAR', emoji: '👂' },
      { num: 2, sense: 'things you can SMELL', emoji: '👃' },
      { num: 1, sense: 'thing you can TASTE', emoji: '👅' }
    ];

    return `
      <div class="grounding-container">
        <p style="color: #6d86a8; margin-bottom: 12px;">Tap each step when you've thought of them:</p>
        ${steps.map((s, i) => `
          <div class="grounding-step" data-step="${i}">
            <span class="grounding-number">${s.num}</span> ${s.emoji}
            <div class="grounding-sense">${s.sense}</div>
          </div>
        `).join('')}
      </div>
    `;
  }

  setupGroundingExercise() {
    let currentStep = 0;
    const steps = document.querySelectorAll('.grounding-step');
    steps[0].classList.add('active');

    steps.forEach((step, i) => {
      step.addEventListener('click', () => {
        if (i !== currentStep) return;
        step.classList.remove('active');
        step.classList.add('done');
        currentStep++;
        
        if (currentStep < steps.length) {
          steps[currentStep].classList.add('active');
        } else {
          this.enableCompleteButton();
        }
      });
    });
  }

  renderAudioActivity() {
    const sounds = [
      { emoji: '🌧️', label: 'Rain' },
      { emoji: '🌊', label: 'Waves' },
      { emoji: '🐦', label: 'Birds' },
      { emoji: '🎹', label: 'Piano' }
    ];

    return `
      <div class="audio-container">
        <p style="color: #6d86a8; margin-bottom: 12px;">Choose a calming sound:</p>
        <div class="audio-options">
          ${sounds.map(s => `
            <button class="audio-btn" data-sound="${s.label.toLowerCase()}">
              <span class="emoji">${s.emoji}</span>
              <span class="label">${s.label}</span>
            </button>
          `).join('')}
        </div>
        <p id="audioStatus" style="color: #6d86a8; font-size: 14px; margin-top: 12px;">Tap a sound to play</p>
      </div>
    `;
  }

  setupAudioActivity() {
    const status = document.getElementById('audioStatus');
    document.querySelectorAll('.audio-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.audio-btn').forEach(b => b.classList.remove('playing'));
        btn.classList.add('playing');
        status.textContent = `Playing ${btn.dataset.sound}... (imagine the sound 🎧)`;
        
        setTimeout(() => {
          btn.classList.remove('playing');
          status.textContent = 'Sound finished! Great job listening.';
          this.enableCompleteButton();
        }, 3000);
      });
    });
  }

  renderScaleActivity() {
    const levels = [
      { emoji: '😴', label: 'Very Tired' },
      { emoji: '🥱', label: 'Tired' },
      { emoji: '😐', label: 'Okay' },
      { emoji: '🙂', label: 'Good' },
      { emoji: '⚡', label: 'Energized' }
    ];

    return `
      <div class="scale-container">
        <p style="color: #6d86a8; margin-bottom: 12px; text-align: center;">How is your energy right now?</p>
        <div class="scale-options">
          ${levels.map((l, i) => `
            <div class="scale-option" data-level="${i}">
              <span class="emoji">${l.emoji}</span>
              <span class="label">${l.label}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  setupScaleActivity() {
    document.querySelectorAll('.scale-option').forEach(opt => {
      opt.addEventListener('click', () => {
        document.querySelectorAll('.scale-option').forEach(o => o.classList.remove('selected'));
        opt.classList.add('selected');
        this.enableCompleteButton();
      });
    });
  }

  renderMatchGame() {
    const pairs = [
      { emoji: '😊', label: 'Happy' },
      { emoji: '😢', label: 'Sad' },
      { emoji: '😠', label: 'Angry' },
      { emoji: '😰', label: 'Worried' }
    ];
    // Shuffle for the game
    const shuffledLabels = [...pairs].sort(() => Math.random() - 0.5);

    return `
      <div class="match-game" style="padding: 16px;">
        <p style="color: #6d86a8; margin-bottom: 16px; text-align: center;">Match each face to its feeling:</p>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
          <div class="match-faces">
            ${pairs.map((p, i) => `
              <div class="emotion-btn" data-match="${p.label}" style="margin-bottom: 8px;">
                <span class="emoji">${p.emoji}</span>
              </div>
            `).join('')}
          </div>
          <div class="match-labels">
            ${shuffledLabels.map(p => `
              <div class="choice-btn" data-label="${p.label}" style="margin-bottom: 8px; text-align: center;">
                ${p.label}
              </div>
            `).join('')}
          </div>
        </div>
        <p id="matchStatus" style="text-align: center; margin-top: 12px; color: #6d86a8;">Tap a face, then tap its feeling</p>
      </div>
    `;
  }

  setupMatchGame() {
    let selectedFace = null;
    let matches = 0;
    const status = document.getElementById('matchStatus');

    document.querySelectorAll('[data-match]').forEach(face => {
      face.addEventListener('click', () => {
        if (face.classList.contains('matched')) return;
        document.querySelectorAll('[data-match]').forEach(f => f.classList.remove('selected'));
        face.classList.add('selected');
        selectedFace = face.dataset.match;
      });
    });

    document.querySelectorAll('[data-label]').forEach(label => {
      label.addEventListener('click', () => {
        if (!selectedFace || label.classList.contains('matched')) return;
        
        if (selectedFace === label.dataset.label) {
          // Correct match
          const face = document.querySelector(`[data-match="${selectedFace}"]`);
          face.classList.remove('selected');
          face.classList.add('matched');
          face.style.opacity = '0.5';
          label.classList.add('matched');
          label.style.opacity = '0.5';
          matches++;
          status.textContent = `Great! ${matches}/4 matched`;
          
          if (matches >= 4) {
            status.textContent = 'All matched! Great job!';
            this.enableCompleteButton();
          }
        } else {
          status.textContent = 'Try again!';
        }
        selectedFace = null;
      });
    });
  }

  // ================== COMPLETION ==================

  enableCompleteButton() {
    const btn = document.getElementById('questCompleteBtn');
    if (btn) btn.classList.add('enabled');
  }

  async completeQuest() {
    const btn = document.getElementById('questCompleteBtn');
    if (!btn.classList.contains('enabled')) return;

    // Show success screen
    this.showSuccess();
    
    // Save completion
    await this.saveCompletion();
    
    // Update UI
    this.isCompleted = true;
    this.renderQuestCard();
  }

  async saveCompletion() {
    const today = getBrisbaneToday();

    // Try database first
    if (this.supabase && this.childId) {
      try {
        // Save completion record
        const { error: insertError } = await this.supabase
          .from('daily_quest_completions')
          .insert({
            child_id: this.childId,
            quest_id: this.currentQuest.id,
            completed_date: today,
            completed_at: new Date().toISOString()
          });

        if (insertError) {
          console.log('Note: Quest completion table not yet available, using localStorage:', insertError.message);
        }

        // Award star - directly update the 'stars' field on children table
        // First get current stars
        const { data: childData, error: fetchError } = await this.supabase
          .from('children')
          .select('stars')
          .eq('id', this.childId)
          .single();

        if (fetchError) {
          console.error('Error fetching child stars:', fetchError);
        } else {
          const currentStars = childData?.stars || 0;
          const newStars = currentStars + 1;

          // Update the stars field
          const { error: updateError } = await this.supabase
            .from('children')
            .update({ stars: newStars })
            .eq('id', this.childId);

          if (updateError) {
            console.error('Error updating child stars:', updateError);
          } else {
            console.log(`Daily Quest: Awarded 1 star. Child now has ${newStars} stars.`);
            if (typeof window.maybeCelebrateFirstStar === 'function') {
              window.maybeCelebrateFirstStar({
                id: this.childId,
                name: window.selectedChild?.name || window.state?.selectedChild?.name || 'Explorer',
                stars: newStars
              });
            }
          }
        }

        // Refresh the dashboard display
        if (typeof window.loadChildData === 'function') {
          await window.loadChildData(this.childId);
        }
        
        // Also update stars display elements directly
        await this.updateStarsDisplay();
        
      } catch (e) {
        console.log('DB save failed, using localStorage:', e.message);
      }
    }

    // Also save to localStorage as backup
    const storageKey = `dailyQuest_${this.childId || 'guest'}_${today}`;
    localStorage.setItem(storageKey, JSON.stringify({
      questId: this.currentQuest.id,
      completed: true,
      completedAt: new Date().toISOString()
    }));
  }

  async updateStarsDisplay() {
    // Update any stars display elements on the page
    const starsElements = document.querySelectorAll('#totalStars, #childStars, .stars-count, [data-stars]');
    
    if (this.supabase && this.childId) {
      const { data } = await this.supabase
        .from('children')
        .select('stars')
        .eq('id', this.childId)
        .single();
      
      if (data) {
        starsElements.forEach(el => {
          el.textContent = data.stars || 0;
        });
      }
    }
  }

  showSuccess() {
    const modal = document.querySelector('.quest-modal');
    modal.innerHTML = `
      <div class="quest-success">
        <div class="quest-success-icon">🌟</div>
        <h2 class="quest-success-title">Amazing Job!</h2>
        <p class="quest-success-reward">+1 Star Earned!</p>
        <button class="quest-success-btn" id="closeSuccessBtn">Continue</button>
      </div>
    `;

    // Confetti!
    this.showConfetti();

    document.getElementById('closeSuccessBtn').addEventListener('click', () => {
      this.closeQuestModal();
    });
  }

  showConfetti() {
    const container = document.createElement('div');
    container.className = 'quest-confetti';
    
    const colors = ['#f4a261', '#e76f51', '#2a9d8f', '#e9c46a', '#9c27b0', '#4CAF50'];
    
    for (let i = 0; i < 50; i++) {
      const piece = document.createElement('div');
      piece.className = 'confetti-piece';
      piece.style.left = Math.random() * 100 + '%';
      piece.style.background = colors[Math.floor(Math.random() * colors.length)];
      piece.style.animationDelay = Math.random() * 0.5 + 's';
      piece.style.borderRadius = Math.random() > 0.5 ? '50%' : '0';
      container.appendChild(piece);
    }
    
    document.body.appendChild(container);
    setTimeout(() => container.remove(), 4000);
  }
}

// ================================================
// INITIALIZE
// ================================================

// Export for use
window.DailyQuestManager = DailyQuestManager;
window.DAILY_QUESTS = DAILY_QUESTS;

// Auto-init when child is selected
window.initDailyQuest = function(childId) {
  if (!window.dailyQuestManager) {
    window.dailyQuestManager = new DailyQuestManager();
  }
  window.dailyQuestManager.init(childId);
};
