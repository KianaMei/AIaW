import { IsTauri } from 'src/utils/platform-api'

// Tauri-only debug helpers: open devtools and reload shortcuts in any build
export default () => {
  if (!IsTauri) return

  // Lazy import to avoid bundling on web
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  import('@tauri-apps/api/webviewWindow').then(({ getCurrentWebviewWindow }) => {
    const win = getCurrentWebviewWindow()

    window.addEventListener('keydown', (ev) => {
      const ctrlCmd = ev.ctrlKey || ev.metaKey
      const shift = ev.shiftKey

      // F12 or Ctrl/Cmd+Shift+I => open DevTools
      if ((ev.key === 'F12') || (ctrlCmd && shift && (ev.key.toUpperCase() === 'I'))) {
        ev.preventDefault()
        // openDevtools is available on Tauri 2 in both debug/release
        // If platform disallows, this call is a no-op
        win.openDevtools().catch(() => {})
      }

      // Ctrl/Cmd+Shift+R => reload current window
      if (ctrlCmd && shift && (ev.key.toUpperCase() === 'R')) {
        ev.preventDefault()
        location.reload()
      }
    })
  }).catch(() => { /* ignore */ })
}
