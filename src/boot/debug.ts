import { IsTauri } from 'src/utils/platform-api'

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
          // @ts-expect-error dynamic method across versions
          await win[m]()
          // eslint-disable-next-line no-console
          console.log(`[DevTools] called ${m}`)
          return
        }
      }
      // eslint-disable-next-line no-console
      console.warn('[DevTools] No devtools method on WebviewWindow. Check capability core:webview:allow-internal-toggle-devtools')
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('[DevTools] failed:', e)
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
