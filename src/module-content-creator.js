/**
 * Module Content Creator - Admin Functions
 * =========================================
 * Handles the Module Content Creator tab functionality including:
 * - Creating/editing module blueprints
 * - Excel upload and parsing
 * - Loading blueprints into the Add Module form
 */

// ============================================
// STATE
// ============================================
let modulesToGenerate = [];
let parsedExcelData = null;

// Helper to get supabase client from window
function getSupabase() {
    if (typeof window !== 'undefined' && window.supabase) {
        return window.supabase;
    }
    console.error('Supabase client not found on window');
    return null;
}

// ============================================
// LOAD & RENDER FUNCTIONS
// ============================================

/**
 * Load modules to generate from database
 */
async function loadModulesToGenerate() {
    const sb = getSupabase();
    if (!sb) return;
    
    const filterStatus = document.getElementById('mtgFilterStatus')?.value || 'pending';
    
    let query = sb
        .from('modules_to_generate')
        .select('*, super_skills(name, theme_color), sub_skills(name)')
        .order('cycle', { ascending: true })
        .order('week_number', { ascending: true });
    
    if (filterStatus === 'pending') {
        query = query.eq('has_been_generated', false);
    } else if (filterStatus === 'generated') {
        query = query.eq('has_been_generated', true);
    }
    
    const { data, error } = await query;
    
    if (error) {
        console.error('Error loading modules to generate:', error);
        return;
    }
    
    modulesToGenerate = data || [];
    renderModulesToGenerateList();
    updateModulesToGenerateCount();
}

/**
 * Update the pending count badge
 */
function updateModulesToGenerateCount() {
    const pendingCount = modulesToGenerate.filter(m => !m.has_been_generated).length;
    const countEl = document.getElementById('modulesToGenerateCount');
    if (countEl) {
        countEl.textContent = `${pendingCount} pending`;
    }
}

/**
 * Render the list of module blueprints
 */
function renderModulesToGenerateList() {
    const container = document.getElementById('modulesToGenerateList');
    if (!container) return;
    
    if (modulesToGenerate.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #6b7c8f;">
                <p style="font-size: 48px; margin-bottom: 12px;">📝</p>
                <p>No module blueprints yet.</p>
                <p style="font-size: 13px;">Upload an Excel file to create module blueprints in bulk.</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = modulesToGenerate.map(mtg => `
        <div class="mtg-card" data-id="${mtg.id}" style="background: white; border-radius: 10px; padding: 14px; margin-bottom: 10px; border-left: 4px solid ${mtg.has_been_generated ? '#10B981' : '#6366F1'}; transition: all 0.2s;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div style="flex: 1;">
                    <h4 style="font-size: 14px; font-weight: 600; margin: 0 0 4px 0; color: #1f2937;">${escapeHtmlMtg(mtg.module_title)}</h4>
                    <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 6px;">
                        ${mtg.cycle ? `<span style="background: #E0E7FF; color: #4338CA; padding: 2px 8px; border-radius: 4px; font-size: 11px;">${escapeHtmlMtg(mtg.cycle)}</span>` : ''}
                        ${mtg.week_number ? `<span style="background: #FEF3C7; color: #92400E; padding: 2px 8px; border-radius: 4px; font-size: 11px;">Week ${mtg.week_number}</span>` : ''}
                        ${mtg.age_range ? `<span style="background: #F3F4F6; color: #374151; padding: 2px 8px; border-radius: 4px; font-size: 11px;">Ages ${escapeHtmlMtg(mtg.age_range)}</span>` : ''}
                    </div>
                    ${mtg.super_skills ? `<p style="font-size: 12px; color: #6b7c8f; margin: 0;">${mtg.super_skills.name}</p>` : ''}
                </div>
                <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 4px;">
                    ${mtg.has_been_generated ? 
                        '<span style="background: #D1FAE5; color: #065F46; padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 600;">✓ Generated</span>' : 
                        '<span style="background: #EEF2FF; color: #4338CA; padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 600;">Pending</span>'
                    }
                    <button onclick="event.stopPropagation(); deleteModuleToGenerate('${mtg.id}')" style="background: none; border: none; color: #EF4444; cursor: pointer; font-size: 12px; padding: 4px;">🗑️</button>
                </div>
            </div>
        </div>
    `).join('');
}

/**
 * Helper function to escape HTML
 */
function escapeHtmlMtg(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ============================================
// FORM FUNCTIONS
// ============================================

/**
 * Select a module blueprint and populate the form
 */
function selectModuleToGenerate(id) {
    const mtg = modulesToGenerate.find(m => m.id === id);
    if (!mtg) return;
    if (!document.getElementById('moduleContentCreatorForm')) return;
    
    // Highlight selected card
    document.querySelectorAll('.mtg-card').forEach(card => {
        card.style.boxShadow = card.dataset.id === id ? '0 0 0 2px #6366F1' : 'none';
    });
    
    // Populate form fields
    document.getElementById('mtgCycle').value = mtg.cycle || '';
    document.getElementById('mtgWeekNumber').value = mtg.week_number || '';
    document.getElementById('mtgAgeRange').value = mtg.age_range || '';
    document.getElementById('mtgModuleTitle').value = mtg.module_title || '';
    document.getElementById('mtgSuperSkill').value = mtg.super_skill_id || '';
    document.getElementById('mtgCoreTheory').value = mtg.core_theory || '';
    document.getElementById('mtgBrainTownAnalogy').value = mtg.brain_town_analogy || '';
    document.getElementById('mtgAIContentPrompt').value = mtg.ai_content_prompt || '';
    
    // Update sub-skills dropdown based on super skill
    if (mtg.super_skill_id) {
        onMtgSuperSkillChange().then(() => {
            const subSkillEl = document.getElementById('mtgSubSkill');
            if (subSkillEl && mtg.sub_skill_id) {
                subSkillEl.value = mtg.sub_skill_id;
            }
        });
    }
    
    // Store selected ID for updates
    document.getElementById('moduleContentCreatorForm').dataset.editingId = id;
}

/**
 * Save module blueprint to database
 */
async function saveModuleToGenerate(event) {
    event.preventDefault();
    
    const sb = getSupabase();
    if (!sb) return;
    
    const form = document.getElementById('moduleContentCreatorForm');
    const editingId = form.dataset.editingId;
    
    const moduleData = {
        cycle: document.getElementById('mtgCycle').value || null,
        week_number: document.getElementById('mtgWeekNumber').value ? parseInt(document.getElementById('mtgWeekNumber').value) : null,
        age_range: document.getElementById('mtgAgeRange').value || null,
        module_title: document.getElementById('mtgModuleTitle').value,
        super_skill_id: document.getElementById('mtgSuperSkill').value || null,
        sub_skill_id: document.getElementById('mtgSubSkill').value || null,
        core_theory: document.getElementById('mtgCoreTheory').value || null,
        brain_town_analogy: document.getElementById('mtgBrainTownAnalogy').value || null,
        ai_content_prompt: document.getElementById('mtgAIContentPrompt').value || null
    };
    
    if (!moduleData.module_title) {
        alert('Module title is required');
        return;
    }
    
    try {
        let result;
        if (editingId) {
            // Update existing
            result = await sb
                .from('modules_to_generate')
                .update(moduleData)
                .eq('id', editingId)
                .select();
        } else {
            // Insert new
            result = await sb
                .from('modules_to_generate')
                .insert(moduleData)
                .select();
        }
        
        if (result.error) {
            throw result.error;
        }
        
        alert(editingId ? '✓ Module blueprint updated!' : '✓ Module blueprint saved!');
        clearMtgForm();
        loadModulesToGenerate();
        
    } catch (error) {
        console.error('Error saving module blueprint:', error);
        alert('Failed to save: ' + error.message);
    }
}

/**
 * Clear the form
 */
function clearMtgForm() {
    document.getElementById('moduleContentCreatorForm').reset();
    document.getElementById('moduleContentCreatorForm').dataset.editingId = '';
    document.querySelectorAll('.mtg-card').forEach(card => {
        card.style.boxShadow = 'none';
    });
}

/**
 * Delete a module blueprint
 */
async function deleteModuleToGenerate(id) {
    if (!confirm('Are you sure you want to delete this module blueprint?')) return;
    
    const sb = getSupabase();
    if (!sb) return;
    
    try {
        const { error } = await sb
            .from('modules_to_generate')
            .delete()
            .eq('id', id);
        
        if (error) throw error;
        
        alert('✓ Module blueprint deleted');
        clearMtgForm();
        loadModulesToGenerate();
        
    } catch (error) {
        console.error('Error deleting module blueprint:', error);
        alert('Failed to delete: ' + error.message);
    }
}

/**
 * Populate Super Skill dropdown for Module Content Creator
 */
async function populateMtgSuperSkillDropdown() {
    const sb = getSupabase();
    if (!sb) return;
    
    const dropdown = document.getElementById('mtgSuperSkill');
    if (!dropdown) return;
    
    try {
        // Fetch super skills from database
        const { data: skills, error } = await sb
            .from('super_skills')
            .select('*')
            .order('name');
        
        if (error) {
            console.error('Error loading super skills:', error);
            return;
        }
        
        dropdown.innerHTML = '<option value="">Select Super Skill...</option>' +
            (skills || []).map(s => `<option value="${s.id}">${s.name}</option>`).join('');
            
    } catch (error) {
        console.error('Error populating super skills dropdown:', error);
    }
}

/**
 * Handle Super Skill change to populate Sub-Skills
 */
async function onMtgSuperSkillChange() {
    const sb = getSupabase();
    if (!sb) return;
    
    const superSkillId = document.getElementById('mtgSuperSkill').value;
    const subSkillDropdown = document.getElementById('mtgSubSkill');
    
    if (!subSkillDropdown) return;
    
    if (!superSkillId) {
        subSkillDropdown.innerHTML = '<option value="">Select sub-skill...</option>';
        return;
    }
    
    try {
        const { data: subSkills, error } = await sb
            .from('sub_skills')
            .select('*')
            .eq('super_skill_id', superSkillId)
            .order('name');
        
        if (error) {
            console.error('Error loading sub-skills:', error);
            return;
        }
        
        subSkillDropdown.innerHTML = '<option value="">Select sub-skill...</option>' +
            (subSkills || []).map(s => `<option value="${s.id}">${s.name}</option>`).join('');
            
    } catch (error) {
        console.error('Error populating sub-skills dropdown:', error);
    }
}

// ============================================
// EXCEL UPLOAD FUNCTIONS
// ============================================

/**
 * Handle Excel file upload
 */
async function handleExcelUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    document.getElementById('excelFileName').textContent = file.name;
    
    // Load SheetJS library if not already loaded
    if (!window.XLSX) {
        const script = document.createElement('script');
        script.src = 'https://cdn.sheetjs.com/xlsx-0.20.1/package/dist/xlsx.full.min.js';
        script.onload = () => parseExcelFile(file);
        document.head.appendChild(script);
    } else {
        parseExcelFile(file);
    }
}

/**
 * Parse the Excel file
 */
function parseExcelFile(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(firstSheet);
            
            if (jsonData.length === 0) {
                alert('No data found in the Excel file');
                return;
            }
            
            parsedExcelData = jsonData;
            
            // Show preview
            document.getElementById('excelRowCount').textContent = jsonData.length;
            
            // Show column mapping
            const columns = Object.keys(jsonData[0]);
            const mappingHtml = columns.map(col => {
                const mappedField = mapColumnName(col);
                return `<span style="display: inline-block; margin: 2px 4px; padding: 2px 6px; background: ${mappedField ? '#D1FAE5' : '#FEE2E2'}; border-radius: 4px;">${col} → ${mappedField || '?'}</span>`;
            }).join('');
            document.getElementById('excelColumnMapping').innerHTML = mappingHtml;
            
            document.getElementById('excelPreview').style.display = 'block';
            
        } catch (error) {
            console.error('Error parsing Excel:', error);
            alert('Failed to parse Excel file: ' + error.message);
        }
    };
    reader.readAsArrayBuffer(file);
}

/**
 * Map Excel column names to database fields
 */
function mapColumnName(columnName) {
    const mappings = {
        'cycle': 'cycle',
        'week': 'week_number',
        'week number': 'week_number',
        'week_number': 'week_number',
        'age range': 'age_range',
        'age_range': 'age_range',
        'agerange': 'age_range',
        'module title': 'module_title',
        'module_title': 'module_title',
        'title': 'module_title',
        'super skill': 'super_skill_id',
        'super_skill': 'super_skill_id',
        'super skills': 'super_skill_id',
        'super_skills': 'super_skill_id',
        'sub skill': 'sub_skill_id',
        'sub_skill': 'sub_skill_id',
        'sub skills': 'sub_skill_id',
        'sub_skills': 'sub_skill_id',
        'core theory': 'core_theory',
        'core_theory': 'core_theory',
        'core neuroscience/psychology theory': 'core_theory',
        'brain town analogy': 'brain_town_analogy',
        'brain_town_analogy': 'brain_town_analogy',
        'braintownanalogy': 'brain_town_analogy',
        'ai content prompt': 'ai_content_prompt',
        'ai_content_prompt': 'ai_content_prompt',
        'ai content prompt (with theory)': 'ai_content_prompt',
        'prompt': 'ai_content_prompt'
    };
    
    const normalized = columnName.toLowerCase().trim();
    return mappings[normalized] || null;
}

/**
 * Get skill ID by name from the database
 * @param {string} skillName
 * @param {string} tableName - 'super_skills' or 'sub_skills'
 * @returns {Promise<string|null>} UUID of the skill or null if not found
 */
async function getSkillIdByName(skillName, tableName) {
    if (!skillName) return null;
    const sb = getSupabase();
    if (!sb) return null;

    try {
        const { data, error } = await sb
            .from(tableName)
            .select('id')
            .ilike('name', skillName)
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found
            console.error(`Error looking up ${tableName} by name '${skillName}':`, error);
            return null;
        }
        return data ? data.id : null;
    } catch (error) {
        console.error(`Unexpected error in getSkillIdByName for ${tableName} '${skillName}':`, error);
        return null;
    }
} // <--- Added missing closing brace here

/**
 * Import parsed Excel data
 */
async function importExcelData() {
    if (!parsedExcelData || parsedExcelData.length === 0) {
        alert('No data to import');
        return;
    }
    
    const sb = getSupabase();
    if (!sb) return;
    
    // Process rows and convert skill names to IDs
    const processedRows = await Promise.all(parsedExcelData.map(async row => {
        const mapped = {};
        for (const [col, value] of Object.entries(row)) {
            const field = mapColumnName(col);
            if (field) {
                mapped[field] = value;
            }
        }
        
        // Convert skill names to IDs
        if (mapped.super_skill_id && typeof mapped.super_skill_id === 'string') {
            mapped.super_skill_id = await getSkillIdByName(mapped.super_skill_id, 'super_skills');
        }
        
        if (mapped.sub_skill_id && typeof mapped.sub_skill_id === 'string') {
            mapped.sub_skill_id = await getSkillIdByName(mapped.sub_skill_id, 'sub_skills');
        }
        
        return mapped;
    }));
    
    // Filter rows with titles and valid skill mappings
    const validRows = processedRows.filter(row => row.module_title);
    
    if (validRows.length === 0) {
        alert('No valid rows found. Make sure you have a "Module Title" column.');
        return;
    }
    
    try {
        const { data, error } = await sb
            .from('modules_to_generate')
            .insert(validRows)
            .select();
        
        if (error) throw error;
        
        alert(`✓ Successfully imported ${data.length} module blueprints!`);
        
        // Reset
        parsedExcelData = null;
        document.getElementById('excelFileInput').value = '';
        document.getElementById('excelFileName').textContent = 'No file selected';
        document.getElementById('excelPreview').style.display = 'none';
        
        loadModulesToGenerate();
        
    } catch (error) {
        console.error('Error importing Excel data:', error);
        alert('Failed to import: ' + error.message);
    }
}

/**
 * Download Excel template
 */
function downloadExcelTemplate() {
    if (!window.XLSX) {
        const script = document.createElement('script');
        script.src = 'https://cdn.sheetjs.com/xlsx-0.20.1/package/dist/xlsx.full.min.js';
        script.onload = createAndDownloadTemplate;
        document.head.appendChild(script);
    } else {
        createAndDownloadTemplate();
    }
}

/**
 * Create and download the Excel template
 */
function createAndDownloadTemplate() {
    const templateData = [
        {
            'Cycle': 'Cycle 1',
            'Week Number': 1,
            'Age Range': '7-11',
            'Module Title': 'Example Module Title',
            'Super Skill': 'Example Super Skill Name',
            'Sub Skill': 'Example Sub Skill Name',
            'Core Theory': 'Theory of Mind (example)',
            'Brain Town Analogy': 'Brain town analogy example',
            'AI Content Prompt': 'Full AI prompt goes here...'
        }
    ];
    
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Module Blueprints');
    XLSX.writeFile(wb, 'module_blueprints_template.xlsx');
}

// ============================================
// ADD MODULE MODAL INTEGRATION
// ============================================

// ... (rest of the code remains the same)
/**
 * Load pending blueprints into the dropdown in Add Module modal
 */
async function loadPendingBlueprintsDropdown() {
    const sb = getSupabase();
    if (!sb) return;
    
    const dropdown = document.getElementById('moduleBlueprintSelect');
    if (!dropdown) return;
    
    try {
        const { data, error } = await sb
            .from('modules_to_generate')
            .select('id, module_title, cycle, week_number, super_skill_id')
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
                    bp.module_title
                ].filter(Boolean).join(' - ');
                return `<option value="${bp.id}">${label}</option>`;
            }).join('');
            
    } catch (error) {
        console.error('Error loading blueprints dropdown:', error);
    }
}

/**
 * Load a module blueprint into the Add Module form
 */
async function loadModuleBlueprintIntoForm() {
    const sb = getSupabase();
    if (!sb) return;
    
    const blueprintId = document.getElementById('moduleBlueprintSelect').value;
    if (!blueprintId) return;
    
    try {
        const { data: blueprint, error } = await sb
            .from('modules_to_generate')
            .select('*')
            .eq('id', blueprintId)
            .single();
        
        if (error || !blueprint) {
            console.error('Error loading blueprint:', error);
            return;
        }
        
        // Store the blueprint ID for later (to mark as generated)
        document.getElementById('addModuleForm').dataset.blueprintId = blueprintId;
        
        // Populate form fields
        document.getElementById('newModuleTitle').value = blueprint.module_title || '';
        document.getElementById('newModuleAgeRange').value = blueprint.age_range || '';
        document.getElementById('newModuleCoreTheory').value = blueprint.core_theory || '';
        document.getElementById('newModuleBrainTownAnalogy').value = blueprint.brain_town_analogy || '';
        
        console.log(' Blueprint loaded in module-content-creator.js');
        console.log('Core Theory:', blueprint.core_theory);
        console.log('Brain Town Analogy:', blueprint.brain_town_analogy);
        
        // Set Super Skill and trigger change
        if (blueprint.super_skill_id) {
            document.getElementById('newModuleSuperSkill').value = blueprint.super_skill_id;
            if (typeof window.onSuperSkillChange === 'function') {
                await window.onSuperSkillChange();
            }
            
            // Set Sub-Skill after dropdown is populated
            setTimeout(() => {
                if (blueprint.sub_skill_id) {
                    document.getElementById('newModuleSubSkill').value = blueprint.sub_skill_id;
                }
            }, 100);
        }
        
        // Set Cycle
        if (blueprint.cycle) {
            const cycleSelect = document.getElementById('newModuleCycle');
            if (cycleSelect) {
                // Try to find matching option
                for (let opt of cycleSelect.options) {
                    if (opt.text.toLowerCase().includes(blueprint.cycle.toLowerCase()) || 
                        opt.value.toLowerCase().includes(blueprint.cycle.toLowerCase())) {
                        cycleSelect.value = opt.value;
                        break;
                    }
                }
            }
        }
        
        // Set Week Number
        if (blueprint.week_number) {
            const orderEl = document.getElementById('newModuleOrder');
            if (orderEl) orderEl.value = blueprint.week_number;
        }
        
        // Build the AI Content Brief from blueprint data
        const contentBrief = buildContentBriefFromBlueprint(blueprint);
        const briefEl = document.getElementById('newModuleContentBrief');
        if (briefEl) briefEl.value = contentBrief;
        
        // Show loaded status
        const statusEl = document.getElementById('blueprintLoadedStatus');
        if (statusEl) statusEl.style.display = 'block';
        
    } catch (error) {
        console.error('Error loading blueprint into form:', error);
    }
}

/**
 * Build AI content brief from blueprint data
 */
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
    if (blueprint.core_theory) {
        parts.push(`\nCore Theory: ${blueprint.core_theory}`);
    }
    if (blueprint.brain_town_analogy) {
        parts.push(`\nBrain Town Analogy: ${blueprint.brain_town_analogy}`);
    }
    
    return parts.join('\n');
}

/**
 * Mark blueprint as generated after saving a module
 */
async function markBlueprintAsGenerated(blueprintId, moduleId) {
    if (!blueprintId) return;
    
    const sb = getSupabase();
    if (!sb) return;
    
    try {
        await sb
            .from('modules_to_generate')
            .update({
                has_been_generated: true,
                generated_module_id: moduleId,
                generated_at: new Date().toISOString()
            })
            .eq('id', blueprintId);
        
        console.log('[Admin] Blueprint marked as generated:', blueprintId);
    } catch (error) {
        console.error('Error marking blueprint as generated:', error);
    }
}

// ============================================
// EXPOSE FUNCTIONS TO WINDOW
// ============================================
window.loadModulesToGenerate = loadModulesToGenerate;
window.selectModuleToGenerate = selectModuleToGenerate;
window.saveModuleToGenerate = saveModuleToGenerate;
window.clearMtgForm = clearMtgForm;
window.deleteModuleToGenerate = deleteModuleToGenerate;
window.populateMtgSuperSkillDropdown = populateMtgSuperSkillDropdown;
window.onMtgSuperSkillChange = onMtgSuperSkillChange;
window.handleExcelUpload = handleExcelUpload;
window.importExcelData = importExcelData;
window.downloadExcelTemplate = downloadExcelTemplate;
window.loadPendingBlueprintsDropdown = loadPendingBlueprintsDropdown;
window.loadModuleBlueprintIntoForm = loadModuleBlueprintIntoForm;
window.markBlueprintAsGenerated = markBlueprintAsGenerated;
