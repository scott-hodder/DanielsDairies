// =======================================================================================
// ENHANCED MODULE BUILDER - JAVASCRIPT INTEGRATION
// =======================================================================================
// Add this code to the end of admin.js
// This provides the 5-step module builder interface

// =======================================================================================
// MODULE BUILDER STATE
// =======================================================================================

let moduleBuilderState = {
    currentStep: 1,
    formData: {
        // Step 1: Basics
        moduleTitle: '',
        superSkillId: '',
        subSkillId: '',
        ageRangeId: '',
        stage: '',
        cycleWeek: null,
        activityType: '',
        
        // Step 2: Theory
        primaryTheoryId: null,
        secondaryTheoryIds: [],
        neuroscienceConcept: '',
        brainTownMetaphor: '',
        bridgeFromModuleId: '',
        
        // Step 3: Diagnosis Adaptations
        diagnosisPathways: [],
        fasdDomainIds: [],
        fasdStrategies: '',
        
        // Step 4: Outcomes
        ndisDomainId: '',
        dssSediId: '',
        moduleObjective: '',
        facilitatorTip: '',
        reflectionPrompt: '',
        rewardText: ''
    },
    
    // Cached data
    superSkills: [],
    subSkills: [],
    ageRanges: [],
    theories: [],
    ndisDomains: [],
    sediCategories: [],
    fasdDomains: []
};

// =======================================================================================
// TAB SWITCHING
// =======================================================================================

window.switchCreatorTab = function(tab) {
    // Hide all sub-contents
    document.getElementById('builderContent').style.display = 'none';
    document.getElementById('bulkContent').style.display = 'none';
    document.getElementById('listContent').style.display = 'none';
    
    // Remove active class from all buttons
    document.querySelectorAll('.sub-tab').forEach(btn => {
        btn.style.borderBottom = '3px solid transparent';
        btn.style.color = '#6b7c8f';
        btn.classList.remove('active');
    });
    
    // Show selected content and activate button
    if (tab === 'builder') {
        document.getElementById('builderContent').style.display = 'block';
        document.getElementById('builderTabBtn').style.borderBottom = '3px solid #6366F1';
        document.getElementById('builderTabBtn').style.color = '#6366F1';
        document.getElementById('builderTabBtn').classList.add('active');
        
        // Initialize builder if not already done
        if (!moduleBuilderState.initialized) {
            initializeModuleBuilder();
        }
    } else if (tab === 'bulk') {
        document.getElementById('bulkContent').style.display = 'block';
        document.getElementById('bulkTabBtn').style.borderBottom = '3px solid #6366F1';
        document.getElementById('bulkTabBtn').style.color = '#6366F1';
        document.getElementById('bulkTabBtn').classList.add('active');
    } else if (tab === 'list') {
        document.getElementById('listContent').style.display = 'block';
        document.getElementById('listTabBtn').style.borderBottom = '3px solid #6366F1';
        document.getElementById('listTabBtn').style.color = '#6366F1';
        document.getElementById('listTabBtn').classList.add('active');
        
        // Reload list
        if (typeof loadModulesToGenerate === 'function') {
            loadModulesToGenerate();
        }
    }
};

// =======================================================================================
// INITIALIZATION
// =======================================================================================

async function initializeModuleBuilder() {
    console.log('[Module Builder] Initializing...');
    
    try {
        // Load all required data
        await Promise.all([
            loadSuperSkillsData(),
            loadAgeRangesData(),
            loadTheoriesData(),
            loadNdisDomains(),
            loadSediCategories(),
            loadFasdDomains()
        ]);
        
        moduleBuilderState.initialized = true;
        
        // Render first step
        renderStep(1);
        
        console.log('[Module Builder] Initialized successfully');
    } catch (error) {
        console.error('[Module Builder] Initialization error:', error);
        alert('Error initializing module builder: ' + error.message);
    }
}

async function loadSuperSkillsData() {
    const { data, error } = await supabase
        .from('super_skills')
        .select('id, name, slug')
        .eq('is_active', true)
        .order('sort_order');
    
    if (error) throw error;
    moduleBuilderState.superSkills = data || [];
}

async function loadAgeRangesData() {
    const { data, error } = await supabase
        .from('age_ranges')
        .select('id, age_range, display_name')
        .eq('is_active', true);
    
    if (error) throw error;
    moduleBuilderState.ageRanges = data || [];
}

async function loadTheoriesData() {
    const { data, error } = await supabase
        .from('core_theories')
        .select('id, theory_name, theory_code')
        .eq('is_active', true)
        .order('theory_name');
    
    if (error) throw error;
    moduleBuilderState.theories = data || [];
}

async function loadNdisDomains() {
    const { data, error } = await supabase
        .from('ndis_domains')
        .select('id, domain_name')
        .eq('is_active', true)
        .order('sort_order');
    
    if (error) throw error;
    moduleBuilderState.ndisDomains = data || [];
}

async function loadSediCategories() {
    const { data, error} = await supabase
        .from('dss_sedi_categories')
        .select('id, sedi_code, sedi_name')
        .eq('is_active', true)
        .order('sort_order');
    
    if (error) throw error;
    moduleBuilderState.sediCategories = data || [];
}

async function loadFasdDomains() {
    const { data, error } = await supabase
        .from('fasd_domains')
        .select('domain_number, domain_name')
        .eq('is_active', true)
        .order('sort_order');
    
    if (error) throw error;
    moduleBuilderState.fasdDomains = data || [];
}

// =======================================================================================
// STEP NAVIGATION
// =======================================================================================

window.moduleBuilderNextStep = function() {
    if (!validateCurrentStep()) {
        return;
    }
    
    if (moduleBuilderState.currentStep < 5) {
        moduleBuilderState.currentStep++;
        renderStep(moduleBuilderState.currentStep);
        updateStepIndicators();
        updateNavButtons();
    } else {
        // Step 5 - Save
        saveModuleBlueprint();
    }
};

window.moduleBuilderPrevStep = function() {
    if (moduleBuilderState.currentStep > 1) {
        moduleBuilderState.currentStep--;
        renderStep(moduleBuilderState.currentStep);
        updateStepIndicators();
        updateNavButtons();
    }
};

function validateCurrentStep() {
    const state = moduleBuilderState;
    
    switch(state.currentStep) {
        case 1:
            if (!state.formData.moduleTitle.trim()) {
                alert('Please enter a module title');
                return false;
            }
            if (!state.formData.superSkillId) {
                alert('Please select a super skill');
                return false;
            }
            if (!state.formData.subSkillId) {
                alert('Please select a sub-skill');
                return false;
            }
            if (!state.formData.ageRangeId) {
                alert('Please select an age range');
                return false;
            }
            if (!state.formData.stage) {
                alert('Please select a stage');
                return false;
            }
            if (!state.formData.activityType) {
                alert('Please select an activity type');
                return false;
            }
            return true;
            
        case 2:
            if (!state.formData.primaryTheoryId) {
                alert('Please select a primary theory');
                return false;
            }
            if (state.formData.secondaryTheoryIds.length > 3) {
                alert('Maximum 3 secondary theories allowed');
                return false;
            }
            return true;
            
        default:
            return true;
    }
}

function updateStepIndicators() {
    const current = moduleBuilderState.currentStep;
    
    for (let i = 1; i <= 5; i++) {
        const indicator = document.getElementById(`step-indicator-${i}`);
        const circle = indicator.querySelector('.step-circle');
        const label = indicator.querySelector('.step-label');
        
        if (i < current) {
            // Completed
            circle.style.background = '#2e7d32';
            circle.style.borderColor = '#2e7d32';
            circle.style.color = 'white';
            circle.textContent = '✓';
            label.style.color = '#90a4ae';
        } else if (i === current) {
            // Active
            circle.style.background = '#6366F1';
            circle.style.borderColor = '#6366F1';
            circle.style.color = 'white';
            circle.textContent = i;
            label.style.color = '#6366F1';
        } else {
            // Upcoming
            circle.style.background = '#f8f9fa';
            circle.style.borderColor = '#e0e7ff';
            circle.style.color = '#90a4ae';
            circle.textContent = i;
            label.style.color = '#90a4ae';
        }
    }
}

function updateNavButtons() {
    const btnBack = document.getElementById('btnBuilderBack');
    const btnNext = document.getElementById('btnBuilderNext');
    const current = moduleBuilderState.currentStep;
    
    btnBack.disabled = current === 1;
    btnBack.style.opacity = current === 1 ? '0.5' : '1';
    btnBack.style.cursor = current === 1 ? 'not-allowed' : 'pointer';
    
    if (current === 5) {
        btnNext.textContent = '✓ Save Module Blueprint';
        btnNext.style.background = '#2e7d32';
    } else {
        btnNext.textContent = 'Next →';
        btnNext.style.background = '#6366F1';
    }
}

// =======================================================================================
// STEP RENDERING
// =======================================================================================

function renderStep(stepNumber) {
    const container = document.getElementById('stepContent');
    
    switch(stepNumber) {
        case 1:
            container.innerHTML = renderStep1();
            attachStep1Listeners();
            break;
        case 2:
            container.innerHTML = renderStep2();
            attachStep2Listeners();
            break;
        case 3:
            container.innerHTML = renderStep3();
            attachStep3Listeners();
            break;
        case 4:
            container.innerHTML = renderStep4();
            attachStep4Listeners();
            break;
        case 5:
            container.innerHTML = renderStep5();
            break;
    }
}

// Step 1: Basics
function renderStep1() {
    const state = moduleBuilderState;
    
    return `
        <h2 style="font-size: 18px; font-weight: 700; color: #405878; margin-bottom: 8px;">Step 1: Module Basics</h2>
        <p style="font-size: 13px; color: #78909c; margin-bottom: 24px;">Define the core structure and target for this module</p>
        
        <div style="display: grid; gap: 20px;">
            <div>
                <label style="display: block; font-size: 13px; font-weight: 600; color: #405878; margin-bottom: 8px;">
                    Module Title <span style="color: #ff5252;">*</span>
                </label>
                <input type="text" id="moduleTitle" value="${state.formData.moduleTitle}" 
                    placeholder="e.g., Understanding Your Worry Weather"
                    style="width: 100%; padding: 10px 12px; background: white; border: 1px solid #d1d5db; border-radius: 6px; font-size: 13px;">
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                <div>
                    <label style="display: block; font-size: 13px; font-weight: 600; color: #405878; margin-bottom: 8px;">
                        Super Skill <span style="color: #ff5252;">*</span>
                    </label>
                    <select id="superSkill" style="width: 100%; padding: 10px 12px; background: white; border: 1px solid #d1d5db; border-radius: 6px; font-size: 13px;">
                        <option value="">Select...</option>
                        ${state.superSkills.map(ss => `
                            <option value="${ss.id}" ${ss.id === state.formData.superSkillId ? 'selected' : ''}>${ss.name}</option>
                        `).join('')}
                    </select>
                </div>
                
                <div>
                    <label style="display: block; font-size: 13px; font-weight: 600; color: #405878; margin-bottom: 8px;">
                        Sub-Skill <span style="color: #ff5252;">*</span>
                    </label>
                    <select id="subSkill" style="width: 100%; padding: 10px 12px; background: white; border: 1px solid #d1d5db; border-radius: 6px; font-size: 13px;">
                        <option value="">Select super skill first...</option>
                    </select>
                </div>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                <div>
                    <label style="display: block; font-size: 13px; font-weight: 600; color: #405878; margin-bottom: 8px;">
                        Age Range <span style="color: #ff5252;">*</span>
                    </label>
                    <select id="ageRange" style="width: 100%; padding: 10px 12px; background: white; border: 1px solid #d1d5db; border-radius: 6px; font-size: 13px;">
                        <option value="">Select...</option>
                        ${state.ageRanges.map(ar => `
                            <option value="${ar.id}" ${ar.id === state.formData.ageRangeId ? 'selected' : ''}>${ar.age_range} — ${ar.display_name}</option>
                        `).join('')}
                    </select>
                </div>
                
                <div>
                    <label style="display: block; font-size: 13px; font-weight: 600; color: #405878; margin-bottom: 8px;">
                        Stage <span style="color: #ff5252;">*</span>
                    </label>
                    <select id="stage" style="width: 100%; padding: 10px 12px; background: white; border: 1px solid #d1d5db; border-radius: 6px; font-size: 13px;">
                        <option value="">Select...</option>
                        <option value="Foundation" ${state.formData.stage === 'Foundation' ? 'selected' : ''}>Foundation</option>
                        <option value="Beginner" ${state.formData.stage === 'Beginner' ? 'selected' : ''}>Beginner</option>
                        <option value="Intermediate" ${state.formData.stage === 'Intermediate' ? 'selected' : ''}>Intermediate</option>
                        <option value="Advanced" ${state.formData.stage === 'Advanced' ? 'selected' : ''}>Advanced</option>
                    </select>
                </div>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                <div>
                    <label style="display: block; font-size: 13px; font-weight: 600; color: #405878; margin-bottom: 8px;">
                        Activity Type <span style="color: #ff5252;">*</span>
                    </label>
                    <select id="activityType" style="width: 100%; padding: 10px 12px; background: white; border: 1px solid #d1d5db; border-radius: 6px; font-size: 13px;">
                        <option value="">Select...</option>
                        <option value="Game" ${state.formData.activityType === 'Game' ? 'selected' : ''}>Game</option>
                        <option value="Worksheet" ${state.formData.activityType === 'Worksheet' ? 'selected' : ''}>Worksheet</option>
                        <option value="Story" ${state.formData.activityType === 'Story' ? 'selected' : ''}>Story</option>
                        <option value="Choose-path" ${state.formData.activityType === 'Choose-path' ? 'selected' : ''}>Choose-path</option>
                        <option value="Embodied exercise" ${state.formData.activityType === 'Embodied exercise' ? 'selected' : ''}>Embodied exercise</option>
                        <option value="Role play" ${state.formData.activityType === 'Role play' ? 'selected' : ''}>Role play</option>
                        <option value="Drawing/visual" ${state.formData.activityType === 'Drawing/visual' ? 'selected' : ''}>Drawing/visual</option>
                        <option value="Movement-based" ${state.formData.activityType === 'Movement-based' ? 'selected' : ''}>Movement-based</option>
                    </select>
                </div>
                
                <div>
                    <label style="display: block; font-size: 13px; font-weight: 600; color: #405878; margin-bottom: 8px;">
                        Cycle Week (Optional)
                    </label>
                    <input type="number" id="cycleWeek" value="${state.formData.cycleWeek || ''}" min="1" max="12" 
                        placeholder="1-12"
                        style="width: 100%; padding: 10px 12px; background: white; border: 1px solid #d1d5db; border-radius: 6px; font-size: 13px;">
                </div>
            </div>
        </div>
    `;
}

function attachStep1Listeners() {
    const state = moduleBuilderState;
    
    document.getElementById('moduleTitle').addEventListener('input', (e) => {
        state.formData.moduleTitle = e.target.value;
    });
    
    document.getElementById('superSkill').addEventListener('change', async (e) => {
        state.formData.superSkillId = e.target.value;
        state.formData.subSkillId = ''; // Reset sub-skill
        
        if (e.target.value) {
            await loadSubSkills(e.target.value);
        }
    });
    
    document.getElementById('subSkill').addEventListener('change', (e) => {
        state.formData.subSkillId = e.target.value;
    });
    
    document.getElementById('ageRange').addEventListener('change', (e) => {
        state.formData.ageRangeId = e.target.value;
    });
    
    document.getElementById('stage').addEventListener('change', (e) => {
        state.formData.stage = e.target.value;
    });
    
    document.getElementById('activityType').addEventListener('change', (e) => {
        state.formData.activityType = e.target.value;
    });
    
    document.getElementById('cycleWeek').addEventListener('input', (e) => {
        state.formData.cycleWeek = e.target.value ? parseInt(e.target.value) : null;
    });
    
    // Load sub-skills if super skill already selected
    if (state.formData.superSkillId) {
        loadSubSkills(state.formData.superSkillId);
    }
}

async function loadSubSkills(superSkillId) {
    const { data, error } = await supabase
        .from('sub_skills')
        .select('id, code, name')
        .eq('super_skill_id', superSkillId)
        .eq('is_active', true)
        .order('sort_order');
    
    if (error) {
        console.error('Error loading sub-skills:', error);
        return;
    }
    
    moduleBuilderState.subSkills = data || [];
    
    const select = document.getElementById('subSkill');
    select.innerHTML = '<option value="">Select...</option>' +
        data.map(ss => `
            <option value="${ss.id}" ${ss.id === moduleBuilderState.formData.subSkillId ? 'selected' : ''}>
                ${ss.code} - ${ss.name}
            </option>
        `).join('');
}

// Step 2: Theory Bundle  
function renderStep2() {
    const state = moduleBuilderState;
    
    return `
        <h2 style="font-size: 18px; font-weight: 700; color: #405878; margin-bottom: 8px;">Step 2: Theory Bundle</h2>
        <p style="font-size: 13px; color: #78909c; margin-bottom: 24px;">Select primary and supporting theoretical frameworks</p>
        
        <div style="display: grid; gap: 24px;">
            <div>
                <label style="display: block; font-size: 13px; font-weight: 600; color: #405878; margin-bottom: 8px;">
                    Primary Theory <span style="color: #ff5252;">*</span>
                </label>
                <div id="primaryTheoryContainer" style="display: flex; flex-wrap: wrap; gap: 8px; padding: 12px; background: white; border: 1px solid #d1d5db; border-radius: 6px; min-height: 50px;">
                    ${state.theories.map(t => `
                        <div class="theory-chip ${t.id === state.formData.primaryTheoryId ? 'primary-selected' : ''}" 
                            data-theory-id="${t.id}"
                            style="padding: 6px 12px; background: ${t.id === state.formData.primaryTheoryId ? '#6366F1' : '#f3f4f6'}; 
                                color: ${t.id === state.formData.primaryTheoryId ? 'white' : '#374151'}; 
                                border-radius: 16px; font-size: 12px; font-weight: 600; cursor: pointer; transition: all 0.2s;">
                            ${t.theory_name}
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <div>
                <label style="display: block; font-size: 13px; font-weight: 600; color: #405878; margin-bottom: 8px;">
                    Secondary Theories (Max 3)
                </label>
                <div id="secondaryTheoryContainer" style="display: flex; flex-wrap: wrap; gap: 8px; padding: 12px; background: white; border: 1px solid #d1d5db; border-radius: 6px; min-height: 50px;">
                    ${state.theories.map(t => `
                        <div class="secondary-chip ${state.formData.secondaryTheoryIds.includes(t.id) ? 'secondary-selected' : ''}" 
                            data-theory-id="${t.id}"
                            style="padding: 6px 12px; background: ${state.formData.secondaryTheoryIds.includes(t.id) ? '#2e7d32' : '#f3f4f6'}; 
                                color: ${state.formData.secondaryTheoryIds.includes(t.id) ? 'white' : '#374151'}; 
                                border-radius: 16px; font-size: 12px; font-weight: 600; cursor: pointer; transition: all 0.2s;">
                            ${t.theory_name}
                        </div>
                    `).join('')}
                </div>
                <p style="font-size: 11px; color: #78909c; margin-top: 4px; font-style: italic;">
                    Selected: ${state.formData.secondaryTheoryIds.length}/3
                </p>
            </div>
            
            <div>
                <label style="display: block; font-size: 13px; font-weight: 600; color: #405878; margin-bottom: 8px;">
                    Neuroscience Concept (Optional)
                </label>
                <select id="neuroSnapIn" style="width: 100%; padding: 10px 12px; background: white; border: 1px solid #d1d5db; border-radius: 6px; font-size: 13px;">
                    <option value="">Select a concept...</option>
                    <option value="Neuroplasticity" ${state.formData.neuroscienceConcept === 'Neuroplasticity' ? 'selected' : ''}>Neuroplasticity</option>
                    <option value="Myelination" ${state.formData.neuroscienceConcept === 'Myelination' ? 'selected' : ''}>Myelination</option>
                    <option value="Prefrontal Cortex" ${state.formData.neuroscienceConcept === 'Prefrontal Cortex' ? 'selected' : ''}>Prefrontal Cortex (PFC)</option>
                    <option value="Dopamine" ${state.formData.neuroscienceConcept === 'Dopamine' ? 'selected' : ''}>Dopamine</option>
                    <option value="Amygdala" ${state.formData.neuroscienceConcept === 'Amygdala' ? 'selected' : ''}>Amygdala</option>
                    <option value="Interoception" ${state.formData.neuroscienceConcept === 'Interoception' ? 'selected' : ''}>Interoception</option>
                    <option value="Hebbian Learning" ${state.formData.neuroscienceConcept === 'Hebbian Learning' ? 'selected' : ''}>Hebbian Learning</option>
                    <option value="Autonomic Nervous System" ${state.formData.neuroscienceConcept === 'Autonomic Nervous System' ? 'selected' : ''}>Autonomic Nervous System</option>
                </select>
            </div>
            
            <div>
                <label style="display: block; font-size: 13px; font-weight: 600; color: #405878; margin-bottom: 8px;">
                    Brain Town Metaphor (Optional)
                </label>
                <textarea id="brainTownMetaphor" rows="2" 
                    placeholder="e.g., Building traffic lights to slow thoughts down"
                    style="width: 100%; padding: 10px 12px; background: white; border: 1px solid #d1d5db; border-radius: 6px; font-size: 13px; resize: vertical;">${state.formData.brainTownMetaphor}</textarea>
            </div>
        </div>
    `;
}

function attachStep2Listeners() {
    const state = moduleBuilderState;
    
    // Primary theory selection
    document.querySelectorAll('.theory-chip').forEach(chip => {
        chip.addEventListener('click', function() {
            const theoryId = this.getAttribute('data-theory-id');
            
            // Deselect all
            document.querySelectorAll('.theory-chip').forEach(c => {
                c.classList.remove('primary-selected');
                c.style.background = '#f3f4f6';
                c.style.color = '#374151';
            });
            
            // Select this one
            this.classList.add('primary-selected');
            this.style.background = '#6366F1';
            this.style.color = 'white';
            
            state.formData.primaryTheoryId = theoryId;
            
            // Remove from secondary if present
            const index = state.formData.secondaryTheoryIds.indexOf(theoryId);
            if (index > -1) {
                state.formData.secondaryTheoryIds.splice(index, 1);
                updateSecondaryChips();
            }
        });
    });
    
    // Secondary theory selection
    document.querySelectorAll('.secondary-chip').forEach(chip => {
        chip.addEventListener('click', function() {
            const theoryId = this.getAttribute('data-theory-id');
            
            // Can't select primary as secondary
            if (theoryId === state.formData.primaryTheoryId) {
                alert('This theory is already selected as primary');
                return;
            }
            
            const index = state.formData.secondaryTheoryIds.indexOf(theoryId);
            
            if (index > -1) {
                // Remove
                state.formData.secondaryTheoryIds.splice(index, 1);
            } else {
                // Check limit
                if (state.formData.secondaryTheoryIds.length >= 3) {
                    alert('Maximum 3 secondary theories allowed');
                    return;
                }
                // Add
                state.formData.secondaryTheoryIds.push(theoryId);
            }
            
            updateSecondaryChips();
        });
    });
    
    document.getElementById('neuroSnapIn').addEventListener('change', (e) => {
        state.formData.neuroscienceConcept = e.target.value;
    });
    
    document.getElementById('brainTownMetaphor').addEventListener('input', (e) => {
        state.formData.brainTownMetaphor = e.target.value;
    });
}

function updateSecondaryChips() {
    const state = moduleBuilderState;
    document.querySelectorAll('.secondary-chip').forEach(chip => {
        const theoryId = chip.getAttribute('data-theory-id');
        if (state.formData.secondaryTheoryIds.includes(theoryId)) {
            chip.classList.add('secondary-selected');
            chip.style.background = '#2e7d32';
            chip.style.color = 'white';
        } else {
            chip.classList.remove('secondary-selected');
            chip.style.background = '#f3f4f6';
            chip.style.color = '#374151';
        }
    });
}

// Step 3: Diagnosis Adaptations
function renderStep3() {
    const state = moduleBuilderState;
    
    return `
        <h2 style="font-size: 18px; font-weight: 700; color: #405878; margin-bottom: 8px;">Step 3: Diagnosis Adaptations</h2>
        <p style="font-size: 13px; color: #78909c; margin-bottom: 24px;">Optional — Select diagnosis pathways or skip if not adapting</p>
        
        <div style="display: grid; gap: 12px;">
            ${[
                {id: 'fasd', name: 'FASD', color: '#4caf50'},
                {id: 'adhd', name: 'ADHD', color: '#ffca28'},
                {id: 'asd', name: 'ASD', color: '#42a5f5'},
                {id: 'pda', name: 'PDA', color: '#ab47bc'},
                {id: 'trauma', name: 'Complex Trauma', color: '#ff5252'}
            ].map(dx => `
                <div class="diagnosis-option ${state.formData.diagnosisPathways.includes(dx.id) ? 'selected' : ''}" 
                    data-diagnosis="${dx.id}"
                    style="display: flex; align-items: center; justify-content: space-between; padding: 16px; 
                        background: white; border: 2px solid ${state.formData.diagnosisPathways.includes(dx.id) ? dx.color : '#e5e7eb'}; 
                        border-radius: 8px; cursor: pointer; transition: all 0.2s;">
                    <div style="font-size: 14px; font-weight: 600; color: #374151;">${dx.name}</div>
                    <div style="width: 44px; height: 24px; background: ${state.formData.diagnosisPathways.includes(dx.id) ? dx.color : '#e5e7eb'}; 
                        border-radius: 12px; position: relative; transition: all 0.3s;">
                        <div style="position: absolute; top: 2px; left: ${state.formData.diagnosisPathways.includes(dx.id) ? '22px' : '2px'}; 
                            width: 20px; height: 20px; background: white; border-radius: 50%; transition: all 0.3s;"></div>
                    </div>
                </div>
            `).join('')}
        </div>
        
        ${state.formData.diagnosisPathways.includes('fasd') ? `
            <div style="margin-top: 24px; padding: 16px; background: #f0f9ff; border-left: 4px solid #4caf50; border-radius: 6px;">
                <h3 style="font-size: 14px; font-weight: 700; color: #405878; margin-bottom: 12px;">FASD-Specific Strategies</h3>
                <textarea id="fasdStrategies" rows="3" 
                    placeholder="e.g., Concrete visual supports, one-step instructions, memory scaffolding without shame"
                    style="width: 100%; padding: 10px 12px; background: white; border: 1px solid #d1d5db; border-radius: 6px; font-size: 13px; resize: vertical;">${state.formData.fasdStrategies}</textarea>
            </div>
        ` : ''}
    `;
}

function attachStep3Listeners() {
    const state = moduleBuilderState;
    
    document.querySelectorAll('.diagnosis-option').forEach(option => {
        option.addEventListener('click', function() {
            const diagnosis = this.getAttribute('data-diagnosis');
            const index = state.formData.diagnosisPathways.indexOf(diagnosis);
            
            if (index > -1) {
                state.formData.diagnosisPathways.splice(index, 1);
            } else {
                state.formData.diagnosisPathways.push(diagnosis);
            }
            
            // Re-render to update UI and show/hide FASD strategies
            renderStep(3);
        });
    });
    
    const fasdTextarea = document.getElementById('fasdStrategies');
    if (fasdTextarea) {
        fasdTextarea.addEventListener('input', (e) => {
            state.formData.fasdStrategies = e.target.value;
        });
    }
}

// Step 4: Outcomes
function renderStep4() {
    const state = moduleBuilderState;
    
    return `
        <h2 style="font-size: 18px; font-weight: 700; color: #405878; margin-bottom: 8px;">Step 4: NDIS Domain & Outcomes</h2>
        <p style="font-size: 13px; color: #78909c; margin-bottom: 24px;">Link module to funded outcomes frameworks</p>
        
        <div style="display: grid; gap: 20px;">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                <div>
                    <label style="display: block; font-size: 13px; font-weight: 600; color: #405878; margin-bottom: 8px;">
                        NDIS Domain
                    </label>
                    <select id="ndisDomain" style="width: 100%; padding: 10px 12px; background: white; border: 1px solid #d1d5db; border-radius: 6px; font-size: 13px;">
                        <option value="">Optional - Select...</option>
                        ${state.ndisDomains.map(nd => `
                            <option value="${nd.id}" ${nd.id === state.formData.ndisDomainId ? 'selected' : ''}>${nd.domain_name}</option>
                        `).join('')}
                    </select>
                </div>
                
                <div>
                    <label style="display: block; font-size: 13px; font-weight: 600; color: #405878; margin-bottom: 8px;">
                        DSS SEDI
                    </label>
                    <select id="dssSedi" style="width: 100%; padding: 10px 12px; background: white; border: 1px solid #d1d5db; border-radius: 6px; font-size: 13px;">
                        <option value="">Optional - Select...</option>
                        ${state.sediCategories.map(sc => `
                            <option value="${sc.id}" ${sc.id === state.formData.dssSediId ? 'selected' : ''}>${sc.sedi_code}: ${sc.sedi_name}</option>
                        `).join('')}
                    </select>
                </div>
            </div>
            
            <div>
                <label style="display: block; font-size: 13px; font-weight: 600; color: #405878; margin-bottom: 8px;">
                    Module Objective
                </label>
                <textarea id="moduleObjective" rows="2" 
                    placeholder="What will children be able to do after completing this module? Be specific."
                    style="width: 100%; padding: 10px 12px; background: white; border: 1px solid #d1d5db; border-radius: 6px; font-size: 13px; resize: vertical;">${state.formData.moduleObjective}</textarea>
            </div>
            
            <div>
                <label style="display: block; font-size: 13px; font-weight: 600; color: #405878; margin-bottom: 8px;">
                    Facilitator Tip
                </label>
                <textarea id="facilitatorTip" rows="2" 
                    placeholder="Guidance for parents/educators on delivering this module"
                    style="width: 100%; padding: 10px 12px; background: white; border: 1px solid #d1d5db; border-radius: 6px; font-size: 13px; resize: vertical;">${state.formData.facilitatorTip}</textarea>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                <div>
                    <label style="display: block; font-size: 13px; font-weight: 600; color: #405878; margin-bottom: 8px;">
                        Reflection Prompt
                    </label>
                    <input type="text" id="reflectionPrompt" value="${state.formData.reflectionPrompt}" 
                        placeholder="e.g., What did you notice about your body when you felt calm?"
                        style="width: 100%; padding: 10px 12px; background: white; border: 1px solid #d1d5db; border-radius: 6px; font-size: 13px;">
                </div>
                
                <div>
                    <label style="display: block; font-size: 13px; font-weight: 600; color: #405878; margin-bottom: 8px;">
                        Reward Text
                    </label>
                    <input type="text" id="rewardText" value="${state.formData.rewardText}" 
                        placeholder="e.g., You've earned 5 brain-building stars! ⭐"
                        style="width: 100%; padding: 10px 12px; background: white; border: 1px solid #d1d5db; border-radius: 6px; font-size: 13px;">
                </div>
            </div>
        </div>
    `;
}

function attachStep4Listeners() {
    const state = moduleBuilderState;
    
    document.getElementById('ndisDomain').addEventListener('change', (e) => {
        state.formData.ndisDomainId = e.target.value;
    });
    
    document.getElementById('dssSedi').addEventListener('change', (e) => {
        state.formData.dssSediId = e.target.value;
    });
    
    document.getElementById('moduleObjective').addEventListener('input', (e) => {
        state.formData.moduleObjective = e.target.value;
    });
    
    document.getElementById('facilitatorTip').addEventListener('input', (e) => {
        state.formData.facilitatorTip = e.target.value;
    });
    
    document.getElementById('reflectionPrompt').addEventListener('input', (e) => {
        state.formData.reflectionPrompt = e.target.value;
    });
    
    document.getElementById('rewardText').addEventListener('input', (e) => {
        state.formData.rewardText = e.target.value;
    });
}

// Step 5: Review & Save
function renderStep5() {
    const state = moduleBuilderState;
    
    // Get names for display
    const ageRange = state.ageRanges.find(ar => ar.id === state.formData.ageRangeId);
    const primaryTheory = state.theories.find(t => t.id === state.formData.primaryTheoryId);
    const secondaryTheories = state.formData.secondaryTheoryIds
        .map(id => state.theories.find(t => t.id === id)?.theory_name)
        .filter(Boolean);
    const ndisDomain = state.ndisDomains.find(nd => nd.id === state.formData.ndisDomainId);
    const sedi = state.sediCategories.find(sc => sc.id === state.formData.dssSediId);
    
    return `
        <h2 style="font-size: 18px; font-weight: 700; color: #405878; margin-bottom: 8px;">Step 5: Review & Save</h2>
        <p style="font-size: 13px; color: #78909c; margin-bottom: 24px;">Review your module configuration before saving</p>
        
        <div style="background: white; border-radius: 8px; padding: 20px; border: 1px solid #e5e7eb;">
            <h3 style="font-size: 14px; font-weight: 700; color: #6366F1; margin-bottom: 16px;">Module Summary</h3>
            
            <div style="display: grid; gap: 12px; font-size: 13px;">
                <div style="display: grid; grid-template-columns: 140px 1fr; gap: 8px;">
                    <div style="font-weight: 600; color: #405878;">Title:</div>
                    <div style="color: #6b7280;">${state.formData.moduleTitle || 'N/A'}</div>
                </div>
                
                <div style="display: grid; grid-template-columns: 140px 1fr; gap: 8px;">
                    <div style="font-weight: 600; color: #405878;">Age Range:</div>
                    <div style="color: #6b7280;">${ageRange ? `${ageRange.age_range} — ${ageRange.display_name}` : 'N/A'}</div>
                </div>
                
                <div style="display: grid; grid-template-columns: 140px 1fr; gap: 8px;">
                    <div style="font-weight: 600; color: #405878;">Stage:</div>
                    <div style="color: #6b7280;">${state.formData.stage || 'N/A'}</div>
                </div>
                
                <div style="display: grid; grid-template-columns: 140px 1fr; gap: 8px;">
                    <div style="font-weight: 600; color: #405878;">Activity Type:</div>
                    <div style="color: #6b7280;">${state.formData.activityType || 'N/A'}</div>
                </div>
                
                <div style="display: grid; grid-template-columns: 140px 1fr; gap: 8px;">
                    <div style="font-weight: 600; color: #405878;">Primary Theory:</div>
                    <div style="color: #6b7280;">${primaryTheory?.theory_name || 'N/A'}</div>
                </div>
                
                <div style="display: grid; grid-template-columns: 140px 1fr; gap: 8px;">
                    <div style="font-weight: 600; color: #405878;">Secondary Theories:</div>
                    <div style="color: #6b7280;">${secondaryTheories.length > 0 ? secondaryTheories.join(', ') : 'None'}</div>
                </div>
                
                <div style="display: grid; grid-template-columns: 140px 1fr; gap: 8px;">
                    <div style="font-weight: 600; color: #405878;">Adaptations:</div>
                    <div style="color: #6b7280;">${state.formData.diagnosisPathways.length > 0 ? state.formData.diagnosisPathways.map(d => d.toUpperCase()).join(', ') : 'None'}</div>
                </div>
                
                <div style="display: grid; grid-template-columns: 140px 1fr; gap: 8px;">
                    <div style="font-weight: 600; color: #405878;">NDIS Domain:</div>
                    <div style="color: #6b7280;">${ndisDomain?.domain_name || 'None'}</div>
                </div>
                
                <div style="display: grid; grid-template-columns: 140px 1fr; gap: 8px;">
                    <div style="font-weight: 600; color: #405878;">DSS SEDI:</div>
                    <div style="color: #6b7280;">${sedi ? `${sedi.sedi_code}: ${sedi.sedi_name}` : 'None'}</div>
                </div>
            </div>
        </div>
        
        <div style="margin-top: 24px; padding: 16px; background: #f0f9ff; border-left: 4px solid #6366F1; border-radius: 6px;">
            <p style="font-size: 13px; color: #405878; margin: 0;">
                <strong>Ready to save?</strong> Click "Save Module Blueprint" below to add this to your generation queue.
            </p>
        </div>
    `;
}

// =======================================================================================
// SAVE MODULE BLUEPRINT
// =======================================================================================

async function saveModuleBlueprint() {
    const state = moduleBuilderState;
    const btnNext = document.getElementById('btnBuilderNext');
    
    try {
        btnNext.disabled = true;
        btnNext.textContent = 'Saving...';
        
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            throw new Error('Not authenticated');
        }
        
        // Prepare data for insertion
        const insertData = {
            module_title: state.formData.moduleTitle,
            super_skill_id: state.formData.superSkillId,
            sub_skill_id: state.formData.subSkillId,
            age_range: state.ageRanges.find(ar => ar.id === state.formData.ageRangeId)?.age_range,
            stage: state.formData.stage,
            level: state.formData.stage, // Legacy field
            cycle_week: state.formData.cycleWeek,
            main_activity: state.formData.activityType,
            primary_theory_id: state.formData.primaryTheoryId,
            secondary_theory_ids: state.formData.secondaryTheoryIds,
            neuroscience_concept: state.formData.neuroscienceConcept || null,
            brain_town_metaphor: state.formData.brainTownMetaphor || null,
            diagnosis_pathways: state.formData.diagnosisPathways,
            fasd_strategies: state.formData.fasdStrategies || null,
            ndis_domain_id: state.formData.ndisDomainId || null,
            dss_sedi_id: state.formData.dssSediId || null,
            module_objective: state.formData.moduleObjective || null,
            facilitator_tip: state.formData.facilitatorTip || null,
            reflection_prompt: state.formData.reflectionPrompt || null,
            reward_text: state.formData.rewardText || null,
            created_by: user.id,
            has_been_generated: false,
            progress_percentage: 0
        };
        
        const { data, error } = await supabase
            .from('modules_to_generate')
            .insert(insertData)
            .select()
            .single();
        
        if (error) throw error;
        
        alert('Module blueprint saved successfully!');
        
        // Reset form
        resetModuleBuilder();
        
        // Switch to list tab
        switchCreatorTab('list');
        
    } catch (error) {
        console.error('Error saving module blueprint:', error);
        alert('Error saving module blueprint: ' + error.message);
        
        btnNext.disabled = false;
        btnNext.textContent = '✓ Save Module Blueprint';
    }
}

function resetModuleBuilder() {
    moduleBuilderState.currentStep = 1;
    moduleBuilderState.formData = {
        moduleTitle: '',
        superSkillId: '',
        subSkillId: '',
        ageRangeId: '',
        stage: '',
        cycleWeek: null,
        activityType: '',
        primaryTheoryId: null,
        secondaryTheoryIds: [],
        neuroscienceConcept: '',
        brainTownMetaphor: '',
        bridgeFromModuleId: '',
        diagnosisPathways: [],
        fasdDomainIds: [],
        fasdStrategies: '',
        ndisDomainId: '',
        dssSediId: '',
        moduleObjective: '',
        facilitatorTip: '',
        reflectionPrompt: '',
        rewardText: ''
    };
    
    renderStep(1);
    updateStepIndicators();
    updateNavButtons();
}

// =======================================================================================
// Initialize when Module Content Creator tab is opened
// =======================================================================================

// Hook into existing tab switching
const originalSwitchTab = window.switchTab;
window.switchTab = function(event, tabName) {
    if (typeof originalSwitchTab === 'function') {
        originalSwitchTab(event, tabName);
    }
    
    if (tabName === 'moduleContentCreator' && !moduleBuilderState.initialized) {
        setTimeout(() => {
            if (document.getElementById('builderContent')) {
                initializeModuleBuilder();
            }
        }, 100);
    }
};

console.log('[Module Builder] Integration loaded');