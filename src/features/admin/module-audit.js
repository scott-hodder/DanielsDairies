/**
 * Module Audit Engine
 * ===================
 * Runs dynamic audit against generated module HTML using rules from database.
 * All data is fetched from the Reference Data tables - nothing is hardcoded.
 *
 * Call: window.runModuleAudit()
 * Requires: window.generatedModuleHTML set by the generator
 */

// ═══ DYNAMIC DATA (loaded from database) ═══
var _auditData = {
    superSkills: [],
    theoryConnections: [],
    ageRanges: [],
    levels: [],
    cycles: [],
    forbiddenWords: [],
    forbiddenMetaphors: [],
    auditSections: [],
    auditRules: [],
    loaded: false
};

// ═══ LOAD ALL AUDIT DATA FROM DATABASE ═══
// ALWAYS fetches fresh data - no caching to ensure rules match admin panel
async function _loadAuditData() {
    // Reset data to ensure fresh fetch
    _auditData = {
        superSkills: [],
        theoryConnections: [],
        ageRanges: [],
        levels: [],
        cycles: [],
        forbiddenWords: [],
        forbiddenMetaphors: [],
        auditSections: [],
        auditRules: [],
        loaded: false
    };
    
    // Always fetch fresh from database to match admin panel exactly
    if (!window.supabase) {
        console.error('[Audit] Supabase not available - cannot load audit data');
        return false;
    }
    
    try {
        console.log('[Audit] Loading data from database...');
        
        var results = await Promise.all([
            window.supabase.from('super_skills').select('*, characters:character_id(id, name, species)').eq('is_active', true),
            window.supabase.from('theory_connections').select('*, super_skills:super_skill_id(id, code), cycles:cycle_id(id, cycle_number, name), core_theories:primary_theory_id(id, theory_name, primary_researchers)').eq('is_active', true),
            window.supabase.from('age_ranges').select('*').eq('is_active', true),
            window.supabase.from('levels').select('*').order('level'),
            window.supabase.from('forbidden_terms').select('term, term_type').eq('is_active', true),
            window.supabase.from('audit_sections').select('*').eq('is_active', true).order('section_number'),
            window.supabase.from('audit_rules').select('*, audit_sections:section_id(id, section_number, section_name)').eq('is_active', true).order('sort_order'),
            window.supabase.from('cycles').select('*').order('cycle_number')
        ]);
        
        if (results[0].data) _auditData.superSkills = results[0].data;
        if (results[1].data) _auditData.theoryConnections = results[1].data;
        if (results[2].data) _auditData.ageRanges = results[2].data;
        if (results[3].data) _auditData.levels = results[3].data;
        if (results[4].data) {
            _auditData.forbiddenWords = results[4].data.filter(f => f.term_type === 'word').map(f => f.term);
            _auditData.forbiddenMetaphors = results[4].data.filter(f => f.term_type === 'metaphor').map(f => f.term);
        }
        if (results[5].data) _auditData.auditSections = results[5].data;
        if (results[6].data) _auditData.auditRules = results[6].data;
        if (results[7].data) _auditData.cycles = results[7].data;
        
        _auditData.loaded = true;
        console.log('[Audit] Loaded:', _auditData.superSkills.length, 'super skills,', _auditData.auditSections.length, 'audit sections,', _auditData.auditRules.length, 'audit rules');
        return true;
        
    } catch (e) {
        console.error('[Audit] Failed to load data:', e);
        return false;
    }
}

// ═══ HELPER FUNCTIONS ═══
function _extractText(html) {
    var d = document.createElement('div');
    d.innerHTML = html;
    return d.textContent || d.innerText || html;
}

function _sc(text, terms) {
    if (!terms || !terms.length) return [];
    var low = text.toLowerCase();
    return terms.filter(function(t) { return low.includes(t.toLowerCase()); });
}

// Get super skill by code or ID
function _getSuperSkill(codeOrId) {
    return _auditData.superSkills.find(s => s.code === codeOrId || s.id === codeOrId);
}

// Get theory connection for a super skill and cycle
function _getTheoryConnection(superSkillId, cycleNumber) {
    return _auditData.theoryConnections.find(tc => {
        var ssMatch = tc.super_skill_id === superSkillId || (tc.super_skills && tc.super_skills.id === superSkillId);
        var cyMatch = (tc.cycles && tc.cycles.cycle_number === cycleNumber);
        return ssMatch && cyMatch;
    });
}

// Get age range by age_range string (e.g. "6-8" or "6to8")
function _getAgeRange(ageStr) {
    var normalized = ageStr.replace(/to/g, '-');
    return _auditData.ageRanges.find(a => {
        var ar = (a.age_range || '').replace(/to/g, '-');
        return ar === normalized || a.display_name === ageStr;
    });
}

// Get level by week number
function _getLevel(weekNumber) {
    return _auditData.levels.find(l => {
        // Handle week_range array format
        if (l.week_range && Array.isArray(l.week_range)) {
            return l.week_range.includes(weekNumber);
        }
        // Handle min_week/max_week format
        if (l.min_week !== undefined && l.max_week !== undefined) {
            return weekNumber >= l.min_week && weekNumber <= l.max_week;
        }
        return false;
    });
}

// Get cycle by number
function _getCycle(cycleNumber) {
    return _auditData.cycles.find(c => c.cycle_number === cycleNumber);
}

// Get audit rules for a section
function _getRulesForSection(sectionId) {
    return _auditData.auditRules.filter(r => r.section_id === sectionId);
}

// ═══ RESOLVE PARAMS FROM FORM ═══
function _getParams() {
    var ssEl = document.getElementById('newModuleSuperSkill');
    var ssId = ssEl?.value || '';
    var ssText = ssEl?.selectedOptions?.[0]?.text || '';
    
    // Find super skill by ID or text match
    var superSkill = _auditData.superSkills.find(s => s.id === ssId) ||
                     _auditData.superSkills.find(s => ssText.includes(s.name));
    var ssCode = superSkill?.code || '';

    // Cycle text is "Cycle 1: Awareness" - extract the number
    var cyText = document.getElementById('newModuleCycle')?.selectedOptions?.[0]?.text || '';
    var cyM = cyText.match(/Cycle\s*(\d+)/i) || cyText.match(/C(\d+)/i);
    var cy = cyM ? parseInt(cyM[1]) : 0;

    var wk = parseInt(document.getElementById('newModuleOrder')?.value) || 0;

    // Age range text is "6-8" or "9-11" etc - extract both numbers
    var ageText = document.getElementById('ageRangeSelect')?.selectedOptions?.[0]?.text || '';
    var agM = ageText.match(/(\d+)\s*[-–—to\s]+\s*(\d+)/i);
    var ag = agM ? agM[1] + '-' + agM[2] : '';

    return { sk: ssCode, ssId: superSkill?.id, cy: cy, wk: wk, ag: ag };
}

// ═══ EXECUTE RULE CHECK ═══
function _executeRuleCheck(rule, text, lower, context) {
    var checkType = rule.check_type;
    var params = rule.check_params || {};
    var passed = true;
    var evidence = '';
    
    // Helper to get value from context based on field name
    function getContextValue(field) {
        switch (field) {
            case 'theory_name':
                return context.theoryConnection?.core_theories?.theory_name || '';
            case 'citation_author':
                var researchers = context.theoryConnection?.core_theories?.primary_researchers || '';
                return researchers.split(',')[0].trim();
            case 'cycle_theme':
                return context.cycle?.name || '';
            case 'character_name':
                return context.superSkill?.characters?.name || '';
            default:
                return '';
        }
    }
    
    switch (checkType) {
        case 'contains_text':
            var searchText = '';
            // Check if we need to get value from context
            if (params.field && params.source === 'context') {
                searchText = getContextValue(params.field);
            } else if (params.text) {
                searchText = params.text;
            } else if (params.terms && params.terms.length > 0) {
                var found = params.terms.filter(t => lower.includes(t.toLowerCase()));
                passed = found.length > 0;
                evidence = passed ? 'Found: ' + found.join(', ') : 'NOT found';
                break;
            }
            
            if (searchText) {
                passed = lower.includes(searchText.toLowerCase());
                evidence = passed ? '"' + searchText + '" found' : '"' + searchText + '" NOT found';
            } else {
                passed = true;
                evidence = 'No search term defined';
            }
            break;
            
        case 'not_contains_text':
            var forbiddenText = params.terms || [];
            var textHits = _sc(text, forbiddenText);
            passed = textHits.length === 0;
            evidence = passed ? 'Clean ✓' : 'FOUND: ' + textHits.join(', ');
            break;
            
        case 'contains_any':
            var anyTerms = params.terms || [];
            var anyFound = anyTerms.filter(t => lower.includes(t.toLowerCase()));
            passed = anyFound.length >= (params.min_count || 1);
            evidence = 'Found ' + anyFound.length + (anyFound.length ? ': ' + anyFound.slice(0, 5).join(', ') : '');
            break;
            
        case 'not_contains_any':
            var notTerms = params.terms || [];
            // Check if we should use forbidden terms from database
            if (params.source === 'forbidden_terms') {
                if (params.term_type === 'word') {
                    notTerms = context.forbiddenWords || [];
                } else if (params.term_type === 'metaphor') {
                    notTerms = context.forbiddenMetaphors || [];
                }
            }
            var notHits = _sc(text, notTerms);
            passed = notHits.length === 0;
            evidence = passed ? 'Clean ✓ (scanned ' + notTerms.length + ')' : 'FOUND: ' + notHits.join(', ');
            break;
            
        case 'min_count':
            var countTerms = params.terms || [];
            var countFound = countTerms.filter(t => lower.includes(t.toLowerCase()));
            var minRequired = params.min || params.min_count || 1;
            passed = countFound.length >= minRequired;
            evidence = 'Found ' + countFound.length + '/' + minRequired + ' required' + (countFound.length ? ': ' + countFound.slice(0, 5).join(', ') : '');
            break;
            
        case 'regex_match':
            try {
                var regex = new RegExp(params.pattern || '', params.flags || 'i');
                passed = regex.test(text);
                evidence = passed ? 'Pattern matched' : 'Pattern NOT matched';
            } catch (e) {
                passed = true;
                evidence = 'Invalid regex - skipped';
            }
            break;
            
        case 'manual_review':
            passed = true;
            evidence = 'Requires human review';
            break;
            
        default:
            passed = true;
            evidence = 'Unknown check type';
    }
    
    return { passed: passed, evidence: evidence };
}

// ═══ MODAL ═══
window.closeAuditModal = function() {
    var m = document.getElementById('auditModal');
    if (m) m.style.display = 'none';
};

// ═══ MAIN AUDIT ═══
window.runModuleAudit = async function() {
    // Load all audit data from database
    var loaded = await _loadAuditData();
    if (!loaded) {
        alert('Could not load audit data from database. Please ensure you are connected.');
        return;
    }
    
    var html = window.generatedModuleHTML;
    if (!html) {
        alert('Please generate a module first.');
        return;
    }

    var p = _getParams();
    if (!p.sk || !p.cy || !p.wk || !p.ag) {
        alert('Cannot determine module parameters.\nPlease ensure Super Skill, Cycle, Week, and Age Band are all selected.');
        return;
    }

    var text = _extractText(html);
    var lower = text.toLowerCase();
    
    // Get context data from database
    var superSkill = _getSuperSkill(p.sk) || _getSuperSkill(p.ssId);
    var theoryConn = _getTheoryConnection(superSkill?.id, p.cy);
    var ageRange = _getAgeRange(p.ag);
    var level = _getLevel(p.wk);
    var cycle = _getCycle(p.cy);
    
    // Build context object for rule checks
    var context = {
        superSkill: superSkill,
        theoryConnection: theoryConn,
        ageRange: ageRange,
        level: level,
        cycle: cycle,
        params: p,
        forbiddenWords: _auditData.forbiddenWords,
        forbiddenMetaphors: _auditData.forbiddenMetaphors
    };

    if (!superSkill) {
        alert('Could not find Super Skill: ' + p.sk);
        return;
    }

    var sections = [];
    
    // Process each audit section from database
    _auditData.auditSections.forEach(function(section) {
        var sectionRules = _getRulesForSection(section.id);
        var checks = [];
        
        // If section has rules, execute them
        if (sectionRules.length > 0) {
            sectionRules.forEach(function(rule) {
                var result = _executeRuleCheck(rule, text, lower, context);
                checks.push({
                    n: rule.rule_number + ' ' + rule.rule_name,
                    p: result.passed,
                    d: rule.description || '',
                    e: result.evidence,
                    r: !result.passed ? (rule.remediation || 'Fix required') : null
                });
            });
        } else {
            // Section has no rules - add placeholder for manual review
            checks.push({
                n: section.section_number + '.1 Manual Review',
                p: true,
                d: section.description || 'No automated rules defined',
                e: 'Requires human audit',
                r: null
            });
        }
        
        sections.push({
            n: section.section_number + '. ' + section.section_name,
            sev: section.severity,
            weight: section.weight,
            checks: checks
        });
    });
    
    // If no sections loaded, show error
    if (sections.length === 0) {
        alert('No audit sections found in database. Please add audit rules in Reference Data.');
        return;
    }

    // ═══ CALCULATE ═══
    var tot = 0, pass = 0, cF = 0, iF = 0, aF = 0;
    var weightedScore = 0, totalWeight = 0;
    
    sections.forEach(function(sec) {
        sec.pc = 0;
        sec.tc = sec.checks.length;
        sec.checks.forEach(function(ch) {
            tot++;
            if (ch.p) {
                pass++;
                sec.pc++;
            } else {
                if (sec.sev === 'CRITICAL') cF++;
                else if (sec.sev === 'IMPORTANT') iF++;
                else aF++;
            }
        });
        sec.pct = Math.round((sec.pc / sec.tc) * 100);
        
        // Calculate weighted score
        var sectionWeight = sec.weight || 10;
        weightedScore += (sec.pct / 100) * sectionWeight;
        totalWeight += sectionWeight;
    });
    
    var pct = totalWeight > 0 ? Math.round((weightedScore / totalWeight) * 100) : Math.round((pass / tot) * 100);
    var verdict, vc;
    
    if (cF > 0) { verdict = 'FAIL'; vc = 'fail'; }
    else if (iF >= 2) { verdict = 'FAIL'; vc = 'fail'; }
    else if (iF > 0) { verdict = 'CONDITIONAL PASS'; vc = 'conditional'; }
    else { verdict = 'PASS'; vc = 'pass'; }

    // ═══ RENDER INTO MODAL ═══
    var col = vc === 'pass' ? '#38A169' : vc === 'conditional' ? '#D69E2E' : '#C53030';
    var bg = vc === 'pass' ? '#F0FFF4' : vc === 'conditional' ? '#FFFFF0' : '#FFF5F5';
    var tcol = vc === 'pass' ? '#22543D' : vc === 'conditional' ? '#744210' : '#C53030';
    
    var mid = p.sk + '-' + p.ag + '-C' + p.cy + '-W' + p.wk;

    var h = '<div style="padding:16px;border-radius:10px;background:' + bg + ';border:2px solid ' + col + ';margin-bottom:14px;display:flex;justify-content:space-between;align-items:center;">';
    h += '<div><div style="font-size:20px;font-weight:800;text-transform:uppercase;color:' + col + ';letter-spacing:1px;">' + verdict + '</div>';
    h += '<div style="font-size:11px;color:#718096;margin-top:2px;">' + mid + ' — ' + new Date().toLocaleDateString('en-AU') + '</div></div>';
    h += '<div style="text-align:right;"><div style="font-size:36px;font-weight:800;font-family:monospace;color:' + col + ';">' + pct + '%</div>';
    h += '<div style="font-size:10px;color:#718096;">' + pass + '/' + tot + ' passed (weighted)</div></div></div>';

    h += '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:14px;">';
    h += '<div style="padding:10px;border-radius:8px;text-align:center;background:#F7FAFC;color:#1B3A5C;"><div style="font-size:22px;font-weight:800;font-family:monospace;">' + tot + '</div><div style="font-size:9px;font-weight:700;text-transform:uppercase;">Total</div></div>';
    h += '<div style="padding:10px;border-radius:8px;text-align:center;background:#F0FFF4;color:#38A169;"><div style="font-size:22px;font-weight:800;font-family:monospace;">' + pass + '</div><div style="font-size:9px;font-weight:700;text-transform:uppercase;">Passed</div></div>';
    h += '<div style="padding:10px;border-radius:8px;text-align:center;background:#FFF5F5;color:#C53030;"><div style="font-size:22px;font-weight:800;font-family:monospace;">' + (cF + iF + aF) + '</div><div style="font-size:9px;font-weight:700;text-transform:uppercase;">Failed</div></div>';
    h += '<div style="padding:10px;border-radius:8px;text-align:center;background:' + (cF > 0 ? '#FFF5F5' : '#F0FFF4') + ';color:' + (cF > 0 ? '#C53030' : '#38A169') + ';"><div style="font-size:22px;font-weight:800;font-family:monospace;">' + cF + '</div><div style="font-size:9px;font-weight:700;text-transform:uppercase;">Critical</div></div>';
    h += '</div>';

    var gi = verdict === 'PASS' ? '✅' : verdict === 'CONDITIONAL PASS' ? '⚠️' : '🛑';
    var gm = verdict === 'PASS' ? '<strong>Ready for human audit.</strong> All automated checks passed.' : verdict === 'CONDITIONAL PASS' ? '<strong>Proceed with flags.</strong> ' + iF + ' important issue(s).' : '<strong>Return to generator.</strong> ' + cF + ' critical failure(s). Fix before saving.';
    h += '<div style="padding:12px 16px;border-radius:10px;margin-bottom:16px;display:flex;align-items:center;gap:10px;font-size:12px;font-weight:600;background:' + bg + ';border:2px solid ' + col + ';color:' + tcol + ';">';
    h += '<span style="font-size:20px;">' + gi + '</span><div>' + gm + '</div></div>';

    sections.forEach(function(sec) {
        var sc = sec.pct === 100 ? '#C6F6D5' : sec.sev === 'CRITICAL' && sec.pct < 100 ? '#FED7D7' : '#FEFCBF';
        var st = sec.pct === 100 ? '#22543D' : sec.sev === 'CRITICAL' && sec.pct < 100 ? '#C53030' : '#744210';
        var sv = sec.sev === 'CRITICAL' ? '#FED7D7' : sec.sev === 'IMPORTANT' ? '#FEFCBF' : '#E2E8F0';
        var svt = sec.sev === 'CRITICAL' ? '#C53030' : sec.sev === 'IMPORTANT' ? '#744210' : '#718096';
        var open = sec.pct < 100;

        h += '<div style="background:#fff;border-radius:8px;border:1px solid #E2E8F0;margin-bottom:8px;overflow:hidden;">';
        h += '<div style="padding:10px 14px;display:flex;justify-content:space-between;align-items:center;cursor:pointer;" onclick="var b=this.nextElementSibling;b.style.display=b.style.display===\'none\'?\'block\':\'none\';">';
        h += '<div style="font-size:12px;font-weight:700;color:#1B3A5C;display:flex;align-items:center;gap:8px;">';
        h += '<span style="padding:2px 7px;border-radius:4px;font-size:9px;font-weight:800;text-transform:uppercase;background:' + sv + ';color:' + svt + ';">' + sec.sev + '</span>';
        h += '<span style="padding:2px 6px;border-radius:4px;font-size:9px;font-weight:600;background:#E2E8F0;color:#4A5568;">' + (sec.weight || 10) + '%</span>';
        h += sec.n + '</div>';
        h += '<span style="padding:3px 10px;border-radius:5px;font-size:11px;font-weight:700;font-family:monospace;background:' + sc + ';color:' + st + ';">' + sec.pc + '/' + sec.tc + ' — ' + sec.pct + '%</span>';
        h += '</div>';
        h += '<div style="display:' + (open ? 'block' : 'none') + ';padding:0 14px 12px;">';
        sec.checks.forEach(function(ch) {
            h += '<div style="display:flex;gap:10px;padding:6px 0;border-bottom:1px solid #E2E8F0;">';
            h += '<span style="font-size:14px;flex-shrink:0;">' + (ch.p ? '✅' : '❌') + '</span>';
            h += '<div style="flex:1;"><div style="font-size:12px;font-weight:600;">' + ch.n + '</div>';
            h += '<div style="font-size:11px;color:#718096;margin-top:1px;">' + ch.d + '</div>';
            if (ch.e) h += '<div style="font-size:10px;color:#2A8F8F;margin-top:2px;background:#F7FAFC;padding:3px 6px;border-radius:3px;font-style:italic;">' + ch.e + '</div>';
            if (ch.r) h += '<div style="font-size:10px;color:#C53030;margin-top:2px;background:#FFF5F5;padding:3px 6px;border-radius:3px;font-weight:500;">' + ch.r + '</div>';
            h += '</div></div>';
        });
        h += '</div></div>';
    });

    var container = document.getElementById('auditResultsContainer');
    if (container) container.innerHTML = h;

    // Store failed checks for the Fix Errors feature
    window._lastAuditFailures = [];
    sections.forEach(function(sec) {
        sec.checks.forEach(function(ch) {
            if (!ch.p) {
                window._lastAuditFailures.push({
                    section: sec.n,
                    severity: sec.sev,
                    rule: ch.n,
                    description: ch.d,
                    evidence: ch.e,
                    remediation: ch.r
                });
            }
        });
    });

    // Show/hide the Fix Errors button based on failures
    var fixBtn = document.getElementById('auditFixErrorsBtn');
    if (fixBtn) {
        fixBtn.style.display = window._lastAuditFailures.length > 0 ? '' : 'none';
    }

    var modal = document.getElementById('auditModal');
    if (modal) modal.style.display = 'flex';
};

// ═══ FIX ERRORS FEATURE ═══

window.openFixErrorsModal = function() {
    var failures = window._lastAuditFailures || [];
    if (failures.length === 0) {
        alert('No errors to fix! The audit passed.');
        return;
    }

    // Populate the error list
    var listEl = document.getElementById('fixErrorsList');
    if (listEl) {
        listEl.innerHTML = failures.map(function(f) {
            var sevColor = f.severity === 'CRITICAL' ? '#C53030' : f.severity === 'IMPORTANT' ? '#D69E2E' : '#718096';
            var sevBg = f.severity === 'CRITICAL' ? '#FFF5F5' : f.severity === 'IMPORTANT' ? '#FFFFF0' : '#F7FAFC';
            return '<div style="padding:8px 10px; border-bottom:1px solid #E2E8F0; display:flex; gap:8px; align-items:flex-start;">' +
                '<span style="font-size:13px; flex-shrink:0;">❌</span>' +
                '<div style="flex:1; min-width:0;">' +
                    '<div style="display:flex; align-items:center; gap:6px; margin-bottom:2px;">' +
                        '<span style="padding:1px 6px; border-radius:3px; font-size:9px; font-weight:800; text-transform:uppercase; background:' + sevBg + '; color:' + sevColor + ';">' + f.severity + '</span>' +
                        '<span style="font-size:11px; font-weight:600; color:#1B3A5C;">' + f.rule + '</span>' +
                    '</div>' +
                    '<div style="font-size:11px; color:#718096;">' + f.description + '</div>' +
                    (f.evidence ? '<div style="font-size:10px; color:#C53030; margin-top:2px;">' + f.evidence + '</div>' : '') +
                    (f.remediation ? '<div style="font-size:10px; color:#7b3ff2; margin-top:2px; font-weight:500;">' + f.remediation + '</div>' : '') +
                '</div>' +
            '</div>';
        }).join('');
    }

    // Clear custom instructions
    var customInput = document.getElementById('fixErrorsCustomInstructions');
    if (customInput) customInput.value = '';

    // Reset status
    var statusEl = document.getElementById('fixErrorsStatus');
    if (statusEl) statusEl.style.display = 'none';

    // Reset submit button
    var submitBtn = document.getElementById('fixErrorsSubmitBtn');
    if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = '🛠️ Fix Errors with AI';
    }

    // Show the modal
    var fixModal = document.getElementById('fixErrorsModal');
    if (fixModal) fixModal.style.display = 'flex';
};

window.closeFixErrorsModal = function() {
    var fixModal = document.getElementById('fixErrorsModal');
    if (fixModal) fixModal.style.display = 'none';
};

window.executeFixErrors = async function() {
    var failures = window._lastAuditFailures || [];
    var html = window.generatedModuleHTML;
    var customInstructions = (document.getElementById('fixErrorsCustomInstructions')?.value || '').trim();
    var submitBtn = document.getElementById('fixErrorsSubmitBtn');
    var statusEl = document.getElementById('fixErrorsStatus');

    if (!html) {
        alert('No generated module HTML found.');
        return;
    }
    if (failures.length === 0) {
        alert('No errors to fix.');
        return;
    }

    // Disable button and show loading
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = '⏳ Fixing errors...';
    }
    if (statusEl) {
        statusEl.style.display = 'block';
        statusEl.style.background = '#EBF8FF';
        statusEl.style.color = '#2A8F8F';
        statusEl.textContent = '🔄 Sending to AI for fixing... This may take 1-3 minutes.';
    }

    try {
        // Get Claude API key from settings table (single-row table with claude_api_key column)
        var apiKey = null;
        if (window.supabase) {
            var result = await window.supabase
                .from('settings')
                .select('claude_api_key')
                .single();
            if (result.data && result.data.claude_api_key) {
                apiKey = result.data.claude_api_key;
            }
        }

        if (!apiKey) {
            throw new Error('Could not retrieve Claude API key from settings table. Ensure the claude_api_key column has a value.');
        }

        // Build the error description for the prompt
        var errorDescriptions = failures.map(function(f, i) {
            return (i + 1) + '. [' + f.severity + '] ' + f.rule + '\n   ' + f.description +
                (f.evidence ? '\n   Evidence: ' + f.evidence : '') +
                (f.remediation ? '\n   Fix: ' + f.remediation : '');
        }).join('\n\n');

        // Build the fix prompt
        var systemPrompt = 'You are an expert HTML module editor for a children\'s therapeutic education platform called Daniel\'s Diaries. ' +
            'Your job is to fix specific audit failures in the generated HTML module WITHOUT changing the overall structure, design, page count, or working content. ' +
            'Only make the minimum changes needed to pass the failing audit checks.\n\n' +
            'RULES:\n' +
            '1. Return ONLY the complete fixed HTML. No explanations, no markdown, just the raw HTML document.\n' +
            '2. Do NOT remove or restructure pages that are already working.\n' +
            '3. Do NOT change CSS styles, JavaScript logic, or the page navigation system.\n' +
            '4. Focus ONLY on content text changes needed to pass the failing checks.\n' +
            '5. Use Australian English spelling throughout.\n' +
            '6. Never use deficit or pathologising language.\n' +
            '7. Preserve all data-page attributes, onclick handlers, and interactive elements exactly as they are.';

        var userPrompt = 'Here is the current module HTML that has audit failures:\n\n' +
            '--- FAILING AUDIT CHECKS ---\n' + errorDescriptions + '\n\n' +
            (customInstructions ? '--- CUSTOM INSTRUCTIONS ---\n' + customInstructions + '\n\n' : '') +
            '--- CURRENT HTML ---\n' + html + '\n\n' +
            'Please fix ONLY the failing audit checks listed above. Return the complete fixed HTML.';

        // Call Claude API directly
        var response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
                'anthropic-dangerous-direct-browser-access': 'true'
            },
            body: JSON.stringify({
                model: 'claude-sonnet-4-20250514',
                max_tokens: 64000,
                system: systemPrompt,
                messages: [
                    { role: 'user', content: userPrompt }
                ]
            })
        });

        if (!response.ok) {
            var errorText = await response.text();
            throw new Error('Claude API error (' + response.status + '): ' + errorText);
        }

        var data = await response.json();
        var fixedContent = '';
        if (data.content && Array.isArray(data.content)) {
            for (var i = 0; i < data.content.length; i++) {
                if (data.content[i].type === 'text') {
                    fixedContent += data.content[i].text;
                }
            }
        }

        // Strip any markdown wrapping if present
        fixedContent = fixedContent.trim();
        if (fixedContent.startsWith('```html')) {
            fixedContent = fixedContent.replace(/^```html\s*\n?/, '').replace(/\n?```\s*$/, '');
        } else if (fixedContent.startsWith('```')) {
            fixedContent = fixedContent.replace(/^```\s*\n?/, '').replace(/\n?```\s*$/, '');
        }

        // Validate we got HTML back
        if (!fixedContent || (!fixedContent.includes('<!DOCTYPE') && !fixedContent.includes('<html') && !fixedContent.includes('<head'))) {
            throw new Error('AI did not return valid HTML. The response may have been too long or malformed.');
        }

        // Apply the fix
        window.generatedModuleHTML = fixedContent;

        // Update the preview textarea if it exists
        var previewTextarea = document.getElementById('aiGeneratedPreview');
        if (previewTextarea) previewTextarea.value = fixedContent;

        // Update the inline preview
        if (typeof loadInlinePreview === 'function') {
            setTimeout(loadInlinePreview, 200);
        }

        // Update character count in summary
        var previewSummary = document.getElementById('aiGeneratedSummary');
        if (previewSummary) {
            var pageCount = (fixedContent.match(/data-page="/g) || []).length;
            var charCount = fixedContent.length;
            previewSummary.textContent = 'Approx. ' + (pageCount || '??') + ' pages \u2022 ' + charCount.toLocaleString() + ' characters (fixed)';
        }

        // Show success
        if (statusEl) {
            statusEl.style.background = '#F0FFF4';
            statusEl.style.color = '#22543D';
            statusEl.textContent = '✅ Errors fixed! Close this modal and run the audit again to verify.';
        }
        if (submitBtn) {
            submitBtn.textContent = '✅ Fixed!';
        }

    } catch (error) {
        console.error('[Fix Errors] Error:', error);
        if (statusEl) {
            statusEl.style.display = 'block';
            statusEl.style.background = '#FFF5F5';
            statusEl.style.color = '#C53030';
            statusEl.textContent = '❌ Fix failed: ' + error.message;
        }
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = '🛠️ Fix Errors with AI';
        }
    }
};