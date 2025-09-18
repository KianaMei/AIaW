import { IsTauri } from 'src/utils/platform-api'
import { Notify } from 'quasar'

// Tauri-only debug helpers: open devtools and reload shortcuts in any build
export default () => {
  if (!IsTauri) return

  async function openDevtools() {
    try {
      const { getCurrentWebviewWindow } = await import('@tauri-apps/api/webviewWindow')
      const win: any = getCurrentWebviewWindow()
      const methods = ['openDevtools', 'openDevTools', 'internalToggleDevtools', 'toggleDevtools']
      for (const m of methods) {
        if (typeof win[m] === 'function') {
          Notify.create({ message: 'Opening DevTools…', color: 'primary', timeout: 800 })
          // @ts-expect-error dynamic method across versions
          await win[m]()
          // eslint-disable-next-line no-console
          console.log(`[DevTools] called ${m}`)
          return
        }
      }
      // Try module-level API as fallback
      try {
        const webview: any = await import('@tauri-apps/api/webview')
        const fns = ['internalToggleDevtools', 'toggleDevtools', 'openDevtools']
        for (const fn of fns) {
          if (typeof webview[fn] === 'function') {
            Notify.create({ message: 'Opening DevTools…', color: 'primary', timeout: 800 })
            await webview[fn]()
            // eslint-disable-next-line no-console
            console.log(`[DevTools] called webview.${fn}`)
            return
          }
        }
      } catch (_) {}
      // eslint-disable-next-line no-console
      console.warn('[DevTools] No devtools method on WebviewWindow. Check capability core:webview:allow-internal-toggle-devtools')
      Notify.create({ message: 'DevTools API not available (check app permissions)', color: 'negative' })
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('[DevTools] failed:', e)
      Notify.create({ message: `Open DevTools failed: ${String(e)}`, color: 'negative' })
    }
  }

  // Register global hotkeys to open DevTools (works in release if capability allows)
  window.addEventListener('keydown', (ev) => {
    const ctrlCmd = ev.ctrlKey || ev.metaKey
    const shift = ev.shiftKey

    // F12 or Ctrl/Cmd+Shift+I => open DevTools
    if ((ev.key === 'F12') || (ctrlCmd && shift && (ev.key.toUpperCase() === 'I'))) {
      ev.preventDefault()
      void openDevtools()
    }

    // Ctrl/Cmd+Shift+R => reload current window
    if (ctrlCmd && shift && (ev.key.toUpperCase() === 'R')) {
      ev.preventDefault()
      location.reload()
    }
  })
}
