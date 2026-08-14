import { supabase } from '../../supabaseClient.js';
import { escapeHtml } from '../../lib/sanitize.js';
import {
  getAllSchools, createSchool, updateSchool, deleteSchool,
  getAllWorkbooks, createWorkbook, updateWorkbook, deleteWorkbook, activateWorkbook,
  getAllSchoolUsers
} from '../schools/schoolsService.js';

// ============================================================
// State
// ============================================================
let schools = [];
let workbooks = [];
let schoolUsers = [];
let activeSubTab = 'schools';

// ============================================================
// Load Schools Tab
// ============================================================
window._adminLoadSchools = async function () {
  try {
    [schools, workbooks, schoolUsers] = await Promise.all([
      getAllSchools(),
      getAllWorkbooks(),
      getAllSchoolUsers()
    ]);

    renderSchoolsSubTabs();
    switchSchoolsSubTab(null, activeSubTab);
  } catch (err) {
    console.error('[Admin Schools] Load error:', err);
  }
};

// ============================================================
// Sub-tab Navigation
// ============================================================
function renderSchoolsSubTabs() {
  const container = document.getElementById('schoolsSubTabs');
  if (!container) return;

  container.innerHTML = `
    <button class="sub-tab ${activeSubTab === 'schools' ? 'active' : ''}" onclick="switchSchoolsSubTab(event, 'schools')">Schools</button>
    <button class="sub-tab ${activeSubTab === 'childWorkbooks' ? 'active' : ''}" onclick="switchSchoolsSubTab(event, 'childWorkbooks')">Child Workbooks</button>
    <button class="sub-tab ${activeSubTab === 'practitionerWorkbooks' ? 'active' : ''}" onclick="switchSchoolsSubTab(event, 'practitionerWorkbooks')">Practitioner Workbooks</button>
    <button class="sub-tab ${activeSubTab === 'schoolUsers' ? 'active' : ''}" onclick="switchSchoolsSubTab(event, 'schoolUsers')">Users</button>
  `;
}

window.switchSchoolsSubTab = function (evt, tab) {
  activeSubTab = tab;

  // Update active state
  document.querySelectorAll('#schoolsSubTabs .sub-tab').forEach(btn => btn.classList.remove('active'));
  if (evt?.target) evt.target.classList.add('active');
  else document.querySelector(`#schoolsSubTabs .sub-tab:nth-child(${['schools', 'childWorkbooks', 'practitionerWorkbooks', 'schoolUsers'].indexOf(tab) + 1})`)?.classList.add('active');

  const content = document.getElementById('schoolsSubContent');
  if (!content) return;

  if (tab === 'schools') renderSchoolsList(content);
  else if (tab === 'childWorkbooks') renderWorkbooksList(content, 'child');
  else if (tab === 'practitionerWorkbooks') renderWorkbooksList(content, 'practitioner');
  else if (tab === 'schoolUsers') renderSchoolUsersList(content);
};

// ============================================================
// Schools List
// ============================================================
function renderSchoolsList(container) {
  const activeCount = schools.filter(s => s.is_active).length;

  container.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
      <p style="color:#6b7c8f; font-size:13px;">${schools.length} school${schools.length !== 1 ? 's' : ''} (${activeCount} active)</p>
      <button class="btn-save" onclick="showAddSchoolForm()">+ Add School</button>
    </div>

    <div id="addSchoolForm" style="display:none; background:#f8f9fa; border-radius:10px; padding:16px; margin-bottom:16px;">
      <div style="display:grid; grid-template-columns:1fr 1fr auto; gap:10px; align-items:end;">
        <div>
          <label style="display:block; font-size:12px; font-weight:600; color:#405878; margin-bottom:4px;">School Name</label>
          <input type="text" id="newSchoolName" class="form-input" placeholder="e.g. Springfield Primary" style="padding:8px 12px; font-size:13px;">
        </div>
        <div>
          <label style="display:block; font-size:12px; font-weight:600; color:#405878; margin-bottom:4px;">Access Key</label>
          <input type="text" id="newSchoolKey" class="form-input" placeholder="e.g. SPR-2026" style="padding:8px 12px; font-size:13px;">
        </div>
        <button class="btn-save" onclick="addSchool()" style="padding:8px 16px; font-size:13px;">Save</button>
      </div>
    </div>

    <div style="display:grid; gap:8px;">
      ${schools.map(school => `
        <div style="display:flex; align-items:center; justify-content:space-between; background:#fff; border:1px solid #e5e7eb; border-radius:10px; padding:12px 16px;">
          <div style="display:flex; align-items:center; gap:12px;">
            <span style="font-size:20px;">&#127979;</span>
            <div>
              <strong style="color:#1a1a2e; font-size:14px;">${escapeHtml(school.name)}</strong>
              <div style="font-size:11px; color:#6b7c8f; margin-top:2px;">
                Key: <code style="background:#f0f0f0; padding:1px 6px; border-radius:4px; font-size:11px;">${escapeHtml(school.access_key)}</code>
                &nbsp;|&nbsp; ${school.is_active ? '<span style="color:#2d6a4f;">Active</span>' : '<span style="color:#c62828;">Inactive</span>'}
              </div>
            </div>
          </div>
          <div style="display:flex; gap:6px;">
            <button class="btn-small" onclick="toggleSchoolActive('${school.id}', ${!school.is_active})" style="font-size:11px; padding:4px 10px;">
              ${school.is_active ? 'Deactivate' : 'Activate'}
            </button>
            <button class="btn-small btn-danger" onclick="removeSchool('${school.id}', '${escapeHtml(school.name)}')" style="font-size:11px; padding:4px 10px;">Delete</button>
          </div>
        </div>
      `).join('')}
      ${schools.length === 0 ? '<p style="text-align:center; color:#6b7c8f; padding:32px; font-size:14px;">No schools added yet.</p>' : ''}
    </div>
  `;
}

window.showAddSchoolForm = function () {
  const form = document.getElementById('addSchoolForm');
  if (form) form.style.display = form.style.display === 'none' ? 'block' : 'none';
};

window.addSchool = async function () {
  const name = document.getElementById('newSchoolName')?.value?.trim();
  const key = document.getElementById('newSchoolKey')?.value?.trim();

  if (!name || !key) {
    alert('Please enter both school name and access key.');
    return;
  }

  try {
    await createSchool(name, key);
    schools = await getAllSchools();
    renderSchoolsList(document.getElementById('schoolsSubContent'));
  } catch (err) {
    console.error('[Admin Schools] Add error:', err);
    alert('Error adding school: ' + err.message);
  }
};

window.toggleSchoolActive = async function (id, isActive) {
  try {
    await updateSchool(id, { is_active: isActive });
    schools = await getAllSchools();
    renderSchoolsList(document.getElementById('schoolsSubContent'));
  } catch (err) {
    alert('Error: ' + err.message);
  }
};

window.removeSchool = async function (id, name) {
  if (!confirm(`Delete school "${name}"? This will also remove all associated users. This cannot be undone.`)) return;

  try {
    await deleteSchool(id);
    schools = await getAllSchools();
    renderSchoolsList(document.getElementById('schoolsSubContent'));
  } catch (err) {
    alert('Error: ' + err.message);
  }
};

// ============================================================
// Workbooks List
// ============================================================
function renderWorkbooksList(container, audience) {
  const filtered = workbooks.filter(w => w.audience === audience);
  const label = audience === 'child' ? 'Child' : 'Practitioner';
  const activeWorkbook = filtered.find(w => w.is_active);

  container.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
      <div>
        <p style="color:#6b7c8f; font-size:13px;">${filtered.length} workbook${filtered.length !== 1 ? 's' : ''}</p>
        ${activeWorkbook
      ? `<p style="color:#2d6a4f; font-size:12px; font-weight:600; margin-top:2px;">Active: ${escapeHtml(activeWorkbook.title)}</p>`
      : '<p style="color:#c62828; font-size:12px; font-weight:600; margin-top:2px;">No active workbook</p>'}
      </div>
      <button class="btn-save" onclick="showAddWorkbookForm('${audience}')">+ Add ${label} Workbook</button>
    </div>

    <div id="addWorkbookForm_${audience}" style="display:none; background:#f8f9fa; border-radius:10px; padding:16px; margin-bottom:16px;">
      <div style="display:grid; gap:10px;">
        <div>
          <label style="display:block; font-size:12px; font-weight:600; color:#405878; margin-bottom:4px;">Workbook Title</label>
          <input type="text" id="newWorkbookTitle_${audience}" class="form-input" placeholder="e.g. Term 1 Workbook" style="padding:8px 12px; font-size:13px;">
        </div>
        <div>
          <label style="display:block; font-size:12px; font-weight:600; color:#405878; margin-bottom:4px;">HTML Content</label>
          <textarea id="newWorkbookHtml_${audience}" class="form-input" rows="8" placeholder="Paste workbook HTML here..." style="padding:8px 12px; font-size:13px; font-family:monospace; resize:vertical;"></textarea>
        </div>
        <div style="display:flex; gap:8px; justify-content:flex-end;">
          <button class="btn-small" onclick="document.getElementById('addWorkbookForm_${audience}').style.display='none'" style="padding:6px 14px;">Cancel</button>
          <button class="btn-save" onclick="addWorkbook('${audience}')" style="padding:6px 14px; font-size:13px;">Save Workbook</button>
        </div>
      </div>
    </div>

    <div style="display:grid; gap:8px;">
      ${filtered.map(wb => `
        <div style="display:flex; align-items:center; justify-content:space-between; background:#fff; border:1px solid ${wb.is_active ? '#2d6a4f' : '#e5e7eb'}; border-radius:10px; padding:12px 16px; ${wb.is_active ? 'border-width:2px;' : ''}">
          <div style="display:flex; align-items:center; gap:12px;">
            <span style="font-size:20px;">${wb.is_active ? '&#9989;' : '&#128196;'}</span>
            <div>
              <strong style="color:#1a1a2e; font-size:14px;">${escapeHtml(wb.title)}</strong>
              <div style="font-size:11px; color:#6b7c8f; margin-top:2px;">
                ${wb.is_active ? '<span style="color:#2d6a4f; font-weight:600;">ACTIVE</span> | ' : ''}
                Created: ${new Date(wb.created_at).toLocaleDateString()}
                &nbsp;|&nbsp; ${(wb.html_content?.length || 0).toLocaleString()} chars
              </div>
            </div>
          </div>
          <div style="display:flex; gap:6px;">
            ${!wb.is_active ? `<button class="btn-save" onclick="setActiveWorkbook('${wb.id}', '${audience}')" style="font-size:11px; padding:4px 12px;">Set Active</button>` : ''}
            <button class="btn-small" onclick="previewWorkbook('${wb.id}')" style="font-size:11px; padding:4px 10px;">Preview</button>
            <button class="btn-small btn-danger" onclick="removeWorkbook('${wb.id}', '${escapeHtml(wb.title)}')" style="font-size:11px; padding:4px 10px;">Delete</button>
          </div>
        </div>
      `).join('')}
      ${filtered.length === 0 ? `<p style="text-align:center; color:#6b7c8f; padding:32px; font-size:14px;">No ${label.toLowerCase()} workbooks yet. Add one above.</p>` : ''}
    </div>
  `;
}

window.showAddWorkbookForm = function (audience) {
  const form = document.getElementById(`addWorkbookForm_${audience}`);
  if (form) form.style.display = form.style.display === 'none' ? 'block' : 'none';
};

window.addWorkbook = async function (audience) {
  const title = document.getElementById(`newWorkbookTitle_${audience}`)?.value?.trim();
  const html = document.getElementById(`newWorkbookHtml_${audience}`)?.value;

  if (!title || !html) {
    alert('Please enter both title and HTML content.');
    return;
  }

  try {
    await createWorkbook(title, audience, html);
    workbooks = await getAllWorkbooks();
    renderWorkbooksList(document.getElementById('schoolsSubContent'), audience);
  } catch (err) {
    console.error('[Admin Schools] Add workbook error:', err);
    alert('Error adding workbook: ' + err.message);
  }
};

window.setActiveWorkbook = async function (workbookId, audience) {
  try {
    await activateWorkbook(workbookId, audience);
    workbooks = await getAllWorkbooks();
    renderWorkbooksList(document.getElementById('schoolsSubContent'), audience);
  } catch (err) {
    alert('Error activating workbook: ' + err.message);
  }
};

window.previewWorkbook = function (workbookId) {
  const wb = workbooks.find(w => w.id === workbookId);
  if (!wb) return;

  const win = window.open('', '_blank', 'width=800,height=600');
  if (!win) {
    alert('Please allow pop-ups to preview workbooks.');
    return;
  }

  win.document.write(wb.html_content);
  win.document.close();
};

window.removeWorkbook = async function (id, title) {
  if (!confirm(`Delete workbook "${title}"? This cannot be undone.`)) return;

  try {
    await deleteWorkbook(id);
    workbooks = await getAllWorkbooks();
    switchSchoolsSubTab(null, activeSubTab);
  } catch (err) {
    alert('Error: ' + err.message);
  }
};

// ============================================================
// School Users List
// ============================================================
function renderSchoolUsersList(container) {
  container.innerHTML = `
    <p style="color:#6b7c8f; font-size:13px; margin-bottom:16px;">${schoolUsers.length} school program user${schoolUsers.length !== 1 ? 's' : ''}</p>

    <div style="display:grid; gap:6px;">
      ${schoolUsers.map(u => `
        <div style="display:flex; align-items:center; justify-content:space-between; background:#fff; border:1px solid #e5e7eb; border-radius:10px; padding:10px 16px;">
          <div style="display:flex; align-items:center; gap:12px;">
            <span style="font-size:18px;">${u.role === 'child' ? '&#128103;' : '&#129489;&#8205;&#127979;'}</span>
            <div>
              <strong style="color:#1a1a2e; font-size:14px;">${escapeHtml(u.display_name)}</strong>
              <div style="font-size:11px; color:#6b7c8f; margin-top:2px;">
                ${u.role === 'child' ? 'Student' : 'Practitioner'}
                &nbsp;|&nbsp; ${escapeHtml(u.schools?.name || 'Unknown school')}
                &nbsp;|&nbsp; ${u.is_active ? '<span style="color:#2d6a4f;">Active</span>' : '<span style="color:#c62828;">Inactive</span>'}
              </div>
            </div>
          </div>
          <div style="font-size:11px; color:#6b7c8f;">
            Joined: ${new Date(u.created_at).toLocaleDateString()}
          </div>
        </div>
      `).join('')}
      ${schoolUsers.length === 0 ? '<p style="text-align:center; color:#6b7c8f; padding:32px; font-size:14px;">No school program users yet.</p>' : ''}
    </div>
  `;
}

// ============================================================
// Utility
// ============================================================
