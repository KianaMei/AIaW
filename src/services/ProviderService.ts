import { ProviderV2, SystemProvider, CustomProviderV2 } from 'src/utils/types'
import { SYSTEM_PROVIDERS, getSystemProviderById, getAllSystemProviders, OfficialBaseURLs } from 'src/config/providers'
import { db } from 'src/utils/db'
import { fetch } from 'src/utils/platform-api'
import { genId } from 'src/utils/functions'
import {
  isSupportArrayContent as capIsSupportArrayContent,
  isSupportDeveloperRole as capIsSupportDeveloperRole,
  isSupportServiceTier as capIsSupportServiceTier,
  isSupportVision as capIsSupportVision,
  isSupportUrlContext as capIsSupportUrlContext,
  isGeminiNativeWebSearchProvider as capIsGeminiNativeWebSearchProvider
} from 'src/config/provider-capabilities'

/**
 * Provider Service - Cherry Studio Architecture
 * Manages system and custom providers
 */
export class ProviderService {
  /**
   * Get all providers (system + custom)
   * @returns Array of all providers
   */
  static async getAllProviders(): Promise<ProviderV2[]> {
    const systemProviders = getAllSystemProviders()
    const customProviders = await db.providers.toArray()

    // After v8 migration, DB contains V2 format directly - no conversion needed
    return [...systemProviders, ...customProviders]
  }

  /**
   * Get provider by ID
   * @param id Provider ID
   * @returns Provider or null if not found
   */
  static async getProviderById(id: string): Promise<ProviderV2 | null> {
    // Check system providers first
    const systemProvider = getSystemProviderById(id)
    if (systemProvider) {
      return systemProvider
    }

    // Check custom providers - already in V2 format after migration
    const customProvider = await db.providers.get(id)
    return customProvider || null
  }

  /**
   * Get enabled providers
   * @returns Array of enabled providers
   */
  static async getEnabledProviders(): Promise<ProviderV2[]> {
    const allProviders = await this.getAllProviders()
    return allProviders.filter(p => p.enabled)
  }

  /**
   * Get system providers only
   * @returns Array of system providers
   */
  static getSystemProviders(): SystemProvider[] {
    return getAllSystemProviders()
  }

  /**
   * Get custom providers only
   * @returns Array of custom providers
   */
  static async getCustomProviders(): Promise<CustomProviderV2[]> {
    // After v8 migration, DB contains V2 format directly
    return await db.providers.toArray()
  }

  /**
   * Update system provider settings
   * Note: System providers config is stored separately from DB
   * This method updates runtime state
   */
  static updateSystemProvider(id: string, updates: Partial<SystemProvider>): void {
    const provider = SYSTEM_PROVIDERS[id as keyof typeof SYSTEM_PROVIDERS]
    if (provider) {
      Object.assign(provider, updates)
    }
  }

  /**
   * Update custom provider
   * @param id Provider ID
   * @param updates Provider updates
   */
  static async updateCustomProvider(
    id: string,
    updates: Partial<CustomProviderV2>
  ): Promise<void> {
    await db.providers.update(id, updates)
  }

  /**
   * Create custom provider
   * @param provider Provider data
   * @returns Provider ID
   */
  static async createCustomProvider(_provider: Omit<CustomProviderV2, 'isSystem'>): Promise<string> {
    const id = _provider.id || genId()

    // Write V2 format directly to DB (after v8 migration)
    const v2Provider: CustomProviderV2 = {
      id,
      name: _provider.name || 'Custom Provider',
      type: _provider.type || 'openai-compatible',
      apiHost: _provider.apiHost || '',
      apiKey: _provider.apiKey || '',
      models: _provider.models || [],
      isSystem: false as const,
      enabled: _provider.enabled !== false,
      settings: _provider.settings || {},
      avatar: _provider.avatar || {
        type: 'icon',
        icon: 'sym_o_dashboard_customize',
        hue: Math.floor(Math.random() * 360)
      }
    }

    await db.providers.add(v2Provider)
    return id
  }

  /**
   * Delete custom provider
   * @param id Provider ID
   */
  static async deleteCustomProvider(id: string): Promise<void> {
    await db.providers.delete(id)
  }

  /**
   * Validate provider credentials
   * @param provider Provider to validate
   * @returns Validation result
   */
  static async validateProvider(provider: ProviderV2): Promise<{
    valid: boolean
    error?: string
  }> {
    // Quick allow for local Ollama
    if (provider.type === 'ollama') {
      try {
        const base = provider.apiHost || OfficialBaseURLs.ollama
        const res = await fetch(new URL('tags', new URL(base)).toString())
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
        return { valid: true }
      } catch (e: any) {
        return { valid: false, error: e?.message || String(e) }
      }
    }

    // Require API host/key for most providers
    if (!provider.apiHost && provider.type !== 'azure' && provider.type !== 'google') {
      return { valid: false, error: 'API Host is required' }
    }
    if (!provider.apiKey && provider.type !== 'google') {
      return { valid: false, error: 'API Key is required' }
    }

    // Attempt to list models as a lightweight validation
    try {
      await this.listModels(provider)
      // If we could reach the endpoint without throwing, consider valid
      return { valid: true }
    } catch (e: any) {
      return { valid: false, error: e?.message || String(e) }
    }
  }

  /**
   * Get provider display name
   * @param providerId Provider ID
   * @returns Provider display name
   */
  static async getProviderName(providerId: string): Promise<string> {
    const provider = await this.getProviderById(providerId)
    return provider?.name || providerId
  }

  /**
   * Check if provider supports specific features
   * Based on Cherry Studio's capability detection
   */
  static isSupportArrayContent(provider: ProviderV2): boolean {
    return capIsSupportArrayContent(provider)
  }

  static isSupportDeveloperRole(provider: ProviderV2): boolean {
    return capIsSupportDeveloperRole(provider)
  }

  static isSupportVision(provider: ProviderV2): boolean {
    return capIsSupportVision(provider)
  }

  static isSupportServiceTier(provider: ProviderV2): boolean {
    return capIsSupportServiceTier(provider)
  }

  static isSupportUrlContext(provider: ProviderV2): boolean {
    return capIsSupportUrlContext(provider)
  }

  static isGeminiNativeWebSearchProvider(provider: ProviderV2): boolean {
    return capIsGeminiNativeWebSearchProvider(provider)
  }

  /**
   * List models from a provider via HTTP API
   * Used for validation and optional dynamic model loading
   */
  static async listModels(provider: ProviderV2): Promise<string[]> {
    const type = provider.type

    // Normalize base URL
    // Prefer explicit apiHost; else fall back by type, then by id
    let base = (provider.apiHost || '').trim()
    if (!base) {
      const byType = (OfficialBaseURLs as any)[provider.type]
      const byId = (OfficialBaseURLs as any)[provider.id]
      base = byType || byId || ''
    }

    // If still missing for types that require host, throw early with clearer error
    const requiresHost = !['azure', 'google', 'ollama'].includes(provider.type)
    if (!base && requiresHost) {
      throw new Error('Missing API host; please set a valid base URL (e.g. https://api.example.com/v1)')
    }

    const headers: Record<string, string> = {}
    // Ensure base includes scheme
    const normalizedBase = base && /^https?:\/\//i.test(base) ? base : (base ? `https://${base}` : base)
    const url = new URL(normalizedBase || 'http://localhost')

    // helper: build URL by appending relative path (keeps base pathname)
    const join = (p: string) => new URL(p.replace(/^\/+/, ''), url).toString()
    const fetchJson = async (u: string, init?: any) => {
      const res = await fetch(u, init)
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
      try {
        return await res.json()
      } catch (e) {
        const text = await res.text().catch(() => '')
        throw new Error(`Invalid JSON from ${u}: ${text.slice(0, 120)}`)
      }
    }
    const extractModelIds = (payload: any): string[] => {
      const arr = Array.isArray(payload)
        ? payload
        : (Array.isArray(payload?.data)
          ? payload.data
          : (Array.isArray(payload?.models)
            ? payload.models
            : (Array.isArray(payload?.list) ? payload.list : [])))
      return arr
        .map((d: any) => typeof d === 'string' ? d : (d?.id || d?.name || d?.model_name))
        .filter((x: any) => typeof x === 'string' && x)
    }

    // timeout controller
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null
    const timeoutMs = 12000
    let timer: any
    if (controller) {
      timer = setTimeout(() => controller.abort('request-timeout'), timeoutMs)
    }

    const setBearer = () => { if (provider.apiKey) headers.Authorization = `Bearer ${provider.apiKey}` }

    switch (type) {
      case 'openai':
      case 'openai-compatible':
      case 'openrouter':
      case 'groq':
      case 'cohere':
      case 'xai':
      case 'deepseek':
      case 'mistral':
      case 'togetherai': {
        setBearer()
        try {
          const defaultCandidates = [
            // Prefer common gateway prefixes first to avoid HTML from root '/models'
            'api/user/models',
            'api/v1/models',
            'api/models',
            'v1/models',
            'models'
          ]
          const host = url.hostname.toLowerCase()
          const preferred = (host.includes('yunai'))
            ? ['api/user/models']
            : []
          const candidates = [...new Set([...preferred, ...defaultCandidates])].map(join)
          let data: any
          let lastErr: any
          for (const u of candidates) {
            try {
              data = await fetchJson(u, { headers, signal: controller?.signal as any })
              const list: string[] = extractModelIds(data)
              if (list.length || 'data' in (data || {}) || 'models' in (data || {})) return list
            } catch (err) {
              lastErr = err
              continue
            }
          }
          if (lastErr) throw lastErr
          return []
        } catch (e: any) {
          throw new Error(`[${provider.id}] listModels failed: ${e?.message || String(e)}`)
        } finally { if (timer) clearTimeout(timer) }
      }
      case 'anthropic': {
        if (provider.apiKey) headers['x-api-key'] = provider.apiKey
        // Some Anthropic endpoints require version header; provide a default
        headers['anthropic-version'] = headers['anthropic-version'] || '2023-06-01'
        try {
          const data = await fetchJson(join('models'), { headers, signal: controller?.signal as any })
          return extractModelIds(data)
        } catch (e: any) {
          throw new Error(`[${provider.id}] listModels failed: ${e?.message || String(e)}`)
        } finally { if (timer) clearTimeout(timer) }
      }
      case 'google': {
        // Gemini API lists models via ?key=xxx
        // Use official base when apiHost was not specified
        const gBase = normalizedBase || OfficialBaseURLs.google
        const baseUrl = new URL(gBase)
        const listUrl = new URL('models', baseUrl)
        if (provider.apiKey) listUrl.searchParams.set('key', provider.apiKey)
        try {
          const res = await fetch(listUrl.toString(), { signal: controller?.signal as any })
          if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
          const data = await res.json()
          const names = Array.isArray(data?.models) ? data.models.map((m: any) => m.name).filter(Boolean) : []
          return names.map((n: string) => n.replace(/^models\//, ''))
        } catch (e: any) {
          throw new Error(`[${provider.id}] listModels failed: ${e?.message || String(e)}`)
        } finally { if (timer) clearTimeout(timer) }
      }
      case 'azure': {
        // Azure OpenAI: require resourceName and apiVersion in settings
        const resourceName = (provider.settings as any)?.resourceName
        const apiVersion = (provider.settings as any)?.apiVersion || '2024-10-01-preview'
        if (!resourceName || !provider.apiKey) throw new Error('Azure settings missing (resourceName/apiVersion/apiKey)')
        const baseUrl = `https://${resourceName}.openai.azure.com`
        const listUrl = `${baseUrl}/openai/deployments?api-version=${encodeURIComponent(apiVersion)}`
        try {
          const res = await fetch(listUrl, { headers: { 'api-key': provider.apiKey }, signal: controller?.signal as any })
          if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
          const data = await res.json()
          const ids: string[] = Array.isArray(data?.data) ? data.data.map((d: any) => d.model?.name || d.id).filter(Boolean) : []
          return ids
        } catch (e: any) {
          throw new Error(`[${provider.id}] listModels failed: ${e?.message || String(e)}`)
        } finally { if (timer) clearTimeout(timer) }
      }
      case 'ollama': {
        const baseUrl = base || OfficialBaseURLs.ollama
        try {
          const data = await fetchJson(new URL('tags', new URL(baseUrl)).toString(), { signal: controller?.signal as any })
          return Array.isArray(data?.models) ? data.models.map((m: any) => m.name).filter(Boolean) : []
        } catch (e: any) {
          throw new Error(`[${provider.id}] listModels failed: ${e?.message || String(e)}`)
        } finally { if (timer) clearTimeout(timer) }
      }
      default:
        throw new Error(`Unsupported provider type for model listing: ${type}`)
    }
  }
}
