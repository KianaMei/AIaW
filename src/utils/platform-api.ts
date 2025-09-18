import { Capacitor } from '@capacitor/core'
import { fetch as tauriFetch } from './tauri-stream'
import { readText } from '@tauri-apps/plugin-clipboard-manager'
import { Clipboard } from '@capacitor/clipboard'
import { platform } from '@tauri-apps/plugin-os'
import { fetch as capFetch } from 'capacitor-stream-fetch'
import { exportFile as webExportFile } from 'quasar'
import { blobToBase64 } from './functions'
import { Directory, Filesystem } from '@capacitor/filesystem'
import { ExportFile } from 'capacitor-export-file'
export const IsTauri = '__TAURI_INTERNALS__' in window
export const IsCapacitor = Capacitor.isNativePlatform()
export const IsWeb = !IsTauri && !IsCapacitor
export const TauriPlatform = IsTauri ? platform() : undefined

// Type aliases for DOM lib types so eslint/no-undef doesn't complain
type HeadersInit = globalThis.HeadersInit
type RequestInit = globalThis.RequestInit

// --- Debug HTTP wrapper -------------------------------------------------------
function shouldDebugHttp() {
  try {
    return localStorage.getItem('AIAW_DEBUG_HTTP') === '1'
  } catch (_) {
    return false
  }
}

function redactHeaders(h?: HeadersInit): Record<string, string> {
  const out: Record<string, string> = {}
  const sensitive = new Set(['authorization', 'x-api-key', 'api-key', 'x-goog-api-key', 'x-api-token', 'proxy-authorization'])
  const src = new Headers(h as any)
  for (const [k, v] of src.entries()) {
    if (sensitive.has(k.toLowerCase())) {
      const tail = v.slice(-4)
      out[k] = `***${tail}`
    } else {
      out[k] = v
    }
  }
  return out
}

function bodyPreview(body: any, headers?: HeadersInit): string {
  if (!body) return ''
  try {
    const contentType = new Headers(headers as any).get('content-type') || ''
    const max = 2000
    if (typeof body === 'string') {
      if (contentType.includes('application/json')) {
        return body.length > max ? body.slice(0, max) + `…(${body.length - max} more)` : body
      }
      return `[text ${body.length} bytes]` + (body.length > max ? ' (truncated)' : '')
    }
    if (Array.isArray(body)) return `[array length=${body.length}]`
    if (body instanceof Blob) return `[blob ${body.type} size=${body.size}]`
    return `[body ${typeof body}]`
  } catch {
    return '[body]'
  }
}

function wrapFetch<F extends (url: any, init?: any) => Promise<Response>>(base: F): F {
  return (async (url: any, init?: RequestInit) => {
    if (!shouldDebugHttp()) return await base(url, init)

    const method = (init?.method || 'GET').toUpperCase()
    const headers = redactHeaders(init?.headers)
    const bPrev = bodyPreview((init as any)?.body, init?.headers)
    // eslint-disable-next-line no-console
    console.groupCollapsed(`[HTTP] ${method} ${url}`)
    // eslint-disable-next-line no-console
    console.log('Request headers:', headers)
    if (bPrev) {
      // eslint-disable-next-line no-console
      console.debug('Request body:', bPrev)
    }
    let res: Response
    try {
      res = await base(url, init)
      // eslint-disable-next-line no-console
      console.log('Response status:', res.status, res.statusText)
      // eslint-disable-next-line no-console
      console.log('Response headers:', Object.fromEntries(res.headers.entries()))
      return res
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('HTTP error:', e)
      throw e
    } finally {
      // eslint-disable-next-line no-console
      console.groupEnd()
    }
  }) as F
}

const baseFetch = IsTauri ? tauriFetch : IsCapacitor ? capFetch : window.fetch.bind(window)
export const fetch = wrapFetch(baseFetch)

export async function clipboardReadText(): Promise<string> {
  if (IsTauri) {
    return await readText()
  } else if (IsCapacitor) {
    return (await Clipboard.read()).value
  } else {
    return navigator.clipboard.readText()
  }
}

export const PublicOrigin = IsTauri || IsCapacitor ? 'https://aiaw.app' : location.origin

export async function exportFile(filename, data: Blob | string | ArrayBuffer) {
  if (!IsCapacitor) return webExportFile(filename, data)
  const { uri } = await Filesystem.writeFile({
    path: filename,
    data: (await blobToBase64(new Blob([data]))).replace(/^data:.*,/, ''),
    directory: Directory.Cache
  })
  await ExportFile.exportFile({
    uri,
    filename
  })
  await Filesystem.deleteFile({
    path: filename,
    directory: Directory.Cache
  })
}
