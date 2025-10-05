import { computed } from 'vue'
import { useUserPerfsStore } from 'src/stores/user-perfs'
import { Model, Provider } from 'src/utils/types'
import { useObservable } from '@vueuse/rxjs'
import { db } from 'src/utils/db'
import { DexieDBURL, LitellmBaseURL } from 'src/utils/config'
import { wrapLanguageModel, extractReasoningMiddleware } from 'ai'
import { AuthropicCors, FormattingReenabled, MarkdownFormatting } from 'src/utils/middlewares'
import type { LanguageModelV2 } from '@ai-sdk/provider'
import { providerRegistry } from 'src/aiCore/providers/registry'
import { ensureProviderRegisteredSync } from 'src/services/cherry/registry'
import type { ProviderV2 } from 'src/utils/types'
import { getAiSdkProviderId } from 'src/services/cherry/providerConfig'

const FormattingModels = ['o1', 'o3-mini', 'o3-mini-2025-01-31']

function wrapMiddlewares(model: LanguageModelV2) {
  const middlewares = [extractReasoningMiddleware({ tagName: 'think' })]
  FormattingModels.includes(model.modelId) && middlewares.push(FormattingReenabled)
  model.modelId.startsWith('gpt-5') && middlewares.push(MarkdownFormatting)
  model.provider.startsWith('anthropic.') && middlewares.push(AuthropicCors)
  return middlewares.length ? wrapLanguageModel({ model, middleware: middlewares }) : model
}
export function useGetModel() {
  const user = DexieDBURL ? useObservable(db.cloud.currentUser) : null
  const defaultProviderV2 = computed<ProviderV2 | null>(() => {
    if (!user?.value?.isLoggedIn) return null
    let base: string | undefined
    try {
      base = LitellmBaseURL ? new URL(LitellmBaseURL, location.origin).toString() : undefined
    } catch {
      base = undefined
    }
    if (!base) return null
    return {
      id: 'openai-compatible',
      name: 'OpenAI Compatible',
      type: 'openai-compatible',
      apiKey: user.value.data.apiKey,
      apiHost: base,
      isSystem: false,
      enabled: true,
      settings: {}
    }
  })
  const { perfs } = useUserPerfsStore()
  function getProvider(provider?: Provider) {
    return provider || perfs.provider || null
  }
  function getModel(model?: Model) {
    return model || perfs.model
  }
  function toProviderV2(p?: Provider): ProviderV2 | null {
    if (!p) return null
    return {
      id: p.type,
      name: p.type,
      type: p.type,
      apiKey: (p as any).settings?.apiKey,
      apiHost: (p as any).settings?.baseURL,
      isSystem: false,
      enabled: true,
      settings: (p as any).settings || {}
    }
  }
  function getSdkProvider(_provider?: Provider) {
    console.warn('[get-model] getSdkProvider is deprecated under Cherry provider refactor')
    return null
  }
  function getSdkModel(provider?: Provider, model?: Model) {
    const legacyProvider = getProvider(provider)
    const m = getModel(model)
    if (!m) return null
    const p2 = toProviderV2(legacyProvider) || defaultProviderV2.value
    if (!p2) return null
    try {
      ensureProviderRegisteredSync(p2, m.name)
      const pid = getAiSdkProviderId(p2)
      const uniqId = `${pid}:${m.name}`
      // If provider is registered, this returns synchronously
      const languageModel = providerRegistry.languageModel(uniqId as any)
      return languageModel ? wrapMiddlewares(languageModel) : null
    } catch (e) {
      return null
    }
  }
  return { getProvider, getModel, getSdkProvider, getSdkModel }
}
