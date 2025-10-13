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
import { ensureProviderRegistered } from 'src/services/cherry/registry'
import { getAiSdkProviderId, providerToAiSdkConfig } from 'src/services/cherry/providerConfig'
import { ModelService } from 'src/services/ModelService'

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
  function getSdkProvider() {
    console.warn('[get-model-v2] getSdkProvider is deprecated in Cherry provider refactor')
    return null
  }

  /**
   * Get SDK language model
   * @param modelUniqId Model unique ID (format: "provider:modelId")
   * @returns Language model instance ready to use
   */
  async function getSdkModelBy(providerId?: string, modelId?: string) {
    // AIaW 动态架构：首先尝试获取静态模型定义
    const model = getModelBy(providerId, modelId)

    // 如果没有静态模型，直接使用 provider + modelId 动态创建
    // 这是 AIaW 的核心理念：完全动态，不依赖静态配置
    const pid = providerId || perfs.providerId || undefined
    const mid = modelId || perfs.modelId || undefined

    if (!pid || !mid) {
      console.warn('[getSdkModelBy] Missing provider or model ID:', { pid, mid })
      return null
    }

    const provider = getProvider(pid)
    if (!provider) {
      console.warn('[getSdkModelBy] No provider found for:', pid)
      return null
    }

    // 无论是否有静态模型，都使用动态解析
    // 这确保了即使模型不在静态列表中也能工作
    try {
      // Debug: log resolution intent
      try {
        const aiPid = getAiSdkProviderId(provider)
        console.log('[getSdkModelBy] Debug -> resolving model', { pid, mid, aiSdkProviderId: aiPid })
      } catch {}
      await ensureProviderRegistered(provider, mid)
      // Use provider instance ID for registry lookup to avoid collision
      const lm = await globalModelResolver.resolveLanguageModel(
        mid,
        provider.id,  // ← Use instance ID instead of type-based providerId
        providerToAiSdkConfig(provider, mid).options,
        []
      )
      return wrapMiddlewares(lm)
    } catch (e) {
      console.warn('[getSdkModelBy] Failed to resolve model:', { pid, mid, error: e })

      // 如果有默认供应商，尝试使用它作为回退
      if (defaultProvider.value && defaultProvider.value.id !== pid) {
        try {
          console.log('[getSdkModelBy] Trying default provider fallback')
          await ensureProviderRegistered(defaultProvider.value, mid)
          const lm = await globalModelResolver.resolveLanguageModel(
            mid,
            defaultProvider.value.id,  // ← Use instance ID for fallback too
            providerToAiSdkConfig(defaultProvider.value, mid).options,
            []
          )
          return wrapMiddlewares(lm)
        } catch (fallbackError) {
          console.error('[getSdkModelBy] Default provider fallback also failed:', fallbackError)
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
