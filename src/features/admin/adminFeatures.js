import { getSettings, updateSettings } from './adminPage.js';

const FEATURE_DEFINITIONS = [
  {
    key: 'text_to_voice',
    label: 'Text to Voice (Read to Me)',
    description: 'Enables the "Read to me" narration button on modules. When off, the TTS player is hidden for all users.',
    defaultOn: true
  },
  {
    key: 'schools_program_enabled',
    label: 'Schools Program',
    description: 'Shows the Schools Program button on the landing page and dashboard. When off, the schools login and signup flow is hidden from all users.',
    defaultOn: false
  },
  {
    key: 'mini_games_enabled',
    label: 'Mini-Game Roadblocks',
    description: 'Enables the new mini-game roadblock system on the adventure map. When off, mini_game roadblocks fall back to a simple "I did it" tap.',
    defaultOn: false
  },
  {
    key: 'free_trial_enabled',
    label: 'Allow Free Trial',
    description: 'Shows the "Try Free" button on the landing page. When off, the free trial option is hidden from new visitors.',
    defaultOn: true
  }
];

let featureFlags = {};

window._adminLoadFeatures = async function () {
  const container = document.getElementById('featureFlagsList');
  if (!container) return;

  container.innerHTML = '<div style="text-align:center;padding:40px;color:#6b7c8f;"><p>Loading features...</p></div>';

  try {
    const settings = await getSettings();
    featureFlags = settings?.feature_flags || { text_to_voice: true };
    renderFeatures(container);
  } catch (err) {
    console.error('Failed to load feature flags:', err);
    container.innerHTML = '<p style="color:#e74c3c;padding:16px;">Failed to load features.</p>';
  }
};

function renderFeatures(container) {
  container.innerHTML = FEATURE_DEFINITIONS.map(f => {
    const stored = featureFlags[f.key];
    const isOn = stored === undefined ? f.defaultOn !== false : stored === true;
    return `
      <div style="display:flex; align-items:center; justify-content:space-between; padding:16px 20px; background:#f8f9fb; border-radius:12px; margin-bottom:12px; border:1px solid #e5e7eb;">
        <div style="flex:1; margin-right:24px;">
          <div style="font-weight:600; font-size:15px; color:#1a1a2e; margin-bottom:4px;">${f.label}</div>
          <div style="font-size:13px; color:#6b7c8f;">${f.description}</div>
        </div>
        <label style="position:relative; display:inline-block; width:52px; height:28px; flex-shrink:0; cursor:pointer;">
          <input type="checkbox" data-feature="${f.key}" ${isOn ? 'checked' : ''}
            style="opacity:0; width:0; height:0;"
            onchange="window._adminToggleFeature('${f.key}', this.checked)">
          <span style="position:absolute; inset:0; background:${isOn ? '#2A8F8F' : '#ccc'}; border-radius:28px; transition:background 0.25s;">
            <span style="position:absolute; top:3px; left:${isOn ? '26px' : '3px'}; width:22px; height:22px; background:#fff; border-radius:50%; transition:left 0.25s; box-shadow:0 1px 3px rgba(0,0,0,0.15);"></span>
          </span>
        </label>
      </div>
    `;
  }).join('');
}

window._adminToggleFeature = async function (key, enabled) {
  featureFlags[key] = enabled;

  // Re-render immediately for visual feedback
  const container = document.getElementById('featureFlagsList');
  if (container) renderFeatures(container);

  try {
    await updateSettings({ feature_flags: featureFlags });
    console.log(`Feature "${key}" set to ${enabled}`);
  } catch (err) {
    console.error('Failed to save feature flag:', err);
    // Revert on failure
    featureFlags[key] = !enabled;
    if (container) renderFeatures(container);
  }
};
