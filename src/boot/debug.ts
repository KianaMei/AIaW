import { IsTauri } from 'src/utils/platform-api'
// eslint-disable-next-line import/no-unresolved
import { invoke } from '@tauri-apps/api/core'

// Tauri-only debug helpers: open devtools and reload shortcuts in any build
export default () => {
  if (!IsTauri) return

  // Register global hotkeys to open DevTools via Tauri command (works in release)
  window.addEventListener('keydown', (ev) => {
      const ctrlCmd = ev.ctrlKey || ev.metaKey
      const shift = ev.shiftKey

      // F12 or Ctrl/Cmd+Shift+I => open DevTools
      if ((ev.key === 'F12') || (ctrlCmd && shift && (ev.key.toUpperCase() === 'I'))) {
        ev.preventDefault()
        invoke('open_devtools').catch(() => {})
      }

      // Ctrl/Cmd+Shift+R => reload current window
      if (ctrlCmd && shift && (ev.key.toUpperCase() === 'R')) {
        ev.preventDefault()
        location.reload()
      }
  })
}
