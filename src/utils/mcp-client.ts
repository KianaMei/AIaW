import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { TransportConf } from './types'
import { JSONEqual } from './functions'
import { version } from 'src/version'
import { TauriShellClientTransport } from './tauri-shell-transport'
import { platform } from '@tauri-apps/plugin-os'
import { fetch } from './platform-api'
import { Notify } from 'quasar'
import { i18n } from 'src/boot/i18n'
import { SSEClientTransport } from './mcp-sse-transport'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'

const KeepAliveTimeout = 300e3
const MaxRetries = 3
const RetryDelayBase = 1000 // 1 second

interface PoolItem {
  conf: TransportConf
  client: Client
  timeoutId: number
  lastActivity: number
  retryCount: number
  isConnecting: boolean
}

const pool = new Map<string, PoolItem>()

type Settings = TransportConf & { timeout?: number }

function parseSettings(settings: Settings): {
  transportConf: TransportConf
  timeout?: number
} {
  const timeout = settings.timeout
  delete settings.timeout
  return {
    transportConf: settings,
    timeout
  }
}

const { t } = i18n.global

// 更新连接活动时间
function updateActivity(key: string) {
  const item = pool.get(key)
  if (item) {
    item.lastActivity = Date.now()
  }
}

// 创建新连接
async function createConnection(key: string, transportConf: TransportConf): Promise<Client> {
  const client = new Client({
    name: 'aiaw',
    version
  })

  if (transportConf.type === 'stdio') {
    const pf = platform()
    await client.connect(new TauriShellClientTransport({
      command: pf === 'windows' ? 'cmd' : 'sh',
      args: [pf === 'windows' ? '/c' : '-c', transportConf.command],
      env: transportConf.env,
      cwd: transportConf.cwd
    }))
  } else if (transportConf.type === 'http') {
    await client.connect(new StreamableHTTPClientTransport(new URL(transportConf.url), {
      fetch,
      requestInit: {
        headers: transportConf.headers,
        cache: 'no-cache'
      }
    })).catch(err => {
      client.close()
      if (err.message && err.message.includes('session')) {
        throw new Error(`MCP 连接失败: ${err.message}. 提示：如果使用 localhost，请确保 MCP 服务器正确处理 session 管理。`)
      }
      throw err
    })
  } else {
    await client.connect(new SSEClientTransport(new URL(transportConf.url), {
      fetch
    })).catch(err => {
      client.close()
      throw err
    })
  }

  return client
}

// 自动重连
async function reconnect(key: string, item: PoolItem): Promise<void> {
  if (item.isConnecting || item.retryCount >= MaxRetries) {
    return
  }

  item.isConnecting = true
  item.retryCount++

  const delay = RetryDelayBase * Math.pow(2, item.retryCount - 1) // 指数退避

  console.log(`[MCP] 尝试重连 ${key}，第 ${item.retryCount}/${MaxRetries} 次，延迟 ${delay}ms`)

  await new Promise(resolve => setTimeout(resolve, delay))

  try {
    const newClient = await createConnection(key, item.conf)

    // 关闭旧客户端
    await item.client.close().catch(() => {})

    // 更新为新客户端
    item.client = newClient
    item.retryCount = 0
    item.lastActivity = Date.now()

    // 设置事件处理
    setupClientHandlers(key, item)

    Notify.create({
      type: 'positive',
      message: t('mcpClient.reconnected'),
      timeout: 2000
    })

    console.log(`[MCP] 重连成功: ${key}`)
  } catch (error) {
    console.error(`[MCP] 重连失败: ${key}`, error)

    if (item.retryCount >= MaxRetries) {
      Notify.create({
        type: 'negative',
        message: t('mcpClient.reconnectFailed'),
        timeout: 3000
      })
      pool.delete(key)
    } else {
      // 继续重试
      await reconnect(key, item)
    }
  } finally {
    item.isConnecting = false
  }
}

// 设置客户端事件处理器
function setupClientHandlers(key: string, item: PoolItem) {
  item.client.onclose = () => {
    console.log(`[MCP] 连接关闭: ${key}`)
    window.clearTimeout(item.timeoutId)

    const poolItem = pool.get(key)
    if (poolItem) {
      // 尝试自动重连
      reconnect(key, poolItem).catch(err => {
        console.error(`[MCP] 重连流程失败: ${key}`, err)
      })
    }
  }

  item.client.onerror = err => {
    console.error(`[MCP] 连接错误: ${key}`, err)

    Notify.create({
      type: 'negative',
      message: t('mcpClient.connectionError', { error: err.message || String(err) }),
      timeout: 3000
    })
  }
}

// 重置超时计时器
function resetTimeout(key: string, item: PoolItem, clientTimeout: number) {
  window.clearTimeout(item.timeoutId)

  item.timeoutId = window.setTimeout(() => {
    // 检查最近是否有活动
    const timeSinceActivity = Date.now() - item.lastActivity

    if (timeSinceActivity >= clientTimeout) {
      console.log(`[MCP] 连接超时关闭: ${key}`)
      item.client.close()
      pool.delete(key)
    } else {
      // 还在活动中，重新设置超时
      const remainingTime = clientTimeout - timeSinceActivity
      resetTimeout(key, item, remainingTime)
    }
  }, clientTimeout)
}

export async function getClient(key: string, settings: Settings) {
  const { transportConf, timeout } = parseSettings(settings)
  const clientTimeout = Math.max(timeout ? timeout * 1000 : 0, KeepAliveTimeout)

  // 检查现有连接
  if (pool.has(key)) {
    const item = pool.get(key)!

    if (JSONEqual(item.conf, transportConf)) {
      // 配置相同，更新活动时间并重置超时
      updateActivity(key)
      resetTimeout(key, item, clientTimeout)
      return item.client
    } else {
      // 配置不同，关闭旧连接
      await item.client.close()
      pool.delete(key)
    }
  }

  // 创建新连接
  Notify.create({
    message: t('mcpClient.connectingMcpServer')
  })

  // 对于 HTTP 类型，清理可能存在的旧会话
  if (transportConf.type === 'http' && pool.has(key)) {
    const oldClient = pool.get(key)!.client
    await oldClient.close().catch(() => {})
    pool.delete(key)
  }

  const client = await createConnection(key, transportConf)

  const item: PoolItem = {
    conf: transportConf,
    client,
    timeoutId: 0,
    lastActivity: Date.now(),
    retryCount: 0,
    isConnecting: false
  }

  pool.set(key, item)
  setupClientHandlers(key, item)
  resetTimeout(key, item, clientTimeout)

  return client
}
