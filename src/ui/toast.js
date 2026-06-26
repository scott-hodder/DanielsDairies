// Lightweight toast notification system
// Usage: showToast('Message here') or showToast('Error!', 'error')

let container = null

function getContainer() {
  if (container && document.body.contains(container)) return container
  container = document.createElement('div')
  container.id = 'toastContainer'
  container.setAttribute('aria-live', 'polite')
  container.setAttribute('role', 'status')
  Object.assign(container.style, {
    position: 'fixed',
    top: '20px',
    right: '20px',
    zIndex: '99999',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    pointerEvents: 'none',
    maxWidth: '400px',
    width: '90vw'
  })
  document.body.appendChild(container)
  return container
}

function injectStyles() {
  if (document.getElementById('toastStyles')) return
  const style = document.createElement('style')
  style.id = 'toastStyles'
  style.textContent = `
    .fm-toast {
      padding: 14px 20px;
      border-radius: 12px;
      font-family: 'Fredoka', sans-serif;
      font-size: 14px;
      font-weight: 500;
      line-height: 1.4;
      color: #fff;
      pointer-events: auto;
      box-shadow: 0 4px 20px rgba(0,0,0,0.15);
      animation: toastIn 0.3s ease forwards;
      display: flex;
      align-items: center;
      gap: 10px;
      cursor: pointer;
      word-break: break-word;
    }
    .fm-toast.success { background: #059669; }
    .fm-toast.error { background: #dc2626; }
    .fm-toast.info { background: #2563eb; }
    .fm-toast.warning { background: #d97706; }
    .fm-toast.removing { animation: toastOut 0.25s ease forwards; }
    @keyframes toastIn {
      from { opacity: 0; transform: translateX(40px); }
      to { opacity: 1; transform: translateX(0); }
    }
    @keyframes toastOut {
      from { opacity: 1; transform: translateX(0); }
      to { opacity: 0; transform: translateX(40px); }
    }
  `
  document.head.appendChild(style)
}

const typeIcons = {
  success: '\u2713',
  error: '\u2717',
  warning: '\u26A0',
  info: '\u2139'
}

/**
 * Show a toast notification.
 * @param {string} message - Text to display
 * @param {'success'|'error'|'info'|'warning'} [type='success'] - Toast style
 * @param {number} [duration=4000] - Auto-dismiss in ms (0 = manual dismiss only)
 */
export function showToast(message, type = 'success', duration = 4000) {
  injectStyles()
  const c = getContainer()

  const toast = document.createElement('div')
  toast.className = `fm-toast ${type}`
  toast.innerHTML = `<span>${typeIcons[type] || ''}</span><span>${message}</span>`

  toast.addEventListener('click', () => removeToast(toast))
  c.appendChild(toast)

  if (duration > 0) {
    setTimeout(() => removeToast(toast), duration)
  }

  return toast
}

function removeToast(toast) {
  if (!toast || toast.classList.contains('removing')) return
  toast.classList.add('removing')
  setTimeout(() => toast.remove(), 250)
}
