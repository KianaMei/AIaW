import { createAndRegisterProvider, hasProviderConfig, providerRegistry, getProviderConfig } from 'src/aiCore/providers/registry'
import { initializeNewProviders } from './initializeProviders'
import { providerToAiSdkConfig } from './providerConfig'
import type { ProviderV2 } from 'src/utils/types'

let bootstrapped = false

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
  // If it's already registered, skip (idempotent behavior in registry)
  const ids = providerRegistry.getRegisteredProviders()
  if (ids.includes(providerId)) return
  await createAndRegisterProvider(providerId, options)
}

// Synchronous best-effort registration for base providers (used to keep APIs sync)
export function ensureProviderRegisteredSync(provider: ProviderV2, modelId?: string): void {
  if (!bootstrapped) {
    initializeNewProviders()
    bootstrapped = true
  }
  const { providerId, options } = providerToAiSdkConfig(provider, modelId)
  const ids = providerRegistry.getRegisteredProviders()
  if (ids.includes(providerId)) return
  const cfg = getProviderConfig(providerId)
  if (cfg && typeof cfg.creator === 'function') {
    try {
      const p = cfg.creator(options)
      providerRegistry.registerProvider(providerId, p)
    } catch (e) {
      console.warn('ensureProviderRegisteredSync failed, will defer to async path later:', e)
    }
  }
}
