// ================================================
// ROADBLOCK SYSTEM - Interactive Mini-Exercises on Adventure Map
// Spawns randomly between modules for XP and stars rewards
// ================================================
import { escapeHtml } from './lib/sanitize.js'

class RoadblockSystem {
  constructor() {
    this.roadblocks = [];          // Available roadblocks from DB
    this.config = null;            // Spawn configuration from DB
    this.activeRoadblocks = [];    // Currently spawned roadblocks on map
    this.completedRoadblocks = []; // Roadblocks completed by current child
    this.supabase = null;
    this.childId = null;
    this.initialized = false;
    
    // Roadblock type handlers
    this.typeHandlers = {
      mini_practice: this.handleMiniPractice.bind(this),
      scenario_choice: this.handleScenarioChoice.bind(this),
      mini_quiz: this.handleMiniQuiz.bind(this),
      breathing: this.handleBreathing.bind(this),
      body_scan: this.handleBodyScan.bind(this),
      emotion_check: this.handleEmotionCheck.bind(this),
      gratitude: this.handleGratitude.bind(this),
      affirmation: this.handleAffirmation.bind(this)
    };
    
    // Visual themes for different roadblock types
    this.typeThemes = {
      mini_practice: { emoji: '🎯', color: '#10B981', label: 'Quick Practice' },
      scenario_choice: { emoji: '🤔', color: '#8B5CF6', label: 'What Would You Do?' },
      mini_quiz: { emoji: '❓', color: '#F59E0B', label: 'Quick Quiz' },
      breathing: { emoji: '🌬️', color: '#06B6D4', label: 'Breathing Exercise' },
      body_scan: { emoji: '🧘', color: '#EC4899', label: 'Body Check-In' },
      emotion_check: { emoji: '💭', color: '#6366F1', label: 'Feeling Detective' },
      gratitude: { emoji: '🙏', color: '#84CC16', label: 'Gratitude Moment' },
      affirmation: { emoji: '⭐', color: '#F472B6', label: 'Power Words' }
    };
  }

  // Initialize the roadblock system
  async init(supabase, childId) {
    if (!supabase || !childId) {
      console.warn('RoadblockSystem: Missing supabase client or childId');
      return false;
    }
    
    this.supabase = supabase;
    this.childId = childId;
    
    try {
      // Load roadblocks from database
      await this.loadRoadblocks();
      
      // Load spawn configuration
      await this.loadConfig();
      
      // Load completed roadblocks for this child
      await this.loadCompletedRoadblocks();
      
      // Inject styles
      this.injectStyles();
      
      this.initialized = true;
      console.log('RoadblockSystem initialized with', this.roadblocks.length, 'roadblocks');
      return true;
    } catch (error) {
      console.error('RoadblockSystem init error:', error);
      return false;
    }
  }

  // Load roadblocks from database
  async loadRoadblocks() {
    const { data, error } = await this.supabase
      .from('roadblocks')
      .select('*')
      .eq('is_active', true);
    
    if (error) throw error;
    this.roadblocks = data || [];
  }

  // Load spawn configuration
  async loadConfig() {
    const { data, error } = await this.supabase
      .from('roadblock_config')
      .select('*')
      .eq('is_active', true)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error; // Ignore "no rows" error
    
    this.config = data || {
      spawn_chance: 0.20,
      force_spawn_after_modules: 4,
      cooldown_modules: 2
    };
  }

  // Load completed roadblocks for this child
  async loadCompletedRoadblocks() {
    const { data, error } = await this.supabase
      .from('child_roadblock_completions')
      .select('roadblock_id, completed_at')
      .eq('child_id', this.childId);
    
    if (error && error.code !== 'PGRST116') {
      // Table might not exist, that's okay
      console.log('Could not load roadblock completions, table may not exist');
      this.completedRoadblocks = [];
      return;
    }
    
    this.completedRoadblocks = data || [];
  }

  // Calculate which roadblocks should spawn based on modules and config
  calculateSpawnPositions(modules, modulePositions) {
    if (!this.initialized || this.roadblocks.length === 0 || modules.length < 2) {
      return [];
    }
    
    const spawns = [];
    let modulesSinceLastRoadblock = 0;
    let lastRoadblockModuleIndex = -1;
    
    // Use seeded random based on child ID for consistent spawns per session
    const seed = this.childId ? this.hashCode(this.childId) : Date.now();
    const random = this.seededRandom(seed);
    
    // Iterate through module gaps
    for (let i = 0; i < modules.length - 1; i++) {
      const currentModule = modules[i];
      const nextModule = modules[i + 1];
      const pos1 = modulePositions[i];
      const pos2 = modulePositions[i + 1];
      
      // Only spawn between completed and available/locked modules
      // This creates "challenges" on the path ahead
      if (currentModule.status !== 'completed') continue;
      
      modulesSinceLastRoadblock++;
      
      // Check cooldown
      if (lastRoadblockModuleIndex >= 0 && 
          (i - lastRoadblockModuleIndex) < this.config.cooldown_modules) {
        continue;
      }
      
      // Determine if we should spawn
      const shouldSpawn = 
        modulesSinceLastRoadblock >= this.config.force_spawn_after_modules ||
        random() < this.config.spawn_chance;
      
      if (shouldSpawn) {
        // Select a random roadblock
        const roadblock = this.selectRoadblock(random, nextModule);
        if (!roadblock) continue;
        
        // Calculate position (between the two nodes)
        const spawnX = (pos1.x + pos2.x) / 2 + (random() - 0.5) * 30;
        const spawnY = (pos1.y + pos2.y) / 2;
        
        spawns.push({
          roadblock: roadblock,
          position: { x: spawnX, y: spawnY },
          afterModuleIndex: i,
          beforeModuleIndex: i + 1,
          id: `roadblock-${i}-${roadblock.id}`
        });
        
        modulesSinceLastRoadblock = 0;
        lastRoadblockModuleIndex = i;
      }
    }
    
    this.activeRoadblocks = spawns;
    return spawns;
  }

  // Select an appropriate roadblock based on context
  selectRoadblock(random, contextModule) {
    if (this.roadblocks.length === 0) return null;
    
    // Filter roadblocks that haven't been completed recently
    const recentlyCompleted = this.completedRoadblocks
      .filter(c => {
        const completedDate = new Date(c.completed_at);
        const daysSince = (Date.now() - completedDate.getTime()) / (1000 * 60 * 60 * 24);
        return daysSince < 7; // Completed in last 7 days
      })
      .map(c => c.roadblock_id);
    
    let available = this.roadblocks.filter(r => !recentlyCompleted.includes(r.id));
    
    // If all have been completed recently, allow repeats
    if (available.length === 0) {
      available = this.roadblocks;
    }
    
    // Prefer roadblocks matching module's super skill if tagged
    if (contextModule && contextModule.superSkillId) {
      const matching = available.filter(r => 
        r.tagged_super_skill_ids && 
        r.tagged_super_skill_ids.includes(contextModule.superSkillId)
      );
      if (matching.length > 0) {
        available = matching;
      }
    }
    
    // Random selection
    const index = Math.floor(random() * available.length);
    return available[index];
  }

  // Render roadblocks on the map
  renderRoadblocks(container) {
    if (!container || this.activeRoadblocks.length === 0) return;
    
    const self = this;
    
    this.activeRoadblocks.forEach(spawn => {
      const { roadblock, position, id } = spawn;
      const theme = this.typeThemes[roadblock.roadblock_type] || this.typeThemes.mini_practice;
      const isCompleted = this.completedRoadblocks.some(c => c.roadblock_id === roadblock.id);
      
      // Create roadblock element
      const element = document.createElement('div');
      element.className = 'roadblock-node' + (isCompleted ? ' completed' : '');
      element.id = id;
      element.style.left = position.x + 'px';
      element.style.top = position.y + 'px';
      element.style.setProperty('--roadblock-color', theme.color);
      
      // Roadblock icon
      const icon = document.createElement('div');
      icon.className = 'roadblock-icon';
      icon.textContent = theme.emoji;
      element.appendChild(icon);
      
      // Reward badge
      if (!isCompleted) {
        const reward = document.createElement('div');
        reward.className = 'roadblock-reward';
        reward.innerHTML = `<span class="reward-stars">+${roadblock.stars_reward || 5}⭐</span>`;
        element.appendChild(reward);
      } else {
        const checkmark = document.createElement('div');
        checkmark.className = 'roadblock-checkmark';
        checkmark.textContent = '✓';
        element.appendChild(checkmark);
      }
      
      // Tooltip
      const tooltip = document.createElement('div');
      tooltip.className = 'roadblock-tooltip';
      tooltip.innerHTML = `
        <div class="tooltip-title">${escapeHtml(theme.label)}</div>
        <div class="tooltip-desc">${escapeHtml(roadblock.title)}</div>
        <div class="tooltip-rewards">
          <span>🎯 ${roadblock.xp_reward || 25} XP</span>
          <span>⭐ ${roadblock.stars_reward || 5} Stars</span>
        </div>
        ${isCompleted ? '<div class="tooltip-completed">Completed!</div>' : '<div class="tooltip-action">Tap to start!</div>'}
      `;
      element.appendChild(tooltip);
      
      // Click handler
      if (!isCompleted) {
        element.addEventListener('click', (e) => {
          e.stopPropagation();
          self.openRoadblock(spawn);
        });
        element.addEventListener('touchend', (e) => {
          e.stopPropagation();
          e.preventDefault();
          self.openRoadblock(spawn);
        });
      }
      
      container.appendChild(element);
    });
  }

  // Open a roadblock modal
  openRoadblock(spawn) {
    const { roadblock } = spawn;
    const theme = this.typeThemes[roadblock.roadblock_type] || this.typeThemes.mini_practice;
    
    // Create modal overlay
    const overlay = document.createElement('div');
    overlay.className = 'roadblock-modal-overlay';
    overlay.id = 'roadblockModal';
    
    // Create modal content
    const modal = document.createElement('div');
    modal.className = 'roadblock-modal';
    modal.style.setProperty('--modal-color', theme.color);
    
    // Header
    const header = document.createElement('div');
    header.className = 'roadblock-modal-header';
    header.innerHTML = `
      <div class="modal-icon">${theme.emoji}</div>
      <div class="modal-title-section">
        <div class="modal-label">${escapeHtml(theme.label)}</div>
        <h2 class="modal-title">${escapeHtml(roadblock.title)}</h2>
      </div>
      <button class="modal-close" aria-label="Close">×</button>
    `;
    modal.appendChild(header);
    
    // Description
    if (roadblock.description) {
      const desc = document.createElement('p');
      desc.className = 'roadblock-modal-desc';
      desc.textContent = roadblock.description;
      modal.appendChild(desc);
    }
    
    // Content area (filled by type handler)
    const content = document.createElement('div');
    content.className = 'roadblock-modal-content';
    content.id = 'roadblockContent';
    modal.appendChild(content);
    
    // Rewards preview
    const rewards = document.createElement('div');
    rewards.className = 'roadblock-modal-rewards';
    rewards.innerHTML = `
      <span class="reward-item">🎯 ${roadblock.xp_reward || 25} XP</span>
      <span class="reward-item">⭐ ${roadblock.stars_reward || 5} Stars</span>
    `;
    modal.appendChild(rewards);
    
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    
    // Animate in
    requestAnimationFrame(() => {
      overlay.classList.add('active');
    });
    
    // Close button handler
    const closeBtn = header.querySelector('.modal-close');
    closeBtn.addEventListener('click', () => this.closeRoadblock());
    
    // Close on overlay click
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) this.closeRoadblock();
    });
    
    // Render content based on type
    const handler = this.typeHandlers[roadblock.roadblock_type];
    if (handler) {
      handler(roadblock, content, spawn);
    } else {
      this.handleGeneric(roadblock, content, spawn);
    }
  }

  // Close the roadblock modal
  closeRoadblock() {
    const overlay = document.getElementById('roadblockModal');
    if (overlay) {
      overlay.classList.remove('active');
      setTimeout(() => overlay.remove(), 300);
    }
  }

  // Complete a roadblock and award rewards
  async completeRoadblock(spawn, success = true) {
    const { roadblock } = spawn;
    
    // Record completion in database
    try {
      await this.supabase
        .from('child_roadblock_completions')
        .insert({
          child_id: this.childId,
          roadblock_id: roadblock.id,
          completed_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Could not save roadblock completion:', error);
    }
    
    // Award XP and stars
    const xpReward = roadblock.xp_reward || 25;
    const starsReward = roadblock.stars_reward || 5;
    
    try {
      // Update child's stars and XP
      const child = window.selectedChild;
      if (child && child.id) {
        const previousStars = child.stars ?? child.total_stars ?? 0;
        await this.supabase.rpc('increment_child_rewards', {
          p_child_id: child.id,
          p_stars: starsReward,
          p_xp: xpReward
        });
        
        // Update local state
        if (child.total_stars !== undefined) {
          child.total_stars = (child.total_stars || 0) + starsReward;
        }
        if (child.total_xp !== undefined) {
          child.total_xp = (child.total_xp || 0) + xpReward;
        }

        const newStars = previousStars + starsReward;
        if (child.stars !== undefined) {
          child.stars = newStars;
        }
        if (typeof window.maybeCelebrateFirstStar === 'function') {
          window.maybeCelebrateFirstStar({
            id: child.id,
            name: child.name || 'Explorer',
            stars: newStars
          });
        }
        
        // Trigger UI refresh
        if (window.updateStatsDisplay) {
          window.updateStatsDisplay();
        }
      }
    } catch (error) {
      console.error('Could not award rewards:', error);
    }
    
    // Add to local completed list
    this.completedRoadblocks.push({
      roadblock_id: roadblock.id,
      completed_at: new Date().toISOString()
    });
    
    // Show completion animation
    this.showCompletionAnimation(xpReward, starsReward);
    
    // Close modal after animation
    setTimeout(() => {
      this.closeRoadblock();
      
      // Refresh the adventure map to show completion
      if (window.enhancedDashboard && window.enhancedDashboard.adventureMap) {
        window.enhancedDashboard.adventureMap.render();
      }
    }, 2000);
  }

  // Show completion celebration animation
  showCompletionAnimation(xp, stars) {
    const content = document.getElementById('roadblockContent');
    if (!content) return;
    
    content.innerHTML = `
      <div class="roadblock-complete-animation">
        <div class="complete-icon">🎉</div>
        <h3 class="complete-title">Amazing Job!</h3>
        <div class="complete-rewards">
          <div class="reward-earned reward-xp">+${xp} XP</div>
          <div class="reward-earned reward-stars">+${stars} ⭐</div>
        </div>
        <div class="complete-sparkles">
          <span>✨</span><span>⭐</span><span>✨</span><span>🌟</span><span>✨</span>
        </div>
      </div>
    `;
  }

  // ================================================
  // TYPE HANDLERS - Each roadblock type has its own handler
  // ================================================

  // Generic fallback handler
  handleGeneric(roadblock, container, spawn) {
    const content = roadblock.content_json || {};
    
    container.innerHTML = `
      <div class="generic-roadblock">
        <p>${content.instructions || 'Complete this quick challenge!'}</p>
        <button class="roadblock-btn primary" id="completeGeneric">I Did It! ✓</button>
      </div>
    `;
    
    document.getElementById('completeGeneric').addEventListener('click', () => {
      this.completeRoadblock(spawn);
    });
  }

  // Mini Practice handler (e.g., body scan, breathing)
  handleMiniPractice(roadblock, container, spawn) {
    const content = roadblock.content_json || {};
    const type = content.type || 'generic';
    
    if (type === 'breathing') {
      this.handleBreathing(roadblock, container, spawn);
      return;
    }
    
    if (type === 'body_scan') {
      this.handleBodyScan(roadblock, container, spawn);
      return;
    }
    
    // Default mini practice
    const instructions = content.instructions || 'Take a moment to practice this skill.';
    const duration = content.duration || 30;
    
    container.innerHTML = `
      <div class="mini-practice">
        <p class="practice-instructions">${instructions}</p>
        <div class="practice-timer">
          <div class="timer-circle">
            <span class="timer-count">${duration}</span>
            <span class="timer-label">seconds</span>
          </div>
        </div>
        <button class="roadblock-btn primary" id="startPractice">Start Practice</button>
      </div>
    `;
    
    const self = this;
    document.getElementById('startPractice').addEventListener('click', function() {
      self.startTimer(duration, spawn);
    });
  }

  // Breathing exercise handler
  handleBreathing(roadblock, container, spawn) {
    const content = roadblock.content_json || {};
    const instructions = content.instructions || 'Follow the circle to breathe in and out slowly.';
    const cycles = content.cycles || 3;
    
    container.innerHTML = `
      <div class="breathing-exercise">
        <p class="breathing-instructions">${instructions}</p>
        <div class="breathing-circle-container">
          <div class="breathing-circle">
            <span class="breathing-text">Ready</span>
          </div>
        </div>
        <div class="breathing-progress">
          <span id="cycleCount">0</span> / ${cycles} breaths
        </div>
        <button class="roadblock-btn primary" id="startBreathing">Start Breathing</button>
      </div>
    `;
    
    const self = this;
    document.getElementById('startBreathing').addEventListener('click', function() {
      this.style.display = 'none';
      self.runBreathingExercise(cycles, spawn);
    });
  }

  // Run the breathing animation
  runBreathingExercise(totalCycles, spawn) {
    const circle = document.querySelector('.breathing-circle');
    const text = document.querySelector('.breathing-text');
    const counter = document.getElementById('cycleCount');
    let cycle = 0;
    
    const breathe = () => {
      if (cycle >= totalCycles) {
        text.textContent = 'Done!';
        this.completeRoadblock(spawn);
        return;
      }
      
      // Breathe in (4 seconds)
      circle.classList.add('inhale');
      circle.classList.remove('exhale');
      text.textContent = 'Breathe In...';
      
      setTimeout(() => {
        // Hold (2 seconds)
        text.textContent = 'Hold...';
        
        setTimeout(() => {
          // Breathe out (4 seconds)
          circle.classList.add('exhale');
          circle.classList.remove('inhale');
          text.textContent = 'Breathe Out...';
          
          setTimeout(() => {
            cycle++;
            counter.textContent = cycle;
            breathe();
          }, 4000);
        }, 2000);
      }, 4000);
    };
    
    breathe();
  }

  // Body scan handler
  handleBodyScan(roadblock, container, spawn) {
    const content = roadblock.content_json || {};
    const instructions = content.instructions || 'Let\'s check in with your body. Tap each body part to see how it feels.';
    const bodyParts = content.body_parts || ['head', 'shoulders', 'tummy', 'hands', 'feet'];
    
    let checked = 0;
    
    container.innerHTML = `
      <div class="body-scan">
        <p class="scan-instructions">${instructions}</p>
        <div class="body-figure">
          ${bodyParts.map((part, i) => `
            <button class="body-part" data-part="${part}" style="--delay: ${i * 0.1}s">
              ${this.getBodyPartEmoji(part)}
              <span class="part-label">${part}</span>
            </button>
          `).join('')}
        </div>
        <div class="scan-progress">${checked} / ${bodyParts.length} checked</div>
      </div>
    `;
    
    const self = this;
    const buttons = container.querySelectorAll('.body-part');
    buttons.forEach(btn => {
      btn.addEventListener('click', function() {
        if (this.classList.contains('checked')) return;
        
        this.classList.add('checked');
        checked++;
        container.querySelector('.scan-progress').textContent = `${checked} / ${bodyParts.length} checked`;
        
        if (checked >= bodyParts.length) {
          setTimeout(() => self.completeRoadblock(spawn), 500);
        }
      });
    });
  }

  getBodyPartEmoji(part) {
    const emojis = {
      head: '🧠',
      shoulders: '💪',
      tummy: '🫃',
      hands: '🤲',
      feet: '🦶',
      heart: '❤️',
      chest: '🫁'
    };
    return emojis[part.toLowerCase()] || '👆';
  }

  // Scenario choice handler
  handleScenarioChoice(roadblock, container, spawn) {
    const content = roadblock.content_json || {};
    const scenario = content.scenario || 'What would you do in this situation?';
    const options = content.options || [
      { text: 'Take a deep breath', points: 3 },
      { text: 'Walk away', points: 2 },
      { text: 'Get angry', points: 1 }
    ];
    
    container.innerHTML = `
      <div class="scenario-choice">
        <p class="scenario-text">${scenario}</p>
        <div class="scenario-options">
          ${options.map((opt, i) => `
            <button class="scenario-option" data-points="${opt.points}" data-index="${i}">
              ${opt.text}
            </button>
          `).join('')}
        </div>
      </div>
    `;
    
    const self = this;
    const optionBtns = container.querySelectorAll('.scenario-option');
    optionBtns.forEach(btn => {
      btn.addEventListener('click', function() {
        const points = parseInt(this.dataset.points, 10);
        optionBtns.forEach(b => b.classList.remove('selected'));
        this.classList.add('selected');
        
        // Show feedback
        const isGood = points >= 2;
        this.classList.add(isGood ? 'correct' : 'needs-work');
        
        // Show explanation if available
        const feedback = content.feedback && content.feedback[this.dataset.index];
        if (feedback) {
          const feedbackEl = document.createElement('div');
          feedbackEl.className = 'scenario-feedback ' + (isGood ? 'positive' : 'neutral');
          feedbackEl.textContent = feedback;
          container.querySelector('.scenario-options').appendChild(feedbackEl);
        }
        
        setTimeout(() => self.completeRoadblock(spawn), 1500);
      });
    });
  }

  // Mini quiz handler
  handleMiniQuiz(roadblock, container, spawn) {
    const content = roadblock.content_json || {};
    const questions = content.questions || [
      { q: 'How are you feeling right now?', options: ['😊 Good', '😐 Okay', '😔 Not great'] }
    ];
    
    let currentQ = 0;
    
    const renderQuestion = () => {
      if (currentQ >= questions.length) {
        this.completeRoadblock(spawn);
        return;
      }
      
      const q = questions[currentQ];
      container.innerHTML = `
        <div class="mini-quiz">
          <div class="quiz-progress">${currentQ + 1} / ${questions.length}</div>
          <p class="quiz-question">${q.q}</p>
          <div class="quiz-options">
            ${q.options.map((opt, i) => `
              <button class="quiz-option" data-index="${i}">${opt}</button>
            `).join('')}
          </div>
        </div>
      `;
      
      const optBtns = container.querySelectorAll('.quiz-option');
      optBtns.forEach(btn => {
        btn.addEventListener('click', function() {
          this.classList.add('selected');
          setTimeout(() => {
            currentQ++;
            renderQuestion();
          }, 500);
        });
      });
    };
    
    renderQuestion();
  }

  // Emotion check handler
  handleEmotionCheck(roadblock, container, spawn) {
    const content = roadblock.content_json || {};
    const prompt = content.prompt || 'How are you feeling right now?';
    const emotions = content.emotions || [
      { emoji: '😊', label: 'Happy' },
      { emoji: '😌', label: 'Calm' },
      { emoji: '😔', label: 'Sad' },
      { emoji: '😤', label: 'Frustrated' },
      { emoji: '😰', label: 'Worried' },
      { emoji: '😴', label: 'Tired' }
    ];
    
    container.innerHTML = `
      <div class="emotion-check">
        <p class="emotion-prompt">${prompt}</p>
        <div class="emotion-grid">
          ${emotions.map(e => `
            <button class="emotion-btn" data-emotion="${e.label}">
              <span class="emotion-emoji">${e.emoji}</span>
              <span class="emotion-label">${e.label}</span>
            </button>
          `).join('')}
        </div>
      </div>
    `;
    
    const self = this;
    const emotionBtns = container.querySelectorAll('.emotion-btn');
    emotionBtns.forEach(btn => {
      btn.addEventListener('click', function() {
        emotionBtns.forEach(b => b.classList.remove('selected'));
        this.classList.add('selected');
        
        // Show validation
        const response = document.createElement('div');
        response.className = 'emotion-response';
        response.innerHTML = `<span class="response-emoji">💜</span> Thank you for sharing how you feel!`;
        container.querySelector('.emotion-check').appendChild(response);
        
        setTimeout(() => self.completeRoadblock(spawn), 1500);
      });
    });
  }

  // Gratitude moment handler
  handleGratitude(roadblock, container, spawn) {
    const content = roadblock.content_json || {};
    const prompt = content.prompt || 'What\'s one thing you\'re thankful for today?';
    const suggestions = content.suggestions || ['Family', 'Friends', 'A yummy meal', 'Playing outside', 'My pet'];
    
    container.innerHTML = `
      <div class="gratitude-moment">
        <p class="gratitude-prompt">${prompt}</p>
        <div class="gratitude-input-area">
          <textarea class="gratitude-input" placeholder="I'm thankful for..." maxlength="200"></textarea>
          <div class="gratitude-suggestions">
            <span class="suggestions-label">Ideas:</span>
            ${suggestions.map(s => `<button class="suggestion-chip">${s}</button>`).join('')}
          </div>
        </div>
        <button class="roadblock-btn primary" id="submitGratitude" disabled>Share Gratitude 🙏</button>
      </div>
    `;
    
    const input = container.querySelector('.gratitude-input');
    const submitBtn = document.getElementById('submitGratitude');
    const chips = container.querySelectorAll('.suggestion-chip');
    
    // Enable submit when text entered
    input.addEventListener('input', () => {
      submitBtn.disabled = input.value.trim().length < 2;
    });
    
    // Fill with suggestion on chip click
    chips.forEach(chip => {
      chip.addEventListener('click', () => {
        input.value = chip.textContent;
        submitBtn.disabled = false;
        input.focus();
      });
    });
    
    const self = this;
    submitBtn.addEventListener('click', () => {
      self.completeRoadblock(spawn);
    });
  }

  // Affirmation handler
  handleAffirmation(roadblock, container, spawn) {
    const content = roadblock.content_json || {};
    const affirmations = content.affirmations || [
      'I am brave and strong',
      'I can handle my feelings',
      'I am loved and important',
      'I can do hard things',
      'It\'s okay to make mistakes'
    ];
    
    const selected = affirmations[Math.floor(Math.random() * affirmations.length)];
    
    container.innerHTML = `
      <div class="affirmation">
        <div class="affirmation-card">
          <div class="affirmation-icon">⭐</div>
          <p class="affirmation-text">"${selected}"</p>
        </div>
        <p class="affirmation-instruction">Say this out loud or in your head 3 times:</p>
        <div class="affirmation-counter">
          <button class="counter-btn" id="sayItBtn">I said it! <span class="count-display">0/3</span></button>
        </div>
      </div>
    `;
    
    let count = 0;
    const self = this;
    const btn = document.getElementById('sayItBtn');
    const display = btn.querySelector('.count-display');
    
    btn.addEventListener('click', () => {
      count++;
      display.textContent = `${count}/3`;
      btn.classList.add('pulse');
      setTimeout(() => btn.classList.remove('pulse'), 300);
      
      if (count >= 3) {
        btn.disabled = true;
        btn.textContent = 'Amazing! ✨';
        setTimeout(() => self.completeRoadblock(spawn), 1000);
      }
    });
  }

  // Timer utility for mini practices
  startTimer(duration, spawn) {
    const timerCount = document.querySelector('.timer-count');
    const startBtn = document.getElementById('startPractice');
    if (startBtn) startBtn.style.display = 'none';
    
    let remaining = duration;
    
    const interval = setInterval(() => {
      remaining--;
      if (timerCount) timerCount.textContent = remaining;
      
      if (remaining <= 0) {
        clearInterval(interval);
        this.completeRoadblock(spawn);
      }
    }, 1000);
  }

  // Utility functions
  hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  seededRandom(seed) {
    let s = seed;
    return function() {
      s = Math.sin(s) * 10000;
      return s - Math.floor(s);
    };
  }

  // Inject CSS styles
  injectStyles() {
    if (document.getElementById('roadblock-system-styles')) return;
    
    const css = `
      /* Roadblock Node on Map */
      .roadblock-node {
        position: absolute;
        width: 52px;
        height: 52px;
        border-radius: 50%;
        background: linear-gradient(145deg, #fff 0%, #f0f0f0 100%);
        border: 3px solid var(--roadblock-color, #F59E0B);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        z-index: 8;
        transform: translate(-50%, -50%);
        box-shadow: 0 4px 15px rgba(0,0,0,0.15), 0 0 0 4px rgba(245,158,11,0.2);
        transition: all 0.3s ease;
        animation: roadblockPulse 2s ease-in-out infinite;
      }
      
      .roadblock-node:hover {
        transform: translate(-50%, -50%) scale(1.1);
        box-shadow: 0 6px 20px rgba(0,0,0,0.2), 0 0 0 6px rgba(245,158,11,0.3);
      }
      
      .roadblock-node.completed {
        background: linear-gradient(145deg, #d4edda 0%, #c3e6cb 100%);
        border-color: #28a745;
        animation: none;
        opacity: 0.8;
        cursor: default;
      }
      
      @keyframes roadblockPulse {
        0%, 100% { box-shadow: 0 4px 15px rgba(0,0,0,0.15), 0 0 0 4px rgba(245,158,11,0.2); }
        50% { box-shadow: 0 4px 20px rgba(0,0,0,0.2), 0 0 0 8px rgba(245,158,11,0.15); }
      }
      
      .roadblock-icon {
        font-size: 24px;
        z-index: 1;
      }
      
      .roadblock-reward {
        position: absolute;
        bottom: -8px;
        right: -8px;
        background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
        padding: 2px 6px;
        border-radius: 10px;
        font-size: 10px;
        font-weight: 700;
        color: #fff;
        box-shadow: 0 2px 6px rgba(0,0,0,0.2);
        white-space: nowrap;
      }
      
      .roadblock-checkmark {
        position: absolute;
        bottom: -6px;
        right: -6px;
        width: 22px;
        height: 22px;
        background: #28a745;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #fff;
        font-weight: 700;
        font-size: 12px;
        box-shadow: 0 2px 6px rgba(0,0,0,0.2);
      }
      
      .roadblock-tooltip {
        position: absolute;
        bottom: 65px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(17,24,39,0.95);
        color: #fff;
        padding: 12px 16px;
        border-radius: 12px;
        font-size: 12px;
        white-space: nowrap;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.2s ease, transform 0.2s ease;
        z-index: 20;
        box-shadow: 0 8px 25px rgba(0,0,0,0.3);
      }
      
      .roadblock-node:hover .roadblock-tooltip {
        opacity: 1;
        transform: translateX(-50%) translateY(-4px);
      }
      
      .tooltip-title {
        font-weight: 700;
        font-size: 13px;
        margin-bottom: 4px;
        color: var(--roadblock-color, #F59E0B);
      }
      
      .tooltip-desc {
        margin-bottom: 8px;
        opacity: 0.9;
      }
      
      .tooltip-rewards {
        display: flex;
        gap: 12px;
        font-size: 11px;
        opacity: 0.8;
      }
      
      .tooltip-completed {
        color: #4ade80;
        font-weight: 600;
        margin-top: 8px;
      }
      
      .tooltip-action {
        color: #fbbf24;
        font-weight: 600;
        margin-top: 8px;
      }
      
      /* Modal Overlay */
      .roadblock-modal-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,0.6);
        backdrop-filter: blur(4px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
        opacity: 0;
        transition: opacity 0.3s ease;
        padding: 20px;
      }
      
      .roadblock-modal-overlay.active {
        opacity: 1;
      }
      
      .roadblock-modal {
        background: #fff;
        border-radius: 24px;
        max-width: 480px;
        width: 100%;
        max-height: 90vh;
        overflow-y: auto;
        box-shadow: 0 25px 60px rgba(0,0,0,0.3);
        transform: scale(0.9) translateY(20px);
        transition: transform 0.3s ease;
      }
      
      .roadblock-modal-overlay.active .roadblock-modal {
        transform: scale(1) translateY(0);
      }
      
      .roadblock-modal-header {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 20px 24px;
        background: linear-gradient(135deg, var(--modal-color, #F59E0B) 0%, color-mix(in srgb, var(--modal-color, #F59E0B) 80%, #000) 100%);
        color: #fff;
        border-radius: 24px 24px 0 0;
      }
      
      .modal-icon {
        font-size: 40px;
        background: rgba(255,255,255,0.2);
        width: 60px;
        height: 60px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .modal-title-section {
        flex: 1;
      }
      
      .modal-label {
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 1px;
        opacity: 0.9;
      }
      
      .modal-title {
        font-family: 'Fredoka', sans-serif;
        font-size: 22px;
        font-weight: 600;
        margin: 4px 0 0;
      }
      
      .modal-close {
        background: rgba(255,255,255,0.2);
        border: none;
        width: 36px;
        height: 36px;
        border-radius: 50%;
        font-size: 24px;
        color: #fff;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.2s ease;
      }
      
      .modal-close:hover {
        background: rgba(255,255,255,0.3);
      }
      
      .roadblock-modal-desc {
        padding: 20px 24px 0;
        color: #64748b;
        font-size: 15px;
        line-height: 1.5;
        margin: 0;
      }
      
      .roadblock-modal-content {
        padding: 24px;
      }
      
      .roadblock-modal-rewards {
        display: flex;
        justify-content: center;
        gap: 24px;
        padding: 16px 24px 24px;
        border-top: 1px solid #f0f0f0;
      }
      
      .reward-item {
        font-size: 14px;
        font-weight: 600;
        color: #64748b;
      }
      
      /* Common Button Styles */
      .roadblock-btn {
        padding: 14px 28px;
        border-radius: 14px;
        font-family: 'Fredoka', sans-serif;
        font-size: 16px;
        font-weight: 600;
        border: none;
        cursor: pointer;
        transition: all 0.2s ease;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
      }
      
      .roadblock-btn.primary {
        background: linear-gradient(135deg, var(--modal-color, #F59E0B) 0%, color-mix(in srgb, var(--modal-color, #F59E0B) 80%, #000) 100%);
        color: #fff;
        box-shadow: 0 4px 15px rgba(0,0,0,0.2);
      }
      
      .roadblock-btn.primary:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(0,0,0,0.25);
      }
      
      .roadblock-btn.primary:disabled {
        opacity: 0.5;
        cursor: not-allowed;
        transform: none;
      }
      
      /* Completion Animation */
      .roadblock-complete-animation {
        text-align: center;
        padding: 20px;
      }
      
      .complete-icon {
        font-size: 64px;
        animation: celebrateBounce 0.6s ease;
      }
      
      @keyframes celebrateBounce {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.3); }
      }
      
      .complete-title {
        font-family: 'Fredoka', sans-serif;
        font-size: 28px;
        color: #10b981;
        margin: 16px 0;
      }
      
      .complete-rewards {
        display: flex;
        justify-content: center;
        gap: 20px;
        margin-bottom: 20px;
      }
      
      .reward-earned {
        padding: 12px 24px;
        border-radius: 12px;
        font-size: 18px;
        font-weight: 700;
        animation: rewardPop 0.5s ease backwards;
      }
      
      .reward-xp {
        background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
        color: #fff;
        animation-delay: 0.2s;
      }
      
      .reward-stars {
        background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
        color: #fff;
        animation-delay: 0.4s;
      }
      
      @keyframes rewardPop {
        0% { transform: scale(0); opacity: 0; }
        100% { transform: scale(1); opacity: 1; }
      }
      
      .complete-sparkles {
        font-size: 24px;
        animation: sparkleRotate 2s linear infinite;
      }
      
      .complete-sparkles span {
        display: inline-block;
        animation: sparkleFloat 1s ease-in-out infinite alternate;
      }
      
      .complete-sparkles span:nth-child(2) { animation-delay: 0.2s; }
      .complete-sparkles span:nth-child(3) { animation-delay: 0.4s; }
      .complete-sparkles span:nth-child(4) { animation-delay: 0.6s; }
      .complete-sparkles span:nth-child(5) { animation-delay: 0.8s; }
      
      @keyframes sparkleFloat {
        0% { transform: translateY(0); }
        100% { transform: translateY(-10px); }
      }
      
      /* Breathing Exercise Styles */
      .breathing-exercise {
        text-align: center;
      }
      
      .breathing-instructions {
        color: #64748b;
        margin-bottom: 24px;
      }
      
      .breathing-circle-container {
        display: flex;
        justify-content: center;
        margin-bottom: 20px;
      }
      
      .breathing-circle {
        width: 160px;
        height: 160px;
        border-radius: 50%;
        background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%);
        display: flex;
        align-items: center;
        justify-content: center;
        transition: transform 4s ease-in-out;
      }
      
      .breathing-circle.inhale {
        transform: scale(1.3);
      }
      
      .breathing-circle.exhale {
        transform: scale(1);
      }
      
      .breathing-text {
        color: #fff;
        font-family: 'Fredoka', sans-serif;
        font-size: 18px;
        font-weight: 600;
      }
      
      .breathing-progress {
        color: #64748b;
        font-size: 14px;
      }
      
      /* Body Scan Styles */
      .body-scan {
        text-align: center;
      }
      
      .scan-instructions {
        color: #64748b;
        margin-bottom: 20px;
      }
      
      .body-figure {
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: 12px;
        margin-bottom: 20px;
      }
      
      .body-part {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        padding: 16px 20px;
        border: 2px solid #e2e8f0;
        border-radius: 16px;
        background: #fff;
        cursor: pointer;
        transition: all 0.2s ease;
        animation: fadeInUp 0.3s ease backwards;
        animation-delay: var(--delay, 0s);
      }
      
      @keyframes fadeInUp {
        0% { opacity: 0; transform: translateY(10px); }
        100% { opacity: 1; transform: translateY(0); }
      }
      
      .body-part:hover {
        border-color: #ec4899;
        background: #fdf2f8;
      }
      
      .body-part.checked {
        background: linear-gradient(135deg, #d946ef 0%, #ec4899 100%);
        border-color: transparent;
        color: #fff;
      }
      
      .body-part span:first-child {
        font-size: 28px;
      }
      
      .part-label {
        font-size: 12px;
        font-weight: 600;
        text-transform: capitalize;
      }
      
      .scan-progress {
        color: #64748b;
        font-size: 14px;
      }
      
      /* Scenario Choice Styles */
      .scenario-choice {
        text-align: center;
      }
      
      .scenario-text {
        font-size: 18px;
        color: #1e293b;
        margin-bottom: 24px;
        line-height: 1.5;
      }
      
      .scenario-options {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      
      .scenario-option {
        padding: 16px 20px;
        border: 2px solid #e2e8f0;
        border-radius: 14px;
        background: #fff;
        font-size: 15px;
        text-align: left;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      
      .scenario-option:hover {
        border-color: #8b5cf6;
        background: #f5f3ff;
      }
      
      .scenario-option.selected {
        border-color: #8b5cf6;
        background: #f5f3ff;
      }
      
      .scenario-option.correct {
        border-color: #10b981;
        background: #d1fae5;
      }
      
      .scenario-option.needs-work {
        border-color: #f59e0b;
        background: #fef3c7;
      }
      
      .scenario-feedback {
        margin-top: 16px;
        padding: 12px 16px;
        border-radius: 12px;
        font-size: 14px;
      }
      
      .scenario-feedback.positive {
        background: #d1fae5;
        color: #065f46;
      }
      
      .scenario-feedback.neutral {
        background: #fef3c7;
        color: #92400e;
      }
      
      /* Mini Quiz Styles */
      .mini-quiz {
        text-align: center;
      }
      
      .quiz-progress {
        font-size: 13px;
        color: #94a3b8;
        margin-bottom: 16px;
      }
      
      .quiz-question {
        font-size: 18px;
        color: #1e293b;
        margin-bottom: 24px;
        line-height: 1.5;
      }
      
      .quiz-options {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      
      .quiz-option {
        padding: 16px 20px;
        border: 2px solid #e2e8f0;
        border-radius: 14px;
        background: #fff;
        font-size: 15px;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      
      .quiz-option:hover {
        border-color: #f59e0b;
        background: #fffbeb;
      }
      
      .quiz-option.selected {
        border-color: #f59e0b;
        background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
        color: #fff;
      }
      
      /* Emotion Check Styles */
      .emotion-check {
        text-align: center;
      }
      
      .emotion-prompt {
        font-size: 18px;
        color: #1e293b;
        margin-bottom: 24px;
      }
      
      .emotion-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 12px;
        margin-bottom: 20px;
      }
      
      .emotion-btn {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        padding: 16px 12px;
        border: 2px solid #e2e8f0;
        border-radius: 16px;
        background: #fff;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      
      .emotion-btn:hover {
        border-color: #6366f1;
        background: #eef2ff;
        transform: scale(1.05);
      }
      
      .emotion-btn.selected {
        border-color: #6366f1;
        background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
        color: #fff;
      }
      
      .emotion-emoji {
        font-size: 32px;
      }
      
      .emotion-label {
        font-size: 12px;
        font-weight: 600;
      }
      
      .emotion-response {
        margin-top: 20px;
        padding: 16px;
        background: #f5f3ff;
        border-radius: 12px;
        color: #6366f1;
        font-weight: 600;
        animation: fadeIn 0.3s ease;
      }
      
      .response-emoji {
        font-size: 20px;
        margin-right: 8px;
      }
      
      @keyframes fadeIn {
        0% { opacity: 0; transform: translateY(10px); }
        100% { opacity: 1; transform: translateY(0); }
      }
      
      /* Gratitude Moment Styles */
      .gratitude-moment {
        text-align: center;
      }
      
      .gratitude-prompt {
        font-size: 18px;
        color: #1e293b;
        margin-bottom: 20px;
      }
      
      .gratitude-input-area {
        margin-bottom: 20px;
      }
      
      .gratitude-input {
        width: 100%;
        padding: 16px;
        border: 2px solid #e2e8f0;
        border-radius: 14px;
        font-size: 15px;
        font-family: inherit;
        resize: none;
        height: 100px;
        transition: border-color 0.2s ease;
      }
      
      .gratitude-input:focus {
        outline: none;
        border-color: #84cc16;
      }
      
      .gratitude-suggestions {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 12px;
        justify-content: center;
        align-items: center;
      }
      
      .suggestions-label {
        font-size: 12px;
        color: #94a3b8;
      }
      
      .suggestion-chip {
        padding: 6px 12px;
        border: 1px solid #d9f99d;
        border-radius: 20px;
        background: #f7fee7;
        font-size: 12px;
        color: #4d7c0f;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      
      .suggestion-chip:hover {
        background: #d9f99d;
      }
      
      /* Affirmation Styles */
      .affirmation {
        text-align: center;
      }
      
      .affirmation-card {
        background: linear-gradient(135deg, #fdf4ff 0%, #fae8ff 100%);
        border: 2px solid #f0abfc;
        border-radius: 20px;
        padding: 30px 24px;
        margin-bottom: 20px;
      }
      
      .affirmation-icon {
        font-size: 40px;
        margin-bottom: 12px;
      }
      
      .affirmation-text {
        font-family: 'Fredoka', sans-serif;
        font-size: 22px;
        color: #a855f7;
        font-weight: 600;
        line-height: 1.4;
        margin: 0;
      }
      
      .affirmation-instruction {
        color: #64748b;
        font-size: 14px;
        margin-bottom: 16px;
      }
      
      .counter-btn {
        padding: 16px 32px;
        border: 2px solid #f0abfc;
        border-radius: 14px;
        background: #fff;
        font-family: 'Fredoka', sans-serif;
        font-size: 16px;
        font-weight: 600;
        color: #a855f7;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      
      .counter-btn:hover {
        background: #fdf4ff;
      }
      
      .counter-btn.pulse {
        animation: btnPulse 0.3s ease;
      }
      
      @keyframes btnPulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.05); }
      }
      
      .counter-btn:disabled {
        background: linear-gradient(135deg, #a855f7 0%, #d946ef 100%);
        color: #fff;
        border-color: transparent;
      }
      
      /* Timer Styles */
      .practice-timer {
        display: flex;
        justify-content: center;
        margin: 24px 0;
      }
      
      .timer-circle {
        width: 120px;
        height: 120px;
        border-radius: 50%;
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        color: #fff;
      }
      
      .timer-count {
        font-family: 'Fredoka', sans-serif;
        font-size: 36px;
        font-weight: 700;
      }
      
      .timer-label {
        font-size: 12px;
        opacity: 0.9;
      }
      
      /* Mobile Responsive */
      @media (max-width: 480px) {
        .roadblock-modal {
          border-radius: 20px 20px 0 0;
          max-height: 85vh;
          margin-top: auto;
        }
        
        .emotion-grid {
          grid-template-columns: repeat(2, 1fr);
        }
        
        .modal-title {
          font-size: 18px;
        }
        
        .modal-icon {
          width: 50px;
          height: 50px;
          font-size: 32px;
        }
      }
    `;
    
    const style = document.createElement('style');
    style.id = 'roadblock-system-styles';
    style.textContent = css;
    document.head.appendChild(style);
  }
}

// Create global instance
window.roadblockSystem = new RoadblockSystem();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = RoadblockSystem;
}
