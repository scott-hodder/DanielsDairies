// ================================================================================
// PARENT TOOLKIT TAB — Challenges, goals, tools, scripts, weekly check-in toggle
// ================================================================================
import { getSettings, updateSettings } from './adminPage.js';

let toolkitSettings = {};
let challenges = [];
let goals = [];
let tools = [];
let scripts = [];

async function loadToolkitSettings() {
    try {
        const settings = await getSettings();
        toolkitSettings = settings || {};

        const toggle = document.getElementById('weeklyCheckinToggle');
        if (toggle) {
            toggle.checked = settings.weekly_checkin_enabled !== false;
            updateCheckinStatus(toggle.checked);
        }

        challenges = settings.challenges || [];
        goals = settings.goals || [];
        tools = settings.tools || [];
        scripts = settings.scripts || [];
        renderChallenges();
        renderGoals();
        renderTools();
        renderScripts();
    } catch (error) {
        console.error('Error loading toolkit settings:', error);
        alert('Failed to load settings. Please refresh the page.');
    }
}

window._adminLoadToolkitSettings = loadToolkitSettings;

window.toggleWeeklyCheckin = async function(enabled) {
    try {
        await updateSettings({ weekly_checkin_enabled: enabled });
        toolkitSettings.weekly_checkin_enabled = enabled;
        updateCheckinStatus(enabled);
        alert(enabled ? 'Weekly Check-In enabled' : 'Weekly Check-In disabled.');
    } catch (error) { console.error('Error updating weekly check-in setting:', error); alert('Failed to update setting.'); }
};

function updateCheckinStatus(enabled) {
    const statusEl = document.getElementById('weeklyCheckinStatus');
    if (statusEl) {
        if (enabled) { statusEl.style.background = '#e8f5e9'; statusEl.style.color = '#2e7d32'; statusEl.textContent = '✓ Enabled'; }
        else { statusEl.style.background = '#ffebee'; statusEl.style.color = '#c62828'; statusEl.textContent = '✕ Disabled'; }
    }
}

// ================================================================================
// CHALLENGES
// ================================================================================
function renderChallenges() {
    const list = document.getElementById('challengesList');
    if (!list) return;
    list.innerHTML = challenges.map((challenge, index) => `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: white; border-radius: 6px; border: 1px solid #e5e7eb;">
            <span style="color: #374151; font-size: 13px;">${challenge}</span>
            <button onclick="deleteChallenge(${index})" style="padding: 4px 10px; background: #ef4444; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">Delete</button>
        </div>
    `).join('');
}

window.addChallenge = async function() {
    const input = document.getElementById('newChallengeInput');
    const value = input.value.trim();
    if (!value) { alert('Please enter a challenge name'); return; }
    try {
        challenges.push(value);
        await updateSettings({ challenges });
        input.value = '';
        renderChallenges();
    } catch (error) { console.error('Error adding challenge:', error); alert('Failed to add challenge.'); challenges.pop(); }
};

window.deleteChallenge = async function(index) {
    if (confirm('Delete this challenge option?')) {
        const removed = challenges.splice(index, 1);
        try { await updateSettings({ challenges }); renderChallenges(); }
        catch (error) { console.error('Error deleting challenge:', error); challenges.splice(index, 0, ...removed); }
    }
};

// ================================================================================
// GOALS
// ================================================================================
function renderGoals() {
    const list = document.getElementById('goalsList');
    if (!list) return;
    list.innerHTML = goals.map((goal, index) => `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: white; border-radius: 6px; border: 1px solid #e5e7eb;">
            <span style="color: #374151; font-size: 13px;">${goal}</span>
            <button onclick="deleteGoal(${index})" style="padding: 4px 10px; background: #ef4444; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">Delete</button>
        </div>
    `).join('');
}

window.addGoal = async function() {
    const input = document.getElementById('newGoalInput');
    const value = input.value.trim();
    if (!value) { alert('Please enter a goal'); return; }
    try { goals.push(value); await updateSettings({ goals }); input.value = ''; renderGoals(); }
    catch (error) { console.error('Error adding goal:', error); goals.pop(); }
};

window.deleteGoal = async function(index) {
    if (confirm('Delete this goal option?')) {
        const removed = goals.splice(index, 1);
        try { await updateSettings({ goals }); renderGoals(); }
        catch (error) { goals.splice(index, 0, ...removed); }
    }
};

// ================================================================================
// TOOLS
// ================================================================================
function renderTools() {
    const list = document.getElementById('toolsList');
    if (!list) return;
    list.innerHTML = tools.map((tool, index) => `
        <div style="padding: 10px 12px; background: white; border-radius: 6px; border: 1px solid #e5e7eb;">
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 6px;">
                <strong style="color: #374151; font-size: 13px;">${tool.label}</strong>
                <button onclick="deleteTool(${index})" style="padding: 4px 10px; background: #ef4444; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">Delete</button>
            </div>
            <p style="margin: 0 0 4px 0; color: #6b7280; font-size: 12px;">${tool.description}</p>
            <small style="color: #9ca3af; font-size: 11px;">Helps with: ${tool.triggers.join(', ')}</small>
        </div>
    `).join('');
}

window.addTool = async function() {
    const label = document.getElementById('newToolLabel').value.trim();
    const description = document.getElementById('newToolDescription').value.trim();
    const triggersStr = document.getElementById('newToolTriggers').value.trim();
    if (!label || !description || !triggersStr) { alert('Please fill in all fields'); return; }
    const triggers = triggersStr.split(',').map(t => t.trim()).filter(t => t);
    try {
        tools.push({ label, description, triggers });
        await updateSettings({ tools });
        document.getElementById('newToolLabel').value = '';
        document.getElementById('newToolDescription').value = '';
        document.getElementById('newToolTriggers').value = '';
        renderTools();
    } catch (error) { console.error('Error adding tool:', error); tools.pop(); }
};

window.deleteTool = async function(index) {
    if (confirm('Delete this tool?')) {
        const removed = tools.splice(index, 1);
        try { await updateSettings({ tools }); renderTools(); }
        catch (error) { tools.splice(index, 0, ...removed); }
    }
};

// ================================================================================
// SCRIPTS
// ================================================================================
function renderScripts() {
    const list = document.getElementById('scriptsList');
    if (!list) return;
    list.innerHTML = scripts.map((script, index) => `
        <div style="padding: 10px 12px; background: white; border-radius: 6px; border: 1px solid #e5e7eb;">
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 6px;">
                <strong style="color: #374151; font-size: 13px;">${script.title}</strong>
                <button onclick="deleteScript(${index})" style="padding: 4px 10px; background: #ef4444; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">Delete</button>
            </div>
            <p style="margin: 0 0 4px 0; color: #6b7280; font-size: 12px;">"${script.script}"</p>
            <small style="color: #9ca3af; font-size: 11px;">${script.context}</small>
        </div>
    `).join('');
}

window.addScript = async function() {
    const title = document.getElementById('newScriptTitle').value.trim();
    const script = document.getElementById('newScriptContent').value.trim();
    const context = document.getElementById('newScriptContext').value.trim();
    if (!title || !script || !context) { alert('Please fill in all fields'); return; }
    try {
        scripts.push({ title, script, context });
        await updateSettings({ scripts });
        document.getElementById('newScriptTitle').value = '';
        document.getElementById('newScriptContent').value = '';
        document.getElementById('newScriptContext').value = '';
        renderScripts();
    } catch (error) { console.error('Error adding script:', error); scripts.pop(); }
};

window.deleteScript = async function(index) {
    if (confirm('Delete this script?')) {
        const removed = scripts.splice(index, 1);
        try { await updateSettings({ scripts }); renderScripts(); }
        catch (error) { scripts.splice(index, 0, ...removed); }
    }
};