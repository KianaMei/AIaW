import { SystemProvider } from 'src/utils/types'
import { SYSTEM_MODELS } from './models'
import { SystemProviderId } from './provider-types'

// Official base URLs
export const OfficialBaseURLs = {
  openai: 'https://api.openai.com/v1',
  anthropic: 'https://api.anthropic.com/v1',
  google: 'https://generativelanguage.googleapis.com/v1beta',
  ollama: 'http://localhost:11434/api',
  openrouter: 'https://openrouter.ai/api/v1',
  burncloud: 'https://ai.burncloud.com/v1'
} as const

/**
 * System providers configuration following Cherry Studio architecture
 * Each provider has:
 * - Unique ID (used as namespace for models)
 * - Display name
 * - Provider type (for client factory)
 * - API configuration
 * - Models list
 * - System flag and enabled status
 */
export const SYSTEM_PROVIDERS: Record<SystemProviderId, SystemProvider> = {
  openai: {
    id: 'openai',
    name: 'OpenAI',
    type: 'openai',
    apiHost: OfficialBaseURLs.openai,
    apiKey: '',
    models: SYSTEM_MODELS.openai,
    isSystem: true,
    enabled: false,
    settings: {
      organization: '',
      project: ''
    }
  },

  'openai-responses': {
    id: 'openai-responses',
    name: 'OpenAI Responses',
    type: 'openai-response',
    apiHost: OfficialBaseURLs.openai,
    apiKey: '',
    models: SYSTEM_MODELS.openai,
    isSystem: true,
    enabled: false,
    settings: {
      organization: '',
      project: ''
    }
  },

  anthropic: {
    id: 'anthropic',
    name: 'Anthropic',
    type: 'anthropic',
    apiHost: OfficialBaseURLs.anthropic,
    apiKey: '',
    models: SYSTEM_MODELS.anthropic,
    isSystem: true,
    enabled: false,
    settings: {}
  },

  google: {
    id: 'google',
    name: 'Google',
    type: 'google',
    apiHost: OfficialBaseURLs.google,
    apiKey: '',
    models: SYSTEM_MODELS.google,
    isSystem: true,
    enabled: false,
    settings: {}
  },

  azure: {
    id: 'azure',
    name: 'Azure',
    type: 'azure',
    apiHost: '',
    apiKey: '',
    models: [],
    isSystem: true,
    enabled: false,
    settings: {
      resourceName: '',
      apiVersion: ''
    }
  },

  'openai-compatible': {
    id: 'openai-compatible',
    name: 'OpenAI Compatible',
    type: 'openai-compatible',
    apiHost: '',
    apiKey: '',
    models: [],
    isSystem: true,
    enabled: false,
    settings: {}
  },

  openrouter: {
    id: 'openrouter',
    name: 'OpenRouter',
    type: 'openrouter',
    apiHost: OfficialBaseURLs.openrouter,
    apiKey: '',
    models: [],
    isSystem: true,
    enabled: false,
    settings: {}
  },

  xai: {
    id: 'xai',
    name: 'xAI',
    type: 'xai',
    apiHost: '',
    apiKey: '',
    models: SYSTEM_MODELS.xai,
    isSystem: true,
    enabled: false,
    settings: {}
  },

  deepseek: {
    id: 'deepseek',
    name: 'DeepSeek',
    type: 'deepseek',
    apiHost: '',
    apiKey: '',
    models: SYSTEM_MODELS.deepseek,
    isSystem: true,
    enabled: false,
    settings: {}
  },

  ollama: {
    id: 'ollama',
    name: 'Ollama',
    type: 'ollama',
    apiHost: OfficialBaseURLs.ollama,
    apiKey: '',
    models: [],
    isSystem: true,
    enabled: false,
    settings: {}
  },

  burncloud: {
    id: 'burncloud',
    name: 'BurnCloud',
    type: 'openai-compatible',
    apiHost: OfficialBaseURLs.burncloud,
    apiKey: '',
    models: [],
    isSystem: true,
    enabled: false,
    settings: {}
  },

  togetherai: {
    id: 'togetherai',
    name: 'Together.ai',
    type: 'togetherai',
    apiHost: '',
    apiKey: '',
    models: [],
    isSystem: true,
    enabled: false,
    settings: {}
  },

  groq: {
    id: 'groq',
    name: 'Groq',
    type: 'groq',
    apiHost: '',
    apiKey: '',
    models: [],
    isSystem: true,
    enabled: false,
    settings: {}
  },

  cohere: {
    id: 'cohere',
    name: 'Cohere',
    type: 'cohere',
    apiHost: '',
    apiKey: '',
    models: [],
    isSystem: true,
    enabled: false,
    settings: {}
  },

  mistral: {
    id: 'mistral',
    name: 'Mistral',
    type: 'mistral',
    apiHost: '',
    apiKey: '',
    models: [],
    isSystem: true,
    enabled: false,
    settings: {}
  }
}

// Helper functions
export const getSystemProviderById = (id: string): SystemProvider | undefined => {
  return SYSTEM_PROVIDERS[id as SystemProviderId]
}

export const getAllSystemProviders = (): SystemProvider[] => {
  return Object.values(SYSTEM_PROVIDERS)
}

export const getEnabledSystemProviders = (): SystemProvider[] => {
  return Object.values(SYSTEM_PROVIDERS).filter(p => p.enabled)
}
