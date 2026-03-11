/**
 * Reference Data Grids
 * ====================
 * Loads all data directly from Supabase (adminPage.js keeps most data
 * module-scoped, so we can't read it). Renders grid tables into ref-panels.
 * Inline editable "add row" for all sections.
 */

// Export switchRefTab globally for onclick handlers
export function switchRefTab(ev, id) {
    document.querySelectorAll('.ref-panel').forEach(function(p) { p.style.display = 'none'; });
    document.querySelectorAll('#refDataTabs .ref-tab').forEach(function(b) { b.style.background = '#f8f9fa'; b.style.color = '#405878'; });
    var panel = document.getElementById(id + 'Panel');
    if (panel) panel.style.display = 'block';
    if (ev && ev.target) { ev.target.style.background = '#405878'; ev.target.style.color = 'white'; }
    _render(id);
}

// Make switchRefTab globally available for onclick handlers
if (typeof window !== 'undefined') {
    window.switchRefTab = switchRefTab;
}

// --- Wait for window.supabase (set by adminPage.js module) ---
function _waitSB() {
    return new Promise(function(resolve) {
        if (window.supabase) return resolve(window.supabase);
        var c = setInterval(function() {
            if (window.supabase) { clearInterval(c); resolve(window.supabase); }
        }, 100);
        setTimeout(function() { clearInterval(c); resolve(null); }, 15000);
    });
}

// --- Data caches ---
var _ss = [], _sub = [], _th = [], _age = [], _ndis = [], _sedi = [], _fasd = [], _chars = [], _cycles = [], _connections = [], _forbidden = [], _auditSections = [], _auditRules = [];
var _settings = null;
const DEFAULT_AI_PROMPT_TEMPLATE = `You are an expert child psychologist creating Daniel's Diaries modules — trauma-informed, neurodiversity-affirming social-emotional learning content for children ages 6-18.

=== DANIEL'S DIARIES FRAMEWORK ===
Daniel is a friendly narrator who guides children through Brain Town — a metaphor where the child's brain is a town they are building. The CHILD is always the "town planner" with full agency over their Brain Town.

=== MANDATORY CONTENT REQUIREMENTS ===
1. THEORY & CITATION: Every module MUST mention the primary theory name AND the researcher's surname (e.g., "Operant Learning Foundations" AND "Skinner").
2. BRAIN TOWN VOCABULARY - MUST USE: town, road, roads, street, streets, main street, motorway, highway, traffic, traffic light, traffic signal, building, buildings, town planner, brain town
3. CHILD AS TOWN PLANNER: Always frame the child as the "town planner" of their Brain Town. Use phrases like "As the town planner of your Brain Town..." or "You're the town planner here..."
4. DANIEL NARRATES: Daniel must appear as narrator (use "Daniel" by name at least once).
5. LEARNING OUTCOME: Include at least one statement starting with "Child can..." to describe what the child will learn.

=== ABSOLUTELY FORBIDDEN - NEVER USE ===
FORBIDDEN WORDS (deficit language): broken, damaged, wrong, faulty, disordered, deficit, dysfunction, abnormal, sick, diseased, problem brain, bad roads, wrong roads, messed up, not working properly, hard wired, set in stone, permanent
FORBIDDEN METAPHORS (use Brain Town equivalents instead): computer, hard drive, processor, muscle, empty vessel, blank slate, machine, engine, wires, circuits, channels, weather, waves, colours for emotions, seeds, driver, passenger, captain, pilot, volume dial, thermostat, meter, garden
DIRECTIVE LANGUAGE (use invitation framing instead): you need to, you must, you have to, you should, do this now, tell your parent, share your feelings, tell us about, you will
EVALUATION LANGUAGE (Daniel never scores or judges): good job, well done, great work, you got it right, correct answer, wrong answer, try harder, you scored, points, you only, you failed, score
TIME PRESSURE (child works at own pace): hurry, quick, before time, minutes to complete, time is up, countdown, race against, faster

=== INVITATION FRAMING (USE INSTEAD OF DIRECTIVES) ===
✅ "You might like to..." ✅ "You could try..." ✅ "Some children find it helpful to..." ✅ "One option is..." ✅ "If you'd like, you can..."
❌ "You need to..." ❌ "You must..." ❌ "You have to..." ❌ "You should..."

=== LEVEL-APPROPRIATE VERBS ===
SEED LEVEL (Weeks 1-3): ONLY use: identify, name, label, point to, recognise, notice, watch
STREET LEVEL (Weeks 4-6): ONLY use: demonstrate, practise, sort, categorise, compare, try, choose
MOTORWAY LEVEL (Weeks 7-9): ONLY use: apply, use independently, self correct, adapt, transfer, extend
CITY PLANNER LEVEL (Weeks 10-12): ONLY use: design, teach, create, adapt, mentor, redesign, lead, integrate

=== CRITICAL RULES ===
1. Always respond with ONLY valid JSON. No explanations, no markdown, just the JSON object.
2. If a specific character/mascot is mentioned, you MUST use EXACTLY that character name and type throughout. Never substitute a different animal or character.
3. The mascot emoji must match the character type exactly.
4. When creating multiple items, sequence them as a learning journey: start with simple awareness, then practise skills, then apply in real-life scenarios.
5. Treat the age range and language guidelines as hard requirements.
6. Use Australian English spelling throughout (colour, behaviour, favourite, organise, centre, mum, learnt). NEVER use: behavior, color, organization, recognize, organize, center, analyze, generalize.
7. NEVER use em dashes, "dive in", "unlock", "unleash", "delve", or other AI-sounding phrases.
8. Write as a warm, experienced educator, not a marketing copywriter.
9. NEVER use hyphens or en dashes to join compound words. Use spaces instead (e.g., "thought feeling" not "thought-feeling").
10. EMOJI SAFETY: Only use well-supported, common emojis from Unicode 12.0 or earlier.
   SAFE emojis: 😊 😢 😡 😨 😌 🤩 😳 😤 🤔 😴 🥰 😎 🤗 😮 🙂 😞 😰 ⭐ 💛 ❤ 🌟 🎯 🎨 📝 💡 🏠 🌈 🐕 🐱 🦁 🐻 🌸 🌻 🎵 🎶 💪 🧠 ❓ ✅ ✓ ❌ 🐢 🐠 🐟 🐙 🐚 🌊 🐬 🐳 🐋 🦈 🐡 🦀 🌿 🍃 💎 ⚡ 🔥 💧 🌙 ☀ 🌤 ⛅ 🌧 ⛈ 🌪 🌞 🎈 🎉 🏆 🎪 🎭 🎬 🎹 🥁 🎸 🎺 🎻 📖 📚 ✏ 🖍 🖌 👀 👂 🤝 👍 👏 🙌 💭 💬 🔍 🧩
   BANNED emojis: 🫧 🪸 🪷 🪻 🫁 🧒 🪼 🫠 🫣 🫤 🩵 🩶 🩷 🪺 🪹 🪨 🫂 — and ANY emoji you are unsure about.
11. GENUINE CHOICE: Always offer the child choices. Use "you could", "you might", "choose", "option" language.
12. STRENGTHS-BASED: Frame neurodiversity as difference, not deficit. Never use pathologising language.`;


function estimatePromptTokens(text) {
    return Math.ceil(((text || '').length) / 4);
}

function validateAiPromptTemplate(template) {
    var value = (template || '').trim();
    var errors = [];
    var warnings = [];

    if (!value) {
        errors.push('Prompt template cannot be empty.');
    }

    if (value.length > 24000) {
        errors.push('Prompt is too large (' + value.length + ' chars). Keep under 24,000 chars.');
    } else if (value.length > 16000) {
        warnings.push('Prompt is very large (' + value.length + ' chars) and may increase cost and latency.');
    }

    var estimatedTokens = estimatePromptTokens(value);
    if (estimatedTokens > 5000) {
        warnings.push('Estimated prompt tokens are high (~' + estimatedTokens + '). Consider reducing bloat.');
    }

    var duplicateHeadingMatches = value.match(/^===\s+(.+?)\s+===$/gm) || [];
    var headingNames = duplicateHeadingMatches.map(function(h) { return h.replace(/^===\s+|\s+===$/g, ''); });
    var duplicateNames = headingNames.filter(function(name, idx) { return headingNames.indexOf(name) !== idx; });
    if (duplicateNames.length) {
        var uniqueDupes = Array.from(new Set(duplicateNames));
        warnings.push('Duplicate section headings detected: ' + uniqueDupes.join(', '));
    }

    if ((new RegExp("\\byou must\\b", "i")).test(value)) warnings.push('Contains "you must" which may conflict with invitation framing.');
    if ((new RegExp("\\byou have to\\b", "i")).test(value)) warnings.push('Contains "you have to" which may conflict with invitation framing.');
    if ((new RegExp("\\btime is up\\b", "i")).test(value)) warnings.push('Contains "time is up" which may conflict with child-paced guidance.');

    return {
        valid: errors.length === 0,
        errors: errors,
        warnings: warnings,
        estimatedTokens: estimatedTokens,
        characterCount: value.length
    };
}

var _dataLoaded = false;

async function _loadAll() {
    var sb = window.supabase;
    if (!sb) return;
    try {
        var [r1, r2, r3, r4, r5, r6, r7, r8, r9, r10, r11, r12, r13, r14] = await Promise.all([
            sb.from('super_skills').select('*, characters:character_id(id, name, species, personality_nd, image_url)').order('sort_order'),
            sb.from('sub_skills').select('*, super_skills:super_skill_id(id, name, slug, emoji)').order('sort_order'),
            sb.from('core_theories').select('*').eq('is_active', true).order('theory_name'),
            sb.from('age_ranges').select('*').eq('is_active', true).order('age_range'),
            sb.from('ndis_domains').select('*').eq('is_active', true).order('sort_order'),
            sb.from('dss_sedi_categories').select('*').eq('is_active', true).order('sort_order'),
            sb.from('fasd_domains').select('*').eq('is_active', true).order('domain_number'),
            sb.from('characters').select('*').eq('is_active', true).order('sort_order'),
            sb.from('cycles').select('*').order('cycle_number'),
            sb.from('theory_connections').select('*, super_skills:super_skill_id(id, name), cycles:cycle_id(id, cycle_number, name), core_theories:primary_theory_id(id, theory_name)').order('sort_order'),
            sb.from('forbidden_terms').select('*').eq('is_active', true).order('term_type,term'),
            sb.from('audit_sections').select('*').eq('is_active', true).order('section_number'),
            sb.from('audit_rules').select('*, audit_sections:section_id(id, section_number, section_name)').eq('is_active', true).order('sort_order'),
            sb.from('settings').select('id, ai_prompt_template').maybeSingle()
        ]);
        _ss = r1.data || []; _sub = r2.data || []; _th = r3.data || [];
        _age = r4.data || []; _ndis = r5.data || []; _sedi = r6.data || [];
        _fasd = r7.data || []; _chars = r8.data || [];
        _cycles = r9.data || [];
        _connections = r10.data || [];
        _forbidden = r11.data || [];
        _auditSections = r12.data || [];
        _auditRules = r13.data || [];
        _settings = r14.data || null;
        _dataLoaded = true;
        
        // Expose data caches globally for module-audit.js
        window._ss = _ss;
        window._sub = _sub;
        window._th = _th;
        window._age = _age;
        window._ndis = _ndis;
        window._sedi = _sedi;
        window._fasd = _fasd;
        window._chars = _chars;
        window._cycles = _cycles;
        window._connections = _connections;
        window._forbidden = _forbidden;
        window._auditSections = _auditSections;
        window._auditRules = _auditRules;
        window._levels = []; // Will be loaded separately if needed
        
        console.log('[RefGrids] Loaded:', _ss.length, 'skills,', _sub.length, 'sub-skills,', _th.length, 'theories,', _connections.length, 'connections,', _age.length, 'age bands,', _forbidden.length, 'forbidden terms,', _auditSections.length, 'audit sections');
    } catch (e) { console.error('[RefGrids] Load error:', e); }
}

// --- Helpers ---
function E(s) { return s ? String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;') : ''; }
function bg(i) { return i % 2 === 0 ? '#fff' : '#f8f9fa'; }
function td(i, x) { return 'padding:8px 10px;border-bottom:1px solid #e5e7eb;background:' + bg(i) + ';vertical-align:top;' + (x || ''); }
function TH(t, x) { return '<th style="padding:8px 10px;text-align:left;' + (x || '') + '">' + t + '</th>'; }
function editBtn(fn) { return '<button onclick="' + fn + '" style="background:none;border:none;cursor:pointer;font-size:14px;" title="Edit">✏️</button>'; }

// --- Inline Row Edit System ---
// When edit is clicked, the row converts to input fields. Save writes to DB.
window.refEditRow = function(table, id, btn) {
    var row = btn.closest('tr');
    if (!row) return;
    var cells = row.querySelectorAll('td');
    var lastCell = cells[cells.length - 1]; // edit button cell

    // Get config for this table
    var cfg = _editConfigs[table];
    if (!cfg) return;

    // Find the data item
    var item = cfg.getData().find(function(d) { return d.id === id; });
    if (!item) return;

    // Store original HTML for cancel
    row.dataset.origHtml = row.innerHTML;
    row.style.background = '#f0f4ff';

    // Convert each data cell to an input
    cfg.fields.forEach(function(f, idx) {
        if (idx >= cells.length - 1) return; // skip the edit button cell
        var cell = cells[idx];
        var val = f.get(item) || '';
        if (f.type === 'select' && f.options) {
            var opts = typeof f.options === 'function' ? f.options(item, row) : [];
            var onchangeAttr = f.onchange ? ' onchange="' + f.onchange + '(this,\'' + table + '\',\'' + id + '\')"' : '';
            var html = '<select data-field="' + f.key + '"' + onchangeAttr + ' style="width:100%;padding:4px 6px;border:1px solid #c7d2fe;border-radius:4px;font-size:12px;"><option value="">Select...</option>';
            var currentVal = f.selectValue ? f.selectValue(item) : val;
            opts.forEach(function(o) { html += '<option value="' + o.v + '"' + (o.v === currentVal ? ' selected' : '') + '>' + E(o.t) + '</option>'; });
            html += '</select>';
            cell.innerHTML = html;
        } else if (f.readonly) {
            cell.innerHTML = '<input type="text" value="' + E(val) + '" data-field="' + f.key + '" readonly style="width:100%;padding:4px 6px;border:1px solid #e5e7eb;border-radius:4px;font-size:12px;background:#f3f4f6;color:#6b7c8f;cursor:not-allowed;">';
        } else {
            cell.innerHTML = '<input type="text" value="' + E(val) + '" data-field="' + f.key + '" style="width:100%;padding:4px 6px;border:1px solid #c7d2fe;border-radius:4px;font-size:12px;">';
        }
    });

    // Replace edit button with save/cancel
    lastCell.innerHTML = '<button onclick="refSaveRow(\'' + table + '\',\'' + id + '\',this)" style="background:#10b981;color:white;border:none;border-radius:4px;padding:4px 8px;font-size:11px;cursor:pointer;font-weight:600;margin-right:2px;">Save</button><button onclick="refCancelRow(this)" style="background:#6b7c8f;color:white;border:none;border-radius:4px;padding:4px 8px;font-size:11px;cursor:pointer;">✕</button>';

    if (table === 'Conn') {
        _setConnCycleOptionsForEditRow(row, item.super_skill_id || '', item.cycle_id || '');
    }
};

window.refCancelRow = function(btn) {
    var row = btn.closest('tr');
    if (row && row.dataset.origHtml) {
        row.innerHTML = row.dataset.origHtml;
        row.style.background = '';
        delete row.dataset.origHtml;
    }
};

window.refSaveRow = async function(table, id, btn) {
    var row = btn.closest('tr');
    if (!row) return;
    var cfg = _editConfigs[table];
    if (!cfg) return;

    // Collect values from inputs AND selects with data-field
    var updates = {};
    row.querySelectorAll('[data-field]').forEach(function(el) {
        updates[el.dataset.field] = el.value.trim();
    });

    try {
        if (cfg.customSave) {
            // Custom save handles multiple tables
            await cfg.customSave(id, updates);
        } else {
            // Default: filter out _ fields and save to single table
            var dbUpdates = {};
            Object.keys(updates).forEach(function(k) {
                if (k.charAt(0) !== '_') dbUpdates[k] = updates[k];
            });
            var res = await window.supabase.from(cfg.dbTable).update(dbUpdates).eq('id', id);
            if (res.error) throw res.error;
        }
        // Reload and re-render
        await _loadAll();
        cfg.render();
    } catch (e) {
        console.error('Save error:', e);
        alert('Error saving: ' + (e.message || JSON.stringify(e)));
    }
};

var _editConfigs = {
    SS: {
        dbTable: 'super_skills',
        getData: function() { return _ss; },
        render: rSS,
        fields: [
            { key: 'code', get: function(d) { return d.code || (d.slug ? d.slug.substring(0,2).toUpperCase() : ''); } },
            { key: 'name', get: function(d) { return d.name; } },
            { key: 'domain', get: function(d) { return d.domain || d.description || ''; } },
            { key: '_char_id', type: 'select', get: function(d) { var ch = d.characters || {}; return ch.name || d.character_name || ''; }, selectValue: function(d) { return d.character_id || (d.characters ? d.characters.id : ''); }, options: function() { return _chars.map(function(c) { return { v: c.id, t: c.name + ' (' + (c.species || '') + ')' }; }); }, onchange: '_onCharEditSelect' },
            { key: '_char_personality', readonly: true, get: function(d) { var ch = d.characters || {}; return ch.personality_nd || d.personality || ''; } }
        ],
        // Custom save: updates super_skills AND characters table
        customSave: async function(id, updates) {
            var ssUpdates = {};
            if (updates.code !== undefined) ssUpdates.code = updates.code;
            if (updates.name !== undefined) ssUpdates.name = updates.name;
            if (updates.domain !== undefined) { ssUpdates.domain = updates.domain; ssUpdates.description = updates.domain; }
            if (updates._char_id !== undefined) ssUpdates.character_id = updates._char_id || null;
            if (Object.keys(ssUpdates).length) {
                var r = await window.supabase.from('super_skills').update(ssUpdates).eq('id', id);
                if (r.error) throw r.error;
            }
        }
    },
    Sub: {
        dbTable: 'sub_skills',
        getData: function() { return _sub; },
        render: rSub,
        fields: [
            { key: 'name', get: function(d) { return d.name; } },
            { key: '_parent', get: function(d) { return d.super_skills ? d.super_skills.name : ''; } },
            { key: 'description', get: function(d) { return d.description || ''; } }
        ]
    },
    Th: {
        dbTable: 'core_theories',
        getData: function() { return _th; },
        render: rTh,
        fields: [
            { key: 'theory_name', get: function(d) { return d.theory_name; } },
            { key: 'primary_researchers', get: function(d) { return d.primary_researchers || d.key_theorists || ''; } },
            { key: 'description', get: function(d) { return d.description || ''; } },
            { key: '_active', get: function(d) { return d.is_active ? 'Active' : 'Inactive'; } }
        ]
    },
    Conn: {
        dbTable: 'theory_connections',
        getData: function() { return _connections; },
        render: rConn,
        fields: [
            { key: 'super_skill_id', type: 'select', get: function(d) { return d.super_skills ? d.super_skills.name : ''; }, selectValue: function(d) { return d.super_skill_id || ''; }, options: function() { return _ss.map(function(s) { return { v: s.id, t: s.name }; }); }, onchange: '_onConnSuperSkillEditSelect' },
            { key: 'cycle_id', type: 'select', get: function(d) { return d.cycles ? ('C' + d.cycles.cycle_number + ': ' + d.cycles.name) : ''; }, selectValue: function(d) { return d.cycle_id || ''; }, options: function(d) { return _getCyclesForSuperSkill(d ? d.super_skill_id : '').map(function(c) { return { v: c.id, t: 'C' + c.cycle_number + ': ' + c.name }; }); } },
            { key: 'primary_theory_id', type: 'select', get: function(d) { return d.core_theories ? d.core_theories.theory_name : ''; }, selectValue: function(d) { return d.primary_theory_id || ''; }, options: function() { return _th.map(function(t) { return { v: t.id, t: t.theory_name }; }); } },
            { key: 'citation', get: function(d) { return d.citation || ''; } },
            { key: 'brain_town_application', get: function(d) { return d.brain_town_application || ''; } }
        ]
    },
    Ndis: {
        dbTable: 'ndis_domains',
        getData: function() { return _ndis; },
        render: rNdis,
        fields: [
            { key: 'domain_name', get: function(d) { return d.domain_name; } },
            { key: 'description', get: function(d) { return d.description || ''; } }
        ]
    },
    Age: {
        dbTable: 'age_ranges',
        getData: function() { return _age; },
        render: rAge,
        fields: [
            { key: 'age_range', get: function(d) { return d.age_range; } },
            { key: 'display_name', get: function(d) { return d.display_name; } },
            { key: 'language_guidelines', get: function(d) { return d.language_guidelines || ''; } },
            { key: 'developmental_stage', get: function(d) { return d.developmental_stage || ''; } }
        ]
    },
    Fasd: {
        dbTable: 'fasd_domains',
        getData: function() { return _fasd; },
        render: rFasd,
        fields: [
            { key: 'domain_number', get: function(d) { return d.domain_number || ''; } },
            { key: 'domain_name', get: function(d) { return d.domain_name; } },
            { key: 'description', get: function(d) { return d.description || ''; } }
        ]
    },
    ForbiddenWord: {
        dbTable: 'forbidden_terms',
        getData: function() { return _forbidden.filter(function(f) { return f.term_type === 'word'; }); },
        render: rVocab,
        fields: [
            { key: 'term', get: function(d) { return d.term; } },
            { key: 'brain_town_alternative', get: function(d) { return d.brain_town_alternative || ''; } }
        ]
    },
    ForbiddenMetaphor: {
        dbTable: 'forbidden_terms',
        getData: function() { return _forbidden.filter(function(f) { return f.term_type === 'metaphor'; }); },
        render: rVocab,
        fields: [
            { key: 'term', get: function(d) { return d.term; } },
            { key: 'brain_town_alternative', get: function(d) { return d.brain_town_alternative || ''; } }
        ]
    }
};

function _render(id) {
    var map = {
        refSuperSkills: rSS, refSubSkills: rSub, refTheories: rTh, refConnections: rConn, refDxProfiles: rDx,
        refNdis: rNdis, refSedi: rSedi, refAgeBands: rAge, refLevels: rLev,
        refVocabulary: rVocab, refSequencing: rSeq, refFasd: rFasd, refAuditRules: rAuditRules, refAiPrompt: rAiPrompt
    };
    if (map[id]) map[id]();
}

// ============================
// 1. SUPER SKILLS
// ============================
function rSS() {
    var p = document.getElementById('refSuperSkillsPanel'); if (!p) return;
    var h = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;"><div><h3 style="font-size:16px;margin:0;font-weight:700;">🧠 Super Skills & Character Assignments</h3><p style="font-size:12px;color:#6b7c8f;margin:4px 0 0;">Each with a locked character and domain. Daniel (Golden Retriever) narrates every module.</p></div><button class="btn-save" onclick="refInlineAdd(\'SS\')">+ Add Super Skill</button></div>';
    h += '<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:12px;"><thead><tr style="background:#405878;color:white;">' + TH('Code', 'width:55px;') + TH('Super Skill') + TH('Domain') + TH('Character') + TH('Personality & ND Affirmation', 'min-width:280px;') + TH('', 'text-align:center;width:50px;') + '</tr></thead><tbody id="tbSS">';
    _ss.forEach(function(s, i) {
        var code = s.code || (s.slug ? s.slug.substring(0, 2).toUpperCase() : '');
        // Get character info from joined data or fallback to super_skills columns
        var ch = s.characters || {};
        var charName = ch.name || s.character_name || '';
        var charPersonality = ch.personality_nd || s.personality || '';
        var charImg = ch.image_url || '';
        var charCell = charImg
            ? '<div style="display:flex;align-items:center;gap:6px;"><img src="' + E(charImg) + '" style="width:28px;height:28px;border-radius:50%;object-fit:cover;" alt="' + E(charName) + '"><span>' + E(charName) + '</span></div>'
            : E(charName);
        h += '<tr><td style="' + td(i, 'font-weight:700;') + '">' + E(code) + '</td><td style="' + td(i, 'font-weight:600;') + '">' + E(s.name) + '</td><td style="' + td(i) + '">' + E(s.domain || s.description || '') + '</td><td style="' + td(i, 'color:#2a8f8f;font-weight:600;') + '">' + charCell + '</td><td style="' + td(i, 'font-size:11px;line-height:1.4;') + '">' + E(charPersonality) + '</td><td style="' + td(i, 'text-align:center;') + '">' + editBtn("refEditRow('SS','" + s.id + "',this)") + '</td></tr>';
    });
    if (!_ss.length) h += '<tr><td colspan="6" style="padding:20px;text-align:center;color:#6b7c8f;">No super skills found.</td></tr>';
    h += '</tbody></table></div>';
    p.innerHTML = h;
    var input = document.getElementById('aiPromptTemplateInput');
    if (input) input.oninput = function() { window.renderAiPromptLint(input.value); };
    renderAiPromptLint(template);
}

// ============================
// 2. SUB-SKILLS
// ============================
function rSub() {
    var p = document.getElementById('refSubSkillsPanel'); if (!p) return;
    var grouped = {};
    _sub.forEach(function(s) { var pid = s.super_skill_id || 'x'; if (!grouped[pid]) grouped[pid] = []; grouped[pid].push(s); });
    var h = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;"><h3 style="font-size:16px;margin:0;font-weight:700;">📚 Sub-Skills (' + _sub.length + ' total)</h3><button class="btn-save" onclick="refInlineAdd(\'Sub\')">+ Add Sub-Skill</button></div>';
    h += '<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:12px;"><thead><tr style="background:#405878;color:white;">' + TH('Sub-Skill') + TH('Parent Super Skill') + TH('Description', 'min-width:300px;') + TH('', 'text-align:center;width:50px;') + '</tr></thead><tbody id="tbSub">';
    var idx = 0;
    _ss.forEach(function(skill) {
        var items = grouped[skill.id] || [];
        items.forEach(function(sub) {
            h += '<tr><td style="' + td(idx, 'font-weight:600;') + '">' + E(sub.name) + '</td><td style="' + td(idx, 'color:#2a8f8f;') + '">' + E(skill.name) + '</td><td style="' + td(idx, 'font-size:11px;') + '">' + E(sub.description || '') + '</td><td style="' + td(idx, 'text-align:center;') + '">' + editBtn("refEditRow('Sub','" + sub.id + "',this)") + '</td></tr>';
            idx++;
        });
    });
    if (!_sub.length) h += '<tr><td colspan="4" style="padding:20px;text-align:center;color:#6b7c8f;">No sub-skills found.</td></tr>';
    h += '</tbody></table></div>';
    p.innerHTML = h;
}

// ============================
// 3. THEORY SPINE
// ============================
function rTh() {
    var p = document.getElementById('refTheoriesPanel'); if (!p) return;
    var h = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;"><h3 style="font-size:16px;margin:0;font-weight:700;">📖 Core Theories (' + _th.length + ')</h3><button class="btn-save" onclick="refInlineAdd(\'Th\')">+ Add Theory</button></div>';
    h += '<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:12px;"><thead><tr style="background:#405878;color:white;">' + TH('Theory Name') + TH('Key Theorists') + TH('Description', 'min-width:300px;') + TH('Active', 'text-align:center;width:70px;') + TH('', 'text-align:center;width:50px;') + '</tr></thead><tbody id="tbTh">';
    _th.forEach(function(t, i) {
        var badge = t.is_active ? '<span style="background:#d1fae5;color:#059669;padding:2px 8px;border-radius:10px;font-size:10px;font-weight:700;">Active</span>' : '<span style="background:#fee2e2;color:#dc2626;padding:2px 8px;border-radius:10px;font-size:10px;font-weight:700;">Inactive</span>';
        h += '<tr><td style="' + td(i, 'font-weight:600;') + '">' + E(t.theory_name) + '</td><td style="' + td(i, 'font-size:11px;font-style:italic;') + '">' + E(t.primary_researchers || t.key_theorists || '') + '</td><td style="' + td(i, 'font-size:11px;') + '">' + E(t.description || '') + '</td><td style="' + td(i, 'text-align:center;') + '">' + badge + '</td><td style="' + td(i, 'text-align:center;') + '">' + editBtn("refEditRow('Th','" + t.id + "',this)") + '</td></tr>';
    });
    if (!_th.length) h += '<tr><td colspan="5" style="padding:20px;text-align:center;color:#6b7c8f;">No theories found.</td></tr>';
    h += '</tbody></table></div>';
    p.innerHTML = h;
}

// ============================
// 4. THEORY CONNECTIONS
// ============================
function rConn() {
    var p = document.getElementById('refConnectionsPanel'); if (!p) return;
    var h = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;"><div><h3 style="font-size:16px;margin:0;font-weight:700;">🔗 Theory Connections (' + _connections.length + ')</h3><p style="font-size:12px;color:#6b7c8f;margin:4px 0 0;">Links Super Skill + Cycle + Primary Theory with citation and Brain Town application.</p></div><button class="btn-save" onclick="refInlineAdd(\'Conn\')">+ Add Connection</button></div>';
    h += '<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:12px;"><thead><tr style="background:#405878;color:white;">' + TH('Super Skill') + TH('Cycle', 'min-width:140px;') + TH('Primary Theory', 'min-width:180px;') + TH('Citation', 'min-width:170px;') + TH('Brain Town Application', 'min-width:280px;') + TH('', 'text-align:center;width:50px;') + '</tr></thead><tbody id="tbConn">';
    _connections.forEach(function(c, i) {
        var cycleLabel = c.cycles ? ('C' + c.cycles.cycle_number + ': ' + c.cycles.name) : '';
        h += '<tr><td style="' + td(i, 'font-weight:600;') + '">' + E(c.super_skills ? c.super_skills.name : '') + '</td><td style="' + td(i) + '">' + E(cycleLabel) + '</td><td style="' + td(i, 'font-weight:600;') + '">' + E(c.core_theories ? c.core_theories.theory_name : '') + '</td><td style="' + td(i, 'font-style:italic;font-size:11px;') + '">' + E(c.citation || '') + '</td><td style="' + td(i, 'font-size:11px;') + '">' + E(c.brain_town_application || '') + '</td><td style="' + td(i, 'text-align:center;') + '">' + editBtn("refEditRow('Conn','" + c.id + "',this)") + '</td></tr>';
    });
    if (!_connections.length) h += '<tr><td colspan="6" style="padding:20px;text-align:center;color:#6b7c8f;">No theory connections found.</td></tr>';
    h += '</tbody></table></div>';
    p.innerHTML = h;
}

// ============================
// 5. DX PROFILES (static)
// ============================
var SDX = [
    { c: "FASD", n: "Foetal Alcohol Spectrum Disorder", t: "CORE", a: "Concrete anchoring, visual support, single steps, high repetition", b: "FASD brains process best through body and vision." },
    { c: "ADHD", n: "Attention Deficit Hyperactivity Disorder", t: "CORE", a: "Movement integration, novelty cycling, short segments, immediate feedback", b: "ADHD brains have ZOOM energy like Lenny." },
    { c: "ASD", n: "Autism Spectrum Disorder", t: "CORE", a: "Literal language, predictable structure, explicit scaffolding", b: "ASD brains build precise, detailed roads like Coco." },
    { c: "PDA", n: "Pathological Demand Avoidance", t: "CORE", a: "Invitation language, full choice architecture, no evaluation", b: "PDA brains experience demands as threats." },
    { c: "CT", n: "Complex Trauma", t: "CORE", a: "Safety first, no forced disclosure, predictable structure, co-regulation", b: "Trauma affected brains need safety before learning." },
    { c: "ID", n: "Intellectual Disability", t: "EXT", a: "Reduced abstraction ceiling, extended repetition, concrete permanence", b: "Brain town stays concrete regardless of age." },
    { c: "DLD", n: "Developmental Language Disorder", t: "EXT", a: "Reduced linguistic load, multimodal input, expression alternatives", b: "Ideas may be more sophisticated than language suggests." },
    { c: "ANX", n: "Anxiety Presentations", t: "EXT", a: "Predictability maximised, novelty graduated, somatic awareness", b: "Anxious roads are safety roads." },
    { c: "AD", n: "Attachment Disruption", t: "EXT", a: "Relational safety before content, trust through consistency", b: "Some towns were built without enough safe builders." },
    { c: "SLD", n: "Specific Learning Disabilities", t: "EXT", a: "Modality flexibility, reading alternatives, strengths based access", b: "A bumpy reading road does not mean a broken town." },
    { c: "SPD", n: "Sensory Processing Differences", t: "EXT", a: "Sensory load management, sensory choice architecture", b: "Every town has different traffic rules for sensory input." },
    { c: "DEP", n: "Depression and Low Mood", t: "EXT", a: "Energy aware pacing, micro achievement scaffolding, no toxic positivity", b: "Sometimes the town feels grey." },
    { c: "GTE", n: "Giftedness and Twice Exceptionality", t: "EXT", a: "Intellectual depth, asynchronous development, perfectionism addressed", b: "Complex town is not easier. Different challenges." },
    { c: "ABI", n: "Acquired Brain Injury", t: "EXT", a: "Fatigue management, pre and post injury identity bridging", b: "Rebuilding is real building." }
];

function rDx() {
    var p = document.getElementById('refDxProfilesPanel'); if (!p) return;
    var h = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;"><div><h3 style="font-size:16px;margin:0;font-weight:700;">🩺 Diagnosis Profiles (14)</h3><p style="font-size:12px;color:#6b7c8f;margin:4px 0 0;">Core Five (Tier 1) and Extended Nine (Tier 2).</p></div><button class="btn-save" onclick="refInlineAdd(\'Dx\')">+ Add Dx Profile</button></div>';
    h += '<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:12px;"><thead><tr style="background:#405878;color:white;">' + TH('Code', 'width:60px;') + TH('Name') + TH('Tier', 'text-align:center;width:80px;') + TH('Adjustment Principles', 'min-width:250px;') + TH('Brain Town Note', 'min-width:200px;') + TH('', 'text-align:center;width:50px;') + '</tr></thead><tbody id="tbDx">';
    SDX.forEach(function(d, i) {
        var tb = d.t === 'CORE' ? '<span style="background:#D4725C;color:white;padding:2px 8px;border-radius:10px;font-size:10px;font-weight:700;">Core</span>' : '<span style="background:#D4A843;color:white;padding:2px 8px;border-radius:10px;font-size:10px;font-weight:700;">Extended</span>';
        h += '<tr><td style="' + td(i, 'font-weight:700;font-family:monospace;') + '">' + d.c + '</td><td style="' + td(i, 'font-weight:600;') + '">' + d.n + '</td><td style="' + td(i, 'text-align:center;') + '">' + tb + '</td><td style="' + td(i, 'font-size:11px;') + '">' + d.a + '</td><td style="' + td(i, 'font-size:11px;font-style:italic;') + '">' + d.b + '</td><td style="' + td(i, 'text-align:center;') + '"></td></tr>';
    });
    h += '</tbody></table></div>';
    p.innerHTML = h;
}

// ============================
// 6. NDIS
// ============================
function rNdis() {
    var p = document.getElementById('refNdisPanel'); if (!p) return;
    var h = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;"><h3 style="font-size:16px;margin:0;font-weight:700;">🏥 NDIS Domains</h3><button class="btn-save" onclick="refInlineAdd(\'Ndis\')">+ Add NDIS Domain</button></div>';
    h += '<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:12px;"><thead><tr style="background:#405878;color:white;">' + TH('Domain Name') + TH('Description', 'min-width:300px;') + TH('', 'text-align:center;width:50px;') + '</tr></thead><tbody id="tbNdis">';
    _ndis.forEach(function(d, i) { h += '<tr><td style="' + td(i, 'font-weight:600;') + '">' + E(d.domain_name) + '</td><td style="' + td(i, 'font-size:11px;') + '">' + E(d.description || '') + '</td><td style="' + td(i, 'text-align:center;') + '">' + editBtn("refEditRow('Ndis','" + d.id + "',this)") + '</td></tr>'; });
    if (!_ndis.length) h += '<tr><td colspan="3" style="padding:20px;text-align:center;color:#6b7c8f;">No NDIS domains.</td></tr>';
    h += '</tbody></table></div>'; p.innerHTML = h;
}

// ============================
// 7. SEDI
// ============================
function rSedi() {
    var p = document.getElementById('refSediPanel'); if (!p) return;
    var h = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;"><h3 style="font-size:16px;margin:0;font-weight:700;">📊 DSS SEDI Categories</h3><button class="btn-save" onclick="refInlineAdd(\'Sedi\')">+ Add SEDI Category</button></div>';
    h += '<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:12px;"><thead><tr style="background:#405878;color:white;">' + TH('Code', 'width:100px;') + TH('Name') + TH('Description', 'min-width:300px;') + TH('', 'text-align:center;width:50px;') + '</tr></thead><tbody id="tbSedi">';
    _sedi.forEach(function(s, i) { h += '<tr><td style="' + td(i, 'font-weight:700;font-family:monospace;') + '">' + E(s.sedi_code) + '</td><td style="' + td(i, 'font-weight:600;') + '">' + E(s.sedi_name) + '</td><td style="' + td(i, 'font-size:11px;') + '">' + E(s.description || '') + '</td><td style="' + td(i, 'text-align:center;') + '"></td></tr>'; });
    if (!_sedi.length) h += '<tr><td colspan="4" style="padding:20px;text-align:center;color:#6b7c8f;">No SEDI categories.</td></tr>';
    h += '</tbody></table></div>'; p.innerHTML = h;
}

// ============================
// 8. AGE BANDS
// ============================
function rAge() {
    var p = document.getElementById('refAgeBandsPanel'); if (!p) return;
    var h = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;"><h3 style="font-size:16px;margin:0;font-weight:700;">👶 Age Bands</h3><button class="btn-save" onclick="refInlineAdd(\'Age\')">+ Add Age Band</button></div>';
    h += '<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:12px;"><thead><tr style="background:#405878;color:white;">' + TH('Age Range') + TH('Display Name') + TH('Language Guidelines', 'min-width:250px;') + TH('Developmental Stage', 'min-width:250px;') + TH('', 'text-align:center;width:50px;') + '</tr></thead><tbody id="tbAge">';
    _age.forEach(function(a, i) { h += '<tr><td style="' + td(i, 'font-weight:700;') + '">' + E(a.age_range) + '</td><td style="' + td(i) + '">' + E(a.display_name) + '</td><td style="' + td(i, 'font-size:11px;') + '">' + E(a.language_guidelines || '') + '</td><td style="' + td(i, 'font-size:11px;') + '">' + E(a.developmental_stage || '') + '</td><td style="' + td(i, 'text-align:center;') + '">' + editBtn("refEditRow('Age','" + a.id + "',this)") + '</td></tr>'; });
    if (!_age.length) h += '<tr><td colspan="5" style="padding:20px;text-align:center;color:#6b7c8f;">No age bands.</td></tr>';
    h += '</tbody></table></div>'; p.innerHTML = h;
}

// ============================
// 9. LEVELS (static)
// ============================
var LV = [
    { n: "Seed", w: "1, 2, 3", s: "Cognitive Stage", v: "identify, name, label, point to, recognise, notice, watch", xp: 50, st: 10, ind: "Minimal. The child observes.", col: "#38A169" },
    { n: "Street", w: "4, 5, 6", s: "Associative Stage", v: "demonstrate, practise, sort, categorise, compare, try, choose", xp: 100, st: 10, ind: "Growing. Active practice.", col: "#3182CE" },
    { n: "Motorway", w: "7, 8, 9", s: "Autonomous Stage", v: "apply, use independently, self correct, adapt, transfer, extend", xp: 150, st: 10, ind: "High. Applies across situations.", col: "#805AD5" },
    { n: "City Planner", w: "10, 11, 12", s: "Generalisation and Ownership", v: "design, teach, create, adapt, mentor, redesign, lead, integrate", xp: 200, st: 10, ind: "Full. Module supports not directs.", col: "#D4A843" }
];
function rLev() {
    var p = document.getElementById('refLevelsPanel'); if (!p) return;
    var h = '<div style="margin-bottom:12px;"><h3 style="font-size:16px;margin:0;font-weight:700;">📈 Levels (Seed → Street → Motorway → City Planner)</h3><p style="font-size:12px;color:#6b7c8f;margin:4px 0 0;">Approved verbs, cognitive stage, XP/Stars per level.</p></div>';
    h += '<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:12px;"><thead><tr style="background:#405878;color:white;">' + TH('Level') + TH('Weeks', 'width:80px;') + TH('Cognitive Stage') + TH('Approved Verbs', 'min-width:250px;') + TH('XP', 'text-align:center;width:50px;') + TH('Stars', 'text-align:center;width:50px;') + TH('Independence') + '</tr></thead><tbody>';
    LV.forEach(function(l, i) { h += '<tr><td style="' + td(i, 'font-weight:700;') + '"><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:' + l.col + ';margin-right:6px;"></span>' + l.n + '</td><td style="' + td(i) + '">' + l.w + '</td><td style="' + td(i, 'font-size:11px;') + '">' + l.s + '</td><td style="' + td(i, 'font-size:11px;font-style:italic;') + '">' + l.v + '</td><td style="' + td(i, 'text-align:center;font-weight:700;') + '">' + l.xp + '</td><td style="' + td(i, 'text-align:center;font-weight:700;') + '">' + l.st + '</td><td style="' + td(i, 'font-size:11px;') + '">' + l.ind + '</td></tr>'; });
    h += '</tbody></table></div>'; p.innerHTML = h;
}

// ============================
// 10. VOCABULARY (static core terms + dynamic forbidden terms)
// ============================
var VOC = [
    { r: "Brain / neural system", b: "Town / Brain Town", u: "Your brain is a town, and you are the town planner." },
    { r: "Thoughts / neural pathways", b: "Roads", u: "Every time you think a thought, you walk down a road." },
    { r: "Emotions / feelings / body state", b: "Traffic", u: "Traffic is how your body tells you something is happening." },
    { r: "Behaviours / actions / habits", b: "Buildings", u: "The things you do are the buildings in your town." },
    { r: "The child / self / executive function", b: "Town Planner", u: "You are the town planner. You decide which roads to build." },
    { r: "Strong habits / automatic patterns", b: "Main Streets / Motorways", u: "Roads you walk on a lot become main streets." },
    { r: "Emotional regulation / nervous system", b: "Traffic Lights", u: "Traffic lights help you check how your traffic is flowing." }
];

function rVocab() {
    var p = document.getElementById('refVocabularyPanel'); if (!p) return;
    
    // Separate forbidden words and metaphors from database
    var forbiddenWords = _forbidden.filter(function(f) { return f.term_type === 'word'; });
    var forbiddenMetaphors = _forbidden.filter(function(f) { return f.term_type === 'metaphor'; });
    
    var h = '<h3 style="font-size:16px;margin:0 0 12px;font-weight:700;">🏘️ Brain Town Vocabulary Reference</h3><h4 style="font-size:14px;color:#2a8f8f;margin:0 0 8px;">Approved Core Terms</h4>';
    h += '<div style="overflow-x:auto;margin-bottom:24px;"><table style="width:100%;border-collapse:collapse;font-size:12px;"><thead><tr style="background:#2a8f8f;color:white;">' + TH('Real Concept') + TH('Brain Town Term') + TH('Correct Usage', 'min-width:300px;') + '</tr></thead><tbody>';
    VOC.forEach(function(v, i) { h += '<tr><td style="' + td(i) + '">' + v.r + '</td><td style="' + td(i, 'font-weight:700;color:#2a8f8f;') + '">' + v.b + '</td><td style="' + td(i, 'font-style:italic;') + '">' + v.u + '</td></tr>'; });
    h += '</tbody></table></div>';
    
    // Forbidden Terms Section - now with editable grids
    h += '<h4 style="font-size:14px;color:#C53030;margin:0 0 8px;">⛔ Forbidden Terms — Auto Critical Fail at Audit</h4>';
    h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">';
    
    // Forbidden Words Grid
    h += '<div>';
    h += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;"><h5 style="font-size:12px;font-weight:700;margin:0;">Forbidden Words (' + forbiddenWords.length + ')</h5><button class="btn-save" style="font-size:11px;padding:4px 10px;" onclick="refInlineAdd(\'ForbiddenWord\')">+ Add</button></div>';
    h += '<div style="overflow-x:auto;max-height:400px;overflow-y:auto;"><table style="width:100%;border-collapse:collapse;font-size:11px;"><thead><tr style="background:#C53030;color:white;">' + TH('Term') + TH('Alternative') + TH('', 'width:60px;') + '</tr></thead><tbody id="tbForbiddenWord">';
    forbiddenWords.forEach(function(f, i) {
        h += '<tr><td style="' + td(i, 'color:#742A2A;font-weight:600;') + '">' + E(f.term) + '</td>';
        h += '<td style="' + td(i, 'color:#2a8f8f;font-style:italic;') + '">' + E(f.brain_town_alternative || '—') + '</td>';
        h += '<td style="' + td(i, 'text-align:center;') + '">' + editBtn("refEditRow('ForbiddenWord','" + f.id + "',this)") + '<button onclick="refDeleteForbidden(\'' + f.id + '\')" style="background:none;border:none;cursor:pointer;font-size:14px;" title="Delete">🗑️</button></td></tr>';
    });
    if (!forbiddenWords.length) h += '<tr><td colspan="3" style="padding:12px;text-align:center;color:#6b7c8f;">No forbidden words.</td></tr>';
    h += '</tbody></table></div></div>';
    
    // Forbidden Metaphors Grid
    h += '<div>';
    h += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;"><h5 style="font-size:12px;font-weight:700;margin:0;">Forbidden Metaphors (' + forbiddenMetaphors.length + ')</h5><button class="btn-save" style="font-size:11px;padding:4px 10px;" onclick="refInlineAdd(\'ForbiddenMetaphor\')">+ Add</button></div>';
    h += '<div style="overflow-x:auto;max-height:400px;overflow-y:auto;"><table style="width:100%;border-collapse:collapse;font-size:11px;"><thead><tr style="background:#C53030;color:white;">' + TH('Metaphor') + TH('Brain Town Alternative') + TH('', 'width:60px;') + '</tr></thead><tbody id="tbForbiddenMetaphor">';
    forbiddenMetaphors.forEach(function(f, i) {
        h += '<tr><td style="' + td(i, 'color:#742A2A;font-weight:600;') + '">' + E(f.term) + '</td>';
        h += '<td style="' + td(i, 'color:#2a8f8f;font-style:italic;') + '">' + E(f.brain_town_alternative || '—') + '</td>';
        h += '<td style="' + td(i, 'text-align:center;') + '">' + editBtn("refEditRow('ForbiddenMetaphor','" + f.id + "',this)") + '<button onclick="refDeleteForbidden(\'' + f.id + '\')" style="background:none;border:none;cursor:pointer;font-size:14px;" title="Delete">🗑️</button></td></tr>';
    });
    if (!forbiddenMetaphors.length) h += '<tr><td colspan="3" style="padding:12px;text-align:center;color:#6b7c8f;">No forbidden metaphors.</td></tr>';
    h += '</tbody></table></div></div>';
    
    h += '</div>';
    p.innerHTML = h;
}

// Delete forbidden term
window.refDeleteForbidden = async function(id) {
    if (!confirm('Delete this forbidden term?')) return;
    try {
        await window.supabase.from('forbidden_terms').delete().eq('id', id);
        await _loadAll();
        rVocab();
    } catch (e) { alert('Error: ' + e.message); }
};

// ============================
// 12. AUDIT RULES (dynamic from database)
// ============================
function rAuditRules() {
    var p = document.getElementById('refAuditRulesPanel'); if (!p) return;
    
    // Calculate total weight
    var totalWeight = _auditSections.reduce(function(sum, s) { return sum + (s.weight || 0); }, 0);
    var weightColor = totalWeight === 100 ? '#38A169' : '#C53030';
    
    var h = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">';
    h += '<div><h3 style="font-size:16px;margin:0;font-weight:700;">🔍 Audit Rules — Sent to AI & Validated After Generation</h3>';
    h += '<p style="font-size:12px;color:#6b7c8f;margin:4px 0 0;">These rules are sent to the AI during module generation and then validated by the audit system.</p></div>';
    h += '<div style="text-align:right;"><div style="font-size:24px;font-weight:800;color:' + weightColor + ';">' + totalWeight + '%</div>';
    h += '<div style="font-size:10px;color:' + weightColor + ';">Total Weight' + (totalWeight !== 100 ? ' (must = 100%)' : ' ✓') + '</div></div></div>';
    
    // Sections overview
    h += '<div style="display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-bottom:20px;">';
    _auditSections.forEach(function(sec) {
        var sevCol = sec.severity === 'CRITICAL' ? '#C53030' : sec.severity === 'IMPORTANT' ? '#D69E2E' : '#718096';
        var sevBg = sec.severity === 'CRITICAL' ? '#FFF5F5' : sec.severity === 'IMPORTANT' ? '#FFFFF0' : '#F7FAFC';
        var rulesCount = _auditRules.filter(function(r) { return r.section_id === sec.id; }).length;
        h += '<div style="padding:12px;border-radius:8px;background:' + sevBg + ';border:1px solid ' + sevCol + '30;cursor:pointer;" onclick="scrollToAuditSection(\'' + sec.id + '\')">';
        h += '<div style="font-size:11px;font-weight:700;color:' + sevCol + ';">' + sec.section_number + '. ' + E(sec.section_name) + '</div>';
        h += '<div style="display:flex;justify-content:space-between;margin-top:6px;">';
        h += '<span style="font-size:10px;color:#718096;">' + rulesCount + ' rules</span>';
        h += '<span style="font-size:12px;font-weight:700;color:' + sevCol + ';">' + sec.weight + '%</span>';
        h += '</div></div>';
    });
    h += '</div>';
    
    // Detailed sections with rules
    _auditSections.forEach(function(sec, si) {
        var sevCol = sec.severity === 'CRITICAL' ? '#C53030' : sec.severity === 'IMPORTANT' ? '#D69E2E' : '#718096';
        var sevBg = sec.severity === 'CRITICAL' ? '#FED7D7' : sec.severity === 'IMPORTANT' ? '#FEFCBF' : '#E2E8F0';
        var sectionRules = _auditRules.filter(function(r) { return r.section_id === sec.id; }).sort(function(a,b) { return (a.sort_order||0) - (b.sort_order||0); });
        
        h += '<div id="auditSection_' + sec.id + '" style="background:#fff;border-radius:10px;border:1px solid #E2E8F0;margin-bottom:16px;overflow:hidden;">';
        
        // Section header
        h += '<div style="padding:14px 18px;background:linear-gradient(135deg,' + sevBg + ',' + sevBg + '80);display:flex;justify-content:space-between;align-items:center;">';
        h += '<div style="display:flex;align-items:center;gap:10px;">';
        h += '<span style="padding:3px 8px;border-radius:4px;font-size:10px;font-weight:800;text-transform:uppercase;background:' + sevCol + ';color:white;">' + sec.severity + '</span>';
        h += '<span style="font-size:14px;font-weight:700;color:#1B3A5C;">' + sec.section_number + '. ' + E(sec.section_name) + '</span>';
        h += '</div>';
        h += '<div style="display:flex;align-items:center;gap:12px;">';
        h += '<input type="number" value="' + sec.weight + '" min="0" max="100" style="width:50px;padding:4px 6px;border:1px solid #c7d2fe;border-radius:4px;font-size:12px;font-weight:700;text-align:center;" onchange="updateSectionWeight(\'' + sec.id + '\',this.value)">';
        h += '<span style="font-size:11px;color:#718096;">% weight</span>';
        h += '</div></div>';
        
        // AI Instruction
        h += '<div style="padding:12px 18px;background:#f0f4ff;border-bottom:1px solid #E2E8F0;">';
        h += '<div style="font-size:10px;font-weight:700;color:#6366F1;margin-bottom:4px;">📤 AI INSTRUCTION (sent to generator)</div>';
        h += '<textarea style="width:100%;padding:8px;border:1px solid #c7d2fe;border-radius:6px;font-size:11px;line-height:1.5;resize:vertical;min-height:60px;" onchange="updateSectionInstruction(\'' + sec.id + '\',this.value)">' + E(sec.ai_instruction || '') + '</textarea>';
        h += '</div>';
        
        // Rules table
        h += '<div style="padding:12px 18px;">';
        h += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">';
        h += '<span style="font-size:11px;font-weight:700;color:#405878;">Rules (' + sectionRules.length + ')</span>';
        h += '<button class="btn-save" style="font-size:10px;padding:4px 10px;" onclick="addAuditRule(\'' + sec.id + '\')">+ Add Rule</button>';
        h += '</div>';
        
        if (sectionRules.length) {
            h += '<table style="width:100%;border-collapse:collapse;font-size:11px;"><thead><tr style="background:#405878;color:white;">';
            h += TH('#', 'width:40px;') + TH('Rule Name') + TH('AI Instruction', 'min-width:250px;') + TH('Check Type', 'width:100px;') + TH('', 'width:50px;');
            h += '</tr></thead><tbody id="tbAuditRules_' + sec.id + '">';
            sectionRules.forEach(function(rule, ri) {
                h += '<tr>';
                h += '<td style="' + td(ri, 'font-weight:600;') + '">' + E(rule.rule_number) + '</td>';
                h += '<td style="' + td(ri) + '">' + E(rule.rule_name) + '</td>';
                h += '<td style="' + td(ri, 'font-size:10px;color:#4b5563;') + '">' + E((rule.ai_instruction || '').substring(0, 80)) + (rule.ai_instruction && rule.ai_instruction.length > 80 ? '...' : '') + '</td>';
                h += '<td style="' + td(ri, 'font-size:10px;') + '"><span style="padding:2px 6px;border-radius:3px;background:#E2E8F0;">' + E(rule.check_type) + '</span></td>';
                h += '<td style="' + td(ri, 'text-align:center;') + '">' + editBtn("editAuditRule('" + rule.id + "')") + '<button onclick="deleteAuditRule(\'' + rule.id + '\')" style="background:none;border:none;cursor:pointer;font-size:14px;" title="Delete">🗑️</button></td>';
                h += '</tr>';
            });
            h += '</tbody></table>';
        } else {
            h += '<div style="padding:20px;text-align:center;color:#6b7c8f;background:#f8f9fa;border-radius:6px;">No rules in this section yet.</div>';
        }
        h += '</div></div>';
    });
    
    p.innerHTML = h;
}


function rAiPrompt() {
    var p = document.getElementById('refAiPromptPanel'); if (!p) return;
    var template = (_settings && _settings.ai_prompt_template) ? _settings.ai_prompt_template : DEFAULT_AI_PROMPT_TEMPLATE;
    var h = '<div style="background:#fff;border-radius:10px;border:1px solid #E2E8F0;padding:18px;">';
    h += '<h3 style="font-size:16px;margin:0 0 6px;font-weight:700;">🤖 AI Prompt Template</h3>';
    h += '<p style="font-size:12px;color:#6b7c8f;margin:0 0 12px;">This prompt is sent as the system prompt to module generation requests. Content sections are still controlled by existing reference data and page generators.</p>';
    h += '<textarea id="aiPromptTemplateInput" style="width:100%;min-height:360px;padding:10px;border:1px solid #d1d5db;border-radius:8px;font-family:monospace;font-size:12px;line-height:1.45;">' + E(template) + '</textarea>';
    h += '<div style="display:flex;gap:10px;align-items:center;margin-top:12px;flex-wrap:wrap;">';
    h += '<button class="btn-save" onclick="saveAiPromptTemplate()">💾 Save AI Prompt</button>';
    h += '<button class="btn" style="background:#6b7c8f;color:white;" onclick="restoreDefaultAiPromptTemplate()">↩ Restore Safe Default</button>';
    h += '<span id="aiPromptTemplateStatus" style="font-size:12px;color:#6b7c8f;"></span>';
    h += '</div>';
    h += '<div id="aiPromptTemplateLint" style="font-size:12px;color:#6b7c8f;margin-top:8px;"></div>';
    h += '</div>';
    p.innerHTML = h;
    var input = document.getElementById('aiPromptTemplateInput');
    if (input) input.oninput = function() { window.renderAiPromptLint(input.value); };
    renderAiPromptLint(template);
}

window.restoreDefaultAiPromptTemplate = function() {
    var input = document.getElementById('aiPromptTemplateInput');
    if (!input) return;
    input.value = DEFAULT_AI_PROMPT_TEMPLATE;
    renderAiPromptLint(input.value);
};

window.renderAiPromptLint = function(template) {
    var lintEl = document.getElementById('aiPromptTemplateLint');
    if (!lintEl) return;
    var result = validateAiPromptTemplate(template || '');
    var parts = [];
    parts.push('Chars: ' + result.characterCount + ' • Est. tokens: ~' + result.estimatedTokens);
    if (result.errors.length) {
        parts.push('Errors: ' + result.errors.join(' | '));
        lintEl.style.color = '#C53030';
    } else if (result.warnings.length) {
        parts.push('Warnings: ' + result.warnings.join(' | '));
        lintEl.style.color = '#D97706';
    } else {
        parts.push('No lint issues detected.');
        lintEl.style.color = '#2a8f8f';
    }
    lintEl.textContent = parts.join(' — ');
};

window.saveAiPromptTemplate = async function() {
    var input = document.getElementById('aiPromptTemplateInput');
    var status = document.getElementById('aiPromptTemplateStatus');
    if (!input) return;
    var value = (input.value || '').trim();
    var validation = validateAiPromptTemplate(value);
    renderAiPromptLint(value);
    if (!validation.valid) {
        alert('Cannot save AI prompt template:\n' + validation.errors.join('\n'));
        return;
    }
    if (!value) {
        alert('Please provide an AI prompt template before saving.');
        return;
    }
    if (status) { status.textContent = 'Saving...'; status.style.color = '#6b7c8f'; }
    try {
        var existingId = _settings && _settings.id ? _settings.id : null;
        var res;
        if (existingId) {
            res = await window.supabase.from('settings').update({ ai_prompt_template: value }).eq('id', existingId).select('id, ai_prompt_template').single();
        } else {
            res = await window.supabase.from('settings').insert([{ ai_prompt_template: value }]).select('id, ai_prompt_template').single();
        }
        if (res.error) throw res.error;
        _settings = res.data || { id: existingId, ai_prompt_template: value };
        if (status) { status.textContent = 'Saved'; status.style.color = '#2a8f8f'; }
    } catch (e) {
        console.error('Failed to save AI prompt template:', e);
        if (status) { status.textContent = 'Save failed'; status.style.color = '#C53030'; }
        alert('Error saving AI prompt template: ' + (e.message || JSON.stringify(e)));
    }
};

// Scroll to audit section
window.scrollToAuditSection = function(id) {
    var el = document.getElementById('auditSection_' + id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

// Update section weight
window.updateSectionWeight = async function(id, value) {
    try {
        await window.supabase.from('audit_sections').update({ weight: parseInt(value) || 0 }).eq('id', id);
        await _loadAll();
        rAuditRules();
    } catch (e) { alert('Error: ' + e.message); }
};

// Update section AI instruction
window.updateSectionInstruction = async function(id, value) {
    try {
        await window.supabase.from('audit_sections').update({ ai_instruction: value }).eq('id', id);
        var sec = _auditSections.find(function(s) { return s.id === id; });
        if (sec) sec.ai_instruction = value;
    } catch (e) { alert('Error: ' + e.message); }
};

// Add new audit rule
window.addAuditRule = async function(sectionId) {
    var sec = _auditSections.find(function(s) { return s.id === sectionId; });
    if (!sec) return;
    var existingRules = _auditRules.filter(function(r) { return r.section_id === sectionId; });
    var nextNum = sec.section_number + '.' + (existingRules.length + 1);
    var name = prompt('Rule name:', 'New Rule');
    if (!name) return;
    try {
        await window.supabase.from('audit_rules').insert([{
            section_id: sectionId,
            rule_number: nextNum,
            rule_name: name,
            check_type: 'manual_review',
            ai_instruction: 'Describe what the AI should do...',
            is_active: true,
            sort_order: (existingRules.length + 1) * 10
        }]);
        await _loadAll();
        rAuditRules();
    } catch (e) { alert('Error: ' + e.message); }
};

// Edit audit rule (opens modal or inline)
window.editAuditRule = function(id) {
    var rule = _auditRules.find(function(r) { return r.id === id; });
    if (!rule) return;
    var newInstruction = prompt('AI Instruction for "' + rule.rule_name + '":', rule.ai_instruction || '');
    if (newInstruction === null) return;
    window.supabase.from('audit_rules').update({ ai_instruction: newInstruction }).eq('id', id)
        .then(function() { _loadAll().then(rAuditRules); })
        .catch(function(e) { alert('Error: ' + e.message); });
};

// Delete audit rule
window.deleteAuditRule = async function(id) {
    if (!confirm('Delete this rule?')) return;
    try {
        await window.supabase.from('audit_rules').delete().eq('id', id);
        await _loadAll();
        rAuditRules();
    } catch (e) { alert('Error: ' + e.message); }
};

// ============================
// 11. SEQUENCING (static)
// ============================
var SEQ = [
    { t: "FOUNDATION", s: "BB", r: "Must complete BB C1 before any other skill unlocks." },
    { t: "CORE THREE", s: "EN, TD, BE", r: "Open after BB C1 complete. Can run in parallel." },
    { t: "EXTENDED", s: "RA, SM", r: "Open after any Core Three skill reaches C2 or higher." },
    { t: "ADVANCED", s: "FD", r: "Open after 2+ skills reach C3 or higher." }
];
var PAT = [
    { p: "Emotional dysregulation, meltdowns", pa: "BB → EN → RA → BE", r: "Regulation before action." },
    { p: "Rigid thinking, anxiety", pa: "BB → TD → EN → RA", r: "Cognitive flexibility first." },
    { p: "Social difficulties, peer rejection", pa: "BB → EN → SM → TD", r: "Emotion literacy before social." },
    { p: "Impulsivity, behaviour of concern", pa: "BB → BE → TD → EN", r: "Behaviour engineering first." },
    { p: "Trauma response, hypervigilance", pa: "BB → EN → RA → SM", r: "Gentle entry, polyvagal, then social." },
    { p: "Low motivation, disengagement", pa: "BB → TD → FD → BE", r: "Growth mindset, future design, steps." }
];
function rSeq() {
    var p = document.getElementById('refSequencingPanel'); if (!p) return;
    var h = '<div style="margin-bottom:24px;"><h3 style="font-size:16px;margin:0 0 8px;font-weight:700;">🔗 Skill Unlock Sequencing</h3><div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:12px;"><thead><tr style="background:#405878;color:white;">' + TH('Tier') + TH('Skills') + TH('Rule', 'min-width:300px;') + '</tr></thead><tbody>';
    SEQ.forEach(function(r, i) { h += '<tr><td style="' + td(i, 'font-weight:700;') + '">' + r.t + '</td><td style="' + td(i, 'font-weight:600;color:#2a8f8f;') + '">' + r.s + '</td><td style="' + td(i) + '">' + r.r + '</td></tr>'; });
    h += '</tbody></table></div></div><h3 style="font-size:16px;margin:0 0 8px;font-weight:700;">🗺️ Needs-Based Pathways</h3><div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:12px;"><thead><tr style="background:#405878;color:white;">' + TH('Presenting Pattern') + TH('Recommended Pathway') + TH('Rationale') + '</tr></thead><tbody>';
    PAT.forEach(function(x, i) { h += '<tr><td style="' + td(i, 'font-weight:600;') + '">' + x.p + '</td><td style="' + td(i, 'font-weight:700;color:#2a8f8f;font-family:monospace;') + '">' + x.pa + '</td><td style="' + td(i) + '">' + x.r + '</td></tr>'; });
    h += '</tbody></table></div>'; p.innerHTML = h;
}

// ============================
// FASD
// ============================
function rFasd() {
    var p = document.getElementById('refFasdPanel'); if (!p) return;
    var h = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;"><h3 style="font-size:16px;margin:0;font-weight:700;">🧬 FASD Domains</h3><button class="btn-save" onclick="refInlineAdd(\'Fasd\')">+ Add FASD Domain</button></div>';
    h += '<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:12px;"><thead><tr style="background:#405878;color:white;">' + TH('#', 'text-align:center;width:50px;') + TH('Domain Name') + TH('Description', 'min-width:300px;') + TH('', 'text-align:center;width:50px;') + '</tr></thead><tbody id="tbFasd">';
    _fasd.forEach(function(f, i) { h += '<tr><td style="' + td(i, 'text-align:center;font-weight:700;') + '">' + (f.domain_number || '') + '</td><td style="' + td(i, 'font-weight:600;') + '">' + E(f.domain_name) + '</td><td style="' + td(i, 'font-size:11px;') + '">' + E(f.description || '') + '</td><td style="' + td(i, 'text-align:center;') + '">' + editBtn("refEditRow('Fasd','" + f.id + "',this)") + '</td></tr>'; });
    if (!_fasd.length) h += '<tr><td colspan="4" style="padding:20px;text-align:center;color:#6b7c8f;">No FASD domains.</td></tr>';
    h += '</tbody></table></div>'; p.innerHTML = h;
}

// ============================
// INLINE ADD — generic for all sections
// ============================
var _inlineConfigs = {
    SS: {
        tbId: 'tbSS',
        cols: [
            { id: 'Code', ph: 'BB', w: '' },
            { id: 'Name', ph: 'Skill name', w: '', req: true },
            { id: 'Domain', ph: 'Domain', w: '' },
            { id: 'Char', ph: 'Character', w: '', type: 'select', options: function() { return _chars.map(function(c) { return { v: c.id, t: c.name + ' (' + (c.species || '') + ')' }; }); }, onchange: '_onCharSelect' },
            { id: 'Pers', ph: 'Auto-populated from character', w: '', readonly: true }
        ],
        save: async function(vals) {
            var slug = vals.Name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
            var charId = vals.Char || null;
            await window.supabase.from('super_skills').insert([{ name: vals.Name, slug: slug, code: vals.Code || null, domain: vals.Domain || null, character_id: charId, description: vals.Domain || null, is_active: true, sort_order: (_ss.length + 1) * 10 }]);
            // Also link the character to this super skill
            if (charId) {
                var newSS = await window.supabase.from('super_skills').select('id').eq('slug', slug).single();
                if (newSS.data) {
                    await window.supabase.from('characters').update({ super_skill_id: newSS.data.id }).eq('id', charId);
                }
            }
        },
        after: async function() { await _loadAll(); rSS(); }
    },
    Sub: {
        tbId: 'tbSub',
        cols: [
            { id: 'Name', ph: 'Sub-skill name', w: '', req: true },
            { id: 'Parent', ph: 'Parent (select)', w: '', type: 'select', options: function() { return _ss.map(function(s) { return { v: s.id, t: s.name }; }); } },
            { id: 'Desc', ph: 'Description', w: 'min-width:200px;' }
        ],
        save: async function(vals) {
            var slug = vals.Name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
            await window.supabase.from('sub_skills').insert([{ name: vals.Name, slug: slug, super_skill_id: vals.Parent || null, description: vals.Desc || null, is_active: true, sort_order: (_sub.length + 1) * 10 }]);
        },
        after: async function() { await _loadAll(); rSub(); }
    },
    Th: {
        tbId: 'tbTh',
        cols: [
            { id: 'Name', ph: 'Theory name', w: '', req: true },
            { id: 'Researchers', ph: 'Key theorists', w: '' },
            { id: 'Desc', ph: 'Description', w: 'min-width:200px;' }
        ],
        save: async function(vals) {
            var code = vals.Name.toLowerCase().replace(/[^a-z0-9]+/g, '_');
            await window.supabase.from('core_theories').insert([{ theory_name: vals.Name, theory_code: code, primary_researchers: vals.Researchers || null, description: vals.Desc || null, is_active: true }]);
        },
        after: async function() { await _loadAll(); rTh(); }
    },
    Conn: {
        tbId: 'tbConn',
        cols: [
            { id: 'SuperSkill', ph: 'Super Skill', w: '', req: true, type: 'select', options: function() { return _ss.map(function(ss) { return { v: ss.id, t: ss.name }; }); }, onchange: '_onConnSuperSkillSelect' },
            { id: 'Cycle', ph: 'Cycle', w: '', req: true, type: 'select', options: function() { return []; } },
            { id: 'Theory', ph: 'Primary Theory', w: '', req: true, type: 'select', options: function() { return _th.map(function(t) { return { v: t.id, t: t.theory_name }; }); } },
            { id: 'Citation', ph: 'e.g. Hebb, 1949', w: 'min-width:150px;' },
            { id: 'Application', ph: 'Brain Town application', w: 'min-width:220px;' }
        ],
        save: async function(vals) {
            await window.supabase.from('theory_connections').insert([{
                super_skill_id: vals.SuperSkill,
                cycle_id: vals.Cycle,
                primary_theory_id: vals.Theory,
                citation: vals.Citation || null,
                brain_town_application: vals.Application || null,
                is_active: true,
                sort_order: (_connections.length + 1) * 10
            }]);
        },
        after: async function() { await _loadAll(); rConn(); }
    },
    Ndis: {
        tbId: 'tbNdis',
        cols: [
            { id: 'Name', ph: 'Domain name', w: '', req: true },
            { id: 'Desc', ph: 'Description', w: 'min-width:200px;' }
        ],
        save: async function(vals) {
            await window.supabase.from('ndis_domains').insert([{ domain_name: vals.Name, description: vals.Desc || null, is_active: true, sort_order: (_ndis.length + 1) * 10 }]);
        },
        after: async function() { await _loadAll(); rNdis(); }
    },
    Sedi: {
        tbId: 'tbSedi',
        cols: [
            { id: 'Code', ph: 'SEDI code', w: 'width:100px;', req: true },
            { id: 'Name', ph: 'Category name', w: '', req: true },
            { id: 'Desc', ph: 'Description', w: 'min-width:200px;' }
        ],
        save: async function(vals) {
            await window.supabase.from('dss_sedi_categories').insert([{ sedi_code: vals.Code, sedi_name: vals.Name, description: vals.Desc || null, is_active: true, sort_order: (_sedi.length + 1) * 10 }]);
        },
        after: async function() { await _loadAll(); rSedi(); }
    },
    Age: {
        tbId: 'tbAge',
        cols: [
            { id: 'Range', ph: 'e.g. 6-8', w: '', req: true },
            { id: 'Display', ph: 'Display name', w: '', req: true },
            { id: 'Lang', ph: 'Language guidelines', w: 'min-width:150px;' },
            { id: 'Dev', ph: 'Developmental stage', w: 'min-width:150px;' }
        ],
        save: async function(vals) {
            await window.supabase.from('age_ranges').insert([{ age_range: vals.Range, display_name: vals.Display, language_guidelines: vals.Lang || null, developmental_stage: vals.Dev || null, is_active: true }]);
        },
        after: async function() { await _loadAll(); rAge(); }
    },
    Fasd: {
        tbId: 'tbFasd',
        cols: [
            { id: 'Num', ph: '#', w: 'width:50px;' },
            { id: 'Name', ph: 'Domain name', w: '', req: true },
            { id: 'Desc', ph: 'Description', w: 'min-width:200px;' }
        ],
        save: async function(vals) {
            await window.supabase.from('fasd_domains').insert([{ domain_number: vals.Num ? parseInt(vals.Num) : null, domain_name: vals.Name, description: vals.Desc || null, is_active: true }]);
        },
        after: async function() { await _loadAll(); rFasd(); }
    },
    Dx: {
        tbId: 'tbDx',
        cols: [
            { id: 'Code', ph: 'e.g. ADHD', w: 'width:60px;', req: true },
            { id: 'Name', ph: 'Full name', w: '', req: true },
            { id: 'Tier', ph: 'Tier', w: 'width:80px;', type: 'select', options: function() { return [{ v: 'core', t: 'Core' }, { v: 'extended', t: 'Extended' }]; } },
            { id: 'Adj', ph: 'Adjustment principles', w: 'min-width:150px;' },
            { id: 'BT', ph: 'Brain Town note', w: 'min-width:150px;' }
        ],
        save: async function(vals) {
            await window.supabase.from('diagnosis_profiles').insert([{ code: vals.Code, name: vals.Name, tier: vals.Tier || 'core', adjustment_principles: vals.Adj || '', brain_town_note: vals.BT || null, is_active: true, sort_order: (SDX.length + 1) * 10 }]);
        },
        after: async function() { alert('Saved! Run migration SQL if you haven\'t created the diagnosis_profiles table yet.'); }
    },
    ForbiddenWord: {
        tbId: 'tbForbiddenWord',
        cols: [
            { id: 'Term', ph: 'Forbidden word', w: '', req: true },
            { id: 'Alt', ph: 'Brain Town alternative', w: '' }
        ],
        save: async function(vals) {
            await window.supabase.from('forbidden_terms').insert([{ term: vals.Term, term_type: 'word', brain_town_alternative: vals.Alt || null, is_active: true }]);
        },
        after: async function() { await _loadAll(); rVocab(); }
    },
    ForbiddenMetaphor: {
        tbId: 'tbForbiddenMetaphor',
        cols: [
            { id: 'Term', ph: 'Forbidden metaphor', w: '', req: true },
            { id: 'Alt', ph: 'Brain Town alternative', w: '' }
        ],
        save: async function(vals) {
            await window.supabase.from('forbidden_terms').insert([{ term: vals.Term, term_type: 'metaphor', brain_town_alternative: vals.Alt || null, is_active: true }]);
        },
        after: async function() { await _loadAll(); rVocab(); }
    }
};

window.refInlineAdd = function(key) {
    var cfg = _inlineConfigs[key]; if (!cfg) return;
    var tb = document.getElementById(cfg.tbId); if (!tb) return;
    var rowId = 'refInline_' + key;
    if (document.getElementById(rowId)) { document.getElementById(rowId).querySelector('input,select')?.focus(); return; }
    var tr = document.createElement('tr');
    tr.id = rowId; tr.style.background = '#f0f4ff';
    var cells = '';
    cfg.cols.forEach(function(c) {
        cells += '<td style="padding:6px 8px;' + (c.w || '') + '">';
        if (c.type === 'select') {
            var opts = typeof c.options === 'function' ? c.options() : [];
            var onchangeAttr = c.onchange ? ' onchange="' + c.onchange + '(this,\'' + key + '\')"' : '';
            cells += '<select id="refI_' + key + '_' + c.id + '"' + onchangeAttr + ' style="width:100%;padding:4px 6px;border:1px solid #c7d2fe;border-radius:4px;font-size:12px;"><option value="">Select...</option>';
            opts.forEach(function(o) { cells += '<option value="' + o.v + '">' + E(o.t) + '</option>'; });
            cells += '</select>';
        } else {
            var roAttr = c.readonly ? ' readonly style="width:100%;padding:4px 6px;border:1px solid #e5e7eb;border-radius:4px;font-size:12px;background:#f3f4f6;color:#6b7c8f;cursor:not-allowed;"' : ' style="width:100%;padding:4px 6px;border:1px solid #c7d2fe;border-radius:4px;font-size:12px;"';
            cells += '<input type="text" id="refI_' + key + '_' + c.id + '" placeholder="' + E(c.ph) + '"' + roAttr + '>';
        }
        cells += '</td>';
    });
    cells += '<td style="padding:6px 8px;text-align:center;white-space:nowrap;"><button onclick="refInlineSave(\'' + key + '\')" style="background:#10b981;color:white;border:none;border-radius:4px;padding:4px 8px;font-size:11px;cursor:pointer;font-weight:600;margin-right:2px;">Save</button><button onclick="document.getElementById(\'' + rowId + '\')?.remove()" style="background:#6b7c8f;color:white;border:none;border-radius:4px;padding:4px 8px;font-size:11px;cursor:pointer;">✕</button></td>';
    tr.innerHTML = cells;
    tb.insertBefore(tr, tb.firstChild);
    if (key === 'Conn') _setConnCycleOptionsForInline('');
    tr.querySelector('input,select')?.focus();
};

window.refInlineSave = async function(key) {
    var cfg = _inlineConfigs[key]; if (!cfg) return;
    var vals = {};
    var missing = false;
    cfg.cols.forEach(function(c) {
        var el = document.getElementById('refI_' + key + '_' + c.id);
        vals[c.id] = el ? el.value.trim() : '';
        if (c.req && !vals[c.id]) missing = true;
    });
    if (missing) { alert('Please fill in required fields'); return; }
    try {
        await cfg.save(vals);
        if (cfg.after) await cfg.after();
    } catch (e) {
        console.error('Save error:', e);
        alert('Error: ' + (e.message || JSON.stringify(e)));
    }
};

// Character dropdown onchange — auto-populate personality field (ADD mode)
window._onCharSelect = function(selectEl, key) {
    var charId = selectEl.value;
    var persInput = document.getElementById('refI_' + key + '_Pers');
    if (!persInput) return;
    if (!charId) { persInput.value = ''; return; }
    var ch = _chars.find(function(c) { return c.id === charId; });
    persInput.value = ch ? (ch.personality_nd || '') : '';
};

// Character dropdown onchange — auto-populate personality field (EDIT mode)
window._onCharEditSelect = function(selectEl, table, itemId) {
    var charId = selectEl.value;
    var row = selectEl.closest('tr');
    if (!row) return;
    var persInput = row.querySelector('input[data-field="_char_personality"]');
    if (!persInput) return;
    if (!charId) { persInput.value = ''; return; }
    var ch = _chars.find(function(c) { return c.id === charId; });
    persInput.value = ch ? (ch.personality_nd || '') : '';
};


function _getCyclesForSuperSkill(superSkillId) {
    if (!superSkillId) return [];
    return _cycles.filter(function(c) { return c.super_skill_id === superSkillId; });
}

function _setSelectOptions(selectEl, options, selectedValue) {
    if (!selectEl) return;
    var html = '<option value="">Select...</option>';
    options.forEach(function(o) {
        html += '<option value="' + o.v + '"' + (selectedValue && selectedValue === o.v ? ' selected' : '') + '>' + E(o.t) + '</option>';
    });
    selectEl.innerHTML = html;
}

function _setConnCycleOptionsForInline(superSkillId) {
    var cycleSelect = document.getElementById('refI_Conn_Cycle');
    var options = _getCyclesForSuperSkill(superSkillId).map(function(c) { return { v: c.id, t: 'C' + c.cycle_number + ': ' + c.name }; });
    _setSelectOptions(cycleSelect, options, '');
}

function _setConnCycleOptionsForEditRow(row, superSkillId, selectedCycleId) {
    if (!row) return;
    var cycleSelect = row.querySelector('select[data-field="cycle_id"]');
    var options = _getCyclesForSuperSkill(superSkillId).map(function(c) { return { v: c.id, t: 'C' + c.cycle_number + ': ' + c.name }; });
    var validSelected = options.some(function(o) { return o.v === selectedCycleId; }) ? selectedCycleId : '';
    _setSelectOptions(cycleSelect, options, validSelected);
}

window._onConnSuperSkillSelect = function(selectEl, key) {
    _setConnCycleOptionsForInline(selectEl ? selectEl.value : '');
};

window._onConnSuperSkillEditSelect = function(selectEl, table, itemId) {
    var row = selectEl ? selectEl.closest('tr') : null;
    _setConnCycleOptionsForEditRow(row, selectEl ? selectEl.value : '', '');
};

// ============================
// INIT
// ============================
(async function() {
    await _waitSB();
    if (!window.supabase) { console.error('[RefGrids] No supabase'); return; }
    console.log('[RefGrids] Init...');
    await _loadAll();
    // Render the default visible panel
    rSS();
    // Render static panels
    rLev(); rVocab(); rSeq(); rDx();
})();
