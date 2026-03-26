// ================================================================================
// REFERENCE DATA TAB - Theories, age ranges, super skills, sub-skills,
//                      FASD domains, NDIS domains (Theories tab)
// ================================================================================
import {
    supabase,
    theoriesData, setTheoriesData, selectedTheoryId, setSelectedTheoryId,
    ageRangesTheoriesData, setAgeRangesTheoriesData, selectedAgeRangeId, setSelectedAgeRangeId,
    superSkillsTheoriesData, setSuperSkillsTheoriesData, selectedSuperSkillTheoriesId, setSelectedSuperSkillTheoriesId,
    subSkillsTheoriesData, setSubSkillsTheoriesData, selectedSubSkillTheoriesId, setSelectedSubSkillTheoriesId
} from './adminPage.js';

// FASD & NDIS local state
let fasdDomainsTheoriesData = [];
let selectedFasdDomainId = null;
let ndisDomainsTheoriesData = [];
let selectedNdisDomainId = null;

// ================================================================================
// THEORIES (Core Theories editor)
// ================================================================================
function buildTheoryCode(name) {
    const base = name.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'THEORY';
    let code = base; let counter = 1;
    const existingCodes = new Set((theoriesData || []).map(t => t.theory_code));
    while (existingCodes.has(code)) { counter += 1; code = `${base}_${counter}`; }
    return code;
}

async function loadTheories() {
    const { data, error } = await supabase.from('core_theories').select('*').order('theory_name');
    if (error) { console.error('[Admin] Error loading theories:', error); return; }
    setTheoriesData(data || []);
    const select = document.getElementById('theorySelect');
    if (select) {
        select.innerHTML = '<option value="">Select a theory...</option>';
        theoriesData.forEach(theory => { const o = document.createElement('option'); o.value = theory.id; o.textContent = theory.theory_name; select.appendChild(o); });
        if (selectedTheoryId) select.value = selectedTheoryId;
    }
    if (selectedTheoryId) selectTheory(selectedTheoryId);
}
window._adminLoadTheories = loadTheories;

window.selectTheory = function(theoryId) {
    setSelectedTheoryId(theoryId);
    const theory = theoriesData.find(t => t.id === theoryId);
    const editor = document.getElementById('theoryEditor');
    const placeholder = document.getElementById('theoryEditorPlaceholder');
    if (!theory) { if (editor) editor.style.display = 'none'; if (placeholder) placeholder.style.display = 'block'; return; }
    if (editor) editor.style.display = 'block';
    if (placeholder) placeholder.style.display = 'none';
    document.getElementById('theoryName').value = theory.theory_name || '';
    document.getElementById('theoryCode').value = theory.theory_code || '';
    const isActiveEl = document.getElementById('theoryIsActive'); if (isActiveEl) isActiveEl.checked = theory.is_active !== false;
    document.getElementById('theoryDescription').value = theory.description || '';
    const categoryEl = document.getElementById('theoryCategory'); if (categoryEl) categoryEl.value = theory.category || '';
    const researchersEl = document.getElementById('theoryPrimaryResearchers'); if (researchersEl) researchersEl.value = theory.primary_researchers || '';
};

window.saveTheoryChanges = async function() {
    if (!selectedTheoryId) return;
    const updates = {
        theory_name: document.getElementById('theoryName').value.trim(),
        theory_code: document.getElementById('theoryCode').value.trim(),
        is_active: document.getElementById('theoryIsActive')?.checked !== false,
        description: document.getElementById('theoryDescription').value.trim() || null,
        category: document.getElementById('theoryCategory')?.value || null,
        primary_researchers: document.getElementById('theoryPrimaryResearchers')?.value?.trim() || null
    };
    if (!updates.theory_name) { alert('Theory name is required.'); return; }
    const { error } = await supabase.from('core_theories').update(updates).eq('id', selectedTheoryId);
    if (error) { console.error('[Admin] Error saving theory:', error); alert('Failed to save.'); return; }
    alert('✅ Theory saved!');
    await loadTheories();
};

window.deleteTheory = async function() {
    if (!selectedTheoryId) return;
    const theory = theoriesData.find(t => t.id === selectedTheoryId);
    if (!theory || !confirm(`Delete "${theory.theory_name}"?`)) return;
    const { error } = await supabase.from('core_theories').delete().eq('id', selectedTheoryId);
    if (error) { alert('Failed to delete.'); return; }
    setSelectedTheoryId(null);
    await loadTheories();
    const editor = document.getElementById('theoryEditor');
    const placeholder = document.getElementById('theoryEditorPlaceholder');
    if (editor) editor.style.display = 'none';
    if (placeholder) placeholder.style.display = 'block';
};

window.addNewTheory = function() {
    document.getElementById('addTheoryModal')?.classList.add('active');
};
window.closeAddTheoryModal = function() {
    document.getElementById('addTheoryModal')?.classList.remove('active');
};
window.saveNewTheory = async function(event) {
    event.preventDefault();
    const name = document.getElementById('newTheoryName')?.value.trim();
    if (!name) { alert('Theory name is required.'); return; }
    const code = buildTheoryCode(name);
    const { data, error } = await supabase.from('core_theories').insert({ theory_name: name, theory_code: code, description: document.getElementById('newTheoryDescription')?.value.trim() || '', category: document.getElementById('newTheoryCategory')?.value || null, is_active: true }).select().single();
    if (error) { alert('Failed to add theory.'); return; }
    window.closeAddTheoryModal();
    setSelectedTheoryId(data?.id || null);
    await loadTheories();
    if (selectedTheoryId) selectTheory(selectedTheoryId);
    alert('✅ Theory added!');
};

// ================================================================================
// AGE RANGES (Theories tab)
// ================================================================================
async function loadAgeRangesTheories() {
    const { data, error } = await supabase.from('age_ranges').select('*').eq('is_active', true).order('age_range');
    if (error) { console.error('[Admin] Error loading age ranges:', error); return; }
    setAgeRangesTheoriesData(data || []);
    const select = document.getElementById('ageRangeSelectTheories');
    if (select) {
        select.innerHTML = '<option value="">Select an age range...</option>';
        ageRangesTheoriesData.forEach(ar => { const o = document.createElement('option'); o.value = ar.id; o.textContent = `${ar.display_name} (${ar.age_range})`; select.appendChild(o); });
        if (selectedAgeRangeId) select.value = selectedAgeRangeId;
    }
    if (selectedAgeRangeId) selectAgeRange(selectedAgeRangeId);
}
window._adminLoadAgeRangesTheories = loadAgeRangesTheories;

window.selectAgeRange = function(ageRangeId) {
    setSelectedAgeRangeId(ageRangeId);
    const ageRange = ageRangesTheoriesData.find(ar => ar.id === ageRangeId);
    const editor = document.getElementById('ageRangeEditor');
    const placeholder = document.getElementById('ageRangeEditorPlaceholder');
    if (!ageRange) { if (editor) editor.style.display = 'none'; if (placeholder) placeholder.style.display = 'block'; return; }
    if (editor) editor.style.display = 'block'; if (placeholder) placeholder.style.display = 'none';
    document.getElementById('ageRangeDisplayName').value = ageRange.display_name || '';
    document.getElementById('ageRangeCode').value = ageRange.age_range || '';
    document.getElementById('ageRangeIsActive').checked = ageRange.is_active !== false;
    document.getElementById('ageRangeLanguageGuidelines').value = ageRange.language_guidelines || '';
    document.getElementById('ageRangeDevelopmentalStage').value = ageRange.developmental_stage || '';
};

window.addNewAgeRange = function() {
    document.getElementById('addAgeRangeModal').classList.add('active');
    document.getElementById('newAgeRangeDisplayName').value = '';
    document.getElementById('newAgeRangeCode').value = '';
    document.getElementById('newAgeRangeLanguageGuidelines').value = '';
    document.getElementById('newAgeRangeDevelopmentalStage').value = '';
    document.getElementById('newAgeRangeDisplayName').focus();
};
window.closeAddAgeRangeModal = function() { document.getElementById('addAgeRangeModal').classList.remove('active'); };

window.saveNewAgeRange = async function(event) {
    event.preventDefault();
    const displayName = document.getElementById('newAgeRangeDisplayName').value.trim();
    const ageRangeCode = document.getElementById('newAgeRangeCode').value.trim();
    if (!displayName || !ageRangeCode) { alert('Display name and age range code are required.'); return; }
    const { data, error } = await supabase.from('age_ranges').insert({ age_range: ageRangeCode, display_name: displayName, language_guidelines: document.getElementById('newAgeRangeLanguageGuidelines').value.trim() || '', developmental_stage: document.getElementById('newAgeRangeDevelopmentalStage').value.trim() || '', is_active: true }).select().single();
    if (error) { alert('Failed to add age range.'); return; }
    window.closeAddAgeRangeModal();
    setSelectedAgeRangeId(data?.id || null);
    await loadAgeRangesTheories();
    if (selectedAgeRangeId) selectAgeRange(selectedAgeRangeId);
    alert('✅ Age range added!');
};

window.saveAgeRangeChanges = async function() {
    if (!selectedAgeRangeId) return;
    const updates = { display_name: document.getElementById('ageRangeDisplayName').value.trim(), age_range: document.getElementById('ageRangeCode').value.trim(), is_active: document.getElementById('ageRangeIsActive').checked, language_guidelines: document.getElementById('ageRangeLanguageGuidelines').value.trim() || null, developmental_stage: document.getElementById('ageRangeDevelopmentalStage').value.trim() || null };
    if (!updates.display_name || !updates.age_range) { alert('Display name and age range code are required.'); return; }
    const { error } = await supabase.from('age_ranges').update(updates).eq('id', selectedAgeRangeId);
    if (error) { alert('Failed to save.'); return; }
    alert('✅ Age range saved!');
    await loadAgeRangesTheories();
};

// ================================================================================
// SUPER SKILLS (Theories tab)
// ================================================================================
async function loadSuperSkillsTheories() {
    const { data, error } = await supabase.from('super_skills').select('*').order('name');
    if (error) { console.error('[Admin] Error loading super skills:', error); return; }
    setSuperSkillsTheoriesData(data || []);
    const select = document.getElementById('superSkillSelectTheories');
    if (select) {
        select.innerHTML = '<option value="">Select a super skill...</option>';
        superSkillsTheoriesData.forEach(ss => { const o = document.createElement('option'); o.value = ss.id; o.textContent = ss.name; select.appendChild(o); });
        if (selectedSuperSkillTheoriesId) select.value = selectedSuperSkillTheoriesId;
    }
    const parentSelect = document.getElementById('subSkillParentTheories');
    if (parentSelect) {
        parentSelect.innerHTML = '<option value="">Select Super Skill...</option>';
        superSkillsTheoriesData.forEach(ss => { const o = document.createElement('option'); o.value = ss.id; o.textContent = ss.name; parentSelect.appendChild(o); });
    }
    if (selectedSuperSkillTheoriesId) selectSuperSkillTheories(selectedSuperSkillTheoriesId);
    renderSuperSkillsTheoriesGrid();
}
window._adminLoadSuperSkillsTheories = loadSuperSkillsTheories;

function renderSuperSkillsTheoriesGrid() {
    const container = document.getElementById('superSkillsTheoriesGrid');
    if (!container) return;
    const skills = superSkillsTheoriesData || [];
    if (skills.length === 0) { container.innerHTML = '<div style="background: white; border-radius: 8px; padding: 20px; text-align: center; color: #6b7c8f;">No super skills added yet</div>'; return; }
    container.innerHTML = `<div style="background: white; border-radius: 8px; overflow: hidden; border: 1px solid #e5e7eb; width: 100%;"><table style="width: 100%; border-collapse: collapse; table-layout: fixed;"><thead><tr style="background: #f8f9fa; border-bottom: 2px solid #e5e7eb;"><th style="padding: 12px; text-align: left; font-size: 13px; font-weight: 700; width: 60px;"></th><th style="padding: 12px; text-align: left; font-size: 13px; font-weight: 700; width: 180px;">Name</th><th style="padding: 12px; text-align: left; font-size: 13px; font-weight: 700;">Character</th><th style="padding: 12px; text-align: center; font-size: 13px; font-weight: 700; width: 80px;">Active</th><th style="padding: 12px; text-align: center; font-size: 13px; font-weight: 700; width: 100px;">Actions</th></tr></thead><tbody>${skills.map(skill => `<tr style="border-bottom: 1px solid #e5e7eb; cursor: pointer;" onclick="selectSuperSkillTheories('${skill.id}')"><td style="padding: 12px; font-size: 20px; text-align: center;">${skill.emoji || '🎯'}</td><td style="padding: 12px; font-size: 13px; font-weight: 600;">${skill.name}</td><td style="padding: 12px; font-size: 12px; color: #6b7c8f;">${skill.character_name || '-'}</td><td style="padding: 12px; text-align: center;">${skill.is_active ? '✅' : '❌'}</td><td style="padding: 12px; text-align: center;"><button onclick="event.stopPropagation(); selectSuperSkillTheories('${skill.id}')" style="background: #6366F1; color: white; border: none; border-radius: 4px; padding: 4px 12px; font-size: 12px; cursor: pointer;">Edit</button></td></tr>`).join('')}</tbody></table></div>`;
}

window.selectSuperSkillTheories = function(ssId) {
    setSelectedSuperSkillTheoriesId(ssId);
    const ss = superSkillsTheoriesData.find(s => s.id === ssId);
    const editor = document.getElementById('superSkillEditorTheories');
    const placeholder = document.getElementById('superSkillEditorPlaceholderTheories');
    if (!ss) { if (editor) editor.style.display = 'none'; if (placeholder) placeholder.style.display = 'block'; return; }
    if (editor) editor.style.display = 'block'; if (placeholder) placeholder.style.display = 'none';
    document.getElementById('superSkillNameTheories').value = ss.name || '';
    document.getElementById('superSkillIsActiveTheories').checked = ss.is_active !== false;
    document.getElementById('superSkillDescriptionTheories').value = ss.description || '';
    document.getElementById('superSkillRelevantTheories').value = ss.relevant_theories || '';
};

window.saveSuperSkillTheoriesChanges = async function() {
    if (!selectedSuperSkillTheoriesId) return;
    const updates = { name: document.getElementById('superSkillNameTheories').value.trim(), is_active: document.getElementById('superSkillIsActiveTheories').checked, description: document.getElementById('superSkillDescriptionTheories').value.trim() || null, relevant_theories: document.getElementById('superSkillRelevantTheories').value.trim() || null };
    if (!updates.name) { alert('Name is required.'); return; }
    const { error } = await supabase.from('super_skills').update(updates).eq('id', selectedSuperSkillTheoriesId);
    if (error) { alert('Failed to save.'); return; }
    alert('✅ Super skill saved!');
    await loadSuperSkillsTheories();
};

window.deleteSuperSkillTheories = async function() {
    if (!selectedSuperSkillTheoriesId) return;
    const ss = superSkillsTheoriesData.find(s => s.id === selectedSuperSkillTheoriesId);
    if (!ss || !confirm(`Delete "${ss.name}"?`)) return;
    const { error } = await supabase.from('super_skills').delete().eq('id', selectedSuperSkillTheoriesId);
    if (error) { alert('Failed to delete.'); return; }
    setSelectedSuperSkillTheoriesId(null);
    await loadSuperSkillsTheories();
};

window.addNewSuperSkillTheories = function() {
    document.getElementById('addSuperSkillTheoriesModal').classList.add('active');
};
window.closeAddSuperSkillTheoriesModal = function() {
    document.getElementById('addSuperSkillTheoriesModal').classList.remove('active');
};
window.saveNewSuperSkillTheories = async function(event) {
    event.preventDefault();
    const name = document.getElementById('newSuperSkillTheoriesName')?.value.trim();
    if (!name) { alert('Name is required.'); return; }
    const { data, error } = await supabase.from('super_skills').insert({ name, description: document.getElementById('newSuperSkillTheoriesDescription')?.value.trim() || '', relevant_theories: document.getElementById('newSuperSkillTheoriesRelevantTheories')?.value.trim() || '', is_active: true }).select().single();
    if (error) { alert('Failed to add.'); return; }
    window.closeAddSuperSkillTheoriesModal();
    setSelectedSuperSkillTheoriesId(data?.id || null);
    await loadSuperSkillsTheories();
    alert('✅ Super skill added!');
};

// ================================================================================
// SUB-SKILLS (Theories tab)
// ================================================================================
async function loadSubSkillsTheories() {
    const { data, error } = await supabase.from('sub_skills').select('*, super_skills(name)').order('name');
    if (error) { console.error('[Admin] Error loading sub-skills:', error); return; }
    setSubSkillsTheoriesData(data || []);
    window.subSkillsTheoriesData = data || [];
    const select = document.getElementById('subSkillSelectTheories');
    if (select) {
        select.innerHTML = '<option value="">Select a sub-skill...</option>';
        subSkillsTheoriesData.forEach(ss => { const o = document.createElement('option'); o.value = ss.id; o.textContent = `${ss.name}${ss.super_skills ? ` (${ss.super_skills.name})` : ''}`; select.appendChild(o); });
        if (selectedSubSkillTheoriesId) select.value = selectedSubSkillTheoriesId;
    }
    if (selectedSubSkillTheoriesId) selectSubSkillTheories(selectedSubSkillTheoriesId);
}
window._adminLoadSubSkillsTheories = loadSubSkillsTheories;

window.selectSubSkillTheories = function(subSkillId) {
    setSelectedSubSkillTheoriesId(subSkillId);
    const subSkill = subSkillsTheoriesData.find(ss => ss.id === subSkillId);
    const editor = document.getElementById('subSkillEditorTheories');
    const placeholder = document.getElementById('subSkillEditorPlaceholderTheories');
    if (!subSkill) { if (editor) editor.style.display = 'none'; if (placeholder) placeholder.style.display = 'block'; return; }
    if (editor) editor.style.display = 'block'; if (placeholder) placeholder.style.display = 'none';
    document.getElementById('subSkillNameTheories').value = subSkill.name || '';
    document.getElementById('subSkillParentTheories').value = subSkill.super_skill_id || '';
    document.getElementById('subSkillIsActiveTheories').checked = subSkill.is_active !== false;
    document.getElementById('subSkillDescriptionTheories').value = subSkill.description || '';
};

window.addNewSubSkillTheories = function() {
    document.getElementById('addSubSkillTheoriesModal').classList.add('active');
    document.getElementById('newSubSkillTheoriesName').value = '';
    document.getElementById('newSubSkillTheoriesDescription').value = '';
    const parentSelect = document.getElementById('newSubSkillTheoriesParent');
    parentSelect.innerHTML = '<option value="">Select Super Skill...</option>';
    superSkillsTheoriesData.forEach(ss => { const o = document.createElement('option'); o.value = ss.id; o.textContent = ss.name; parentSelect.appendChild(o); });
    document.getElementById('newSubSkillTheoriesName').focus();
};
window.closeAddSubSkillTheoriesModal = function() { document.getElementById('addSubSkillTheoriesModal').classList.remove('active'); };

window.saveNewSubSkillTheories = async function(event) {
    event.preventDefault();
    const name = document.getElementById('newSubSkillTheoriesName').value.trim();
    if (!name) { alert('Sub-skill name is required.'); return; }
    const { data, error } = await supabase.from('sub_skills').insert({ name, super_skill_id: document.getElementById('newSubSkillTheoriesParent').value || null, description: document.getElementById('newSubSkillTheoriesDescription').value.trim() || '', is_active: true }).select().single();
    if (error) { alert('Failed to add sub-skill.'); return; }
    window.closeAddSubSkillTheoriesModal();
    setSelectedSubSkillTheoriesId(data?.id || null);
    await loadSubSkillsTheories();
    alert('✅ Sub-skill added!');
};

window.saveSubSkillTheoriesChanges = async function() {
    if (!selectedSubSkillTheoriesId) return;
    const updates = { name: document.getElementById('subSkillNameTheories').value.trim(), super_skill_id: document.getElementById('subSkillParentTheories').value || null, is_active: document.getElementById('subSkillIsActiveTheories').checked, description: document.getElementById('subSkillDescriptionTheories').value.trim() || null };
    if (!updates.name) { alert('Sub-skill name is required.'); return; }
    const { error } = await supabase.from('sub_skills').update(updates).eq('id', selectedSubSkillTheoriesId);
    if (error) { alert('Failed to save.'); return; }
    alert('✅ Sub-skill saved!');
    await loadSubSkillsTheories();
};

window.deleteSubSkillTheories = async function() {
    if (!selectedSubSkillTheoriesId) return;
    const ss = subSkillsTheoriesData.find(s => s.id === selectedSubSkillTheoriesId);
    if (!ss || !confirm(`Delete "${ss.name}"?`)) return;
    const { error } = await supabase.from('sub_skills').delete().eq('id', selectedSubSkillTheoriesId);
    if (error) { alert('Failed to delete.'); return; }
    setSelectedSubSkillTheoriesId(null);
    await loadSubSkillsTheories();
    const editor = document.getElementById('subSkillEditorTheories');
    const placeholder = document.getElementById('subSkillEditorPlaceholderTheories');
    if (editor) editor.style.display = 'none';
    if (placeholder) placeholder.style.display = 'block';
};

// ================================================================================
// FASD DOMAINS
// ================================================================================
async function loadFasdDomainsTheories() {
    const { data, error } = await supabase.from('fasd_domains').select('*').order('domain_number');
    if (error) { console.error('[Admin] Error loading FASD domains:', error); return; }
    fasdDomainsTheoriesData = data || [];
    const select = document.getElementById('fasdDomainSelectTheories');
    if (select) {
        select.innerHTML = '<option value="">Select a FASD domain...</option>';
        fasdDomainsTheoriesData.forEach(d => { const o = document.createElement('option'); o.value = d.id; o.textContent = `${d.domain_number || ''} ${d.domain_name}`; select.appendChild(o); });
    }
    renderFasdDomainsGrid();
}
window._adminLoadFasdDomainsTheories = loadFasdDomainsTheories;

function renderFasdDomainsGrid() {
    const container = document.getElementById('fasdDomainsTheoriesGrid');
    if (!container) return;
    if (fasdDomainsTheoriesData.length === 0) { container.innerHTML = '<div style="text-align: center; color: #6b7c8f; padding: 20px;">No FASD domains yet</div>'; return; }
    container.innerHTML = `<div style="background: white; border-radius: 8px; overflow: hidden; border: 1px solid #e5e7eb;"><table style="width: 100%; border-collapse: collapse;"><thead><tr style="background: #f8f9fa;"><th style="padding: 12px; text-align: left; font-size: 13px;">#</th><th style="padding: 12px; text-align: left; font-size: 13px;">Domain</th><th style="padding: 12px; text-align: left; font-size: 13px;">Description</th><th style="padding: 12px; text-align: center; width: 100px;">Actions</th></tr></thead><tbody>${fasdDomainsTheoriesData.map(d => `<tr style="border-bottom: 1px solid #e5e7eb; cursor: pointer;" onclick="selectFasdDomain('${d.id}')"><td style="padding: 12px;">${d.domain_number || ''}</td><td style="padding: 12px; font-weight: 600;">${d.domain_name}</td><td style="padding: 12px; font-size: 12px; color: #6b7c8f;">${d.description || ''}</td><td style="padding: 12px; text-align: center;"><button onclick="event.stopPropagation(); selectFasdDomain('${d.id}')" style="background: #6366F1; color: white; border: none; border-radius: 4px; padding: 4px 12px; font-size: 12px; cursor: pointer;">Edit</button></td></tr>`).join('')}</tbody></table></div>`;
}

window.selectFasdDomain = function(domainId) {
    selectedFasdDomainId = domainId;
    const domain = fasdDomainsTheoriesData.find(d => d.id === domainId);
    const editor = document.getElementById('fasdDomainEditor');
    const placeholder = document.getElementById('fasdDomainEditorPlaceholder');
    if (!domain) { if (editor) editor.style.display = 'none'; if (placeholder) placeholder.style.display = 'block'; return; }
    if (editor) editor.style.display = 'block'; if (placeholder) placeholder.style.display = 'none';
    document.getElementById('fasdDomainNumber').value = domain.domain_number || '';
    document.getElementById('fasdDomainName').value = domain.domain_name || '';
    document.getElementById('fasdDomainDescription').value = domain.description || '';
};

window.saveFasdDomainChanges = async function() {
    if (!selectedFasdDomainId) return;
    const updates = { domain_number: parseInt(document.getElementById('fasdDomainNumber').value) || null, domain_name: document.getElementById('fasdDomainName').value.trim(), description: document.getElementById('fasdDomainDescription').value.trim() || null };
    if (!updates.domain_name) { alert('Domain name is required.'); return; }
    const { error } = await supabase.from('fasd_domains').update(updates).eq('id', selectedFasdDomainId);
    if (error) { alert('Failed to save.'); return; }
    alert('✅ FASD domain saved!');
    await loadFasdDomainsTheories();
};

window.addNewFasdDomain = function() { document.getElementById('addFasdDomainModal').classList.add('active'); document.getElementById('newFasdDomainName').value = ''; document.getElementById('newFasdDomainNumber').value = ''; document.getElementById('newFasdDomainDescription').value = ''; document.getElementById('newFasdDomainName').focus(); };
window.closeAddFasdDomainModal = function() { document.getElementById('addFasdDomainModal').classList.remove('active'); };

window.saveNewFasdDomain = async function(event) {
    event.preventDefault();
    const domainName = document.getElementById('newFasdDomainName').value.trim();
    if (!domainName) { alert('Domain name is required.'); return; }
    const { data, error } = await supabase.from('fasd_domains').insert({ domain_name: domainName, domain_number: parseInt(document.getElementById('newFasdDomainNumber').value) || null, description: document.getElementById('newFasdDomainDescription').value.trim() || null }).select().single();
    if (error) { alert('Failed to add FASD domain.'); return; }
    window.closeAddFasdDomainModal();
    selectedFasdDomainId = data?.id || null;
    await loadFasdDomainsTheories();
    alert('✅ FASD domain added!');
};

// ================================================================================
// NDIS DOMAINS
// ================================================================================
async function loadNdisDomainsTheories() {
    const { data, error } = await supabase.from('ndis_domains').select('*').order('sort_order');
    if (error) { console.error('[Admin] Error loading NDIS domains:', error); return; }
    ndisDomainsTheoriesData = data || [];
    const select = document.getElementById('ndisDomainSelectTheories');
    if (select) {
        select.innerHTML = '<option value="">Select an NDIS domain...</option>';
        ndisDomainsTheoriesData.forEach(d => { const o = document.createElement('option'); o.value = d.id; o.textContent = d.domain_name; select.appendChild(o); });
    }
    renderNdisDomainsTheoriesGrid();
}
window._adminLoadNdisDomainsTheories = loadNdisDomainsTheories;

function renderNdisDomainsTheoriesGrid() {
    const container = document.getElementById('ndisDomainsTheoriesGrid');
    if (!container) return;
    if (ndisDomainsTheoriesData.length === 0) { container.innerHTML = '<div style="text-align: center; color: #6b7c8f; padding: 20px;">No NDIS domains yet</div>'; return; }
    container.innerHTML = `<div style="background: white; border-radius: 8px; overflow: hidden; border: 1px solid #e5e7eb;"><table style="width: 100%; border-collapse: collapse;"><thead><tr style="background: #f8f9fa;"><th style="padding: 12px; text-align: left; font-size: 13px;">Domain</th><th style="padding: 12px; text-align: left; font-size: 13px;">Description</th><th style="padding: 12px; text-align: center; width: 100px;">Actions</th></tr></thead><tbody>${ndisDomainsTheoriesData.map(d => `<tr style="border-bottom: 1px solid #e5e7eb; cursor: pointer;" onclick="selectNdisDomain('${d.id}')"><td style="padding: 12px; font-weight: 600;">${d.domain_name}</td><td style="padding: 12px; font-size: 12px; color: #6b7c8f;">${d.description || ''}</td><td style="padding: 12px; text-align: center;"><button onclick="event.stopPropagation(); selectNdisDomain('${d.id}')" style="background: #6366F1; color: white; border: none; border-radius: 4px; padding: 4px 12px; font-size: 12px; cursor: pointer;">Edit</button></td></tr>`).join('')}</tbody></table></div>`;
}

window.selectNdisDomain = function(domainId) {
    selectedNdisDomainId = domainId;
    const domain = ndisDomainsTheoriesData.find(d => d.id === domainId);
    const editor = document.getElementById('ndisDomainEditor');
    const placeholder = document.getElementById('ndisDomainEditorPlaceholder');
    if (!domain) { if (editor) editor.style.display = 'none'; if (placeholder) placeholder.style.display = 'block'; return; }
    if (editor) editor.style.display = 'block'; if (placeholder) placeholder.style.display = 'none';
    document.getElementById('ndisDomainName').value = domain.domain_name || '';
    document.getElementById('ndisDomainDescription').value = domain.description || '';
};

window.saveNdisDomainChanges = async function() {
    if (!selectedNdisDomainId) return;
    const updates = { domain_name: document.getElementById('ndisDomainName').value.trim(), description: document.getElementById('ndisDomainDescription').value.trim() || null };
    if (!updates.domain_name) { alert('Domain name is required.'); return; }
    const { error } = await supabase.from('ndis_domains').update(updates).eq('id', selectedNdisDomainId);
    if (error) { alert('Failed to save.'); return; }
    alert('✅ NDIS domain saved!');
    await loadNdisDomainsTheories();
};

window.addNewNdisDomain = function() { document.getElementById('addNdisDomainModal').classList.add('active'); document.getElementById('newNdisDomainName').value = ''; document.getElementById('newNdisDomainDescription').value = ''; document.getElementById('newNdisDomainName').focus(); };
window.closeAddNdisDomainModal = function() { document.getElementById('addNdisDomainModal').classList.remove('active'); };

window.saveNewNdisDomain = async function(event) {
    event.preventDefault();
    const domainName = document.getElementById('newNdisDomainName').value.trim();
    if (!domainName) { alert('Domain name is required.'); return; }
    const { data, error } = await supabase.from('ndis_domains').insert({ domain_name: domainName, description: document.getElementById('newNdisDomainDescription').value.trim() || null }).select().single();
    if (error) { alert('Failed to add NDIS domain.'); return; }
    window.closeAddNdisDomainModal();
    selectedNdisDomainId = data?.id || null;
    await loadNdisDomainsTheories();
    alert('✅ NDIS domain added!');
};