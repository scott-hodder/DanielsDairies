import { supabase } from '../../supabaseClient.js';
import { getSettings, updateSettings } from '../../database.js';
import { requireSupabaseEnv } from './runtimeConfig.js';

// Re-export for sub-modules
export { supabase, getSettings, updateSettings, requireSupabaseEnv };

// Make supabase available globally for module-content-creator.js
window.supabase = supabase;

// ================================================================================
// SHARED STATE — imported by all sub-modules
// ================================================================================
export let allChildren = [];
export let allParents = [];
export let allModules = [];
export let selectedChild = null;
export let selectedParent = null;
export let currentFilter = 'all';
export let currentModuleAssignments = {};
export let selectedModules = new Set();
export let customisationSelectedModules = new Set();
export let isBulkDeletingModules = false;
export let selectedModule = null;
export let categoryColors = {};
export let rewards = [];
export let ageRanges = [];
export let coreTheories = [];
export let theoriesData = [];
export let selectedTheoryId = null;

// Theories tab - new variables for age ranges, super skills, sub-skills forms
export let ageRangesTheoriesData = [];
export let selectedAgeRangeId = null;
export let superSkillsTheoriesData = [];
export let selectedSuperSkillTheoriesId = null;
export let subSkillsTheoriesData = [];
export let selectedSubSkillTheoriesId = null;

// State setters for sub-modules to update shared state
export function setAllChildren(val) { allChildren = val; }
export function setAllParents(val) { allParents = val; }
export function setAllModules(val) { allModules = val; }
export function setSelectedChild(val) { selectedChild = val; }
export function setSelectedParent(val) { selectedParent = val; }
export function setCurrentFilter(val) { currentFilter = val; }
export function setCurrentModuleAssignments(val) { currentModuleAssignments = val; }
export function setSelectedModules(val) { selectedModules = val; }
export function setCustomisationSelectedModules(val) { customisationSelectedModules = val; }
export function setIsBulkDeletingModules(val) { isBulkDeletingModules = val; }
export function setSelectedModule(val) { selectedModule = val; }
export function setCategoryColors(val) { categoryColors = val; }
export function setRewards(val) { rewards = val; }
export function setAgeRanges(val) { ageRanges = val; }
export function setCoreTheories(val) { coreTheories = val; }
export function setTheoriesData(val) { theoriesData = val; }
export function setSelectedTheoryId(val) { selectedTheoryId = val; }
export function setAgeRangesTheoriesData(val) { ageRangesTheoriesData = val; }
export function setSelectedAgeRangeId(val) { selectedAgeRangeId = val; }
export function setSuperSkillsTheoriesData(val) { superSkillsTheoriesData = val; }
export function setSelectedSuperSkillTheoriesId(val) { selectedSuperSkillTheoriesId = val; }
export function setSubSkillsTheoriesData(val) { subSkillsTheoriesData = val; }
export function setSelectedSubSkillTheoriesId(val) { selectedSubSkillTheoriesId = val; }

// ================================================================================
// UTILITY
// ================================================================================
export function getModuleKey(moduleId) {
    if (moduleId === undefined || moduleId === null) {
        return '';
    }
    return String(moduleId);
}

export function formatCategoryLabel(name) {
    if (!name) return '';
    return name.charAt(0).toUpperCase() + name.slice(1);
}

export function getAgeRangeLabel(ageRangeValue) {
    if (!ageRangeValue) return '';
    const match = ageRanges.find(range =>
        range.id === ageRangeValue ||
        range.age_range === ageRangeValue ||
        range.display_name === ageRangeValue
    );
    return match ? (match.age_range || match.display_name) : ageRangeValue;
}

// ================================================================================
// DELEGATE CHECKBOX CHANGES
// ================================================================================
document.addEventListener('change', (e) => {
    const target = e.target;
    if (!(target instanceof HTMLElement)) return;
    if (target.classList.contains('module-checkbox')) {
        let moduleId = target.getAttribute('data-module-id');
        if (moduleId === null) return;
        if (!isNaN(moduleId) && moduleId !== '') moduleId = Number(moduleId);
        if (typeof window.toggleModuleSelection === 'function') {
            window.toggleModuleSelection(moduleId);
        } else if (typeof toggleModuleSelection === 'function') {
            toggleModuleSelection(moduleId);
        }
    }
});

// ================================================================================
// ADMIN ACCESS CHECK
// ================================================================================
export async function checkAdminAccess() {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        console.error('[Admin] No user logged in');
        window.location.href = '/index.html';
        return false;
    }

    const { data: profile, error } = await supabase
        .from('parent_profiles')
        .select('is_admin, username')
        .eq('id', user.id)
        .single();

    if (error) {
        console.error('[Admin] Error querying profile:', error);
        alert('Error checking admin status: ' + error.message);
        return false;
    }

    if (!profile) {
        console.error('[Admin] No profile found for user');
        alert('Access denied. No profile found.');
        window.location.href = '/dashboard.html';
        return false;
    }

    if (!profile.is_admin) {
        console.error('[Admin] User is not admin. is_admin =', profile.is_admin);
        alert(`Access denied. Admin privileges required. (User: ${profile.username})`);
        window.location.href = '/dashboard.html';
        return false;
    }

    return true;
}

// ================================================================================
// LOAD ALL CHILDREN (for stats)
// ================================================================================
export async function loadAllChildren() {
    const { data: childrenData, error: childrenError } = await supabase
        .from('children')
        .select('id, name, parent_user_id')
        .order('name');

    if (childrenError) {
        console.error('Error loading children:', childrenError);
        return;
    }

    const { data: parentsData, error: parentsError } = await supabase
        .from('parent_profiles')
        .select('id, username');

    if (parentsError) {
        console.error('Error loading parents:', parentsError);
    }

    const parentMap = {};
    if (parentsData) {
        parentsData.forEach(parent => {
            parentMap[parent.id] = parent.username;
        });
    }

    allChildren = childrenData.map(child => ({
        ...child,
        parent_username: parentMap[child.parent_user_id] || 'Unknown'
    }));

    updateStats();
}

// ================================================================================
// LOAD ALL MODULES
// ================================================================================
export async function loadAllModules() {
    const { data, error } = await supabase
        .from('modules')
        .select('*')
        .order('title');

    if (error) {
        console.error('Error loading modules:', error);
        return;
    }

    allModules = data || [];

    await loadCategoryColors();

    // These functions are provided by sub-modules after import
    if (typeof window._adminPopulateCustomisationFilters === 'function') {
        window._adminPopulateCustomisationFilters();
    }
    if (typeof window._adminRenderAllModulesList === 'function') {
        window._adminRenderAllModulesList();
    }
}

// ================================================================================
// LOAD CATEGORY COLORS
// ================================================================================
export async function loadCategoryColors() {
    const { data, error } = await supabase
        .from('category_colors')
        .select('*');

    if (error) {
        console.error('Error loading category colors:', error);
        return;
    }

    categoryColors = {};
    if (data) {
        data.forEach(cc => {
            categoryColors[cc.category] = cc.color;
        });
    }
}

// ================================================================================
// UPDATE STATS
// ================================================================================
export async function updateStats() {
    document.getElementById('totalChildren').textContent = allChildren.length;
    document.getElementById('totalModules').textContent = allModules.length;

    const { count } = await supabase
        .from('child_modules')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

    document.getElementById('activeAssignments').textContent = count || 0;
}

// ================================================================================
// NAVIGATION
// ================================================================================
window.goToDashboard = function() {
    window.location.href = '/dashboard.html';
}

// ================================================================================
// TAB SWITCHING
// ================================================================================
window.switchTab = function(evt, tabName) {
    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
    (evt && evt.target ? evt.target : (typeof window !== 'undefined' ? window.event?.target : null))?.classList?.add('active');

    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

    if (tabName === 'generalSettings') {
        document.getElementById('generalSettingsTab').classList.add('active');
        if (typeof window._adminLoadCheckInsSettings === 'function') window._adminLoadCheckInsSettings();
    } else if (tabName === 'childModules') {
        document.getElementById('parentModulesTab').classList.add('active');
        if (allParents.length === 0) {
            if (typeof window._adminLoadAllParents === 'function') window._adminLoadAllParents();
        }
    } else if (tabName === 'moduleCustomisation') {
        document.getElementById('moduleCustomisationTab').classList.add('active');
        if (typeof window._adminRenderAllModulesList === 'function') window._adminRenderAllModulesList();
    } else if (tabName === 'moduleContentCreator') {
        document.getElementById('moduleContentCreatorTab').classList.add('active');
        if (typeof loadModulesToGenerate === 'function') loadModulesToGenerate();
        if (typeof populateMtgSuperSkillDropdown === 'function') populateMtgSuperSkillDropdown();
    } else if (tabName === 'theories') {
        document.getElementById('theoriesTab').classList.add('active');
        if (typeof window._adminLoadTheories === 'function') window._adminLoadTheories();
        if (typeof window._adminLoadAgeRangesTheories === 'function') window._adminLoadAgeRangesTheories();
        if (typeof window._adminLoadSuperSkillsTheories === 'function') window._adminLoadSuperSkillsTheories();
        if (typeof window._adminLoadSubSkillsTheories === 'function') window._adminLoadSubSkillsTheories();
        if (typeof window._adminLoadFasdDomainsTheories === 'function') window._adminLoadFasdDomainsTheories();
        if (typeof window._adminLoadNdisDomainsTheories === 'function') window._adminLoadNdisDomainsTheories();
    } else if (tabName === 'rewards') {
        document.getElementById('rewardsTab').classList.add('active');
        if (!rewards || rewards.length === 0) {
            if (typeof window._adminLoadRewards === 'function') window._adminLoadRewards();
        }
    } else if (tabName === 'parentToolkit') {
        document.getElementById('parentToolkitTab').classList.add('active');
        if (typeof window._adminLoadToolkitSettings === 'function') window._adminLoadToolkitSettings();
    } else if (tabName === 'billing') {
        document.getElementById('billingTab').classList.add('active');
        if (typeof window._adminLoadBillingSettings === 'function') window._adminLoadBillingSettings();
    }
};

// ================================================================================
// IMPORT ALL SUB-MODULES (they self-register their window functions)
// ================================================================================
import './adminModuleBuilder.js';
import './adminModuleCustomisation.js';
import './adminParentModules.js';
import './adminRewards.js';
import './adminCheckIns.js';
import './adminParentToolkit.js';
import './adminReferenceData.js';
import './adminGeneralSettings.js';
import './adminBilling.js';

// ================================================================================
// INITIALIZE
// ================================================================================
async function init() {
    const hasAccess = await checkAdminAccess();
    if (!hasAccess) return;

    await Promise.all([
        loadAllChildren(),
        loadAllModules(),
        (typeof window._adminLoadGeneralSettings === 'function'
            ? window._adminLoadGeneralSettings()
            : Promise.resolve())
    ]);

    if (typeof window._adminLoadRewards === 'function') {
        await window._adminLoadRewards();
    }
}

init();