import { IsTauri } from 'src/utils/platform-api'

// Tauri-only debug helpers: open devtools and reload shortcuts in any build
export default () => {
  if (!IsTauri) return

  // Register global hotkeys to open DevTools (works in release if capability allows)
  window.addEventListener('keydown', (ev) => {
    const ctrlCmd = ev.ctrlKey || ev.metaKey
    const shift = ev.shiftKey

    // F12 or Ctrl/Cmd+Shift+I => open DevTools
    if ((ev.key === 'F12') || (ctrlCmd && shift && (ev.key.toUpperCase() === 'I'))) {
      ev.preventDefault()
      // lazy import to avoid bundling for web
      import('@tauri-apps/api/webviewWindow').then(({ getCurrentWebviewWindow }) => {
        const win = getCurrentWebviewWindow()
        // in Tauri 2, openDevtools is available when capability
        // core:webview:allow-internal-toggle-devtools is enabled
        // @ts-expect-error openDevtools runtime optional
        win.openDevtools?.()
      }).catch(() => {})
    }

    // Ctrl/Cmd+Shift+R => reload current window
    if (ctrlCmd && shift && (ev.key.toUpperCase() === 'R')) {
      ev.preventDefault()
      location.reload()
    }
  })
}
