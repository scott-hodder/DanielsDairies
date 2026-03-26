// ================================================================================
// PARENT'S MODULES TAB - Parents list, children, module assignments
// ================================================================================
import {
    supabase,
    allChildren, allModules, allParents, setAllParents,
    selectedParent, setSelectedParent, selectedChild, setSelectedChild,
    currentFilter, setCurrentFilter,
    currentModuleAssignments, setCurrentModuleAssignments,
    selectedModules, categoryColors, formatCategoryLabel
} from './adminPage.js';

// ================================================================================
// LOAD ALL PARENTS
// ================================================================================
async function loadAllParents() {
    const { data: parentsData, error: parentsError } = await supabase
        .from('parent_profiles')
        .select('id, username')
        .order('username');

    if (parentsError) { console.error('Error loading parents:', parentsError); return; }
    setAllParents(parentsData || []);
    renderParentsList();
}

window._adminLoadAllParents = loadAllParents;

// ================================================================================
// RENDER PARENTS LIST
// ================================================================================
function renderParentsList() {
    const container = document.getElementById('parentsList');
    if (allParents.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>No parents found</p></div>';
        return;
    }
    container.innerHTML = allParents.map(parent => `
        <div class="child-item ${selectedParent?.id === parent.id ? 'active' : ''}" onclick="selectParent('${parent.id}')">
            <div class="child-name">👤 ${parent.username || 'Parent'}</div>
        </div>
    `).join('');
}

// ================================================================================
// RENDER PARENT'S CHILDREN
// ================================================================================
function renderParentChildren(parentId) {
    const container = document.getElementById('parentChildrenList');
    const childrenTitle = document.getElementById('childrenTitle');
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

// ================================================================================
// SELECT PARENT
// ================================================================================
window.selectParent = async function(parentId) {
    setSelectedParent(allParents.find(p => p.id === parentId));
    renderParentsList();
    renderParentChildren(parentId);
    await loadParentModules(parentId);
};

// ================================================================================
// LOAD PARENT'S MODULE ASSIGNMENTS
// ================================================================================
async function loadParentModules(parentId) {
    document.getElementById('modulesTitle').textContent = `Modules for ${selectedParent.username || 'Parent ' + selectedParent.id}`;
    document.getElementById('modulesList').innerHTML = '<div class="loading">Loading modules...</div>';
    document.getElementById('searchFilterContainer').style.display = 'block';

    const { data: assignments } = await supabase
        .from('parent_modules')
        .select('module_id, is_active')
        .eq('parent_id', parentId);

    const newAssignments = {};
    if (assignments) assignments.forEach(a => { newAssignments[a.module_id] = a.is_active; });
    allModules.forEach(m => { if (!(m.id in newAssignments)) newAssignments[m.id] = false; });
    setCurrentModuleAssignments(newAssignments);

    setCurrentFilter('all');
    selectedModules.clear();
    document.getElementById('moduleSearch').value = '';

    const categoryFilter = document.getElementById('categoryFilter');
    const seriesFilter = document.getElementById('seriesFilter');
    const categories = [...new Set(allModules.map(m => m.category).filter(Boolean))].sort();
    categoryFilter.innerHTML = '<option value="all">All Categories</option>' + categories.map(cat => `<option value="${cat}">${cat.charAt(0).toUpperCase() + cat.slice(1)}</option>`).join('');
    const series = [...new Set(allModules.map(m => m.series).filter(Boolean))].sort();
    seriesFilter.innerHTML = '<option value="all">All Series</option>' + series.map(s => `<option value="${s}">${s}</option>`).join('');

    filterModules();
}

// ================================================================================
// SELECT CHILD (legacy)
// ================================================================================
window.selectChild = async function(childId) {
    setSelectedChild(allChildren.find(c => c.id === childId));
    renderChildrenList();
    await loadChildModules(childId);
};

function renderChildrenList() {
    const container = document.getElementById('childrenList');
    if (!container) return;
    if (allChildren.length === 0) { container.innerHTML = '<div class="empty-state"><p>No children found</p></div>'; return; }
    container.innerHTML = allChildren.map(child => `
        <div class="child-item ${selectedChild?.id === child.id ? 'active' : ''}" onclick="selectChild('${child.id}')">
            <div class="child-name">${child.avatar || '👤'} ${child.name}</div>
            <div class="child-info">Parent: ${child.parent_username || 'Unknown'}</div>
            <div class="child-info">Stars: ${child.stars || 0} ⭐</div>
        </div>
    `).join('');
}

async function loadChildModules(childId) {
    document.getElementById('modulesTitle').textContent = `Modules for ${selectedChild.name}`;
    document.getElementById('modulesList').innerHTML = '<div class="loading">Loading modules...</div>';
    document.getElementById('searchFilterContainer').style.display = 'block';

    const { data: assignments } = await supabase.from('child_modules').select('module_id, is_active').eq('child_id', childId);
    const newAssignments = {};
    if (assignments) assignments.forEach(a => { newAssignments[a.module_id] = a.is_active; });
    setCurrentModuleAssignments(newAssignments);

    setCurrentFilter('all');
    selectedModules.clear();
    document.getElementById('moduleSearch').value = '';
    renderModules();
}

// ================================================================================
// RENDER MODULES
// ================================================================================
function renderModules() {
    const container = document.getElementById('modulesList');
    const searchTerm = document.getElementById('moduleSearch').value.toLowerCase();
    const selectedCategory = document.getElementById('categoryFilter').value;
    const selectedSeries = document.getElementById('seriesFilter').value;

    let filteredModules = allModules.filter(module => {
        const isGloballyActive = module.is_active;
        const isActiveForParent = currentModuleAssignments[module.id] !== undefined ? currentModuleAssignments[module.id] : false;
        const isActuallyActive = isGloballyActive && isActiveForParent;
        const matchesSearch = module.title.toLowerCase().includes(searchTerm);
        const matchesCategory = selectedCategory === 'all' || module.category === selectedCategory;
        const matchesSeries = selectedSeries === 'all' || module.series === selectedSeries;
        const matchesFilter = currentFilter === 'all' || (currentFilter === 'active' && isActuallyActive) || (currentFilter === 'inactive' && !isActuallyActive);
        return matchesSearch && matchesCategory && matchesSeries && matchesFilter;
    });

    filteredModules.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());

    if (filteredModules.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>No modules found</p></div>';
        return;
    }

    container.innerHTML = filteredModules.map(module => {
        const isGloballyActive = module.is_active;
        const isActiveForParent = currentModuleAssignments[module.id] !== undefined ? currentModuleAssignments[module.id] : false;
        const isActuallyActive = isGloballyActive && isActiveForParent;
        const isSelected = selectedModules.has(module.id);
        const borderColor = categoryColors[module.category] || '#4c6c96';

        let statusText, statusClass;
        if (!isGloballyActive && isActiveForParent) { statusText = 'Globally Inactive'; statusClass = 'inactive'; }
        else if (isGloballyActive && !isActiveForParent) { statusText = 'Parent Inactive'; statusClass = 'inactive'; }
        else if (!isGloballyActive && !isActiveForParent) { statusText = 'Inactive'; statusClass = 'inactive'; }
        else { statusText = 'Active'; statusClass = 'active'; }

        return `
            <div class="module-item ${isSelected ? 'selected' : ''}" id="module-${module.id}" style="border-left-color: ${borderColor}">
                <div class="module-header">
                    <input type="checkbox" class="module-checkbox" data-module-id="${module.id}" ${isSelected ? 'checked' : ''}>
                    <div class="module-title">${module.emoji || '📖'} ${module.title}</div>
                    <span class="status-badge ${statusClass}">${statusText}</span>
                </div>
            </div>
        `;
    }).join('');
    updateBulkActionsVisibility();
}

function updateBulkActionsVisibility() {
    const bulkActions = document.getElementById('bulkActions');
    const selectedCount = document.getElementById('selectedCount');
    if (selectedCount) selectedCount.textContent = selectedModules.size;
    if (bulkActions) bulkActions.style.display = selectedModules.size > 0 ? 'flex' : 'none';
}

window.filterModules = function() { renderModules(); };
window.setFilter = function(evt, filter) {
    setCurrentFilter(filter);
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    (evt && evt.target ? evt.target : (typeof window !== 'undefined' ? window.event?.target : null))?.classList?.add('active');
    renderModules();
};

// ================================================================================
// BULK ACTIVATE / DEACTIVATE (Parent Modules tab)
// ================================================================================
window.toggleModuleSelection = function(moduleId) {
    if (selectedModules.has(moduleId)) selectedModules.delete(moduleId);
    else selectedModules.add(moduleId);
    renderModules();
};

window.clearSelection = function() { selectedModules.clear(); renderModules(); };

window.bulkActivate = async function() {
    if (!selectedParent || selectedModules.size === 0) return;
    for (const moduleId of selectedModules) {
        await supabase.from('parent_modules').upsert({ parent_id: selectedParent.id, module_id: moduleId, is_active: true }, { onConflict: 'parent_id,module_id' });
        currentModuleAssignments[moduleId] = true;
    }
    selectedModules.clear();
    renderModules();
    alert('Modules activated for this parent.');
};

window.bulkDeactivate = async function() {
    if (!selectedParent || selectedModules.size === 0) return;
    for (const moduleId of selectedModules) {
        await supabase.from('parent_modules').upsert({ parent_id: selectedParent.id, module_id: moduleId, is_active: false }, { onConflict: 'parent_id,module_id' });
        currentModuleAssignments[moduleId] = false;
    }
    selectedModules.clear();
    renderModules();
    alert('Modules deactivated for this parent.');
};