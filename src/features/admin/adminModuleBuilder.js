// ================================================================================
// MODULE BUILDER — Add new module, AI generation, blueprints, enhanced modal,
//                  psychology dropdowns, preview/quality checks
// ================================================================================
import {
    supabase, requireSupabaseEnv,
    allModules, ageRanges, coreTheories, setAgeRanges, setCoreTheories,
    getModuleKey
} from './adminPage.js';

// ================================================================================
// GLOBALS (window-level for module-content-creator.js and inline handlers)
// ================================================================================
window.generalCategories = window.generalCategories || [];

// Super-skills / sub-skills / cycles data used during generation
let superSkillsData = [];
let subSkillsData = [];
let cyclesData = [];
let theoryConnectionsData = [];

// ========== GENERATION STATE ==========
let generationStartTime = null;
let elapsedInterval = null;
let currentJobId = null;
window.currentGenerationSpec = null;
let currentGenerationSpec = window.currentGenerationSpec;

window.generatedModuleHTML = null;
let generatedModuleHTML = window.generatedModuleHTML;

const legacyFileInput = document.getElementById('legacyModuleFile');
const triggerModuleUploadBtn = document.getElementById('triggerModuleUpload');
const migrationStatusEl = document.getElementById('migrationStatus');

if (triggerModuleUploadBtn && legacyFileInput) {
    triggerModuleUploadBtn.addEventListener('click', () => legacyFileInput.click());
    legacyFileInput.addEventListener('change', handleLegacyModuleUpload);
}

// ================================================================================
// PREVIEW MODAL (defined early for inline onclick)
// ================================================================================
window.showPreviewModal = function() {
    if (!window.generatedModuleHTML) {
        alert('Please generate a module first');
        return;
    }

    const modal = document.getElementById('previewModal');
    const iframe = document.getElementById('modulePreviewFrame');

    let previewContent = window.generatedModuleHTML;

    previewContent = previewContent.replace(
        /import\s*\{\s*initModuleHeader\s*\}\s*from\s*['"]\.\/modules\/shared\/module-header\.js['"];?\s*/g,
        '// Module header loaded via regular script for preview\n    '
    );

    if (!previewContent.includes('module-header.js')) {
        previewContent = previewContent.replace(
            /<\/head>/,
            '  <script src="/modules/shared/module-header.js"></script>\n</head>'
        );
    }

    iframe.srcdoc = previewContent;
    if (window.updateQualityIndicators) window.updateQualityIndicators();
    modal.classList.add('active');

    setTimeout(() => {
        if (window.checkModuleQuality) window.checkModuleQuality(iframe);
    }, 2000);
};

window.closePreviewModal = function() {
    const modal = document.getElementById('previewModal');
    modal.classList.remove('active');
};

window.updateQualityIndicators = function() {
    const pageCount = (window.generatedModuleHTML?.match(/data-page="/g) || []).length;
    const wordCount = window.currentGenerationSpec ? '~3800' : '~3800';

    const pageCountEl = document.getElementById('pageCount');
    const wordCountEl = document.getElementById('wordCount');
    if (pageCountEl) pageCountEl.textContent = pageCount;
    if (wordCountEl) wordCountEl.textContent = wordCount;

    const pageIndicator = document.getElementById('pageCountIndicator');
    if (pageIndicator) {
        pageIndicator.classList.remove('pass', 'warning', 'fail');
        if (pageCount >= 18) {
            pageIndicator.classList.add('pass');
        } else if (pageCount >= 15) {
            pageIndicator.classList.add('warning');
        } else {
            pageIndicator.classList.add('fail');
        }
    }
};

window.checkModuleQuality = function(iframe) {
    const icon = document.getElementById('jsCheckIcon');
    const text = document.getElementById('jsCheckText');
    const indicator = document.getElementById('jsCheckIndicator');

    if (icon) icon.textContent = '⏳';
    if (text) text.textContent = 'Checking...';
    if (indicator) indicator.classList.remove('pass', 'warning', 'fail');

    try {
        const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
        const pageElements = iframeDoc.querySelectorAll('[data-page]');
        const hasPages = pageElements && pageElements.length > 0;
        const hasHeader = iframeDoc.querySelector('#moduleHeaderRoot')?.innerHTML.length > 0;

        if (hasPages && hasHeader) {
            if (icon) icon.textContent = '✅';
            if (text) text.textContent = 'Module loaded successfully';
            if (indicator) indicator.classList.add('pass');
        } else {
            if (icon) icon.textContent = '⚠️';
            if (text) text.textContent = 'Module structure incomplete';
            if (indicator) indicator.classList.add('warning');
        }
    } catch (e) {
        if (icon) icon.textContent = '❌';
        if (text) text.textContent = 'Error checking module';
        if (indicator) indicator.classList.add('fail');
    }
};

// ================================================================================
// CATEGORY / PATHWAY QUICK-ADD MODALS
// ================================================================================
async function populateNewModuleCategoryDropdown() {
    const categorySelect = document.getElementById('newModuleCategory');
    if (!categorySelect) return;

    const currentValue = categorySelect.value;
    categorySelect.innerHTML = '<option value="">Select category...</option>';

    if (!Array.isArray(window.generalCategories) || window.generalCategories.length === 0) {
        try {
            const { data, error } = await supabase
                .from('category_colors')
                .select('category, color')
                .order('category', { ascending: true });

            if (error) throw error;
            window.generalCategories = data.map(c => ({
                name: c.category,
                color: c.color || '#4c6c96'
            }));
        } catch (err) {
            console.error('Error loading categories:', err);
        }
    }

    const categories = Array.isArray(window.generalCategories)
        ? window.generalCategories.map(cat => cat.name).filter(Boolean).sort()
        : [];

    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category.charAt(0).toUpperCase() + category.slice(1);
        categorySelect.appendChild(option);
    });

    if (currentValue && categories.includes(currentValue)) {
        categorySelect.value = currentValue;
    }
}

window.openQuickAddCategoryModal = function() {
    const modal = document.getElementById('quickAddCategoryModal');
    const nameInput = document.getElementById('quickCategoryName');
    const colorPicker = document.getElementById('quickCategoryColor');
    const colorHex = document.getElementById('quickCategoryColorHex');

    if (!modal) return;

    modal.style.display = 'flex';
    if (nameInput) { nameInput.value = ''; nameInput.focus(); }
    if (colorPicker) colorPicker.value = '#4c6c96';
    if (colorHex) colorHex.value = '#4c6c96';
};

window.closeQuickAddCategoryModal = function() {
    const modal = document.getElementById('quickAddCategoryModal');
    if (modal) modal.style.display = 'none';
};

function syncQuickCategoryColorInputs(source) {
    const colorPicker = document.getElementById('quickCategoryColor');
    const colorHex = document.getElementById('quickCategoryColorHex');
    if (!colorPicker || !colorHex) return;
    if (source === 'picker') {
        colorHex.value = colorPicker.value;
    } else {
        const hexValue = colorHex.value?.trim();
        if (hexValue) colorPicker.value = hexValue;
    }
}

document.getElementById('quickCategoryColor')?.addEventListener('input', () => syncQuickCategoryColorInputs('picker'));
document.getElementById('quickCategoryColorHex')?.addEventListener('blur', () => syncQuickCategoryColorInputs('hex'));

window.saveQuickCategory = async function(event) {
    event.preventDefault();
    const nameInput = document.getElementById('quickCategoryName');
    const colorHexInput = document.getElementById('quickCategoryColorHex');
    const colorPickerInput = document.getElementById('quickCategoryColor');

    const displayName = nameInput?.value.trim();
    const colorValue = colorHexInput?.value?.trim() || colorPickerInput?.value || '#4c6c96';
    if (!displayName) { alert('Please enter a category name'); return; }

    const categoryValue = displayName.toLowerCase();
    if (window.generalCategories.some(category => category.name === categoryValue)) {
        alert('Category already exists');
        return;
    }

    const generalNameInput = document.getElementById('newCategoryName');
    const generalColorPicker = document.getElementById('newCategoryColor');
    const generalColorHex = document.getElementById('newCategoryColorHex');

    if (generalNameInput && generalColorPicker && generalColorHex) {
        generalNameInput.value = displayName;
        generalColorPicker.value = colorValue;
        generalColorHex.value = colorValue;
    }

    await window.addGeneralCategory();

    setTimeout(() => {
        const newModuleCategory = document.getElementById('newModuleCategory');
        if (newModuleCategory) newModuleCategory.value = categoryValue;
    }, 100);

    window.closeQuickAddCategoryModal();
};

window.openQuickAddPathwayModal = async function() {
    const modal = document.getElementById('quickAddPathwayModal');
    const input = document.getElementById('quickPathwayName');
    const categorySelect = document.getElementById('quickPathwayCategory');

    if (!window.generalCategories || !Array.isArray(window.generalCategories) || window.generalCategories.length === 0) {
        if (typeof window._adminLoadGeneralSettings === 'function') await window._adminLoadGeneralSettings();
    }

    if (typeof window._adminLoadCategoriesIntoPathwayDropdowns === 'function') {
        window._adminLoadCategoriesIntoPathwayDropdowns();
    }

    if (modal) {
        modal.style.display = 'flex';
        if (input) { input.value = ''; input.focus(); }
        if (categorySelect) categorySelect.value = '';
    }
};

window.openQuickAddEmotionModal = function() {
    const modal = document.getElementById('quickAddEmotionModal');
    const input = document.getElementById('quickEmotionName');
    if (modal) {
        modal.style.display = 'flex';
        if (input) { input.value = ''; input.focus(); }
    }
};
window.closeQuickAddEmotionModal = function() {
    const modal = document.getElementById('quickAddEmotionModal');
    if (modal) modal.style.display = 'none';
};
window.openQuickAddSkillModal = function() {
    const modal = document.getElementById('quickAddSkillModal');
    const input = document.getElementById('quickSkillName');
    if (modal) {
        modal.style.display = 'flex';
        if (input) { input.value = ''; input.focus(); }
    }
};
window.closeQuickAddSkillModal = function() {
    const modal = document.getElementById('quickAddSkillModal');
    if (modal) modal.style.display = 'none';
};

window.saveQuickEmotion = async function(event) {
    event.preventDefault();
    const emotionName = document.getElementById('quickEmotionName').value.trim();
    if (!emotionName) { alert('Please enter an emotion'); return; }
    const generalInput = document.getElementById('newEmotionName');
    if (generalInput) generalInput.value = emotionName;
    if (window.addGeneralEmotion) await window.addGeneralEmotion();
    addOptionToMultiSelect('newModuleEmotions', emotionName, true);
    window.closeQuickAddEmotionModal();
};

window.saveQuickSkill = async function(event) {
    event.preventDefault();
    const skillName = document.getElementById('quickSkillName').value.trim();
    if (!skillName) { alert('Please enter a skill'); return; }
    const generalInput = document.getElementById('newSkillName');
    if (generalInput) generalInput.value = skillName;
    if (window.addGeneralSkill) await window.addGeneralSkill();
    addOptionToMultiSelect('newModuleSkills', skillName, true);
    window.closeQuickAddSkillModal();
};

function addOptionToMultiSelect(selectId, value, shouldSelect = false) {
    if (!value) return;
    const select = document.getElementById(selectId);
    if (!select) return;
    const normalized = value.trim();
    const exists = Array.from(select.options).some(opt => opt.value.toLowerCase() === normalized.toLowerCase());
    if (!exists) {
        const option = document.createElement('option');
        option.value = normalized;
        option.textContent = normalized;
        select.appendChild(option);
        if (shouldSelect) option.selected = true;
    } else if (shouldSelect) {
        const match = Array.from(select.options).find(opt => opt.value.toLowerCase() === normalized.toLowerCase());
        if (match) match.selected = true;
    }
}

// ================================================================================
// LOAD AGE RANGES (for Add Module form)
// ================================================================================
export async function loadAgeRanges() {
    const select = document.getElementById('ageRangeSelect');
    const editSelect = document.getElementById('editAgeRange');
    if (!select && !editSelect) { console.warn('[Psychology] Age range select not found'); return; }

    try {
        const { data: ageRangesData, error: ageRangesError } = await supabase
            .from('age_ranges')
            .select('id, age_range, display_name')
            .eq('is_active', true)
            .order('age_range', { ascending: true });

        if (ageRangesError) throw new Error(`Database query failed: ${ageRangesError.message}`);

        const data = { ageRanges: ageRangesData || [] };

        if (data.ageRanges && data.ageRanges.length > 0) {
            setAgeRanges(data.ageRanges);
            window._dd_ageRanges = data.ageRanges;
            const selects = [select, editSelect].filter(Boolean);
            selects.forEach(targetSelect => {
                targetSelect.innerHTML = '<option value="">Select age range...</option>';
                data.ageRanges.forEach(range => {
                    const option = document.createElement('option');
                    option.value = range.id;
                    option.textContent = range.age_range;
                    option.dataset.ageRange = range.age_range;
                    targetSelect.appendChild(option);
                });
            });

            if (typeof window._adminRenderAllModulesList === 'function') window._adminRenderAllModulesList();
        } else {
            if (select) select.innerHTML = '<option value="">No age ranges found</option>';
            if (editSelect) editSelect.innerHTML = '<option value="">No age ranges found</option>';
        }
    } catch (error) {
        console.error('[Psychology] Failed to load age ranges:', error);
        if (select) select.innerHTML = '<option value="">Error loading age ranges</option>';
        if (editSelect) editSelect.innerHTML = '<option value="">Error loading age ranges</option>';
    }
}

// ================================================================================
// LOAD CORE THEORIES (for Add Module form)
// ================================================================================
export async function loadCoreTheories() {
    const select = document.getElementById('coreTheorySelect');
    const editSelect = document.getElementById('editCoreTheorySelect');
    if (!select && !editSelect) { console.warn('[Psychology] Core theory select not found'); return; }

    try {
        const { data: coreTheoriesData, error } = await supabase
            .from('core_theories')
            .select('id, theory_name, theory_code, description, category')
            .eq('is_active', true)
            .order('category', { ascending: true })
            .order('theory_name', { ascending: true });

        if (error) throw new Error(`Database error: ${error.message}`);

        if (coreTheoriesData && coreTheoriesData.length > 0) {
            setCoreTheories(coreTheoriesData);
            window._dd_coreTheories = coreTheoriesData;
            const selects = [select, editSelect].filter(Boolean);
            selects.forEach(targetSelect => {
                targetSelect.innerHTML = '<option value="">Select psychological theory...</option>';
                coreTheoriesData.forEach(theory => {
                    const option = document.createElement('option');
                    option.value = theory.id;
                    option.textContent = theory.theory_name;
                    option.dataset.description = theory.description || '';
                    targetSelect.appendChild(option);
                });
            });
        } else {
            if (select) select.innerHTML = '<option value="">No theories found</option>';
            if (editSelect) editSelect.innerHTML = '<option value="">No theories found</option>';
        }
    } catch (error) {
        console.error('[Psychology] Failed to load core theories:', error);
        if (select) select.innerHTML = '<option value="">Error loading theories</option>';
        if (editSelect) editSelect.innerHTML = '<option value="">Error loading theories</option>';
    }
}

// ================================================================================
// THEORY PREVIEW
// ================================================================================
export function updateTheoryPreview({ selectId, previewId, nameId, descriptionId }) {
    const select = document.getElementById(selectId);
    const preview = document.getElementById(previewId);
    const selectedId = select?.value;

    if (!selectedId || !preview) {
        if (preview) preview.style.display = 'none';
        return;
    }

    const theory = coreTheories.find(t => t.id === selectedId);
    if (theory) {
        const nameEl = document.getElementById(nameId);
        const descEl = document.getElementById(descriptionId);
        if (nameEl) nameEl.textContent = theory.theory_name;
        if (descEl) descEl.textContent = theory.description || 'No description available.';
        preview.style.display = 'block';
    } else {
        preview.style.display = 'none';
    }
}

// Make available globally for edit form
window._adminUpdateTheoryPreview = updateTheoryPreview;

// ================================================================================
// INIT PSYCHOLOGY DROPDOWNS
// ================================================================================
function initPsychologyDropdowns() {
    loadAgeRanges();
    loadCoreTheories();

    const theorySelect = document.getElementById('coreTheorySelect');
    if (theorySelect) {
        theorySelect.onchange = () => updateTheoryPreview({
            selectId: 'coreTheorySelect',
            previewId: 'theoryPreview',
            nameId: 'theoryPreviewName',
            descriptionId: 'theoryPreviewDescription'
        });
    }

    const editTheorySelect = document.getElementById('editCoreTheorySelect');
    if (editTheorySelect) {
        editTheorySelect.onchange = () => updateTheoryPreview({
            selectId: 'editCoreTheorySelect',
            previewId: 'editTheoryPreview',
            nameId: 'editTheoryPreviewName',
            descriptionId: 'editTheoryPreviewDescription'
        });
    }
}

document.addEventListener('DOMContentLoaded', function() {
    initPsychologyDropdowns();
});

// ================================================================================
// OPEN / CLOSE ADD MODULE MODAL
// ================================================================================
window.closeAddModuleModal = function() {
    const modal = document.getElementById('addModuleModal');
    const form = document.getElementById('addModuleForm');
    if (modal) modal.classList.remove('active');
    if (form) form.reset();
    const statusEl = document.getElementById('aiGenerationStatus');
    if (statusEl) statusEl.textContent = '';
    const previewContainer = document.getElementById('aiGeneratedResult');
    if (previewContainer) previewContainer.style.display = 'none';
    const previewTextarea = document.getElementById('aiGeneratedPreview');
    if (previewTextarea) previewTextarea.value = '';
    const previewSummary = document.getElementById('aiGeneratedSummary');
    if (previewSummary) previewSummary.textContent = '';
    const previewStats = document.getElementById('aiGeneratedStats');
    if (previewStats) previewStats.innerHTML = '';
    const saveBtn = document.getElementById('saveAiGeneratedModuleBtn');
    if (saveBtn) saveBtn.disabled = true;
};

window.openAddModuleModal = async function() {
    const modal = document.getElementById('addModuleModal');
    if (modal) {
        modal.classList.add('active');
        const form = document.getElementById('addModuleForm');
        if (form) {
            form.reset();
            const codeInput = document.getElementById('newModuleCode');
            if (codeInput) codeInput.value = generateNextModuleCode();
        }
        await loadPendingBlueprintsDropdown();
        const statusEl = document.getElementById('blueprintLoadedStatus');
        if (statusEl) statusEl.style.display = 'none';
    }
};

// ================================================================================
// BLUEPRINTS
// ================================================================================
async function loadPendingBlueprintsDropdown() {
    const dropdown = document.getElementById('moduleBlueprintSelect');
    if (!dropdown) return;
    try {
        const { data, error } = await supabase
            .from('modules_to_generate')
            .select('id, module_title, cycle, week_number, level, super_skill_id')
            .eq('has_been_generated', false)
            .order('cycle', { ascending: true })
            .order('week_number', { ascending: true });
        if (error) { console.error('Error loading blueprints:', error); return; }
        dropdown.innerHTML = '<option value="">-- Select a pending blueprint --</option>' +
            (data || []).map(bp => {
                const label = [bp.cycle, bp.week_number ? `Week ${bp.week_number}` : null, bp.level, bp.module_title].filter(Boolean).join(' - ');
                return `<option value="${bp.id}">${label}</option>`;
            }).join('');
    } catch (error) {
        console.error('Error loading blueprints dropdown:', error);
    }
}

window.loadModuleBlueprintIntoForm = async function() {
    const blueprintId = document.getElementById('moduleBlueprintSelect').value;
    if (!blueprintId) return;

    try {
        const { data: blueprint, error } = await supabase
            .from('modules_to_generate')
            .select('*')
            .eq('id', blueprintId)
            .single();
        if (error || !blueprint) { console.error('Error loading blueprint:', error); return; }

        document.getElementById('addModuleForm').dataset.blueprintId = blueprintId;

        const titleField = document.getElementById('newModuleTitle');
        const ageRangeField = document.getElementById('ageRangeSelect');
        const coreTheoryField = document.getElementById('coreTheorySelect');
        const brainTownField = document.getElementById('brainTownAnalogy');
        const superSkillField = document.getElementById('newModuleSuperSkill');
        const subSkillField = document.getElementById('newModuleSubSkill');
        const cycleSelect = document.getElementById('newModuleCycle');
        const orderField = document.getElementById('newModuleOrder');

        const normalizeLookup = (value) => (value || '').toString().trim().toLowerCase().replace(/\s+/g, '').replace(/[-–—]/g, '');
        const setSelectByName = (selectEl, lookupName) => {
            if (!selectEl || !lookupName) return false;
            const target = normalizeLookup(lookupName);
            for (let opt of selectEl.options) {
                const optionText = normalizeLookup(opt.text);
                const optionValue = normalizeLookup(opt.value);
                const optionData = normalizeLookup(opt.dataset?.ageRange || '');
                if (optionText === target || optionValue === target || optionData === target) {
                    selectEl.value = opt.value;
                    return true;
                }
            }
            return false;
        };
        const waitForSelectOptions = async (selectEl, timeoutMs = 2000) => {
            if (!selectEl) return;
            const start = Date.now();
            while (selectEl.options.length <= 1 && Date.now() - start < timeoutMs) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        };

        if (titleField) titleField.value = blueprint.module_title || '';
        await loadAgeRanges();
        await loadCoreTheories();
        await waitForSelectOptions(ageRangeField);
        await waitForSelectOptions(coreTheoryField);

        if (ageRangeField) {
            if (!setSelectByName(ageRangeField, blueprint.age_range || '')) ageRangeField.value = blueprint.age_range || '';
        }
        if (coreTheoryField) {
            if (!setSelectByName(coreTheoryField, blueprint.core_theory || '')) coreTheoryField.value = blueprint.core_theory || '';
            updateTheoryPreview({ selectId: 'coreTheorySelect', previewId: 'theoryPreview', nameId: 'theoryPreviewName', descriptionId: 'theoryPreviewDescription' });
            if (blueprint.core_theory) {
                coreTheoryField.style.backgroundColor = '#D1FAE5';
                setTimeout(() => { coreTheoryField.style.backgroundColor = ''; }, 3000);
            }
        }
        if (brainTownField) {
            brainTownField.value = blueprint.brain_town_analogy || '';
            if (blueprint.brain_town_analogy) {
                brainTownField.style.backgroundColor = '#D1FAE5';
                setTimeout(() => { brainTownField.style.backgroundColor = ''; }, 3000);
            }
        }

        const xpRewardField = document.getElementById('newModuleXPReward');
        const starsRewardField = document.getElementById('newModuleStarsReward');
        if (xpRewardField && blueprint.xp_reward) xpRewardField.value = blueprint.xp_reward;
        if (starsRewardField && blueprint.stars_reward) starsRewardField.value = blueprint.stars_reward;

        if (superSkillField && blueprint.super_skill_id) {
            superSkillField.value = blueprint.super_skill_id;
            if (typeof onSuperSkillChange === 'function') await onSuperSkillChange();
            setTimeout(() => { if (subSkillField && blueprint.sub_skill_id) subSkillField.value = blueprint.sub_skill_id; }, 100);
        }
        if (cycleSelect && blueprint.cycle) {
            for (let opt of cycleSelect.options) {
                if (opt.text.toLowerCase().includes(blueprint.cycle.toLowerCase()) || opt.value.toLowerCase().includes(blueprint.cycle.toLowerCase())) {
                    cycleSelect.value = opt.value;
                    break;
                }
            }
            if (typeof onModuleCycleChange === 'function') onModuleCycleChange();
        }
        if (orderField && blueprint.week_number) orderField.value = blueprint.week_number;

        const contentBrief = buildContentBriefFromBlueprint(blueprint);
        document.getElementById('newModuleContentBrief').value = contentBrief;

        const statusEl = document.getElementById('blueprintLoadedStatus');
        if (statusEl) statusEl.style.display = 'block';
    } catch (error) {
        console.error('Error loading blueprint into form:', error);
    }
};

function buildContentBriefFromBlueprint(blueprint) {
    if (blueprint.ai_content_prompt) return blueprint.ai_content_prompt;
    const parts = [];
    if (blueprint.module_title) parts.push(`Title: ${blueprint.module_title}`);
    if (blueprint.age_range) parts.push(`Age Range: ${blueprint.age_range}`);
    if (blueprint.cycle) parts.push(`Cycle: ${blueprint.cycle}`);
    if (blueprint.level) parts.push(`Level: ${blueprint.level}`);
    if (blueprint.core_theory) parts.push(`\nCore Theory: ${blueprint.core_theory}`);
    if (blueprint.brain_town_analogy) parts.push(`\nBrain Town Analogy: ${blueprint.brain_town_analogy}`);
    if (blueprint.main_activity) parts.push(`\nMain Activity: ${blueprint.main_activity}`);
    if (blueprint.builds_on && blueprint.builds_on !== 'N/A') parts.push(`\nBuilds On: ${blueprint.builds_on}`);
    return parts.join('\n');
}

// ================================================================================
// SESSION RECOVERY
// ================================================================================
function saveGenerationSession(jobId, brief) {
    localStorage.setItem('ai_generation_session', JSON.stringify({ jobId, brief, timestamp: Date.now() }));
}
function loadGenerationSession() {
    const session = localStorage.getItem('ai_generation_session');
    if (!session) return null;
    const data = JSON.parse(session);
    if (Date.now() - data.timestamp < 600000) return data;
    clearGenerationSession();
    return null;
}
function clearGenerationSession() { localStorage.removeItem('ai_generation_session'); }

window.addEventListener('DOMContentLoaded', () => {
    const session = loadGenerationSession();
    if (session) {
        const resume = confirm('🔄 It looks like a module generation was interrupted.\n\nWould you like to check its status?');
        if (resume) {
            document.getElementById('newModuleContentBrief').value = session.brief;
            resumeGeneration(session.jobId);
        } else {
            clearGenerationSession();
        }
    }
});

function resumeGeneration(jobId) {
    currentJobId = jobId;
    showGenerationPipeline();
    addLog('Resuming interrupted generation...');
    pollForJobResult(jobId).then(result => {
        if (result.success) handleGenerationSuccess(result);
    }).catch(error => {
        handleGenerationError(error);
    });
}

// ================================================================================
// PIPELINE UI
// ================================================================================
function showGenerationPipeline() {
    const modal = document.getElementById('generationLoadingModal');
    if (modal) { modal.style.display = 'flex'; document.body.style.overflow = 'hidden'; }
}
function hideGenerationPipeline() {
    const modal = document.getElementById('generationLoadingModal');
    if (modal) { modal.style.display = 'none'; document.body.style.overflow = ''; }
}
function resetPipelineSteps() {
    document.querySelectorAll('.pipeline-step').forEach(step => step.classList.remove('active', 'complete'));
    updateProgressBar(0);
}
function updatePipelineStep(stepName) {
    const steps = ['initializing', 'skeleton', 'expansion', 'validation', 'rendering'];
    const stepIndex = steps.indexOf(stepName);
    if (stepIndex === -1) return;
    for (let i = 0; i < stepIndex; i++) {
        const stepEl = document.querySelector(`[data-step="${steps[i]}"]`);
        if (stepEl) { stepEl.classList.remove('active'); stepEl.classList.add('complete'); }
    }
    const currentStepEl = document.querySelector(`[data-step="${stepName}"]`);
    if (currentStepEl) { currentStepEl.classList.remove('complete'); currentStepEl.classList.add('active'); }
    const progress = ((stepIndex + 1) / steps.length) * 100;
    updateProgressBar(progress);
}
function updateProgressBar(percent) {
    const pipelineSteps = document.querySelector('.pipeline-steps');
    if (pipelineSteps) pipelineSteps.style.setProperty('--progress', `${percent}%`);
}
function markStepComplete(stepName) {
    const stepEl = document.querySelector(`[data-step="${stepName}"]`);
    if (stepEl) { stepEl.classList.remove('active'); stepEl.classList.add('complete'); }
}

// ================================================================================
// GENERATION LOG
// ================================================================================
function clearLog() {
    const log = document.getElementById('generationLog');
    if (log) log.innerHTML = '';
}
function addLog(message, type = 'info') {
    const log = document.getElementById('generationLog');
    if (!log) return;
    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;
    const timeStr = generationStartTime ? formatElapsed(Date.now() - generationStartTime) : '00:00';
    entry.innerHTML = `<span class="log-time">${timeStr}</span><span>${message}</span>`;
    log.appendChild(entry);
    log.scrollTop = log.scrollHeight;
}

// ================================================================================
// TIME TRACKING
// ================================================================================
function startElapsedTimer() {
    stopElapsedTimer();
    const updateTimer = () => {
        if (!generationStartTime) return;
        const elapsed = Date.now() - generationStartTime;
        document.getElementById('elapsedTime').textContent = formatElapsed(elapsed);
    };
    updateTimer();
    elapsedInterval = setInterval(updateTimer, 1000);
}
function stopElapsedTimer() { if (elapsedInterval) { clearInterval(elapsedInterval); elapsedInterval = null; } }
function formatElapsed(ms) {
    const seconds = Math.floor(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}
function updateEstimatedRemaining(seconds) {
    const mins = Math.ceil(seconds / 60);
    document.getElementById('estimatedRemaining').textContent = seconds < 60 ? `${seconds}s` : `~${mins}m`;
}

// ================================================================================
// ERROR HANDLING
// ================================================================================
function handleGenerationError(error) {
    const statusEl = document.getElementById('aiGenerationStatus');
    addLog('✗ Generation failed: ' + error.message, 'error');
    statusEl.textContent = '❌ Failed';
    statusEl.style.color = '#ef4444';
    const errorInfo = classifyGenerationError(error);
    showErrorNotification(errorInfo);
}

function classifyGenerationError(error) {
    const msg = error.message.toLowerCase();
    if (msg.includes('api key') || msg.includes('not_found_error')) {
        return { title: '🔑 API Key Issue', message: 'The Claude API key is missing or invalid.', suggestion: 'Verify your Anthropic API key in the Supabase settings table.', action: 'Check Settings', actionFn: () => alert('Go to Supabase → Database → settings table and verify claude_api_key') };
    }
    if (msg.includes('timeout') || msg.includes('timed out')) {
        return { title: '⏱️ Generation Timeout', message: 'The generation took longer than expected.', suggestion: 'Try simplifying your content brief or try again.', action: 'Retry', actionFn: () => document.getElementById('generateModuleBtn').click() };
    }
    if (msg.includes('validation') || msg.includes('spec') || msg.includes('pages')) {
        return { title: '📋 Generation Error', message: 'The AI had trouble creating a complete module.', suggestion: 'Try again - the AI will use a different approach.', action: 'Retry Generation', actionFn: () => document.getElementById('generateModuleBtn').click() };
    }
    if (msg.includes('network') || msg.includes('fetch')) {
        return { title: '🌐 Network Error', message: 'Could not connect to the generation service.', suggestion: 'Check your internet connection and verify the edge function is deployed.', action: 'Retry', actionFn: () => document.getElementById('generateModuleBtn').click() };
    }
    return { title: '❌ Generation Failed', message: error.message, suggestion: 'Please try again. If the problem persists, contact support.', action: 'Retry', actionFn: () => document.getElementById('generateModuleBtn').click() };
}

function showErrorNotification(errorInfo) {
    const existing = document.querySelector('.error-notification');
    if (existing) existing.remove();
    const notification = document.createElement('div');
    notification.className = 'error-notification';
    notification.innerHTML = `
        <button class="error-notification-close" onclick="this.parentElement.remove()">×</button>
        <div class="error-notification-header">
            <div class="error-notification-icon">⚠️</div>
            <div class="error-notification-content">
                <h3>${errorInfo.title}</h3>
                <p>${errorInfo.message}</p>
                ${errorInfo.suggestion ? `<p style="margin-top: 8px; font-weight: 600; color: #374151;">💡 ${errorInfo.suggestion}</p>` : ''}
            </div>
        </div>
        ${errorInfo.action ? `
            <div class="error-notification-actions">
                <button class="error-notification-btn primary" onclick="(${errorInfo.actionFn.toString()})(); this.closest('.error-notification').remove();">${errorInfo.action}</button>
                <button class="error-notification-btn secondary" onclick="this.closest('.error-notification').remove()">Dismiss</button>
            </div>
        ` : ''}
    `;
    document.body.appendChild(notification);
    setTimeout(() => {
        if (notification.parentElement) {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(100px)';
            setTimeout(() => notification.remove(), 300);
        }
    }, 10000);
}

// ================================================================================
// PREVIEW & APPROVE
// ================================================================================
function approveAndSaveFromPreview() {
    window.closePreviewModal();
    document.getElementById('saveAiGeneratedModuleBtn').click();
}
function regenerateModule() {
    if (confirm('🔄 This will generate a new version of the module.\n\nContinue?')) {
        window.closePreviewModal();
        document.getElementById('generateModuleBtn').click();
    }
}

function applyGeneratedMetadataToForm(metadata) {
    if (!metadata) return;
    const shortDescEl = document.getElementById('newModuleShortDescription');
    const descEl = document.getElementById('newModuleDescription');
    if (shortDescEl && !shortDescEl.value.trim() && metadata.shortDescription) shortDescEl.value = metadata.shortDescription;
    if (descEl && !descEl.value.trim() && metadata.description) descEl.value = metadata.description;
}

// ================================================================================
// AI LOOKUP CONTEXT BUILDER
// ================================================================================
function buildAIGenerationLookupContext(params) {
    const { superSkillId, subSkillId, cycleId, ageRangeId, coreTheoryId, secondaryTheoryIds, diagnosisPathways, neuroscienceConcept, ndisDomainIds, dssSediIds } = params;
    const selectedSuperSkill = superSkillsData.find(s => s.id === superSkillId) || null;
    const selectedSubSkill = subSkillsData.find(s => s.id === subSkillId) || null;
    const selectedCycle = cyclesData.find(c => c.id === cycleId) || null;
    const selectedAgeRange = ageRanges.find(a => a.id === ageRangeId) || null;
    const selectedCoreTheory = coreTheories.find(t => t.id === coreTheoryId) || null;
    const selectedSecondaryTheories = (secondaryTheoryIds || []).map(id => coreTheories.find(t => t.id === id)).filter(Boolean);
    const selectedNdisDomains = (ndisDomainIds || []).map(id => (window.enhancedModuleModal?.ndisDomains || []).find(d => d.id === id)).filter(Boolean);
    const selectedSediCategories = (dssSediIds || []).map(id => (window.enhancedModuleModal?.sediCategories || []).find(sc => sc.id === id)).filter(Boolean);
    const selectedTheoryConnection = theoryConnectionsData.find(c => c.super_skill_id === superSkillId && c.cycle_id === cycleId) || null;

    return {
        superSkill: selectedSuperSkill ? { id: selectedSuperSkill.id, name: selectedSuperSkill.name, code: selectedSuperSkill.code, slug: selectedSuperSkill.slug, domain: selectedSuperSkill.domain || selectedSuperSkill.description || null, characterName: selectedSuperSkill.character_name || null, species: selectedSuperSkill.species || null, personality: selectedSuperSkill.personality || null, ndAffirmation: selectedSuperSkill.nd_affirmation || null, relevantTheories: selectedSuperSkill.relevant_theories || null } : null,
        subSkill: selectedSubSkill ? { id: selectedSubSkill.id, name: selectedSubSkill.name, description: selectedSubSkill.description || null } : null,
        cycle: selectedCycle ? { id: selectedCycle.id, cycleNumber: selectedCycle.cycle_number, name: selectedCycle.name, objective: selectedCycle.objective || null, focus: selectedCycle.focus || null, evidenceFocus: selectedCycle.evidence_focus || null, superSkillId: selectedCycle.super_skill_id } : null,
        ageBand: selectedAgeRange ? { id: selectedAgeRange.id, ageRange: selectedAgeRange.age_range, displayName: selectedAgeRange.display_name, languageGuidelines: selectedAgeRange.language_guidelines || null, developmentalStage: selectedAgeRange.developmental_stage || null, vocabularyLevel: selectedAgeRange.vocabulary_level || null } : null,
        coreTheory: selectedCoreTheory ? { id: selectedCoreTheory.id, name: selectedCoreTheory.theory_name, code: selectedCoreTheory.theory_code, description: selectedCoreTheory.description || null, category: selectedCoreTheory.category || null } : null,
        secondaryTheories: selectedSecondaryTheories.map(t => ({ id: t.id, name: t.theory_name })),
        theoryConnection: selectedTheoryConnection,
        diagnosisPathways: diagnosisPathways || [],
        neuroscienceConcept: neuroscienceConcept || null,
        ndisDomains: selectedNdisDomains.map(d => ({ id: d.id, name: d.domain_name })),
        sediCategories: selectedSediCategories.map(sc => ({ id: sc.id, code: sc.sedi_code, name: sc.sedi_name }))
    };
}

// ================================================================================
// GENERATE MODULE WITH AI (main flow)
// ================================================================================
function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

async function startGenerationJob(payload) {
    const response = await fetch(`${requireSupabaseEnv().url}/functions/v1/generate-module`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${requireSupabaseEnv().key}`, "apikey": requireSupabaseEnv().key },
        body: JSON.stringify({ ...payload, async: true })
    });
    if (!response.ok) { const errorText = await response.text(); throw new Error(`HTTP ${response.status}: ${errorText}`); }
    const data = await response.json();
    if (!data.jobId) throw new Error("No job ID returned from server");
    return data.jobId;
}

async function pollForJobResult(jobId, maxAttempts = 300) {
    const statusEl = document.getElementById("aiGenerationStatus");
    const pollIntervalMs = 3000;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        let response;
        try {
            response = await fetch(`${requireSupabaseEnv().url}/functions/v1/generate-module/status/${jobId}`, {
                method: "GET",
                headers: { "Authorization": `Bearer ${requireSupabaseEnv().key}`, "apikey": requireSupabaseEnv().key }
            });
        } catch (err) {
            console.warn(`[AI] Polling fetch error (attempt ${attempt}):`, err);
            if (attempt === maxAttempts) throw new Error(`Polling failed after ${maxAttempts} attempts: ${err?.message || err}`);
            await sleep(pollIntervalMs);
            continue;
        }
        if (!response.ok) {
            if (attempt === maxAttempts) throw new Error(`Failed to check job status after ${maxAttempts} attempts (HTTP ${response.status})`);
            await sleep(pollIntervalMs);
            continue;
        }
        const data = await response.json();
        if (data.status === "completed") return data.result;
        if (data.status === "failed") throw new Error(data.error || "Job failed");
        if (data.status === "running") {
            const elapsedSeconds = attempt * (pollIntervalMs / 1000);
            if (statusEl) statusEl.textContent = `⏳ Generating... (${elapsedSeconds}s elapsed)`;
            if (data.progress) {
                updatePipelineStep(data.progress.step);
                addLog(data.progress.message, 'info');
                if (data.progress.metadata?.wordCount) addLog(`Word count: ${data.progress.metadata.wordCount}`, 'info');
                if (data.progress.metadata?.pageCount) addLog(`Pages: ${data.progress.metadata.pageCount}`, 'info');
            }
            if (data.estimated_remaining_seconds !== undefined) updateEstimatedRemaining(data.estimated_remaining_seconds);
            await sleep(pollIntervalMs);
            continue;
        }
        if (attempt === maxAttempts) throw new Error(`Unknown job status after ${maxAttempts} attempts: ${data.status}`);
        await sleep(pollIntervalMs);
    }
    throw new Error("Job timed out after maximum attempts");
}

window.generateModuleWithAI = async function() {
    const statusEl = document.getElementById('aiGenerationStatus');
    const generateBtn = document.getElementById('generateModuleBtn');
    const previewContainer = document.getElementById('aiGeneratedResult');
    const previewTextarea = document.getElementById('aiGeneratedPreview');
    const previewSummary = document.getElementById('aiGeneratedSummary');
    const previewStats = document.getElementById('aiGeneratedStats');
    const saveBtn = document.getElementById('saveAiGeneratedModuleBtn');

    const title = document.getElementById('newModuleTitle').value.trim();
    const moduleCode = document.getElementById('newModuleCode').value.trim();
    const category = document.getElementById('newModuleCategory').value;
    const seriesId = document.getElementById('newModuleSeries').value;
    const weekNumber = document.getElementById('newModuleOrder')?.value || null;
    const cycleId = document.getElementById('newModuleCycle')?.value || null;
    const contentBrief = document.getElementById('newModuleContentBrief').value.trim();
    const enrichedBrief = moduleCode ? `MODULE CODE: ${moduleCode}\n\n${contentBrief}` : contentBrief;

    previewContainer.style.display = 'none';
    previewTextarea.value = '';
    previewSummary.textContent = '';
    previewStats.innerHTML = '';
    saveBtn.disabled = true;

    try {
        const superSkillEl = document.getElementById('newModuleSuperSkill');
        const subSkillEl = document.getElementById('newModuleSubSkill');
        const ageRangeEl = document.getElementById('ageRangeSelect');
        const coreTheoryEl = document.getElementById('coreTheorySelect');
        const brainTownEl = document.getElementById('brainTownAnalogy');

        const superSkillId = superSkillEl?.value || null;
        const subSkillId = subSkillEl?.value || null;
        const ageRangeId = ageRangeEl?.value || null;
        const coreTheoryId = coreTheoryEl?.value || null;
        const brainTownAnalogy = brainTownEl?.value?.trim() || '';
        const superSkillName = superSkillEl?.selectedOptions?.[0]?.text?.trim() || '';
        const subSkillName = subSkillEl?.selectedOptions?.[0]?.text?.trim() || '';

        if (!title) { alert('❌ Please enter a module title'); document.getElementById('newModuleTitle').focus(); return; }
        if (!superSkillId) { alert('❌ Please select a Super Skill'); document.getElementById('newModuleSuperSkill').focus(); return; }
        if (!ageRangeId) { alert('❌ Please select an Age Range'); ageRangeEl?.focus(); return; }
        if (!coreTheoryId) { alert('❌ Please select a Core Theory'); coreTheoryEl?.focus(); return; }
        if (!brainTownAnalogy) { alert('❌ Please provide a Brain Town Analogy'); brainTownEl?.focus(); return; }

        showGenerationPipeline();
        generateBtn.disabled = true;
        generateBtn.textContent = '⏳ Generating...';
        statusEl.textContent = 'Starting AI generation...';
        statusEl.style.color = '#7b3ff2';

        const safetyTimeout = setTimeout(() => {
            hideGenerationPipeline();
            generateBtn.disabled = false;
            generateBtn.textContent = ' Generate Module with AI';
            statusEl.textContent = ' Generation timed out. Please try again.';
            statusEl.style.color = '#ef4444';
        }, 300000);

        try {
            const jobId = await startGenerationJob({
                contentBrief: enrichedBrief, seriesId, category, weekNumber, cycleId,
                superSkillId, subSkillId, title, ageRangeId, coreTheoryId, brainTownAnalogy,
                additionalContext: contentBrief, briefSuperSkill: superSkillName, briefSubSkill: subSkillName,
                adminTitle: title, adminAge: ageRangeId, briefTheory: coreTheoryId
            });
            currentJobId = jobId;
            saveGenerationSession(jobId, contentBrief);

            const result = await pollForJobResult(jobId);
            if (!result || !result.html) throw new Error('AI did not return valid HTML');

            window.generatedModuleHTML = result.html;
            generatedModuleHTML = window.generatedModuleHTML;
            window.currentGenerationSpec = result.spec;
            currentGenerationSpec = window.currentGenerationSpec;
            applyGeneratedMetadataToForm(currentGenerationSpec?.metadata);

            if (moduleCode && window.generatedModuleHTML.includes('__MODULE_CODE__')) {
                window.generatedModuleHTML = window.generatedModuleHTML.replace(/__MODULE_CODE__/g, moduleCode);
                generatedModuleHTML = window.generatedModuleHTML;
            }

            const pageCount = result.pageCount ?? (result.html.match(/data-page/g) || []).length;
            const charCount = result.characterCount ?? result.html.length;

            previewTextarea.value = generatedModuleHTML;
            previewSummary.textContent = `Approx. ${pageCount || '??'} pages • ${charCount.toLocaleString()} characters`;
            previewStats.innerHTML = `
                <p style="margin: 0 0 6px;"><strong>Module code:</strong> ${moduleCode}</p>
                <p style="margin: 0 0 6px;"><strong>Category:</strong> ${category || '—'}</p>
                <p style="margin: 0;"><strong>Generated with AI</strong> ✨</p>
            `;
            previewContainer.style.display = 'block';
            saveBtn.disabled = false;
            statusEl.textContent = '✅ Generated! Review and save when ready.';
            statusEl.style.color = '#10b981';
            clearTimeout(safetyTimeout);
            hideGenerationPipeline();
            generateBtn.disabled = false;
            generateBtn.textContent = '🔁 Regenerate Module';
            clearGenerationSession();
        } catch (innerError) {
            clearTimeout(safetyTimeout);
            throw innerError;
        }
    } catch (error) {
        console.error('[AI] Generation error:', error);
        handleGenerationError(error);
        generateBtn.disabled = false;
        generateBtn.textContent = '✨ Generate Module with AI';
        hideGenerationPipeline();
        clearGenerationSession();
    }
};

// ================================================================================
// SAVE GENERATED MODULE
// ================================================================================
window.saveGeneratedModule = async function() {
    const statusEl = document.getElementById('aiGenerationStatus');
    const saveBtn = document.getElementById('saveAiGeneratedModuleBtn');

    try {
        if (!window.generatedModuleHTML) { alert('Please generate a module with AI before saving.'); return; }

        const superSkillId = document.getElementById('newModuleSuperSkill')?.value || null;
        const subSkillId = document.getElementById('newModuleSubSkill')?.value || null;
        if (!superSkillId) { alert('❌ Super Skill is required before saving the module.'); return; }
        if (!subSkillId) { alert('❌ Sub-Skill is required before saving the module.'); return; }

        if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = 'Saving...'; }
        if (statusEl) { statusEl.textContent = '💾 Saving module...'; statusEl.style.color = '#7b3ff2'; }

        const loadingOverlay = document.getElementById('aiLoadingOverlay');
        if (loadingOverlay) loadingOverlay.style.display = 'flex';

        const title = document.getElementById('newModuleTitle').value.trim();
        const category = document.getElementById('newModuleCategory').value;
        const series = document.getElementById('newModuleSeries').value || null;
        const weekNumber = document.getElementById('newModuleOrder').value || null;
        const xpReward = document.getElementById('newModuleXPReward')?.value ? parseInt(document.getElementById('newModuleXPReward').value) : 100;
        const starsReward = document.getElementById('newModuleStarsReward')?.value ? parseInt(document.getElementById('newModuleStarsReward').value) : 10;
        const characterName = document.getElementById('newModuleCharacter')?.value || null;
        const ageRange = document.getElementById('ageRangeSelect').value || null;
        const cycleId = document.getElementById('newModuleCycle')?.value || null;
        const shortDescription = document.getElementById('newModuleShortDescription')?.value?.trim() || currentGenerationSpec?.metadata?.shortDescription || null;
        const description = document.getElementById('newModuleDescription')?.value?.trim() || currentGenerationSpec?.metadata?.description || null;
        const primaryTheoryId = document.getElementById('coreTheorySelect')?.value || null;
        const ndisDomainId = document.getElementById('ndisDomain')?.value || null;
        const dssSediId = document.getElementById('dssSedi')?.value || null;
        const neuroscienceConcept = document.getElementById('neuroscienceConcept')?.value || null;
        const brainTownMetaphor = document.getElementById('brainTownAnalogy')?.value?.trim() || null;
        const moduleSummary = currentGenerationSpec?.moduleSummary?.summary || window.currentGenerationSpec?.moduleSummary?.summary || null;

        const { data: newModule, error: insertError } = await supabase
            .from('modules')
            .insert({
                title, category, series, age_range: ageRange, short_description: shortDescription, description: description,
                html_content: window.generatedModuleHTML, is_active: true, super_skill_id: superSkillId, sub_skill_id: subSkillId,
                cycle_id: cycleId || null, week_number: weekNumber, xp_reward: xpReward, stars_reward: starsReward,
                character_name: characterName, primary_theory_id: primaryTheoryId, ndis_domain_id: ndisDomainId,
                dss_sedi_id: dssSediId, neuroscience_concept: neuroscienceConcept,
                brain_town_analogy: brainTownMetaphor, module_summary: moduleSummary
            })
            .select()
            .single();

        if (insertError) throw insertError;

        // Mark blueprint as generated
        const blueprintId = document.getElementById('addModuleForm')?.dataset?.blueprintId;
        if (blueprintId && newModule) {
            await supabase.from('modules_to_generate').update({ has_been_generated: true, generated_module_id: newModule.id }).eq('id', blueprintId);
        }

        // Add to all parents as inactive
        const { data: allParentsData } = await supabase.from('parent_profiles').select('id');
        if (allParentsData && allParentsData.length > 0 && newModule) {
            const parentModuleEntries = allParentsData.map(parent => ({ parent_id: parent.id, module_id: newModule.id, is_active: false }));
            await supabase.from('parent_modules').upsert(parentModuleEntries, { onConflict: 'parent_id,module_id' });
        }

        window.closeAddModuleModal();
        if (loadingOverlay) loadingOverlay.style.display = 'none';
        alert('✓ Module created successfully!');
        window.location.reload();
    } catch (error) {
        console.error('Error saving module:', error);
        alert('Failed to save module: ' + error.message);
        if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = 'Create Module'; }
        const loadingOverlay = document.getElementById('aiLoadingOverlay');
        if (loadingOverlay) loadingOverlay.style.display = 'none';
    }
};

// ================================================================================
// LEGACY MODULE UPLOAD
// ================================================================================
async function handleLegacyModuleUpload(event) {
    const file = event.target?.files?.[0];
    if (!file) return;
    const moduleCode = document.getElementById('newModuleCode').value?.trim();
    if (!moduleCode) { alert('Please open the Add Module form so we can assign a module code first.'); legacyFileInput.value = ''; return; }

    try {
        setMigrationStatus({ message: 'Processing legacy module…', type: 'info' });
        const originalHtml = await file.text();
        let migratedHtml = typeof convertModule === 'function' ? convertModule(originalHtml) : originalHtml;
        migratedHtml = fixEscapedBackticks(migratedHtml);
        migratedHtml = addHomeButtonToHeader(migratedHtml);
        if (moduleCode) {
            migratedHtml = migratedHtml.replace(/__MODULE_CODE__/g, moduleCode).replace(/__WORKBOOK_ID__/g, moduleCode);
        }
        window.generatedModuleHTML = migratedHtml;
        generatedModuleHTML = window.generatedModuleHTML;
        window.currentGenerationSpec = null;
        currentGenerationSpec = null;
        const resultPanel = document.getElementById('aiGeneratedResult');
        const saveBtnEl = document.getElementById('saveAiGeneratedModuleBtn');
        if (resultPanel) resultPanel.style.display = 'block';
        if (saveBtnEl) saveBtnEl.disabled = false;
        setMigrationStatus({ message: 'Migration complete. Click "Create Module" to save it to Supabase.', type: 'success' });
    } catch (error) {
        console.error('[Admin] Migration error:', error);
        setMigrationStatus({ message: error.message || 'Migration failed', type: 'error' });
    } finally {
        legacyFileInput.value = '';
    }
}

function setMigrationStatus({ message, type = 'info' }) {
    if (!migrationStatusEl) return;
    migrationStatusEl.textContent = message;
    migrationStatusEl.dataset.status = type;
    migrationStatusEl.style.display = 'block';
}

// ================================================================================
// UTILITY — module code, backtick fix, home button
// ================================================================================
function generateNextModuleCode() {
    const moduleCodes = allModules.map(m => m.code).filter(code => code && code.startsWith('MODULE')).map(code => parseInt(code.replace('MODULE', ''))).filter(num => !isNaN(num));
    if (moduleCodes.length === 0) return 'MODULE1';
    return `MODULE${Math.max(...moduleCodes) + 1}`;
}

function fixEscapedBackticks(htmlContent) {
    const fixedContent = htmlContent.replace(/\\\`([^`]*?)\\\$\{([^}]+?)\}\\\`/g, '`$1\${$2}`');
    if (fixedContent !== htmlContent) console.log('[Admin] Fixed escaped backticks in HTML content');
    return fixedContent;
}

function addHomeButtonToHeader(htmlContent) {
    if (htmlContent.includes('goHome()') || htmlContent.includes('🏠 Home')) return htmlContent;
    const printButtonPattern = /(onclick="prepareForPrint\(\)"[^>]*>🖨️ Print<\/button>)/;
    if (printButtonPattern.test(htmlContent)) {
        let updatedContent = htmlContent.replace(printButtonPattern,
            '$1\n                \n                <button onclick="goHome()" class="text-white px-4 py-2 rounded-xl font-bold hover:shadow-lg transition-all font-title" style="background-color: #5e2a84;">🏠 Home</button>'
        );
        if (!updatedContent.includes('function goHome()')) {
            const goHomeFunction = '\n        function goHome() {\n            const urlParams = new URLSearchParams(window.location.search);\n            const childId = urlParams.get(\'childId\');\n            if (childId) { window.location.href = \'/dashboard.html\'; } else { window.history.back(); }\n        }\n';
            updatedContent = updatedContent.replace(/<\/script>/, goHomeFunction + '    <' + '/script>');
        }
        return updatedContent;
    }
    return htmlContent;
}

// ================================================================================
// SUPER SKILL CHANGE HANDLERS (for Add Module & Edit Module forms)
// ================================================================================
window.onSuperSkillChange = async function() {
    const superSkillSelect = document.getElementById('newModuleSuperSkill');
    const characterInput = document.getElementById('newModuleCharacter');
    const subSkillSelect = document.getElementById('newModuleSubSkill');
    const cycleSelect = document.getElementById('newModuleCycle');

    const selectedOption = superSkillSelect.options[superSkillSelect.selectedIndex];
    const superSkillId = superSkillSelect.value;

    if (selectedOption && selectedOption.dataset.characterName) {
        characterInput.value = selectedOption.dataset.characterName;
    } else {
        characterInput.value = '';
    }

    const selectedSkill = superSkillsData.find(s => s.id === superSkillId);
    if (selectedSkill) {
        document.getElementById('newModuleCategory').value = selectedSkill.slug;
        document.getElementById('newModuleSeries').value = selectedSkill.character_name || '';
    }

    // Load sub-skills dynamically from database
    subSkillSelect.innerHTML = '<option value="">Loading sub-skills...</option>';
    try {
        const { data, error } = await supabase
            .from('sub_skills')
            .select('id, name')
            .eq('super_skill_id', superSkillId)
            .eq('is_active', true)
            .order('name');
        
        if (error) throw error;
        
        subSkillSelect.innerHTML = '<option value="">Select sub-skill...</option>';
        (data || []).forEach(subSkill => {
            const option = document.createElement('option');
            option.value = subSkill.id;
            option.textContent = subSkill.name;
            subSkillSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading sub-skills:', error);
        subSkillSelect.innerHTML = '<option value="">Error loading sub-skills</option>';
    }

    cycleSelect.innerHTML = '<option value="">Select cycle...</option>';
    cyclesData.filter(c => c.super_skill_id === superSkillId).forEach(cycle => {
        const option = document.createElement('option');
        option.value = cycle.id;
        option.textContent = `Cycle ${cycle.cycle_number}: ${cycle.name}`;
        cycleSelect.appendChild(option);
    });

    if (typeof applyTheoryConnectionAutofill === 'function') applyTheoryConnectionAutofill();
};

window.onEditSuperSkillChange = async function() {
    const superSkillSelect = document.getElementById('editSuperSkill');
    const characterInput = document.getElementById('editCharacter');
    const subSkillSelect = document.getElementById('editSubSkill');
    const cycleSelect = document.getElementById('editCycle');
    if (!superSkillSelect || !subSkillSelect || !cycleSelect) return;

    const selectedOption = superSkillSelect.options[superSkillSelect.selectedIndex];
    const superSkillId = superSkillSelect.value;
    if (characterInput) characterInput.value = selectedOption?.dataset?.characterName || '';

    // Load sub-skills dynamically from database
    subSkillSelect.innerHTML = '<option value="">Loading sub-skills...</option>';
    try {
        const { data, error } = await supabase
            .from('sub_skills')
            .select('id, name')
            .eq('super_skill_id', superSkillId)
            .eq('is_active', true)
            .order('name');
        
        if (error) throw error;
        
        subSkillSelect.innerHTML = '<option value="">Select sub-skill...</option>';
        (data || []).forEach(subSkill => {
            const option = document.createElement('option');
            option.value = subSkill.id;
            option.textContent = subSkill.name;
            subSkillSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading sub-skills:', error);
        subSkillSelect.innerHTML = '<option value="">Error loading sub-skills</option>';
    }

    cycleSelect.innerHTML = '<option value="">Select cycle...</option>';
    cyclesData.filter(c => c.super_skill_id === superSkillId).forEach(cycle => {
        const option = document.createElement('option');
        option.value = cycle.id;
        option.textContent = `Cycle ${cycle.cycle_number}: ${cycle.name}`;
        cycleSelect.appendChild(option);
    });
};

// ================================================================================
// ENHANCED ADD MODULE MODAL
// ================================================================================
window.enhancedModuleModal = {
    secondaryTheoryIds: [],
    diagnosisPathways: [],
    ndisDomains: [],
    sediCategories: [],
    selectedNdisDomainIds: [],
    selectedSediCategoryIds: []
};

const originalOpenAddModuleModal = window.openAddModuleModal;
window.openAddModuleModal = async function() {
    if (typeof originalOpenAddModuleModal === 'function') {
        originalOpenAddModuleModal();
    } else {
        document.getElementById('addModuleModal').classList.add('active');
    }
    await loadEnhancedModalData();
    setTimeout(() => {
        injectEnhancedFields();
        if (typeof updateDecisionLogic === 'function') updateDecisionLogic();
    }, 100);
};

async function loadEnhancedModalData() {
    try {
        const { data: ndis } = await supabase.from('ndis_domains').select('id, domain_name').eq('is_active', true).order('sort_order');
        window.enhancedModuleModal.ndisDomains = ndis || [];
        const { data: sedi } = await supabase.from('dss_sedi_categories').select('id, sedi_code, sedi_name').eq('is_active', true).order('sort_order');
        window.enhancedModuleModal.sediCategories = sedi || [];
    } catch (error) {
        console.error('Error loading enhanced data:', error);
    }
}

function injectEnhancedFields() {
    const brainTownField = document.getElementById('brainTownAnalogy');
    if (!brainTownField || document.getElementById('secondaryTheoriesSection')) return;
    const formGroup = brainTownField.closest('.gm-step-group') || brainTownField.closest('.form-group');
    if (!formGroup) return;

    const dxContainer = document.getElementById('gmDxCheckboxes');

    const enhancedHTML = `
        <div class="gm-step-group" id="secondaryTheoriesSection" style="margin-top: 12px;">
            <div class="gm-step-label">Step 11 — Secondary Theories (Max 3)</div>
            <div style="position: relative; margin-bottom: 6px;">
                <span style="position:absolute;left:9px;top:50%;transform:translateY(-50%);font-size:12px;color:#A0AEC0;pointer-events:none;">🔍</span>
                <input type="text" id="secondaryTheorySearch" placeholder="Search theories..." style="width:100%;padding:7px 10px 7px 28px;border:1.5px solid #E2E8F0;border-radius:6px;font-size:11px;font-family:inherit;background:#fff;color:#1B3A5C;" oninput="filterSecondaryTheories(this.value)">
            </div>
            <div id="secondaryTheoriesContainer" style="display: flex; flex-wrap: wrap; gap: 4px; padding: 8px; background: white; border: 1px solid #E2E8F0; border-radius: 8px; min-height: 40px; max-height: 120px; overflow-y: auto;"></div>
            <p style="font-size: 10px; color: #718096; margin-top: 3px;">Selected: <span id="secondaryTheoryCount">0</span>/3</p>
        </div>
        <div class="gm-step-group" style="margin-top: 8px;">
            <div class="gm-step-label">Neuroscience Concept</div>
            <select id="neuroscienceConcept" class="gm-select form-select" onchange="updateDecisionLogic()">
                <option value="">Optional</option>
                <option value="Neuroplasticity">Neuroplasticity</option>
                <option value="Prefrontal Cortex">Prefrontal Cortex</option>
                <option value="Dopamine">Dopamine</option>
                <option value="Amygdala">Amygdala</option>
                <option value="Interoception">Interoception</option>
            </select>
        </div>
        <div class="gm-step-group" id="ndisDomainsSection" style="margin-top: 8px;">
            <div class="gm-step-label">NDIS Domains (Multiple)</div>
            <div id="ndisDomainsContainer" style="display: flex; flex-wrap: wrap; gap: 4px; padding: 8px; background: white; border: 1px solid #E2E8F0; border-radius: 8px; min-height: 40px; max-height: 100px; overflow-y: auto;"></div>
            <p style="font-size: 10px; color: #718096; margin-top: 3px;">Selected: <span id="ndisDomainsCount">0</span></p>
        </div>
        <div class="gm-step-group" id="sediCategoriesSection" style="margin-top: 8px;">
            <div class="gm-step-label">DSS SEDI Categories (Multiple)</div>
            <div id="sediCategoriesContainer" style="display: flex; flex-wrap: wrap; gap: 4px; padding: 8px; background: white; border: 1px solid #E2E8F0; border-radius: 8px; min-height: 40px; max-height: 100px; overflow-y: auto;"></div>
            <p style="font-size: 10px; color: #718096; margin-top: 3px;">Selected: <span id="sediCategoriesCount">0</span></p>
        </div>
    `;

    if (dxContainer && !dxContainer.querySelector('.diagnosis-checkbox')) {
        dxContainer.innerHTML = `
            <div class="gm-dx-grid" style="margin-bottom: 4px;">
                <label class="diagnosis-toggle" style="display:inline-flex;align-items:center;gap:4px;padding:3px 9px;background:#fff;border:1.5px solid #E2E8F0;border-radius:14px;cursor:pointer;font-size:10px;font-weight:600;color:#4A5568;"><input type="checkbox" value="fasd" class="diagnosis-checkbox" style="width:12px;height:12px;margin:0;">FASD</label>
                <label class="diagnosis-toggle" style="display:inline-flex;align-items:center;gap:4px;padding:3px 9px;background:#fff;border:1.5px solid #E2E8F0;border-radius:14px;cursor:pointer;font-size:10px;font-weight:600;color:#4A5568;"><input type="checkbox" value="adhd" class="diagnosis-checkbox" style="width:12px;height:12px;margin:0;">ADHD</label>
                <label class="diagnosis-toggle" style="display:inline-flex;align-items:center;gap:4px;padding:3px 9px;background:#fff;border:1.5px solid #E2E8F0;border-radius:14px;cursor:pointer;font-size:10px;font-weight:600;color:#4A5568;"><input type="checkbox" value="asd" class="diagnosis-checkbox" style="width:12px;height:12px;margin:0;">ASD</label>
                <label class="diagnosis-toggle" style="display:inline-flex;align-items:center;gap:4px;padding:3px 9px;background:#fff;border:1.5px solid #E2E8F0;border-radius:14px;cursor:pointer;font-size:10px;font-weight:600;color:#4A5568;"><input type="checkbox" value="pda" class="diagnosis-checkbox" style="width:12px;height:12px;margin:0;">PDA</label>
                <label class="diagnosis-toggle" style="display:inline-flex;align-items:center;gap:4px;padding:3px 9px;background:#fff;border:1.5px solid #E2E8F0;border-radius:14px;cursor:pointer;font-size:10px;font-weight:600;color:#4A5568;"><input type="checkbox" value="trauma" class="diagnosis-checkbox" style="width:12px;height:12px;margin:0;">Trauma</label>
            </div>
            <div id="fasdStrategiesContainer" style="display: none; margin-top: 6px; padding: 8px; background: #f0fdf4; border-left: 3px solid #10b981; border-radius: 6px;">
                <label style="display: block; font-size: 10px; font-weight: 600; margin-bottom: 4px;">FASD Strategies</label>
                <textarea id="fasdStrategies" rows="2" class="gm-textarea form-textarea" placeholder="Concrete visual supports, one-step instructions..." style="font-size:11px;"></textarea>
            </div>
        `;
    }

    formGroup.insertAdjacentHTML('afterend', enhancedHTML);
    populateSecondaryTheories();
    populateNdisAndSedi();
    attachEnhancedListeners();

    if (!window.filterSecondaryTheories) {
        window.filterSecondaryTheories = function(query) {
            const chips = document.querySelectorAll('.secondary-theory-chip');
            const q = (query || '').toLowerCase().trim();
            chips.forEach(chip => {
                chip.style.display = (!q || chip.textContent.toLowerCase().includes(q)) ? '' : 'none';
            });
        };
    }
}

function populateSecondaryTheories() {
    const container = document.getElementById('secondaryTheoriesContainer');
    const primarySelect = document.getElementById('coreTheorySelect');
    if (!container || !primarySelect) return;
    const theories = Array.from(primarySelect.options).filter(opt => opt.value).map(opt => ({ id: opt.value, name: opt.textContent }));
    container.innerHTML = theories.map(t => `<div class="secondary-theory-chip" data-theory-id="${t.id}" style="padding: 4px 10px; background: #f3f4f6; color: #374151; border-radius: 14px; font-size: 10px; font-weight: 600; cursor: pointer; user-select: none; transition: all 0.12s; border: 1.5px solid transparent;">${t.name}</div>`).join('');
}

function populateNdisAndSedi() {
    const ndisContainer = document.getElementById('ndisDomainsContainer');
    if (ndisContainer) {
        ndisContainer.innerHTML = window.enhancedModuleModal.ndisDomains.map(nd =>
            `<div class="ndis-domain-chip" data-ndis-id="${nd.id}" style="padding: 4px 10px; background: #f3f4f6; color: #374151; border-radius: 14px; font-size: 10px; font-weight: 600; cursor: pointer; user-select: none; transition: all 0.12s; border: 1.5px solid transparent;">${nd.domain_name}</div>`
        ).join('');
    }
    const sediContainer = document.getElementById('sediCategoriesContainer');
    if (sediContainer) {
        sediContainer.innerHTML = window.enhancedModuleModal.sediCategories.map(sc =>
            `<div class="sedi-category-chip" data-sedi-id="${sc.id}" style="padding: 4px 10px; background: #f3f4f6; color: #374151; border-radius: 14px; font-size: 10px; font-weight: 600; cursor: pointer; user-select: none; transition: all 0.12s; border: 1.5px solid transparent;">${sc.sedi_code}: ${sc.sedi_name}</div>`
        ).join('');
    }
}

function attachEnhancedListeners() {
    document.querySelectorAll('.secondary-theory-chip').forEach(chip => {
        chip.addEventListener('click', function() {
            const theoryId = this.getAttribute('data-theory-id');
            const primaryId = document.getElementById('coreTheorySelect').value;
            if (theoryId === primaryId) { alert('Already selected as primary'); return; }
            const index = window.enhancedModuleModal.secondaryTheoryIds.indexOf(theoryId);
            if (index > -1) {
                window.enhancedModuleModal.secondaryTheoryIds.splice(index, 1);
                this.style.background = '#f3f4f6'; this.style.color = '#374151'; this.style.borderColor = 'transparent';
            } else {
                if (window.enhancedModuleModal.secondaryTheoryIds.length >= 3) { alert('Max 3'); return; }
                window.enhancedModuleModal.secondaryTheoryIds.push(theoryId);
                this.style.background = '#2A8F8F'; this.style.color = 'white'; this.style.borderColor = '#2A8F8F';
            }
            document.getElementById('secondaryTheoryCount').textContent = window.enhancedModuleModal.secondaryTheoryIds.length;
        });
    });

    document.querySelectorAll('.diagnosis-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            const dx = this.value;
            const toggle = this.closest('.diagnosis-toggle');
            if (this.checked) {
                window.enhancedModuleModal.diagnosisPathways.push(dx);
                toggle.style.borderColor = '#D4725C'; toggle.style.background = '#FFF5F5'; toggle.style.color = '#D4725C';
                if (dx === 'fasd') document.getElementById('fasdStrategiesContainer').style.display = 'block';
            } else {
                const idx = window.enhancedModuleModal.diagnosisPathways.indexOf(dx);
                if (idx > -1) window.enhancedModuleModal.diagnosisPathways.splice(idx, 1);
                toggle.style.borderColor = '#E2E8F0'; toggle.style.background = '#fff'; toggle.style.color = '#4A5568';
                if (dx === 'fasd') document.getElementById('fasdStrategiesContainer').style.display = 'none';
            }
            if (typeof updateDecisionLogic === 'function') setTimeout(updateDecisionLogic, 50);
        });
    });

    document.querySelectorAll('.ndis-domain-chip').forEach(chip => {
        chip.addEventListener('click', function() {
            const ndisId = this.getAttribute('data-ndis-id');
            const index = window.enhancedModuleModal.selectedNdisDomainIds.indexOf(ndisId);
            if (index > -1) {
                window.enhancedModuleModal.selectedNdisDomainIds.splice(index, 1);
                this.style.background = '#f3f4f6'; this.style.color = '#374151'; this.style.borderColor = 'transparent';
            } else {
                window.enhancedModuleModal.selectedNdisDomainIds.push(ndisId);
                this.style.background = '#2A8F8F'; this.style.color = 'white'; this.style.borderColor = '#2A8F8F';
            }
            document.getElementById('ndisDomainsCount').textContent = window.enhancedModuleModal.selectedNdisDomainIds.length;
        });
    });

    document.querySelectorAll('.sedi-category-chip').forEach(chip => {
        chip.addEventListener('click', function() {
            const sediId = this.getAttribute('data-sedi-id');
            const index = window.enhancedModuleModal.selectedSediCategoryIds.indexOf(sediId);
            if (index > -1) {
                window.enhancedModuleModal.selectedSediCategoryIds.splice(index, 1);
                this.style.background = '#f3f4f6'; this.style.color = '#374151'; this.style.borderColor = 'transparent';
            } else {
                window.enhancedModuleModal.selectedSediCategoryIds.push(sediId);
                this.style.background = '#2A8F8F'; this.style.color = 'white'; this.style.borderColor = '#2A8F8F';
            }
            document.getElementById('sediCategoriesCount').textContent = window.enhancedModuleModal.selectedSediCategoryIds.length;
        });
    });
}

window.loadSubSkillsForSuperSkill = async function(superSkillId) {
    const subSkillSelect = document.getElementById('newModuleSubSkill');
    if (!subSkillSelect) return;
    try {
        const { data, error } = await supabase.from('sub_skills').select('id, name, slug').eq('super_skill_id', superSkillId).eq('is_active', true).order('sort_order');
        if (error) throw error;
        subSkillSelect.innerHTML = '<option value="">Select sub-skill...</option>' + (data || []).map(ss => `<option value="${ss.id}">${ss.name}</option>`).join('');
    } catch (error) {
        console.error('Error loading sub-skills:', error);
    }
};

const originalSaveNewModule = window.saveNewModule;
window.saveNewModule = async function(event) {
    if (event) event.preventDefault();
    window.__enhancedModuleData = {
        secondary_theory_ids: window.enhancedModuleModal.secondaryTheoryIds,
        neuroscience_concept: document.getElementById('neuroscienceConcept')?.value || null,
        diagnosis_pathways: window.enhancedModuleModal.diagnosisPathways,
        fasd_strategies: document.getElementById('fasdStrategies')?.value || null,
        ndis_domain_ids: window.enhancedModuleModal.selectedNdisDomainIds,
        dss_sedi_ids: window.enhancedModuleModal.selectedSediCategoryIds
    };
    if (typeof originalSaveNewModule === 'function') return originalSaveNewModule(event);
};