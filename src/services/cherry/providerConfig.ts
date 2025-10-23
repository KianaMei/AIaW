import type { ProviderV2 } from 'src/utils/types'
import { normalizeBaseUrl } from './url'
import { resolveAzureVariant } from './azureVariant'
import { getRotatedApiKey } from './keyRotation'

export type ProviderId =
  | 'openai'
  | 'openai-chat'
  | 'openai-compatible'
  | 'anthropic'
  | 'google'
  | 'xai'
  | 'azure'
  | 'deepseek'
  | 'openrouter'

const STATIC_PROVIDER_MAPPING: Record<string, ProviderId> = {
  gemini: 'google',
  grok: 'xai',
  'openai-response': 'openai',
  openrouter: 'openrouter'
}

export function getAiSdkProviderId(provider: ProviderV2): ProviderId | 'openai-compatible' {
  const byId = STATIC_PROVIDER_MAPPING[provider.id]
  if (byId) return byId
  const byType = provider.type !== 'openai' ? STATIC_PROVIDER_MAPPING[provider.type] : undefined
  if (byType) return byType
  if (provider.type === 'openai') return 'openai'
  if (provider.type === 'openai-response') return 'openai'
  if (provider.type === 'azure') return 'azure'
  if (provider.type === 'anthropic') return 'anthropic'
  if (provider.type === 'google') return 'google'
  if (provider.type === 'xai') return 'xai'
  if (provider.type === 'deepseek') return 'deepseek'
  return 'openai-compatible'
}

export function providerToAiSdkConfig(provider: ProviderV2, modelId?: string): {
  providerId: ProviderId | 'openai-compatible'
  options: any
} {
  const providerId = getAiSdkProviderId(provider)
  const rotatedKey = getRotatedApiKey(provider.id, provider.apiKey, modelId)

  // ⭐ Format apiHost based on provider type (align with Cherry Studio)
  let formattedApiHost = provider.apiHost || undefined
  console.log('[providerToAiSdkConfig] Original apiHost:', provider.apiHost, 'providerId:', providerId)

  if (formattedApiHost) {
    if (providerId === 'google') {
      formattedApiHost = normalizeBaseUrl(formattedApiHost, 'v1beta')
    } else if (providerId === 'azure') {
      // Azure handled separately below
      formattedApiHost = normalizeBaseUrl(formattedApiHost, 'openai')
    } else {
      // ⭐ For all other providers (including openai-compatible), add /v1/ suffix
      formattedApiHost = normalizeBaseUrl(formattedApiHost, 'v1')
    }
  }

  console.log('[providerToAiSdkConfig] Formatted apiHost:', formattedApiHost)

  const baseConfig: any = {
    baseURL: formattedApiHost,
    apiKey: rotatedKey
  }

  const extraOptions: any = {}

  // Determine OpenAI mode (chat vs responses)
  // Priority: explicit settings.mode -> provider.type/id hint -> default(chat)
  if (providerId === 'openai') {
    const settingsMode = (provider.settings as any)?.mode as 'chat' | 'responses' | undefined
    const wantsResponses =
      settingsMode === 'responses' ||
      provider.type === 'openai-response' ||
      provider.id === 'openai-responses'

    extraOptions.mode = wantsResponses ? 'responses' : (settingsMode === 'chat' ? 'chat' : 'chat')
  }

  if (providerId === 'azure') {
    const { mode, useDeploymentBasedUrls } = resolveAzureVariant(provider.settings?.apiVersion)
    extraOptions.mode = mode
    if (useDeploymentBasedUrls) extraOptions.useDeploymentBasedUrls = true
    baseConfig.resourceName = provider.settings?.resourceName
    baseConfig.apiVersion = provider.settings?.apiVersion
  }

  // Debug: Print current provider and baseURL only (no key)
  try {
    console.log('[providerToAiSdkConfig] Debug -> provider:', provider.id, 'sdkProviderId:', providerId, 'mode:', (extraOptions as any).mode || '(default)')
    console.log('[providerToAiSdkConfig] Debug -> baseURL:', formattedApiHost || '(undefined)')
  } catch {}

  return { providerId, options: { ...baseConfig, ...extraOptions } }
}
