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

  const baseConfig: any = {
    baseURL: provider.apiHost || undefined,
    apiKey: rotatedKey
  }

  const extraOptions: any = {}

  if (providerId === 'openai') {
    // default to chat mode
    extraOptions.mode = 'chat'
  }

  if (providerId === 'azure') {
    const { mode, useDeploymentBasedUrls } = resolveAzureVariant(provider.settings?.apiVersion)
    extraOptions.mode = mode
    if (useDeploymentBasedUrls) extraOptions.useDeploymentBasedUrls = true
    baseConfig.resourceName = provider.settings?.resourceName
    baseConfig.apiVersion = provider.settings?.apiVersion
    // Azure service usually places openai at /openai
    baseConfig.baseURL = baseConfig.baseURL ? normalizeBaseUrl(baseConfig.baseURL, 'openai') : undefined
  }

  if (providerId === 'google') {
    baseConfig.baseURL = baseConfig.baseURL ? normalizeBaseUrl(baseConfig.baseURL, 'v1beta') : undefined
  }

  return { providerId, options: { ...baseConfig, ...extraOptions } }
}

