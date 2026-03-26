// ================================================================================
// CHECK INS TAB - Focus plan, weekly check-in, assessment questions
// ================================================================================
import { supabase } from './adminPage.js';

async function loadCheckInsSettings() {
    try {
        const [catRes, goalsRes, freqRes, intRes, challRes, cgRes, trigRes, ssRes] = await Promise.all([
            supabase.from('focus_plan_categories').select('*, super_skills(id, name, emoji)').eq('is_active', true).order('sort_order'),
            supabase.from('focus_plan_goals').select('*').eq('is_active', true).order('sort_order'),
            supabase.from('focus_plan_frequencies').select('*').eq('is_active', true).order('sort_order'),
            supabase.from('focus_plan_intensities').select('*').eq('is_active', true).order('sort_order'),
            supabase.from('checkin_challenges').select('*').eq('is_active', true).order('sort_order'),
            supabase.from('checkin_goals').select('*').eq('is_active', true).order('sort_order'),
            supabase.from('checkin_triggers').select('*').eq('is_active', true).order('sort_order'),
            supabase.from('super_skills').select('id, name, emoji').order('sort_order'),
        ]);
        renderFocusPlanCategories(catRes.data || []);
        populateFocusCatSuperSkillDropdown(ssRes.data || []);
        renderCheckinList('focusPlanGoalsList', goalsRes.data || [], 'focus_plan_goals', (item) => `${item.icon} ${item.label}`);
        renderCheckinList('focusPlanFrequenciesList', freqRes.data || [], 'focus_plan_frequencies', (item) => `${item.label} - ${item.description}`);
        renderCheckinList('focusPlanIntensitiesList', intRes.data || [], 'focus_plan_intensities', (item) => `${item.icon} ${item.label} - ${item.description}`);
        renderCheckinList('checkinChallengesList', challRes.data || [], 'checkin_challenges', (item) => item.label);
        renderCheckinList('checkinGoalsList', cgRes.data || [], 'checkin_goals', (item) => item.label);
        renderCheckinList('checkinTriggersList', trigRes.data || [], 'checkin_triggers', (item) => item.label);
        loadAssessmentQuestions();
    } catch (error) {
        console.error('Error loading check-ins settings:', error);
    }
}

window._adminLoadCheckInsSettings = loadCheckInsSettings;

function renderFocusPlanCategories(items) {
    const container = document.getElementById('focusPlanCategoriesList');
    if (!container) return;
    if (items.length === 0) { container.innerHTML = '<div style="color: #6b7c8f; font-size: 12px; text-align: center; padding: 12px;">No focus area categories yet</div>'; return; }
    container.innerHTML = items.map(item => {
        const ssName = item.super_skills ? `${item.super_skills.emoji || ''} ${item.super_skills.name}` : 'None';
        return `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: white; border-radius: 6px; border: 1px solid #e5e7eb;">
            <div style="display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0;">
                <span style="font-size: 16px;">${item.icon}</span>
                <div style="min-width: 0;">
                    <div style="font-size: 12px; color: #374151; font-weight: 600;">${item.name}</div>
                    <div style="font-size: 11px; color: #6b7c8f;">${item.short_description || ''}</div>
                </div>
            </div>
            <div style="display: flex; align-items: center; gap: 8px; flex-shrink: 0;">
                <span style="font-size: 11px; color: #6366F1; background: #EEF2FF; padding: 2px 8px; border-radius: 4px; white-space: nowrap;">${ssName}</span>
                <button onclick="deleteCheckinItem('focus_plan_categories', '${item.id}')" style="background: #ef4444; color: white; border: none; border-radius: 4px; padding: 2px 6px; font-size: 11px; cursor: pointer;">×</button>
            </div>
        </div>`;
    }).join('');
}

function populateFocusCatSuperSkillDropdown(superSkills) {
    const sel = document.getElementById('newFocusCatSuperSkill');
    if (!sel) return;
    sel.innerHTML = '<option value="">Link to Super Skill (optional)</option>' + superSkills.map(ss => `<option value="${ss.id}">${ss.emoji || ''} ${ss.name}</option>`).join('');
}

function renderCheckinList(containerId, items, tableName, formatFn) {
    const container = document.getElementById(containerId);
    if (!container) return;
    if (items.length === 0) { container.innerHTML = '<div style="color: #6b7c8f; font-size: 12px; text-align: center; padding: 12px;">No items yet</div>'; return; }
    container.innerHTML = items.map(item => `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 10px; background: white; border-radius: 6px; border: 1px solid #e5e7eb;">
            <span style="font-size: 12px; color: #374151;">${formatFn(item)}</span>
            <button onclick="deleteCheckinItem('${tableName}', '${item.id}')" style="background: #ef4444; color: white; border: none; border-radius: 4px; padding: 2px 6px; font-size: 11px; cursor: pointer; flex-shrink: 0;">×</button>
        </div>
    `).join('');
}

window.deleteCheckinItem = async function(tableName, id) {
    if (!confirm('Delete this item?')) return;
    try {
        const { error } = await supabase.from(tableName).delete().eq('id', id);
        if (error) throw error;
        await loadCheckInsSettings();
    } catch (error) { console.error('Error deleting item:', error); alert('Failed to delete. Please try again.'); }
};

window.addFocusPlanCategory = async function() {
    const icon = (document.getElementById('newFocusCatIcon').value || '').trim() || '📚';
    const name = (document.getElementById('newFocusCatName').value || '').trim();
    const short_description = (document.getElementById('newFocusCatDesc').value || '').trim();
    const super_skill_id = document.getElementById('newFocusCatSuperSkill').value || null;
    if (!name) { alert('Please enter a category name.'); return; }
    try {
        const { data: maxRow } = await supabase.from('focus_plan_categories').select('sort_order').order('sort_order', { ascending: false }).limit(1);
        const nextOrder = (maxRow?.[0]?.sort_order || 0) + 1;
        const row = { name, icon, short_description, sort_order: nextOrder };
        if (super_skill_id) row.super_skill_id = super_skill_id;
        const { error } = await supabase.from('focus_plan_categories').insert(row);
        if (error) throw error;
        document.getElementById('newFocusCatIcon').value = '';
        document.getElementById('newFocusCatName').value = '';
        document.getElementById('newFocusCatDesc').value = '';
        document.getElementById('newFocusCatSuperSkill').value = '';
        await loadCheckInsSettings();
    } catch (error) { console.error('Error adding focus plan category:', error); alert('Failed to add category.'); }
};

window.addFocusPlanGoal = async function() {
    const icon = (document.getElementById('newFocusGoalIcon').value || '').trim() || '🎯';
    const label = (document.getElementById('newFocusGoalLabel').value || '').trim();
    if (!label) { alert('Please enter a goal label.'); return; }
    try {
        const key = label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
        const { data: maxRow } = await supabase.from('focus_plan_goals').select('sort_order').order('sort_order', { ascending: false }).limit(1);
        const { error } = await supabase.from('focus_plan_goals').insert({ key, label, icon, sort_order: (maxRow?.[0]?.sort_order || 0) + 1 });
        if (error) throw error;
        document.getElementById('newFocusGoalIcon').value = '';
        document.getElementById('newFocusGoalLabel').value = '';
        await loadCheckInsSettings();
    } catch (error) { console.error('Error adding goal:', error); alert('Failed to add goal.'); }
};

window.addFocusPlanFrequency = async function() {
    const label = (document.getElementById('newFrequencyLabel').value || '').trim();
    const description = (document.getElementById('newFrequencyDesc').value || '').trim();
    if (!label) { alert('Please enter a label.'); return; }
    try {
        const value = label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
        const { data: maxRow } = await supabase.from('focus_plan_frequencies').select('sort_order').order('sort_order', { ascending: false }).limit(1);
        const { error } = await supabase.from('focus_plan_frequencies').insert({ value, label, description, sort_order: (maxRow?.[0]?.sort_order || 0) + 1 });
        if (error) throw error;
        document.getElementById('newFrequencyLabel').value = '';
        document.getElementById('newFrequencyDesc').value = '';
        await loadCheckInsSettings();
    } catch (error) { console.error('Error adding frequency:', error); alert('Failed to add frequency.'); }
};

window.addFocusPlanIntensity = async function() {
    const icon = (document.getElementById('newIntensityIcon').value || '').trim() || '🌱';
    const label = (document.getElementById('newIntensityLabel').value || '').trim();
    const description = (document.getElementById('newIntensityDesc').value || '').trim();
    if (!label) { alert('Please enter a label.'); return; }
    try {
        const value = label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
        const { data: maxRow } = await supabase.from('focus_plan_intensities').select('sort_order').order('sort_order', { ascending: false }).limit(1);
        const { error } = await supabase.from('focus_plan_intensities').insert({ value, label, icon, description, sort_order: (maxRow?.[0]?.sort_order || 0) + 1 });
        if (error) throw error;
        document.getElementById('newIntensityIcon').value = '';
        document.getElementById('newIntensityLabel').value = '';
        document.getElementById('newIntensityDesc').value = '';
        await loadCheckInsSettings();
    } catch (error) { console.error('Error adding intensity:', error); alert('Failed to add intensity.'); }
};

window.addCheckinChallenge = async function() {
    const label = (document.getElementById('newCheckinChallenge').value || '').trim();
    if (!label) { alert('Please enter a challenge.'); return; }
    try {
        const { data: maxRow } = await supabase.from('checkin_challenges').select('sort_order').order('sort_order', { ascending: false }).limit(1);
        const { error } = await supabase.from('checkin_challenges').insert({ label, sort_order: (maxRow?.[0]?.sort_order || 0) + 1 });
        if (error) throw error;
        document.getElementById('newCheckinChallenge').value = '';
        await loadCheckInsSettings();
    } catch (error) { console.error('Error adding challenge:', error); alert('Failed to add challenge.'); }
};

window.addCheckinGoal = async function() {
    const label = (document.getElementById('newCheckinGoal').value || '').trim();
    if (!label) { alert('Please enter a goal.'); return; }
    try {
        const { data: maxRow } = await supabase.from('checkin_goals').select('sort_order').order('sort_order', { ascending: false }).limit(1);
        const { error } = await supabase.from('checkin_goals').insert({ label, sort_order: (maxRow?.[0]?.sort_order || 0) + 1 });
        if (error) throw error;
        document.getElementById('newCheckinGoal').value = '';
        await loadCheckInsSettings();
    } catch (error) { console.error('Error adding goal:', error); alert('Failed to add goal.'); }
};

window.addCheckinTrigger = async function() {
    const label = (document.getElementById('newCheckinTrigger').value || '').trim();
    if (!label) { alert('Please enter a trigger.'); return; }
    try {
        const { data: maxRow } = await supabase.from('checkin_triggers').select('sort_order').order('sort_order', { ascending: false }).limit(1);
        const { error } = await supabase.from('checkin_triggers').insert({ label, sort_order: (maxRow?.[0]?.sort_order || 0) + 1 });
        if (error) throw error;
        document.getElementById('newCheckinTrigger').value = '';
        await loadCheckInsSettings();
    } catch (error) { console.error('Error adding trigger:', error); alert('Failed to add trigger.'); }
};

// ================================================================================
// ASSESSMENT QUESTIONS
// ================================================================================
window.loadAssessmentQuestions = async function() {
    const pathway = document.getElementById('assessmentPathwayFilter')?.value || 'anger';
    const container = document.getElementById('assessmentQuestionsList');
    const countEl = document.getElementById('assessmentQuestionCount');
    if (!container) return;

    try {
        const { data, error } = await supabase.from('assessment_questions').select('*').eq('pathway', pathway).order('sort_order');
        if (error) throw error;
        const questions = data || [];
        if (countEl) countEl.textContent = `${questions.length} question(s)`;

        if (questions.length === 0) { container.innerHTML = '<div style="color: #6b7c8f; font-size: 12px; text-align: center; padding: 20px;">No questions for this pathway yet</div>'; return; }

        container.innerHTML = questions.map(q => `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: white; border-radius: 6px; border: 1px solid #e5e7eb;">
                <div style="flex: 1; min-width: 0;">
                    <div style="font-size: 12px; color: #374151; font-weight: 600;">${q.question_text}</div>
                    <div style="font-size: 11px; color: #6b7c8f; margin-top: 2px;">Key: ${q.question_key} • Type: ${q.question_type || '-'}</div>
                </div>
                <button onclick="deleteCheckinItem('assessment_questions', '${q.id}')" style="background: #ef4444; color: white; border: none; border-radius: 4px; padding: 2px 6px; font-size: 11px; cursor: pointer; flex-shrink: 0; margin-left: 8px;">×</button>
            </div>
        `).join('');
    } catch (error) { console.error('Error loading assessment questions:', error); }
};

window.addAssessmentQuestion = async function() {
    const pathway = document.getElementById('assessmentPathwayFilter')?.value || 'anger';
    const key = (document.getElementById('newAssessmentKey')?.value || '').trim();
    const text = (document.getElementById('newAssessmentText')?.value || '').trim();
    const type = document.getElementById('newAssessmentType')?.value || 'frequency';
    if (!key || !text) { alert('Please enter both a key and question text.'); return; }
    try {
        const { data: maxRow } = await supabase.from('assessment_questions').select('sort_order').eq('pathway', pathway).order('sort_order', { ascending: false }).limit(1);
        const { error } = await supabase.from('assessment_questions').insert({ pathway, question_key: key, question_text: text, question_type: type, sort_order: (maxRow?.[0]?.sort_order || 0) + 1 });
        if (error) throw error;
        document.getElementById('newAssessmentKey').value = '';
        document.getElementById('newAssessmentText').value = '';
        await loadAssessmentQuestions();
    } catch (error) { console.error('Error adding assessment question:', error); alert('Failed to add question.'); }
};