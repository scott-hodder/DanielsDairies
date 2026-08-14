// ================================================
// TELEMETRY — error tracking + funnel analytics
//
// Self-hosted in Supabase (client_errors / client_events via RPCs), so
// there is no external analytics account and no third-party script.
// Everything here is fire-and-forget and fail-silent: telemetry must
// never break, slow, or block the product. See docs/OBSERVABILITY.md
// for the queries that read this data.
//
// Usage:
//   import { initTelemetry, trackEvent } from './lib/telemetry.js'
//   initTelemetry()                       // once per page (error handlers + page_view)
//   trackEvent('signup_start', { plan })  // anywhere something funnel-worthy happens
// ================================================

import { getSupabaseClient } from '../supabaseClient.js'

const SESSION_KEY = 'dd_tsid'
const MAX_ERRORS_PER_PAGE = 10

let _initialized = false
let _errorCount = 0
const _seenErrors = new Set()

function sessionId() {
  try {
    let sid = sessionStorage.getItem(SESSION_KEY)
    if (!sid) {
      sid = Math.random().toString(36).slice(2) + Date.now().toString(36)
      sessionStorage.setItem(SESSION_KEY, sid)
    }
    return sid
  } catch {
    return 'no-storage'
  }
}

function pagePath() {
  try { return window.location.pathname + window.location.search.slice(0, 80) } catch { return '' }
}

/** Record a funnel/product event. Fire-and-forget; never throws. */
export function trackEvent(event, props = {}) {
  try {
    getSupabaseClient().rpc('log_client_event', {
      p_event: String(event),
      p_page: pagePath(),
      p_props: props || {},
      p_session_id: sessionId()
    }).then(() => {}, () => {})
  } catch { /* telemetry must never break the app */ }
}

/** Record an error. Deduped per page load and capped. Never throws. */
export function trackError(message, stack = '') {
  try {
    const msg = String(message || '').slice(0, 500)
    if (!msg) return
    // Dedupe repeats (e.g. an error inside requestAnimationFrame) and cap
    // volume so a render loop can't flood the table.
    const key = msg.slice(0, 120)
    if (_seenErrors.has(key) || _errorCount >= MAX_ERRORS_PER_PAGE) return
    _seenErrors.add(key)
    _errorCount++
    getSupabaseClient().rpc('log_client_error', {
      p_message: msg,
      p_stack: String(stack || '').slice(0, 4000),
      p_page: pagePath(),
      p_user_agent: (navigator.userAgent || '').slice(0, 300),
      p_session_id: sessionId()
    }).then(() => {}, () => {})
  } catch { /* never break the app */ }
}

/**
 * Install global error handlers and record a page_view.
 * Safe to call more than once (subsequent calls are no-ops).
 */
export function initTelemetry({ pageView = true } = {}) {
  if (_initialized) return
  _initialized = true

  try {
    window.addEventListener('error', (e) => {
      // Resource load errors (img/script) have no message — skip those,
      // they're noisy and rarely actionable from here.
      if (!e?.message) return
      trackError(e.message, e.error?.stack || `${e.filename || ''}:${e.lineno || ''}`)
    })
    window.addEventListener('unhandledrejection', (e) => {
      const reason = e?.reason
      trackError(
        reason?.message || (typeof reason === 'string' ? reason : 'Unhandled promise rejection'),
        reason?.stack || ''
      )
    })
  } catch { /* ignore */ }

  if (pageView) trackEvent('page_view')
}
