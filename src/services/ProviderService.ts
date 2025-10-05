import { ProviderV2, SystemProvider, CustomProviderV2 } from 'src/utils/types'
import { SYSTEM_PROVIDERS, getSystemProviderById, getAllSystemProviders } from 'src/config/providers'
import { db } from 'src/utils/db'
import { fetch } from 'src/utils/platform-api'
import { OfficialBaseURLs } from 'src/config/providers'
import { genId } from 'src/utils/functions'

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
        const res = await fetch(new URL('/tags', base).toString())
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
      const models = await this.listModels(provider)
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
    const NOT_SUPPORT = ['deepseek', 'baichuan', 'minimax']
    return !NOT_SUPPORT.includes(provider.id)
  }

  static isSupportDeveloperRole(provider: ProviderV2): boolean {
    const NOT_SUPPORT = ['poe', 'qiniu']
    return !NOT_SUPPORT.includes(provider.id)
  }

  static isSupportVision(provider: ProviderV2): boolean {
    const SUPPORT = ['openai', 'anthropic', 'google', 'openai-compatible']
    return SUPPORT.includes(provider.type)
  }

  /**
   * List models from a provider via HTTP API
   * Used for validation and optional dynamic model loading
   */
  static async listModels(provider: ProviderV2): Promise<string[]> {
    const type = provider.type

    // Normalize base URL
    const base = provider.apiHost || (OfficialBaseURLs as any)[provider.id] || ''

    const headers: Record<string, string> = {}
    const url = new URL(base)

    const setBearer = () => { if (provider.apiKey) headers['Authorization'] = `Bearer ${provider.apiKey}` }

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
        const res = await fetch(new URL('/models', url).toString(), { headers })
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
        const data = await res.json()
        const list: string[] = Array.isArray(data?.data) ? data.data.map((d: any) => d.id).filter(Boolean) : []
        return list
      }
      case 'anthropic': {
        if (provider.apiKey) headers['x-api-key'] = provider.apiKey
        // Some Anthropic endpoints require version header; provide a default
        headers['anthropic-version'] = headers['anthropic-version'] || '2023-06-01'
        const res = await fetch(new URL('/models', url).toString(), { headers })
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
        const data = await res.json()
        return Array.isArray(data?.data) ? data.data.map((d: any) => d.id).filter(Boolean) : []
      }
      case 'google': {
        // Gemini API lists models via ?key=xxx
        const listUrl = new URL('/models', url)
        if (provider.apiKey) listUrl.searchParams.set('key', provider.apiKey)
        const res = await fetch(listUrl.toString())
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
        const data = await res.json()
        // google returns { models: [ { name: 'models/gemini-2.0-pro' } ] }
        const names = Array.isArray(data?.models) ? data.models.map((m: any) => m.name).filter(Boolean) : []
        // Strip leading 'models/' if present
        return names.map((n: string) => n.replace(/^models\//, ''))
      }
      case 'azure': {
        // Azure OpenAI: require resourceName and apiVersion in settings
        const resourceName = (provider.settings as any)?.resourceName
        const apiVersion = (provider.settings as any)?.apiVersion || '2024-10-01-preview'
        if (!resourceName || !provider.apiKey) throw new Error('Azure settings missing (resourceName/apiVersion/apiKey)')
        const baseUrl = `https://${resourceName}.openai.azure.com`
        const listUrl = `${baseUrl}/openai/deployments?api-version=${encodeURIComponent(apiVersion)}`
        const res = await fetch(listUrl, { headers: { 'api-key': provider.apiKey } })
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
        const data = await res.json()
        // Azure returns { data: [ { id: 'deploymentName', model: { name: 'gpt-4o' } } ] }
        const ids: string[] = Array.isArray(data?.data) ? data.data.map((d: any) => d.model?.name || d.id).filter(Boolean) : []
        return ids
      }
      case 'ollama': {
        const baseUrl = base || OfficialBaseURLs.ollama
        const res = await fetch(new URL('/tags', baseUrl).toString())
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
        const data = await res.json()
        // { models: [ { name } ] }
        return Array.isArray(data?.models) ? data.models.map((m: any) => m.name).filter(Boolean) : []
      }
      default:
        throw new Error(`Unsupported provider type for model listing: ${type}`)
    }
  }
}
