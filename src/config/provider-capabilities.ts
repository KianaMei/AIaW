import { ProviderV2 } from 'src/utils/types'

// 基于 Cherry 的能力判定思路，使用映射表集中维护

// OpenAI Chat Completions API: 不支持 message.content 为数组的厂商
const NOT_SUPPORT_ARRAY_CONTENT_PROVIDER_IDS = new Set<string>([
  'deepseek',
  'baichuan',
  'minimax',
  'xirang',
  'poe'
])

// OpenAI API: 不支持 developer role 的厂商
const NOT_SUPPORT_DEVELOPER_ROLE_PROVIDER_IDS = new Set<string>([
  'poe',
  'qiniu'
])

// OpenAI API: 不支持 service_tier 的厂商
const NOT_SUPPORT_SERVICE_TIER_PROVIDER_IDS = new Set<string>([
  'github',
  'copilot'
])

// Gemini 系：支持 URL Context / 原生 Web 搜索的类型或ID
const SUPPORT_URL_CONTEXT_PROVIDER_TYPES = new Set<string>(['gemini', 'vertexai'])
const SUPPORT_NATIVE_WEB_SEARCH_PROVIDER_IDS = new Set<string>(['gemini', 'vertexai'])

export function isSupportArrayContent(provider: ProviderV2): boolean {
  return !NOT_SUPPORT_ARRAY_CONTENT_PROVIDER_IDS.has(provider.id)
}

export function isSupportDeveloperRole(provider: ProviderV2): boolean {
  return !NOT_SUPPORT_DEVELOPER_ROLE_PROVIDER_IDS.has(provider.id)
}

export function isSupportServiceTier(provider: ProviderV2): boolean {
  return !NOT_SUPPORT_SERVICE_TIER_PROVIDER_IDS.has(provider.id)
}

export function isSupportVision(provider: ProviderV2): boolean {
  // 简化：常见视觉多模态厂商/类型
  return (
    provider.type === 'openai' ||
    provider.type === 'openai-compatible' ||
    provider.type === 'anthropic' ||
    provider.type === 'google'
  )
}

export function isSupportUrlContext(provider: ProviderV2): boolean {
  return SUPPORT_URL_CONTEXT_PROVIDER_TYPES.has(provider.type)
}

export function isGeminiNativeWebSearchProvider(provider: ProviderV2): boolean {
  return SUPPORT_NATIVE_WEB_SEARCH_PROVIDER_IDS.has(provider.id)
}
