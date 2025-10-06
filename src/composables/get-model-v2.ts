/**
 * Get Model Composable V2 - Cherry Studio Architecture
 * Provides functions to retrieve and create language models using the new architecture
 */
import { computed } from 'vue'
import { useUserPerfsStore } from 'src/stores/user-perfs'
import { Model, ProviderV2 } from 'src/utils/types'
import { useObservable } from '@vueuse/rxjs'
import { db } from 'src/utils/db'
import { DexieDBURL, LitellmBaseURL } from 'src/utils/config'
import { wrapLanguageModel, extractReasoningMiddleware } from 'ai'
import { AuthropicCors, FormattingReenabled, MarkdownFormatting } from 'src/utils/middlewares'
import { useProvidersV2Store } from 'src/stores/providers-v2'
import type { LanguageModelV2, LanguageModelV2Middleware } from '@ai-sdk/provider'
import { globalModelResolver } from 'src/aiCore/models'
import { ensureProviderRegistered, ensureProviderRegisteredSync } from 'src/services/cherry/registry'
import { getAiSdkProviderId, providerToAiSdkConfig } from 'src/services/cherry/providerConfig'
import { ModelService } from 'src/services/ModelService'
import { ApiClientFactory } from 'src/services/ApiClientFactory'

const FormattingModels = ['o1', 'o3-mini', 'o3-mini-2025-01-31']

function wrapMiddlewares(model: LanguageModelV2) {
  const middlewares = [extractReasoningMiddleware({ tagName: 'think' })]
  FormattingModels.includes(model.modelId) && middlewares.push(FormattingReenabled)
  model.modelId.startsWith('gpt-5') && middlewares.push(MarkdownFormatting)
  model.provider.startsWith('anthropic.') && middlewares.push(AuthropicCors)
  return middlewares.length ? wrapLanguageModel({ model, middleware: middlewares }) : model
}

export function useGetModelV2() {
  const user = DexieDBURL ? useObservable(db.cloud.currentUser) : null
  const defaultProvider = computed<ProviderV2 | null>(() => {
    if (!user?.value?.isLoggedIn) return null
    let base: string | undefined
    try {
      base = LitellmBaseURL ? new URL(LitellmBaseURL, location.origin).toString() : undefined
    } catch {
      base = undefined
    }
    if (!base) return null
    return {
      id: 'litellm-cloud',
      name: 'LiteLLM Cloud',
      type: 'openai-compatible',
      apiHost: base,
      apiKey: user.value.data.apiKey,
      isSystem: false as const,
      enabled: true,
      settings: {}
    }
  })

  const { perfs } = useUserPerfsStore()
  const providersStore = useProvidersV2Store()

  /**
   * Get provider by ID
   * Falls back to default provider or user preference
   */
  function getProvider(providerId?: string): ProviderV2 | null {
    if (providerId) {
      const provider = providersStore.getProviderById(providerId)
      if (provider) return provider
    }

    // Fallback chain: provided -> user pref -> default
    if (perfs.providerId) {
      const provider = providersStore.getProviderById(perfs.providerId)
      if (provider) return provider
    }

    return defaultProvider.value
  }

  /**
   * Get model by provider + modelId
   * Falls back to user preference
   */
  function getModelBy(providerId?: string, modelId?: string): Model | null {
    const pid = providerId || perfs.providerId || undefined
    const mid = modelId || perfs.modelId || undefined
    if (!pid || !mid) return null
    const uniq = `${pid}:${mid}`
    return providersStore.getModelByUniqId(uniq)
  }

  /**
   * Get SDK provider client
   * @param providerId Provider ID
   */
  // Deprecated: keep signature for compatibility; now we resolve by registry on-demand
  function getSdkProvider(_providerId?: string) {
    console.warn('[get-model-v2] getSdkProvider is deprecated in Cherry provider refactor')
    return null
  }

  /**
   * Get SDK language model
   * @param modelUniqId Model unique ID (format: "provider:modelId")
   * @returns Language model instance ready to use
   */
  async function getSdkModelBy(providerId?: string, modelId?: string) {
    const model = getModelBy(providerId, modelId)
    if (!model) {
      console.warn('No model found for:', providerId, modelId)
      return null
    }
    const provider = getProvider(model.provider)
    if (!provider) {
      console.warn('No provider found for model:', model)
      return null
    }

    try {
      const uniqId = `${model.provider}:${model.id}`
      await ensureProviderRegistered(provider, model.id)
      const middlewares: LanguageModelV2Middleware[] = []
      const lm = await globalModelResolver.resolveLanguageModel(
        uniqId,
        getAiSdkProviderId(provider),
        providerToAiSdkConfig(provider, model.id).options,
        middlewares
      )
      return wrapMiddlewares(lm)
    } catch (error) {
      console.error('Failed to resolve SDK model via Cherry provider core:', error)
      if (defaultProvider.value) {
        try {
          await ensureProviderRegistered(defaultProvider.value, model.id)
          const fallbackUniqId = `${defaultProvider.value.id}:${model.id}`
          const lm = await globalModelResolver.resolveLanguageModel(
            fallbackUniqId,
            getAiSdkProviderId(defaultProvider.value),
            providerToAiSdkConfig(defaultProvider.value, model.id).options,
            []
          )
          return wrapMiddlewares(lm)
        } catch (fallbackError) {
          console.error('Fallback provider also failed:', fallbackError)
        }
      }
      return null
    }
  }

  /**
   * Get model display name
   * @param modelUniqId Model unique ID
   */
  function getModelDisplayNameBy(providerId: string, modelId: string): string {
    const uniq = `${providerId}:${modelId}`
    return providersStore.getModelDisplayName(uniq)
  }

  /**
   * Parse model unique ID
   * @param modelUniqId Format: "provider:modelId"
   */
  function parseModelId(modelUniqId: string) {
    return ModelService.parseModelId(modelUniqId)
  }

  return {
    getProvider,
    getModelBy,
    getSdkProvider,
    getSdkModelBy,
    getModelDisplayNameBy,
    parseModelId
  }
}
