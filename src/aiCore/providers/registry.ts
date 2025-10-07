import { customProvider } from 'ai'
import { globalRegistryManagement } from './RegistryManagement'
import { baseProviders, type ProviderConfig } from './schemas'

class ProviderInitializationError extends Error {
  constructor(
    message: string,
    public providerId?: string,
    public cause?: Error
  ) {
    super(message)
    this.name = 'ProviderInitializationError'
  }
}

export { globalRegistryManagement as providerRegistry }

export const getLanguageModel = (id: string) => globalRegistryManagement.languageModel(id as any)
export const getTextEmbeddingModel = (id: string) => globalRegistryManagement.textEmbeddingModel(id as any)
export const getImageModel = (id: string) => globalRegistryManagement.imageModel(id as any)

export function getSupportedProviders(): Array<{ id: string; name: string }> {
  return baseProviders.map((p) => ({ id: p.id, name: p.name }))
}

export function getInitializedProviders(): string[] {
  return globalRegistryManagement.getRegisteredProviders()
}

export function hasInitializedProviders(): boolean {
  return globalRegistryManagement.hasProviders()
}

const providerConfigs = new Map<string, ProviderConfig>()
const providerConfigAliases = new Map<string, string>()

function initializeBuiltInConfigs(): void {
  baseProviders.forEach((provider) => {
    const config: ProviderConfig = {
      id: provider.id,
      name: provider.name,
      creator: provider.creator as any,
      supportsImageGeneration: provider.supportsImageGeneration || false
    }
    providerConfigs.set(provider.id, config)
  })
}

initializeBuiltInConfigs()

export function registerProviderConfig(config: ProviderConfig): boolean {
  try {
    if (!config || !config.id || !config.name) return false
    if (providerConfigs.has(config.id)) console.warn(`ProviderConfig "${config.id}" already exists, will override`)
    providerConfigs.set(config.id, config)
    if (config.aliases && config.aliases.length > 0) {
      config.aliases.forEach((alias) => {
        if (providerConfigAliases.has(alias)) console.warn(`ProviderConfig alias "${alias}" already exists, will override`)
        providerConfigAliases.set(alias, config.id)
      })
    }
    return true
  } catch (error) {
    console.error('Failed to register ProviderConfig:', error)
    return false
  }
}

export async function createProvider(providerId: string, options: any): Promise<any> {
  const realId = resolveProviderConfigId(providerId)
  const config = providerConfigs.get(realId)
  if (!config) throw new Error(`ProviderConfig not found for id: ${realId}`)
  try {
    let creator: (options: any) => any
    if (config.creator) {
      creator = config.creator
    } else if (config.import && config.creatorFunctionName) {
      const module = await config.import()
      creator = (module as any)[config.creatorFunctionName]
      if (!creator || typeof creator !== 'function') throw new Error(`Creator function "${config.creatorFunctionName}" not found`)
    } else {
      throw new Error('No valid creator method provided in ProviderConfig')
    }
    return creator(options)
  } catch (error) {
    console.error(`Failed to create provider "${providerId}":`, error)
    throw error
  }
}

export function registerProvider(providerId: string, provider: any): boolean {
  try {
    const config = providerConfigs.get(resolveProviderConfigId(providerId))
    if (!config) {
      console.error(`ProviderConfig not found for id: ${providerId}`)
      return false
    }
    const aliases = config.aliases
    if (providerId === 'openai') {
      globalRegistryManagement.registerProvider(providerId, provider, aliases)
      const openaiChatProvider = customProvider({
        fallbackProvider: {
          ...provider,
          languageModel: (modelId: string) => provider.chat(modelId)
        }
      })
      globalRegistryManagement.registerProvider(`${providerId}-chat`, openaiChatProvider)
    } else if (providerId === 'azure') {
      globalRegistryManagement.registerProvider(`${providerId}-chat`, provider, aliases)
      const azureResponsesProvider = customProvider({
        fallbackProvider: {
          ...provider,
          languageModel: (modelId: string) => (provider as any).responses(modelId)
        }
      })
      globalRegistryManagement.registerProvider(providerId, azureResponsesProvider)
    } else {
      globalRegistryManagement.registerProvider(providerId, provider, aliases)
    }
    return true
  } catch (error) {
    console.error(`Failed to register provider "${providerId}" to global registry:`, error)
    return false
  }
}

export async function createAndRegisterProvider(providerId: string, options: any): Promise<boolean> {
  try {
    const provider = await createProvider(providerId, options)
    return registerProvider(providerId, provider)
  } catch (error) {
    console.error(`Failed to create and register provider "${providerId}":`, error)
    return false
  }
}

export function registerMultipleProviderConfigs(configs: ProviderConfig[]): number {
  let successCount = 0
  configs.forEach((config) => {
    if (registerProviderConfig(config)) successCount++
  })
  return successCount
}

export function hasProviderConfig(providerId: string): boolean {
  return providerConfigs.has(resolveProviderConfigId(providerId))
}

export function hasProviderConfigByAlias(aliasOrId: string): boolean {
  const realId = resolveProviderConfigId(aliasOrId)
  return providerConfigs.has(realId)
}

export function getAllProviderConfigs(): ProviderConfig[] {
  return Array.from(providerConfigs.values())
}

export function getProviderConfig(providerId: string): ProviderConfig | undefined {
  return providerConfigs.get(resolveProviderConfigId(providerId))
}

export function getProviderConfigByAlias(aliasOrId: string): ProviderConfig | undefined {
  const realId = resolveProviderConfigId(aliasOrId)
  return providerConfigs.get(realId)
}

export function resolveProviderConfigId(aliasOrId: string): string {
  return providerConfigAliases.get(aliasOrId) || aliasOrId
}

export function isProviderConfigAlias(id: string): boolean {
  return providerConfigAliases.has(id)
}

export function getAllProviderConfigAliases(): Record<string, string> {
  const result: Record<string, string> = {}
  providerConfigAliases.forEach((realId, alias) => {
    result[alias] = realId
  })
  return result
}

export function cleanup(): void {
  providerConfigs.clear()
  providerConfigAliases.clear()
  globalRegistryManagement.clear()
  initializeBuiltInConfigs()
}

export function clearAllProviders(): void {
  globalRegistryManagement.clear()
}

export { ProviderInitializationError }
