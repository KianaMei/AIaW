import { createOpenAI } from '@ai-sdk/openai'
import { createAnthropic } from '@ai-sdk/anthropic'
import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createAzure } from '@ai-sdk/azure'
import { createMistral } from '@ai-sdk/mistral'
import { createXai } from '@ai-sdk/xai'
import { createTogetherAI } from '@ai-sdk/togetherai'
import { createCohere } from '@ai-sdk/cohere'
import { createGroq } from '@ai-sdk/groq'
import { createOllama } from 'ai-sdk-ollama'
import { createDeepSeek } from '@ai-sdk/deepseek'
import { ProviderV2 } from 'src/utils/types'
import { fetch } from 'src/utils/platform-api'
import { OfficialBaseURLs } from 'src/config/providers'

/**
 * @deprecated This file is deprecated and no longer used in the current architecture.
 *
 * The new architecture uses:
 * - src/services/cherry/providerConfig.ts (providerToAiSdkConfig) to generate provider options
 * - src/aiCore/providers/schemas.ts (baseProviders) to define provider creators
 * - src/services/cherry/registry.ts (ensureProviderRegistered) to register providers
 *
 * This factory class is kept for reference only and is not part of the active code path.
 *
 * API Client Factory - Cherry Studio Architecture
 * Creates appropriate SDK client based on provider configuration
 */
export class ApiClientFactory {
  /**
   * Create SDK provider client
   * @param provider Provider configuration
   * @returns SDK provider instance
   */
  static create(provider: ProviderV2) {
    // Build provider settings
    const settings = {
      ...provider.settings,
      baseURL: provider.apiHost || undefined,
      apiKey: provider.apiKey || undefined,
      fetch
    }

    // Handle special provider IDs first
    if (provider.id === 'burncloud') {
      return createOpenAICompatible({
        name: 'openai-compatible',
        baseURL: OfficialBaseURLs.burncloud,
        includeUsage: true,
        ...settings
      })
    }

    // Handle by provider type
    switch (provider.type) {
      case 'openai':
        return createOpenAI(settings)

      case 'openai-response': {
        // OpenAI Responses API (different response format)
        const openaiProvider = createOpenAI(settings)
        return (modelId: string) => openaiProvider.responses(modelId)
      }

      case 'anthropic':
        return createAnthropic(settings)

      case 'google':
        return createGoogleGenerativeAI(settings)

      case 'azure':
        return createAzure({
          ...settings,
          resourceName: provider.settings?.resourceName,
          apiVersion: provider.settings?.apiVersion
        })

      case 'openai-compatible':
        return createOpenAICompatible({
          name: 'openai-compatible',
          includeUsage: true,
          ...settings
        })

      case 'openrouter':
        return createOpenRouter(settings)

      case 'xai':
        return createXai(settings)

      case 'deepseek':
        return createDeepSeek(settings)

      case 'ollama':
        return createOllama(settings)

      case 'togetherai':
        return createTogetherAI(settings)

      case 'groq':
        return createGroq(settings)

      case 'cohere':
        return createCohere(settings)

      case 'mistral':
        return createMistral(settings)

      default:
        // Default to OpenAI-compatible
        console.warn(`Unknown provider type: ${provider.type}, falling back to OpenAI-compatible`)
        return createOpenAICompatible({
          name: 'openai-compatible',
          includeUsage: true,
          ...settings
        })
    }
  }

  /**
   * Get language model from provider and model ID
   * @param provider Provider configuration
   * @param modelId Original model ID (not the unique ID with provider prefix)
   * @returns Language model instance
   */
  static getLanguageModel(provider: ProviderV2, modelId: string) {
    const sdkProvider = this.create(provider)

    // For standard providers that return a function
    if (typeof sdkProvider === 'function') {
      return sdkProvider(modelId)
    }

    // For providers that have a chat method
    if (sdkProvider && typeof sdkProvider === 'object' && 'chat' in sdkProvider) {
      return (sdkProvider as any).chat(modelId)
    }

    throw new Error(`Unable to create language model for provider: ${provider.id}`)
  }
}
