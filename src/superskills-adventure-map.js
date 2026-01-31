// SUPER SKILLS ADVENTURE MAP V6.0 - TOWN BUILDER
const SUPER_SKILL_THEMES = {
  'brain-builder': { id: 'brain-builder', name: 'Brain Builder', emoji: '🧠', color: '#6366F1', character: 'Professor Panda', description: 'Master your mind through understanding how your brain works' },
  'thought-driver': { id: 'thought-driver', name: 'Thought Driver', emoji: '💭', color: '#8B5CF6', character: 'Thinker Turtle', description: 'Take control of your thoughts and steer them positively' },
  'emotion-navigator': { id: 'emotion-navigator', name: 'Emotion Navigator', emoji: '🧭', color: '#EC4899', character: 'Navigator Narwhal', description: 'Navigate through all emotions with confidence' },
  'body-boss': { id: 'body-boss', name: 'Body Boss', emoji: '💪', color: '#10B981', character: 'Benny Bear', description: 'Understand and control your body signals' },
  'connection-captain': { id: 'connection-captain', name: 'Connection Captain', emoji: '🤝', color: '#F59E0B', character: 'Captain Cockatoo', description: 'Build strong relationships and communicate well' },
  'calm-controller': { id: 'calm-controller', name: 'Calm Controller', emoji: '🧘', color: '#06B6D4', character: 'Calm Cat', description: 'Master techniques to find peace and stay centered' },
  'resilience-ranger': { id: 'resilience-ranger', name: 'Resilience Ranger', emoji: '🏔️', color: '#EF4444', character: 'Ranger Rabbit', description: 'Bounce back from challenges and grow stronger' },
  all: { id: 'all', name: 'All Adventures', emoji: '🗺️', color: '#405878', character: 'Daniel', description: 'View all your skill adventures' }
};

const DECORATIONS = { trees: ['🌳', '🌲', '🌴'], flowers: ['🌸', '🌺', '🌻', '🌷'], buildings: ['🏠', '🏡'], nature: ['🦋', '🐦', '☀️'] };

class SuperSkillsAdventureMap {
  constructor(containerId) {
    this.containerId = containerId || 'adventure-map-section';
    this.container = null;
    this.viewport = null;
    this.currentSuperSkill = 'all';
    this.allModules = [];
    this.modules = [];
    this.superSkillsData = [];
    this.profileXP = { total_xp: 0, level: 1 };
    this.config = { nodeSpacingY: 160, pathAmplitude: 120, zigzagFrequency: 0.5, topPadding: 100, bottomPadding: 180, minCanvasHeight: 700 };
    this.isDragging = false;
    this.startY = 0;
    this.scrollTop = 0;
    this.decorationSeed = Math.random() * 1000;
    this.injectStyles();
  }

  injectStyles() {
    if (document.getElementById('ss-map-v6-styles')) return;
    const style = document.createElement('style');
    style.id = 'ss-map-v6-styles';
    style.textContent = `
.ss-header{text-align:center;padding:24px;background:linear-gradient(135deg,rgba(255,255,255,0.98),rgba(248,250,255,0.95));border-radius:24px;margin:0 20px 20px;box-shadow:0 8px 32px rgba(99,102,241,0.12);border:1px solid rgba(99,102,241,0.1);position:relative;overflow:hidden}
.ss-header::before{content:'';position:absolute;top:0;left:0;right:0;height:4px;background:linear-gradient(90deg,var(--skill-color,#6366F1),var(--skill-color-light,#818CF8))}
.ss-title{font-family:"Fredoka",sans-serif;font-size:36px;font-weight:700;margin:0 0 8px;display:flex;align-items:center;justify-content:center;gap:14px;color:var(--skill-color,#405878)}
.ss-title-emoji{font-size:42px;animation:titleBounce 2s ease-in-out infinite}
@keyframes titleBounce{0%,100%{transform:translateY(0) rotate(-5deg)}50%{transform:translateY(-6px) rotate(5deg)}}
.ss-subtitle{font-size:16px;color:#6B7280;margin:0}
.ss-xp-bar{display:flex;align-items:center;justify-content:center;gap:24px;margin:20px auto;padding:16px 32px;background:linear-gradient(135deg,#FEFCE8,#FEF3C7);border-radius:60px;box-shadow:0 4px 20px rgba(251,191,36,0.25);max-width:420px;border:3px solid #FCD34D;position:relative}
.ss-xp-bar::before,.ss-xp-bar::after{content:'✨';position:absolute;top:50%;transform:translateY(-50%);font-size:20px;animation:sparkle 1.5s ease-in-out infinite}
.ss-xp-bar::before{left:-8px}
.ss-xp-bar::after{right:-8px;animation-delay:0.5s}
@keyframes sparkle{0%,100%{opacity:1;transform:translateY(-50%) scale(1)}50%{opacity:0.5;transform:translateY(-50%) scale(0.8)}}
.ss-level-badge{display:flex;align-items:center;gap:10px;font-family:"Fredoka",sans-serif;font-weight:700;font-size:20px;color:#92400E}
.ss-level-icon{font-size:32px;animation:starSpin 3s ease-in-out infinite}
@keyframes starSpin{0%,100%{transform:rotate(0) scale(1)}50%{transform:rotate(10deg) scale(1.1)}}
.ss-xp-track{width:160px;height:18px;background:linear-gradient(180deg,#FEF3C7,#FDE68A);border-radius:10px;overflow:hidden;box-shadow:inset 0 2px 6px rgba(0,0,0,0.15);border:2px solid #F59E0B}
.ss-xp-fill{height:100%;background:linear-gradient(90deg,#F59E0B,#FBBF24,#FCD34D);border-radius:8px;transition:width 0.8s;box-shadow:0 0 12px rgba(251,191,36,0.6)}
.ss-xp-text{font-size:15px;color:#92400E;font-weight:700;font-family:"Fredoka",sans-serif}
.ss-skill-selector{display:flex;flex-wrap:wrap;justify-content:center;gap:12px;padding:0 20px 20px}
.ss-skill-btn{display:flex;align-items:center;gap:10px;padding:12px 20px;border:3px solid #E5E7EB;border-radius:50px;background:linear-gradient(135deg,#FFF,#F9FAFB);font-family:"Fredoka",sans-serif;font-size:15px;font-weight:600;cursor:pointer;transition:all 0.3s;box-shadow:0 4px 12px rgba(0,0,0,0.06);color:#374151}
.ss-skill-btn:hover{transform:translateY(-4px) scale(1.02);box-shadow:0 8px 24px rgba(0,0,0,0.12);border-color:var(--skill-color)}
.ss-skill-btn.active{border-color:var(--skill-color);background:linear-gradient(135deg,var(--skill-color),var(--skill-color-dark));color:#fff;box-shadow:0 8px 24px var(--skill-shadow)}
.ss-skill-btn .btn-emoji{font-size:22px;transition:transform 0.3s}
.ss-skill-btn:hover .btn-emoji{transform:scale(1.2) rotate(10deg)}
.ss-skill-btn .btn-progress{font-size:12px;padding:3px 10px;border-radius:20px;background:rgba(0,0,0,0.08);font-weight:700}
.ss-skill-btn.active .btn-progress{background:rgba(255,255,255,0.25)}
.ss-cycle-bar{display:flex;align-items:center;justify-content:center;gap:28px;padding:16px 28px;background:linear-gradient(135deg,rgba(255,255,255,0.98),rgba(248,250,255,0.95));border-radius:20px;margin:0 20px 20px;box-shadow:0 4px 16px rgba(0,0,0,0.06);flex-wrap:wrap;border:2px solid rgba(99,102,241,0.1)}
.ss-cycle-badge{display:flex;align-items:center;gap:10px;font-family:"Fredoka",sans-serif;font-size:16px;font-weight:600;color:#374151}
.ss-week-dots{display:flex;gap:6px}
.ss-week-dot{width:18px;height:18px;border-radius:50%;background:linear-gradient(135deg,#E5E7EB,#D1D5DB);transition:all 0.4s;box-shadow:inset 0 2px 4px rgba(0,0,0,0.1);position:relative}
.ss-week-dot.completed{background:linear-gradient(135deg,var(--skill-color),var(--skill-color-dark));box-shadow:0 0 12px var(--skill-color)}
.ss-week-dot.completed::after{content:'✓';position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:10px;color:white;font-weight:bold}
.ss-week-dot.current{background:linear-gradient(135deg,#FBBF24,#F59E0B);animation:dotPulse 1.5s ease-in-out infinite}
@keyframes dotPulse{0%,100%{transform:scale(1);box-shadow:0 0 16px rgba(251,191,36,0.6)}50%{transform:scale(1.3);box-shadow:0 0 24px rgba(251,191,36,0.8)}}
.ss-badge-preview{display:flex;align-items:center;gap:10px;font-size:14px;color:#6B7280}
.ss-badge-icon{font-size:28px;filter:grayscale(0.5) opacity(0.7);transition:all 0.3s}
.ss-cycle-bar:hover .ss-badge-icon{filter:none;transform:scale(1.1)}
.ss-map-viewport{position:relative;width:calc(100% - 40px);margin:0 20px;height:550px;overflow:hidden;border-radius:28px;cursor:grab;user-select:none;box-shadow:0 20px 60px rgba(0,0,0,0.15),inset 0 0 0 4px rgba(255,255,255,0.5);border:4px solid #A7F3D0}
.ss-map-viewport:active{cursor:grabbing}
.ss-town-bg{position:absolute;top:0;left:0;width:100%;height:100%;z-index:0}
.ss-sky-layer{position:absolute;top:0;left:0;width:100%;height:40%;background:linear-gradient(180deg,#87CEEB 0%,#B0E2FF 40%,#E0F4FF 70%,#F0F9FF 100%);z-index:1}
.ss-hills-layer{position:absolute;bottom:0;left:0;width:100%;height:100%;background:radial-gradient(ellipse 80% 50% at 20% 100%,#86EFAC 0%,transparent 50%),radial-gradient(ellipse 60% 40% at 80% 95%,#6EE7B7 0%,transparent 45%),linear-gradient(180deg,transparent 30%,#BBF7D0 50%,#86EFAC 70%,#4ADE80 100%);z-index:2}
.ss-grass-layer{position:absolute;bottom:0;left:0;width:100%;height:75%;background:linear-gradient(180deg,transparent 0%,rgba(74,222,128,0.3) 20%,rgba(34,197,94,0.5) 40%,#22C55E 60%,#16A34A 80%,#15803D 100%);z-index:3}
.ss-decorations{position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:5;overflow:hidden}
.ss-decoration{position:absolute;opacity:0.9;filter:drop-shadow(0 3px 4px rgba(0,0,0,0.2));animation:sway 4s ease-in-out infinite}
@keyframes sway{0%,100%{transform:rotate(-2deg)}50%{transform:rotate(2deg)}}
.ss-canvas{position:relative;width:100%;min-height:100%;z-index:10}
.ss-path-svg{position:absolute;top:0;left:0;width:100%;height:100%;z-index:11;pointer-events:none}
.ss-nodes{position:relative;z-index:20}
.ss-node{position:absolute;transform:translate(-50%,-50%);z-index:20;cursor:pointer;transition:all 0.35s}
.ss-node:hover{z-index:30}
.ss-node-building{width:90px;height:90px;border-radius:24px;background:linear-gradient(145deg,#FFF,#F3F4F6);border:5px solid #fff;box-shadow:0 8px 24px rgba(0,0,0,0.2);display:flex;align-items:center;justify-content:center;transition:all 0.35s}
.ss-node:hover .ss-node-building{transform:translateY(-8px) scale(1.08);box-shadow:0 16px 40px rgba(0,0,0,0.25)}
.ss-node.completed .ss-node-building{background:linear-gradient(145deg,#22C55E,#16A34A);border-color:#86EFAC}
.ss-node.completed .ss-node-emoji{filter:brightness(0) invert(1)}
.ss-node.locked .ss-node-building{background:linear-gradient(145deg,#9CA3AF,#6B7280);border-color:#D1D5DB;opacity:0.75;cursor:not-allowed}
.ss-node.locked:hover .ss-node-building{transform:none}
.ss-node.available .ss-node-building{width:100px;height:100px;background:linear-gradient(145deg,#FCD34D,#F59E0B,#D97706);border-color:#FEF3C7;animation:nodeGlow 2s ease-in-out infinite}
@keyframes nodeGlow{0%,100%{box-shadow:0 8px 24px rgba(245,158,11,0.4),0 0 0 0 rgba(251,191,36,0.4)}50%{box-shadow:0 12px 32px rgba(245,158,11,0.5),0 0 0 12px rgba(251,191,36,0)}}
.ss-node.available .ss-node-emoji{animation:emojiWiggle 0.6s ease-in-out infinite}
@keyframes emojiWiggle{0%,100%{transform:rotate(-8deg) scale(1)}50%{transform:rotate(8deg) scale(1.1)}}
.ss-node-emoji{font-size:40px;filter:drop-shadow(0 3px 6px rgba(0,0,0,0.2))}
.ss-node-number{position:absolute;top:-10px;right:-10px;width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,#1F2937,#374151);color:#fff;font-size:14px;font-weight:700;display:flex;align-items:center;justify-content:center;border:3px solid #fff;box-shadow:0 4px 10px rgba(0,0,0,0.25);font-family:"Fredoka",sans-serif}
.ss-node-check{position:absolute;bottom:-8px;right:-8px;width:30px;height:30px;border-radius:50%;background:linear-gradient(135deg,#22C55E,#16A34A);color:#fff;font-size:16px;display:flex;align-items:center;justify-content:center;border:3px solid #fff;box-shadow:0 4px 10px rgba(34,197,94,0.4)}
.ss-node-tooltip{position:absolute;bottom:calc(100% + 20px);left:50%;transform:translateX(-50%) translateY(10px);background:linear-gradient(135deg,#1F2937,#111827);color:#fff;padding:16px 20px;border-radius:16px;white-space:nowrap;opacity:0;pointer-events:none;transition:all 0.3s;z-index:100;box-shadow:0 12px 40px rgba(0,0,0,0.4);border:2px solid rgba(255,255,255,0.1)}
.ss-node-tooltip::after{content:"";position:absolute;top:100%;left:50%;transform:translateX(-50%);border:12px solid transparent;border-top-color:#111827}
.ss-node:hover .ss-node-tooltip{opacity:1;transform:translateX(-50%) translateY(0)}
.ss-tooltip-title{font-weight:700;font-size:16px;margin-bottom:6px;font-family:"Fredoka",sans-serif}
.ss-tooltip-meta{font-size:13px;opacity:0.8;margin-bottom:8px;display:flex;gap:12px}
.ss-tooltip-status{font-size:14px;font-weight:600;padding:4px 12px;border-radius:20px}
.ss-tooltip-status.ready{background:rgba(251,191,36,0.2);color:#FBBF24}
.ss-tooltip-status.done{background:rgba(34,197,94,0.2);color:#4ADE80}
.ss-tooltip-status.locked{background:rgba(156,163,175,0.2);color:#9CA3AF}
.ss-map-progress{position:absolute;top:20px;left:20px;background:linear-gradient(135deg,rgba(255,255,255,0.98),rgba(248,250,255,0.95));padding:14px 24px;border-radius:50px;display:flex;align-items:center;gap:14px;z-index:50;box-shadow:0 6px 20px rgba(0,0,0,0.12);font-family:"Fredoka",sans-serif;border:2px solid rgba(99,102,241,0.15)}
.ss-progress-icon{font-size:28px;animation:trophyShine 2s ease-in-out infinite}
@keyframes trophyShine{0%,100%{filter:drop-shadow(0 0 0 transparent)}50%{filter:drop-shadow(0 0 8px rgba(251,191,36,0.6))}}
.ss-progress-text{font-size:16px;font-weight:700;color:#374151}
.ss-character{position:absolute;z-index:25;width:70px;height:70px;pointer-events:none;filter:drop-shadow(0 6px 12px rgba(0,0,0,0.3))}
.ss-character img{width:100%;height:100%;object-fit:contain;border-radius:50%;background:#fff;padding:5px;border:3px solid #FCD34D;animation:charFloat 2s ease-in-out infinite}
@keyframes charFloat{0%,100%{transform:translateY(0) rotate(-3deg)}50%{transform:translateY(-12px) rotate(3deg)}}
.ss-scroll-hint{position:absolute;bottom:24px;left:50%;transform:translateX(-50%);background:linear-gradient(135deg,rgba(31,41,55,0.95),rgba(17,24,39,0.95));color:#fff;padding:14px 28px;border-radius:50px;font-size:15px;font-weight:600;display:flex;align-items:center;gap:12px;z-index:50;box-shadow:0 8px 24px rgba(0,0,0,0.3);font-family:"Fredoka",sans-serif;transition:opacity 0.5s,transform 0.5s}
.ss-scroll-hint-icon{font-size:20px;animation:pointUp 1s ease-in-out infinite}
@keyframes pointUp{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
.ss-scroll-hint.hidden{opacity:0;transform:translateX(-50%) translateY(20px);pointer-events:none}
.ss-empty-state{display:flex;flex-direction:column;align-items:center;justify-content:center;height:400px;text-align:center;background:linear-gradient(135deg,rgba(255,255,255,0.95),rgba(248,250,255,0.9));border-radius:28px;margin:0 20px;border:2px dashed #D1D5DB}
.ss-empty-emoji{font-size:80px;margin-bottom:24px;animation:emptyBounce 2s ease-in-out infinite}
@keyframes emptyBounce{0%,100%{transform:translateY(0) rotate(-5deg)}50%{transform:translateY(-10px) rotate(5deg)}}
.ss-empty-title{font-family:"Fredoka",sans-serif;font-size:28px;font-weight:700;color:#374151;margin-bottom:12px}
.ss-empty-text{font-size:16px;color:#6B7280;max-width:360px}
@media(max-width:768px){.ss-title{font-size:28px}.ss-skill-btn{padding:10px 14px;font-size:13px}.ss-map-viewport{height:450px}.ss-node-building{width:75px;height:75px}.ss-node.available .ss-node-building{width:85px;height:85px}.ss-node-emoji{font-size:32px}}
`;
    document.head.appendChild(style);
  }

  async init() {
    this.container = document.querySelector('.adventure-map-section, #adventure-map-section');
    if (!this.container) { console.warn('SuperSkills map container not found'); return; }
    await this.loadSuperSkillsData();
    await this.loadData();
    this.render();
  }

  async loadSuperSkillsData() {
    try {
      if (window.supabase) {
        const { data } = await window.supabase.from('super_skills').select('*').eq('is_active', true).order('sort_order');
        if (data) { this.superSkillsData = data; data.forEach(s => { if (SUPER_SKILL_THEMES[s.slug]) { SUPER_SKILL_THEMES[s.slug].dbId = s.id; SUPER_SKILL_THEMES[s.slug].name = s.name; SUPER_SKILL_THEMES[s.slug].emoji = s.emoji || SUPER_SKILL_THEMES[s.slug].emoji; SUPER_SKILL_THEMES[s.slug].color = s.theme_color || SUPER_SKILL_THEMES[s.slug].color; }}); }
      }
    } catch (e) { console.log('Could not load super skills:', e.message); }
  }

  async loadData() {
    const modules = window.modules || [], childModules = window.childModules || [];
    this.allModules = modules.filter(m => m.is_active !== false).map((m, i) => {
      const cm = childModules.find(c => c.module_id === m.id);
      const completed = !!(cm && cm.is_completed);
      let slug = 'all';
      if (m.super_skill_id) { const s = this.superSkillsData.find(x => x.id === m.super_skill_id); if (s) slug = s.slug; }
      else if (m.category) { const cat = m.category.toLowerCase(); if (cat.includes('anger') || cat.includes('emotion')) slug = 'emotion-navigator'; else if (cat.includes('anxiety') || cat.includes('worry')) slug = 'calm-controller'; else if (cat.includes('depression') || cat.includes('sad')) slug = 'resilience-ranger'; else if (cat.includes('body')) slug = 'body-boss'; else if (cat.includes('cognitive') || cat.includes('thought')) slug = 'thought-driver'; else if (cat.includes('social') || cat.includes('friend')) slug = 'connection-captain'; }
      return { id: m.id, name: m.title || 'Module ' + (i + 1), superSkillSlug: slug, weekNumber: m.week_number || m.pathway_order || i + 1, xpReward: m.xp_reward || 100, starsReward: m.stars_reward || 10, status: completed ? 'completed' : 'available', completed, module: m };
    });
    try { const child = window.selectedChild; if (child && window.supabase) { const { data } = await window.supabase.from('children').select('total_xp, level').eq('id', child.id).single(); if (data) this.profileXP = { total_xp: data.total_xp || 0, level: data.level || 1 }; }} catch (e) {}
  }

  filterModules() {
    this.modules = this.currentSuperSkill === 'all' ? this.allModules.slice() : this.allModules.filter(m => m.superSkillSlug === this.currentSuperSkill);
    this.modules.sort((a, b) => (a.weekNumber || 0) - (b.weekNumber || 0));
    if (this.currentSuperSkill !== 'all') { let found = false; this.modules.forEach(m => { if (m.completed) m.status = 'completed'; else if (!found) { m.status = 'available'; found = true; } else m.status = 'locked'; }); }
  }

  getSkills() { const skills = new Set(['all']); this.allModules.forEach(m => { if (m.superSkillSlug && m.superSkillSlug !== 'all') skills.add(m.superSkillSlug); }); return Array.from(skills); }
  seededRandom(seed) { return Math.abs((Math.sin(seed) * 10000) % 1); }
  darken(hex, pct) { const n = parseInt(hex.replace('#', ''), 16), a = Math.round(2.55 * pct); return '#' + (0x1000000 + Math.max(0, (n >> 16) - a) * 0x10000 + Math.max(0, ((n >> 8) & 0xFF) - a) * 0x100 + Math.max(0, (n & 0xFF) - a)).toString(16).slice(1); }
  lighten(hex, pct) { const n = parseInt(hex.replace('#', ''), 16), a = Math.round(2.55 * pct); return '#' + (0x1000000 + Math.min(255, (n >> 16) + a) * 0x10000 + Math.min(255, ((n >> 8) & 0xFF) + a) * 0x100 + Math.min(255, (n & 0xFF) + a)).toString(16).slice(1); }

  genDecorations() {
    const decs = [], seed = this.decorationSeed;
    for (let i = 0; i < 10; i++) { const side = i % 2 === 0, x = side ? 5 + this.seededRandom(seed + i * 7) * 15 : 80 + this.seededRandom(seed + i * 11) * 15; decs.push({ emoji: DECORATIONS.trees[Math.floor(this.seededRandom(seed + i * 3) * DECORATIONS.trees.length)], x, y: 10 + (i / 10) * 80, size: 32 + this.seededRandom(seed + i) * 12 }); }
    for (let i = 0; i < 15; i++) { decs.push({ emoji: DECORATIONS.flowers[Math.floor(this.seededRandom(seed + i * 5) * DECORATIONS.flowers.length)], x: 5 + this.seededRandom(seed + i * 13) * 90, y: 15 + this.seededRandom(seed + i * 17) * 75, size: 16 + this.seededRandom(seed + i * 2) * 8 }); }
    for (let i = 0; i < 4; i++) { const side = i % 2 === 0; decs.push({ emoji: DECORATIONS.buildings[Math.floor(this.seededRandom(seed + i * 7) * DECORATIONS.buildings.length)], x: side ? 3 + this.seededRandom(seed + i * 19) * 10 : 85 + this.seededRandom(seed + i * 23) * 10, y: 20 + (i / 4) * 60, size: 38 }); }
    return decs;
  }

  render() {
    this.filterModules();
    const theme = SUPER_SKILL_THEMES[this.currentSuperSkill] || SUPER_SKILL_THEMES.all;
    const skills = this.getSkills(), done = this.modules.filter(m => m.completed).length, total = this.modules.length;
    const k = 100, lvl = this.profileXP.level || 1, xp = this.profileXP.total_xp || 0;
    const xp0 = (k * lvl * (lvl + 1)) / 2, xp1 = (k * (lvl + 1) * (lvl + 2)) / 2, xpPct = xp1 > xp0 ? ((xp - xp0) / (xp1 - xp0)) * 100 : 0;

    let html = '<div class="ss-header" style="--skill-color:' + theme.color + ';--skill-color-light:' + this.lighten(theme.color, 20) + '"><h2 class="ss-title" style="color:' + theme.color + '"><span class="ss-title-emoji">' + theme.emoji + '</span>' + theme.name + '</h2><p class="ss-subtitle">' + theme.description + '</p></div>';
    html += '<div class="ss-xp-bar"><div class="ss-level-badge"><span class="ss-level-icon">⭐</span><span>Level ' + lvl + '</span></div><div class="ss-xp-progress"><div class="ss-xp-track"><div class="ss-xp-fill" style="width:' + Math.min(100, Math.max(0, xpPct)) + '%"></div></div><span class="ss-xp-text">' + xp + ' XP</span></div></div>';
    html += '<div class="ss-skill-selector">';
    skills.forEach(slug => { const t = SUPER_SKILL_THEMES[slug] || SUPER_SKILL_THEMES.all; const mods = slug === 'all' ? this.allModules : this.allModules.filter(m => m.superSkillSlug === slug); const d = mods.filter(m => m.completed).length, active = this.currentSuperSkill === slug; html += '<button class="ss-skill-btn ' + (active ? 'active' : '') + '" style="--skill-color:' + t.color + ';--skill-color-dark:' + this.darken(t.color, 15) + ';--skill-shadow:' + t.color + '50" onclick="window.superSkillsMap.selectSkill(\'' + slug + '\')"><span class="btn-emoji">' + t.emoji + '</span><span>' + t.name + '</span><span class="btn-progress">' + d + '/' + mods.length + '</span></button>'; });
    html += '</div>';
    if (this.currentSuperSkill !== 'all' && total > 0) { const weeks = Math.min(total, 12); html += '<div class="ss-cycle-bar" style="--skill-color:' + theme.color + ';--skill-color-dark:' + this.darken(theme.color, 20) + '"><div class="ss-cycle-badge"><span>📅</span><span>Cycle 1: Foundation</span></div><div class="ss-week-progress"><div class="ss-week-dots">'; for (let i = 0; i < weeks; i++) html += '<div class="ss-week-dot ' + (i < done ? 'completed' : '') + (i === done ? ' current' : '') + '"></div>'; html += '</div><span style="font-size:14px;color:#6B7280;font-weight:600">' + done + '/' + weeks + ' weeks</span></div><div class="ss-badge-preview"><span class="ss-badge-icon">🏅</span><span>' + theme.name + ' Badge</span></div></div>'; }
    if (this.modules.length > 0) { const ch = Math.max(this.config.minCanvasHeight, this.config.topPadding + this.modules.length * this.config.nodeSpacingY + this.config.bottomPadding); const decs = this.genDecorations(); html += '<div class="ss-map-viewport" id="ssViewport"><div class="ss-town-bg"><div class="ss-sky-layer"></div><div class="ss-hills-layer"></div><div class="ss-grass-layer"></div></div><div class="ss-decorations">'; decs.forEach((d, i) => { html += '<div class="ss-decoration" style="left:' + d.x + '%;top:' + d.y + '%;font-size:' + d.size + 'px;animation-delay:' + (i * 0.1) + 's">' + d.emoji + '</div>'; }); html += '</div><div class="ss-canvas" id="ssCanvas" style="height:' + ch + 'px"><svg class="ss-path-svg" id="ssPath"></svg><div class="ss-nodes" id="ssNodes"></div></div><div class="ss-map-progress"><span class="ss-progress-icon">🏆</span><span class="ss-progress-text">' + done + '/' + total + ' completed</span></div><div class="ss-scroll-hint" id="ssHint"><span class="ss-scroll-hint-icon">👆</span><span>Drag to explore</span></div></div>'; }
    else { html += '<div class="ss-empty-state"><div class="ss-empty-emoji">🏘️</div><div class="ss-empty-title">No Adventures Yet</div><div class="ss-empty-text">No active modules in this area. Try a different path!</div></div>'; }
    this.container.innerHTML = html;
    if (this.modules.length > 0) { this.viewport = document.getElementById('ssViewport'); this.renderPath(); this.renderNodes(); this.setupEvents(); this.centerOnCurrent(false); }
  }

  selectSkill(slug) { this.currentSuperSkill = slug; this.render(); }
  calcPositions() { const pos = [], w = this.viewport ? this.viewport.offsetWidth : 400, cx = w / 2; this.modules.forEach((m, i) => { const y = this.config.topPadding + i * this.config.nodeSpacingY; pos.push({ x: cx + Math.sin(i * this.config.zigzagFrequency + 0.5) * this.config.pathAmplitude + Math.sin(i * 1.8) * 25, y, i }); }); return pos; }

  renderPath() {
    const svg = document.getElementById('ssPath'); if (!svg) return;
    const pos = this.calcPositions(); if (pos.length < 1) { svg.innerHTML = ''; return; }
    const done = this.modules.filter(m => m.completed).length, total = this.modules.length;
    let d = 'M ' + pos[0].x + ' ' + pos[0].y;
    for (let i = 1; i < pos.length; i++) { const p = pos[i - 1], c = pos[i], cy = (p.y + c.y) / 2; d += ' C ' + p.x + ' ' + cy + ', ' + c.x + ' ' + cy + ', ' + c.x + ' ' + c.y; }
    const paved = total > 0 ? done / total : 0;
    svg.innerHTML = '<defs><filter id="roadTex"><feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="2"/><feDisplacementMap in="SourceGraphic" scale="2"/></filter><linearGradient id="dirtGrad" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#D4A574"/><stop offset="100%" stop-color="#92734d"/></linearGradient><linearGradient id="paveGrad" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#64748B"/><stop offset="100%" stop-color="#475569"/></linearGradient></defs><path d="' + d + '" fill="none" stroke="rgba(0,0,0,0.15)" stroke-width="58" stroke-linecap="round" transform="translate(3,5)"/><path d="' + d + '" fill="none" stroke="url(#dirtGrad)" stroke-width="52" stroke-linecap="round" filter="url(#roadTex)"/><path d="' + d + '" fill="none" stroke="rgba(139,90,43,0.3)" stroke-width="48" stroke-linecap="round" stroke-dasharray="2 6"/><path d="' + d + '" fill="none" stroke="url(#paveGrad)" stroke-width="46" stroke-linecap="round" stroke-dasharray="' + (paved * 2000) + ' 10000"/><path d="' + d + '" fill="none" stroke="rgba(255,255,255,0.4)" stroke-width="4" stroke-linecap="round" stroke-dasharray="20 30" style="stroke-dasharray:' + (paved * 800) + ' 10000"/>';
  }

  renderNodes() {
    const container = document.getElementById('ssNodes'); if (!container) return;
    const pos = this.calcPositions();
    let html = '';
    pos.forEach((p, i) => { const m = this.modules[i]; const emoji = m.completed ? '🏠' : m.status === 'available' ? '⭐' : '🔒'; html += '<div class="ss-node ' + m.status + '" style="left:' + p.x + 'px;top:' + p.y + 'px" onclick="window.superSkillsMap.openModule(\'' + m.id + '\')"><div class="ss-node-building"><span class="ss-node-emoji">' + emoji + '</span></div><span class="ss-node-number">' + (m.weekNumber || i + 1) + '</span>' + (m.completed ? '<span class="ss-node-check">✓</span>' : '') + '<div class="ss-node-tooltip"><div class="ss-tooltip-title">' + m.name + '</div><div class="ss-tooltip-meta"><span>Week ' + (m.weekNumber || i + 1) + '</span><span>💎 ' + m.xpReward + ' XP</span><span>⭐ ' + m.starsReward + '</span></div><div class="ss-tooltip-status ' + (m.completed ? 'done' : m.status === 'available' ? 'ready' : 'locked') + '">' + (m.completed ? '✓ Completed!' : m.status === 'available' ? '▶ Ready!' : '🔒 Locked') + '</div></div></div>'; });
    const ci = this.modules.findIndex(m => m.status === 'available');
    if (ci >= 0 && pos[ci]) { const p = pos[ci]; html += '<div class="ss-character" style="left:' + (p.x - 35) + 'px;top:' + (p.y - 90) + 'px"><img src="./assets/daniel-happy.png" onerror="this.style.display=\'none\'"></div>'; }
    container.innerHTML = html;
  }

  setupEvents() {
    if (!this.viewport) return;
    const vp = this.viewport;
    vp.addEventListener('mousedown', e => { this.isDragging = true; this.startY = e.clientY; this.scrollTop = vp.scrollTop; vp.style.cursor = 'grabbing'; });
    document.addEventListener('mousemove', e => { if (this.isDragging) { e.preventDefault(); vp.scrollTop = this.scrollTop - (e.clientY - this.startY); }});
    document.addEventListener('mouseup', () => { this.isDragging = false; if (vp) vp.style.cursor = 'grab'; });
    vp.addEventListener('touchstart', e => { this.isDragging = true; this.startY = e.touches[0].clientY; this.scrollTop = vp.scrollTop; }, { passive: true });
    vp.addEventListener('touchmove', e => { if (this.isDragging) vp.scrollTop = this.scrollTop - (e.touches[0].clientY - this.startY); }, { passive: true });
    vp.addEventListener('touchend', () => { this.isDragging = false; });
    const hint = document.getElementById('ssHint');
    if (hint) { const hide = () => hint.classList.add('hidden'); vp.addEventListener('mousedown', hide, { once: true }); vp.addEventListener('touchstart', hide, { once: true }); }
  }

  centerOnCurrent(smooth = true) {
    if (!this.viewport) return;
    let ti = this.modules.findIndex(m => m.status === 'available');
    if (ti < 0) ti = this.modules.length - 1;
    if (ti < 0) return;
    const pos = this.calcPositions(), p = pos[ti];
    if (!p) return;
    const target = p.y - this.viewport.offsetHeight / 2;
    if (smooth) this.viewport.scrollTo({ top: Math.max(0, target), behavior: 'smooth' });
    else this.viewport.scrollTop = Math.max(0, target);
  }

  openModule(id) {
    const m = this.modules.find(x => x.id === id);
    if (!m || m.status === 'locked') return;
    if (typeof window.openModulePlayer === 'function') window.openModulePlayer(m.module);
    else if (window.adventureMapV4 && typeof window.adventureMapV4.openModule === 'function') window.adventureMapV4.openModule(m.module);
    else window.dispatchEvent(new CustomEvent('openModule', { detail: m.module }));
  }
}

let superSkillsMap = null;
function initSuperSkillsMap() {
  if (superSkillsMap) { superSkillsMap.init(); return; }
  console.log('🏘️ Initializing SuperSkills Adventure Map V6');
  superSkillsMap = new SuperSkillsAdventureMap();
  superSkillsMap.init();
  window.superSkillsMap = superSkillsMap;
}
document.addEventListener('DOMContentLoaded', () => { let c = 0; const check = () => { c++; if ((window.modules && window.modules.length) || window.selectedChild) setTimeout(initSuperSkillsMap, 100); else if (c < 30) setTimeout(check, 200); }; setTimeout(check, 150); });
window.refreshSuperSkillsMap = () => { if (superSkillsMap) superSkillsMap.init(); else initSuperSkillsMap(); };
window.initSuperSkillsMap = initSuperSkillsMap;