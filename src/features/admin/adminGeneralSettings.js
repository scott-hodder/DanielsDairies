// ================================================================================
// GENERAL SETTINGS — Categories, series, emotions, skills, pathways,
//                    super skills / sub-skills management
// ================================================================================
import { supabase } from './adminPage.js';

let generalSeries = [];
let generalEmotions = [];
let generalSkills = [];
let generalPathways = [];

window.generalSuperSkills = window.generalSuperSkills || [];
window.generalSubSkills = window.generalSubSkills || [];

async function loadGeneralSettings() {
    try {
        const [
            superSkillsRes,
            subSkillsRes,
            categoryRes,
            seriesRes,
            emotionsRes,
            skillsRes,
            pathwaysRes
        ] = await Promise.all([
            supabase.from('super_skills').select('*').order('sort_order', { ascending: true }),
            supabase.from('sub_skills').select('*, super_skills(name, emoji)').order('sort_order', { ascending: true }),
            supabase.from('category_colors').select('*').order('category', { ascending: true }),
            supabase.from('series').select('*').order('label', { ascending: true }),
            supabase.from('emotions').select('*').order('label', { ascending: true }),
            supabase.from('skills').select('*').order('label', { ascending: true }),
            supabase.from('pathways').select('*').order('name', { ascending: true })
        ]);

        if (!superSkillsRes.error && superSkillsRes.data) {
            window.generalSuperSkills = superSkillsRes.data;
            renderSuperSkills();
            populateSubSkillParentDropdown();
            populateSuperSkillsDropdown();
        }

        if (!subSkillsRes.error && subSkillsRes.data) {
            window.generalSubSkills = subSkillsRes.data;
            renderSubSkills();
        }

        if (!categoryRes.error && categoryRes.data) {
            window.generalCategories = categoryRes.data.map(c => ({ name: c.category, color: c.color }));
            loadCategoriesIntoPathwayDropdowns();
        }

        if (seriesRes.data) generalSeries = seriesRes.data;
        if (emotionsRes.data) generalEmotions = emotionsRes.data;
        if (skillsRes.data) generalSkills = skillsRes.data;
        if (pathwaysRes.data) generalPathways = pathwaysRes.data;

        renderGeneralCategories();
        renderGeneralSeries();
        renderGeneralEmotions();
        renderGeneralSkills();
        renderGeneralPathways();
        loadPathwaysIntoDropdowns();
        loadCategoriesIntoPathwayDropdowns();
    } catch (error) {
        console.error('Error loading general settings:', error);
        alert('Failed to load settings. Please refresh the page.');
    }
}

window._adminLoadGeneralSettings = loadGeneralSettings;

// ================================================================================
// SUPER SKILLS MANAGEMENT
// ================================================================================
function renderSuperSkills() {
    const container = document.getElementById('superSkillsList');
    if (!container) return;
    const skills = window.generalSuperSkills || [];
    container.innerHTML = skills.map(skill => `
        <div style="background: white !important; border-radius: 8px; padding: 12px; display: flex; align-items: center; justify-content: space-between;">
            <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 24px;">${skill.emoji || '🎯'}</span>
                <div><div style="font-weight: 600;">${skill.name}</div><div style="font-size: 12px; opacity: 0.8;">${skill.character_name || 'No character'} • ${skill.slug}</div></div>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
                <div style="width: 20px; height: 20px; border-radius: 4px; background: ${skill.theme_color || '#6366F1'}; border: 2px solid white;"></div>
                <button onclick="deleteSuperSkill('${skill.id}')" style="background: rgba(255,255,255,0.3); border: none; border-radius: 4px; width: 28px; height: 28px; cursor: pointer; color: white; font-size: 14px;">×</button>
            </div>
        </div>
    `).join('');
}

function populateSubSkillParentDropdown() {
    const select = document.getElementById('newSubSkillParent');
    if (!select) return;
    select.innerHTML = '<option value="">Select Super Skill...</option>' + (window.generalSuperSkills || []).map(skill => `<option value="${skill.id}">${skill.emoji || ''} ${skill.name}</option>`).join('');
}

function populateSuperSkillsDropdown() {
    const select = document.getElementById('newModuleSuperSkill');
    const editSelect = document.getElementById('editSuperSkill');
    const skills = window.generalSuperSkills || [];
    [select, editSelect].filter(Boolean).forEach(sel => {
        const currentValue = sel.value;
        sel.innerHTML = '<option value="">Select Super Skill...</option>';
        skills.forEach(skill => {
            const option = document.createElement('option');
            option.value = skill.id;
            option.textContent = `${skill.emoji || ''} ${skill.name}`;
            option.dataset.characterName = skill.character_name || '';
            sel.appendChild(option);
        });
        if (currentValue) sel.value = currentValue;
    });
}

window.addSuperSkill = async function() {
    const emoji = document.getElementById('newSuperSkillEmoji').value.trim() || '🎯';
    const name = document.getElementById('newSuperSkillName').value.trim();
    const character = document.getElementById('newSuperSkillCharacter').value.trim();
    const color = document.getElementById('newSuperSkillColor').value;
    if (!name) { alert('Please enter a name for the Super Skill'); return; }
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    const sortOrder = (window.generalSuperSkills || []).length + 1;
    try {
        const { data, error } = await supabase.from('super_skills').insert({ name, slug, emoji, character_name: character, theme_color: color, sort_order: sortOrder, is_active: true }).select().single();
        if (error) throw error;
        window.generalSuperSkills.push(data);
        renderSuperSkills();
        populateSubSkillParentDropdown();
        populateSuperSkillsDropdown();
        document.getElementById('newSuperSkillEmoji').value = '';
        document.getElementById('newSuperSkillName').value = '';
        document.getElementById('newSuperSkillCharacter').value = '';
        alert('Super Skill added!');
    } catch (error) { console.error('Error adding super skill:', error); alert('Failed to add Super Skill.'); }
};

window.deleteSuperSkill = async function(id) {
    if (!confirm('Delete this Super Skill?')) return;
    try {
        const { error } = await supabase.from('super_skills').delete().eq('id', id);
        if (error) throw error;
        window.generalSuperSkills = window.generalSuperSkills.filter(s => s.id !== id);
        renderSuperSkills();
        populateSubSkillParentDropdown();
        populateSuperSkillsDropdown();
    } catch (error) { console.error('Error deleting super skill:', error); alert('Failed to delete.'); }
};

// ================================================================================
// SUB SKILLS
// ================================================================================
function renderSubSkills() {
    const container = document.getElementById('subSkillsList');
    if (!container) return;
    const skills = window.generalSubSkills || [];
    container.innerHTML = skills.map(skill => `
        <div style="background: white; border-radius: 8px; padding: 10px 12px; display: flex; align-items: center; justify-content: space-between; border: 1px solid #e5e7eb;">
            <div><div style="font-weight: 600; font-size: 13px;">${skill.name}</div><div style="font-size: 11px; color: #6b7c8f;">${skill.super_skills ? `${skill.super_skills.emoji || ''} ${skill.super_skills.name}` : 'No parent'}</div></div>
            <button onclick="deleteSubSkill('${skill.id}')" style="background: #ef4444; color: white; border: none; border-radius: 4px; padding: 2px 8px; font-size: 11px; cursor: pointer;">×</button>
        </div>
    `).join('');
}

window.addSubSkill = async function() {
    const name = document.getElementById('newSubSkillName').value.trim();
    const parentId = document.getElementById('newSubSkillParent').value || null;
    if (!name) { alert('Please enter a name'); return; }
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    try {
        const { data, error } = await supabase.from('sub_skills').insert({ name, slug, super_skill_id: parentId, is_active: true, sort_order: (window.generalSubSkills || []).length + 1 }).select('*, super_skills(name, emoji)').single();
        if (error) throw error;
        window.generalSubSkills.push(data);
        renderSubSkills();
        document.getElementById('newSubSkillName').value = '';
        alert('Sub-Skill added!');
    } catch (error) { console.error('Error adding sub-skill:', error); alert('Failed to add.'); }
};

window.deleteSubSkill = async function(id) {
    if (!confirm('Delete this Sub-Skill?')) return;
    try {
        const { error } = await supabase.from('sub_skills').delete().eq('id', id);
        if (error) throw error;
        window.generalSubSkills = window.generalSubSkills.filter(s => s.id !== id);
        renderSubSkills();
    } catch (error) { console.error('Error deleting sub-skill:', error); alert('Failed to delete.'); }
};

// ================================================================================
// CATEGORIES
// ================================================================================
function renderGeneralCategories() {
    const container = document.getElementById('categoriesList');
    if (!container) return;
    const categories = window.generalCategories || [];
    if (categories.length === 0) { container.innerHTML = '<div style="color: #6b7c8f; font-size: 12px; text-align: center; padding: 20px;">No categories yet</div>'; return; }
    container.innerHTML = categories.map(cat => `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 10px; background: white; border-radius: 6px; border: 1px solid #e5e7eb;">
            <div style="display: flex; align-items: center; gap: 8px;">
                <div style="width: 16px; height: 16px; border-radius: 4px; background: ${cat.color || '#4c6c96'};"></div>
                <span style="font-size: 12px; color: #374151; font-weight: 500;">${cat.name}</span>
            </div>
            <button onclick="deleteGeneralCategory('${cat.name}')" style="background: #ef4444; color: white; border: none; border-radius: 4px; padding: 2px 6px; font-size: 11px; cursor: pointer;">×</button>
        </div>
    `).join('');
}

window.addGeneralCategory = async function() {
    const nameInput = document.getElementById('newCategoryName');
    const colorInput = document.getElementById('newCategoryColorHex') || document.getElementById('newCategoryColor');
    const name = nameInput.value.trim().toLowerCase();
    const color = colorInput?.value || '#4c6c96';
    if (!name) { alert('Please enter a category name'); return; }
    if ((window.generalCategories || []).some(c => c.name === name)) { alert('Category already exists'); return; }
    try {
        const { error } = await supabase.from('category_colors').upsert({ category: name, color }, { onConflict: 'category' });
        if (error) throw error;
        nameInput.value = '';
        await loadGeneralSettings();
        alert('Category added!');
    } catch (error) { console.error('Error adding category:', error); alert('Failed to add category.'); }
};

window.deleteGeneralCategory = async function(name) {
    if (!confirm('Delete this category?')) return;
    try {
        const { error } = await supabase.from('category_colors').delete().eq('category', name);
        if (error) throw error;
        await loadGeneralSettings();
    } catch (error) { console.error('Error deleting category:', error); alert('Failed to delete.'); }
};

// ================================================================================
// SERIES
// ================================================================================
function renderGeneralSeries() {
    const container = document.getElementById('seriesList');
    if (!container) return;
    if (generalSeries.length === 0) { container.innerHTML = '<div style="color: #6b7c8f; font-size: 12px; text-align: center; padding: 20px;">No series yet</div>'; return; }
    container.innerHTML = generalSeries.map(s => `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 10px; background: white; border-radius: 6px; border: 1px solid #e5e7eb;">
            <span style="font-size: 12px; color: #374151; font-weight: 500;">${s.label}</span>
            <button onclick="deleteGeneralSeries('${s.id}')" style="background: #ef4444; color: white; border: none; border-radius: 4px; padding: 2px 6px; font-size: 11px; cursor: pointer;">×</button>
        </div>
    `).join('');
}

// ================================================================================
// EMOTIONS
// ================================================================================
function renderGeneralEmotions() {
    const container = document.getElementById('emotionsList');
    if (!container) return;
    if (generalEmotions.length === 0) { container.innerHTML = '<div style="color: #6b7c8f; font-size: 12px; text-align: center; padding: 20px;">No emotions yet</div>'; return; }
    container.innerHTML = generalEmotions.map(e => `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 10px; background: white; border-radius: 6px; border: 1px solid #e5e7eb;">
            <span style="font-size: 12px; color: #374151;">${e.label}</span>
            <button onclick="deleteGeneralEmotion('${e.id}')" style="background: #ef4444; color: white; border: none; border-radius: 4px; padding: 2px 6px; font-size: 11px; cursor: pointer;">×</button>
        </div>
    `).join('');
}

window.addGeneralEmotion = async function() {
    const input = document.getElementById('newEmotionName');
    const value = input.value.trim();
    if (!value) { alert('Please enter an emotion'); return; }
    if (generalEmotions.some(e => e.label.toLowerCase() === value.toLowerCase())) { alert('Emotion already exists'); return; }
    try {
        const id = value.toLowerCase().replace(/\s+/g, '_');
        const { error } = await supabase.from('emotions').insert([{ id, label: value }]);
        if (error) throw error;
        input.value = '';
        await loadGeneralSettings();
    } catch (error) { console.error('Error adding emotion:', error); alert('Failed to add emotion.'); }
};

window.deleteGeneralEmotion = async function(id) {
    if (!confirm('Delete this emotion?')) return;
    try { await supabase.from('emotions').delete().eq('id', id); await loadGeneralSettings(); }
    catch (error) { console.error('Error deleting emotion:', error); alert('Failed to delete.'); }
};

// ================================================================================
// SKILLS
// ================================================================================
function renderGeneralSkills() {
    const container = document.getElementById('skillsList');
    if (!container) return;
    if (generalSkills.length === 0) { container.innerHTML = '<div style="color: #6b7c8f; font-size: 12px; text-align: center; padding: 20px;">No skills yet</div>'; return; }
    container.innerHTML = generalSkills.map(s => `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 10px; background: white; border-radius: 6px; border: 1px solid #e5e7eb;">
            <span style="font-size: 12px; color: #374151;">${s.label}</span>
            <button onclick="deleteGeneralSkill('${s.id}')" style="background: #ef4444; color: white; border: none; border-radius: 4px; padding: 2px 6px; font-size: 11px; cursor: pointer;">×</button>
        </div>
    `).join('');
}

window.addGeneralSkill = async function() {
    const input = document.getElementById('newSkillName');
    const value = input.value.trim();
    if (!value) { alert('Please enter a skill'); return; }
    if (generalSkills.some(s => s.label.toLowerCase() === value.toLowerCase())) { alert('Skill already exists'); return; }
    try {
        const id = value.toLowerCase().replace(/\s+/g, '_');
        const { error } = await supabase.from('skills').insert([{ id, label: value }]);
        if (error) throw error;
        input.value = '';
        await loadGeneralSettings();
    } catch (error) { console.error('Error adding skill:', error); alert('Failed to add skill.'); }
};

window.deleteGeneralSkill = async function(id) {
    if (!confirm('Delete this skill?')) return;
    try { await supabase.from('skills').delete().eq('id', id); await loadGeneralSettings(); }
    catch (error) { console.error('Error deleting skill:', error); alert('Failed to delete.'); }
};

// ================================================================================
// PATHWAYS
// ================================================================================
function renderGeneralPathways() {
    const container = document.getElementById('pathwaysList');
    if (!container) return;
    if (generalPathways.length === 0) { container.innerHTML = '<div style="color: #6b7c8f; font-size: 12px; text-align: center; padding: 20px;">No pathways yet</div>'; return; }
    container.innerHTML = generalPathways.map(pathway => `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 10px; background: white; border-radius: 6px; border: 1px solid #e5e7eb;">
            <div style="flex: 1;"><div style="font-size: 12px; color: #374151; font-weight: 500;">${pathway.name}</div><div style="font-size: 11px; color: #6b7c8f; margin-top: 2px;">Category: ${pathway.category || 'None'}</div></div>
            <button onclick="deleteGeneralPathway('${pathway.id}')" style="background: #ef4444; color: white; border: none; border-radius: 4px; padding: 2px 6px; font-size: 11px; cursor: pointer;">×</button>
        </div>
    `).join('');
}

window.addGeneralPathway = async function() {
    const name = document.getElementById('newPathwayName').value.trim();
    const category = document.getElementById('newPathwayCategory').value;
    if (!name) { alert('Please enter a pathway name'); return; }
    if (!category) { alert('Please select a category'); return; }
    if (generalPathways.some(p => p.name.toLowerCase() === name.toLowerCase())) { alert('Pathway already exists'); return; }
    try {
        const { error } = await supabase.from('pathways').insert([{ name, category }]);
        if (error) throw error;
        document.getElementById('newPathwayName').value = '';
        document.getElementById('newPathwayCategory').value = '';
        await loadGeneralSettings();
        loadPathwaysIntoDropdowns();
    } catch (error) { console.error('Error adding pathway:', error); alert('Failed to add pathway.'); }
};

window.deleteGeneralPathway = async function(id) {
    if (!confirm('Delete this pathway?')) return;
    try { await supabase.from('pathways').delete().eq('id', id); await loadGeneralSettings(); loadPathwaysIntoDropdowns(); }
    catch (error) { console.error('Error deleting pathway:', error); alert('Failed to delete.'); }
};

function loadPathwaysIntoDropdowns() {
    ['newModulePathway', 'editPathway'].forEach(selectId => {
        const select = document.getElementById(selectId);
        if (!select) return;
        const currentValue = select.value;
        select.innerHTML = '<option value="">Select pathway...</option>';
        generalPathways.forEach(pathway => {
            const option = document.createElement('option');
            option.value = pathway.id;
            option.textContent = pathway.name;
            if (pathway.id === currentValue) option.selected = true;
            select.appendChild(option);
        });
    });
}
window.loadPathwaysIntoDropdowns = loadPathwaysIntoDropdowns;

function loadCategoriesIntoPathwayDropdowns() {
    if (!window.generalCategories || !Array.isArray(window.generalCategories)) return;
    ['quickPathwayCategory', 'newPathwayCategory'].forEach(selectId => {
        const select = document.getElementById(selectId);
        if (!select) return;
        const currentValue = select.value;
        select.innerHTML = '<option value="">Select category...</option>';
        window.generalCategories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.name;
            option.textContent = category.name;
            if (category.name === currentValue) option.selected = true;
            select.appendChild(option);
        });
    });
}
window._adminLoadCategoriesIntoPathwayDropdowns = loadCategoriesIntoPathwayDropdowns;