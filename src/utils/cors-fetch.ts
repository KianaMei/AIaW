import { CorsFetchBaseURL } from './config'
import { fetch, IsCapacitor, IsTauri } from './platform-api'

type CorsFetchOptions = {
  method?: string
  headers?: Record<string, string>
  body?: any
  timeoutMs?: number
  signal?: AbortSignal
}

export async function corsFetch(url: string, { method = 'GET', headers = {}, body, timeoutMs, signal }: CorsFetchOptions) {
  // Wire an AbortController for optional timeout
  let controller: AbortController | undefined
  let timeoutId: ReturnType<typeof setTimeout> | undefined
  if (!signal && timeoutMs && timeoutMs > 0) {
    controller = new AbortController()
    signal = controller.signal
    timeoutId = setTimeout(() => controller?.abort(), timeoutMs)
  }

  try {
    if (IsCapacitor || IsTauri) return await fetch(url, { method, headers, body, signal })

    if (!CorsFetchBaseURL) throw new Error('当前部署配置不支持跨域请求')
    const response = await fetch(`${CorsFetchBaseURL}/proxy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        method,
        url,
        headers,
        body
      }),
      signal
    })
    return response
  } finally {
    if (timeoutId) clearTimeout(timeoutId)
  }
}
