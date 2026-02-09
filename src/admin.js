import { supabase } from './supabaseClient.js';
import { getSettings, updateSettings } from './database.js';


// -----------------------------------------------------------------------------
// Runtime config helpers (admin.js is loaded directly in the browser).
// If you are NOT bundling with Vite, import.meta.env is undefined.
// These helpers try a few common locations.
// -----------------------------------------------------------------------------
function getSupabaseUrl() {
  return (window.SUPABASE_URL || window.__SUPABASE_URL__ || window.ENV?.SUPABASE_URL || supabase?.supabaseUrl || '');
}
function getSupabaseAnonKey() {
  return (window.SUPABASE_ANON_KEY || window.__SUPABASE_ANON_KEY__ || window.ENV?.SUPABASE_ANON_KEY || supabase?.supabaseKey || '');
}
function requireSupabaseEnv() {
  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();
  if (!url || !key) {
    console.error('[Admin] Missing Supabase URL / anon key for fetch calls. ' +
      'Set window.SUPABASE_URL and window.SUPABASE_ANON_KEY (or window.ENV.*).');
  }
  return { url, key };
}

// Make supabase available globally for module-content-creator.js
window.supabase = supabase;

let allChildren = [];
let allParents = [];
let allModules = [];
let selectedChild = null;
let selectedParent = null;
let currentFilter = 'all';
let currentModuleAssignments = {};
let selectedModules = new Set();
let customisationSelectedModules = new Set();
let isBulkDeletingModules = false;
let selectedModule = null;
let categoryColors = {};
let rewards = [];
let ageRanges = [];
let coreTheories = [];
let theoriesData = [];
let selectedTheoryId = null;

// Theories tab - new variables for age ranges, super skills, sub-skills forms
let ageRangesTheoriesData = [];
let selectedAgeRangeId = null;
let superSkillsTheoriesData = [];
let selectedSuperSkillTheoriesId = null;
let subSkillsTheoriesData = [];
let selectedSubSkillTheoriesId = null;

// Delegate checkbox changes so we don't add hundreds of listeners on every re-render
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



        function getModuleKey(moduleId) {
            if (moduleId === undefined || moduleId === null) {
                return '';
            }
            return String(moduleId);
        }
          // These functions are defined early (before module script) to ensure they're available
        // for inline onclick handlers in the HTML
        window.generalCategories = window.generalCategories || [];
        window.showPreviewModal = function() {
            if (!window.generatedModuleHTML) {
                alert('Please generate a module first');
                return;
            }
            
            const modal = document.getElementById('previewModal');
            const iframe = document.getElementById('modulePreviewFrame');
            
            // Process the HTML to replace ES6 imports with regular script tags for iframe preview
            let previewContent = window.generatedModuleHTML;
            
            // Replace the ES6 import statement with a comment (module-header.js will be loaded via script tag)
            previewContent = previewContent.replace(
                /import\s*\{\s*initModuleHeader\s*\}\s*from\s*['"]\.\/modules\/shared\/module-header\.js['"];?\s*/g,
                '// Module header loaded via regular script for preview\n    '
            );
            
            // Ensure module-header.js is loaded as a regular script before closing head
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
        }

        window.closePreviewModal = function() {
            const modal = document.getElementById('previewModal');
            modal.classList.remove('active');
        }

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
        }

        function formatCategoryLabel(name) {
            if (!name) return '';
            return name.charAt(0).toUpperCase() + name.slice(1);
        }

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
                option.textContent = formatCategoryLabel(category);
                categorySelect.appendChild(option);
            });

            if (currentValue && categories.includes(currentValue)) {
                categorySelect.value = currentValue;
            }
        }

        window.checkModuleQuality = function(iframe) {
            const icon = document.getElementById('jsCheckIcon');
            const text = document.getElementById('jsCheckText');
            const indicator = document.getElementById('jsCheckIndicator');
            
            if (icon) icon.textContent = '⏳';
            if (text) text.textContent = 'Checking...';
            if (indicator) indicator.classList.remove('pass', 'warning', 'fail');
            
            try {
                const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                // Check for actual page elements (data-page attribute) instead of window.pages
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
        }

        // Pathway management functions
        // Declare generalCategories in global scope so it's accessible everywhere
        window.generalCategories = [];
        
        window.openQuickAddCategoryModal = function() {
            const modal = document.getElementById('quickAddCategoryModal');
            const nameInput = document.getElementById('quickCategoryName');
            const colorPicker = document.getElementById('quickCategoryColor');
            const colorHex = document.getElementById('quickCategoryColorHex');
            
            if (!modal) return;
            
            modal.style.display = 'flex';
            if (nameInput) {
                nameInput.value = '';
                nameInput.focus();
            }
            if (colorPicker) colorPicker.value = '#4c6c96';
            if (colorHex) colorHex.value = '#4c6c96';
        }

        window.closeQuickAddCategoryModal = function() {
            const modal = document.getElementById('quickAddCategoryModal');
            if (modal) {
                modal.style.display = 'none';
            }
        }

        function syncQuickCategoryColorInputs(source) {
            const colorPicker = document.getElementById('quickCategoryColor');
            const colorHex = document.getElementById('quickCategoryColorHex');
            if (!colorPicker || !colorHex) return;

            if (source === 'picker') {
                colorHex.value = colorPicker.value;
            } else {
                const hexValue = colorHex.value?.trim();
                if (hexValue) {
                    colorPicker.value = hexValue;
                }
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
            if (!displayName) {
                alert('Please enter a category name');
                return;
            }

            const categoryValue = displayName.toLowerCase();
            if (generalCategories.some(category => category.name === categoryValue)) {
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
                if (newModuleCategory) {
                    newModuleCategory.value = categoryValue;
                }
            }, 100);

            window.closeQuickAddCategoryModal();
        }

        window.openQuickAddPathwayModal = async function() {
            const modal = document.getElementById('quickAddPathwayModal');
            const input = document.getElementById('quickPathwayName');
            const categorySelect = document.getElementById('quickPathwayCategory');
            
            // Ensure categories are loaded before opening modal
            if (!window.generalCategories || !Array.isArray(window.generalCategories) || window.generalCategories.length === 0) {
                await loadGeneralSettings();
            }
            
            // Populate category dropdown
            loadCategoriesIntoPathwayDropdowns();
            
            if (modal) {
                modal.style.display = 'flex';
                if (input) {
                    input.value = '';
                    input.focus();
                }
                if (categorySelect) {
                    categorySelect.value = '';
                }
            }
        }

        function loadCategoriesIntoPathwayDropdowns() {
            // Ensure generalCategories is defined
            if (!window.generalCategories || !Array.isArray(window.generalCategories)) {
                console.warn('generalCategories not loaded yet');
                return;
            }

            // Load categories into quick-add pathway dropdown
            const quickPathwayCategory = document.getElementById('quickPathwayCategory');
            if (quickPathwayCategory) {
                const currentValue = quickPathwayCategory.value;
                quickPathwayCategory.innerHTML = '<option value="">Select category...</option>';
                window.generalCategories.forEach(category => {
                    const option = document.createElement('option');
                    option.value = category.name;
                    option.textContent = category.name;
                    if (category.name === currentValue) option.selected = true;
                    quickPathwayCategory.appendChild(option);
                });
            }

            // Load categories into general settings pathway dropdown
            const newPathwayCategory = document.getElementById('newPathwayCategory');
            if (newPathwayCategory) {
                const currentValue = newPathwayCategory.value;
                newPathwayCategory.innerHTML = '<option value="">Select category...</option>';
                window.generalCategories.forEach(category => {
                    const option = document.createElement('option');
                    option.value = category.name;
                    option.textContent = category.name;
                    if (category.name === currentValue) option.selected = true;
                    newPathwayCategory.appendChild(option);
                });
            }
        }

        window.closeQuickAddPathwayModal = function() {
            const modal = document.getElementById('quickAddPathwayModal');
            if (modal) {
                modal.style.display = 'none';
            }
        }

        window.saveQuickPathway = function(event) {
            event.preventDefault();
            const pathwayName = document.getElementById('quickPathwayName').value.trim();
            const pathwayCategory = document.getElementById('quickPathwayCategory').value;
            
            if (!pathwayName) {
                alert('Please enter a pathway name');
                return;
            }

            if (!pathwayCategory) {
                alert('Please select a category');
                return;
            }

            // Add pathway to the system (this will be handled by the main admin script)
            if (window.addGeneralPathway) {
                // Set the pathway name and category in the general settings inputs and trigger add
                const generalNameInput = document.getElementById('newPathwayName');
                const generalCategoryInput = document.getElementById('newPathwayCategory');
                if (generalNameInput && generalCategoryInput) {
                    generalNameInput.value = pathwayName;
                    generalCategoryInput.value = pathwayCategory;
                    window.addGeneralPathway();
                }
            }

            // Refresh pathway dropdowns
            if (window.loadPathwaysIntoDropdowns) {
                window.loadPathwaysIntoDropdowns();
            }

            // Select the newly added pathway in the add module form
            setTimeout(() => {
                const newModulePathway = document.getElementById('newModulePathway');
                if (newModulePathway) {
                    for (let option of newModulePathway.options) {
                        if (option.text === pathwayName) {
                            option.selected = true;
                            break;
                        }
                    }
                }
            }, 100);

            // Close the modal
            window.closeQuickAddPathwayModal();
        }

        window.openQuickAddEmotionModal = function() {
            const modal = document.getElementById('quickAddEmotionModal');
            const input = document.getElementById('quickEmotionName');
            if (modal) {
                modal.style.display = 'flex';
                if (input) {
                    input.value = '';
                    input.focus();
                }
            }
        }

        window.closeQuickAddEmotionModal = function() {
            const modal = document.getElementById('quickAddEmotionModal');
            if (modal) {
                modal.style.display = 'none';
            }
        }

        window.openQuickAddSkillModal = function() {
            const modal = document.getElementById('quickAddSkillModal');
            const input = document.getElementById('quickSkillName');
            if (modal) {
                modal.style.display = 'flex';
                if (input) {
                    input.value = '';
                    input.focus();
                }
            }
        }

        window.closeQuickAddSkillModal = function() {
            const modal = document.getElementById('quickAddSkillModal');
            if (modal) {
                modal.style.display = 'none';
            }
        }

        window.saveQuickEmotion = async function(event) {
            event.preventDefault();
            const emotionName = document.getElementById('quickEmotionName').value.trim();

            if (!emotionName) {
                alert('Please enter an emotion');
                return;
            }

            const generalInput = document.getElementById('newEmotionName');
            if (generalInput) {
                generalInput.value = emotionName;
            }

            if (window.addGeneralEmotion) {
                await window.addGeneralEmotion();
            }

            addOptionToMultiSelect('newModuleEmotions', emotionName, true);

            window.closeQuickAddEmotionModal();
        }

        window.saveQuickSkill = async function(event) {
            event.preventDefault();
            const skillName = document.getElementById('quickSkillName').value.trim();

            if (!skillName) {
                alert('Please enter a skill');
                return;
            }

            const generalInput = document.getElementById('newSkillName');
            if (generalInput) {
                generalInput.value = skillName;
            }

            if (window.addGeneralSkill) {
                await window.addGeneralSkill();
            }

            addOptionToMultiSelect('newModuleSkills', skillName, true);

            window.closeQuickAddSkillModal();
        }

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
                if (shouldSelect) {
                    option.selected = true;
                }
            } else if (shouldSelect) {
                const match = Array.from(select.options).find(opt => opt.value.toLowerCase() === normalized.toLowerCase());
                if (match) {
                    match.selected = true;
                }
            }
        }// ================================================================================

// ================================================================================
// LOAD AGE RANGES
// ================================================================================
async function loadAgeRanges() {
    const select = document.getElementById('ageRangeSelect');
    const editSelect = document.getElementById('editAgeRange');
    if (!select && !editSelect) {
        console.warn('[Psychology] Age range select not found');
        return;
    }
    
    try {
        console.log('[Psychology] Loading age ranges...');
        
        // First, let's test direct database access to see what's available
        console.log('[Psychology] Testing direct database access...');
        try {
            const { data: testData, error: testError } = await supabase
                .from('age_ranges')
                .select('*')
                .limit(1);
            
            console.log('[Psychology] Direct DB test result:', { testData, testError });
            
            if (testError) {
                console.error('[Psychology] Direct DB access failed:', testError);
                // Try to list available tables
                const { data: tables } = await supabase.rpc('get_table_names') || {};
                console.log('[Psychology] Available tables:', tables);
            }
        } catch (dbTestError) {
            console.error('[Psychology] Database test failed:', dbTestError);
        }
        
        const { data: ageRangesData, error: ageRangesError } = await supabase
            .from('age_ranges')
            .select('id, age_range, display_name')
            .eq('is_active', true)
            .order('age_range', { ascending: true });
        
        if (ageRangesError) {
            console.error('[Psychology] Direct age ranges query failed:', ageRangesError);
            throw new Error(`Database query failed: ${ageRangesError.message}`);
        }
        
        const data = { ageRanges: ageRangesData || [] };
        console.log('[Psychology] Age ranges loaded directly:', data);
        
        if (data.ageRanges && data.ageRanges.length > 0) {
            ageRanges = data.ageRanges;
            const selects = [select, editSelect].filter(Boolean);
            selects.forEach(targetSelect => {
                targetSelect.innerHTML = '<option value="">Select age range...</option>';
                ageRanges.forEach(range => {
                    const option = document.createElement('option');
                    option.value = range.id; // Keep UUID as value
                    option.textContent = range.age_range; // Display age_range
                    option.dataset.ageRange = range.age_range;
                    targetSelect.appendChild(option);
                });
            });
            
            console.log(`[Psychology] Loaded ${ageRanges.length} age ranges`);
            renderAllModulesList();
        } else {
            console.warn('[Psychology] No age ranges returned');
            if (select) select.innerHTML = '<option value="">No age ranges found</option>';
            if (editSelect) editSelect.innerHTML = '<option value="">No age ranges found</option>';
        }
    } catch (error) {
        console.error('[Psychology] Failed to load age ranges:', error);
        if (select) select.innerHTML = '<option value="">Error loading age ranges</option>';
        if (editSelect) editSelect.innerHTML = '<option value="">Error loading age ranges</option>';
    }
}

function getAgeRangeLabel(ageRangeValue) {
    if (!ageRangeValue) return '';
    const match = ageRanges.find(range =>
        range.id === ageRangeValue ||
        range.age_range === ageRangeValue ||
        range.display_name === ageRangeValue
    );
    return match ? (match.age_range || match.display_name) : ageRangeValue;
}


// ================================================================================
// LOAD CORE THEORIES
// ================================================================================
async function loadCoreTheories() {
    const select = document.getElementById('coreTheorySelect');
    const editSelect = document.getElementById('editCoreTheorySelect');
    if (!select && !editSelect) {
        console.warn('[Psychology] Core theory select not found');
        return;
    }
    
    try {
        console.log('[Psychology] Loading core theories...');
        
        const response = await fetch(
            `${requireSupabaseEnv().url}/functions/v1/generate-module/core-theories`,
            {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${requireSupabaseEnv().key}`,
                    'apikey': requireSupabaseEnv().key
                }
            }
        );
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        console.log('[Psychology] Core theories response:', data);
        
        if (data.coreTheories && data.coreTheories.length > 0) {
            coreTheories = data.coreTheories;
            const selects = [select, editSelect].filter(Boolean);
            selects.forEach(targetSelect => {
                targetSelect.innerHTML = '<option value="">Select psychological theory...</option>';

                // Group by category
                const grouped = {};
                coreTheories.forEach(theory => {
                    const cat = theory.category || 'Other';
                    if (!grouped[cat]) grouped[cat] = [];
                    grouped[cat].push(theory);
                });

                // Add optgroups and options
                Object.keys(grouped).sort().forEach(category => {
                    const optgroup = document.createElement('optgroup');
                    optgroup.label = category;

                    grouped[category].forEach(theory => {
                        const option = document.createElement('option');
                        option.value = theory.id;
                        option.textContent = theory.theory_name;
                        option.dataset.description = theory.description || '';
                        optgroup.appendChild(option);
                    });

                    targetSelect.appendChild(optgroup);
                });
            });

            console.log(`[Psychology] Loaded ${coreTheories.length} core theories`);
        } else {
            console.warn('[Psychology] No core theories returned');
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
// HANDLE THEORY SELECTION - SHOW PREVIEW
// ================================================================================
function updateTheoryPreview({ selectId, previewId, nameId, descriptionId }) {
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

// ================================================================================
// INITIALIZE PSYCHOLOGY DROPDOWNS
// ================================================================================
// Call this function when the page loads and when the modal opens
function initPsychologyDropdowns() {
    console.log('[Psychology] Initializing dropdowns...');
    loadAgeRanges();
    loadCoreTheories();
    
    // Add change listener for theory preview
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

// ================================================================================
// UPDATED generateModuleWithAI FUNCTION
// ================================================================================
// Replace your existing generateModuleWithAI function with this one

window.generateModuleWithAI = async function() {
    const statusEl = document.getElementById('aiGenerationStatus');
    const generateBtn = document.getElementById('generateModuleBtn');
    const previewContainer = document.getElementById('aiGeneratedResult');
    const previewTextarea = document.getElementById('aiGeneratedPreview');
    const previewSummary = document.getElementById('aiGeneratedSummary');
    const previewStats = document.getElementById('aiGeneratedStats');
    const saveBtn = document.getElementById('saveAiGeneratedModuleBtn');

    // Get form values
    const title = document.getElementById('newModuleTitle')?.value?.trim() || '';
    const moduleCode = document.getElementById('newModuleCode')?.value?.trim() || '';
    const category = document.getElementById('newModuleCategory')?.value || '';
    const seriesId = document.getElementById('newModuleSeries')?.value || '';
    const superSkillId = document.getElementById('newModuleSuperSkill')?.value || '';
    
    // NEW: Get psychology fields
    const ageRangeId = document.getElementById('ageRangeSelect')?.value || '';
    const coreTheoryId = document.getElementById('coreTheorySelect')?.value || '';
    const brainTownAnalogy = document.getElementById('brainTownAnalogy')?.value?.trim() || '';
    const additionalContext = document.getElementById('newModuleContentBrief')?.value?.trim() || '';

    // Reset UI
    previewContainer.style.display = 'none';
    previewTextarea.value = '';
    previewSummary.textContent = '';
    previewStats.innerHTML = '';
    saveBtn.disabled = true;

    try {
        // Validation
        if (!title) {
            alert('❌ Please enter a module title');
            document.getElementById('newModuleTitle')?.focus();
            return;
        }
        if (!superSkillId) {
            alert('❌ Please select a Super Skill');
            document.getElementById('newModuleSuperSkill')?.focus();
            return;
        }
        if (!ageRangeId) {
            alert('❌ Please select an Age Range');
            document.getElementById('ageRangeSelect')?.focus();
            return;
        }
        if (!coreTheoryId) {
            alert('❌ Please select a Core Theory');
            document.getElementById('coreTheorySelect')?.focus();
            return;
        }
        if (!brainTownAnalogy) {
            alert('❌ Please enter a Brain Town Analogy');
            document.getElementById('brainTownAnalogy')?.focus();
            return;
        }

        // Show loading modal
        showGenerationPipeline();

        generateBtn.disabled = true;
        generateBtn.textContent = '⏳ Generating...';
        statusEl.textContent = 'Starting AI generation...';
        statusEl.style.color = '#7b3ff2';

        // Safety timeout
        const safetyTimeout = setTimeout(() => {
            console.warn('[AI] Generation timeout - closing modal');
            hideGenerationPipeline();
            generateBtn.disabled = false;
            generateBtn.textContent = '✨ Generate Module with AI';
            statusEl.textContent = '⚠️ Generation timed out. Please try again.';
            statusEl.style.color = '#ef4444';
        }, 300000); // 5 minutes

        try {
            // Start generation with NEW enhanced mode
            const response = await fetch(
                `${requireSupabaseEnv().url}/functions/v1/generate-module`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${requireSupabaseEnv().key}`,
                        'apikey': requireSupabaseEnv().key
                    },
                    body: JSON.stringify({
                        // NEW: Enhanced psychology mode
                        ageRangeId,
                        coreTheoryId,
                        brainTownAnalogy,
                        additionalContext,
                        title,
                        
                        // Existing fields
                        superSkillId,
                        seriesId: seriesId || undefined,
                        category: category || undefined,
                        
                        // Use async mode
                        async: true
                    })
                }
            );

            if (!response.ok) {
                const errorText = await response.text();
                console.error('[AI] HTTP error:', response.status, errorText);
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }

            const data = await response.json();
            console.log('[AI] Generation started:', data);

            if (!data.jobId) {
                throw new Error('No job ID returned from server');
            }

            currentJobId = data.jobId;
            
            // Poll for results
            const result = await pollForJobResult(data.jobId);

            if (!result || !result.html) {
                console.error('[AI] Result data:', result);
                throw new Error('AI did not return valid HTML');
            }

            window.generatedModuleHTML = result.html;
            generatedModuleHTML = window.generatedModuleHTML;
            window.currentGenerationSpec = result.spec;
            currentGenerationSpec = window.currentGenerationSpec;

            if (moduleCode && window.generatedModuleHTML.includes('__MODULE_CODE__')) {
                window.generatedModuleHTML = window.generatedModuleHTML.replace(/__MODULE_CODE__/g, moduleCode);
                generatedModuleHTML = window.generatedModuleHTML;
            }

            const pageCount = result.pageCount ?? (result.html.match(/data-page/g) || []).length;
            const charCount = result.characterCount ?? result.html.length;

            previewTextarea.value = generatedModuleHTML;
            previewSummary.textContent = `Approx. ${pageCount || '??'} pages • ${charCount.toLocaleString()} characters`;
            
            // Find selected theory name for display
            const selectedTheory = coreTheories.find(t => t.id === coreTheoryId);
            const theoryName = selectedTheory?.theory_name || 'Unknown';
            
            previewStats.innerHTML = `
                <p style="margin: 0 0 6px;"><strong>Module code:</strong> ${moduleCode || 'Auto-generated'}</p>
                <p style="margin: 0 0 6px;"><strong>Core Theory:</strong> ${theoryName}</p>
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
    }
};

// ================================================================================
// ADD TO YOUR DOMContentLoaded OR INITIALIZATION CODE
// ================================================================================
// Make sure to call initPsychologyDropdowns() when the page loads

// Option 1: If you have an existing DOMContentLoaded handler, add this inside:
// initPsychologyDropdowns();

// Option 2: Or add this as a separate listener:
document.addEventListener('DOMContentLoaded', function() {
    // Initialize psychology dropdowns
    initPsychologyDropdowns();
});

// Also call it when the modal opens (add to your openAddModuleModal function):
// Example:
// function openAddModuleModal() {
//     document.getElementById('addModuleModal').style.display = 'flex';
//     initPsychologyDropdowns(); // Refresh dropdowns when modal opens
// }

        // Tab switching function - defined early to be available for HTML onclick handlers
        window.switchTab = function(evt, tabName) {
            // Update tab buttons
            document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
            (evt && evt.target ? evt.target : (typeof window !== 'undefined' ? window.event?.target : null))?.classList?.add('active');

            // Update tab content
            document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
            
            if (tabName === 'generalSettings') {
                document.getElementById('generalSettingsTab').classList.add('active');
                loadGeneralSettings();
            } else if (tabName === 'childModules') {
                document.getElementById('parentModulesTab').classList.add('active');
                // Load parents if not already loaded
                if (allParents.length === 0) {
                    loadAllParents();
                }
            } else if (tabName === 'moduleCustomisation') {
                document.getElementById('moduleCustomisationTab').classList.add('active');
                renderAllModulesList();
            } else if (tabName === 'moduleContentCreator') {
                document.getElementById('moduleContentCreatorTab').classList.add('active');
                loadModulesToGenerate();
                populateMtgSuperSkillDropdown();
            } else if (tabName === 'theories') {
                document.getElementById('theoriesTab').classList.add('active');
                loadTheories();
                loadAgeRangesTheories();
                loadSuperSkillsTheories();
                loadSubSkillsTheories();
                loadFasdDomainsTheories();
                loadNdisDomainsTheories();
            } else if (tabName === 'rewards') {
                document.getElementById('rewardsTab').classList.add('active');
                if (!rewards || rewards.length === 0) {
                    loadRewards();
                }
            } else if (tabName === 'parentToolkit') {
                document.getElementById('parentToolkitTab').classList.add('active');
                loadToolkitSettings();
            }
        };

        const rewardsListElement = document.getElementById('rewardsList');

        // Check if user is admin
        async function checkAdminAccess() {
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

        // Load all children from all parents
        async function loadAllChildren() {
            // First get all children
            const { data: childrenData, error: childrenError } = await supabase
                .from('children')
                .select('*')
                .order('name');

            if (childrenError) {
                console.error('Error loading children:', childrenError);
                return;
            }

            // Then get parent usernames
            const { data: parentsData, error: parentsError } = await supabase
                .from('parent_profiles')
                .select('id, username');

            if (parentsError) {
                console.error('Error loading parents:', parentsError);
            }

            // Create a map of parent IDs to usernames
            const parentMap = {};
            if (parentsData) {
                parentsData.forEach(parent => {
                    parentMap[parent.id] = parent.username;
                });
            }

            // Add parent username to each child
            allChildren = childrenData.map(child => ({
                ...child,
                parent_username: parentMap[child.parent_user_id] || 'Unknown'
            }));

            // Don't render here - children list is only for stats, not for Parent's Modules tab
            updateStats();
        }

        // Render children list (not used in Parent's Modules tab anymore)
        function renderChildrenList() {
            const container = document.getElementById('childrenList');
            
            if (allChildren.length === 0) {
                container.innerHTML = '<div class="empty-state"><p>No children found</p></div>';
                return;
            }

            container.innerHTML = allChildren.map(child => `
                <div class="child-item ${selectedChild?.id === child.id ? 'active' : ''}" 
                     onclick="selectChild('${child.id}')">
                    <div class="child-name">${child.avatar || '👤'} ${child.name}</div>
                    <div class="child-info">Parent: ${child.parent_username || 'Unknown'}</div>
                    <div class="child-info">Stars: ${child.stars || 0} ⭐</div>
                </div>
            `).join('');
        }

        // Load all parents
        async function loadAllParents() {
            const { data: parentsData, error: parentsError } = await supabase
                .from('parent_profiles')
                .select('id, username')
                .order('username');

            if (parentsError) {
                console.error('Error loading parents:', parentsError);
                return;
            }

            allParents = parentsData || [];

            renderParentsList();
        }

        // Render parents list
        function renderParentsList() {
            const container = document.getElementById('parentsList');
            
            if (allParents.length === 0) {
                container.innerHTML = '<div class="empty-state"><p>No parents found</p></div>';
                return;
            }

            container.innerHTML = allParents.map(parent => `
                <div class="child-item ${selectedParent?.id === parent.id ? 'active' : ''}" 
                     onclick="selectParent('${parent.id}')">
                    <div class="child-name">👤 ${parent.username || 'Parent'}</div>
                </div>
            `).join('');
        }

        // Render parent's children in middle column
        function renderParentChildren(parentId) {
            const container = document.getElementById('parentChildrenList');
            const childrenTitle = document.getElementById('childrenTitle');
            
            // Filter children by parent
            const parentChildren = allChildren.filter(c => c.parent_user_id === parentId);
            
            if (parentChildren.length === 0) {
                container.innerHTML = '<div class="empty-state"><p>No children found for this parent</p></div>';
                childrenTitle.textContent = 'Children (0)';
                return;
            }

            childrenTitle.textContent = `Children (${parentChildren.length})`;
            container.innerHTML = parentChildren.map(child => `
                <div class="child-item">
                    <div class="child-name">${child.avatar || '👤'} ${child.name}</div>
                    <div class="child-info">Stars: ${child.stars || 0} ⭐</div>
                </div>
            `).join('');
        }

        // Select a parent
        window.selectParent = async function(parentId) {
            selectedParent = allParents.find(p => p.id === parentId);
            renderParentsList(); // Update selection highlight
            renderParentChildren(parentId); // Show their children
            await loadParentModules(parentId); // Show their modules
        }

        // Load parent's module assignments
        async function loadParentModules(parentId) {
            document.getElementById('modulesTitle').textContent = `Modules for ${selectedParent.username || 'Parent ' + selectedParent.id}`;
            document.getElementById('modulesList').innerHTML = '<div class="loading">Loading modules...</div>';
            document.getElementById('searchFilterContainer').style.display = 'block';

            // Get parent's current module assignments from parent_modules table
            const { data: assignments } = await supabase
                .from('parent_modules')
                .select('module_id, is_active')
                .eq('parent_id', parentId);

            // Create a map of module assignments
            currentModuleAssignments = {};
            if (assignments) {
                assignments.forEach(a => {
                    currentModuleAssignments[a.module_id] = a.is_active;
                });
            }
            
            // For any modules not in parent_modules, mark them as inactive (not yet assigned)
            allModules.forEach(m => {
                if (!(m.id in currentModuleAssignments)) {
                    currentModuleAssignments[m.id] = false;
                }
            });

            // Reset filters and selections
            currentFilter = 'all';
            selectedModules.clear();
            document.getElementById('moduleSearch').value = '';
            
            // Populate filters (categories and series)
            const categoryFilter = document.getElementById('categoryFilter');
            const seriesFilter = document.getElementById('seriesFilter');
            
            const categories = [...new Set(allModules.map(m => m.category).filter(Boolean))].sort();
            categoryFilter.innerHTML = '<option value="all">All Categories</option>' + 
                categories.map(cat => `<option value="${cat}">${cat.charAt(0).toUpperCase() + cat.slice(1)}</option>`).join('');
            
            const series = [...new Set(allModules.map(m => m.series).filter(Boolean))].sort();
            seriesFilter.innerHTML = '<option value="all">All Series</option>' + 
                series.map(s => `<option value="${s}">${s}</option>`).join('');
            
            // Render modules
            filterModules();
        }

        // Load all modules
        async function loadAllModules() {
            const { data, error } = await supabase
                .from('modules')
                .select('*')
                .order('title');

            if (error) {
                console.error('Error loading modules:', error);
                return;
            }

            allModules = data || [];
            
            // Load category colors
            await loadCategoryColors();
            
            // Populate customisation filters and render modules
            populateCustomisationFilters();
            renderAllModulesList();
        }

        // Load category colors
        async function loadCategoryColors() {
            const { data, error } = await supabase
                .from('category_colors')
                .select('*');

            if (error) {
                console.error('Error loading category colors:', error);
                return;
            }

            // Convert to map for easy lookup
            categoryColors = {};
            if (data) {
                data.forEach(cc => {
                    categoryColors[cc.category] = cc.color;
                });
            }
        }

        // Select a child
        window.selectChild = async function(childId) {
            selectedChild = allChildren.find(c => c.id === childId);
            renderChildrenList();
            await loadChildModules(childId);
        }

        // Load child's module assignments
        async function loadChildModules(childId) {
            document.getElementById('modulesTitle').textContent = `Modules for ${selectedChild.name}`;
            document.getElementById('modulesList').innerHTML = '<div class="loading">Loading modules...</div>';
            document.getElementById('searchFilterContainer').style.display = 'block';

            // Get child's current module assignments
            const { data: assignments } = await supabase
                .from('child_modules')
                .select('module_id, is_active')
                .eq('child_id', childId);

            currentModuleAssignments = {};
            if (assignments) {
                assignments.forEach(a => {
                    currentModuleAssignments[a.module_id] = a.is_active;
                });
            }

            // Reset filters and selections
            currentFilter = 'all';
            selectedModules.clear();
            document.getElementById('moduleSearch').value = '';
            
            // Populate category and series dropdowns
            populateCategoryDropdown();
            populateSeriesDropdown();
            
            // Render modules
            renderModules();
        }

        // Populate category dropdown with unique categories from modules
        function getAllKnownCategories() {
            if (Array.isArray(window.generalCategories) && window.generalCategories.length > 0) {
                return window.generalCategories.map(cat => cat.name).filter(Boolean);
            }
            return Array.from(new Set(allModules.map(m => m.category).filter(Boolean)));
        }

        function populateCategoryDropdown() {
            const categoryFilter = document.getElementById('categoryFilter');
            
            const categories = Array.isArray(window.generalCategories) && window.generalCategories.length > 0
                ? window.generalCategories.map(cat => cat.name).filter(Boolean).sort()
                : Array.from(new Set(allModules.map(m => m.category).filter(Boolean))).sort();

            categoryFilter.innerHTML = '<option value="all">All Categories</option>';
            categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category;
                option.textContent = formatCategoryLabel(category);
                categoryFilter.appendChild(option);
            });
        }

        // Populate any category dropdowns that depend on module data
        function populateCategoryDropdowns() {
            populateCategoryDropdown();

            const customisationCategory = document.getElementById('customisationCategoryFilter');
            if (customisationCategory) {
                const previousValue = customisationCategory.value || 'all';
                const categories = Array.isArray(window.generalCategories) && window.generalCategories.length > 0
                    ? window.generalCategories.map(cat => cat.name).filter(Boolean).sort()
                    : Array.from(new Set(allModules.map(m => m.category).filter(Boolean))).sort();

                customisationCategory.innerHTML = '<option value="all">All Categories</option>' +
                    categories.map(category =>
                        `<option value="${category}">${formatCategoryLabel(category)}</option>`
                    ).join('');

                if (categories.includes(previousValue)) {
                    customisationCategory.value = previousValue;
                } else {
                    customisationCategory.value = 'all';
                }
            }
        }

        // Populate series dropdown with unique series from modules
        function populateSeriesDropdown() {
            const seriesFilter = document.getElementById('seriesFilter');
            const series = Array.from(new Set(
                allModules
                    .map(m => m.series)
                    .filter(Boolean)
            )).sort();

            seriesFilter.innerHTML = '<option value="all">All Series</option>';
            series.forEach(s => {
                const option = document.createElement('option');
                option.value = s;
                option.textContent = s;
                seriesFilter.appendChild(option);
            });
        }

        // Render modules based on current filter and search
        function renderModules() {
            const container = document.getElementById('modulesList');
            const searchTerm = document.getElementById('moduleSearch').value.toLowerCase();
            const selectedCategory = document.getElementById('categoryFilter').value;
            const selectedSeries = document.getElementById('seriesFilter').value;
            
            let filteredModules = allModules.filter(module => {
                // Check if module is globally active
                const isGloballyActive = module.is_active;
                
                // Check if module is active for THIS PARENT (from parent_modules table)
                // If no assignment exists, it's inactive for this parent
                const isActiveForParent = currentModuleAssignments[module.id] !== undefined 
                    ? currentModuleAssignments[module.id] 
                    : false; // Default to inactive if not assigned to this parent
                
                // Module is only truly active if BOTH global and parent access are active
                const isActuallyActive = isGloballyActive && isActiveForParent;
                
                const matchesSearch = module.title.toLowerCase().includes(searchTerm);
                const matchesCategory = selectedCategory === 'all' || module.category === selectedCategory;
                const matchesSeries = selectedSeries === 'all' || module.series === selectedSeries;
                const matchesFilter = 
                    currentFilter === 'all' ||
                    (currentFilter === 'active' && isActuallyActive) ||
                    (currentFilter === 'inactive' && !isActuallyActive);
                
                return matchesSearch && matchesCategory && matchesSeries && matchesFilter;
            });
            
            // Sort modules by creation date (newest first)
            filteredModules.sort((a, b) => {
                const dateA = new Date(a.created_at || 0);
                const dateB = new Date(b.created_at || 0);
                return dateB.getTime() - dateA.getTime(); // Newest first
            });

            if (filteredModules.length === 0) {
                container.innerHTML = '<div class="empty-state"><p>No modules found</p></div>';
                return;
            }

            container.innerHTML = filteredModules.map(module => {
                // Check if module is globally active
                const isGloballyActive = module.is_active;
                
                // Check if module is active for THIS PARENT (from parent_modules table)
                const isActiveForParent = currentModuleAssignments[module.id] !== undefined 
                    ? currentModuleAssignments[module.id] 
                    : false; // Default to inactive if not assigned to this parent
                
                // Module is only truly active if BOTH global and parent access are active
                const isActuallyActive = isGloballyActive && isActiveForParent;
                
                const isSelected = selectedModules.has(module.id);
                const borderColor = categoryColors[module.category] || '#4c6c96';
                
                // Show different status based on why it's inactive
                let statusText, statusClass;
                if (!isGloballyActive && isActiveForParent) {
                    statusText = 'Globally Inactive';
                    statusClass = 'inactive';
                } else if (isGloballyActive && !isActiveForParent) {
                    statusText = 'Parent Inactive';
                    statusClass = 'inactive';
                } else if (!isGloballyActive && !isActiveForParent) {
                    statusText = 'Inactive';
                    statusClass = 'inactive';
                } else {
                    statusText = 'Active';
                    statusClass = 'active';
                }
                
                return `
                    <div class="module-item ${isSelected ? 'selected' : ''}" 
                         id="module-${module.id}"
                         style="border-left-color: ${borderColor}">
                        <div class="module-header">
                            <input type="checkbox" 
                                   class="module-checkbox" 
                                   data-module-id="${module.id}"
                                   ${isSelected ? 'checked' : ''}>
                            <div class="module-title">${module.emoji || '📖'} ${module.title}</div>
                            <span class="status-badge ${statusClass}">
                                ${statusText}
                            </span>
                        </div>
                    </div>
                `;
            }).join('');
            updateBulkActionsVisibility();
        }

        // Filter modules
        window.filterModules = function() {
            renderModules();
        }

        // Set filter
        window.setFilter = function(evt, filter) {
            currentFilter = filter;
            
            // Update button states
            document.querySelectorAll('.filter-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            (evt && evt.target ? evt.target : (typeof window !== 'undefined' ? window.event?.target : null))?.classList?.add('active');
            
            renderModules();
        }

        // Update statistics
        async function updateStats() {
            document.getElementById('totalChildren').textContent = allChildren.length;
            document.getElementById('totalModules').textContent = allModules.length;

            // Count active assignments
            const { count } = await supabase
                .from('child_modules')
                .select('*', { count: 'exact', head: true })
                .eq('is_active', true);

            document.getElementById('activeAssignments').textContent = count || 0;
        }

        // Navigate to dashboard
        window.goToDashboard = function() {
            window.location.href = '/dashboard.html';
        }

        // ========== AI MODULE GENERATION ==========
        window.generatedModuleHTML = null;
        let generatedModuleHTML = window.generatedModuleHTML;
        const legacyFileInput = document.getElementById('legacyModuleFile');
        const triggerModuleUploadBtn = document.getElementById('triggerModuleUpload');
        const migrationStatusEl = document.getElementById('migrationStatus');

        if (triggerModuleUploadBtn && legacyFileInput) {
            triggerModuleUploadBtn.addEventListener('click', () => legacyFileInput.click());
            legacyFileInput.addEventListener('change', handleLegacyModuleUpload);
        }

        async function handleLegacyModuleUpload(event) {
            const file = evt.target?.files?.[0];
            if (!file) {
                return;
            }

            const moduleCode = document.getElementById('newModuleCode').value?.trim();
            if (!moduleCode) {
                alert('Please open the Add Module form so we can assign a module code first.');
                legacyFileInput.value = '';
                return;
            }

            try {
                setMigrationStatus({ message: 'Processing legacy module…', type: 'info' });

                const originalHtml = await file.text();
                let migratedHtml = convertModule(originalHtml);
                migratedHtml = fixEscapedBackticks(migratedHtml);
                migratedHtml = addHomeButtonToHeader(migratedHtml);

                if (moduleCode) {
                    migratedHtml = migratedHtml
                        .replace(/__MODULE_CODE__/g, moduleCode)
                        .replace(/__WORKBOOK_ID__/g, moduleCode);
                }

                window.generatedModuleHTML = migratedHtml;
                generatedModuleHTML = window.generatedModuleHTML;
                window.currentGenerationSpec = null;
                currentGenerationSpec = window.currentGenerationSpec;

                const resultPanel = document.getElementById('aiGeneratedResult');
                const saveBtn = document.getElementById('saveAiGeneratedModuleBtn');
                if (resultPanel) resultPanel.style.display = 'block';
                if (saveBtn) saveBtn.disabled = false;

                setMigrationStatus({
                    message: 'Migration complete. Click “Create Module” to save it to Supabase.',
                    type: 'success'
                });
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

        window.closeAddModuleModal = function() {
            const modal = document.getElementById('addModuleModal');
            const form = document.getElementById('addModuleForm');
            if (modal) {
                modal.classList.remove('active');
            }
            if (form) {
                form.reset();
            }
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
        }

        window.openAddModuleModal = async function() {
            const modal = document.getElementById('addModuleModal');
            if (modal) {
                modal.classList.add('active');
                // Reset form and generate initial module code
                const form = document.getElementById('addModuleForm');
                if (form) {
                    form.reset();
                    // Generate module code for the new module
                    const codeInput = document.getElementById('newModuleCode');
                    if (codeInput) {
                        codeInput.value = generateNextModuleCode();
                    }
                }
                
                // Load pending module blueprints into dropdown
                await loadPendingBlueprintsDropdown();
                
                // Hide loaded status
                const statusEl = document.getElementById('blueprintLoadedStatus');
                if (statusEl) statusEl.style.display = 'none';
            }
        }
        
        // Load pending blueprints into the dropdown in Add Module modal
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
                
                if (error) {
                    console.error('Error loading blueprints:', error);
                    return;
                }
                
                dropdown.innerHTML = '<option value="">-- Select a pending blueprint --</option>' +
                    (data || []).map(bp => {
                        const label = [
                            bp.cycle,
                            bp.week_number ? `Week ${bp.week_number}` : null,
                            bp.level,
                            bp.module_title
                        ].filter(Boolean).join(' - ');
                        return `<option value="${bp.id}">${label}</option>`;
                    }).join('');
                    
            } catch (error) {
                console.error('Error loading blueprints dropdown:', error);
            }
        }
        
        // Load a module blueprint into the Add Module form
        async function loadModuleBlueprintIntoForm() {
            console.log('🔥 loadModuleBlueprintIntoForm called!');
            
            const blueprintId = document.getElementById('moduleBlueprintSelect').value;
            console.log('🔥 Selected blueprint ID:', blueprintId);
            
            if (!blueprintId) {
                console.log('🔥 No blueprint ID selected, returning');
                return;
            }
            
            try {
                const { data: blueprint, error } = await supabase
                    .from('modules_to_generate')
                    .select('*')
                    .eq('id', blueprintId)
                    .single();
                
                if (error || !blueprint) {
                    console.error('Error loading blueprint:', error);
                    return;
                }
                
                console.log('Loaded blueprint:', blueprint);
                console.log('Core Theory:', blueprint.core_theory);
                console.log('Brain Town Analogy:', blueprint.brain_town_analogy);
                
                // Store the blueprint ID for later (to mark as generated)
                document.getElementById('addModuleForm').dataset.blueprintId = blueprintId;
                
                // Populate form fields
                const titleField = document.getElementById('newModuleTitle');
                const ageRangeField = document.getElementById('ageRangeSelect');
                const coreTheoryField = document.getElementById('coreTheorySelect');
                const brainTownField = document.getElementById('brainTownAnalogy');
                const superSkillField = document.getElementById('newModuleSuperSkill');
                const subSkillField = document.getElementById('newModuleSubSkill');
                const cycleSelect = document.getElementById('newModuleCycle');
                const orderField = document.getElementById('newModuleOrder');
                
                console.log('Form elements found:', {
                    titleField: !!titleField,
                    ageRangeField: !!ageRangeField,
                    coreTheoryField: !!coreTheoryField,
                    brainTownField: !!brainTownField
                });
                
                const normalizeLookup = (value) => (value || '')
                    .toString()
                    .trim()
                    .toLowerCase()
                    .replace(/\s+/g, '')
                    .replace(/[-–—]/g, '');
                
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
                    if (!setSelectByName(ageRangeField, blueprint.age_range || '')) {
                        ageRangeField.value = blueprint.age_range || '';
                    }
                }
                if (coreTheoryField) {
                    if (!setSelectByName(coreTheoryField, blueprint.core_theory || '')) {
                        coreTheoryField.value = blueprint.core_theory || '';
                    }
                    console.log('Set Core Theory field to:', blueprint.core_theory);
                    console.log('Core Theory field value after setting:', coreTheoryField.value);
                    updateTheoryPreview({
                        selectId: 'coreTheorySelect',
                        previewId: 'theoryPreview',
                        nameId: 'theoryPreviewName',
                        descriptionId: 'theoryPreviewDescription'
                    });
                    
                    // Simple visual test - change background color
                    if (blueprint.core_theory) {
                        coreTheoryField.style.backgroundColor = '#D1FAE5';
                        setTimeout(() => {
                            coreTheoryField.style.backgroundColor = '';
                        }, 3000);
                    }
                }
                if (brainTownField) {
                    brainTownField.value = blueprint.brain_town_analogy || '';
                    console.log('Set Brain Town Analogy field to:', blueprint.brain_town_analogy);
                    console.log('Brain Town Analogy field value after setting:', brainTownField.value);
                    
                    // Simple visual test - change background color
                    if (blueprint.brain_town_analogy) {
                        brainTownField.style.backgroundColor = '#D1FAE5';
                        setTimeout(() => {
                            brainTownField.style.backgroundColor = '';
                        }, 3000);
                    }
                }

                const xpRewardField = document.getElementById('newModuleXPReward');
                const starsRewardField = document.getElementById('newModuleStarsReward');
                if (xpRewardField && blueprint.xp_reward) xpRewardField.value = blueprint.xp_reward;
                if (starsRewardField && blueprint.stars_reward) starsRewardField.value = blueprint.stars_reward;
                
                // Set Super Skill and trigger change
                if (superSkillField && blueprint.super_skill_id) {
                    superSkillField.value = blueprint.super_skill_id;
                    if (typeof onSuperSkillChange === 'function') {
                        await onSuperSkillChange();
                    }
                    
                    // Set Sub-Skill after dropdown is populated
                    setTimeout(() => {
                        if (subSkillField && blueprint.sub_skill_id) {
                            subSkillField.value = blueprint.sub_skill_id;
                        }
                    }, 100);
                }
                
                // Set Cycle
                if (cycleSelect && blueprint.cycle) {
                    // Try to find matching option
                    for (let opt of cycleSelect.options) {
                        if (opt.text.toLowerCase().includes(blueprint.cycle.toLowerCase()) || 
                            opt.value.toLowerCase().includes(blueprint.cycle.toLowerCase())) {
                            cycleSelect.value = opt.value;
                            break;
                        }
                    }
                }
                
                // Set Week Number
                if (orderField && blueprint.week_number) {
                    orderField.value = blueprint.week_number;
                }
                
                // Build the AI Content Brief from blueprint data
                const contentBrief = buildContentBriefFromBlueprint(blueprint);
                document.getElementById('newModuleContentBrief').value = contentBrief;
                
                // Show loaded status
                const statusEl = document.getElementById('blueprintLoadedStatus');
                if (statusEl) statusEl.style.display = 'block';
                
            } catch (error) {
                console.error('Error loading blueprint into form:', error);
            }
        }
        
        // Build AI content brief from blueprint data
        function buildContentBriefFromBlueprint(blueprint) {
            // If there's already an AI prompt, use it
            if (blueprint.ai_content_prompt) {
                return blueprint.ai_content_prompt;
            }
            
            // Otherwise, build one from the available data
            const parts = [];
            
            if (blueprint.module_title) {
                parts.push(`Title: ${blueprint.module_title}`);
            }
            if (blueprint.age_range) {
                parts.push(`Age Range: ${blueprint.age_range}`);
            }
            if (blueprint.cycle) {
                parts.push(`Cycle: ${blueprint.cycle}`);
            }
            if (blueprint.level) {
                parts.push(`Level: ${blueprint.level}`);
            }
            if (blueprint.core_theory) {
                parts.push(`\nCore Theory: ${blueprint.core_theory}`);
            }
            if (blueprint.brain_town_analogy) {
                parts.push(`\nBrain Town Analogy: ${blueprint.brain_town_analogy}`);
            }
            if (blueprint.main_activity) {
                parts.push(`\nMain Activity: ${blueprint.main_activity}`);
            }
            if (blueprint.builds_on && blueprint.builds_on !== 'N/A') {
                parts.push(`\nBuilds On: ${blueprint.builds_on}`);
            }
            
            return parts.join('\n');
        }
        // ========== GENERATION STATE ==========
let generationStartTime = null;
let elapsedInterval = null;
let currentJobId = null;
window.currentGenerationSpec = null;
let currentGenerationSpec = window.currentGenerationSpec;

// ========== SESSION RECOVERY ==========
function saveGenerationSession(jobId, brief) {
    localStorage.setItem('ai_generation_session', JSON.stringify({
        jobId,
        brief,
        timestamp: Date.now()
    }));
}

function loadGenerationSession() {
    const session = localStorage.getItem('ai_generation_session');
    if (!session) return null;
    
    const data = JSON.parse(session);
    if (Date.now() - data.timestamp < 600000) {
        return data;
    }
    
    clearGenerationSession();
    return null;
}

function clearGenerationSession() {
    localStorage.removeItem('ai_generation_session');
}

window.addEventListener('DOMContentLoaded', () => {
    const session = loadGenerationSession();
    if (session) {
        const resume = confirm(
            '🔄 It looks like a module generation was interrupted.\n\n' +
            'Would you like to check its status?'
        );
        
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
        if (result.success) {
            handleGenerationSuccess(result);
        }
    }).catch(error => {
        handleGenerationError(error);
    });
}

// ========== PIPELINE UI ==========
function showGenerationPipeline() {
    const modal = document.getElementById('generationLoadingModal');
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}

function hideGenerationPipeline() {
    const modal = document.getElementById('generationLoadingModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = '';
    }
}

function resetPipelineSteps() {
    document.querySelectorAll('.pipeline-step').forEach(step => {
        step.classList.remove('active', 'complete');
    });
    updateProgressBar(0);
}

function updatePipelineStep(stepName) {
    const steps = ['initializing', 'skeleton', 'expansion', 'validation', 'rendering'];
    const stepIndex = steps.indexOf(stepName);
    
    if (stepIndex === -1) return;
    
    for (let i = 0; i < stepIndex; i++) {
        const stepEl = document.querySelector(`[data-step="${steps[i]}"]`);
        if (stepEl) {
            stepEl.classList.remove('active');
            stepEl.classList.add('complete');
        }
    }
    
    const currentStepEl = document.querySelector(`[data-step="${stepName}"]`);
    if (currentStepEl) {
        currentStepEl.classList.remove('complete');
        currentStepEl.classList.add('active');
    }
    
    const progress = ((stepIndex + 1) / steps.length) * 100;
    updateProgressBar(progress);
}

function updateProgressBar(percent) {
    const pipelineSteps = document.querySelector('.pipeline-steps');
    if (pipelineSteps) {
        pipelineSteps.style.setProperty('--progress', `${percent}%`);
    }
}

function markStepComplete(stepName) {
    const stepEl = document.querySelector(`[data-step="${stepName}"]`);
    if (stepEl) {
        stepEl.classList.remove('active');
        stepEl.classList.add('complete');
    }
}

// ========== GENERATION LOG ==========
function clearLog() {
    const log = document.getElementById('generationLog');
    if (log) {
        log.innerHTML = '';
    }
}

function addLog(message, type = 'info') {
    const log = document.getElementById('generationLog');
    if (!log) {

        return;
    }
    
    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;
    
    const timeStr = generationStartTime 
        ? formatElapsed(Date.now() - generationStartTime)
        : '00:00';
    
    entry.innerHTML = `
        <span class="log-time">${timeStr}</span>
        <span>${message}</span>
    `;
    
    log.appendChild(entry);
    log.scrollTop = log.scrollHeight;
}

// ========== TIME TRACKING ==========
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

function stopElapsedTimer() {
    if (elapsedInterval) {
        clearInterval(elapsedInterval);
        elapsedInterval = null;
    }
}

function formatElapsed(ms) {
    const seconds = Math.floor(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function updateEstimatedRemaining(seconds) {
    const mins = Math.ceil(seconds / 60);
    document.getElementById('estimatedRemaining').textContent = 
        seconds < 60 ? `${seconds}s` : `~${mins}m`;
}

// ========== ERROR HANDLING ==========
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
        return {
            title: '🔑 API Key Issue',
            message: 'The Claude API key is missing or invalid.',
            suggestion: 'Verify your Anthropic API key in the Supabase settings table.',
            action: 'Check Settings',
            actionFn: () => alert('Go to Supabase → Database → settings table and verify claude_api_key')
        };
    }
    
    if (msg.includes('timeout') || msg.includes('timed out')) {
        return {
            title: '⏱️ Generation Timeout',
            message: 'The generation took longer than expected.',
            suggestion: 'Try simplifying your content brief or try again.',
            action: 'Retry',
            actionFn: () => document.getElementById('generateModuleBtn').click()
        };
    }
    
    if (msg.includes('validation') || msg.includes('spec') || msg.includes('pages')) {
        return {
            title: '📋 Generation Error',
            message: 'The AI had trouble creating a complete module.',
            suggestion: 'Try again - the AI will use a different approach. If this persists, try making your content brief more detailed with specific learning objectives.',
            action: 'Retry Generation',
            actionFn: () => document.getElementById('generateModuleBtn').click()
        };
    }
    
    if (msg.includes('network') || msg.includes('fetch')) {
        return {
            title: '🌐 Network Error',
            message: 'Could not connect to the generation service.',
            suggestion: 'Check your internet connection and verify the edge function is deployed.',
            action: 'Retry',
            actionFn: () => document.getElementById('generateModuleBtn').click()
        };
    }
    
    return {
        title: '❌ Generation Failed',
        message: error.message,
        suggestion: 'Please try again. If the problem persists, contact support.',
        action: 'Retry',
        actionFn: () => document.getElementById('generateModuleBtn').click()
    };
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
                        <button class="error-notification-btn primary" onclick="(${errorInfo.actionFn.toString()})(); this.closest('.error-notification').remove();">
                            ${errorInfo.action}
                        </button>
                        <button class="error-notification-btn secondary" onclick="this.closest('.error-notification').remove()">
                            Dismiss
                        </button>
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

        // ========== PREVIEW MODAL ==========
        // Functions moved to early non-module script for availability to inline onclick handlers

        function approveAndSaveFromPreview() {
            window.closePreviewModal();
            document.getElementById('saveAiGeneratedModuleBtn').click();
        }

        function regenerateModule() {
            const confirmed = confirm(
                '🔄 This will generate a new version of the module.\n\n' +
                'Continue?'
            );
            
            if (confirmed) {
                closePreviewModal();
                document.getElementById('generateModuleBtn').click();
            }
        }

        function applyGeneratedMetadataToForm(metadata) {
            if (!metadata) return;
            
            const shortDescEl = document.getElementById('newModuleShortDescription');
            const descEl = document.getElementById('newModuleDescription');
            
            if (shortDescEl && !shortDescEl.value.trim() && metadata.shortDescription) {
                shortDescEl.value = metadata.shortDescription;
            }
            
            if (descEl && !descEl.value.trim() && metadata.description) {
                descEl.value = metadata.description;
            }
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
    // Emotions and skills fields removed - no longer required
    const contentBrief = document.getElementById('newModuleContentBrief').value.trim();
    const enrichedBrief = moduleCode
        ? `MODULE CODE: ${moduleCode}\n\n${contentBrief}`
        : contentBrief;

    previewContainer.style.display = 'none';
    previewTextarea.value = '';
    previewSummary.textContent = '';
    previewStats.innerHTML = '';
    saveBtn.disabled = true;

    try {
        // Get Super Skill ID early for validation
        const superSkillId = document.getElementById('newModuleSuperSkill')?.value || null;
        
        // Validation
        if (!title) {
            alert('❌ Please enter a module title');
            document.getElementById('newModuleTitle').focus();
            return;
        }
        if (!superSkillId) {
            alert('❌ Please select a Super Skill');
            document.getElementById('newModuleSuperSkill').focus();
            return;
        }
        // Emotions and skills validation removed - no longer required
        // Content brief is optional - no validation needed

        // Show loading modal
        showGenerationPipeline();

        generateBtn.disabled = true;
        generateBtn.textContent = '⏳ Generating...';
        statusEl.textContent = 'Starting AI generation...';
        statusEl.style.color = '#7b3ff2';

        // Safety timeout - close modal after 5 minutes if still open
        const safetyTimeout = setTimeout(() => {
            console.warn('[AI] Generation timeout - closing modal');
            hideGenerationPipeline();
            generateBtn.disabled = false;
            generateBtn.textContent = ' Generate Module with AI';
            statusEl.textContent = ' Generation timed out. Please try again.';
            statusEl.style.color = '#ef4444';
        }, 300000); // 5 minutes

        try {
            // Start generation
            const jobId = await startGenerationJob(enrichedBrief, seriesId, category, superSkillId);
            currentJobId = jobId;
            saveGenerationSession(jobId, contentBrief);
        
        // Poll for results
        const result = await pollForJobResult(jobId);
        
        if (!result || !result.html) {
            console.error('[AI] Result data:', result);
            throw new Error('AI did not return valid HTML');
        }

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
}

// Small helper
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Start generation job (returns job ID)
async function startGenerationJob(contentBrief, seriesId, category, superSkillId) {
  const response = await fetch(
    `${requireSupabaseEnv().url}/functions/v1/generate-module`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${requireSupabaseEnv().key}`,
        "apikey": requireSupabaseEnv().key
      },
      body: JSON.stringify({ contentBrief, seriesId, category, superSkillId, async: true })
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[AI] HTTP error:", response.status, errorText);
    throw new Error(`HTTP ${response.status}: ${errorText}`);
  }

  const data = await response.json();


  if (!data.jobId) {
    throw new Error("No job ID returned from server");
  }

  return data.jobId;
}

// Poll for job completion
async function pollForJobResult(jobId, maxAttempts = 300) {
  const statusEl = document.getElementById("aiGenerationStatus");
  const pollIntervalMs = 3000;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {


    let response;
    try {
      response = await fetch(
        `${requireSupabaseEnv().url}/functions/v1/generate-module/status/${jobId}`,
        {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${requireSupabaseEnv().key}`,
            "apikey": requireSupabaseEnv().key
          }
        }
      );
    } catch (err) {
      // Network error -> retryable
      console.warn(`[AI] Polling fetch error (attempt ${attempt}):`, err);
      if (attempt === maxAttempts) {
        throw new Error(`Polling failed after ${maxAttempts} attempts: ${err?.message || err}`);
      }
      await sleep(pollIntervalMs);
      continue;
    }

    if (!response.ok) {
      // HTTP error from status endpoint -> usually retryable
      console.warn(`[AI] Polling HTTP error ${response.status} (attempt ${attempt})`);
      if (attempt === maxAttempts) {
        throw new Error(`Failed to check job status after ${maxAttempts} attempts (HTTP ${response.status})`);
      }
      await sleep(pollIntervalMs);
      continue;
    }

    const data = await response.json();


    if (data.status === "completed") {
      return data.result;
    }

    if (data.status === "failed") {
      // IMPORTANT: stop immediately. Do NOT keep polling.
      throw new Error(data.error || "Job failed");
    }

if (data.status === "running") {
    const elapsedSeconds = attempt * (pollIntervalMs / 1000);
    if (statusEl) {
        statusEl.textContent = `⏳ Generating... (${elapsedSeconds}s elapsed)`;
    }
    
    // ✨ UPDATE PROGRESS FROM RESPONSE
    if (data.progress) {
        const progress = data.progress;
        updatePipelineStep(progress.step);
        addLog(progress.message, 'info');
        
        if (progress.metadata) {
            if (progress.metadata.wordCount) {
                addLog(`Word count: ${progress.metadata.wordCount}`, 'info');
            }
            if (progress.metadata.pageCount) {
                addLog(`Pages: ${progress.metadata.pageCount}`, 'info');
            }
        }
    }
    
    if (data.elapsed_seconds !== undefined) {
        // Already tracked by our timer
    }
    if (data.estimated_remaining_seconds !== undefined) {
        updateEstimatedRemaining(data.estimated_remaining_seconds);
    }
    
    await sleep(pollIntervalMs);
    continue;
}

    // Unknown status -> retry a bit, then timeout
    console.warn("[AI] Unknown job status:", data.status);
    if (attempt === maxAttempts) {
      throw new Error(`Unknown job status after ${maxAttempts} attempts: ${data.status}`);
    }
    await sleep(pollIntervalMs);
  }

  throw new Error("Job timed out after maximum attempts");
}


        // Save the generated module to database
        async function saveGeneratedModule() {
            const statusEl = document.getElementById('aiGenerationStatus');
            const saveBtn = document.getElementById('saveAiGeneratedModuleBtn');
            const generateBtn = document.getElementById('generateModuleBtn');

            try {
                if (!window.generatedModuleHTML) {
                    alert('Please generate a module with AI before saving.');
                    return;
                }

                if (saveBtn) {
                    saveBtn.disabled = true;
                    saveBtn.textContent = 'Saving...';
                }
                if (statusEl) {
                    statusEl.textContent = '💾 Saving module...';
                    statusEl.style.color = '#7b3ff2';
                }

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
                const superSkillId = document.getElementById('newModuleSuperSkill')?.value || null;
                const subSkillId = document.getElementById('newModuleSubSkill')?.value || null;
                const cycleId = document.getElementById('newModuleCycle')?.value || null;
                const shortDescription = document.getElementById('newModuleShortDescription')?.value?.trim()
                    || currentGenerationSpec?.metadata?.shortDescription
                    || null;
                const description = document.getElementById('newModuleDescription')?.value?.trim()
                    || currentGenerationSpec?.metadata?.description
                    || null;

                // Insert module into database (no code field)
                const { data: newModule, error: insertError } = await supabase
                    .from('modules')
                    .insert({
                        title: title,
                        category: category,
                        series: series,
                        age_range: ageRange,
                        // Emotions and skills fields removed - no longer required
                        short_description: shortDescription,
                        description: description,
                        html_content: generatedModuleHTML,
                        is_active: true,
                        super_skill_id: superSkillId || null,
                        sub_skill_id: subSkillId || null,
                        cycle_id: cycleId || null,
                        week_number: weekNumber,
                        xp_reward: xpReward,
                        stars_reward: starsReward,
                        character_name: characterName
                    })
                    .select()
                    .single();

                if (insertError) throw insertError;

                if (statusEl) {
                    statusEl.textContent = '✅ Saved!';
                    statusEl.style.color = '#10b981';
                }
                
                // Mark the blueprint as generated if one was used
                const blueprintId = document.getElementById('addModuleForm').dataset.blueprintId;
                if (blueprintId && newModule) {
                    await supabase
                        .from('modules_to_generate')
                        .update({
                            has_been_generated: true,
                            generated_module_id: newModule.id,
                            generated_at: new Date().toISOString()
                        })
                        .eq('id', blueprintId);
                    
                    console.log('[Admin] Blueprint marked as generated:', blueprintId);
                }

                alert(`✨ Module "${title}" created successfully!\n\nThe module is now available in your module list.`);

                closeAddModuleModal();
                await loadAllModules();
                if (selectedParent) {
                    await loadParentModules(selectedParent.id);
                }
                if (selectedChild) {
                    await loadChildModules(selectedChild.id);
                }

            } catch (error) {
                console.error('[Admin] Save error:', error);
                if (statusEl) {
                    statusEl.textContent = '❌ Save failed';
                    statusEl.style.color = '#ef4444';
                }
                
                const loadingOverlay3 = document.getElementById('aiLoadingOverlay');
                if (loadingOverlay3) loadingOverlay3.style.display = 'none';
                
                alert('Failed to save module: ' + error.message);
                throw error;
            } finally {
                if (saveBtn) {
                    saveBtn.textContent = '💾 Create Module';
                    saveBtn.disabled = !window.generatedModuleHTML;
                }
                if (generateBtn) generateBtn.disabled = false;
                const overlay = document.getElementById('aiLoadingOverlay');
                if (overlay) overlay.style.display = 'none';
            }
        }

        // Expose save handler for inline onclick binding
        window.saveGeneratedModule = saveGeneratedModule;

        window.previewGeneratedModule = function() {
            if (!generatedModuleHTML) {
                alert('Generate a module first to preview it.');
                return;
            }

            const previewWindow = window.open('', '_blank');
            if (!previewWindow) {
                alert('Please allow pop-ups to preview the module.');
                return;
            }

            // Create a modified version for preview that handles the module header differently
            let previewContent = generatedModuleHTML;
            
            // Debug: Log the import line we're looking for
            console.log('[Preview] Looking for import line in generated HTML...');
            const importMatch = previewContent.match(/import.*initModuleHeader.*from.*module-header/);
            console.log('[Preview] Found import:', importMatch);
            
            // Replace the ES6 import with a regular script tag for preview
            previewContent = previewContent.replace(
                /import\s*\{\s*initModuleHeader\s*\}\s*from\s*['"]\.\/modules\/shared\/module-header\.js['"];?/g,
                '// Module header loaded via regular script for preview\n' +
                '// Note: In production, this would be: import { initModuleHeader } from \'./modules/shared/module-header.js\';'
            );
            
            // Debug: Check if replacement worked
            const afterReplace = previewContent.match(/import.*initModuleHeader.*from.*module-header/);
            console.log('[Preview] Import after replacement:', afterReplace);
            
            // Add the module header script before the closing head tag
            previewContent = previewContent.replace(
                /<\/head>/,
                '    <script src="/modules/shared/module-header.js"></script>\n' +
                '</head>'
            );

            previewWindow.document.open();
            previewWindow.document.write(previewContent);
            previewWindow.document.close();
        }

        window.copyGeneratedModuleHTML = async function() {
            if (!window.generatedModuleHTML) {
                alert('Generate a module first to copy it.');
                return;
            }

            try {
                if (navigator.clipboard?.writeText) {
                    await navigator.clipboard.writeText(generatedModuleHTML);
                } else {
                    const tempTextarea = document.createElement('textarea');
                    tempTextarea.value = generatedModuleHTML;
                    document.body.appendChild(tempTextarea);
                    tempTextarea.select();
                    document.execCommand('copy');
                    document.body.removeChild(tempTextarea);
                }
                alert('✅ Generated HTML copied to clipboard!');
            } catch (error) {
                console.error('[AI] Copy error:', error);
                alert('Failed to copy HTML. Please try manually.');
            }
        }


        // Toggle module selection
        window.toggleModuleSelection = function(moduleId) {
            if (selectedModules.has(moduleId)) {
                selectedModules.delete(moduleId);
            } else {
                selectedModules.add(moduleId);
            }
            
            const moduleItem = document.getElementById(`module-${moduleId}`);
            if (moduleItem) {
                moduleItem.classList.toggle('selected');
            }
            
            updateBulkActionsVisibility();
        }

        // Update bulk actions visibility
        function updateBulkActionsVisibility() {
            const bulkActions = document.getElementById('bulkActions');
            const selectedCount = document.getElementById('selectedCount');
            
            if (selectedModules.size > 0) {
                bulkActions.style.display = 'flex';
                selectedCount.textContent = selectedModules.size;
            } else {
                bulkActions.style.display = 'none';
            }
        }

        // Clear selection
        window.clearSelection = function() {
            selectedModules.clear();
            renderModules();
        }

        // Bulk activate
        window.bulkActivate = async function() {
            if (selectedModules.size === 0 || !selectedParent) return;
            
            const btn = document.getElementById('bulkActivateBtn');
            const originalText = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = '<span class="loading-spinner"></span>Activating...';
            
            const moduleIds = Array.from(selectedModules);
            let updated = 0;
            
            // Get all children of this parent
            const parentChildren = allChildren.filter(c => c.parent_user_id === selectedParent.id);
            
            for (const moduleId of moduleIds) {
                try {
                    const { data: existing, error: checkError } = await supabase
                        .from('parent_modules')
                        .select('id')
                        .eq('parent_id', selectedParent.id)
                        .eq('module_id', moduleId)
                        .maybeSingle();

                    if (checkError) continue;

                    if (existing) {
                        // Update existing assignment to active
                        const { error: updateError } = await supabase
                            .from('parent_modules')
                            .update({ is_active: true })
                            .eq('parent_id', selectedParent.id)
                            .eq('module_id', moduleId);
                        
                        if (updateError) continue;
                        currentModuleAssignments[moduleId] = true;
                        updated++;
                    } else {
                        // Insert new parent_modules entry
                        const { error: insertError } = await supabase
                            .from('parent_modules')
                            .insert({
                                parent_id: selectedParent.id,
                                module_id: moduleId,
                                is_active: true
                            });
                        
                        if (insertError) continue;
                        
                        currentModuleAssignments[moduleId] = true;
                        updated++;
                    }
                    
                    // Also activate this module for all of the parent's children
                    if (parentChildren.length > 0) {
                        for (const child of parentChildren) {
                            // Check if child_modules entry exists
                            const { data: childModuleExists } = await supabase
                                .from('child_modules')
                                .select('id')
                                .eq('child_id', child.id)
                                .eq('module_id', moduleId)
                                .maybeSingle();
                            
                            if (childModuleExists) {
                                // Update existing entry
                                await supabase
                                    .from('child_modules')
                                    .update({ is_active: true })
                                    .eq('child_id', child.id)
                                    .eq('module_id', moduleId);
                            } else {
                                // Create new entry
                                await supabase
                                    .from('child_modules')
                                    .insert({
                                        child_id: child.id,
                                        module_id: moduleId,
                                        is_active: true,
                                        is_completed: false
                                    });
                            }
                        }
                    }
                } catch (error) {
                    console.error('[Admin] Error activating module:', error);
                }
            }
            
            btn.disabled = false;
            btn.innerHTML = originalText;
            
            selectedModules.clear();
            renderModules();
            updateStats();
            
            if (updated > 0) {
                alert(`✓ Activated ${updated} module(s) for ${selectedParent.username || 'Parent ' + selectedParent.id}`);
            }
        }

        // Bulk deactivate
        window.bulkDeactivate = async function() {
            if (selectedModules.size === 0 || !selectedParent) return;
            
            const btn = document.getElementById('bulkDeactivateBtn');
            const originalText = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = '<span class="loading-spinner"></span>Deactivating...';
            
            const moduleIds = Array.from(selectedModules);
            let updated = 0;
            
            for (const moduleId of moduleIds) {
                try {
                    const { data: existing, error: checkError } = await supabase
                        .from('parent_modules')
                        .select('id')
                        .eq('parent_id', selectedParent.id)
                        .eq('module_id', moduleId)
                        .maybeSingle();

                    if (checkError) continue;

                    if (existing) {
                        // Update existing assignment to inactive
                        const { error: updateError } = await supabase
                            .from('parent_modules')
                            .update({ is_active: false })
                            .eq('parent_id', selectedParent.id)
                            .eq('module_id', moduleId);
                        
                        if (updateError) continue;
                        currentModuleAssignments[moduleId] = false;
                        updated++;
                    } else {
                        // Create new assignment with is_active = false
                        const { error: insertError } = await supabase
                            .from('parent_modules')
                            .insert({
                                parent_id: selectedParent.id,
                                module_id: moduleId,
                                is_active: false
                            });
                        
                        if (insertError) {
                            console.error('Error creating assignment:', insertError);
                            continue;
                        }
                        
                        currentModuleAssignments[moduleId] = false;
                        updated++;
                    }
                } catch (error) {
                    // Silent fail, continue with next module
                }
            }
            
            btn.disabled = false;
            btn.innerHTML = originalText;
            
            selectedModules.clear();
            renderModules();
            updateStats();
            
            if (updated > 0) {
                alert(`✗ Deactivated ${updated} module(s) for ${selectedParent.username || 'Parent ' + selectedParent.id}`);
            }
        }

        // Rewards Management
        async function loadRewards() {
            if (!rewardsListElement) return;
            rewardsListElement.innerHTML = '<div class="empty-rewards">Loading rewards...</div>';

            const { data, error } = await supabase
                .from('rewards')
                .select('*')
                .order('is_baseline', { ascending: false })
                .order('star_cost', { ascending: true });

            if (error) {
                console.error('Error loading rewards:', error);
                rewardsListElement.innerHTML = '<div class="empty-rewards">Failed to load rewards.</div>';
                return;
            }

            rewards = data || [];
            renderRewardsList();
        }

        function renderRewardsList() {
            if (!rewardsListElement) return;

            if (!rewards || rewards.length === 0) {
                rewardsListElement.innerHTML = '<div class="empty-rewards">No rewards yet. Add your first reward below.</div>';
                return;
            }

            rewardsListElement.innerHTML = rewards.map(reward => {
                const badge = reward.is_baseline
                    ? '<span style="margin-left:8px; font-size:12px; color:#2e7d32; background:#e8f5e9; padding:2px 8px; border-radius:999px; font-weight:600;">Baseline</span>'
                    : '';

                const categoryLabel = reward.category ? reward.category.replace('_', ' ') : 'other';

                return `
                    <div class="reward-item">
                        ${reward.is_baseline ? '' : `<button class="reward-remove-btn" title="Remove" onclick="deleteReward('${reward.id}')">✕</button>`}
                        <div class="reward-item-header">
                            <div class="reward-icon">${reward.icon || '🎁'}</div>
                            <div class="reward-info">
                                <div class="reward-title">${reward.title || 'Untitled'} ${badge}</div>
                                <div class="reward-description">Category: ${categoryLabel}</div>
                            </div>
                        </div>
                        <div class="reward-footer">
                            <div class="reward-cost-field">
                                <label class="form-label" style="margin-bottom:0; font-size:12px;">Star Cost</label>
                                <input type="number" min="1" class="reward-input" id="reward-cost-${reward.id}" value="${reward.star_cost || 0}">
                            </div>
                            <div class="modal-actions">
                <button type="button" class="btn" onclick="closeAddModuleModal()" style="background:#cfd8dc; color:#1a1f36;">Cancel</button>
                <button type="submit" class="btn-save">Save Module</button>
            </div>
        </form>
    </div>
</div>

    <!-- Add Category Modal -->
    <div class="modal" id="addCategoryModal">
        <div class="modal-content">
            <div class="modal-header">
                <h2 class="modal-title">Add Category</h2>
                <button class="modal-close" onclick="closeAddCategoryModal()">×</button>
            </div>

            <form id="addCategoryForm" onsubmit="handleAddCategorySubmit(event); return false;">
                <div class="form-group">
                    <label class="form-label" for="addCategoryName">Category Name</label>
                    <input type="text" id="addCategoryName" class="form-input" placeholder="e.g. Resilience" required>
                </div>

                <div class="form-group">
                    <label class="form-label" for="addCategoryColorPicker">Category Color</label>
                    <div style="display:flex; gap:12px; align-items:center; flex-wrap:wrap;">
                        <input type="color" id="addCategoryColorPicker" value="#4c6c96" style="width:64px; height:48px; border:none; background:none;">
                        <div style="flex:1;">
                            <label class="form-label" for="addCategoryColorHex" style="font-size:13px; display:block;">Hex Value</label>
                            <input type="text" id="addCategoryColorHex" class="form-input" value="#4c6c96" placeholder="#4c6c96">
                        </div>
                    </div>
                </div>

                <div class="modal-actions">
                    <button type="button" class="btn" onclick="closeAddCategoryModal()" style="background:#cfd8dc; color:#1a1f36;">Cancel</button>
                    <button type="submit" class="btn-save">Add Category</button>
                </div>
            </form>
        </div>
    </div>
                `;
            }).join('');
        }

        window.saveRewardCost = async function(rewardId) {
            const input = document.getElementById(`reward-cost-${rewardId}`);
            if (!input) return;

            const starCost = parseInt(input.value, 10);
            if (isNaN(starCost) || starCost < 1) {
                alert('Star cost must be a positive number.');
                return;
            }

            const { error } = await supabase
                .from('rewards')
                .update({ star_cost: starCost })
                .eq('id', rewardId);

            if (error) {
                console.error('Error updating reward:', error);
                alert('Failed to update reward.');
                return;
            }

            await loadRewards();
            alert('Reward updated successfully.');
        }

        window.deleteReward = async function(rewardId) {
            const reward = rewards.find(r => String(r.id) === String(rewardId));
            if (!reward || reward.is_baseline) return;

            const confirmDelete = confirm(`Remove reward "${reward.title}"? This action cannot be undone.`);
            if (!confirmDelete) return;

            const { error } = await supabase
                .from('rewards')
                .delete()
                .eq('id', rewardId)
                .eq('is_baseline', false);

            if (error) {
                console.error('Error deleting reward:', error);
                alert('Failed to delete reward.');
                return;
            }

            await loadRewards();
            alert('Reward removed.');
        }

        window.addReward = async function() {
            const titleInput = document.getElementById('rewardTitleInput');
            const costInput = document.getElementById('rewardStarCostInput');
            const iconInput = document.getElementById('rewardIconInput');
            const categorySelect = document.getElementById('rewardCategoryInput');

            const title = titleInput.value.trim();
            const starCost = parseInt(costInput.value, 10);

            if (!title) {
                alert('Please enter a reward title.');
                return;
            }

            if (isNaN(starCost) || starCost < 1) {
                alert('Star cost must be at least 1.');
                return;
            }

            const { data: user } = await supabase.auth.getUser();
            if (!user) {
                alert('You must be logged in to add rewards.');
                return;
            }

            const { error } = await supabase
                .from('rewards')
                .insert({
                    parent_user_id: user.user.id,
                    title,
                    star_cost: starCost,
                    icon: iconInput.value.trim() || '🎁',
                    category: categorySelect.value || 'other',
                    is_baseline: false
                });

            if (error) {
                console.error('Error adding reward:', error);
                alert('Failed to add reward.');
                return;
            }

            titleInput.value = '';
            costInput.value = '';
            iconInput.value = '';
            categorySelect.value = 'other';

            await loadRewards();
            alert('Reward added successfully.');
        }

        // General Settings Management
        // Use the global generalCategories declared earlier
        let generalSeries = [];
        let generalEmotions = [];
        let generalSkills = [];

        async function loadGeneralSettings() {
            try {
                // Load Super Skills
                const { data: superSkillsData, error: superSkillsError } = await supabase
                    .from('super_skills')
                    .select('*')
                    .order('sort_order', { ascending: true });

                if (!superSkillsError && superSkillsData) {
                    window.generalSuperSkills = superSkillsData;
                    renderSuperSkills();
                    populateSubSkillParentDropdown();
                    populateSuperSkillsDropdown();
                }

                // Load Sub-Skills
                const { data: subSkillsData, error: subSkillsError } = await supabase
                    .from('sub_skills')
                    .select('*, super_skills(name, emoji)')
                    .order('sort_order', { ascending: true });

                if (!subSkillsError && subSkillsData) {
                    window.generalSubSkills = subSkillsData;
                    renderSubSkills();
                }

                // Load categories from category_colors table
                const { data: categoryData, error: categoryError } = await supabase
                    .from('category_colors')
                    .select('*')
                    .order('category', { ascending: true });

                if (!categoryError && categoryData) {
                    window.generalCategories = categoryData.map(c => ({
                        name: c.category,
                        color: c.color
                    }));
                    populateNewModuleCategoryDropdown();
                    loadCategoriesIntoPathwayDropdowns();
                }

                // Load series from series table
                const { data: seriesData, error: seriesError } = await supabase
                    .from('series')
                    .select('*')
                    .order('label', { ascending: true });

                if (!seriesError && seriesData) {
                    generalSeries = seriesData;
                }

                // Load emotions from emotions table
                const { data: emotionsData, error: emotionsError } = await supabase
                    .from('emotions')
                    .select('*')
                    .order('label', { ascending: true });

                if (!emotionsError && emotionsData) {
                    generalEmotions = emotionsData;
                }

                // Load skills from skills table
                const { data: skillsData, error: skillsError } = await supabase
                    .from('skills')
                    .select('*')
                    .order('label', { ascending: true });

                if (!skillsError && skillsData) {
                    generalSkills = skillsData;
                }

                // Load pathways from pathways table
                const { data: pathwaysData, error: pathwaysError } = await supabase
                    .from('pathways')
                    .select('*')
                    .order('name', { ascending: true });

                if (!pathwaysError && pathwaysData) {
                    generalPathways = pathwaysData;
                }

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

        // ========== SUPER SKILLS MANAGEMENT ==========
        window.generalSuperSkills = [];
        window.generalSubSkills = [];

        function renderSuperSkills() {
            const container = document.getElementById('superSkillsList');
            if (!container) return;
            
            const skills = window.generalSuperSkills || [];
            container.innerHTML = skills.map(skill => `
                <div style="background: white !important; border-radius: 8px; padding: 12px; display: flex; align-items: center; justify-content: space-between;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span style="font-size: 24px;">${skill.emoji || '🎯'}</span>
                        <div>
                            <div style="font-weight: 600;">${skill.name}</div>
                            <div style="font-size: 12px; opacity: 0.8;">${skill.character_name || 'No character'} • ${skill.slug}</div>
                        </div>
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
            
            const skills = window.generalSuperSkills || [];
            select.innerHTML = '<option value="">Select Super Skill...</option>' + 
                skills.map(skill => `<option value="${skill.id}">${skill.emoji || ''} ${skill.name}</option>`).join('');
        }

        window.addSuperSkill = async function() {
            const emoji = document.getElementById('newSuperSkillEmoji').value.trim() || '🎯';
            const name = document.getElementById('newSuperSkillName').value.trim();
            const character = document.getElementById('newSuperSkillCharacter').value.trim();
            const color = document.getElementById('newSuperSkillColor').value;

            if (!name) {
                alert('Please enter a name for the Super Skill');
                return;
            }

            const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
            const sortOrder = (window.generalSuperSkills || []).length + 1;

            try {
                const { data, error } = await supabase
                    .from('super_skills')
                    .insert({
                        name: name,
                        slug: slug,
                        emoji: emoji,
                        character_name: character,
                        theme_color: color,
                        sort_order: sortOrder,
                        is_active: true
                    })
                    .select()
                    .single();

                if (error) throw error;

                window.generalSuperSkills.push(data);
                renderSuperSkills();
                populateSubSkillParentDropdown();
                populateSuperSkillsDropdown();

                // Clear inputs
                document.getElementById('newSuperSkillEmoji').value = '';
                document.getElementById('newSuperSkillName').value = '';
                document.getElementById('newSuperSkillCharacter').value = '';
                
                alert('Super Skill added successfully!');
            } catch (error) {
                console.error('Error adding Super Skill:', error);
                alert('Error adding Super Skill: ' + error.message);
            }
        };

        window.deleteSuperSkill = async function(id) {
            if (!confirm('Are you sure you want to delete this Super Skill? This will also delete all associated sub-skills.')) return;

            try {
                const { error } = await supabase
                    .from('super_skills')
                    .delete()
                    .eq('id', id);

                if (error) throw error;

                window.generalSuperSkills = window.generalSuperSkills.filter(s => s.id !== id);
                window.generalSubSkills = window.generalSubSkills.filter(s => s.super_skill_id !== id);
                renderSuperSkills();
                renderSubSkills();
                populateSubSkillParentDropdown();
                populateSuperSkillsDropdown();
            } catch (error) {
                console.error('Error deleting Super Skill:', error);
                alert('Error deleting Super Skill: ' + error.message);
            }
        };

        function renderSubSkills() {
            const container = document.getElementById('subSkillsList');
            if (!container) return;
            
            const skills = window.generalSubSkills || [];
            container.innerHTML = skills.map(skill => {
                const parentName = skill.super_skills?.name || 'Unknown';
                const parentEmoji = skill.super_skills?.emoji || '🎯';
                return `
                    <div style="background: white !important; border-radius: 8px; padding: 10px; display: flex; align-items: center; justify-content: space-between;">
                        <div>
                            <div style="font-weight: 600; font-size: 14px;">${skill.name}</div>
                            <div style="font-size: 11px; opacity: 0.8;">${parentEmoji} ${parentName}</div>
                        </div>
                        <button onclick="deleteSubSkill('${skill.id}')" style="background: rgba(255,255,255,0.3); border: none; border-radius: 4px; width: 26px; height: 26px; cursor: pointer; color: white; font-size: 14px;">×</button>
                    </div>
                `;
            }).join('');
        }

        window.addSubSkill = async function() {
            const parentId = document.getElementById('newSubSkillParent').value;
            const name = document.getElementById('newSubSkillName').value.trim();

            if (!parentId) {
                alert('Please select a Super Skill');
                return;
            }
            if (!name) {
                alert('Please enter a name for the Sub-Skill');
                return;
            }

            const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
            const existingCount = (window.generalSubSkills || []).filter(s => s.super_skill_id === parentId).length;

            try {
                const { data, error } = await supabase
                    .from('sub_skills')
                    .insert({
                        super_skill_id: parentId,
                        name: name,
                        slug: slug,
                        sort_order: existingCount + 1,
                        is_active: true
                    })
                    .select('*, super_skills(name, emoji)')
                    .single();

                if (error) throw error;

                window.generalSubSkills.push(data);
                renderSubSkills();

                document.getElementById('newSubSkillName').value = '';
                
                alert('Sub-Skill added successfully!');
            } catch (error) {
                console.error('Error adding Sub-Skill:', error);
                alert('Error adding Sub-Skill: ' + error.message);
            }
        };

        window.deleteSubSkill = async function(id) {
            if (!confirm('Are you sure you want to delete this Sub-Skill?')) return;

            try {
                const { error } = await supabase
                    .from('sub_skills')
                    .delete()
                    .eq('id', id);

                if (error) throw error;

                window.generalSubSkills = window.generalSubSkills.filter(s => s.id !== id);
                renderSubSkills();
            } catch (error) {
                console.error('Error deleting Sub-Skill:', error);
                alert('Error deleting Sub-Skill: ' + error.message);
            }
        };

        // ========== CATEGORIES MANAGEMENT ==========
        function renderGeneralCategories() {
            const list = document.getElementById('categoriesList');
            if (!list) return;

            if (generalCategories.length === 0) {
                list.innerHTML = '<p style="color: #6b7c8f; font-size: 12px; margin: 0;">No categories</p>';
                return;
            }

            list.innerHTML = generalCategories.map((cat, index) => `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 8px; background: white; border-radius: 4px; border: 1px solid #e5e7eb; font-size: 12px;">
                    <div style="display: flex; align-items: center; gap: 6px; flex: 1; min-width: 0;">
                        <div style="width: 20px; height: 20px; background: ${cat.color}; border-radius: 3px; border: 1px solid #ddd; flex-shrink: 0;"></div>
                        <span style="color: #374151; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${cat.name}</span>
                    </div>
                    <button onclick="deleteGeneralCategory(${index})" style="padding: 2px 6px; background: #ef4444; color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 11px; flex-shrink: 0; margin-left: 4px;">✕</button>
                </div>
            `).join('');
        }

        function renderGeneralSeries() {
            const list = document.getElementById('seriesList');
            if (!list) return;

            if (generalSeries.length === 0) {
                list.innerHTML = '<p style="color: #6b7c8f; font-size: 12px; margin: 0;">No series</p>';
                return;
            }

            list.innerHTML = generalSeries.map((series) => `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 8px; background: white; border-radius: 4px; border: 1px solid #e5e7eb; font-size: 12px;">
                    <span style="color: #374151; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${series.label}</span>
                    <button onclick="deleteGeneralSeries('${series.id}')" style="padding: 2px 6px; background: #ef4444; color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 11px; flex-shrink: 0; margin-left: 4px;">✕</button>
                </div>
            `).join('');
        }

        function renderGeneralEmotions() {
            const list = document.getElementById('emotionsList');
            if (!list) return;

            if (generalEmotions.length === 0) {
                list.innerHTML = '<p style="color: #6b7c8f; font-size: 12px; margin: 0;">No emotions</p>';
                return;
            }

            list.innerHTML = generalEmotions.map((emotion) => `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 8px; background: white; border-radius: 4px; border: 1px solid #e5e7eb; font-size: 12px;">
                    <span style="color: #374151; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${emotion.label}</span>
                    <button onclick="deleteGeneralEmotion('${emotion.id}')" style="padding: 2px 6px; background: #ef4444; color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 11px; flex-shrink: 0; margin-left: 4px;">✕</button>
                </div>
            `).join('');
        }

        function renderGeneralSkills() {
            const list = document.getElementById('skillsList');
            if (!list) return;

            if (generalSkills.length === 0) {
                list.innerHTML = '<p style="color: #6b7c8f; font-size: 12px; margin: 0;">No skills</p>';
                return;
            }

            list.innerHTML = generalSkills.map((skill) => `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 8px; background: white; border-radius: 4px; border: 1px solid #e5e7eb; font-size: 12px;">
                    <span style="color: #374151; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${skill.label}</span>
                    <button onclick="deleteGeneralSkill('${skill.id}')" style="padding: 2px 6px; background: #ef4444; color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 11px; flex-shrink: 0; margin-left: 4px;">✕</button>
                </div>
            `).join('');
        }

        window.addGeneralCategory = async function() {
            const nameInput = document.getElementById('newCategoryName');
            const colorPicker = document.getElementById('newCategoryColor');
            const colorHex = document.getElementById('newCategoryColorHex');

            const name = nameInput.value.trim().toLowerCase();
            const color = colorPicker.value;

            if (!name) {
                alert('Please enter a category name');
                return;
            }

            if (generalCategories.some(c => c.name === name)) {
                alert('Category already exists');
                return;
            }

            try {
                const { error } = await supabase
                    .from('category_colors')
                    .upsert({ category: name, color }, { onConflict: 'category' });

                if (error) throw error;

                generalCategories.push({ name, color });
                nameInput.value = '';
                colorPicker.value = '#4c6c96';
                colorHex.value = '#4c6c96';
                renderGeneralCategories();
                alert('Category added successfully');
            } catch (error) {
                console.error('Error adding category:', error);
                alert('Failed to add category. Please try again.');
            }
        }

        window.deleteGeneralCategory = async function(index) {
            if (!confirm('Delete this category?')) return;

            const category = generalCategories[index];
            try {
                const { error } = await supabase
                    .from('category_colors')
                    .delete()
                    .eq('category', category.name);

                if (error) throw error;

                generalCategories.splice(index, 1);
                renderGeneralCategories();
                alert('Category deleted successfully');
            } catch (error) {
                console.error('Error deleting category:', error);
                alert('Failed to delete category. Please try again.');
            }
        }

        window.addGeneralSeries = async function() {
            const input = document.getElementById('newSeriesName');
            const value = input.value.trim();

            if (!value) {
                alert('Please enter a series name');
                return;
            }

            if (generalSeries.some(s => s.label.toLowerCase() === value.toLowerCase())) {
                alert('Series already exists');
                return;
            }

            try {
                const { error } = await supabase
                    .from('series')
                    .insert([{ label: value }]);

                if (error) throw error;

                input.value = '';
                await loadGeneralSettings();
                alert('Series added successfully');
            } catch (error) {
                console.error('Error adding series:', error);
                alert('Failed to add series. Please try again.');
            }
        }

        window.deleteGeneralSeries = async function(id) {
            if (!confirm('Delete this series?')) return;

            try {
                const { error } = await supabase
                    .from('series')
                    .delete()
                    .eq('id', id);

                if (error) throw error;

                await loadGeneralSettings();
                alert('Series deleted successfully');
            } catch (error) {
                console.error('Error deleting series:', error);
                alert('Failed to delete series. Please try again.');
            }
        }

        window.addGeneralEmotion = async function() {
            const input = document.getElementById('newEmotionName');
            const value = input.value.trim();

            if (!value) {
                alert('Please enter an emotion');
                return;
            }

            if (generalEmotions.some(e => e.label.toLowerCase() === value.toLowerCase())) {
                alert('Emotion already exists');
                return;
            }

            try {
                const id = value.toLowerCase().replace(/\s+/g, '_');
                const { error } = await supabase
                    .from('emotions')
                    .insert([{ id, label: value }]);

                if (error) throw error;

                input.value = '';
                await loadGeneralSettings();
                alert('Emotion added successfully');
            } catch (error) {
                console.error('Error adding emotion:', error);
                alert('Failed to add emotion. Please try again.');
            }
        }

        window.deleteGeneralEmotion = async function(id) {
            if (!confirm('Delete this emotion?')) return;

            try {
                const { error } = await supabase
                    .from('emotions')
                    .delete()
                    .eq('id', id);

                if (error) throw error;

                await loadGeneralSettings();
                alert('Emotion deleted successfully');
            } catch (error) {
                console.error('Error deleting emotion:', error);
                alert('Failed to delete emotion. Please try again.');
            }
        }

        window.addGeneralSkill = async function() {
            const input = document.getElementById('newSkillName');
            const value = input.value.trim();

            if (!value) {
                alert('Please enter a skill');
                return;
            }

            if (generalSkills.some(s => s.label.toLowerCase() === value.toLowerCase())) {
                alert('Skill already exists');
                return;
            }

            try {
                const id = value.toLowerCase().replace(/\s+/g, '_');
                const { error } = await supabase
                    .from('skills')
                    .insert([{ id, label: value }]);

                if (error) throw error;

                input.value = '';
                await loadGeneralSettings();
                alert('Skill added successfully');
            } catch (error) {
                console.error('Error adding skill:', error);
                alert('Failed to add skill. Please try again.');
            }
        }

        window.deleteGeneralSkill = async function(id) {
            if (!confirm('Delete this skill?')) return;

            try {
                const { error } = await supabase
                    .from('skills')
                    .delete()
                    .eq('id', id);

                if (error) throw error;

                await loadGeneralSettings();
                alert('Skill deleted successfully');
            } catch (error) {
                console.error('Error deleting skill:', error);
                alert('Failed to delete skill. Please try again.');
            }
        }

        // Pathway management functions
        let generalPathways = [];

        window.addGeneralPathway = async function() {
            const nameInput = document.getElementById('newPathwayName');
            const categoryInput = document.getElementById('newPathwayCategory');
            const name = nameInput.value.trim();
            const category = categoryInput.value;

            if (!name) {
                alert('Please enter a pathway name');
                return;
            }

            if (!category) {
                alert('Please select a category');
                return;
            }

            if (generalPathways.some(p => p.name.toLowerCase() === name.toLowerCase())) {
                alert('Pathway already exists');
                return;
            }

            try {
                const { error } = await supabase
                    .from('pathways')
                    .insert([{ name: name, category: category }]);

                if (error) throw error;

                nameInput.value = '';
                categoryInput.value = '';
                await loadGeneralSettings();
                loadPathwaysIntoDropdowns();
                alert('Pathway added successfully');
            } catch (error) {
                console.error('Error adding pathway:', error);
                alert('Failed to add pathway. Please try again.');
            }
        }

        window.deleteGeneralPathway = async function(id) {
            if (!confirm('Delete this pathway?')) return;

            try {
                const { error } = await supabase
                    .from('pathways')
                    .delete()
                    .eq('id', id);

                if (error) throw error;

                await loadGeneralSettings();
                loadPathwaysIntoDropdowns();
                alert('Pathway deleted successfully');
            } catch (error) {
                console.error('Error deleting pathway:', error);
                alert('Failed to delete pathway. Please try again.');
            }
        }

        function renderGeneralPathways() {
            const container = document.getElementById('pathwaysList');
            if (!container) return;

            if (generalPathways.length === 0) {
                container.innerHTML = '<div style="color: #6b7c8f; font-size: 12px; text-align: center; padding: 20px;">No pathways yet</div>';
                return;
            }

            container.innerHTML = generalPathways.map((pathway, index) => `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 10px; background: white; border-radius: 6px; border: 1px solid #e5e7eb;">
                    <div style="flex: 1;">
                        <div style="font-size: 12px; color: #374151; font-weight: 500;">${pathway.name}</div>
                        <div style="font-size: 11px; color: #6b7c8f; margin-top: 2px;">Category: ${pathway.category || 'None'}</div>
                    </div>
                    <button onclick="deleteGeneralPathway('${pathway.id}')" style="background: #ef4444; color: white; border: none; border-radius: 4px; padding: 2px 6px; font-size: 11px; cursor: pointer;">×</button>
                </div>
            `).join('');
        }

        window.loadPathwaysIntoDropdowns = function() {
            // Load pathways into add module dropdown
            const newModulePathway = document.getElementById('newModulePathway');
            if (newModulePathway) {
                const currentValue = newModulePathway.value;
                newModulePathway.innerHTML = '<option value="">Select pathway...</option>';
                generalPathways.forEach(pathway => {
                    const option = document.createElement('option');
                    option.value = pathway.id;
                    option.textContent = pathway.name;
                    if (pathway.id === currentValue) option.selected = true;
                    newModulePathway.appendChild(option);
                });
            }

            // Load pathways into edit module dropdown
            const editPathway = document.getElementById('editPathway');
            if (editPathway) {
                const currentValue = editPathway.value;
                editPathway.innerHTML = '<option value="">Select pathway...</option>';
                generalPathways.forEach(pathway => {
                    const option = document.createElement('option');
                    option.value = pathway.id;
                    option.textContent = pathway.name;
                    if (pathway.id === currentValue) option.selected = true;
                    editPathway.appendChild(option);
                });
            }
        }

        // Parent Toolkit Management
        let toolkitSettings = { weeklyCheckinEnabled: true };
        let challenges = [];
        let goals = [];

        async function loadToolkitSettings() {
            try {
                // Load settings from database
                const settings = await getSettings();
                toolkitSettings = settings;
                
                // Update toggle
                const toggle = document.getElementById('weeklyCheckinToggle');
                if (toggle) {
                    toggle.checked = settings.weekly_checkin_enabled !== false;
                    updateCheckinStatus(toggle.checked);
                }

                // Load challenges, goals, tools, and scripts from settings
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

        window.toggleWeeklyCheckin = async function(enabled) {
            try {
                await updateSettings({ weekly_checkin_enabled: enabled });
                toolkitSettings.weekly_checkin_enabled = enabled;
                updateCheckinStatus(enabled);
                alert(enabled ? 'Weekly Check-In enabled' : 'Weekly Check-In disabled. Parents will no longer see this feature.');
            } catch (error) {
                console.error('Error updating weekly check-in setting:', error);
                alert('Failed to update setting. Please try again.');
            }
        }

        function updateCheckinStatus(enabled) {
            const statusEl = document.getElementById('weeklyCheckinStatus');
            if (statusEl) {
                if (enabled) {
                    statusEl.style.background = '#e8f5e9';
                    statusEl.style.color = '#2e7d32';
                    statusEl.textContent = '✓ Enabled';
                } else {
                    statusEl.style.background = '#ffebee';
                    statusEl.style.color = '#c62828';
                    statusEl.textContent = '✕ Disabled';
                }
            }
        }

        // Challenges are now loaded from database in loadToolkitSettings

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
            if (!value) {
                alert('Please enter a challenge name');
                return;
            }
            try {
                challenges.push(value);
                await updateSettings({ challenges });
                input.value = '';
                renderChallenges();
            } catch (error) {
                console.error('Error adding challenge:', error);
                alert('Failed to add challenge. Please try again.');
                challenges.pop(); // Revert
            }
        }

        window.deleteChallenge = async function(index) {
            if (confirm('Delete this challenge option?')) {
                const removed = challenges.splice(index, 1);
                try {
                    await updateSettings({ challenges });
                    renderChallenges();
                } catch (error) {
                    console.error('Error deleting challenge:', error);
                    alert('Failed to delete challenge. Please try again.');
                    challenges.splice(index, 0, ...removed); // Revert
                }
            }
        }

        // Goals are now loaded from database in loadToolkitSettings

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
            if (!value) {
                alert('Please enter a goal');
                return;
            }
            try {
                goals.push(value);
                await updateSettings({ goals });
                input.value = '';
                renderGoals();
            } catch (error) {
                console.error('Error adding goal:', error);
                alert('Failed to add goal. Please try again.');
                goals.pop(); // Revert
            }
        }

        window.deleteGoal = async function(index) {
            if (confirm('Delete this goal option?')) {
                const removed = goals.splice(index, 1);
                try {
                    await updateSettings({ goals });
                    renderGoals();
                } catch (error) {
                    console.error('Error deleting goal:', error);
                    alert('Failed to delete goal. Please try again.');
                    goals.splice(index, 0, ...removed); // Revert
                }
            }
        }

        // Tools Management
        let tools = [];

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
            const labelInput = document.getElementById('newToolLabel');
            const descInput = document.getElementById('newToolDescription');
            const triggersInput = document.getElementById('newToolTriggers');
            
            const label = labelInput.value.trim();
            const description = descInput.value.trim();
            const triggersStr = triggersInput.value.trim();
            
            if (!label || !description || !triggersStr) {
                alert('Please fill in all fields');
                return;
            }
            
            const triggers = triggersStr.split(',').map(t => t.trim()).filter(t => t);
            
            try {
                tools.push({ label, description, triggers });
                await updateSettings({ tools });
                labelInput.value = '';
                descInput.value = '';
                triggersInput.value = '';
                renderTools();
            } catch (error) {
                console.error('Error adding tool:', error);
                alert('Failed to add tool. Please try again.');
                tools.pop();
            }
        }

        window.deleteTool = async function(index) {
            if (confirm('Delete this tool?')) {
                const removed = tools.splice(index, 1);
                try {
                    await updateSettings({ tools });
                    renderTools();
                } catch (error) {
                    console.error('Error deleting tool:', error);
                    alert('Failed to delete tool. Please try again.');
                    tools.splice(index, 0, ...removed);
                }
            }
        }

        // Scripts Management
        let scripts = [];

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
            const titleInput = document.getElementById('newScriptTitle');
            const contentInput = document.getElementById('newScriptContent');
            const contextInput = document.getElementById('newScriptContext');
            
            const title = titleInput.value.trim();
            const script = contentInput.value.trim();
            const context = contextInput.value.trim();
            
            if (!title || !script || !context) {
                alert('Please fill in all fields');
                return;
            }
            
            try {
                scripts.push({ title, script, context });
                await updateSettings({ scripts });
                titleInput.value = '';
                contentInput.value = '';
                contextInput.value = '';
                renderScripts();
            } catch (error) {
                console.error('Error adding script:', error);
                alert('Failed to add script. Please try again.');
                scripts.pop();
            }
        }

        window.deleteScript = async function(index) {
            if (confirm('Delete this script?')) {
                const removed = scripts.splice(index, 1);
                try {
                    await updateSettings({ scripts });
                    renderScripts();
                } catch (error) {
                    console.error('Error deleting script:', error);
                    alert('Failed to delete script. Please try again.');
                    scripts.splice(index, 0, ...removed);
                }
            }
        }

        // State for customisation filters
        let customisationFilter = 'all';
        let customisationCategoryFilter = 'all';
        let customisationSeriesFilter = 'all';
        let customisationSearchTerm = '';

        // Set customisation filter
        window.setCustomisationFilter = function(filter) {
            customisationFilter = filter;
            
            // Update button states
            document.querySelectorAll('#moduleCustomisationTab .filter-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            (evt && evt.target ? evt.target : (typeof window !== 'undefined' ? window.event?.target : null))?.classList?.add('active');
            
            renderAllModulesList();
        }

        // Filter customisation modules
        window.filterCustomisationModules = function() {
            customisationSearchTerm = document.getElementById('customisationModuleSearch').value.toLowerCase();
            customisationCategoryFilter = document.getElementById('customisationCategoryFilter').value;
            customisationSeriesFilter = document.getElementById('customisationSeriesFilter').value;
            renderAllModulesList();
        }

        // Populate customisation filters
        function populateCustomisationFilters() {
            populateCategoryDropdowns();
            
            // Populate series filter
            const seriesFilter = document.getElementById('customisationSeriesFilter');
            const series = [...new Set(allModules.map(m => m.series).filter(Boolean))].sort();
            if (seriesFilter) {
                seriesFilter.innerHTML = '<option value="all">All Series</option>' +
                    series.map(s => `<option value="${s}">${s}</option>`).join('');
            }
        }

        // Render all modules list for customisation
        function renderAllModulesList() {
            const container = document.getElementById('allModulesList');
            if (!container) return;
            
            if (allModules.length === 0) {
                container.innerHTML = '<div class="empty-state"><p>No modules found</p></div>';
                return;
            }

            // Sort by created_at (newest first)
            let filteredModules = [...allModules].sort((a, b) => {
                if (a.created_at && b.created_at) {
                    return new Date(b.created_at) - new Date(a.created_at);
                }
                return 0;
            });

            // Apply filters
            if (customisationSearchTerm) {
                filteredModules = filteredModules.filter(m => 
                    m.title.toLowerCase().includes(customisationSearchTerm)
                );
            }
            
            if (customisationCategoryFilter !== 'all') {
                filteredModules = filteredModules.filter(m => m.category === customisationCategoryFilter);
            }
            
            if (customisationSeriesFilter !== 'all') {
                filteredModules = filteredModules.filter(m => m.series === customisationSeriesFilter);
            }
            
            if (customisationFilter === 'active') {
                filteredModules = filteredModules.filter(m => m.is_active);
            } else if (customisationFilter === 'inactive') {
                filteredModules = filteredModules.filter(m => !m.is_active);
            }
            
            if (filteredModules.length === 0) {
                container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🔍</div><p>No modules match your filters</p></div>';
                return;
            }

            // Render modules
            container.innerHTML = filteredModules.map(module => {
                const borderColor = categoryColors[module.category] || '#4c6c96';
                const statusBadge = module.is_active 
                    ? '<span class="status-badge active">Active</span>'
                    : '<span class="status-badge inactive">Inactive</span>';
                const moduleIdKey = getModuleKey(module.id);
                const isSelectedForEdit = selectedModule && selectedModule.id === module.id;
                const isBulkSelected = customisationSelectedModules.has(moduleIdKey);
                
                return `
                    <div class="module-item ${isSelectedForEdit ? 'selected' : ''} ${isBulkSelected ? 'bulk-selected' : ''}" 
                         id="customisation-module-${moduleIdKey}"
                         style="border-left-color: ${borderColor}"
                         onclick="selectModuleForEdit('${moduleIdKey}')">
                        <div class="module-header">
                            <input type="checkbox" 
                                   class="module-checkbox customisation-checkbox" 
                                   data-module-id="${moduleIdKey}"
                                   ${isBulkSelected ? 'checked' : ''}
                                   onclick="event.stopPropagation();">
                            <div class="module-title">📖 ${module.title}</div>
                            ${statusBadge}
                        </div>
                        <div class="module-meta">
                            ${module.series ? `<strong>Series:</strong> ${module.series}` : '<strong>Series:</strong> Not set'}
                            ${module.category ? ` • <strong>Category:</strong> ${module.category}` : ''}
                            ${module.age_range ? ` • <strong>Age:</strong> ${getAgeRangeLabel(module.age_range)}` : ''}
                        </div>
                    </div>
                `;
            }).join('');

            container.querySelectorAll('.customisation-checkbox').forEach(checkbox => {
                checkbox.addEventListener('change', function(event) {
                    event.stopPropagation();
                    const moduleId = this.getAttribute('data-module-id');
                    toggleCustomisationSelection(moduleId);
                });
            });

            updateCustomisationBulkActions();
        }

        function toggleCustomisationSelection(moduleId) {
            if (!moduleId) return;

            if (customisationSelectedModules.has(moduleId)) {
                customisationSelectedModules.delete(moduleId);
            } else {
                customisationSelectedModules.add(moduleId);
            }

            const moduleElement = document.getElementById(`customisation-module-${moduleId}`);
            if (moduleElement) {
                moduleElement.classList.toggle('bulk-selected');
                const checkbox = moduleElement.querySelector('.customisation-checkbox');
                if (checkbox) {
                    checkbox.checked = customisationSelectedModules.has(moduleId);
                }
            }

            updateCustomisationBulkActions();
        }

        function updateCustomisationBulkActions() {
            const bulkActions = document.getElementById('customisationBulkActions');
            const selectedCount = document.getElementById('customisationSelectedCount');
            const deleteBtn = document.getElementById('customisationBulkDeleteBtn');
            const activateBtn = document.getElementById('customisationBulkActivateBtn');
            const deactivateBtn = document.getElementById('customisationBulkDeactivateBtn');

            const count = customisationSelectedModules.size;
            if (selectedCount) {
                selectedCount.textContent = count;
            }

            if (count > 0) {
                bulkActions.style.display = 'flex';
            } else {
                bulkActions.style.display = 'none';
            }

            if (deleteBtn) {
                deleteBtn.disabled = count === 0 || isBulkDeletingModules;
                deleteBtn.innerHTML = isBulkDeletingModules
                    ? '<span class="loading-spinner"></span>Deleting...'
                    : '🗑️ Delete Selected';
            }
            
            if (activateBtn) {
                activateBtn.disabled = count === 0 || isBulkDeletingModules;
            }
            
            if (deactivateBtn) {
                deactivateBtn.disabled = count === 0 || isBulkDeletingModules;
            }
        }

        window.clearCustomisationSelection = function() {
            customisationSelectedModules.clear();
            renderAllModulesList();
        }

        window.bulkDeleteModules = async function() {
            if (customisationSelectedModules.size === 0 || isBulkDeletingModules) {
                return;
            }

            const confirmDelete = confirm(
                `⚠️ Delete ${customisationSelectedModules.size} selected module(s)?\n\n` +
                'This will remove the modules, their child/parent assignments, and stored HTML. This action cannot be undone.'
            );

            if (!confirmDelete) {
                return;
            }

            isBulkDeletingModules = true;
            updateCustomisationBulkActions();

            const moduleIds = Array.from(customisationSelectedModules);
            let deletedCount = 0;

            for (const moduleId of moduleIds) {
                const module = allModules.find(m => getModuleKey(m.id) === moduleId);
                if (!module) continue;

                try {
                    const { data: childAssignments } = await supabase
                        .from('child_modules')
                        .select('id')
                        .eq('module_id', module.id);

                    if (childAssignments && childAssignments.length > 0) {
                        for (const assignment of childAssignments) {
                            await supabase
                                .from('child_modules')
                                .delete()
                                .eq('id', assignment.id);
                        }
                    }

                    const { data: parentAssignments } = await supabase
                        .from('parent_modules')
                        .select('id')
                        .eq('module_id', module.id);

                    if (parentAssignments && parentAssignments.length > 0) {
                        for (const assignment of parentAssignments) {
                            await supabase
                                .from('parent_modules')
                                .delete()
                                .eq('id', assignment.id);
                        }
                    }

                    if (module.storage_path) {
                        await supabase.storage
                            .from('modules')
                            .remove([module.storage_path]);
                    }

                    // First delete references from modules_to_generate
                    const { error: refError } = await supabase
                        .from('modules_to_generate')
                        .delete()
                        .eq('generated_module_id', module.id);

                    if (refError) {
                        console.error('[Admin] Failed to delete module references:', refError);
                        continue;
                    }

                    // Now delete the module
                    const { error: moduleError } = await supabase
                        .from('modules')
                        .delete()
                        .eq('id', module.id);

                    if (moduleError) {
                        console.error('[Admin] Failed to delete module:', moduleError);
                        continue;
                    }

                    deletedCount++;
                    customisationSelectedModules.delete(moduleId);
                    allModules = allModules.filter(m => m.id !== module.id);

                    if (selectedModule && selectedModule.id === module.id) {
                        selectedModule = null;
                        document.getElementById('moduleEditForm').style.display = 'none';
                        document.getElementById('moduleEditPlaceholder').style.display = 'block';
                    }
                } catch (error) {
                    console.error('[Admin] Bulk delete error:', error);
                    alert(`Failed to delete module "${module.title}": ${error.message}`);
                }
            }

            isBulkDeletingModules = false;
            customisationSelectedModules.clear();
            updateStats();
            await loadAllModules();
            updateCustomisationBulkActions();

            alert(`✓ Deleted ${deletedCount} module(s).`);
        }

        // Bulk activate modules
        window.bulkActivateModules = async function() {
            if (customisationSelectedModules.size === 0 || isBulkDeletingModules) {
                return;
            }

            const confirmActivate = confirm(
                `✓ Activate ${customisationSelectedModules.size} selected module(s)?\n\n` +
                'This will make the modules available for use by parents and children.'
            );

            if (!confirmActivate) return;

            const btn = document.getElementById('customisationBulkActivateBtn');
            const originalText = btn.innerHTML;
            isBulkDeletingModules = true;
            updateCustomisationBulkActions();

            const moduleIds = Array.from(customisationSelectedModules);
            let activatedCount = 0;

            for (const moduleId of moduleIds) {
                try {
                    const module = allModules.find(m => m.id === moduleId);
                    if (!module) continue;

                    // Update module active status
                    const { error: updateError } = await supabase
                        .from('modules')
                        .update({ is_active: true })
                        .eq('id', moduleId);

                    if (updateError) {
                        console.error('Error activating module:', updateError);
                        continue;
                    }

                    // Update local data
                    module.is_active = true;
                    activatedCount++;

                } catch (error) {
                    console.error('[Admin] Bulk activate error:', error);
                }
            }

            isBulkDeletingModules = false;
            customisationSelectedModules.clear();
            updateStats();
            renderAllModulesList();
            updateCustomisationBulkActions();

            alert(`✓ Activated ${activatedCount} module(s).`);
        };

        // Bulk deactivate modules
        window.bulkDeactivateModules = async function() {
            if (customisationSelectedModules.size === 0 || isBulkDeletingModules) {
                return;
            }

            const confirmDeactivate = confirm(
                `✗ Deactivate ${customisationSelectedModules.size} selected module(s)?\n\n` +
                'This will remove the modules from use by parents and children.'
            );

            if (!confirmDeactivate) return;

            const btn = document.getElementById('customisationBulkDeactivateBtn');
            const originalText = btn.innerHTML;
            isBulkDeletingModules = true;
            updateCustomisationBulkActions();

            const moduleIds = Array.from(customisationSelectedModules);
            let deactivatedCount = 0;

            for (const moduleId of moduleIds) {
                try {
                    const module = allModules.find(m => m.id === moduleId);
                    if (!module) continue;

                    // Update module active status
                    const { error: updateError } = await supabase
                        .from('modules')
                        .update({ is_active: false })
                        .eq('id', moduleId);

                    if (updateError) {
                        console.error('Error deactivating module:', updateError);
                        continue;
                    }

                    // Update local data
                    module.is_active = false;
                    deactivatedCount++;

                } catch (error) {
                    console.error('[Admin] Bulk deactivate error:', error);
                }
            }

            isBulkDeletingModules = false;
            customisationSelectedModules.clear();
            updateStats();
            renderAllModulesList();
            updateCustomisationBulkActions();

            alert(`✓ Deactivated ${deactivatedCount} module(s).`);
        };

        // Select module for editing
        window.selectModuleForEdit = function(moduleId) {
            console.log('selectModuleForEdit called with moduleId:', moduleId);
            console.log('Available modules:', allModules.map(m => ({ id: m.id, title: m.title })));
            
            selectedModule = allModules.find(m => m.id === moduleId);
            console.log('Found selectedModule:', selectedModule);
            
            if (!selectedModule) {
                console.error('Module not found with ID:', moduleId);
                return;
            }

            // Update UI
            renderAllModulesList();
            document.getElementById('editModuleTitle').textContent = `Edit: ${selectedModule.title}`;
            document.getElementById('moduleEditForm').style.display = 'block';
            document.getElementById('moduleEditPlaceholder').style.display = 'none';
            
            console.log('Updated UI - form should be visible now');

            // Populate form
            document.getElementById('editTitle').value = selectedModule.title || '';
            const editAgeRangeSelect = document.getElementById('editAgeRange');
            if (editAgeRangeSelect) {
                const ageValue = selectedModule.age_range || '';
                editAgeRangeSelect.value = ageValue;
                if (ageValue && !Array.from(editAgeRangeSelect.options).some(option => option.value === ageValue)) {
                    const option = document.createElement('option');
                    option.value = ageValue;
                    option.textContent = getAgeRangeLabel(ageValue) || ageValue;
                    editAgeRangeSelect.appendChild(option);
                    editAgeRangeSelect.value = ageValue;
                }
            }
            document.getElementById('editOrder').value = selectedModule.week_number || '';
            document.getElementById('editXPReward').value = selectedModule.xp_reward ?? 100;
            document.getElementById('editStarsReward').value = selectedModule.stars_reward ?? 10;
            document.getElementById('editCharacter').value = selectedModule.character_name || '';
            document.getElementById('editBrainTownAnalogy').value = selectedModule.brain_town_analogy || '';
            document.getElementById('editContentBrief').value = selectedModule.additional_context || selectedModule.content_brief || '';

            const editSuperSkill = document.getElementById('editSuperSkill');
            if (editSuperSkill) {
                editSuperSkill.value = selectedModule.super_skill_id || '';
                onEditSuperSkillChange();
            }

            const editSubSkill = document.getElementById('editSubSkill');
            if (editSubSkill) {
                editSubSkill.value = selectedModule.sub_skill_id || '';
            }

            const editCycle = document.getElementById('editCycle');
            if (editCycle) {
                editCycle.value = selectedModule.cycle_id || '';
            }

            const editCoreTheory = document.getElementById('editCoreTheorySelect');
            if (editCoreTheory && selectedModule.core_theory_id) {
                editCoreTheory.value = selectedModule.core_theory_id;
                updateTheoryPreview({
                    selectId: 'editCoreTheorySelect',
                    previewId: 'editTheoryPreview',
                    nameId: 'editTheoryPreviewName',
                    descriptionId: 'editTheoryPreviewDescription'
                });
            }
        }

        // Update category color display
        function updateCategoryColorDisplay() {
            const categorySelect = document.getElementById('editCategory');
            if (!categorySelect) return;
            const category = categorySelect.value;
            const categoryColor = categoryColors[category] || '#4c6c96';

            const colorPicker = document.getElementById('editCategoryColor');
            const preview = document.getElementById('categoryColorPreview');
            const label = document.getElementById('categoryColorLabel');
            if (colorPicker) colorPicker.value = categoryColor;
            if (preview) preview.textContent = categoryColor;
            if (label) label.textContent = category || 'selected';
        }

        // Populate category dropdown for editing
        function populateEditCategoryDropdown() {
            const categorySelect = document.getElementById('editCategory');
            if (!categorySelect) return;
            availableCategories = Array.from(new Set(
                allModules.map(m => m.category).filter(Boolean)
            )).sort();

            categorySelect.innerHTML = '<option value="">Select category...</option>';
            availableCategories.forEach(category => {
                const option = document.createElement('option');
                option.value = category;
                option.textContent = category.charAt(0).toUpperCase() + category.slice(1);
                categorySelect.appendChild(option);
            });
        }

        function normalizeHexColor(value) {
            if (!value) return null;
            let color = value.trim();
            if (!color.startsWith('#')) {
                color = `#${color}`;
            }
            if (/^#([0-9a-fA-F]{6})$/.test(color)) {
                return color.toLowerCase();
            }
            return null;
        }

        window.openAddCategoryModal = function() {

            const modal = document.getElementById('addCategoryModal');
            const form = document.getElementById('addCategoryForm');

            if (modal) {
                if (form) form.reset();
                document.getElementById('addCategoryColorPicker').value = '#4c6c96';
                document.getElementById('addCategoryColorHex').value = '#4c6c96';
                modal.classList.add('active');

            } else {
                console.error('[Admin] Modal element not found');
            }
        }

        window.closeAddCategoryModal = function() {
            const modal = document.getElementById('addCategoryModal');
            modal?.classList.remove('active');
        }

        function syncCategoryColorInputs(source) {
            const colorPicker = document.getElementById('addCategoryColorPicker');
            const colorHex = document.getElementById('addCategoryColorHex');
            if (source === 'picker') {
                colorHex.value = colorPicker.value;
            } else {
                const normalized = normalizeHexColor(colorHex.value);
                if (normalized) {
                    colorHex.value = normalized;
                    colorPicker.value = normalized;
                }
            }
        }

        document.getElementById('addCategoryColorPicker')?.addEventListener('input', () => syncCategoryColorInputs('picker'));
        document.getElementById('addCategoryColorHex')?.addEventListener('blur', () => syncCategoryColorInputs('hex'));

        window.handleAddCategorySubmit = async function(event) {
            event.preventDefault();
            const nameInput = document.getElementById('addCategoryName');
            const colorInput = document.getElementById('addCategoryColorHex');
            const categoryName = nameInput.value.trim();
            const categoryLower = categoryName.toLowerCase();
            if (!categoryName) {
                alert('Please enter a category name.');
                return;
            }
            if (availableCategories.includes(categoryLower)) {
                alert('Category already exists!');
                return;
            }
            const normalizedColor = normalizeHexColor(colorInput.value);
            if (!normalizedColor) {
                alert('Please enter a valid 6-digit hex color (e.g. #4c6c96).');
                return;
            }

            const { error } = await supabase
                .from('category_colors')
                .upsert({ category: categoryLower, color: normalizedColor }, { onConflict: 'category' });

            if (error) {
                console.error('[Admin] Failed to save category color:', error);
                alert('Failed to add category. Please try again.');
                return;
            }

            categoryColors[categoryLower] = normalizedColor;
            availableCategories.push(categoryLower);
            populateEditCategoryDropdown();
            const editCategory = document.getElementById('editCategory');
            if (editCategory) {
                editCategory.value = categoryLower;
                updateCategoryColorDisplay();
            }

            // Update add-module dropdown options too
            const newModuleCategory = document.getElementById('newModuleCategory');
            if (newModuleCategory) {
                const option = document.createElement('option');
                option.value = categoryLower;
                option.textContent = categoryName.charAt(0).toUpperCase() + categoryName.slice(1);
                newModuleCategory.appendChild(option);
            }

            closeAddCategoryModal();
        }

        // Save module changes
        window.saveModuleChanges = async function() {
            if (!selectedModule) return;

            const superSkillId = document.getElementById('editSuperSkill')?.value || null;
            const subSkillId = document.getElementById('editSubSkill')?.value || null;
            const cycleId = document.getElementById('editCycle')?.value || null;
            const selectedSkill = superSkillsData.find(skill => skill.id === superSkillId);

            const updates = {
                title: document.getElementById('editTitle').value,
                age_range: document.getElementById('editAgeRange').value || null,
                week_number: document.getElementById('editOrder').value ? parseInt(document.getElementById('editOrder').value) : null,
                xp_reward: document.getElementById('editXPReward').value ? parseInt(document.getElementById('editXPReward').value) : null,
                stars_reward: document.getElementById('editStarsReward').value ? parseInt(document.getElementById('editStarsReward').value) : null,
                character_name: document.getElementById('editCharacter').value || null,
                super_skill_id: superSkillId,
                sub_skill_id: subSkillId,
                cycle_id: cycleId,
                category: selectedSkill?.slug || selectedModule.category || null,
                series: selectedSkill?.character_name || selectedModule.series || null
            };

            if ('core_theory_id' in selectedModule) {
                updates.core_theory_id = document.getElementById('editCoreTheorySelect')?.value || null;
            }

            if ('brain_town_analogy' in selectedModule) {
                updates.brain_town_analogy = document.getElementById('editBrainTownAnalogy')?.value || null;
            }

            if ('additional_context' in selectedModule) {
                updates.additional_context = document.getElementById('editContentBrief')?.value || null;
            }

            if ('content_brief' in selectedModule) {
                updates.content_brief = document.getElementById('editContentBrief')?.value || null;
            }

            // Update module
            const { error: moduleError } = await supabase
                .from('modules')
                .update(updates)
                .eq('id', selectedModule.id);

            if (moduleError) {
                console.error('Error updating module:', moduleError);
                alert('Failed to save module changes');
                return;
            }

            // Update local data
            Object.assign(selectedModule, updates);
            
            const skillsSearchInput = document.getElementById('skillsSearchInput');
            const emotionsSelect = document.getElementById('newModuleEmotions');
            const skillsSelect = document.getElementById('newModuleSkills');
            
            if (emotionsSearchInput && emotionsSelect) {
                emotionsSearchInput.addEventListener('input', function() {
                    filterSelectOptions(emotionsSelect, this.value);
                });
            }
            
            if (skillsSearchInput && skillsSelect) {
                skillsSearchInput.addEventListener('input', function() {
                    filterSelectOptions(skillsSelect, this.value);
                });
            }
        }
        
        // Filter select options based on search query
        function filterSelectOptions(selectElement, searchQuery) {
            const query = searchQuery.toLowerCase().trim();
            const options = Array.from(selectElement.options);
            
            options.forEach(option => {
                const text = option.textContent.toLowerCase();
                if (text.includes(query)) {
                    option.style.display = '';
                } else {
                    option.style.display = 'none';
                }
            });
        }

        // ========== THEORIES MANAGEMENT ==========
        function buildTheoryCode(name) {
            const base = name
                .trim()
                .toUpperCase()
                .replace(/[^A-Z0-9]+/g, '_')
                .replace(/^_+|_+$/g, '') || 'THEORY';
            let code = base;
            let counter = 1;
            const existingCodes = new Set((theoriesData || []).map(t => t.theory_code));
            while (existingCodes.has(code)) {
                counter += 1;
                code = `${base}_${counter}`;
            }
            return code;
        }

        async function loadTheories() {
            const { data, error } = await supabase
                .from('core_theories')
                .select('*')
                .order('theory_name');

            if (error) {
                console.error('[Admin] Error loading theories:', error);
                return;
            }

            theoriesData = data || [];
            const select = document.getElementById('theorySelect');
            if (select) {
                select.innerHTML = '<option value="">Select a theory...</option>';
                theoriesData.forEach(theory => {
                    const option = document.createElement('option');
                    option.value = theory.id;
                    option.textContent = theory.theory_name;
                    select.appendChild(option);
                });
                if (selectedTheoryId) {
                    select.value = selectedTheoryId;
                }
            }

            if (selectedTheoryId) {
                selectTheory(selectedTheoryId);
            }
        }

        window.selectTheory = function(theoryId) {
            selectedTheoryId = theoryId;
            const theory = theoriesData.find(t => t.id === theoryId);
            const editor = document.getElementById('theoryEditor');
            const placeholder = document.getElementById('theoryEditorPlaceholder');

            if (!theory) {
                if (editor) editor.style.display = 'none';
                if (placeholder) placeholder.style.display = 'block';
                return;
            }

            if (editor) editor.style.display = 'block';
            if (placeholder) placeholder.style.display = 'none';

            // Simplified fields - only description and primary_researchers (key theorists) sent to AI
            // Simplified fields - only description and primary_researchers (key theorists) sent to AI
            document.getElementById('theoryName').value = theory.theory_name || '';
            document.getElementById('theoryIsActive').checked = theory.is_active !== false;
            document.getElementById('theoryDescription').value = theory.description || '';
            document.getElementById('theoryPrimaryResearchers').value = theory.primary_researchers || '';
        }

        window.addNewTheory = function() {
            // Open the modal instead of using prompt
            document.getElementById('addTheoryModal').classList.add('active');
            document.getElementById('newTheoryName').value = '';
            document.getElementById('newTheoryDescription').value = '';
            document.getElementById('newTheoryPrimaryResearchers').value = '';
            document.getElementById('newTheoryName').focus();
        }

        window.closeAddTheoryModal = function() {
            document.getElementById('addTheoryModal').classList.remove('active');
        }

        window.saveNewTheory = async function(event) {
            event.preventDefault();
            
            const name = document.getElementById('newTheoryName').value.trim();
            if (!name) {
                alert('Theory name is required.');
                return;
            }

            const theoryCode = buildTheoryCode(name);
            const { data, error } = await supabase
                .from('core_theories')
                .insert({
                    theory_name: name,
                    theory_code: theoryCode,
                    description: document.getElementById('newTheoryDescription').value.trim() || '',
                    primary_researchers: document.getElementById('newTheoryPrimaryResearchers').value.trim() || null,
                    is_active: true
                })
                .select()
                .single();

            if (error) {
                console.error('[Admin] Error adding theory:', error);
                alert('Failed to add theory. Please try again.');
                return;
            }

            closeAddTheoryModal();
            closeAddTheoryModal();
            selectedTheoryId = data?.id || null;
            await loadTheories();
            if (selectedTheoryId) {
                selectTheory(selectedTheoryId);
            }
            alert('✅ Theory added successfully!');
            alert('✅ Theory added successfully!');
        }

        window.saveTheoryChanges = async function() {
            if (!selectedTheoryId) return;

            // Simplified updates - only description and primary_researchers (key theorists) sent to AI
            // Simplified updates - only description and primary_researchers (key theorists) sent to AI
            const updates = {
                theory_name: document.getElementById('theoryName').value.trim(),
                is_active: document.getElementById('theoryIsActive').checked,
                description: document.getElementById('theoryDescription').value.trim(),
                primary_researchers: document.getElementById('theoryPrimaryResearchers').value.trim() || null
            };

            if (!updates.theory_name) {
                alert('Theory name is required.');
                return;
            }

            const { error } = await supabase
                .from('core_theories')
                .update(updates)
                .eq('id', selectedTheoryId);

            if (error) {
                console.error('[Admin] Error saving theory:', error);
                alert('Failed to save theory changes.');
                return;
            }

            alert('✅ Theory saved successfully!');
        }

        
        window.selectAgeRange = function(ageRangeId) {
            selectedAgeRangeId = ageRangeId;
            const ageRange = ageRangesTheoriesData.find(ar => ar.id === ageRangeId);
            const editor = document.getElementById('ageRangeEditor');
            const placeholder = document.getElementById('ageRangeEditorPlaceholder');

            if (!ageRange) {
                if (editor) editor.style.display = 'none';
                if (placeholder) placeholder.style.display = 'block';
                return;
            }

            if (editor) editor.style.display = 'block';
            if (placeholder) placeholder.style.display = 'none';

            document.getElementById('ageRangeDisplayName').value = ageRange.display_name || '';
            document.getElementById('ageRangeCode').value = ageRange.age_range || '';
            document.getElementById('ageRangeIsActive').checked = ageRange.is_active !== false;
            document.getElementById('ageRangeLanguageGuidelines').value = ageRange.language_guidelines || '';
            document.getElementById('ageRangeDevelopmentalStage').value = ageRange.developmental_stage || '';
        }

        window.addNewAgeRange = function() {
            // Open the modal instead of using prompt
            document.getElementById('addAgeRangeModal').classList.add('active');
            document.getElementById('newAgeRangeDisplayName').value = '';
            document.getElementById('newAgeRangeCode').value = '';
            document.getElementById('newAgeRangeLanguageGuidelines').value = '';
            document.getElementById('newAgeRangeDevelopmentalStage').value = '';
            document.getElementById('newAgeRangeDisplayName').focus();
        }

        window.closeAddAgeRangeModal = function() {
            document.getElementById('addAgeRangeModal').classList.remove('active');
        }

        window.saveNewAgeRange = async function(event) {
            event.preventDefault();
            
            const displayName = document.getElementById('newAgeRangeDisplayName').value.trim();
            const ageRangeCode = document.getElementById('newAgeRangeCode').value.trim();
            
            if (!displayName || !ageRangeCode) {
                alert('Display name and age range code are required.');
                return;
            }

            const { data, error } = await supabase
                .from('age_ranges')
                .insert({
                    age_range: ageRangeCode,
                    display_name: displayName,
                    language_guidelines: document.getElementById('newAgeRangeLanguageGuidelines').value.trim() || '',
                    developmental_stage: document.getElementById('newAgeRangeDevelopmentalStage').value.trim() || '',
                    is_active: true
                })
                .select()
                .single();

            if (error) {
                console.error('[Admin] Error adding age range:', error);
                alert('Failed to add age range. Please try again.');
                return;
            }

            closeAddAgeRangeModal();
            selectedAgeRangeId = data?.id || null;
            await loadAgeRangesTheories();
            if (selectedAgeRangeId) {
                selectAgeRange(selectedAgeRangeId);
            }
            alert('✅ Age range added successfully!');
        }

        window.saveAgeRangeChanges = async function() {
            if (!selectedAgeRangeId) return;

            const updates = {
                display_name: document.getElementById('ageRangeDisplayName').value.trim(),
                age_range: document.getElementById('ageRangeCode').value.trim(),
                is_active: document.getElementById('ageRangeIsActive').checked,
                language_guidelines: document.getElementById('ageRangeLanguageGuidelines').value.trim() || null,
                developmental_stage: document.getElementById('ageRangeDevelopmentalStage').value.trim() || null
            };

            if (!updates.display_name || !updates.age_range) {
                alert('Display name and age range code are required.');
                return;
            }

            const { error } = await supabase
                .from('age_ranges')
                .update(updates)
                .eq('id', selectedAgeRangeId);

            if (error) {
                console.error('[Admin] Error saving age range:', error);
                alert('Failed to save age range changes.');
                return;
            }

            alert('✅ Age range saved successfully!');
            await loadAgeRangesTheories();
        }

        // ========== SUPER SKILLS FUNCTIONS (Theories Tab) ==========

        window.selectSuperSkillTheories = function(superSkillId) {
            selectedSuperSkillTheoriesId = superSkillId;
            const superSkill = superSkillsTheoriesData.find(ss => ss.id === superSkillId);
            const editor = document.getElementById('superSkillEditorTheories');
            const placeholder = document.getElementById('superSkillEditorPlaceholderTheories');

            if (!superSkill) {
                if (editor) editor.style.display = 'none';
                if (placeholder) placeholder.style.display = 'block';
                return;
            }

            if (editor) editor.style.display = 'block';
            if (placeholder) placeholder.style.display = 'none';

            document.getElementById('superSkillNameTheories').value = superSkill.name || '';
            document.getElementById('superSkillIsActiveTheories').checked = superSkill.is_active !== false;
            document.getElementById('superSkillDescriptionTheories').value = superSkill.description || '';
            document.getElementById('superSkillRelevantTheories').value = superSkill.relevant_theories || '';
        }

        window.addNewSuperSkillTheories = function() {
            // Open the modal instead of using prompt
            document.getElementById('addSuperSkillTheoriesModal').classList.add('active');
            document.getElementById('newSuperSkillTheoriesName').value = '';
            document.getElementById('newSuperSkillTheoriesDescription').value = '';
            document.getElementById('newSuperSkillTheoriesRelevantTheories').value = '';
            document.getElementById('newSuperSkillTheoriesName').focus();
        }

        window.closeAddSuperSkillTheoriesModal = function() {
            document.getElementById('addSuperSkillTheoriesModal').classList.remove('active');
        }

        window.saveNewSuperSkillTheories = async function(event) {
            event.preventDefault();
            
            const name = document.getElementById('newSuperSkillTheoriesName').value.trim();
            if (!name) {
                alert('Super skill name is required.');
                return;
            }

            const { data, error } = await supabase
                .from('super_skills')
                .insert({
                    name: name,
                    description: document.getElementById('newSuperSkillTheoriesDescription').value.trim() || '',
                    relevant_theories: document.getElementById('newSuperSkillTheoriesRelevantTheories').value.trim() || '',
                    is_active: true
                })
                .select()
                .single();

            if (error) {
                console.error('[Admin] Error adding super skill:', error);
                alert('Failed to add super skill. Please try again.');
                return;
            }

            closeAddSuperSkillTheoriesModal();
            selectedSuperSkillTheoriesId = data?.id || null;
            await loadSuperSkillsTheories();
            if (selectedSuperSkillTheoriesId) {
                selectSuperSkillTheories(selectedSuperSkillTheoriesId);
            }
            alert('✅ Super skill added successfully!');
        }

        window.saveSuperSkillTheoriesChanges = async function() {
            if (!selectedSuperSkillTheoriesId) return;

            const updates = {
                name: document.getElementById('superSkillNameTheories').value.trim(),
                is_active: document.getElementById('superSkillIsActiveTheories').checked,
                description: document.getElementById('superSkillDescriptionTheories').value.trim() || null,
                relevant_theories: document.getElementById('superSkillRelevantTheories').value.trim() || null
            };

            if (!updates.name) {
                alert('Super skill name is required.');
                return;
            }

            const { error } = await supabase
                .from('super_skills')
                .update(updates)
                .eq('id', selectedSuperSkillTheoriesId);

            if (error) {
                console.error('[Admin] Error saving super skill:', error);
                alert('Failed to save super skill changes.');
                return;
            }

            alert('✅ Super skill saved successfully!');
            await loadSuperSkillsTheories();
        }

        window.selectSubSkillTheories = function(subSkillId) {
            selectedSubSkillTheoriesId = subSkillId;
            const subSkill = subSkillsTheoriesData.find(ss => ss.id === subSkillId);
            const editor = document.getElementById('subSkillEditorTheories');
            const placeholder = document.getElementById('subSkillEditorPlaceholderTheories');

            if (!subSkill) {
                if (editor) editor.style.display = 'none';
                if (placeholder) placeholder.style.display = 'block';
                return;
            }

            if (editor) editor.style.display = 'block';
            if (placeholder) placeholder.style.display = 'none';

            document.getElementById('subSkillNameTheories').value = subSkill.name || '';
            document.getElementById('subSkillParentTheories').value = subSkill.super_skill_id || '';
            document.getElementById('subSkillIsActiveTheories').checked = subSkill.is_active !== false;
            document.getElementById('subSkillDescriptionTheories').value = subSkill.description || '';
        }

        window.addNewSubSkillTheories = function(preselectedSuperSkillId) {
            // Open the modal instead of using prompt
            document.getElementById('addSubSkillTheoriesModal').classList.add('active');
            document.getElementById('newSubSkillTheoriesName').value = '';
            document.getElementById('newSubSkillTheoriesDescription').value = '';
            
            // Populate the parent super skill dropdown
            const parentSelect = document.getElementById('newSubSkillTheoriesParent');
            parentSelect.innerHTML = '<option value="">Select Super Skill...</option>';
            superSkillsTheoriesData.forEach(ss => {
                const option = document.createElement('option');
                option.value = ss.id;
                option.textContent = ss.name;
                // Pre-select the super skill if ID was provided
                if (preselectedSuperSkillId && ss.id === preselectedSuperSkillId) {
                    option.selected = true;
                }
                parentSelect.appendChild(option);
            });
            
            document.getElementById('newSubSkillTheoriesName').focus();
        }

        window.closeAddSubSkillTheoriesModal = function() {
            document.getElementById('addSubSkillTheoriesModal').classList.remove('active');
        }

        window.saveNewSubSkillTheories = async function(event) {
            event.preventDefault();
            
            const name = document.getElementById('newSubSkillTheoriesName').value.trim();
            if (!name) {
                alert('Sub-skill name is required.');
                return;
            }

            const parentId = document.getElementById('newSubSkillTheoriesParent').value || null;

            const { data, error } = await supabase
                .from('sub_skills')
                .insert({
                    name: name,
                    super_skill_id: parentId,
                    description: document.getElementById('newSubSkillTheoriesDescription').value.trim() || '',
                    is_active: true
                })
                .select()
                .single();

            if (error) {
                console.error('[Admin] Error adding sub-skill:', error);
                alert('Failed to add sub-skill. Please try again.');
                return;
            }

            closeAddSubSkillTheoriesModal();
            selectedSubSkillTheoriesId = data?.id || null;
            await loadSubSkillsTheories();
            if (selectedSubSkillTheoriesId) {
                selectSubSkillTheories(selectedSubSkillTheoriesId);
            }
            alert('✅ Sub-skill added successfully!');
        }

        window.saveSubSkillTheoriesChanges = async function() {
            if (!selectedSubSkillTheoriesId) return;

            const updates = {
                name: document.getElementById('subSkillNameTheories').value.trim(),
                super_skill_id: document.getElementById('subSkillParentTheories').value || null,
                is_active: document.getElementById('subSkillIsActiveTheories').checked,
                description: document.getElementById('subSkillDescriptionTheories').value.trim() || null
            };

            if (!updates.name) {
                alert('Sub-skill name is required.');
                return;
            }

            const { error } = await supabase
                .from('sub_skills')
                .update(updates)
                .eq('id', selectedSubSkillTheoriesId);

            if (error) {
                console.error('[Admin] Error saving sub-skill:', error);
                alert('Failed to save sub-skill changes.');
                return;
            }

            alert('✅ Sub-skill saved successfully!');
            await loadSubSkillsTheories();
        }

        // ========== AGE RANGES FUNCTIONS (Theories Tab) ==========
        
        async function loadAgeRangesTheories() {
            const { data, error } = await supabase
                .from('age_ranges')
                .select('*')
                .eq('is_active', true)
                .order('age_range');

            if (error) {
                console.error('[Admin] Error loading age ranges:', error);
                return;
            }

            ageRangesTheoriesData = data || [];
            const select = document.getElementById('ageRangeSelectTheories');
            if (select) {
                select.innerHTML = '<option value="">Select an age range...</option>';
                ageRangesTheoriesData.forEach(ar => {
                    const option = document.createElement('option');
                    option.value = ar.id;
                    option.textContent = `${ar.display_name} (${ar.age_range})`;
                    select.appendChild(option);
                });
                if (selectedAgeRangeId) {
                    select.value = selectedAgeRangeId;
                }
            }

            if (selectedAgeRangeId) {
                selectAgeRange(selectedAgeRangeId);
            }
        }

        window.selectAgeRange = function(ageRangeId) {
            selectedAgeRangeId = ageRangeId;
            const ageRange = ageRangesTheoriesData.find(ar => ar.id === ageRangeId);
            const editor = document.getElementById('ageRangeEditor');
            const placeholder = document.getElementById('ageRangeEditorPlaceholder');

            if (!ageRange) {
                if (editor) editor.style.display = 'none';
                if (placeholder) placeholder.style.display = 'block';
                return;
            }

            if (editor) editor.style.display = 'block';
            if (placeholder) placeholder.style.display = 'none';

            document.getElementById('ageRangeDisplayName').value = ageRange.display_name || '';
            document.getElementById('ageRangeCode').value = ageRange.age_range || '';
            document.getElementById('ageRangeIsActive').checked = ageRange.is_active !== false;
            document.getElementById('ageRangeLanguageGuidelines').value = ageRange.language_guidelines || '';
            document.getElementById('ageRangeDevelopmentalStage').value = ageRange.developmental_stage || '';
        }

        window.addNewAgeRange = function() {
            // Open the modal instead of using prompt
            document.getElementById('addAgeRangeModal').classList.add('active');
            document.getElementById('newAgeRangeDisplayName').value = '';
            document.getElementById('newAgeRangeCode').value = '';
            document.getElementById('newAgeRangeLanguageGuidelines').value = '';
            document.getElementById('newAgeRangeDevelopmentalStage').value = '';
            document.getElementById('newAgeRangeDisplayName').focus();
        }

        window.closeAddAgeRangeModal = function() {
            document.getElementById('addAgeRangeModal').classList.remove('active');
        }

        window.saveNewAgeRange = async function(event) {
            event.preventDefault();
            
            const displayName = document.getElementById('newAgeRangeDisplayName').value.trim();
            const ageRangeCode = document.getElementById('newAgeRangeCode').value.trim();
            
            if (!displayName || !ageRangeCode) {
                alert('Display name and age range code are required.');
                return;
            }

            const { data, error } = await supabase
                .from('age_ranges')
                .insert({
                    age_range: ageRangeCode,
                    display_name: displayName,
                    language_guidelines: document.getElementById('newAgeRangeLanguageGuidelines').value.trim() || '',
                    developmental_stage: document.getElementById('newAgeRangeDevelopmentalStage').value.trim() || '',
                    is_active: true
                })
                .select()
                .single();

            if (error) {
                console.error('[Admin] Error adding age range:', error);
                alert('Failed to add age range. Please try again.');
                return;
            }

            closeAddAgeRangeModal();
            selectedAgeRangeId = data?.id || null;
            await loadAgeRangesTheories();
            if (selectedAgeRangeId) {
                selectAgeRange(selectedAgeRangeId);
            }
            alert('✅ Age range added successfully!');
        }

        window.saveAgeRangeChanges = async function() {
            if (!selectedAgeRangeId) return;

            const updates = {
                display_name: document.getElementById('ageRangeDisplayName').value.trim(),
                age_range: document.getElementById('ageRangeCode').value.trim(),
                is_active: document.getElementById('ageRangeIsActive').checked,
                language_guidelines: document.getElementById('ageRangeLanguageGuidelines').value.trim() || null,
                developmental_stage: document.getElementById('ageRangeDevelopmentalStage').value.trim() || null
            };

            if (!updates.display_name || !updates.age_range) {
                alert('Display name and age range code are required.');
                return;
            }

            const { error } = await supabase
                .from('age_ranges')
                .update(updates)
                .eq('id', selectedAgeRangeId);

            if (error) {
                console.error('[Admin] Error saving age range:', error);
                alert('Failed to save age range changes.');
                return;
            }

            alert('✅ Age range saved successfully!');
            await loadAgeRangesTheories();
        }

        // ========== SUPER SKILLS FUNCTIONS (Theories Tab) ==========
        
        async function loadSuperSkillsTheories() {
            const { data, error } = await supabase
                .from('super_skills')
                .select('*')
                .order('name');

            if (error) {
                console.error('[Admin] Error loading super skills:', error);
                return;
            }

            superSkillsTheoriesData = data || [];
            const select = document.getElementById('superSkillSelectTheories');
            if (select) {
                select.innerHTML = '<option value="">Select a super skill...</option>';
                superSkillsTheoriesData.forEach(ss => {
                    const option = document.createElement('option');
                    option.value = ss.id;
                    option.textContent = ss.name;
                    select.appendChild(option);
                });
                if (selectedSuperSkillTheoriesId) {
                    select.value = selectedSuperSkillTheoriesId;
                }
            }
            
            // Also populate the parent dropdown in sub-skills
            const parentSelect = document.getElementById('subSkillParentTheories');
            if (parentSelect) {
                parentSelect.innerHTML = '<option value="">Select Super Skill...</option>';
                superSkillsTheoriesData.forEach(ss => {
                    const option = document.createElement('option');
                    option.value = ss.id;
                    option.textContent = ss.name;
                    parentSelect.appendChild(option);
                });
            }

            if (selectedSuperSkillTheoriesId) {
                selectSuperSkillTheories(selectedSuperSkillTheoriesId);
            }

            // Render the skills grid
            renderSuperSkillsTheoriesGrid();
        }

        function renderSuperSkillsTheoriesGrid() {
            const container = document.getElementById('superSkillsTheoriesGrid');
            if (!container) return;
            
            const skills = superSkillsTheoriesData || [];
            if (skills.length === 0) {
                container.innerHTML = '<div style="background: white; border-radius: 8px; padding: 20px; text-align: center; color: #6b7c8f;">No super skills added yet</div>';
                return;
            }

            // Get sub-skills count for each super skill
            const subSkillCounts = {};
            if (window.subSkillsTheoriesData) {
                window.subSkillsTheoriesData.forEach(subSkill => {
                    const superSkillId = subSkill.super_skill_id;
                    if (!subSkillCounts[superSkillId]) {
                        subSkillCounts[superSkillId] = 0;
                    }
                    subSkillCounts[superSkillId]++;
                });
            }

            // Create table with full width
            container.innerHTML = `
                <div style="background: white; border-radius: 8px; overflow: hidden; border: 1px solid #e5e7eb; width: 100%;">
                    <table style="width: 100%; border-collapse: collapse; table-layout: fixed;">
                        <thead>
                            <tr style="background: #f8f9fa; border-bottom: 2px solid #e5e7eb;">
                                <th style="padding: 12px; text-align: left; font-size: 13px; font-weight: 700; color: #374151; width: 60px;"></th>
                                <th style="padding: 12px; text-align: left; font-size: 13px; font-weight: 700; color: #374151; width: 180px;">Name</th>
                                <th style="padding: 12px; text-align: left; font-size: 13px; font-weight: 700; color: #374151; width: 140px;">Character</th>
                                <th style="padding: 12px; text-align: left; font-size: 13px; font-weight: 700; color: #374151;">Description</th>
                                <th style="padding: 12px; text-align: left; font-size: 13px; font-weight: 700; color: #374151; width: 200px;">Relevant Theories</th>
                                <th style="padding: 12px; text-align: center; font-size: 13px; font-weight: 700; color: #374151; width: 100px;">Sub-Skills</th>
                                <th style="padding: 12px; text-align: center; font-size: 13px; font-weight: 700; color: #374151; width: 80px;">Status</th>
                                <th style="padding: 12px; text-align: center; font-size: 13px; font-weight: 700; color: #374151; width: 100px;">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${skills.map((skill, index) => {
                                const subSkillCount = subSkillCounts[skill.id] || 0;
                                return `
                                <tr style="border-bottom: 1px solid #e5e7eb; cursor: pointer;" 
                                    onclick="selectSuperSkillTheories('${skill.id}')"
                                    onmouseover="this.style.background='#f8f9fa'"
                                    onmouseout="this.style.background='white'">
                                    <td style="padding: 12px; font-size: 24px;">${skill.emoji || '🧠'}</td>
                                    <td style="padding: 12px; font-size: 13px; color: #1f2937; font-weight: 600;">${skill.name}</td>
                                    <td style="padding: 12px; font-size: 12px; color: #6b7c8f;">${skill.character_name || '-'}</td>
                                    <td style="padding: 12px; font-size: 12px; color: #6b7c8f; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${skill.description || '-'}</td>
                                    <td style="padding: 12px; font-size: 12px; color: #6b7c8f; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${skill.relevant_theories || '-'}</td>
                                    <td style="padding: 12px; text-align: center;">
                                        <span style="display: inline-block; background: #eef2ff; color: #6366F1; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">
                                            ${subSkillCount}
                                        </span>
                                    </td>
                                    <td style="padding: 12px; text-align: center;">
                                        <span style="display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 11px; font-weight: 600; ${skill.is_active ? 'background: #d1fae5; color: #059669;' : 'background: #fee2e2; color: #dc2626;'}">
                                            ${skill.is_active ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td style="padding: 12px; text-align: center;">
                                        <button onclick="event.stopPropagation(); selectSuperSkillTheories('${skill.id}')" 
                                                style="background: #6366F1; color: white; border: none; border-radius: 4px; padding: 4px 12px; font-size: 12px; cursor: pointer; font-weight: 600;">
                                            Edit
                                        </button>
                                    </td>
                                </tr>
                            `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        }
        window.selectSuperSkillTheories = function(superSkillId) {
            selectedSuperSkillTheoriesId = superSkillId;
            const superSkill = superSkillsTheoriesData.find(ss => ss.id === superSkillId);
            const editor = document.getElementById('superSkillEditorTheories');
            const placeholder = document.getElementById('superSkillEditorPlaceholderTheories');

            if (!superSkill) {
                if (editor) editor.style.display = 'none';
                if (placeholder) placeholder.style.display = 'block';
                return;
            }

            if (editor) editor.style.display = 'block';
            if (placeholder) placeholder.style.display = 'none';

            document.getElementById('superSkillNameTheories').value = superSkill.name || '';
            document.getElementById('superSkillIsActiveTheories').checked = superSkill.is_active !== false;
            document.getElementById('superSkillDescriptionTheories').value = superSkill.description || '';
            document.getElementById('superSkillRelevantTheories').value = superSkill.relevant_theories || '';
        }

        window.addNewSuperSkillTheories = function() {
            // Open the modal instead of using prompt
            document.getElementById('addSuperSkillTheoriesModal').classList.add('active');
            document.getElementById('newSuperSkillTheoriesName').value = '';
            document.getElementById('newSuperSkillTheoriesDescription').value = '';
            document.getElementById('newSuperSkillTheoriesRelevantTheories').value = '';
            document.getElementById('newSuperSkillTheoriesName').focus();
        }

        window.closeAddSuperSkillTheoriesModal = function() {
            document.getElementById('addSuperSkillTheoriesModal').classList.remove('active');
        }

        window.saveNewSuperSkillTheories = async function(event) {
            event.preventDefault();
            
            const name = document.getElementById('newSuperSkillTheoriesName').value.trim();
            if (!name) {
                alert('Super skill name is required.');
                return;
            }

            const { data, error } = await supabase
                .from('super_skills')
                .insert({
                    name: name,
                    description: document.getElementById('newSuperSkillTheoriesDescription').value.trim() || '',
                    relevant_theories: document.getElementById('newSuperSkillTheoriesRelevantTheories').value.trim() || '',
                    is_active: true
                })
                .select()
                .single();

            if (error) {
                console.error('[Admin] Error adding super skill:', error);
                alert('Failed to add super skill. Please try again.');
                return;
            }

            closeAddSuperSkillTheoriesModal();
            selectedSuperSkillTheoriesId = data?.id || null;
            await loadSuperSkillsTheories();
            if (selectedSuperSkillTheoriesId) {
                selectSuperSkillTheories(selectedSuperSkillTheoriesId);
            }
            alert('✅ Super skill added successfully!');
        }

        window.saveSuperSkillTheoriesChanges = async function() {
            if (!selectedSuperSkillTheoriesId) return;

            const updates = {
                name: document.getElementById('superSkillNameTheories').value.trim(),
                is_active: document.getElementById('superSkillIsActiveTheories').checked,
                description: document.getElementById('superSkillDescriptionTheories').value.trim() || null,
                relevant_theories: document.getElementById('superSkillRelevantTheories').value.trim() || null
            };

            if (!updates.name) {
                alert('Super skill name is required.');
                return;
            }

            const { error } = await supabase
                .from('super_skills')
                .update(updates)
                .eq('id', selectedSuperSkillTheoriesId);

            if (error) {
                console.error('[Admin] Error saving super skill:', error);
                alert('Failed to save super skill changes.');
                return;
            }

            alert('✅ Super skill saved successfully!');
            await loadSuperSkillsTheories();
            await loadSubSkillsTheories(); // Refresh sub-skills to update parent references
        }

        // Load Sub-Skills for Theories tab
        async function loadSubSkillsTheories() {
            try {
                const { data, error } = await supabase
                    .from('sub_skills')
                    .select('*')
                    .order('super_skill_id')
                    .order('sort_order', { ascending: true });

                if (error) throw error;

                subSkillsTheoriesData = data || [];
                window.subSkillsTheoriesData = subSkillsTheoriesData;

                // Populate dropdown
                const subSkillSelect = document.getElementById('subSkillSelectTheories');
                if (subSkillSelect) {
                    subSkillSelect.innerHTML = '<option value="">Select a sub-skill...</option>';
                    subSkillsTheoriesData.forEach(ss => {
                        const option = document.createElement('option');
                        option.value = ss.id;
                        option.textContent = ss.name;
                        subSkillSelect.appendChild(option);
                    });
                }

                // Populate parent super skill dropdown in sub-skill editor
                const parentSelect = document.getElementById('subSkillParentTheories');
                if (parentSelect) {
                    const currentValue = parentSelect.value;
                    parentSelect.innerHTML = '<option value="">Select Super Skill...</option>';
                    superSkillsTheoriesData.forEach(ss => {
                        const option = document.createElement('option');
                        option.value = ss.id;
                        option.textContent = ss.name;
                        if (ss.id === currentValue) option.selected = true;
                        parentSelect.appendChild(option);
                    });
                }

                // Render the grid
                renderSubSkillsTheoriesGrid();
            } catch (error) {
                console.error('[Admin] Error loading sub-skills for theories:', error);
            }
        }

        // Render Sub-Skills Grid for Theories tab
        function renderSubSkillsTheoriesGrid() {
            const container = document.getElementById('subSkillsTheoriesGrid');
            if (!container) return;

            const skills = subSkillsTheoriesData || [];
            if (skills.length === 0) {
                container.innerHTML = '<div style="background: white; border-radius: 8px; padding: 20px; text-align: center; color: #6b7c8f;">No sub-skills added yet</div>';
                return;
            }

            // Group by super skill for better organization
            const grouped = {};
            skills.forEach(skill => {
                const superSkillId = skill.super_skill_id || 'no_parent';
                if (!grouped[superSkillId]) {
                    grouped[superSkillId] = [];
                }
                grouped[superSkillId].push(skill);
            });

            container.innerHTML = Object.keys(grouped).map(superSkillId => {
                const subSkills = grouped[superSkillId];
                const superSkill = superSkillsTheoriesData.find(ss => ss.id === superSkillId);
                
                // Skip if no parent super skill found (orphaned sub-skills)
                if (!superSkill) return '';
                
                const superSkillName = superSkill.name;

                return `
                    <div style="margin-bottom: 32px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                            <h4 style="font-size: 14px; color: #6366F1; margin: 0; font-weight: 700; display: flex; align-items: center; gap: 8px;">
                                ${superSkill.emoji || '🧠'} ${superSkillName}
                            </h4>
                            <button class="btn-save" onclick="addNewSubSkillTheories('${superSkillId}')" style="font-size: 12px; padding: 6px 12px;">
                                + Add Sub-Skill
                            </button>
                        </div>
                        <div style="background: white; border-radius: 8px; overflow: hidden; border: 1px solid #e5e7eb; width: 100%;">
                            <table style="width: 100%; border-collapse: collapse;">
                                <thead>
                                    <tr style="background: #f8f9fa; border-bottom: 2px solid #e5e7eb;">
                                        <th style="padding: 12px; text-align: left; font-size: 13px; font-weight: 700; color: #374151;">Name</th>
                                        <th style="padding: 12px; text-align: left; font-size: 13px; font-weight: 700; color: #374151; width: 150px;">Slug</th>
                                        <th style="padding: 12px; text-align: left; font-size: 13px; font-weight: 700; color: #374151;">Description</th>
                                        <th style="padding: 12px; text-align: center; font-size: 13px; font-weight: 700; color: #374151; width: 100px;">Status</th>
                                        <th style="padding: 12px; text-align: center; font-size: 13px; font-weight: 700; color: #374151; width: 100px;">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${subSkills.map(skill => `
                                        <tr style="border-bottom: 1px solid #e5e7eb; cursor: pointer;" 
                                            onclick="selectSubSkillTheories('${skill.id}')"
                                            onmouseover="this.style.background='#f8f9fa'"
                                            onmouseout="this.style.background='white'">
                                            <td style="padding: 12px; font-size: 13px; color: #1f2937; font-weight: 600;">${skill.name}</td>
                                            <td style="padding: 12px; font-size: 12px; color: #6b7c8f;">${skill.slug || '-'}</td>
                                            <td style="padding: 12px; font-size: 12px; color: #6b7c8f;">${skill.description || '-'}</td>
                                            <td style="padding: 12px; text-align: center;">
                                                <span style="display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 11px; font-weight: 600; ${skill.is_active ? 'background: #d1fae5; color: #059669;' : 'background: #fee2e2; color: #dc2626;'}">
                                                    ${skill.is_active ? 'Active' : 'Inactive'}
                                                </span>
                                            </td>
                                            <td style="padding: 12px; text-align: center;">
                                                <button onclick="event.stopPropagation(); selectSubSkillTheories('${skill.id}')" 
                                                        style="background: #6366F1; color: white; border: none; border-radius: 4px; padding: 4px 12px; font-size: 12px; cursor: pointer; font-weight: 600;">
                                                    Edit
                                                </button>
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                `;
            }).filter(Boolean).join('');
        }

        // Load FASD Domains for Theories tab
        let fasdDomainsTheoriesData = [];
        let selectedFasdDomainId = null;
        
        async function loadFasdDomainsTheories() {
            try {
                const { data, error } = await supabase
                    .from('fasd_domains')
                    .select('*')
                    .order('domain_number');

                if (error) throw error;

                fasdDomainsTheoriesData = data || [];

                // Populate dropdown
                const select = document.getElementById('fasdDomainSelectTheories');
                if (select) {
                    select.innerHTML = '<option value="">Select a FASD domain...</option>';
                    fasdDomainsTheoriesData.forEach(domain => {
                        const option = document.createElement('option');
                        option.value = domain.id;
                        option.textContent = `${domain.domain_number}. ${domain.domain_name}`;
                        select.appendChild(option);
                    });
                }

                // Render grid
                renderFasdDomainsTheoriesGrid();
            } catch (error) {
                console.error('[Admin] Error loading FASD domains:', error);
            }
        }

        function renderFasdDomainsTheoriesGrid() {
            const container = document.getElementById('fasdDomainsTheoriesGrid');
            if (!container) return;

            const domains = fasdDomainsTheoriesData || [];
            if (domains.length === 0) {
                container.innerHTML = '<div style="background: white; border-radius: 8px; padding: 20px; text-align: center; color: #6b7c8f;">No FASD domains added yet</div>';
                return;
            }

            // Create table
            container.innerHTML = `
                <div style="background: white; border-radius: 8px; overflow: hidden; border: 1px solid #e5e7eb;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="background: #f8f9fa; border-bottom: 2px solid #e5e7eb;">
                                <th style="padding: 12px; text-align: left; font-size: 13px; font-weight: 700; color: #374151; width: 80px;">#</th>
                                <th style="padding: 12px; text-align: left; font-size: 13px; font-weight: 700; color: #374151;">Domain Name</th>
                                <th style="padding: 12px; text-align: left; font-size: 13px; font-weight: 700; color: #374151;">Description</th>
                                <th style="padding: 12px; text-align: center; font-size: 13px; font-weight: 700; color: #374151; width: 100px;">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${domains.map((domain, index) => `
                                <tr style="border-bottom: 1px solid #e5e7eb; cursor: pointer;" 
                                    onclick="selectFasdDomain('${domain.id}')"
                                    onmouseover="this.style.background='#f8f9fa'"
                                    onmouseout="this.style.background='white'">
                                    <td style="padding: 12px; font-size: 13px; color: #6b7c8f; font-weight: 600;">${domain.domain_number}</td>
                                    <td style="padding: 12px; font-size: 13px; color: #1f2937; font-weight: 600;">${domain.domain_name}</td>
                                    <td style="padding: 12px; font-size: 12px; color: #6b7c8f;">${domain.description || ''}</td>
                                    <td style="padding: 12px; text-align: center;">
                                        <button onclick="event.stopPropagation(); selectFasdDomain('${domain.id}')" 
                                                style="background: #6366F1; color: white; border: none; border-radius: 4px; padding: 4px 12px; font-size: 12px; cursor: pointer; font-weight: 600;">
                                            Edit
                                        </button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        }

        window.selectFasdDomain = function(domainId) {
            selectedFasdDomainId = domainId;
            const domain = fasdDomainsTheoriesData.find(d => d.id === domainId);
            const editor = document.getElementById('fasdDomainEditor');
            const placeholder = document.getElementById('fasdDomainEditorPlaceholder');

            if (!domain) {
                if (editor) editor.style.display = 'none';
                if (placeholder) placeholder.style.display = 'block';
                return;
            }

            if (editor) editor.style.display = 'block';
            if (placeholder) placeholder.style.display = 'none';

            document.getElementById('fasdDomainNumber').value = domain.domain_number || '';
            document.getElementById('fasdDomainName').value = domain.domain_name || '';
            document.getElementById('fasdDomainDescription').value = domain.description || '';
        }

        window.saveFasdDomainChanges = async function() {
            if (!selectedFasdDomainId) return;

            const updates = {
                domain_number: parseInt(document.getElementById('fasdDomainNumber').value) || null,
                domain_name: document.getElementById('fasdDomainName').value.trim(),
                description: document.getElementById('fasdDomainDescription').value.trim() || null
            };

            if (!updates.domain_name) {
                alert('Domain name is required.');
                return;
            }

            const { error } = await supabase
                .from('fasd_domains')
                .update(updates)
                .eq('id', selectedFasdDomainId);

            if (error) {
                console.error('[Admin] Error saving FASD domain:', error);
                alert('Failed to save FASD domain changes.');
                return;
            }

            alert('✅ FASD domain saved successfully!');
            await loadFasdDomainsTheories();
        }

        // Load NDIS Domains for Theories tab
        let ndisDomainsTheoriesData = [];
        let selectedNdisDomainId = null;
        
        async function loadNdisDomainsTheories() {
            try {
                const { data, error } = await supabase
                    .from('ndis_domains')
                    .select('*')
                    .order('sort_order');

                if (error) throw error;

                ndisDomainsTheoriesData = data || [];

                // Populate dropdown
                const select = document.getElementById('ndisDomainSelectTheories');
                if (select) {
                    select.innerHTML = '<option value="">Select an NDIS domain...</option>';
                    ndisDomainsTheoriesData.forEach(domain => {
                        const option = document.createElement('option');
                        option.value = domain.id;
                        option.textContent = domain.domain_name;
                        select.appendChild(option);
                    });
                }

                // Render grid
                renderNdisDomainsTheoriesGrid();
            } catch (error) {
                console.error('[Admin] Error loading NDIS domains:', error);
            }
        }

        function renderNdisDomainsTheoriesGrid() {
            const container = document.getElementById('ndisDomainsTheoriesGrid');
            if (!container) return;

            const domains = ndisDomainsTheoriesData || [];
            if (domains.length === 0) {
                container.innerHTML = '<div style="background: white; border-radius: 8px; padding: 20px; text-align: center; color: #6b7c8f;">No NDIS domains added yet</div>';
                return;
            }

            // Create table
            container.innerHTML = `
                <div style="background: white; border-radius: 8px; overflow: hidden; border: 1px solid #e5e7eb;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="background: #f8f9fa; border-bottom: 2px solid #e5e7eb;">
                                <th style="padding: 12px; text-align: left; font-size: 13px; font-weight: 700; color: #374151;">Domain Name</th>
                                <th style="padding: 12px; text-align: left; font-size: 13px; font-weight: 700; color: #374151;">Description</th>
                                <th style="padding: 12px; text-align: center; font-size: 13px; font-weight: 700; color: #374151; width: 100px;">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${domains.map((domain, index) => `
                                <tr style="border-bottom: 1px solid #e5e7eb; cursor: pointer;" 
                                    onclick="selectNdisDomain('${domain.id}')"
                                    onmouseover="this.style.background='#f8f9fa'"
                                    onmouseout="this.style.background='white'">
                                    <td style="padding: 12px; font-size: 13px; color: #1f2937; font-weight: 600;">${domain.domain_name}</td>
                                    <td style="padding: 12px; font-size: 12px; color: #6b7c8f;">${domain.description || ''}</td>
                                    <td style="padding: 12px; text-align: center;">
                                        <button onclick="event.stopPropagation(); selectNdisDomain('${domain.id}')" 
                                                style="background: #6366F1; color: white; border: none; border-radius: 4px; padding: 4px 12px; font-size: 12px; cursor: pointer; font-weight: 600;">
                                            Edit
                                        </button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        }

        window.selectNdisDomain = function(domainId) {
            selectedNdisDomainId = domainId;
            const domain = ndisDomainsTheoriesData.find(d => d.id === domainId);
            const editor = document.getElementById('ndisDomainEditor');
            const placeholder = document.getElementById('ndisDomainEditorPlaceholder');

            if (!domain) {
                if (editor) editor.style.display = 'none';
                if (placeholder) placeholder.style.display = 'block';
                return;
            }

            if (editor) editor.style.display = 'block';
            if (placeholder) placeholder.style.display = 'none';

            document.getElementById('ndisDomainName').value = domain.domain_name || '';
            document.getElementById('ndisDomainDescription').value = domain.description || '';
        }

        window.saveNdisDomainChanges = async function() {
            if (!selectedNdisDomainId) return;

            const updates = {
                domain_name: document.getElementById('ndisDomainName').value.trim(),
                description: document.getElementById('ndisDomainDescription').value.trim() || null
            };

            if (!updates.domain_name) {
                alert('Domain name is required.');
                return;
            }

            const { error } = await supabase
                .from('ndis_domains')
                .update(updates)
                .eq('id', selectedNdisDomainId);

            if (error) {
                console.error('[Admin] Error saving NDIS domain:', error);
                alert('Failed to save NDIS domain changes.');
                return;
            }

            alert('✅ NDIS domain saved successfully!');
            await loadNdisDomainsTheories();
        }

        window.addNewFasdDomain = function() {
            document.getElementById('addFasdDomainModal').classList.add('active');
            document.getElementById('newFasdDomainName').value = '';
            document.getElementById('newFasdDomainNumber').value = '';
            document.getElementById('newFasdDomainDescription').value = '';
            document.getElementById('newFasdDomainName').focus();
        }

        window.closeAddFasdDomainModal = function() {
            document.getElementById('addFasdDomainModal').classList.remove('active');
        }

        window.saveNewFasdDomain = async function(event) {
            event.preventDefault();
            
            const domainName = document.getElementById('newFasdDomainName').value.trim();
            if (!domainName) {
                alert('Domain name is required.');
                return;
            }

            const { data, error } = await supabase
                .from('fasd_domains')
                .insert({
                    domain_name: domainName,
                    domain_number: parseInt(document.getElementById('newFasdDomainNumber').value) || null,
                    description: document.getElementById('newFasdDomainDescription').value.trim() || null
                })
                .select()
                .single();

            if (error) {
                console.error('[Admin] Error adding FASD domain:', error);
                alert('Failed to add FASD domain. Please try again.');
                return;
            }

            closeAddFasdDomainModal();
            selectedFasdDomainId = data?.id || null;
            await loadFasdDomainsTheories();
            if (selectedFasdDomainId) {
                selectFasdDomain(selectedFasdDomainId);
            }
            alert('✅ FASD domain added successfully!');
        }

        window.addNewNdisDomain = function() {
            document.getElementById('addNdisDomainModal').classList.add('active');
            document.getElementById('newNdisDomainName').value = '';
            document.getElementById('newNdisDomainDescription').value = '';
            document.getElementById('newNdisDomainName').focus();
        }

        window.closeAddNdisDomainModal = function() {
            document.getElementById('addNdisDomainModal').classList.remove('active');
        }

        window.saveNewNdisDomain = async function(event) {
            event.preventDefault();
            
            const domainName = document.getElementById('newNdisDomainName').value.trim();
            if (!domainName) {
                alert('Domain name is required.');
                return;
            }

            const { data, error } = await supabase
                .from('ndis_domains')
                .insert({
                    domain_name: domainName,
                    description: document.getElementById('newNdisDomainDescription').value.trim() || null
                })
                .select()
                .single();

            if (error) {
                console.error('[Admin] Error adding NDIS domain:', error);
                alert('Failed to add NDIS domain. Please try again.');
                return;
            }

            closeAddNdisDomainModal();
            selectedNdisDomainId = data?.id || null;
            await loadNdisDomainsTheories();
            if (selectedNdisDomainId) {
                selectNdisDomain(selectedNdisDomainId);
            }
            alert('✅ NDIS domain added successfully!');
        }

        window.selectSubSkillTheories = function(subSkillId) {
            selectedSubSkillTheoriesId = subSkillId;
            const subSkill = subSkillsTheoriesData.find(ss => ss.id === subSkillId);
            const editor = document.getElementById('subSkillEditorTheories');
            const placeholder = document.getElementById('subSkillEditorPlaceholderTheories');

            if (!subSkill) {
                if (editor) editor.style.display = 'none';
                if (placeholder) placeholder.style.display = 'block';
                return;
            }

            if (editor) editor.style.display = 'block';
            if (placeholder) placeholder.style.display = 'none';

            document.getElementById('subSkillNameTheories').value = subSkill.name || '';
            document.getElementById('subSkillParentTheories').value = subSkill.super_skill_id || '';
            document.getElementById('subSkillIsActiveTheories').checked = subSkill.is_active !== false;
            document.getElementById('subSkillDescriptionTheories').value = subSkill.description || '';
        }

        window.addNewSubSkillTheories = function(preselectedSuperSkillId) {
            // Open the modal instead of using prompt
            document.getElementById('addSubSkillTheoriesModal').classList.add('active');
            document.getElementById('newSubSkillTheoriesName').value = '';
            document.getElementById('newSubSkillTheoriesDescription').value = '';
            
            // Populate the parent super skill dropdown
            const parentSelect = document.getElementById('newSubSkillTheoriesParent');
            parentSelect.innerHTML = '<option value="">Select Super Skill...</option>';
            superSkillsTheoriesData.forEach(ss => {
                const option = document.createElement('option');
                option.value = ss.id;
                option.textContent = ss.name;
                // Pre-select the super skill if ID was provided
                if (preselectedSuperSkillId && ss.id === preselectedSuperSkillId) {
                    option.selected = true;
                }
                parentSelect.appendChild(option);
            });
            
            document.getElementById('newSubSkillTheoriesName').focus();
        }

        window.closeAddSubSkillTheoriesModal = function() {
            document.getElementById('addSubSkillTheoriesModal').classList.remove('active');
        }

        window.saveNewSubSkillTheories = async function(event) {
            event.preventDefault();
            
            const name = document.getElementById('newSubSkillTheoriesName').value.trim();
            if (!name) {
                alert('Sub-skill name is required.');
                return;
            }

            const parentId = document.getElementById('newSubSkillTheoriesParent').value || null;

            const { data, error } = await supabase
                .from('sub_skills')
                .insert({
                    name: name,
                    super_skill_id: parentId,
                    description: document.getElementById('newSubSkillTheoriesDescription').value.trim() || '',
                    is_active: true
                })
                .select()
                .single();

            if (error) {
                console.error('[Admin] Error adding sub-skill:', error);
                alert('Failed to add sub-skill. Please try again.');
                return;
            }

            closeAddSubSkillTheoriesModal();
            selectedSubSkillTheoriesId = data?.id || null;
            await loadSubSkillsTheories();
            if (selectedSubSkillTheoriesId) {
                selectSubSkillTheories(selectedSubSkillTheoriesId);
            }
            alert('✅ Sub-skill added successfully!');
        }

        window.saveSubSkillTheoriesChanges = async function() {
            if (!selectedSubSkillTheoriesId) return;

            const updates = {
                name: document.getElementById('subSkillNameTheories').value.trim(),
                super_skill_id: document.getElementById('subSkillParentTheories').value || null,
                is_active: document.getElementById('subSkillIsActiveTheories').checked,
                description: document.getElementById('subSkillDescriptionTheories').value.trim() || null
            };

            if (!updates.name) {
                alert('Sub-skill name is required.');
                return;
            }

            const { error } = await supabase
                .from('sub_skills')
                .update(updates)
                .eq('id', selectedSubSkillTheoriesId);

            if (error) {
                console.error('[Admin] Error saving sub-skill:', error);
                alert('Failed to save sub-skill changes.');
                return;
            }

            alert('✅ Sub-skill saved successfully!');
            await loadSubSkillsTheories();
        }

        // ========== SUPER SKILLS FUNCTIONS ==========
        
        // Store SuperSkills data for dropdown cascading
        let superSkillsData = [];
        let subSkillsData = [];
        let cyclesData = [];
        
        // Load Super Skills into dropdown
        async function populateSuperSkillsDropdown() {
            try {
                const { data, error } = await supabase
                    .from('super_skills')
                    .select('*')
                    // .eq('is_active', true)  // Temporarily removed - show all skills
                    .order('sort_order', { ascending: true });
                
                if (error) throw error;
                
                superSkillsData = data || [];
                
                const superSkillSelect = document.getElementById('newModuleSuperSkill');
                const editSuperSkillSelect = document.getElementById('editSuperSkill');
                
                if (!superSkillSelect && !editSuperSkillSelect) {
                    console.error('[Admin] Super Skill select element not found!');
                    return;
                }

                const selects = [superSkillSelect, editSuperSkillSelect].filter(Boolean);
                selects.forEach(targetSelect => {
                    targetSelect.innerHTML = '<option value="">Select Super Skill...</option>';

                    superSkillsData.forEach(skill => {
                        const option = document.createElement('option');
                        option.value = skill.id;
                        option.textContent = `${skill.emoji || ''} ${skill.name}`;
                        option.dataset.characterName = skill.character_name || '';
                        option.dataset.themeColor = skill.theme_color || '#405878';
                        targetSelect.appendChild(option);
                    });
                });
                
                
                
                // Load all sub-skills
                const { data: subData } = await supabase
                    .from('sub_skills')
                    .select('*')
                    // .eq('is_active', true)  // Removed - show all sub-skills
                    .order('sort_order', { ascending: true });
                subSkillsData = subData || [];
                
                // Load all cycles
                const { data: cycleData } = await supabase
                    .from('cycles')
                    .select('*')
                    // .eq('is_active', true)  // Removed - show all cycles
                    .order('cycle_number', { ascending: true });
                cyclesData = cycleData || [];
                
            } catch (error) {
                console.error('[Admin] Error loading Super Skills:', error);
            }
        }
        
        // Handle Super Skill change - update character, sub-skills, and cycles
        window.onSuperSkillChange = function() {
            const superSkillSelect = document.getElementById('newModuleSuperSkill');
            const characterInput = document.getElementById('newModuleCharacter');
            const subSkillSelect = document.getElementById('newModuleSubSkill');
            const cycleSelect = document.getElementById('newModuleCycle');
            
            const selectedOption = superSkillSelect.options[superSkillSelect.selectedIndex];
            const superSkillId = superSkillSelect.value;
            
            // Update character field
            if (selectedOption && selectedOption.dataset.characterName) {
                characterInput.value = selectedOption.dataset.characterName;
            } else {
                characterInput.value = '';
            }
            
            // Also set the hidden category field for backward compatibility
            const selectedSkill = superSkillsData.find(s => s.id === superSkillId);
            if (selectedSkill) {
                document.getElementById('newModuleCategory').value = selectedSkill.slug;
                document.getElementById('newModuleSeries').value = selectedSkill.character_name || '';
            }
            
            // Filter sub-skills for this super skill
            subSkillSelect.innerHTML = '<option value="">Select sub-skill...</option>';
            const filteredSubSkills = subSkillsData.filter(ss => ss.super_skill_id === superSkillId);
            filteredSubSkills.forEach(subSkill => {
                const option = document.createElement('option');
                option.value = subSkill.id;
                option.textContent = subSkill.name;
                subSkillSelect.appendChild(option);
            });
            
            // Filter cycles for this super skill
            cycleSelect.innerHTML = '<option value="">Select cycle...</option>';
            const filteredCycles = cyclesData.filter(c => c.super_skill_id === superSkillId);
            filteredCycles.forEach(cycle => {
                const option = document.createElement('option');
                option.value = cycle.id;
                option.textContent = `Cycle ${cycle.cycle_number}: ${cycle.name}`;
                cycleSelect.appendChild(option);
            });
        }

        window.onEditSuperSkillChange = function() {
            const superSkillSelect = document.getElementById('editSuperSkill');
            const characterInput = document.getElementById('editCharacter');
            const subSkillSelect = document.getElementById('editSubSkill');
            const cycleSelect = document.getElementById('editCycle');

            if (!superSkillSelect || !subSkillSelect || !cycleSelect) return;

            const selectedOption = superSkillSelect.options[superSkillSelect.selectedIndex];
            const superSkillId = superSkillSelect.value;

            if (characterInput) {
                characterInput.value = selectedOption?.dataset?.characterName || '';
            }

            subSkillSelect.innerHTML = '<option value="">Select sub-skill...</option>';
            const filteredSubSkills = subSkillsData.filter(ss => ss.super_skill_id === superSkillId);
            filteredSubSkills.forEach(subSkill => {
                const option = document.createElement('option');
                option.value = subSkill.id;
                option.textContent = subSkill.name;
                subSkillSelect.appendChild(option);
            });

            cycleSelect.innerHTML = '<option value="">Select cycle...</option>';
            const filteredCycles = cyclesData.filter(c => c.super_skill_id === superSkillId);
            filteredCycles.forEach(cycle => {
                const option = document.createElement('option');
                option.value = cycle.id;
                option.textContent = `Cycle ${cycle.cycle_number}: ${cycle.name}`;
                cycleSelect.appendChild(option);
            });
        }



        // Generate next module code (MODULE10, MODULE11, etc.)
        function generateNextModuleCode() {
            const moduleCodes = allModules
                .map(m => m.code)
                .filter(code => code && code.startsWith('MODULE'))
                .map(code => parseInt(code.replace('MODULE', '')))
                .filter(num => !isNaN(num));
            
            if (moduleCodes.length === 0) {
                return 'MODULE1';
            }
            
            const maxNum = Math.max(...moduleCodes);
            return `MODULE${maxNum + 1}`;
        }

        // Fix escaped backticks in template literals
        function fixEscapedBackticks(htmlContent) {
            // Fix pattern: \`variable_name_\${expression}\`
            // This regex finds escaped backticks around template literal expressions
            const fixedContent = htmlContent.replace(
                /\\\`([^`]*?)\\\$\{([^}]+?)\}\\\`/g,
                '`$1\${$2}`'
            );
            
            const changesMade = fixedContent !== htmlContent;
            if (changesMade) {
                console.log('[Admin] Fixed escaped backticks in HTML content');
            }
            
            return fixedContent;
        }

        // Add Home button to module header if missing
        function addHomeButtonToHeader(htmlContent) {
            // Check if Home button already exists
            if (htmlContent.includes('goHome()') || htmlContent.includes('🏠 Home')) {
                return htmlContent;
            }
            
            // Pattern 1: Find the header actions section with Print button
            const printButtonPattern = /(onclick="prepareForPrint\(\)"[^>]*>🖨️ Print<\/button>)/;
            
            if (printButtonPattern.test(htmlContent)) {
                const updatedContent = htmlContent.replace(
                    printButtonPattern,
                    '$1\n                \n                <button onclick="goHome()" class="text-white px-4 py-2 rounded-xl font-bold hover:shadow-lg transition-all font-title" style="background-color: #5e2a84;">🏠 Home</button>'
                );
                
                // Also add the goHome function if it doesn't exist
                if (!updatedContent.includes('function goHome()')) {
                    const goHomeFunction = '\n        // Navigate back to dashboard\n' +
                        '        function goHome() {\n' +
                        '            const urlParams = new URLSearchParams(window.location.search);\n' +
                        '            const childId = urlParams.get(\'childId\');\n' +
                        '            if (childId) {\n' +
                        '                window.location.href = \'/dashboard.html\';\n' +
                        '            } else {\n' +
                        '                window.history.back();\n' +
                        '            }\n' +
                        '        }\n';
                    // Insert before the closing script tag
                    const scriptCloseTag = /<\/script>/;
                    const replacementText = goHomeFunction + '    <' + '/script>';
                    const finalContent = updatedContent.replace(
                        scriptCloseTag,
                        replacementText
                    );

                    return finalContent;
                }
                
                return updatedContent;
            }
            
            return htmlContent;
        }

        // Save New Module (DEPRECATED - now using AI generation with auto-save)
        // Keeping this for reference only
        window.saveNewModule_OLD = async function(event) {
            event.preventDefault();
            
            let processedContent = null;
            const moduleCode = document.getElementById('newModuleCode').value;
            
            // Check if we have AI-generated content or uploaded file
            if (generatedModuleHTML) {
                // Use AI-generated HTML

                processedContent = generatedModuleHTML;
                
            } else {
                // Use uploaded file
                const fileInput = document.getElementById('newModuleFile');
                if (!fileInput.files || !fileInput.files[0]) {
                    alert('Please either generate a module with AI or upload an HTML file');
                    return;
                }
                
                const file = fileInput.files[0];
                
                // Read file content and apply conversions

                const fileContent = await file.text();
                
                // Apply all conversions
                processedContent = fixEscapedBackticks(fileContent);
                processedContent = addHomeButtonToHeader(processedContent);
            }
            

            
            // Save module to database with HTML content
            const newModule = {
                title: document.getElementById('newModuleTitle').value,
                code: moduleCode,
                category: document.getElementById('newModuleCategory').value,
                series: document.getElementById('newModuleSeries').value || null,
                age_range: document.getElementById('newModuleAgeRange').value || null,
                short_description: document.getElementById('newModuleShortDescription').value || null,
                description: document.getElementById('newModuleDescription').value || null,
                html_content: processedContent, // Store processed HTML directly
                is_active: true // New modules start as active
            };

            try {
                const { data, error} = await supabase
                    .from('modules')
                    .insert([newModule])
                    .select();
                
                if (error) throw error;
                
                const createdModule = data[0];

                
                // Automatically add this module to parent_modules for ALL parents (as inactive)

                
                // Get all parents
                const { data: allParentsData } = await supabase
                    .from('parent_profiles')
                    .select('id');
                
                if (allParentsData && allParentsData.length > 0) {
                    // Create parent_modules entries for all parents
                    const parentModuleEntries = allParentsData.map(parent => ({
                        parent_id: parent.id,
                        module_id: createdModule.id,
                        is_active: false // New modules start as inactive for all parents
                    }));
                    
                    // Use upsert to handle cases where entry might already exist
                    const { error: bulkInsertError } = await supabase
                        .from('parent_modules')
                        .upsert(parentModuleEntries, { onConflict: 'parent_id,module_id' });
                    
                    if (bulkInsertError) {
                        console.error('[Admin] Error adding module to parents:', bulkInsertError);
                        alert(
                            '⚠️ Module created but could not be added to all parents.\n\n' +
                            'Error: ' + bulkInsertError.message
                        );
                    } else {
                        console.log('[Admin] Module added to all parents successfully');
                    }
                } else {
                    console.warn('[Admin] No parents found to add module to');
                }
                
                // Close modal first
                closeAddModuleModal();
                
                // Show success message
                alert(
                    '✓ Module created successfully!\n\n' +
                    'Automatic conversions applied:\n' +
                    '✓ Escaped backticks fixed\n' +
                    '✓ Home button added to header\n' +
                    '✓ HTML stored in database\n\n' +
                    'The module is now ready to use!'
                );
                
                // Reload page to refresh everything
                window.location.reload();
                
            } catch (error) {
                console.error('Error creating module:', error);
                alert('Failed to create module: ' + error.message);
            }
        }

        // Delete Module
        window.deleteModule = async function() {
            if (!selectedModule) return;
            
            const confirmDelete = confirm(
                `⚠️ Are you sure you want to delete this module?\n\n` +
                `Module: ${selectedModule.title}\n` +
                `Code: ${selectedModule.code}\n\n` +
                `This will:\n` +
                `• Remove the module from the database\n` +
                `• Remove all child assignments\n` +
                `• Delete the HTML content stored in the database\n\n` +
                `This action cannot be undone!`
            );
            
            if (!confirmDelete) return;
            
            try {
                const moduleToDelete = selectedModule; // Store reference before clearing
                
                // First, check if there are any child assignments
                const { data: assignments, error: checkError } = await supabase
                    .from('child_modules')
                    .select('id')
                    .eq('module_id', moduleToDelete.id);
                
                if (checkError) {
                    console.error('Error checking assignments:', checkError);
                    alert('Failed to check module assignments: ' + checkError.message);
                    return;
                }
                
                
                // Delete child_modules assignments first
                if (assignments && assignments.length > 0) {
                    // Try deleting each assignment individually (RLS might be blocking bulk delete)
                    let deletedCount = 0;
                    for (const assignment of assignments) {
                        const { error: deleteError } = await supabase
                            .from('child_modules')
                            .delete()
                            .eq('id', assignment.id);
                        
                        if (!deleteError) {
                            deletedCount++;
                        }
                    }
                    
                    // Verify deletion completed
                    const { data: verifyAssignments, error: verifyError } = await supabase
                        .from('child_modules')
                        .select('id')
                        .eq('module_id', moduleToDelete.id);
                    
                    if (verifyError) {
                        console.error('Error verifying deletion:', verifyError);
                    } else if (verifyAssignments && verifyAssignments.length > 0) {
                        alert(
                            `⚠️ Cannot delete module: ${verifyAssignments.length} child assignments still exist.\n\n` +
                            `This is likely due to database permissions (RLS policies).\n\n` +
                            `Please go to Supabase → Authentication → Policies and ensure DELETE is enabled for child_modules table.`
                        );
                        return;
                    }
                }
                
                // Delete parent_modules assignments

                const { data: parentAssignments } = await supabase
                    .from('parent_modules')
                    .select('id')
                    .eq('module_id', moduleToDelete.id);
                
                if (parentAssignments && parentAssignments.length > 0) {
                    for (const assignment of parentAssignments) {
                        await supabase
                            .from('parent_modules')
                            .delete()
                            .eq('id', assignment.id);
                    }

                }
                
                // Delete from Storage if it has a storage_path
                if (moduleToDelete.storage_path) {

                    const { error: storageError } = await supabase.storage
                        .from('modules')
                        .remove([moduleToDelete.storage_path]);
                    
                    if (storageError) {
                        console.error('[Admin] Storage deletion error:', storageError);
                        // Continue anyway - we still want to delete from database
                    } else {
                        console.log('[Admin] Storage file deleted successfully');
                    }
                }
                
                // Delete the module from database
                const { data: moduleDeleteResult, error: moduleError } = await supabase
                    .from('modules')
                    .delete()
                    .eq('id', moduleToDelete.id)
                    .select();
                
                if (moduleError) {
                    console.error('Error deleting module:', moduleError);
                    alert('Failed to delete module: ' + moduleError.message);
                    return;
                }
                
                // Clear selection
                selectedModule = null;
                
                // Update UI
                document.getElementById('moduleEditForm').style.display = 'none';
                document.getElementById('moduleEditPlaceholder').style.display = 'block';
                
                // Show success message
                alert('✓ Module deleted successfully!\n\nThe module and its HTML content have been removed from the database.');
                
                // Reload page to refresh everything
                window.location.reload();
                
            } catch (error) {
                console.error('Delete error:', error);
                alert('Failed to delete module: ' + error.message);
            }
        }

        // Module Content Creator functions moved to external file: /scripts/module-content-creator.js

        // ============================================================================
        // ENHANCED ADD MODULE MODAL - INTEGRATED
        // ============================================================================
        
        window.enhancedModuleModal = {
            secondaryTheoryIds: [],
            diagnosisPathways: [],
            ndisDomains: [],
            sediCategories: []
        };

        // Override openAddModuleModal
        const originalOpenAddModuleModal = window.openAddModuleModal;
        window.openAddModuleModal = async function() {
            if (typeof originalOpenAddModuleModal === 'function') {
                originalOpenAddModuleModal();
            } else {
                document.getElementById('addModuleModal').classList.add('active');
            }
            
            await loadEnhancedModalData();
            setTimeout(() => injectEnhancedFields(), 100);
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
            
            const formGroup = brainTownField.closest('.form-group');
            if (!formGroup) return;
            
            const enhancedHTML = `
                <div class="form-group" id="secondaryTheoriesSection" style="margin-top: 20px;">
                    <label class="form-label">Secondary Theories (Max 3)</label>
                    <div id="secondaryTheoriesContainer" style="display: flex; flex-wrap: wrap; gap: 8px; padding: 12px; background: white; border: 1px solid #d1d5db; border-radius: 8px; min-height: 50px;"></div>
                    <p style="font-size: 12px; color: #6b7c8f; margin-top: 4px;">Selected: <span id="secondaryTheoryCount">0</span>/3</p>
                </div>
                
                <div class="form-group" style="margin-top: 16px;">
                    <label class="form-label">Neuroscience Concept</label>
                    <select id="neuroscienceConcept" class="form-select">
                        <option value="">Optional</option>
                        <option value="Neuroplasticity">Neuroplasticity</option>
                        <option value="Prefrontal Cortex">Prefrontal Cortex</option>
                        <option value="Dopamine">Dopamine</option>
                        <option value="Amygdala">Amygdala</option>
                        <option value="Interoception">Interoception</option>
                    </select>
                </div>
                
                <div class="form-group" style="margin-top: 16px;">
                    <label class="form-label">Diagnosis Adaptations</label>
                    <div style="display: grid; gap: 8px; margin-top: 8px;">
                        <label class="diagnosis-toggle" style="display: flex; align-items: center; gap: 10px; padding: 10px 12px; background: white; border: 1px solid #e5e7eb; border-radius: 6px; cursor: pointer;">
                            <input type="checkbox" value="fasd" class="diagnosis-checkbox" style="width: 18px; height: 18px;">
                            <span style="font-weight: 600;">FASD</span>
                        </label>
                        <label class="diagnosis-toggle" style="display: flex; align-items: center; gap: 10px; padding: 10px 12px; background: white; border: 1px solid #e5e7eb; border-radius: 6px; cursor: pointer;">
                            <input type="checkbox" value="adhd" class="diagnosis-checkbox" style="width: 18px; height: 18px;">
                            <span style="font-weight: 600;">ADHD</span>
                        </label>
                        <label class="diagnosis-toggle" style="display: flex; align-items: center; gap: 10px; padding: 10px 12px; background: white; border: 1px solid #e5e7eb; border-radius: 6px; cursor: pointer;">
                            <input type="checkbox" value="asd" class="diagnosis-checkbox" style="width: 18px; height: 18px;">
                            <span style="font-weight: 600;">ASD</span>
                        </label>
                        <label class="diagnosis-toggle" style="display: flex; align-items: center; gap: 10px; padding: 10px 12px; background: white; border: 1px solid #e5e7eb; border-radius: 6px; cursor: pointer;">
                            <input type="checkbox" value="pda" class="diagnosis-checkbox" style="width: 18px; height: 18px;">
                            <span style="font-weight: 600;">PDA</span>
                        </label>
                        <label class="diagnosis-toggle" style="display: flex; align-items: center; gap: 10px; padding: 10px 12px; background: white; border: 1px solid #e5e7eb; border-radius: 6px; cursor: pointer;">
                            <input type="checkbox" value="trauma" class="diagnosis-checkbox" style="width: 18px; height: 18px;">
                            <span style="font-weight: 600;">Complex Trauma</span>
                        </label>
                    </div>
                    <div id="fasdStrategiesContainer" style="display: none; margin-top: 12px; padding: 12px; background: #f0fdf4; border-left: 3px solid #10b981; border-radius: 6px;">
                        <label style="display: block; font-size: 13px; font-weight: 600; margin-bottom: 8px;">FASD Strategies</label>
                        <textarea id="fasdStrategies" rows="2" class="form-textarea" placeholder="Concrete visual supports, one-step instructions..."></textarea>
                    </div>
                </div>
                
                <div class="form-row" style="margin-top: 16px;">
                    <div class="form-group">
                        <label class="form-label">NDIS Domain</label>
                        <select id="ndisDomain" class="form-select"></select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">DSS SEDI</label>
                        <select id="dssSedi" class="form-select"></select>
                    </div>
                </div>
                
                <div class="form-group" style="margin-top: 16px;">
                    <label class="form-label">Module Objective</label>
                    <textarea id="moduleObjective" rows="2" class="form-textarea" placeholder="What will children be able to do?"></textarea>
                </div>
                
                <div class="form-group" style="margin-top: 16px;">
                    <label class="form-label">Facilitator Tip</label>
                    <textarea id="facilitatorTip" rows="2" class="form-textarea" placeholder="Guidance for parents/educators"></textarea>
                </div>
                
                <div class="form-row" style="margin-top: 16px;">
                    <div class="form-group">
                        <label class="form-label">Reflection Prompt</label>
                        <input type="text" id="reflectionPrompt" class="form-input" placeholder="What did you notice?">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Reward Text</label>
                        <input type="text" id="rewardText" class="form-input" placeholder="You earned stars! ⭐">
                    </div>
                </div>
            `;
            
            formGroup.insertAdjacentHTML('afterend', enhancedHTML);
            populateSecondaryTheories();
            populateNdisAndSedi();
            attachEnhancedListeners();
        }

        async function populateSecondaryTheories() {
            const container = document.getElementById('secondaryTheoriesContainer');
            const primarySelect = document.getElementById('coreTheorySelect');
            if (!container || !primarySelect) return;
            
            const theories = Array.from(primarySelect.options).filter(opt => opt.value).map(opt => ({ id: opt.value, name: opt.textContent }));
            container.innerHTML = theories.map(t => `<div class="secondary-theory-chip" data-theory-id="${t.id}" style="padding: 6px 12px; background: #f3f4f6; color: #374151; border-radius: 16px; font-size: 12px; font-weight: 600; cursor: pointer; user-select: none;">${t.name}</div>`).join('');
        }

        function populateNdisAndSedi() {
            const ndisSelect = document.getElementById('ndisDomain');
            if (ndisSelect) {
                ndisSelect.innerHTML = '<option value="">Optional</option>' + window.enhancedModuleModal.ndisDomains.map(nd => `<option value="${nd.id}">${nd.domain_name}</option>`).join('');
            }
            const sediSelect = document.getElementById('dssSedi');
            if (sediSelect) {
                sediSelect.innerHTML = '<option value="">Optional</option>' + window.enhancedModuleModal.sediCategories.map(sc => `<option value="${sc.id}">${sc.sedi_code}: ${sc.sedi_name}</option>`).join('');
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
                        this.style.background = '#f3f4f6'; this.style.color = '#374151';
                    } else {
                        if (window.enhancedModuleModal.secondaryTheoryIds.length >= 3) { alert('Max 3'); return; }
                        window.enhancedModuleModal.secondaryTheoryIds.push(theoryId);
                        this.style.background = '#10b981'; this.style.color = 'white';
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
                        toggle.style.borderColor = '#6366f1'; toggle.style.background = '#eef2ff';
                        if (dx === 'fasd') document.getElementById('fasdStrategiesContainer').style.display = 'block';
                    } else {
                        const idx = window.enhancedModuleModal.diagnosisPathways.indexOf(dx);
                        if (idx > -1) window.enhancedModuleModal.diagnosisPathways.splice(idx, 1);
                        toggle.style.borderColor = '#e5e7eb'; toggle.style.background = 'white';
                        if (dx === 'fasd') document.getElementById('fasdStrategiesContainer').style.display = 'none';
                    }
                });
            });
        }

        // Fix sub-skills loading
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

        // Enhance save function
        const originalSaveNewModule = window.saveNewModule;
        window.saveNewModule = async function(event) {
            if (event) event.preventDefault();
            window.__enhancedModuleData = {
                secondary_theory_ids: window.enhancedModuleModal.secondaryTheoryIds,
                neuroscience_concept: document.getElementById('neuroscienceConcept')?.value || null,
                diagnosis_pathways: window.enhancedModuleModal.diagnosisPathways,
                fasd_strategies: document.getElementById('fasdStrategies')?.value || null,
                ndis_domain_id: document.getElementById('ndisDomain')?.value || null,
                dss_sedi_id: document.getElementById('dssSedi')?.value || null,
                module_objective: document.getElementById('moduleObjective')?.value || null,
                facilitator_tip: document.getElementById('facilitatorTip')?.value || null,
                reflection_prompt: document.getElementById('reflectionPrompt')?.value || null,
                reward_text: document.getElementById('rewardText')?.value || null
            };
            if (typeof originalSaveNewModule === 'function') {
                return originalSaveNewModule(event);
            }
        };

        // Initialize
        async function init() {
            const hasAccess = await checkAdminAccess();
            if (!hasAccess) return;

            await Promise.all([
                loadAllChildren(),
                loadAllModules(),
                loadGeneralSettings()
            ]);

            await loadRewards();
        }

        init();