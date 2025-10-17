/* eslint-disable */
// Modified from https://github.com/ChatGPTNextWeb/NextChat/blob/main/app/utils/stream.ts

// using tauri command to send request
// see src-tauri/src/stream.rs, and src-tauri/src/main.rs
// 1. invoke('stream_fetch', {url, method, headers, body}), get response with headers.
// 2. listen event: `stream-response` multi times to get body

import { listen } from '@tauri-apps/api/event'
import { invoke } from '@tauri-apps/api/core'
import { IsTauri } from './platform-api'

function uiDebugEnabled() {
  try { return localStorage.getItem('AIAW_HTTP_UI') === '1' || localStorage.getItem('AIAW_DEBUG_HTTP') === '1' } catch { return false }
}
function pushHttpLog(entry: any) {
  try {
    const g = window as any
    g.__AIAW_HTTP_LOGS = g.__AIAW_HTTP_LOGS || []
    g.__AIAW_HTTP_LOGS.push(entry)
    window.dispatchEvent(new CustomEvent('aiaw-http-log', { detail: entry }))
  } catch {}
}

type ResponseEvent = {
  id: number;
  payload: {
    request_id: number;
    status?: number;
    chunk?: number[];
  };
};

type StreamResponse = {
  request_id: number;
  status: number;
  status_text: string;
  headers: Record<string, string>;
};

function debugHttpEnabled() {
  try { return localStorage.getItem('AIAW_DEBUG_HTTP') === '1' } catch { return false }
}

export function fetch(url: string, options?: RequestInit): Promise<Response> {
  if (!IsTauri) return window.fetch(url, options)
  const {
    signal,
    method = 'GET',
    headers: _headers = {},
    body = []
  } = options || {}
  if (debugHttpEnabled()) {
    // eslint-disable-next-line no-console
    console.groupCollapsed(`[HTTP] ${method.toUpperCase()} ${url} (tauri-stream)`)
    // eslint-disable-next-line no-console
    console.log('Request headers:', Object.fromEntries(new Headers(_headers as any).entries()))
    if (typeof body === 'string') {
      // eslint-disable-next-line no-console
      console.log('Request body:', body.length > 2000 ? body.slice(0, 2000) + `…(${body.length - 2000} more)` : body)
    } else if (Array.isArray(body)) {
      // eslint-disable-next-line no-console
      console.log('Request body:', `[array length=${body.length}]`)
    }
  }
  if (uiDebugEnabled()) pushHttpLog({ phase: 'start', ts: Date.now(), method: method.toUpperCase(), url: String(url), headers: Object.fromEntries(new Headers(_headers as any).entries()) })
  let unlisten: Function | undefined
  let setRequestId: Function | undefined
  const requestIdPromise = new Promise((resolve) => (setRequestId = resolve))
  const ts = new TransformStream()
  const writer = ts.writable.getWriter()

  let closed = false
  const close = () => {
    if (closed) return
    closed = true
    unlisten && unlisten()
    writer.ready.then(() => {
      writer.close().catch((e) => console.error(e))
    })
  }

  if (signal) {
    signal.addEventListener('abort', () => close())
  }
  // @ts-ignore 2. listen response multi times, and write to Response.body
  listen('stream-response', (e: ResponseEvent) =>
    requestIdPromise.then((request_id) => {
      const { request_id: rid, chunk, status } = e?.payload || {}
      if (request_id != rid) {
        return
      }
      if (chunk) {
        writer.ready.then(() => {
          writer.write(new Uint8Array(chunk))
        })
      } else if (status === 0) {
        // end of body
        close()
      }
    })
  ).then((u: Function) => (unlisten = u))

  const headers = new Headers({
    Accept: 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7',
    'User-Agent': navigator.userAgent
  })
  for (const [key, value] of new Headers(_headers || {})) {
    headers.set(key, value)
  }
  const startTs = Date.now()
  return invoke('stream_fetch', {
    method: method.toUpperCase(),
    url,
    headers: Object.fromEntries(headers.entries()),
    // TODO FormData
    body:
      typeof body === 'string'
        ? Array.from(new TextEncoder().encode(body))
        : []
  })
    .then((res: StreamResponse) => {
      const { request_id, status, status_text: statusText, headers } = res
      setRequestId?.(request_id)
      if (debugHttpEnabled()) {
        // eslint-disable-next-line no-console
        console.log('Response status:', status, statusText)
        // eslint-disable-next-line no-console
        console.log('Response headers:', headers)
        // eslint-disable-next-line no-console
        console.groupEnd()
      }
      if (uiDebugEnabled()) pushHttpLog({ phase: 'end', ts: Date.now(), dur: Date.now() - startTs, method: method.toUpperCase(), url: String(url), status, statusText, respHeaders: headers })
      const response = new Response(ts.readable, {
        status,
        statusText,
        headers
      })
      if (status >= 300) {
        setTimeout(close, 100)
      }
      return response
    })
    .catch(msg => {
      if (debugHttpEnabled()) {
        // eslint-disable-next-line no-console
        console.error('HTTP error:', msg)
        // eslint-disable-next-line no-console
        console.groupEnd()
      }
      if (uiDebugEnabled()) pushHttpLog({ phase: 'error', ts: Date.now(), dur: Date.now() - startTs, method: method.toUpperCase(), url: String(url), error: String(msg) })
      throw new Error(msg)
    })
}
