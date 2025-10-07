/**
 * Migration utilities for Cherry Studio architecture
 * Handles data migration from old architecture to new architecture
 */
import { Provider, Model, LegacyModel } from './types'

/**
 * Map old provider type to new provider ID
 * This ensures backward compatibility during migration
 */
export function mapOldTypeToProviderId(type?: string): string {
  if (!type) return 'openai' // Default fallback

  const mapping: Record<string, string> = {
    // Standard providers
    openai: 'openai',
    'openai-response': 'openai-responses',
    anthropic: 'anthropic',
    google: 'google',
    azure: 'azure',
    'openai-compatible': 'openai-compatible',
    openrouter: 'openrouter',
    xai: 'xai',
    deepseek: 'deepseek',
    ollama: 'ollama',
    togetherai: 'togetherai',
    groq: 'groq',
    cohere: 'cohere',
    mistral: 'mistral'

    // Custom providers (format: custom:id)
    // These will be handled separately
  }

  // Handle custom providers
  if (type.startsWith('custom:')) {
    // Custom providers will keep their ID as-is for now
    // They need separate migration logic
    return type.replace('custom:', 'custom-')
  }

  return mapping[type] || 'openai-compatible' // Fallback to compatible
}

/**
 * Generate model unique ID from legacy model and provider
 * @param legacyModel Old model format (only has name field)
 * @param provider Provider configuration
 * @returns Unique model ID in format "provider:modelId"
 */
export function generateModelUniqId(
  legacyModel: LegacyModel | Model | null | undefined,
  provider: Provider | null | undefined
): string | null {
  if (!legacyModel || !provider) return null

  // If it's already a new Model format, use it directly
  if ('provider' in legacyModel && 'id' in legacyModel) {
    return `${legacyModel.provider}:${legacyModel.id}`
  }

  // Legacy model - only has name field
  const modelName = legacyModel.name
  const providerId = mapOldTypeToProviderId(provider.type)

  // The model name in old format is actually the model ID
  return `${providerId}:${modelName}`
}

/**
 * Validate and fix model unique ID
 * Ensures the model ID is in correct format
 */
export function validateAndFixModelId(modelId: string | null | undefined): string | null {
  if (!modelId) return null

  // Already in correct format
  if (modelId.includes(':')) {
    return modelId
  }

  // Legacy format - assume it's an OpenAI model
  console.warn(`Legacy model ID detected: ${modelId}, assuming OpenAI provider`)
  return `openai:${modelId}`
}

/**
 * Extract model name from unique ID
 * @param modelUniqId Format: "provider:modelId"
 * @returns Model ID without provider prefix
 */
export function extractModelId(modelUniqId: string): string {
  if (!modelUniqId.includes(':')) {
    return modelUniqId
  }

  const [, ...modelIdParts] = modelUniqId.split(':')
  return modelIdParts.join(':')
}

/**
 * Extract provider ID from unique ID
 * @param modelUniqId Format: "provider:modelId"
 * @returns Provider ID
 */
export function extractProviderId(modelUniqId: string): string {
  if (!modelUniqId.includes(':')) {
    return 'openai' // Default
  }

  const [providerId] = modelUniqId.split(':')
  return providerId
}

/**
 * Migrate legacy assistant data
 * Converts old provider/model format to new providerId/modelId format
 */
export function migrateAssistantData(assistant: any): {
  providerId: string | null
  modelId: string | null
} {
  // Check if already migrated
  if (assistant.providerId && assistant.modelId) {
    return {
      providerId: assistant.providerId,
      modelId: assistant.modelId
    }
  }

  // Migrate from old format
  const providerId = assistant.provider
    ? mapOldTypeToProviderId(assistant.provider.type)
    : null

  const modelId = assistant.model && assistant.provider
    ? generateModelUniqId(assistant.model, assistant.provider)
    : null

  return { providerId, modelId }
}

/**
 * Migrate legacy dialog data
 * Converts old modelOverride to new modelIdOverride format
 */
export function migrateDialogData(dialog: any, assistantProvider?: Provider): {
  modelIdOverride: string | null
} {
  // Check if already migrated
  if (dialog.modelIdOverride) {
    return { modelIdOverride: dialog.modelIdOverride }
  }

  // Migrate from old format
  if (dialog.modelOverride && assistantProvider) {
    const modelIdOverride = generateModelUniqId(dialog.modelOverride, assistantProvider)
    return { modelIdOverride }
  }

  return { modelIdOverride: null }
}

/**
 * Check if data needs migration
 */
export function needsMigration(assistant: any): boolean {
  // If has old fields but not new fields, needs migration
  return (
    (assistant.provider || assistant.model) &&
    (!assistant.providerId || !assistant.modelId)
  )
}

/**
 * Get default provider ID for fallback
 */
export function getDefaultProviderId(): string {
  return 'openai'
}

/**
 * Get default model ID for fallback
 */
export function getDefaultModelId(): string {
  return 'openai:gpt-4o'
}

/**
 * Batch migrate assistants
 * @param assistants Array of assistant objects
 * @returns Migrated assistants with new fields
 */
export function batchMigrateAssistants(assistants: any[]): any[] {
  return assistants.map(assistant => {
    if (!needsMigration(assistant)) {
      return assistant
    }

    const { providerId, modelId } = migrateAssistantData(assistant)

    return {
      ...assistant,
      providerId: providerId || getDefaultProviderId(),
      modelId: modelId || getDefaultModelId()
    }
  })
}

/**
 * Log migration info for debugging
 */
export function logMigration(entity: string, oldValue: any, newValue: any): void {
  console.log(`[Migration] ${entity}:`, {
    old: oldValue,
    new: newValue
  })
}
