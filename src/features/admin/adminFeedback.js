// Admin Feedback Viewer
import { getSupabaseClient } from '../../supabaseClient.js'

const supabase = getSupabaseClient()

let feedbackLoaded = false

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
  'is', 'it', 'this', 'that', 'was', 'are', 'be', 'has', 'have', 'had', 'not', 'you',
  'we', 'they', 'my', 'your', 'our', 'i', 'me', 'he', 'she', 'its', 'so', 'if', 'as',
  'do', 'did', 'can', 'could', 'would', 'should', 'just', 'been', 'being', 'very',
  'really', 'about', 'up', 'out', 'no', 'yes', 'all', 'from', 'by', 'more', 'some',
  'than', 'them', 'their', 'what', 'when', 'how', 'which', 'who', 'will', 'also',
  'into', 'too', 'much', 'well', 'get', 'got', 'like', 'dont', "don't", 'there'
])

function getCommonWords(messages, limit = 12) {
  const freq = {}
  messages.forEach(msg => {
    if (!msg) return
    const words = msg.toLowerCase().replace(/[^a-z\s'-]/g, '').split(/\s+/)
    const seen = new Set()
    words.forEach(w => {
      if (w.length < 3 || STOP_WORDS.has(w) || seen.has(w)) return
      seen.add(w)
      freq[w] = (freq[w] || 0) + 1
    })
  })

  return Object.entries(freq)
    .filter(([, count]) => count > 1)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
}

function getRatingDistribution(data) {
  const dist = [0, 0, 0, 0, 0]
  data.forEach(fb => {
    if (fb.rating >= 1 && fb.rating <= 5) dist[fb.rating - 1]++
  })
  return dist
}

window._adminLoadFeedback = async function () {
  const container = document.getElementById('feedbackTableContainer')
  const countEl = document.getElementById('feedbackCount')
  if (!container) return

  if (feedbackLoaded) return
  feedbackLoaded = true

  try {
    const { data, error } = await supabase
      .from('user_feedback')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200)

    if (error) throw error

    if (!data || data.length === 0) {
      container.innerHTML = '<div style="text-align:center; padding:40px; color:#6b7c8f;"><p>No feedback yet.</p></div>'
      if (countEl) countEl.textContent = '0 entries'
      return
    }

    if (countEl) countEl.textContent = `${data.length} entries`

    // Stats
    const rated = data.filter(fb => fb.rating != null)
    const avgRating = rated.length > 0
      ? (rated.reduce((sum, fb) => sum + fb.rating, 0) / rated.length).toFixed(1)
      : null
    const dist = getRatingDistribution(data)
    const maxDist = Math.max(...dist, 1)

    const messages = data.map(fb => fb.message).filter(Boolean)
    const commonWords = getCommonWords(messages)

    // Summary cards
    const avgStarsDisplay = avgRating
      ? '⭐'.repeat(Math.round(avgRating)) + ` <strong>${avgRating}</strong> / 5`
      : '<span style="color:#94a3b8;">No ratings yet</span>'

    const distBars = dist.map((count, i) => {
      const pct = Math.round((count / maxDist) * 100)
      const label = i + 1
      return `
        <div style="display:flex; align-items:center; gap:8px; font-size:12px;">
          <span style="width:14px; text-align:right; color:#6b7c8f;">${label}</span>
          <div style="flex:1; height:8px; background:#eef1f5; border-radius:4px; overflow:hidden;">
            <div style="width:${pct}%; height:100%; background:${i >= 3 ? '#14b8a6' : i >= 2 ? '#fbbf24' : '#f87171'}; border-radius:4px; transition:width 0.3s;"></div>
          </div>
          <span style="width:20px; color:#6b7c8f; font-size:11px;">${count}</span>
        </div>
      `
    }).reverse().join('')

    const wordsHtml = commonWords.length > 0
      ? commonWords.map(([word, count]) => {
          const size = Math.min(11 + count * 2, 20)
          const opacity = Math.min(0.5 + count * 0.1, 1)
          return `<span style="display:inline-block; padding:4px 10px; margin:3px; background:#f0f4ff; border:1px solid #e0e7f1; border-radius:20px; font-size:${size}px; color:#405878; opacity:${opacity}; font-weight:${count > 3 ? '600' : '400'};">${word} <sup style="font-size:10px; color:#94a3b8;">${count}</sup></span>`
        }).join('')
      : '<span style="color:#94a3b8; font-size:13px;">Not enough data yet</span>'

    // Table rows
    const rows = data.map(fb => {
      const date = new Date(fb.created_at).toLocaleDateString('en-AU', {
        day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
      })
      const stars = fb.rating ? '⭐'.repeat(fb.rating) : '<span style="color:#94a3b8;">—</span>'
      const msg = fb.message
        ? fb.message.replace(/</g, '&lt;').replace(/>/g, '&gt;')
        : '<span style="color:#94a3b8; font-style:italic;">No message</span>'

      return `
        <tr>
          <td style="padding:12px 14px; font-size:13px; white-space:nowrap;">${date}</td>
          <td style="padding:12px 14px; font-size:13px;">${fb.email || '—'}</td>
          <td style="padding:12px 14px; font-size:14px;">${stars}</td>
          <td style="padding:12px 14px; font-size:13px; max-width:400px; word-wrap:break-word;">${msg}</td>
        </tr>
      `
    }).join('')

    container.innerHTML = `
      <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:16px; margin-bottom:24px;">
        <div style="background:#f8f9fc; border-radius:14px; padding:20px; border:1px solid #eef1f5;">
          <p style="font-size:12px; font-weight:600; color:#6b7c8f; text-transform:uppercase; letter-spacing:0.3px; margin:0 0 8px;">Average Rating</p>
          <p style="font-size:18px; margin:0;">${avgStarsDisplay}</p>
          <p style="font-size:12px; color:#94a3b8; margin:6px 0 0;">${rated.length} of ${data.length} gave a rating</p>
        </div>
        <div style="background:#f8f9fc; border-radius:14px; padding:20px; border:1px solid #eef1f5;">
          <p style="font-size:12px; font-weight:600; color:#6b7c8f; text-transform:uppercase; letter-spacing:0.3px; margin:0 0 10px;">Rating Distribution</p>
          <div style="display:flex; flex-direction:column; gap:4px;">
            ${distBars}
          </div>
        </div>
        <div style="background:#f8f9fc; border-radius:14px; padding:20px; border:1px solid #eef1f5;">
          <p style="font-size:12px; font-weight:600; color:#6b7c8f; text-transform:uppercase; letter-spacing:0.3px; margin:0 0 10px;">Common Words</p>
          <div style="line-height:1.8;">
            ${wordsHtml}
          </div>
        </div>
      </div>

      <table style="width:100%; border-collapse:collapse;">
        <thead>
          <tr style="background:#f8f9fa; border-bottom:2px solid #e5e7eb;">
            <th style="padding:10px 14px; text-align:left; font-size:12px; font-weight:600; color:#6b7c8f; text-transform:uppercase; letter-spacing:0.3px;">Date</th>
            <th style="padding:10px 14px; text-align:left; font-size:12px; font-weight:600; color:#6b7c8f; text-transform:uppercase; letter-spacing:0.3px;">User</th>
            <th style="padding:10px 14px; text-align:left; font-size:12px; font-weight:600; color:#6b7c8f; text-transform:uppercase; letter-spacing:0.3px;">Rating</th>
            <th style="padding:10px 14px; text-align:left; font-size:12px; font-weight:600; color:#6b7c8f; text-transform:uppercase; letter-spacing:0.3px;">Message</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    `

    // Zebra stripe
    container.querySelectorAll('tbody tr:nth-child(even)').forEach(tr => {
      tr.style.background = '#fafbfc'
    })

  } catch (err) {
    console.error('Failed to load feedback:', err)
    container.innerHTML = '<div style="text-align:center; padding:40px; color:#ef4444;"><p>Failed to load feedback.</p></div>'
  }
}
