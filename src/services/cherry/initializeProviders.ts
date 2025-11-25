import { registerMultipleProviderConfigs, type ProviderConfig } from 'src/aiCore/providers/registry'

// For now, we rely on base providers. This hook can be extended to register dynamic providers via import.
export const NEW_PROVIDER_CONFIGS: ProviderConfig[] = [
  // Kelivo Responses Provider (experimental)
  {
    id: 'kelivo-responses',
    name: 'Kelivo Responses',
    import: () => import('src/aiCore/providers/kelivo-responses/index'),
    creatorFunctionName: 'createKelivoResponsesProvider',
    supportsImageGeneration: false,
    aliases: ['kelivo', 'kelivo-response']
  }
]

export function initializeNewProviders(): void {
  try {
    registerMultipleProviderConfigs(NEW_PROVIDER_CONFIGS)
  } catch (error) {
    console.warn('initializeNewProviders failed:', error)
  }
}
