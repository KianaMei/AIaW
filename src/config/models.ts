import { Model } from 'src/utils/types'

// Input types definitions (migrated from values.ts)
export const InputTypes: Record<string, { user: string[]; assistant: string[]; tool: string[] }> = {
  textOnly: { user: [], assistant: [], tool: [] },
  commonVision: { user: ['image/*'], assistant: [], tool: [] },
  claudeVision: { user: ['image/*'], assistant: [], tool: ['image/*'] },
  claudePdf: { user: ['image/*', 'application/pdf'], assistant: [], tool: ['image/*'] },
  audioPreview: { user: ['audio/*'], assistant: [], tool: [] },
  default: { user: ['image/*'], assistant: [], tool: [] },
  gemini2: { user: ['image/*', 'audio/*', 'application/pdf'], assistant: [], tool: [] },
  geminiImage: { user: ['image/*'], assistant: ['image/*'], tool: [] }
}

// System models organized by provider
export const SYSTEM_MODELS = {
  openai: [
    { id: 'o4-mini', provider: 'openai', name: 'o4 Mini', group: 'o4', inputTypes: InputTypes.commonVision },
    { id: 'o4-mini-2025-04-16', provider: 'openai', name: 'o4 Mini (2025-04-16)', group: 'o4', inputTypes: InputTypes.commonVision },
    { id: 'o3', provider: 'openai', name: 'o3', group: 'o3', inputTypes: InputTypes.commonVision },
    { id: 'o3-2025-04-16', provider: 'openai', name: 'o3 (2025-04-16)', group: 'o3', inputTypes: InputTypes.commonVision },
    { id: 'o3-mini', provider: 'openai', name: 'o3 Mini', group: 'o3', inputTypes: InputTypes.textOnly },
    { id: 'o3-mini-2025-01-31', provider: 'openai', name: 'o3 Mini (2025-01-31)', group: 'o3', inputTypes: InputTypes.textOnly },
    { id: 'o1-mini', provider: 'openai', name: 'o1 Mini', group: 'o1', inputTypes: InputTypes.textOnly },
    { id: 'o1-mini-2024-09-12', provider: 'openai', name: 'o1 Mini (2024-09-12)', group: 'o1', inputTypes: InputTypes.textOnly },
    { id: 'o1', provider: 'openai', name: 'o1', group: 'o1', inputTypes: InputTypes.commonVision },
    { id: 'o1-preview', provider: 'openai', name: 'o1 Preview', group: 'o1', inputTypes: InputTypes.textOnly },
    { id: 'o1-preview-2024-09-12', provider: 'openai', name: 'o1 Preview (2024-09-12)', group: 'o1', inputTypes: InputTypes.textOnly },
    { id: 'gpt-5', provider: 'openai', name: 'GPT-5', group: 'gpt-5', inputTypes: InputTypes.commonVision },
    { id: 'gpt-5-2025-08-07', provider: 'openai', name: 'GPT-5 (2025-08-07)', group: 'gpt-5', inputTypes: InputTypes.commonVision },
    { id: 'gpt-5-mini', provider: 'openai', name: 'GPT-5 Mini', group: 'gpt-5', inputTypes: InputTypes.commonVision },
    { id: 'gpt-5-mini-2025-08-07', provider: 'openai', name: 'GPT-5 Mini (2025-08-07)', group: 'gpt-5', inputTypes: InputTypes.commonVision },
    { id: 'gpt-5-nano', provider: 'openai', name: 'GPT-5 Nano', group: 'gpt-5', inputTypes: InputTypes.commonVision },
    { id: 'gpt-5-nano-2025-08-07', provider: 'openai', name: 'GPT-5 Nano (2025-08-07)', group: 'gpt-5', inputTypes: InputTypes.commonVision },
    { id: 'gpt-5-chat-latest', provider: 'openai', name: 'GPT-5 Chat Latest', group: 'gpt-5', inputTypes: InputTypes.commonVision },
    { id: 'gpt-4.1', provider: 'openai', name: 'GPT-4.1', group: 'gpt-4', inputTypes: InputTypes.commonVision },
    { id: 'gpt-4.1-2025-04-14', provider: 'openai', name: 'GPT-4.1 (2025-04-14)', group: 'gpt-4', inputTypes: InputTypes.commonVision },
    { id: 'gpt-4.1-mini', provider: 'openai', name: 'GPT-4.1 Mini', group: 'gpt-4', inputTypes: InputTypes.commonVision },
    { id: 'gpt-4.1-mini-2025-04-14', provider: 'openai', name: 'GPT-4.1 Mini (2025-04-14)', group: 'gpt-4', inputTypes: InputTypes.commonVision },
    { id: 'gpt-4.1-nano', provider: 'openai', name: 'GPT-4.1 Nano', group: 'gpt-4', inputTypes: InputTypes.commonVision },
    { id: 'gpt-4.1-nano-2025-04-14', provider: 'openai', name: 'GPT-4.1 Nano (2025-04-14)', group: 'gpt-4', inputTypes: InputTypes.commonVision },
    { id: 'gpt-4o', provider: 'openai', name: 'GPT-4o', group: 'gpt-4', inputTypes: InputTypes.commonVision },
    { id: 'gpt-4o-2024-11-20', provider: 'openai', name: 'GPT-4o (2024-11-20)', group: 'gpt-4', inputTypes: InputTypes.commonVision },
    { id: 'gpt-4o-2024-08-06', provider: 'openai', name: 'GPT-4o (2024-08-06)', group: 'gpt-4', inputTypes: InputTypes.commonVision },
    { id: 'gpt-4o-2024-05-13', provider: 'openai', name: 'GPT-4o (2024-05-13)', group: 'gpt-4', inputTypes: InputTypes.commonVision },
    { id: 'chatgpt-4o-latest', provider: 'openai', name: 'ChatGPT-4o Latest', group: 'gpt-4', inputTypes: InputTypes.commonVision },
    { id: 'gpt-4o-audio-preview', provider: 'openai', name: 'GPT-4o Audio Preview', group: 'gpt-4', inputTypes: InputTypes.audioPreview },
    { id: 'gpt-4o-audio-preview-2024-10-01', provider: 'openai', name: 'GPT-4o Audio Preview (2024-10-01)', group: 'gpt-4', inputTypes: InputTypes.audioPreview },
    { id: 'gpt-4-turbo', provider: 'openai', name: 'GPT-4 Turbo', group: 'gpt-4', inputTypes: InputTypes.commonVision },
    { id: 'gpt-4-turbo-2024-04-09', provider: 'openai', name: 'GPT-4 Turbo (2024-04-09)', group: 'gpt-4', inputTypes: InputTypes.commonVision },
    { id: 'gpt-4o-mini', provider: 'openai', name: 'GPT-4o Mini', group: 'gpt-4', inputTypes: InputTypes.commonVision },
    { id: 'gpt-4o-mini-2024-07-18', provider: 'openai', name: 'GPT-4o Mini (2024-07-18)', group: 'gpt-4', inputTypes: InputTypes.commonVision },
    { id: 'gpt-3.5-turbo', provider: 'openai', name: 'GPT-3.5 Turbo', group: 'gpt-3', inputTypes: InputTypes.textOnly }
  ] as Model[],

  anthropic: [
    { id: 'claude-sonnet-4-20250514', provider: 'anthropic', name: 'Claude Sonnet 4', group: 'claude-4', inputTypes: InputTypes.claudePdf },
    { id: 'claude-opus-4-1-20250805', provider: 'anthropic', name: 'Claude Opus 4.1', group: 'claude-4', inputTypes: InputTypes.claudePdf },
    { id: 'claude-opus-4-20250514', provider: 'anthropic', name: 'Claude Opus 4', group: 'claude-4', inputTypes: InputTypes.claudePdf },
    { id: 'claude-3-7-sonnet-20250219', provider: 'anthropic', name: 'Claude 3.7 Sonnet', group: 'claude-3', inputTypes: InputTypes.claudePdf },
    { id: 'claude-3-5-sonnet-20241022', provider: 'anthropic', name: 'Claude 3.5 Sonnet (20241022)', group: 'claude-3', inputTypes: InputTypes.claudePdf },
    { id: 'claude-3-5-sonnet-20240620', provider: 'anthropic', name: 'Claude 3.5 Sonnet (20240620)', group: 'claude-3', inputTypes: InputTypes.claudeVision },
    { id: 'claude-3-5-haiku-20241022', provider: 'anthropic', name: 'Claude 3.5 Haiku', group: 'claude-3', inputTypes: InputTypes.textOnly },
    { id: 'claude-3-opus-20240229', provider: 'anthropic', name: 'Claude 3 Opus', group: 'claude-3', inputTypes: InputTypes.claudeVision },
    { id: 'claude-3-sonnet-20240229', provider: 'anthropic', name: 'Claude 3 Sonnet', group: 'claude-3', inputTypes: InputTypes.claudeVision },
    { id: 'claude-3-haiku-20240307', provider: 'anthropic', name: 'Claude 3 Haiku', group: 'claude-3', inputTypes: InputTypes.claudeVision }
  ] as Model[],

  google: [
    { id: 'gemini-2.5-pro', provider: 'google', name: 'Gemini 2.5 Pro', group: 'gemini-2', inputTypes: InputTypes.gemini2 },
    { id: 'gemini-2.5-pro-preview-06-05', provider: 'google', name: 'Gemini 2.5 Pro Preview (06-05)', group: 'gemini-2', inputTypes: InputTypes.gemini2 },
    { id: 'gemini-2.5-pro-preview-05-06', provider: 'google', name: 'Gemini 2.5 Pro Preview (05-06)', group: 'gemini-2', inputTypes: InputTypes.gemini2 },
    { id: 'gemini-2.5-pro-preview-03-25', provider: 'google', name: 'Gemini 2.5 Pro Preview (03-25)', group: 'gemini-2', inputTypes: InputTypes.gemini2 },
    { id: 'gemini-2.5-flash', provider: 'google', name: 'Gemini 2.5 Flash', group: 'gemini-2', inputTypes: InputTypes.gemini2 },
    { id: 'gemini-2.5-flash-image-preview', provider: 'google', name: 'Gemini 2.5 Flash Image Preview', group: 'gemini-2', inputTypes: InputTypes.geminiImage },
    { id: 'gemini-2.5-flash-preview-05-20', provider: 'google', name: 'Gemini 2.5 Flash Preview (05-20)', group: 'gemini-2', inputTypes: InputTypes.gemini2 },
    { id: 'gemini-2.5-flash-preview-04-17', provider: 'google', name: 'Gemini 2.5 Flash Preview (04-17)', group: 'gemini-2', inputTypes: InputTypes.gemini2 },
    { id: 'gemini-2.5-flash-lite-preview-06-17', provider: 'google', name: 'Gemini 2.5 Flash Lite Preview', group: 'gemini-2', inputTypes: InputTypes.gemini2 },
    { id: 'gemini-2.0-flash', provider: 'google', name: 'Gemini 2.0 Flash', group: 'gemini-2', inputTypes: InputTypes.gemini2 },
    { id: 'gemini-2.0-flash-exp', provider: 'google', name: 'Gemini 2.0 Flash Exp', group: 'gemini-2', inputTypes: InputTypes.gemini2 },
    { id: 'gemini-2.0-flash-thinking-exp', provider: 'google', name: 'Gemini 2.0 Flash Thinking', group: 'gemini-2', inputTypes: InputTypes.commonVision },
    { id: 'gemini-1.5-pro', provider: 'google', name: 'Gemini 1.5 Pro', group: 'gemini-1', inputTypes: InputTypes.commonVision },
    { id: 'gemini-1.5-flash', provider: 'google', name: 'Gemini 1.5 Flash', group: 'gemini-1', inputTypes: InputTypes.commonVision }
  ] as Model[],

  deepseek: [
    { id: 'deepseek-chat', provider: 'deepseek', name: 'DeepSeek Chat', group: 'deepseek', inputTypes: InputTypes.textOnly },
    { id: 'deepseek-reasoner', provider: 'deepseek', name: 'DeepSeek Reasoner', group: 'deepseek', inputTypes: InputTypes.textOnly }
  ] as Model[],

  xai: [
    { id: 'grok-3', provider: 'xai', name: 'Grok 3', group: 'grok', inputTypes: InputTypes.textOnly },
    { id: 'grok-3-beta', provider: 'xai', name: 'Grok 3 Beta', group: 'grok', inputTypes: InputTypes.textOnly },
    { id: 'grok-3-fast', provider: 'xai', name: 'Grok 3 Fast', group: 'grok', inputTypes: InputTypes.textOnly },
    { id: 'grok-3-fast-beta', provider: 'xai', name: 'Grok 3 Fast Beta', group: 'grok', inputTypes: InputTypes.textOnly },
    { id: 'grok-3-mini', provider: 'xai', name: 'Grok 3 Mini', group: 'grok', inputTypes: InputTypes.textOnly },
    { id: 'grok-3-mini-beta', provider: 'xai', name: 'Grok 3 Mini Beta', group: 'grok', inputTypes: InputTypes.textOnly },
    { id: 'grok-3-mini-fast', provider: 'xai', name: 'Grok 3 Mini Fast', group: 'grok', inputTypes: InputTypes.textOnly },
    { id: 'grok-3-mini-fast-beta', provider: 'xai', name: 'Grok 3 Mini Fast Beta', group: 'grok', inputTypes: InputTypes.textOnly },
    { id: 'grok-4', provider: 'xai', name: 'Grok 4', group: 'grok', inputTypes: InputTypes.commonVision }
  ] as Model[]
}

// Get all models from all providers
export const getAllModels = (): Model[] => {
  return Object.values(SYSTEM_MODELS).flat()
}

// Get models for a specific provider
export const getModelsByProvider = (providerId: string): Model[] => {
  return SYSTEM_MODELS[providerId] || []
}
