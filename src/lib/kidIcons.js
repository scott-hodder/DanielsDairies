// ================================================
// KID ICONS
// Native emoji render differently on every device — and on older Androids
// some show as empty squares. This swaps every emoji in the page for the
// same colourful Twemoji SVG artwork on all devices, so the app's icons are
// consistent, kid-friendly and never missing.
//
// How: a tree walker finds text nodes containing emoji and replaces them
// with <img class="kid-icon"> tags via Twemoji. It deliberately skips:
//   - <svg> subtrees (the Brain Town map draws its own vector art; HTML
//     <img> tags are invalid inside SVG)
//   - inputs/textareas/scripts/styles
//   - anything inside an element marked data-no-kid-icons
// A MutationObserver keeps dynamically rendered UI (tabs, cards, modals)
// covered without every feature needing to opt in.
// ================================================

import twemoji from '@twemoji/api'

// Maintained Twemoji artwork (jdecked fork) served from jsDelivr
const TWEMOJI_BASE = 'https://cdn.jsdelivr.net/gh/jdecked/twemoji@15.1.0/assets/'

const EMOJI_RE = /\p{Extended_Pictographic}/u
const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT', 'SELECT', 'OPTION', 'IFRAME', 'CANVAS', 'svg', 'SVG'])

let _observer = null
let _scheduled = false

function injectStyles() {
  if (document.getElementById('kidIconStyles')) return
  const st = document.createElement('style')
  st.id = 'kidIconStyles'
  st.textContent = `
img.kid-icon{width:1em;height:1em;display:inline-block;vertical-align:-0.125em;margin:0 .04em;pointer-events:none}
`
  document.head.appendChild(st)
}

function shouldSkip(el) {
  for (let node = el; node && node.nodeType === 1; node = node.parentElement) {
    if (SKIP_TAGS.has(node.tagName)) return true
    if (node.namespaceURI === 'http://www.w3.org/2000/svg') return true
    if (node.dataset && node.dataset.noKidIcons !== undefined) return true
  }
  return false
}

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/** Replace emoji in all text nodes under root with Twemoji SVG images. */
export function applyKidIcons(root = document.body) {
  if (!root) return
  injectStyles()

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!node.nodeValue || !EMOJI_RE.test(node.nodeValue)) return NodeFilter.FILTER_REJECT
      if (!node.parentElement || shouldSkip(node.parentElement)) return NodeFilter.FILTER_REJECT
      return NodeFilter.FILTER_ACCEPT
    }
  })

  const targets = []
  let n
  while ((n = walker.nextNode())) targets.push(n)

  targets.forEach(textNode => {
    const html = twemoji.parse(escapeHtml(textNode.nodeValue), {
      base: TWEMOJI_BASE,
      folder: 'svg',
      ext: '.svg',
      className: 'kid-icon'
    })
    // No emoji Twemoji recognises: leave the node alone
    if (html.indexOf('<img') === -1) return
    const span = document.createElement('span')
    span.innerHTML = html
    // Alt text keeps the original emoji for copy/paste + screen readers
    textNode.parentNode.replaceChild(span, textNode)
    // Unwrap the helper span so layout/styling is unchanged
    while (span.firstChild) span.parentNode.insertBefore(span.firstChild, span)
    span.remove()
  })
}

/**
 * Start the global emoji→icon replacement for this page: one initial pass,
 * then a debounced pass whenever the DOM changes.
 */
export function initKidIcons() {
  if (_observer) return

  // Re-scan only the mutated subtrees, not the whole document — the
  // dashboard rebuilds large innerHTML regions constantly (tabs, cards,
  // map), and a full-body TreeWalker + Twemoji parse on every change
  // costs jank that scales with total page size instead of the change.
  const pendingRoots = new Set()

  const flush = () => {
    _scheduled = false
    const roots = [...pendingRoots]
    pendingRoots.clear()
    try {
      // A huge batch (first paint, tab switch) is cheaper as one body pass
      if (roots.length > 40) { applyKidIcons(document.body); return }
      roots.forEach(root => { if (root.isConnected) applyKidIcons(root) })
    } catch (e) { console.warn('[kidIcons] parse failed:', e) }
  }

  const initial = () => {
    try { applyKidIcons(document.body) } catch (e) { console.warn('[kidIcons] parse failed:', e) }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initial, { once: true })
  } else {
    initial()
  }

  _observer = new MutationObserver(mutations => {
    for (const m of mutations) {
      for (const node of m.addedNodes) {
        if (node.nodeType === 3) {
          // Ignore text inserted by our own unwrapping step
          if (node.parentElement && !node.parentElement.classList?.contains('kid-icon')) {
            pendingRoots.add(node.parentElement)
          }
        } else if (node.nodeType === 1 && !node.classList?.contains('kid-icon')) {
          pendingRoots.add(node)
        }
      }
    }
    if (!pendingRoots.size || _scheduled) return
    _scheduled = true
    setTimeout(flush, 120)
  })
  _observer.observe(document.body, { childList: true, subtree: true })
}
