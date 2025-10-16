import { boot } from 'quasar/wrappers'

/**
 * Experimental UI flags loader (non-destructive)
 * Usage: set localStorage['#ui-exp'] to a comma-separated list, e.g.:
 *   "on,compact,high-contrast,limited-animations"
 * Supported flags -> body classes:
 *   - on                 -> exp-on
 *   - compact            -> exp-compact
 *   - high-contrast      -> exp-high-contrast
 *   - limited-animations -> exp-limited-animations
 */
function applyExpFlags() {
  try {
    const raw = localStorage.getItem('#ui-exp') || ''
    const flags = new Set(
      raw
        .split(',')
        .map(s => s.trim().toLowerCase())
        .filter(Boolean)
    )
    const cls = document.body.classList
    const map: Record<string, string> = {
      on: 'exp-on',
      compact: 'exp-compact',
      'high-contrast': 'exp-high-contrast',
      'limited-animations': 'exp-limited-animations'
    }
    Object.values(map).forEach(k => cls.remove(k))
    Object.entries(map).forEach(([k, v]) => flags.has(k) && cls.add(v))
  } catch (_) {
    // noop
  }
}

export default boot(() => {
  applyExpFlags()
  window.addEventListener('storage', (e) => {
    if (e.key === '#ui-exp') applyExpFlags()
  })
})

