import { registerMultipleProviderConfigs, type ProviderConfig } from 'src/aiCore/providers/registry'

// For now, we rely on base providers. This hook can be extended to register dynamic providers via import.
export const NEW_PROVIDER_CONFIGS: ProviderConfig[] = [
  // Example for future dynamic providers (kept empty by default)
]

export function initializeNewProviders(): void {
  try {
    registerMultipleProviderConfigs(NEW_PROVIDER_CONFIGS)
  } catch (error) {
    console.warn('initializeNewProviders failed:', error)
  }
}

