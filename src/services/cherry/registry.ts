import { createAndRegisterProvider, hasProviderConfig, providerRegistry, getProviderConfig, createProvider } from 'src/aiCore/providers/registry'
import { initializeNewProviders } from './initializeProviders'
import { providerToAiSdkConfig } from './providerConfig'
import type { ProviderV2 } from 'src/utils/types'

let bootstrapped = false

// Cache provider configurations to detect changes
const providerConfigCache = new Map<string, string>()

function getConfigSignature(provider: ProviderV2, options: any): string {
  // Create a simple signature from key configuration fields
  return `${provider.apiHost}|${provider.apiKey}|${JSON.stringify(options.baseURL)}`
}

export async function ensureProviderRegistered(provider: ProviderV2, modelId?: string): Promise<void> {
  if (!bootstrapped) {
    initializeNewProviders()
    bootstrapped = true
  }
  const { providerId, options } = providerToAiSdkConfig(provider, modelId)
  if (!hasProviderConfig(providerId)) {
    // In practice base providers are already loaded; this is a safeguard.
    console.warn(`Provider config not found for ${providerId}, attempting to continue with base set`)
  }
  // Use provider instance ID as registry key to avoid collision
  const registryKey = provider.id
  const ids = providerRegistry.getRegisteredProviders()

  // Check if configuration has changed
  const configSignature = getConfigSignature(provider, options)
  const cachedSignature = providerConfigCache.get(registryKey)

  if (ids.includes(registryKey) && cachedSignature === configSignature) {
    // Already registered with same configuration, skip
    return
  }

  // Create provider using providerId (to find config), but register with instance ID
  const createdProvider = await createProvider(providerId, options)
  providerRegistry.registerProvider(registryKey, createdProvider)

  // Update cache
  providerConfigCache.set(registryKey, configSignature)
}

// Synchronous best-effort registration for base providers (used to keep APIs sync)
export function ensureProviderRegisteredSync(provider: ProviderV2, modelId?: string): void {
  if (!bootstrapped) {
    initializeNewProviders()
    bootstrapped = true
  }
  const { providerId, options } = providerToAiSdkConfig(provider, modelId)
  // Use provider instance ID as registry key to avoid collision
  const registryKey = provider.id
  const ids = providerRegistry.getRegisteredProviders()

  // Check if configuration has changed
  const configSignature = getConfigSignature(provider, options)
  const cachedSignature = providerConfigCache.get(registryKey)

  if (ids.includes(registryKey) && cachedSignature === configSignature) {
    // Already registered with same configuration, skip
    return
  }

  const cfg = getProviderConfig(providerId)
  if (cfg && typeof cfg.creator === 'function') {
    try {
      const p = cfg.creator(options)
      providerRegistry.registerProvider(registryKey, p)
      // Update cache
      providerConfigCache.set(registryKey, configSignature)
    } catch (e) {
      console.warn('ensureProviderRegisteredSync failed, will defer to async path later:', e)
    }
  }
}
