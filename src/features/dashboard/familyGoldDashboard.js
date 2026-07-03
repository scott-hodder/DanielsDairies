// ================================================
// FAMILY GOLD DASHBOARD — parent home for Gold members
//
// Adapted from the Family Gold design mockup (docs/DD_Family_Gold_Dashboard.html).
// This is the default view for parents on a Gold membership: the practical
// side of Daniel's Diaries — how the program is delivered, the family's
// regular "Daniel time", practitioner appointments and tasks, the child's
// progress at a glance, and a door into the child's world.
//
// Data honesty rules:
//  - Progress stats and Super Skill roads are computed from REAL app data.
//  - Practitioner-fed content (delivery model, tasks, guides) shows gentle
//    empty states until the practitioner plumbing exists — nothing is faked.
//  - Daniel time and the next appointment are parent-entered for now and
//    persist per child on this device (localStorage), with working
//    add-to-calendar (.ics) export.
// ================================================

import { getSuperSkills } from '../../services/databaseService.js'
import { escapeHtml } from '../../lib/sanitize.js'

// ── Gold gate ─────────────────────────────────────────────────────
// True for an explicit "gold" tier (when it ships) or the current top
// tier, so Gold families get the hub the day the tier is renamed.
export function isGoldTier(subscription) {
  const tier = (subscription?.tier || '').toLowerCase()
  if (!tier) return false
  if (tier.includes('gold')) return true
  return tier === 'top'
}

// ── Local persistence (per child, per device — prototype scope) ──

function timeKey(childId) { return `fg_time_${childId}` }
function apptKey(childId) { return `fg_appt_${childId}` }
function tasksKey(childId) { return `fg_tasks_${childId}` }

function loadJson(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) || fallback } catch (_) { return fallback }
}
function saveJson(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch (_) {}
}

// ── Reference data ────────────────────────────────────────────────

const DAYS = [
  { label: 'Mon', ics: 'MO' }, { label: 'Tue', ics: 'TU' }, { label: 'Wed', ics: 'WE' },
  { label: 'Thu', ics: 'TH' }, { label: 'Fri', ics: 'FR' }, { label: 'Sat', ics: 'SA' }, { label: 'Sun', ics: 'SU' },
]

const DELIVERY_MODELS = [
  { icon: '🧑‍⚕️', title: 'In session with your practitioner', desc: 'Your practitioner runs the modules with your child in their sessions, in person or online.' },
  { icon: '🏠', title: 'At home, with a facilitator', desc: "You run the modules at home with your child, and a Daniel's Diaries facilitator checks in and supports you." },
  { icon: '🤝', title: 'Home use with parent check-ins', desc: 'Your child uses the app at home, and you meet your practitioner to review progress and plan next steps.' },
]

const APPT_TYPES = ['Parent review (online)', 'Parent review (in person)', 'Joint session with child', 'Facilitator check-in']

// ── State ─────────────────────────────────────────────────────────

let _container = null
let _ctx = null
let _superSkills = null

// ── Public API ────────────────────────────────────────────────────

/**
 * Render the Family Gold hub.
 * @param {HTMLElement} container
 * @param {Object} ctx { child, modules, childModules, onOpenKidWorld }
 */
export async function initFamilyGoldTab(container, ctx) {
  _container = container
  _ctx = ctx
  injectStyles()
  if (_superSkills === null) {
    try { _superSkills = await getSuperSkills() || [] } catch (_) { _superSkills = [] }
  }
  render()
}

// ── Progress helpers (same rules as the Brain Town map) ──────────

function slugOf(skill) {
  return skill.slug || (skill.name || skill.title || '').toLowerCase().replace(/\s+/g, '-')
}

function skillProgress(skill) {
  const slug = slugOf(skill)
  const modules = (_ctx.modules || []).filter(m =>
    m.super_skill_id === skill.id ||
    (m.category && m.category.toLowerCase().replace(/\s+/g, '-') === slug)
  )
  const done = modules.filter(m =>
    (_ctx.childModules || []).some(cm => cm.module_id === m.id && cm.is_completed === true)
  ).length
  return { done, total: modules.length, pct: modules.length ? Math.round(done / modules.length * 100) : 0 }
}

// ── Render ────────────────────────────────────────────────────────

function render() {
  if (!_container || !_ctx) return
  const child = _ctx.child || {}
  const childId = child.id || 'anon'
  const name = escapeHtml(child.name || 'Your child')

  const time = loadJson(timeKey(childId), { days: [], time: '16:00' })
  const appt = loadJson(apptKey(childId), null)
  const tasks = loadJson(tasksKey(childId), [])

  const completed = (_ctx.childModules || []).filter(cm => cm.is_completed === true).length
  const stars = child.stars || 0
  const streak = child.day_streak || child.streak || 0
  const level = child.level || 1

  _container.innerHTML = `
    <div class="fg-wrap">

      <div class="fg-gold-strip">
        <span class="fg-gi">⭐</span>
        <p><strong>You're on Gold.</strong> Your child gets the full Daniel's Diaries world, plus practitioner support, facilitated session plans, and the guides your practitioner shares with you.</p>
      </div>

      <div class="fg-grid2">
        <div class="fg-panel">
          <h3>How we're using Daniel's Diaries</h3>
          <p class="fg-desc">Agreed together with your practitioner.</p>
          <div class="fg-models">
            ${DELIVERY_MODELS.map(m => `
              <div class="fg-model">
                <span class="fg-model-ic">${m.icon}</span>
                <div><div class="fg-model-t">${m.title}</div><div class="fg-model-d">${m.desc}</div></div>
              </div>`).join('')}
          </div>
          <p class="fg-note">Your practitioner will confirm which of these fits your family — it will show here once set.</p>
        </div>

        <div class="fg-panel">
          <h3>Your Daniel time</h3>
          <p class="fg-desc">Pick your family's regular rhythm — a predictable time makes practice stick.</p>
          <div class="fg-days" id="fgDays">
            ${DAYS.map((d, i) => `<button class="fg-day ${time.days.includes(i) ? 'on' : ''}" data-day="${i}">${d.label}</button>`).join('')}
          </div>
          <div class="fg-time-row">
            <label for="fgTime">at</label>
            <input type="time" id="fgTime" value="${escapeHtml(time.time || '16:00')}" />
            <button class="fg-btn fg-btn-ghost" id="fgTimeIcs" ${time.days.length ? '' : 'disabled'}>＋ Add to calendar</button>
          </div>
        </div>
      </div>

      <div class="fg-grid2">
        <div class="fg-panel">
          <h3>Next appointment</h3>
          <p class="fg-desc">With your practitioner.</p>
          <div id="fgAppt">
            ${appt ? `
              <div class="fg-appt">
                <div class="fg-appt-cal">📅</div>
                <div>
                  <div class="fg-appt-when">${escapeHtml(formatDate(appt.date, appt.time))} · ${escapeHtml(appt.time || '')}</div>
                  <div class="fg-appt-type">${escapeHtml(appt.type || '')}</div>
                </div>
              </div>
              <div class="fg-btn-row">
                <button class="fg-btn fg-btn-ghost" id="fgApptIcs">＋ Add to calendar</button>
                <button class="fg-btn fg-btn-ghost" id="fgApptClear">Remove</button>
              </div>
            ` : `
              <p class="fg-note">No appointment saved yet. Your practitioner books these with you — you can note the next one here.</p>
              <div class="fg-appt-form">
                <input type="date" id="fgApptDate" aria-label="Appointment date" />
                <input type="time" id="fgApptTime" value="15:30" aria-label="Appointment time" />
                <select id="fgApptType" aria-label="Appointment type">${APPT_TYPES.map(t => `<option>${t}</option>`).join('')}</select>
                <button class="fg-btn fg-btn-gold" id="fgApptSave">Save</button>
              </div>
            `}
          </div>
        </div>

        <div class="fg-panel">
          <h3>Tasks from your practitioner</h3>
          <p class="fg-desc">Little things to try between sessions. Tick them off as you go.</p>
          <div id="fgTasks">
            ${tasks.length ? tasks.map((t, i) => `
              <div class="fg-task ${t.done ? 'done' : ''}" data-task="${i}">
                <div class="fg-task-box">${t.done ? '✓' : ''}</div>
                <div class="fg-task-txt">${escapeHtml(t.text)}</div>
              </div>`).join('')
            : '<p class="fg-note">No tasks right now. Tasks your practitioner sets between sessions will appear here.</p>'}
          </div>
        </div>
      </div>

      <div class="fg-panel">
        <h3>${name}'s progress</h3>
        <p class="fg-desc">What your child has been doing in the app — engagement to celebrate and support, not a clinical measure.</p>
        <div class="fg-stats">
          <div class="fg-stat"><div class="fg-stat-v">${completed}</div><div class="fg-stat-l">Roads built</div></div>
          <div class="fg-stat"><div class="fg-stat-v">${stars}</div><div class="fg-stat-l">Stars</div></div>
          <div class="fg-stat"><div class="fg-stat-v">${streak}</div><div class="fg-stat-l">Day streak</div></div>
          <div class="fg-stat"><div class="fg-stat-v">${level}</div><div class="fg-stat-l">Level</div></div>
        </div>
        <div class="fg-roads">
          ${(_superSkills || []).map(sk => {
            const p = skillProgress(sk)
            const color = sk.theme_color && sk.theme_color !== '#405878' ? sk.theme_color : '#4c6c96'
            const img = sk.character_image_url
            return `
              <div class="fg-road">
                <div class="fg-road-top">
                  <div class="fg-road-ic" style="background:${escapeHtml(color)}22;border-color:${escapeHtml(color)}">
                    ${img ? `<img src="${escapeHtml(img)}" alt=""/>` : '⭐'}
                  </div>
                  <div class="fg-road-nm">${escapeHtml(sk.name || sk.title || '')}</div>
                </div>
                <div class="fg-road-bar"><span style="width:${Math.max(4, p.pct)}%;background:${escapeHtml(color)}"></span></div>
                <div class="fg-road-mod">${p.done} of ${p.total} adventures</div>
              </div>`
          }).join('')}
        </div>
      </div>

      <div class="fg-panel">
        <h3>Guides from your practitioner</h3>
        <p class="fg-desc">Plain-language guides on how your child's profile shows up day to day, and what helps.</p>
        <p class="fg-note">Nothing shared yet. Guides your practitioner shares with you will appear here.</p>
      </div>

      <div class="fg-launch">
        <img src="/images/characters/DanielTheDogThumbsUp.webp" alt="" class="fg-launch-dog" />
        <div>
          <h3>Open ${name}'s world</h3>
          <p>The fun part — where ${name} explores Brain Town, builds roads and earns stars with Daniel.</p>
        </div>
        <button class="fg-btn fg-btn-gold" id="fgOpenWorld">Open Brain Town →</button>
      </div>

      <p class="fg-footer">Daniel's Diaries is an educational wellbeing tool informed by evidence-based principles. It is not therapy, clinical treatment, or a substitute for professional advice.</p>
    </div>
  `

  wireEvents(childId, time, appt, tasks)
}

// ── Events ────────────────────────────────────────────────────────

function wireEvents(childId, time, appt, tasks) {
  const c = _container

  // Daniel time: day chips + time input
  c.querySelectorAll('.fg-day').forEach(btn => {
    btn.addEventListener('click', () => {
      const i = Number(btn.dataset.day)
      const idx = time.days.indexOf(i)
      if (idx >= 0) time.days.splice(idx, 1); else time.days.push(i)
      saveJson(timeKey(childId), time)
      render()
    })
  })
  const timeInput = c.querySelector('#fgTime')
  if (timeInput) {
    timeInput.addEventListener('change', () => {
      time.time = timeInput.value || '16:00'
      saveJson(timeKey(childId), time)
    })
  }
  const timeIcs = c.querySelector('#fgTimeIcs')
  if (timeIcs) timeIcs.addEventListener('click', () => downloadDanielTimeIcs(time))

  // Appointment
  const apptSave = c.querySelector('#fgApptSave')
  if (apptSave) {
    apptSave.addEventListener('click', () => {
      const date = c.querySelector('#fgApptDate')?.value
      if (!date) return
      saveJson(apptKey(childId), {
        date,
        time: c.querySelector('#fgApptTime')?.value || '15:30',
        type: c.querySelector('#fgApptType')?.value || APPT_TYPES[0],
      })
      render()
    })
  }
  const apptClear = c.querySelector('#fgApptClear')
  if (apptClear) {
    apptClear.addEventListener('click', () => {
      try { localStorage.removeItem(apptKey(childId)) } catch (_) {}
      render()
    })
  }
  const apptIcs = c.querySelector('#fgApptIcs')
  if (apptIcs && appt) apptIcs.addEventListener('click', () => downloadApptIcs(appt))

  // Tasks: tick toggles persist
  c.querySelectorAll('.fg-task').forEach(el => {
    el.addEventListener('click', () => {
      const i = Number(el.dataset.task)
      if (tasks[i]) { tasks[i].done = !tasks[i].done; saveJson(tasksKey(childId), tasks); render() }
    })
  })

  // Kid world
  const openWorld = c.querySelector('#fgOpenWorld')
  if (openWorld) openWorld.addEventListener('click', () => { if (_ctx.onOpenKidWorld) _ctx.onOpenKidWorld() })
}

// ── Calendar export (.ics) ────────────────────────────────────────

function formatDate(date, time) {
  try {
    return new Date(`${date}T${time || '09:00'}`).toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })
  } catch (_) { return date }
}

function downloadIcs(filename, body) {
  const blob = new Blob([body], { type: 'text/calendar' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function pad(n) { return String(n).padStart(2, '0') }

function downloadApptIcs(appt) {
  const name = _ctx?.child?.name || 'Child'
  const d = appt.date.replace(/-/g, '')
  const t = (appt.time || '09:00').replace(':', '') + '00'
  downloadIcs(`DanielsDiaries_Appointment_${name}.ics`,
    `BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//Daniels Diaries//Family//EN\nBEGIN:VEVENT\nDTSTART:${d}T${t}\nDURATION:PT45M\nSUMMARY:${name} - ${appt.type}\nDESCRIPTION:Daniel's Diaries appointment with your practitioner\nBEGIN:VALARM\nTRIGGER:-PT60M\nACTION:DISPLAY\nDESCRIPTION:Appointment reminder\nEND:VALARM\nEND:VEVENT\nEND:VCALENDAR`)
}

function downloadDanielTimeIcs(time) {
  if (!time.days.length) return
  const name = _ctx?.child?.name || 'Child'
  const byday = time.days.map(i => DAYS[i].ics).join(',')
  const t = (time.time || '16:00').replace(':', '') + '00'
  const now = new Date()
  const d = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`
  downloadIcs(`DanielsDiaries_DanielTime_${name}.ics`,
    `BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//Daniels Diaries//Family//EN\nBEGIN:VEVENT\nDTSTART:${d}T${t}\nDURATION:PT30M\nRRULE:FREQ=WEEKLY;BYDAY=${byday}\nSUMMARY:${name} - Daniel time\nDESCRIPTION:Regular Daniel's Diaries session\nBEGIN:VALARM\nTRIGGER:-PT15M\nACTION:DISPLAY\nDESCRIPTION:Daniel time reminder\nEND:VALARM\nEND:VEVENT\nEND:VCALENDAR`)
}

// ── Styles (scoped, matches the app's existing design language) ──

let _stylesInjected = false

function injectStyles() {
  if (_stylesInjected) return
  _stylesInjected = true
  const style = document.createElement('style')
  style.textContent = `
.fg-wrap{max-width:1100px;margin:0 auto;padding:18px 22px 50px}
.fg-panel{background:#fff;border-radius:18px;padding:22px;box-shadow:0 2px 10px rgba(8,37,64,.06);border:1px solid #e5e7eb;margin-bottom:18px}
.fg-panel h3{margin:0 0 4px;font-size:18px;color:#16324f;font-family:'Fredoka',sans-serif}
.fg-desc{margin:0 0 14px;font-size:13.5px;color:#6b7e95}
.fg-note{font-size:13px;color:#6b7e95;background:#f4f7fb;border-radius:10px;padding:10px 13px;margin:8px 0 0}
.fg-grid2{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-bottom:18px}
.fg-grid2 .fg-panel{margin-bottom:0}
.fg-gold-strip{display:flex;align-items:center;gap:14px;background:linear-gradient(135deg,#fff6df,#fdeeca);border:1px solid #f0dca0;border-radius:14px;padding:13px 18px;margin-bottom:18px}
.fg-gi{font-size:22px}
.fg-gold-strip p{margin:0;font-size:13.5px;color:#7a5a00}
.fg-gold-strip strong{color:#5c4500}
.fg-models{display:flex;flex-direction:column;gap:10px}
.fg-model{display:flex;gap:12px;align-items:flex-start;border:1px solid #e5e7eb;border-radius:12px;padding:11px 13px;background:#f8fafd}
.fg-model-ic{font-size:26px}
.fg-model-t{font-family:'Fredoka',sans-serif;font-weight:600;color:#16324f;font-size:14.5px}
.fg-model-d{font-size:12.5px;color:#6b7e95;margin-top:2px}
.fg-days{display:flex;gap:7px;flex-wrap:wrap;margin-bottom:12px}
.fg-day{min-width:46px;min-height:40px;border-radius:11px;border:2px solid #d7deea;background:#fff;color:#405878;font-weight:600;font-size:13.5px}
.fg-day.on{background:#16324f;border-color:#16324f;color:#fff}
.fg-time-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap;font-size:14px;color:#405878}
.fg-time-row input{padding:9px 11px;border:2px solid #d7deea;border-radius:10px;font-size:14px;font-family:inherit}
.fg-btn{border:none;border-radius:11px;padding:10px 16px;font-size:13.5px;font-weight:700;cursor:pointer;font-family:'Fredoka',sans-serif}
.fg-btn:disabled{opacity:.5;cursor:default}
.fg-btn-gold{background:linear-gradient(135deg,#f2c94c,#e6a800);color:#16324f;box-shadow:0 5px 14px rgba(230,168,0,.25)}
.fg-btn-ghost{background:#fff;color:#405878;border:2px solid #d7deea}
.fg-btn-row{display:flex;gap:10px;margin-top:12px}
.fg-appt{display:flex;align-items:center;gap:14px;background:linear-gradient(135deg,#16324f,#0e3358);color:#fff;border-radius:15px;padding:15px 17px}
.fg-appt-cal{width:48px;height:48px;border-radius:12px;background:rgba(255,255,255,.13);display:grid;place-items:center;font-size:23px;flex-shrink:0}
.fg-appt-when{font-family:'Fredoka',sans-serif;font-weight:600;font-size:15.5px}
.fg-appt-type{font-size:12.5px;color:#bcd0e6}
.fg-appt-form{display:flex;gap:9px;flex-wrap:wrap;margin-top:12px}
.fg-appt-form input,.fg-appt-form select{padding:9px 11px;border:2px solid #d7deea;border-radius:10px;font-size:13.5px;font-family:inherit}
.fg-task{display:flex;align-items:flex-start;gap:11px;border:1px solid #e5e7eb;border-radius:12px;padding:11px 13px;margin-bottom:9px;background:#f8fafd;cursor:pointer}
.fg-task-box{width:26px;height:26px;border-radius:8px;border:2px solid #d7deea;background:#fff;flex-shrink:0;display:grid;place-items:center;color:#fff;font-size:15px}
.fg-task.done .fg-task-box{background:#40916c;border-color:#40916c}
.fg-task.done .fg-task-txt{text-decoration:line-through;color:#6b7e95}
.fg-task-txt{font-size:13.5px;color:#1f2937;flex:1;padding-top:2px}
.fg-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:16px}
.fg-stat{background:#f4f7fb;border:1px solid #e5e7eb;border-radius:14px;padding:14px;text-align:center}
.fg-stat-v{font-family:'Fredoka',sans-serif;font-size:26px;font-weight:700;color:#16324f;line-height:1}
.fg-stat-l{font-size:11.5px;color:#6b7e95;margin-top:5px;text-transform:uppercase;letter-spacing:.4px;font-weight:600}
.fg-roads{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:13px}
.fg-road{background:#fff;border:1px solid #e5e7eb;border-radius:15px;padding:14px}
.fg-road-top{display:flex;align-items:center;gap:10px;margin-bottom:9px}
.fg-road-ic{width:40px;height:40px;border-radius:11px;display:grid;place-items:center;font-size:19px;border:2px solid;overflow:hidden}
.fg-road-ic img{width:32px;height:32px;object-fit:contain}
.fg-road-nm{font-family:'Fredoka',sans-serif;font-weight:600;font-size:14px;color:#16324f}
.fg-road-bar{height:9px;border-radius:999px;background:#eef1f4;overflow:hidden}
.fg-road-bar span{display:block;height:100%;border-radius:999px;transition:width .5s ease}
.fg-road-mod{font-size:12px;color:#6b7e95;margin-top:6px}
.fg-launch{display:flex;align-items:center;gap:18px;flex-wrap:wrap;background:linear-gradient(135deg,#16324f,#0e3358);color:#fff;border-radius:20px;padding:22px 24px;margin-bottom:18px}
.fg-launch-dog{width:64px;height:64px;object-fit:contain}
.fg-launch h3{margin:0 0 3px;color:#fff;font-size:19px;font-family:'Fredoka',sans-serif}
.fg-launch p{margin:0;color:#bcd0e6;font-size:13.5px;max-width:480px}
.fg-launch .fg-btn-gold{margin-left:auto}
.fg-footer{font-size:12px;color:#6b7e95;text-align:center;margin-top:8px;padding-top:16px;border-top:1px solid #e5e7eb}
@media(max-width:820px){
  .fg-grid2{grid-template-columns:1fr}
  .fg-stats{grid-template-columns:repeat(2,1fr)}
  .fg-launch .fg-btn-gold{margin-left:0}
}`
  document.head.appendChild(style)
}
