// ================================================================================
// REWARDS TAB
// ================================================================================
import { supabase, rewards, setRewards } from './adminPage.js';

const rewardsListElement = document.getElementById('rewardsList');

async function loadRewards() {
    if (!rewardsListElement) return;
    rewardsListElement.innerHTML = '<div class="empty-rewards">Loading rewards...</div>';

    const { data, error } = await supabase
        .from('rewards')
        .select('*')
        .order('is_baseline', { ascending: false })
        .order('star_cost', { ascending: true });

    if (error) { console.error('Error loading rewards:', error); rewardsListElement.innerHTML = '<div class="empty-rewards">Failed to load rewards.</div>'; return; }
    setRewards(data || []);
    renderRewardsList();
}

window._adminLoadRewards = loadRewards;

function renderRewardsList() {
    if (!rewardsListElement) return;
    if (!rewards || rewards.length === 0) {
        rewardsListElement.innerHTML = '<div class="empty-rewards">No rewards yet. Add your first reward below.</div>';
        return;
    }

    rewardsListElement.innerHTML = rewards.map(reward => {
        const badge = reward.is_baseline ? '<span style="margin-left:8px; font-size:12px; color:#2e7d32; background:#e8f5e9; padding:2px 8px; border-radius:999px; font-weight:600;">Baseline</span>' : '';
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
                    <button class="btn-save" style="font-size:12px; padding:6px 12px;" onclick="saveRewardCost('${reward.id}')">💾 Save</button>
                </div>
            </div>
        `;
    }).join('');
}

window.saveRewardCost = async function(rewardId) {
    const input = document.getElementById(`reward-cost-${rewardId}`);
    if (!input) return;
    const starCost = parseInt(input.value, 10);
    if (isNaN(starCost) || starCost < 1) { alert('Star cost must be a positive number.'); return; }
    const { error } = await supabase.from('rewards').update({ star_cost: starCost }).eq('id', rewardId);
    if (error) { console.error('Error updating reward:', error); alert('Failed to update reward.'); return; }
    await loadRewards();
    alert('Reward updated successfully.');
};

window.deleteReward = async function(rewardId) {
    const reward = rewards.find(r => String(r.id) === String(rewardId));
    if (!reward || reward.is_baseline) return;
    if (!confirm(`Remove reward "${reward.title}"? This action cannot be undone.`)) return;
    const { error } = await supabase.from('rewards').delete().eq('id', rewardId).eq('is_baseline', false);
    if (error) { console.error('Error deleting reward:', error); alert('Failed to delete reward.'); return; }
    await loadRewards();
    alert('Reward removed.');
};

window.addReward = async function() {
    const titleInput = document.getElementById('rewardTitleInput');
    const costInput = document.getElementById('rewardStarCostInput');
    const iconInput = document.getElementById('rewardIconInput');
    const categorySelect = document.getElementById('rewardCategoryInput');
    const title = titleInput.value.trim();
    const starCost = parseInt(costInput.value, 10);
    if (!title) { alert('Please enter a reward title.'); return; }
    if (isNaN(starCost) || starCost < 1) { alert('Star cost must be at least 1.'); return; }
    const { data: user } = await supabase.auth.getUser();
    if (!user) { alert('You must be logged in to add rewards.'); return; }
    const { error } = await supabase.from('rewards').insert({
        parent_user_id: user.user.id, title, star_cost: starCost,
        icon: iconInput.value.trim() || '🎁', category: categorySelect.value || 'other', is_baseline: false
    });
    if (error) { console.error('Error adding reward:', error); alert('Failed to add reward.'); return; }
    titleInput.value = ''; costInput.value = ''; iconInput.value = ''; categorySelect.value = 'other';
    await loadRewards();
    alert('Reward added successfully.');
};