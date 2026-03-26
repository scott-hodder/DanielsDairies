// ================================================================================
// MODULE CUSTOMISATION TAB - Editing, bulk actions, filters, categories
// ================================================================================
import {
    supabase,
    allModules, setAllModules, selectedModule, setSelectedModule,
    categoryColors, setCategoryColors,
    customisationSelectedModules, isBulkDeletingModules, setIsBulkDeletingModules,
    getModuleKey, formatCategoryLabel, getAgeRangeLabel,
    updateStats, loadAllModules, loadCategoryColors
} from './adminPage.js';

let superSkillsData = [];
let subSkillsData = [];
let cyclesData = [];

// State for customisation filters
let customisationFilter = 'all';
let customisationCategoryFilter = 'all';
let customisationSeriesFilter = 'all';
let customisationSearchTerm = '';

let availableCategories = [];

// ================================================================================
// FILTER CONTROLS
// ================================================================================
window.setCustomisationFilter = function(filter) {
    customisationFilter = filter;
    document.querySelectorAll('#moduleCustomisationTab .filter-btn').forEach(btn => btn.classList.remove('active'));
    (typeof window !== 'undefined' ? window.event?.target : null)?.classList?.add('active');
    renderAllModulesList();
};

window.filterCustomisationModules = function() {
    customisationSearchTerm = document.getElementById('customisationModuleSearch').value.toLowerCase();
    customisationCategoryFilter = document.getElementById('customisationCategoryFilter').value;
    customisationSeriesFilter = document.getElementById('customisationSeriesFilter').value;
    renderAllModulesList();
};

function populateCustomisationFilters() {
    populateCategoryDropdowns();
    const seriesFilter = document.getElementById('customisationSeriesFilter');
    const series = [...new Set(allModules.map(m => m.series).filter(Boolean))].sort();
    if (seriesFilter) {
        seriesFilter.innerHTML = '<option value="all">All Series</option>' + series.map(s => `<option value="${s}">${s}</option>`).join('');
    }
}

function populateCategoryDropdown() {
    const categoryFilter = document.getElementById('categoryFilter');
    if (!categoryFilter) return;
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

function populateCategoryDropdowns() {
    populateCategoryDropdown();
    const customisationCategory = document.getElementById('customisationCategoryFilter');
    if (customisationCategory) {
        const previousValue = customisationCategory.value || 'all';
        const categories = Array.isArray(window.generalCategories) && window.generalCategories.length > 0
            ? window.generalCategories.map(cat => cat.name).filter(Boolean).sort()
            : Array.from(new Set(allModules.map(m => m.category).filter(Boolean))).sort();
        customisationCategory.innerHTML = '<option value="all">All Categories</option>' +
            categories.map(category => `<option value="${category}">${formatCategoryLabel(category)}</option>`).join('');
        customisationCategory.value = categories.includes(previousValue) ? previousValue : 'all';
    }
}

// ================================================================================
// RENDER ALL MODULES LIST
// ================================================================================
function renderAllModulesList() {
    const container = document.getElementById('allModulesList');
    if (!container) return;

    if (allModules.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>No modules found</p></div>';
        return;
    }

    let filteredModules = [...allModules].sort((a, b) => {
        if (a.created_at && b.created_at) return new Date(b.created_at) - new Date(a.created_at);
        return 0;
    });

    if (customisationSearchTerm) filteredModules = filteredModules.filter(m => m.title.toLowerCase().includes(customisationSearchTerm));
    if (customisationCategoryFilter !== 'all') filteredModules = filteredModules.filter(m => m.category === customisationCategoryFilter);
    if (customisationSeriesFilter !== 'all') filteredModules = filteredModules.filter(m => m.series === customisationSeriesFilter);
    if (customisationFilter === 'active') filteredModules = filteredModules.filter(m => m.is_active);
    else if (customisationFilter === 'inactive') filteredModules = filteredModules.filter(m => !m.is_active);

    if (filteredModules.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🔍</div><p>No modules match your filters</p></div>';
        return;
    }

    container.innerHTML = filteredModules.map(module => {
        const borderColor = categoryColors[module.category] || '#4c6c96';
        const statusBadge = module.is_active ? '<span class="status-badge active">Active</span>' : '<span class="status-badge inactive">Inactive</span>';
        const moduleIdKey = getModuleKey(module.id);
        const isSelectedForEdit = selectedModule && selectedModule.id === module.id;
        const isBulkSelected = customisationSelectedModules.has(moduleIdKey);

        return `
            <div class="module-item ${isSelectedForEdit ? 'selected' : ''} ${isBulkSelected ? 'bulk-selected' : ''}" 
                 id="customisation-module-${moduleIdKey}"
                 style="border-left-color: ${borderColor}"
                 onclick="selectModuleForEdit('${moduleIdKey}')">
                <div class="module-header">
                    <input type="checkbox" class="module-checkbox customisation-checkbox" data-module-id="${moduleIdKey}" ${isBulkSelected ? 'checked' : ''} onclick="event.stopPropagation();">
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
            toggleCustomisationSelection(this.getAttribute('data-module-id'));
        });
    });

    updateCustomisationBulkActions();
}

// Register on window for adminPage.js
window._adminPopulateCustomisationFilters = populateCustomisationFilters;
window._adminRenderAllModulesList = renderAllModulesList;

// ================================================================================
// BULK SELECTION
// ================================================================================
function toggleCustomisationSelection(moduleId) {
    if (!moduleId) return;
    if (customisationSelectedModules.has(moduleId)) customisationSelectedModules.delete(moduleId);
    else customisationSelectedModules.add(moduleId);

    const moduleElement = document.getElementById(`customisation-module-${moduleId}`);
    if (moduleElement) {
        moduleElement.classList.toggle('bulk-selected');
        const checkbox = moduleElement.querySelector('.customisation-checkbox');
        if (checkbox) checkbox.checked = customisationSelectedModules.has(moduleId);
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
    if (selectedCount) selectedCount.textContent = count;
    if (bulkActions) bulkActions.style.display = count > 0 ? 'flex' : 'none';
    if (deleteBtn) { deleteBtn.disabled = count === 0 || isBulkDeletingModules; deleteBtn.innerHTML = isBulkDeletingModules ? '<span class="loading-spinner"></span>Deleting...' : '🗑️ Delete Selected'; }
    if (activateBtn) activateBtn.disabled = count === 0 || isBulkDeletingModules;
    if (deactivateBtn) deactivateBtn.disabled = count === 0 || isBulkDeletingModules;
}

window.clearCustomisationSelection = function() {
    customisationSelectedModules.clear();
    renderAllModulesList();
};

// ================================================================================
// BULK ACTIONS
// ================================================================================
window.bulkDeleteModules = async function() {
    if (customisationSelectedModules.size === 0 || isBulkDeletingModules) return;
    if (!confirm(`⚠️ Delete ${customisationSelectedModules.size} selected module(s)?\n\nThis will remove the modules, their child/parent assignments, and stored HTML. This action cannot be undone.`)) return;

    setIsBulkDeletingModules(true);
    updateCustomisationBulkActions();
    const moduleIds = Array.from(customisationSelectedModules);
    let deletedCount = 0;

    for (const moduleId of moduleIds) {
        const module = allModules.find(m => getModuleKey(m.id) === moduleId);
        if (!module) continue;
        try {
            const { data: childAssignments } = await supabase.from('child_modules').select('id').eq('module_id', module.id);
            if (childAssignments) for (const a of childAssignments) await supabase.from('child_modules').delete().eq('id', a.id);
            const { data: parentAssignments } = await supabase.from('parent_modules').select('id').eq('module_id', module.id);
            if (parentAssignments) for (const a of parentAssignments) await supabase.from('parent_modules').delete().eq('id', a.id);
            if (module.storage_path) await supabase.storage.from('modules').remove([module.storage_path]);
            await supabase.from('modules_to_generate').delete().eq('generated_module_id', module.id);
            const { error: moduleError } = await supabase.from('modules').delete().eq('id', module.id);
            if (moduleError) { console.error('[Admin] Failed to delete module:', moduleError); continue; }
            deletedCount++;
            customisationSelectedModules.delete(moduleId);
            setAllModules(allModules.filter(m => m.id !== module.id));
            if (selectedModule && selectedModule.id === module.id) {
                setSelectedModule(null);
                document.getElementById('moduleEditForm').style.display = 'none';
                document.getElementById('moduleEditPlaceholder').style.display = 'block';
            }
        } catch (error) {
            console.error('[Admin] Bulk delete error:', error);
            alert(`Failed to delete module "${module.title}": ${error.message}`);
        }
    }

    setIsBulkDeletingModules(false);
    customisationSelectedModules.clear();
    updateStats();
    await loadAllModules();
    updateCustomisationBulkActions();
    alert(`✓ Deleted ${deletedCount} module(s).`);
};

window.bulkActivateModules = async function() {
    if (customisationSelectedModules.size === 0 || isBulkDeletingModules) return;
    if (!confirm(`✓ Activate ${customisationSelectedModules.size} selected module(s)?`)) return;
    setIsBulkDeletingModules(true);
    updateCustomisationBulkActions();
    let activatedCount = 0;
    for (const moduleId of Array.from(customisationSelectedModules)) {
        try {
            const module = allModules.find(m => m.id === moduleId);
            if (!module) continue;
            const { error } = await supabase.from('modules').update({ is_active: true }).eq('id', moduleId);
            if (error) continue;
            module.is_active = true;
            activatedCount++;
        } catch (error) { console.error('[Admin] Bulk activate error:', error); }
    }
    setIsBulkDeletingModules(false);
    customisationSelectedModules.clear();
    updateStats();
    renderAllModulesList();
    updateCustomisationBulkActions();
    alert(`✓ Activated ${activatedCount} module(s).`);
};

window.bulkDeactivateModules = async function() {
    if (customisationSelectedModules.size === 0 || isBulkDeletingModules) return;
    if (!confirm(`✗ Deactivate ${customisationSelectedModules.size} selected module(s)?`)) return;
    setIsBulkDeletingModules(true);
    updateCustomisationBulkActions();
    let deactivatedCount = 0;
    for (const moduleId of Array.from(customisationSelectedModules)) {
        try {
            const module = allModules.find(m => m.id === moduleId);
            if (!module) continue;
            const { error } = await supabase.from('modules').update({ is_active: false }).eq('id', moduleId);
            if (error) continue;
            module.is_active = false;
            deactivatedCount++;
        } catch (error) { console.error('[Admin] Bulk deactivate error:', error); }
    }
    setIsBulkDeletingModules(false);
    customisationSelectedModules.clear();
    updateStats();
    renderAllModulesList();
    updateCustomisationBulkActions();
    alert(`✓ Deactivated ${deactivatedCount} module(s).`);
};

// ================================================================================
// SELECT MODULE FOR EDITING
// ================================================================================
window.selectModuleForEdit = function(moduleId) {
    const module = allModules.find(m => m.id === moduleId);
    setSelectedModule(module || null);
    if (!module) { console.error('Module not found with ID:', moduleId); return; }

    renderAllModulesList();
    document.getElementById('editModuleTitle').textContent = `Edit: ${module.title}`;
    document.getElementById('moduleEditForm').style.display = 'block';
    document.getElementById('moduleEditPlaceholder').style.display = 'none';

    document.getElementById('editTitle').value = module.title || '';
    const editAgeRangeSelect = document.getElementById('editAgeRange');
    if (editAgeRangeSelect) {
        const ageValue = module.age_range || '';
        editAgeRangeSelect.value = ageValue;
        if (ageValue && !Array.from(editAgeRangeSelect.options).some(option => option.value === ageValue)) {
            const option = document.createElement('option');
            option.value = ageValue;
            option.textContent = getAgeRangeLabel(ageValue) || ageValue;
            editAgeRangeSelect.appendChild(option);
            editAgeRangeSelect.value = ageValue;
        }
    }
    document.getElementById('editOrder').value = module.week_number || '';
    document.getElementById('editXPReward').value = module.xp_reward ?? 100;
    document.getElementById('editStarsReward').value = module.stars_reward ?? 10;
    document.getElementById('editCharacter').value = module.character_name || '';
    document.getElementById('editBrainTownAnalogy').value = module.brain_town_analogy || '';
    document.getElementById('editContentBrief').value = module.additional_context || module.content_brief || '';

    const editSuperSkill = document.getElementById('editSuperSkill');
    if (editSuperSkill) { editSuperSkill.value = module.super_skill_id || ''; window.onEditSuperSkillChange(); }
    const editSubSkill = document.getElementById('editSubSkill');
    if (editSubSkill) editSubSkill.value = module.sub_skill_id || '';
    const editCycle = document.getElementById('editCycle');
    if (editCycle) editCycle.value = module.cycle_id || '';

    const editCoreTheory = document.getElementById('editCoreTheorySelect');
    if (editCoreTheory && module.core_theory_id) {
        editCoreTheory.value = module.core_theory_id;
        if (typeof window._adminUpdateTheoryPreview === 'function') {
            window._adminUpdateTheoryPreview({ selectId: 'editCoreTheorySelect', previewId: 'editTheoryPreview', nameId: 'editTheoryPreviewName', descriptionId: 'editTheoryPreviewDescription' });
        }
    }
};

// ================================================================================
// SAVE MODULE CHANGES
// ================================================================================
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

    if ('core_theory_id' in selectedModule) updates.core_theory_id = document.getElementById('editCoreTheorySelect')?.value || null;
    if ('brain_town_analogy' in selectedModule) updates.brain_town_analogy = document.getElementById('editBrainTownAnalogy')?.value || null;
    if ('additional_context' in selectedModule) updates.additional_context = document.getElementById('editContentBrief')?.value || null;
    if ('content_brief' in selectedModule) updates.content_brief = document.getElementById('editContentBrief')?.value || null;

    const { error: moduleError } = await supabase.from('modules').update(updates).eq('id', selectedModule.id);
    if (moduleError) { console.error('Error updating module:', moduleError); alert('Failed to save module changes'); return; }

    Object.assign(selectedModule, updates);
};

// ================================================================================
// DELETE MODULE
// ================================================================================
window.deleteModule = async function() {
    if (!selectedModule) return;
    if (!confirm(`⚠️ Are you sure you want to delete this module?\n\nModule: ${selectedModule.title}\nCode: ${selectedModule.code}\n\nThis action cannot be undone!`)) return;

    try {
        const moduleToDelete = selectedModule;
        const { data: assignments } = await supabase.from('child_modules').select('id').eq('module_id', moduleToDelete.id);
        if (assignments) for (const a of assignments) await supabase.from('child_modules').delete().eq('id', a.id);
        const { data: parentAssignments } = await supabase.from('parent_modules').select('id').eq('module_id', moduleToDelete.id);
        if (parentAssignments) for (const a of parentAssignments) await supabase.from('parent_modules').delete().eq('id', a.id);
        if (moduleToDelete.storage_path) await supabase.storage.from('modules').remove([moduleToDelete.storage_path]);
        await supabase.from('modules_to_generate').delete().eq('generated_module_id', moduleToDelete.id);
        const { error } = await supabase.from('modules').delete().eq('id', moduleToDelete.id);
        if (error) throw error;

        setSelectedModule(null);
        document.getElementById('moduleEditForm').style.display = 'none';
        document.getElementById('moduleEditPlaceholder').style.display = 'block';
        alert('✓ Module deleted successfully!');
        window.location.reload();
    } catch (error) {
        console.error('Error deleting module:', error);
        alert('Failed to delete module: ' + error.message);
    }
};

// ================================================================================
// ADD CATEGORY MODAL (from edit panel)
// ================================================================================
function populateEditCategoryDropdown() {
    const categorySelect = document.getElementById('editCategory');
    if (!categorySelect) return;
    availableCategories = Array.from(new Set(allModules.map(m => m.category).filter(Boolean))).sort();
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
    if (!color.startsWith('#')) color = `#${color}`;
    if (/^#([0-9a-fA-F]{6})$/.test(color)) return color.toLowerCase();
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
    }
};

window.closeAddCategoryModal = function() {
    const modal = document.getElementById('addCategoryModal');
    modal?.classList.remove('active');
};

function syncCategoryColorInputs(source) {
    const colorPicker = document.getElementById('addCategoryColorPicker');
    const colorHex = document.getElementById('addCategoryColorHex');
    if (source === 'picker') colorHex.value = colorPicker.value;
    else { const normalized = normalizeHexColor(colorHex.value); if (normalized) { colorHex.value = normalized; colorPicker.value = normalized; } }
}

document.getElementById('addCategoryColorPicker')?.addEventListener('input', () => syncCategoryColorInputs('picker'));
document.getElementById('addCategoryColorHex')?.addEventListener('blur', () => syncCategoryColorInputs('hex'));

window.handleAddCategorySubmit = async function(event) {
    event.preventDefault();
    const nameInput = document.getElementById('addCategoryName');
    const colorInput = document.getElementById('addCategoryColorHex');
    const categoryName = nameInput.value.trim();
    const categoryLower = categoryName.toLowerCase();
    if (!categoryName) { alert('Please enter a category name.'); return; }
    if (availableCategories.includes(categoryLower)) { alert('Category already exists!'); return; }
    const normalizedColor = normalizeHexColor(colorInput.value);
    if (!normalizedColor) { alert('Please enter a valid 6-digit hex color (e.g. #4c6c96).'); return; }

    const { error } = await supabase.from('category_colors').upsert({ category: categoryLower, color: normalizedColor }, { onConflict: 'category' });
    if (error) { console.error('[Admin] Failed to save category color:', error); alert('Failed to add category.'); return; }

    categoryColors[categoryLower] = normalizedColor;
    availableCategories.push(categoryLower);
    populateEditCategoryDropdown();
    const editCategory = document.getElementById('editCategory');
    if (editCategory) { editCategory.value = categoryLower; }

    const newModuleCategory = document.getElementById('newModuleCategory');
    if (newModuleCategory) {
        const option = document.createElement('option');
        option.value = categoryLower;
        option.textContent = categoryName.charAt(0).toUpperCase() + categoryName.slice(1);
        newModuleCategory.appendChild(option);
    }

    window.closeAddCategoryModal();
};

// Search filter for select options
function filterSelectOptions(selectElement, searchQuery) {
    const query = searchQuery.toLowerCase().trim();
    Array.from(selectElement.options).forEach(option => {
        option.style.display = option.textContent.toLowerCase().includes(query) ? '' : 'none';
    });
}