// ================================================================================
// BILLING TAB - Tier-centric editing, pricing, credit grants
// ================================================================================
import { supabase } from './adminPage.js';

let billingTiers = [];
let selectedTierId = null;

// ================================================================================
// LOAD BILLING SETTINGS
// ================================================================================
window._adminLoadBillingSettings = async function loadBillingSettings() {
    try {
        // Load subscription tiers
        const { data: tiersData, error: tiersError } = await supabase
            .from('subscription_tiers')
            .select('*')
            .order('created_at', { ascending: true });

        if (tiersError) throw tiersError;
        billingTiers = tiersData || [];
        renderTiersList();

        // Re-select the previously selected tier if it still exists
        if (selectedTierId) {
            const stillExists = billingTiers.find(t => t.tier === selectedTierId);
            if (stillExists) {
                selectTierForEdit(selectedTierId);
            } else {
                selectedTierId = null;
                showTierPlaceholder();
            }
        } else if (billingTiers.length > 0) {
            // Auto-select first tier
            selectTierForEdit(billingTiers[0].tier);
        }

        // Load parents for credit grant dropdown
        const { data: parents } = await supabase
            .from('parent_profiles')
            .select('id, username')
            .order('username');

        const parentSelect = document.getElementById('billingGrantParent');
        if (parentSelect && parents) {
            parentSelect.innerHTML = '<option value="">Select a parent...</option>' +
                parents.map(p => `<option value="${p.id}">${p.username || p.id}</option>`).join('');
        }
    } catch (error) {
        console.error('Error loading billing settings:', error);
    }
};

// ================================================================================
// RENDER TIERS LIST (left column)
// ================================================================================
function renderTiersList() {
    const container = document.getElementById('billingTiersList');
    if (!container) return;

    if (billingTiers.length === 0) {
        container.innerHTML = '<div style="color: #6b7c8f; font-size: 13px; text-align: center; padding: 30px 12px; background: white; border-radius: 10px; border: 2px dashed #E2E8F0;">No tiers configured yet. Click "+ Add Tier" to create one.</div>';
        return;
    }

    container.innerHTML = billingTiers.map((tier, index) => {
        const isSelected = selectedTierId === tier.tier;
        const displayName = tier.display_name || tier.tier;
        const price = (tier.monthly_price_cents !== null && tier.monthly_price_cents !== undefined) 
            ? `$${(tier.monthly_price_cents / 100).toFixed(2)}` 
            : '$0.00';
        const bgColor = isSelected ? '#EEF2FF' : 'white';
        const borderColor = isSelected ? '#6366F1' : '#E2E8F0';
        const textColor = isSelected ? '#6366F1' : '#1a1a2e';

        return `
            <div class="billing-tier-item" data-tier-id="${tier.tier}"
                 style="display: flex; align-items: center; gap: 12px; padding: 16px; background: ${bgColor}; border-radius: 12px; cursor: pointer; border: 2px solid ${borderColor}; transition: all 0.2s ease; position: relative;">
                ${isSelected ? '<div style="position: absolute; top: 8px; right: 8px; width: 8px; height: 8px; background: #6366F1; border-radius: 50%;"></div>' : ''}
                <div style="flex: 1; min-width: 0;">
                    <div style="font-weight: 700; font-size: 14px; color: ${textColor}; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">${tier.tier}</div>
                    <div style="font-size: 13px; color: #6b7c8f; margin-bottom: 6px;">${displayName}</div>
                    <div style="display: flex; gap: 12px; font-size: 12px;">
                        <span style="color: #2A8F8F; font-weight: 600;">${price}<span style="font-weight: 400; color: #6b7c8f;">/mo</span></span>
                        <span style="color: #6b7c8f;">${tier.modules_per_month || 0} modules</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    // Add event delegation for tier clicks
    const tierListContainer = document.getElementById('billingTiersList');
    if (tierListContainer) {
        tierListContainer.addEventListener('click', (e) => {
            const tierItem = e.target.closest('.billing-tier-item');
            if (tierItem) {
                const tierId = tierItem.getAttribute('data-tier-id');
                if (tierId) {
                    window.selectTierForEdit(tierId);
                }
            }
        });
    }
}

// ================================================================================
// SELECT TIER FOR EDITING
// ================================================================================
window.selectTierForEdit = function(tierId) {
    selectedTierId = tierId;
    const tier = billingTiers.find(t => t.tier === tierId);

    if (!tier) {
        showTierPlaceholder();
        return;
    }

    // Show editor, hide placeholder
    const editor = document.getElementById('billingTierEditor');
    const placeholder = document.getElementById('billingTierEditorPlaceholder');
    
    if (editor) editor.style.display = 'block';
    if (placeholder) placeholder.style.display = 'none';

    // Populate fields
    const titleEl = document.getElementById('billingTierEditorTitle');
    if (titleEl) titleEl.textContent = `Edit: ${tier.display_name || tier.tier}`;
    
    const codeEl = document.getElementById('billingEditTierCode');
    if (codeEl) codeEl.value = tier.tier || '';
    
    const nameEl = document.getElementById('billingEditDisplayName');
    if (nameEl) nameEl.value = tier.display_name || '';
    
    const modulesEl = document.getElementById('billingEditModules');
    if (modulesEl) modulesEl.value = tier.modules_per_month || '';
    
    const priceEl = document.getElementById('billingEditPrice');
    if (priceEl) priceEl.value = tier.monthly_price_cents != null ? (tier.monthly_price_cents / 100).toFixed(2) : '';
    
    const discount3El = document.getElementById('billingEditDiscount3');
    if (discount3El) discount3El.value = tier.discount_3_month || 0;
    
    const discount6El = document.getElementById('billingEditDiscount6');
    if (discount6El) discount6El.value = tier.discount_6_month || 0;
    
    const discount12El = document.getElementById('billingEditDiscount12');
    if (discount12El) discount12El.value = tier.discount_12_month || 0;

    // Re-render list to show selection highlight
    renderTiersList();
};

function showTierPlaceholder() {
    document.getElementById('billingTierEditor').style.display = 'none';
    document.getElementById('billingTierEditorPlaceholder').style.display = 'block';
}

// ================================================================================
// SAVE TIER SETTINGS
// ================================================================================
window.saveTierSettings = async function() {
    if (!selectedTierId) {
        alert('No tier selected.');
        return;
    }

    const tier = billingTiers.find(t => t.id === selectedTierId);
    if (!tier) return;

    const displayName = document.getElementById('billingEditDisplayName').value.trim();
    const modulesPerMonth = parseInt(document.getElementById('billingEditModules').value);
    const monthlyPrice = parseFloat(document.getElementById('billingEditPrice').value);
    const discount3 = parseInt(document.getElementById('billingEditDiscount3').value) || 0;
    const discount6 = parseInt(document.getElementById('billingEditDiscount6').value) || 0;
    const discount12 = parseInt(document.getElementById('billingEditDiscount12').value) || 0;

    if (!modulesPerMonth || modulesPerMonth < 1) {
        alert('Modules per month must be at least 1.');
        return;
    }

    try {
        const updates = {
            display_name: displayName || null,
            modules_per_month: modulesPerMonth,
            monthly_price: isNaN(monthlyPrice) ? null : monthlyPrice,
            discount_3_month: discount3,
            discount_6_month: discount6,
            discount_12_month: discount12
        };

        const { error } = await supabase
            .from('subscription_tiers')
            .update(updates)
            .eq('id', selectedTierId);

        if (error) throw error;

        // Update local data
        Object.assign(tier, updates);
        renderTiersList();
        document.getElementById('billingTierEditorTitle').textContent = `Edit: ${displayName || tier.tier}`;

        alert('✅ Tier saved successfully!');
    } catch (error) {
        console.error('Error saving tier:', error);
        alert('Failed to save tier: ' + error.message);
    }
};

// ================================================================================
// DELETE TIER
// ================================================================================
window.deleteTier = async function() {
    if (!selectedTierId) return;

    const tier = billingTiers.find(t => t.id === selectedTierId);
    if (!tier) return;

    if (!confirm(`Are you sure you want to delete the "${tier.display_name || tier.tier}" tier?\n\nThis may affect parents currently on this tier.`)) {
        return;
    }

    try {
        const { error } = await supabase
            .from('subscription_tiers')
            .delete()
            .eq('id', selectedTierId);

        if (error) throw error;

        selectedTierId = null;
        showTierPlaceholder();
        await loadBillingSettings();
        alert('✅ Tier deleted.');
    } catch (error) {
        console.error('Error deleting tier:', error);
        alert('Failed to delete tier: ' + error.message);
    }
};

// ================================================================================
// ADD TIER MODAL
// ================================================================================
window.openAddTierModal = function() {
    const modal = document.getElementById('addTierModal');
    if (modal) {
        modal.classList.add('active');
        document.getElementById('newTierCode').value = '';
        document.getElementById('newTierDisplayName').value = '';
        document.getElementById('newTierModules').value = '4';
        document.getElementById('newTierPrice').value = '19.00';
        document.getElementById('newTierCode').focus();
    }
};

window.closeAddTierModal = function() {
    const modal = document.getElementById('addTierModal');
    if (modal) modal.classList.remove('active');
};

window.saveNewTier = async function(event) {
    event.preventDefault();

    const code = document.getElementById('newTierCode').value.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
    const displayName = document.getElementById('newTierDisplayName').value.trim();
    const modulesPerMonth = parseInt(document.getElementById('newTierModules').value);
    const monthlyPrice = parseFloat(document.getElementById('newTierPrice').value);

    if (!code) {
        alert('Please enter a tier code.');
        return;
    }

    if (billingTiers.some(t => t.tier === code)) {
        alert('A tier with this code already exists.');
        return;
    }

    if (!modulesPerMonth || modulesPerMonth < 1) {
        alert('Modules per month must be at least 1.');
        return;
    }

    try {
        const { data, error } = await supabase
            .from('subscription_tiers')
            .insert({
                tier: code,
                display_name: displayName || null,
                modules_per_month: modulesPerMonth,
                monthly_price: isNaN(monthlyPrice) ? null : monthlyPrice,
                discount_3_month: 0,
                discount_6_month: 0,
                discount_12_month: 0
            })
            .select()
            .single();

        if (error) throw error;

        window.closeAddTierModal();

        // Reload and select the new tier
        await loadBillingSettings();
        if (data) {
            selectedTierId = data.id;
            selectTierForEdit(data.id);
        }

        alert('✅ Tier added successfully!');
    } catch (error) {
        console.error('Error adding tier:', error);
        alert('Failed to add tier: ' + error.message);
    }
};

// ================================================================================
// SAVE CREDIT PRICING
// ================================================================================
window.saveCreditPricing = async function() {
    const creditPrice = parseFloat(document.getElementById('billingCreditPrice')?.value || '6.99');
    alert(`Credit price saved: $${creditPrice} per credit\n\nNote: Update the edge function environment variables to apply this change.`);
};

// ================================================================================
// GRANT MANUAL CREDITS
// ================================================================================
window.grantManualCredits = async function() {
    const parentId = document.getElementById('billingGrantParent')?.value;
    const credits = parseInt(document.getElementById('billingGrantCredits')?.value || '1');
    const reason = document.getElementById('billingGrantReason')?.value || 'Manual admin grant';

    if (!parentId) {
        alert('Please select a parent');
        return;
    }

    if (credits < 1) {
        alert('Please enter at least 1 credit');
        return;
    }

    try {
        // Update parent_profiles.credits
        const { data: parent, error: parentFetchError } = await supabase
            .from('parent_profiles')
            .select('credits')
            .eq('id', parentId)
            .single();

        if (parentFetchError) throw parentFetchError;

        const { error: parentUpdateError } = await supabase
            .from('parent_profiles')
            .update({ credits: (parent?.credits ?? 0) + credits })
            .eq('id', parentId);

        if (parentUpdateError) throw parentUpdateError;

        // Update all children's credits for this parent
        const { data: children, error: childFetchError } = await supabase
            .from('children')
            .select('id, credits')
            .eq('parent_user_id', parentId);

        if (childFetchError) throw childFetchError;

        if (children && children.length > 0) {
            for (const child of children) {
                await supabase
                    .from('children')
                    .update({ credits: (child.credits ?? 0) + credits })
                    .eq('id', child.id);
            }
        }

        alert(`Successfully granted ${credits} credit(s) to parent and ${children?.length || 0} child(ren).\n\nRefresh the dashboard to see updated credits.`);
        document.getElementById('billingGrantCredits').value = '1';
        document.getElementById('billingGrantReason').value = '';
    } catch (error) {
        console.error('Error granting credits:', error);
        alert('Error granting credits: ' + error.message);
    }
};