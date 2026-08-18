// Pure helpers behind the Practitioner Hub Overview — kept free of DOM and
// Supabase so the numbers the practitioner sees are unit-testable.

const DAY_MS = 24 * 60 * 60 * 1000
export const ATTENTION_INACTIVE_DAYS = 14

function daysBetween(now, dateStr) {
  if (!dateStr) return null
  const then = new Date(dateStr).getTime()
  if (Number.isNaN(then)) return null
  return Math.floor((now.getTime() - then) / DAY_MS)
}

/**
 * Aggregate caseload data into the Overview's headline numbers.
 *
 * @param {Object} input
 * @param {Array} input.clients - get_practitioner_caseload rows
 * @param {Array} input.goalProgress - get_practitioner_goal_progress rows
 * @param {Array} input.recentCompletions - child_modules rows (is_completed, completed_at)
 * @param {Date}  input.now
 */
export function computeOverviewStats({ clients = [], goalProgress = [], recentCompletions = [], now = new Date() } = {}) {
  const activeClients = clients.length

  const activeThisWeek = clients.filter(c => {
    const days = daysBetween(now, c.last_login_date)
    return days !== null && days <= 7
  }).length

  const modulesThisWeek = recentCompletions.filter(cm => {
    const days = daysBetween(now, cm.completed_at)
    return days !== null && days <= 7
  }).length

  const soonCutoff = now.getTime() + 7 * DAY_MS
  const goalsDueSoon = goalProgress.filter(g => {
    if (g.status !== 'in_progress' || !g.review_date) return false
    const review = new Date(g.review_date).getTime()
    return !Number.isNaN(review) && review <= soonCutoff
  }).length

  return { activeClients, activeThisWeek, modulesThisWeek, goalsDueSoon }
}

/**
 * Clients who need the practitioner's attention, with plain-language reasons.
 * Quiet caseloads return an empty list — no manufactured urgency.
 */
export function computeNeedsAttention({ clients = [], goalProgress = [], now = new Date() } = {}) {
  return clients.map(client => {
    const reasons = []
    const inactiveDays = daysBetween(now, client.last_login_date)
    if (inactiveDays === null) {
      reasons.push('No app activity yet')
    } else if (inactiveDays > ATTENTION_INACTIVE_DAYS) {
      reasons.push(`Inactive ${inactiveDays} days`)
    }

    const overdue = goalProgress.some(g =>
      g.child_id === client.child_id &&
      g.status === 'in_progress' &&
      g.review_date &&
      new Date(g.review_date).getTime() < new Date(now).setHours(0, 0, 0, 0)
    )
    if (overdue) reasons.push('Goal review overdue')

    return reasons.length ? { childId: client.child_id, childName: client.child_name, reasons } : null
  }).filter(Boolean)
}

/** "3 days ago" style labels for the activity feed. */
export function relativeDayLabel(dateStr, now = new Date()) {
  const days = daysBetween(now, dateStr)
  if (days === null) return ''
  if (days <= 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  return new Date(dateStr).toLocaleDateString()
}
