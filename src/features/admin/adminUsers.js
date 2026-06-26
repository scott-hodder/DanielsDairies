// ================================================================================
// USERS TAB - View all children, parents, and subscription status
// ================================================================================
import { supabase } from './adminPage.js';
import { escapeHtml } from '../../lib/sanitize.js';

let usersData = [];
let usersSearchTerm = '';
let usersFilterStatus = 'all'; // 'all', 'active', 'inactive'

// ================================================================================
// LOAD USERS DATA
// ================================================================================
window._adminLoadUsersData = async function loadUsersData() {
    try {
        // Load children with their parent info and subscription status
        const { data: children, error: childrenError } = await supabase
            .from('children')
            .select(`
                id,
                name,
                date_of_birth,
                brain_age,
                created_at,
                credits,
                parent_user_id
            `)
            .order('created_at', { ascending: false });

        if (childrenError) throw childrenError;

        // Load parent profiles
        const { data: parents, error: parentsError } = await supabase
            .from('parent_profiles')
            .select('id, username, credits, created_at, is_practitioner');

        if (parentsError) throw parentsError;

        // Load subscriptions
        const { data: subscriptions, error: subsError } = await supabase
            .from('parent_subscriptions')
            .select('parent_id, tier, status, current_period_end, cancel_at_period_end');

        if (subsError) throw subsError;

        // Create lookup maps
        const parentMap = {};
        (parents || []).forEach(p => {
            parentMap[p.id] = p;
        });

        const subscriptionMap = {};
        (subscriptions || []).forEach(s => {
            subscriptionMap[s.parent_id] = s;
        });

        // Combine data
        usersData = (children || []).map(child => {
            const parent = parentMap[child.parent_user_id] || {};
            const subscription = subscriptionMap[child.parent_user_id] || {};
            
            return {
                childId: child.id,
                childName: child.name,
                dateOfBirth: child.date_of_birth,
                brainAge: child.brain_age || '',
                childCredits: child.credits || 0,
                childCreatedAt: child.created_at,
                parentId: child.parent_user_id,
                parentUsername: parent.username || 'Unknown',
                parentCredits: parent.credits || 0,
                isPractitioner: parent.is_practitioner || false,
                subscriptionTier: subscription.tier || null,
                subscriptionStatus: subscription.status || 'inactive',
                subscriptionEnd: subscription.current_period_end,
                cancelAtPeriodEnd: subscription.cancel_at_period_end || false
            };
        });

        renderUsersTable();
    } catch (error) {
        console.error('Error loading users data:', error);
        const container = document.getElementById('usersTableContainer');
        if (container) {
            container.innerHTML = `<div style="color: #dc2626; padding: 20px; text-align: center;">Error loading users: ${escapeHtml(error.message)}</div>`;
        }
    }
};

// ================================================================================
// RENDER USERS TABLE
// ================================================================================
function renderUsersTable() {
    const container = document.getElementById('usersTableContainer');
    if (!container) return;

    // Filter data
    let filtered = usersData;

    if (usersSearchTerm) {
        const term = usersSearchTerm.toLowerCase();
        filtered = filtered.filter(u => 
            u.childName.toLowerCase().includes(term) ||
            u.parentUsername.toLowerCase().includes(term)
        );
    }

    if (usersFilterStatus !== 'all') {
        if (usersFilterStatus === 'active') {
            filtered = filtered.filter(u => u.subscriptionStatus === 'active' || u.subscriptionStatus === 'trialing');
        } else if (usersFilterStatus === 'inactive') {
            filtered = filtered.filter(u => u.subscriptionStatus !== 'active' && u.subscriptionStatus !== 'trialing');
        }
    }

    // Update count
    const countEl = document.getElementById('usersCount');
    if (countEl) {
        countEl.textContent = `${filtered.length} user${filtered.length !== 1 ? 's' : ''}`;
    }

    if (filtered.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #6b7c8f;">
                <div style="font-size: 48px; margin-bottom: 12px;">👤</div>
                <p style="margin: 0;">No users found${usersSearchTerm ? ' matching your search' : ''}.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <table class="users-table">
            <thead>
                <tr>
                    <th>Child Name</th>
                    <th>Date of Birth</th>
                    <th>Age</th>
                    <th>Brain Age</th>
                    <th>Parent</th>
                    <th>Credits</th>
                    <th>Subscription</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
                ${filtered.map(user => renderUserRow(user)).join('')}
            </tbody>
        </table>
    `;
}

function renderUserRow(user) {
    const age = calculateAge(user.dateOfBirth);
    const statusBadge = getStatusBadge(user.subscriptionStatus, user.cancelAtPeriodEnd);
    const tierLabel = user.subscriptionTier ? user.subscriptionTier.toUpperCase() : '-';
    const dobValue = user.dateOfBirth ? user.dateOfBirth.split('T')[0] : '';
    
    return `
        <tr data-child-id="${user.childId}">
            <td>
                <div style="font-weight: 600; color: #1a1a2e;">${escapeHtml(user.childName)}</div>
            </td>
            <td style="color: #6b7c8f; font-size: 13px;">
                <div class="dob-display" data-child-id="${user.childId}" style="display: flex; align-items: center; gap: 8px;">
                    <span class="dob-text">${user.dateOfBirth ? formatDate(user.dateOfBirth) : '-'}</span>
                    <button onclick="_adminEditDob('${user.childId}', '${dobValue}')" 
                            style="background: none; border: none; cursor: pointer; padding: 2px 6px; font-size: 12px; color: #6366F1; opacity: 0.7;"
                            title="Edit date of birth">✏️</button>
                </div>
                <div class="dob-edit" data-child-id="${user.childId}" style="display: none; align-items: center; gap: 6px;">
                    <input type="date" id="dob-input-${user.childId}" value="${dobValue}" 
                           style="padding: 4px 8px; border: 1.5px solid #E2E8F0; border-radius: 6px; font-size: 12px;">
                    <button onclick="_adminSaveDob('${user.childId}')" 
                            style="background: #10B981; color: white; border: none; border-radius: 4px; padding: 4px 8px; font-size: 11px; cursor: pointer; font-weight: 600;">Save</button>
                    <button onclick="_adminCancelDobEdit('${user.childId}')" 
                            style="background: #6b7c8f; color: white; border: none; border-radius: 4px; padding: 4px 8px; font-size: 11px; cursor: pointer;">Cancel</button>
                </div>
            </td>
            <td style="color: #6b7c8f; font-size: 13px;" class="age-cell" data-child-id="${user.childId}">
                ${age !== null ? `${age} yrs` : '-'}
            </td>
            <td style="color: #6b7c8f; font-size: 13px;">
                <div class="brain-age-display" data-child-id="${user.childId}" style="display: flex; align-items: center; gap: 8px;">
                    <span class="brain-age-text">${user.brainAge || '-'}</span>
                    <button onclick="_adminEditBrainAge('${user.childId}', '${user.brainAge}')"
                            style="background: none; border: none; cursor: pointer; padding: 2px 6px; font-size: 12px; color: #6366F1; opacity: 0.7;"
                            title="Edit brain age">✏️</button>
                </div>
                <div class="brain-age-edit" data-child-id="${user.childId}" style="display: none; align-items: center; gap: 6px;">
                    <select id="brain-age-input-${user.childId}"
                            style="padding: 4px 8px; border: 1.5px solid #E2E8F0; border-radius: 6px; font-size: 12px;">
                        <option value="">Auto (from DOB)</option>
                        <option value="6-8" ${user.brainAge === '6-8' ? 'selected' : ''}>6-8</option>
                        <option value="9-11" ${user.brainAge === '9-11' ? 'selected' : ''}>9-11</option>
                        <option value="12-14" ${user.brainAge === '12-14' ? 'selected' : ''}>12-14</option>
                        <option value="15-18" ${user.brainAge === '15-18' ? 'selected' : ''}>15-18</option>
                    </select>
                    <button onclick="_adminSaveBrainAge('${user.childId}')"
                            style="background: #10B981; color: white; border: none; border-radius: 4px; padding: 4px 8px; font-size: 11px; cursor: pointer; font-weight: 600;">Save</button>
                    <button onclick="_adminCancelBrainAgeEdit('${user.childId}')"
                            style="background: #6b7c8f; color: white; border: none; border-radius: 4px; padding: 4px 8px; font-size: 11px; cursor: pointer;">Cancel</button>
                </div>
            </td>
            <td>
                <div style="font-size: 13px; color: #405878;">${escapeHtml(user.parentUsername)}</div>
                <label style="display:flex; align-items:center; gap:4px; font-size:11px; color:#6b7c8f; margin-top:3px; cursor:pointer;" title="Allow this parent to access the Schools Program">
                    <input type="checkbox" ${user.isPractitioner ? 'checked' : ''} onchange="_adminTogglePractitioner('${user.parentId}', this.checked)" style="cursor:pointer;">
                    Practitioner
                </label>
            </td>
            <td style="text-align: center;">
                <span style="background: #f0f9ff; color: #0369a1; padding: 2px 8px; border-radius: 12px; font-size: 12px; font-weight: 600;">
                    ${user.childCredits}
                </span>
            </td>
            <td style="font-size: 13px; color: #6b7c8f;">
                ${tierLabel}
            </td>
            <td>
                ${statusBadge}
            </td>
        </tr>
    `;
}

// ================================================================================
// DOB EDIT FUNCTIONS
// ================================================================================
window._adminEditDob = function(childId, currentDob) {
    // Hide display, show edit
    const displayEl = document.querySelector(`.dob-display[data-child-id="${childId}"]`);
    const editEl = document.querySelector(`.dob-edit[data-child-id="${childId}"]`);
    if (displayEl) displayEl.style.display = 'none';
    if (editEl) editEl.style.display = 'flex';
};

window._adminCancelDobEdit = function(childId) {
    // Show display, hide edit
    const displayEl = document.querySelector(`.dob-display[data-child-id="${childId}"]`);
    const editEl = document.querySelector(`.dob-edit[data-child-id="${childId}"]`);
    if (displayEl) displayEl.style.display = 'flex';
    if (editEl) editEl.style.display = 'none';
};

window._adminSaveDob = async function(childId) {
    const input = document.getElementById(`dob-input-${childId}`);
    if (!input) return;

    const newDob = input.value;
    if (!newDob) {
        alert('Please select a valid date');
        return;
    }

    try {
        const { error } = await supabase
            .from('children')
            .update({ date_of_birth: newDob })
            .eq('id', childId);

        if (error) throw error;

        // Update local data
        const userIndex = usersData.findIndex(u => u.childId === childId);
        if (userIndex !== -1) {
            usersData[userIndex].dateOfBirth = newDob;
        }

        // Update the display
        const displayEl = document.querySelector(`.dob-display[data-child-id="${childId}"]`);
        const editEl = document.querySelector(`.dob-edit[data-child-id="${childId}"]`);
        const ageCell = document.querySelector(`.age-cell[data-child-id="${childId}"]`);
        
        if (displayEl) {
            const dobText = displayEl.querySelector('.dob-text');
            if (dobText) dobText.textContent = formatDate(newDob);
            displayEl.style.display = 'flex';
        }
        if (editEl) editEl.style.display = 'none';
        if (ageCell) {
            const age = calculateAge(newDob);
            ageCell.textContent = age !== null ? `${age} yrs` : '-';
        }

    } catch (err) {
        console.error('Error updating DOB:', err);
        alert('Failed to update date of birth: ' + err.message);
    }
};

// ================================================================================
// BRAIN AGE EDIT FUNCTIONS
// ================================================================================
window._adminEditBrainAge = function(childId, currentBrainAge) {
    const displayEl = document.querySelector(`.brain-age-display[data-child-id="${childId}"]`);
    const editEl = document.querySelector(`.brain-age-edit[data-child-id="${childId}"]`);
    if (displayEl) displayEl.style.display = 'none';
    if (editEl) editEl.style.display = 'flex';
};

window._adminCancelBrainAgeEdit = function(childId) {
    const displayEl = document.querySelector(`.brain-age-display[data-child-id="${childId}"]`);
    const editEl = document.querySelector(`.brain-age-edit[data-child-id="${childId}"]`);
    if (displayEl) displayEl.style.display = 'flex';
    if (editEl) editEl.style.display = 'none';
};

window._adminSaveBrainAge = async function(childId) {
    const select = document.getElementById(`brain-age-input-${childId}`);
    if (!select) return;

    const newBrainAge = select.value || null; // empty string means auto (null in DB)

    try {
        const { error } = await supabase
            .from('children')
            .update({ brain_age: newBrainAge })
            .eq('id', childId);

        if (error) throw error;

        // Update local data
        const userIndex = usersData.findIndex(u => u.childId === childId);
        if (userIndex !== -1) {
            usersData[userIndex].brainAge = newBrainAge || '';
        }

        // Update the display
        const displayEl = document.querySelector(`.brain-age-display[data-child-id="${childId}"]`);
        const editEl = document.querySelector(`.brain-age-edit[data-child-id="${childId}"]`);

        if (displayEl) {
            const brainAgeText = displayEl.querySelector('.brain-age-text');
            if (brainAgeText) brainAgeText.textContent = newBrainAge || '-';
            displayEl.style.display = 'flex';
        }
        if (editEl) editEl.style.display = 'none';

    } catch (err) {
        console.error('Error updating brain age:', err);
        alert('Failed to update brain age: ' + err.message);
    }
};

function getStatusBadge(status, cancelAtPeriodEnd) {
    const statusConfig = {
        active: { bg: '#dcfce7', color: '#166534', label: 'Active' },
        trialing: { bg: '#dbeafe', color: '#1e40af', label: 'Trial' },
        past_due: { bg: '#fef3c7', color: '#92400e', label: 'Past Due' },
        canceled: { bg: '#fee2e2', color: '#991b1b', label: 'Canceled' },
        paused: { bg: '#f3e8ff', color: '#6b21a8', label: 'Paused' },
        inactive: { bg: '#f3f4f6', color: '#6b7280', label: 'Inactive' }
    };

    const config = statusConfig[status] || statusConfig.inactive;
    let label = config.label;
    
    if (status === 'active' && cancelAtPeriodEnd) {
        label = 'Canceling';
    }

    return `<span style="background: ${config.bg}; color: ${config.color}; padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: 600;">${label}</span>`;
}

function calculateAge(dateOfBirth) {
    if (!dateOfBirth) return null;
    const dob = new Date(dateOfBirth);
    const now = new Date();
    let age = now.getFullYear() - dob.getFullYear();
    const monthDiff = now.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) {
        age--;
    }
    return age;
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
}


// ================================================================================
// SEARCH AND FILTER HANDLERS
// ================================================================================
window._adminUsersSearch = function(value) {
    usersSearchTerm = value || '';
    renderUsersTable();
};

window._adminUsersFilterStatus = function(value) {
    usersFilterStatus = value || 'all';
    renderUsersTable();
};

// ================================================================================
// EXPORT CSV
// ================================================================================
window._adminExportUsersCsv = function() {
    if (usersData.length === 0) {
        alert('No data to export');
        return;
    }

    const headers = ['Child Name', 'Date of Birth', 'Age', 'Brain Age', 'Parent Email', 'Child Credits', 'Subscription Tier', 'Subscription Status'];
    const rows = usersData.map(u => [
        u.childName,
        u.dateOfBirth || '',
        calculateAge(u.dateOfBirth) || '',
        u.brainAge || '',
        u.parentUsername,
        u.childCredits,
        u.subscriptionTier || '',
        u.subscriptionStatus
    ]);

    const csvContent = [headers, ...rows]
        .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `users_export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
};

// ================================================================================
// TOGGLE PRACTITIONER STATUS
// ================================================================================
window._adminTogglePractitioner = async function(parentId, isPractitioner) {
    try {
        const { error } = await supabase
            .from('parent_profiles')
            .update({ is_practitioner: isPractitioner })
            .eq('id', parentId);

        if (error) throw error;
        console.log(`[Admin] Set practitioner=${isPractitioner} for parent ${parentId}`);
    } catch (error) {
        console.error('Error toggling practitioner status:', error);
        alert('Error updating practitioner status: ' + error.message);
        // Reload to reset checkbox state
        window._adminLoadUsersData();
    }
};
