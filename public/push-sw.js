// Web push service worker for Daniel's Diaries reminders.
// Kept intentionally tiny: show the notification, and clicking it opens
// (or focuses) the dashboard.

self.addEventListener('push', (event) => {
  let payload = {}
  try { payload = event.data ? event.data.json() : {} } catch { /* text fallback */ }
  const title = payload.title || "Daniel's Diaries"
  const options = {
    body: payload.body || 'Something is happening in Brain Town!',
    icon: payload.icon || '/images/logos/dd-favicon.png',
    badge: '/images/logos/dd-favicon.png',
    tag: payload.tag || 'dd-reminder',
    data: { url: payload.url || '/dashboard.html' }
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/dashboard.html'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
      for (const w of wins) {
        if (w.url.includes('/dashboard') && 'focus' in w) return w.focus()
      }
      return clients.openWindow(url)
    })
  )
})
