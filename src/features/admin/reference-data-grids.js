/**
 * Reference Data Grids
 * ====================
 * Loads all data directly from Supabase (adminPage.js keeps most data
 * module-scoped, so we can't read it). Renders grid tables into ref-panels.
 * Inline editable "add row" for all sections.
 */

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
var _ss = [], _sub = [], _th = [], _age = [], _ndis = [], _sedi = [], _fasd = [], _chars = [], _cycles = [], _connections = [];
var _dataLoaded = false;

async function _loadAll() {
    var sb = window.supabase;
    if (!sb) return;
    try {
        var [r1, r2, r3, r4, r5, r6, r7, r8, r9, r10] = await Promise.all([
            sb.from('super_skills').select('*, characters:character_id(id, name, species, personality_nd, image_url)').order('sort_order'),
            sb.from('sub_skills').select('*, super_skills:super_skill_id(id, name, slug, emoji)').order('sort_order'),
            sb.from('core_theories').select('*').eq('is_active', true).order('theory_name'),
            sb.from('age_ranges').select('*').eq('is_active', true).order('age_range'),
            sb.from('ndis_domains').select('*').eq('is_active', true).order('sort_order'),
            sb.from('dss_sedi_categories').select('*').eq('is_active', true).order('sort_order'),
            sb.from('fasd_domains').select('*').eq('is_active', true).order('domain_number'),
            sb.from('characters').select('*').eq('is_active', true).order('sort_order'),
            sb.from('cycles').select('*').order('cycle_number'),
            sb.from('theory_connections').select('*, super_skills:super_skill_id(id, name), cycles:cycle_id(id, cycle_number, name), core_theories:primary_theory_id(id, theory_name)').order('sort_order')
        ]);
        _ss = r1.data || []; _sub = r2.data || []; _th = r3.data || [];
        _age = r4.data || []; _ndis = r5.data || []; _sedi = r6.data || [];
        _fasd = r7.data || []; _chars = r8.data || [];
        _cycles = r9.data || [];
        _connections = r10.data || [];
        _dataLoaded = true;
        console.log('[RefGrids] Loaded:', _ss.length, 'skills,', _sub.length, 'sub-skills,', _th.length, 'theories,', _connections.length, 'connections,', _age.length, 'age bands');
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
    }
};

// --- Sub-tab switching ---
window.switchRefTab = function(ev, id) {
    document.querySelectorAll('.ref-panel').forEach(function(p) { p.style.display = 'none'; });
    document.querySelectorAll('#refDataTabs .ref-tab').forEach(function(b) { b.style.background = '#f8f9fa'; b.style.color = '#405878'; });
    var panel = document.getElementById(id + 'Panel');
    if (panel) panel.style.display = 'block';
    if (ev && ev.target) { ev.target.style.background = '#405878'; ev.target.style.color = 'white'; }
    _render(id);
};

function _render(id) {
    var map = {
        refSuperSkills: rSS, refSubSkills: rSub, refTheories: rTh, refConnections: rConn, refDxProfiles: rDx,
        refNdis: rNdis, refSedi: rSedi, refAgeBands: rAge, refLevels: rLev,
        refVocabulary: rVocab, refSequencing: rSeq, refFasd: rFasd
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
// 10. VOCABULARY (static)
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
var FW = "broken, damaged, wrong, faulty, disordered, deficit, dysfunction, abnormal, sick, diseased, problem brain, bad roads, wrong roads, messed up, not working properly, hard wired, set in stone, permanent";
var FM = "computer, machine, engine, wires, circuits, channels, weather, waves, colours (for emotions), seeds (standalone), driver, passenger, captain, pilot, volume dial, thermostat, meter, garden";

function rVocab() {
    var p = document.getElementById('refVocabularyPanel'); if (!p) return;
    var h = '<h3 style="font-size:16px;margin:0 0 12px;font-weight:700;">🏘️ Brain Town Vocabulary Reference</h3><h4 style="font-size:14px;color:#2a8f8f;margin:0 0 8px;">Approved Core Terms</h4>';
    h += '<div style="overflow-x:auto;margin-bottom:24px;"><table style="width:100%;border-collapse:collapse;font-size:12px;"><thead><tr style="background:#2a8f8f;color:white;">' + TH('Real Concept') + TH('Brain Town Term') + TH('Correct Usage', 'min-width:300px;') + '</tr></thead><tbody>';
    VOC.forEach(function(v, i) { h += '<tr><td style="' + td(i) + '">' + v.r + '</td><td style="' + td(i, 'font-weight:700;color:#2a8f8f;') + '">' + v.b + '</td><td style="' + td(i, 'font-style:italic;') + '">' + v.u + '</td></tr>'; });
    h += '</tbody></table></div><h4 style="font-size:14px;color:#C53030;margin:0 0 8px;">⛔ Forbidden Terms — Auto Critical Fail at Audit</h4><div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;"><div><h5 style="font-size:12px;font-weight:700;margin:0 0 6px;">Forbidden Words</h5><div style="background:#FFF5F5;padding:12px;border-radius:8px;border-left:3px solid #C53030;font-size:12px;line-height:1.8;color:#742A2A;">' + FW + '</div></div><div><h5 style="font-size:12px;font-weight:700;margin:0 0 6px;">Forbidden Metaphors</h5><div style="background:#FFF5F5;padding:12px;border-radius:8px;border-left:3px solid #C53030;font-size:12px;line-height:1.8;color:#742A2A;">' + FM + '</div></div></div>';
    p.innerHTML = h;
}

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
