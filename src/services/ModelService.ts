import { Model, ProviderV2 } from 'src/utils/types'
import { getAllModels } from 'src/config/models'

/**
 * Model Service - Cherry Studio Architecture
 * Handles model unique identification and management
 */
export class ModelService {
  private static modelCache: Map<string, Model> = new Map()

  /**
   * Generate unique model identifier
   * Format: "provider:modelId"
   * Example: "openai:gpt-4o", "anthropic:claude-3-5-sonnet-20241022"
   */
  static getModelUniqId(model: Model): string {
    return `${model.provider}:${model.id}`
  }

  /**
   * Parse model unique ID into components
   * @param modelUniqId Format: "provider:modelId"
   * @returns { providerId, modelId } or null if invalid
   */
  static parseModelId(modelUniqId: string): { providerId: string; modelId: string } | null {
    if (!modelUniqId || !modelUniqId.includes(':')) {
      return null
    }

    const [providerId, ...modelIdParts] = modelUniqId.split(':')
    const modelId = modelIdParts.join(':') // Handle cases where modelId contains ":"

    if (!providerId || !modelId) {
      return null
    }

    return { providerId, modelId }
  }

  /**
   * Get model by unique ID
   * @param modelUniqId Format: "provider:modelId"
   * @returns Model object or null
   */
  static getModelByUniqId(modelUniqId: string, provider?: ProviderV2): Model | null {
    // Check cache first
    if (this.modelCache.has(modelUniqId)) {
      return this.modelCache.get(modelUniqId)!
    }

    const parsed = this.parseModelId(modelUniqId)
    if (!parsed) {
      return null
    }

    const { providerId, modelId } = parsed

    // If provider is provided, look in its models
    if (provider && provider.id === providerId) {
      const providerModels = this.getModelsByProvider(providerId, provider)
      const model = providerModels.find(m => m.id === modelId)
      if (model) {
        this.modelCache.set(modelUniqId, model)
        return model
      }
    }

    // Fallback: try static models (will be removed later)
    const allModels = getAllModels()
    const model = allModels.find(m => m.provider === providerId && m.id === modelId)

    if (model) {
      this.modelCache.set(modelUniqId, model)
    }

    return model || null
  }

  /**
   * Get models for a specific provider
   * Cherry Studio alignment: ONLY return user-selected models
   *
   * @param providerId Provider ID
   * @param provider Optional provider object to check for embedded models
   * @returns Array of models (empty if user hasn't selected any)
   */
  static getModelsByProvider(providerId: string, provider?: ProviderV2): Model[] {
    // Return empty if provider has no models configured
    if (!provider || !('models' in provider) || !Array.isArray(provider.models) || provider.models.length === 0) {
      console.log(`[ModelService] getModelsByProvider(${providerId}): No models configured, returning empty`)
      return []
    }

    const allModels = getAllModels()
    const embeddedModels: Model[] = []

    for (const item of provider.models) {
      // Support both string[] (legacy) and Model[] (v9+) formats
      if (typeof item === 'string') {
        // Model ID as string - look up in static models
        const found = allModels.find(m => m.id === item)
        if (found) {
          // Override provider to match current provider
          embeddedModels.push({
            ...found,
            provider: providerId
          })
        } else {
          // Create dynamic model for custom IDs not in static config
          console.warn(`[ModelService] Model ID "${item}" not found in static config, creating dynamic model`)
          embeddedModels.push({
            id: item,
            provider: providerId,
            name: item,
            inputTypes: {
              user: ['text'],
              assistant: ['text'],
              tool: ['text']
            }
          })
        }
      } else {
        // Already a full Model object - ensure provider matches
        embeddedModels.push({
          ...item,
          provider: providerId
        })
      }
    }

    console.log(`[ModelService] getModelsByProvider(${providerId}): Returning ${embeddedModels.length} user-selected models`)
    return embeddedModels
  }

  /**
   * Get model display name with provider
   * Format: "Model Name | Provider Name"
   * Example: "GPT-4o | OpenAI"
   */
  static getModelDisplayName(model: Model, providerName?: string): string {
    if (providerName) {
      return `${model.name} | ${providerName}`
    }
    return model.name
  }

  /**
   * Validate model ID format and existence
   * @param modelUniqId Format: "provider:modelId"
   * @returns Validation result with error message if invalid
   */
  static async validateModelId(
    modelUniqId: string,
    provider?: ProviderV2
  ): Promise<{
    valid: boolean
    error?: { message: string }
  }> {
    // Validate format
    if (!modelUniqId.includes(':')) {
      return {
        valid: false,
        error: {
          message: "Expected format: 'provider:modelId' (e.g., 'openai:gpt-4o')"
        }
      }
    }

    const parsed = this.parseModelId(modelUniqId)
    if (!parsed) {
      return {
        valid: false,
        error: {
          message: 'Invalid model ID format'
        }
      }
    }

    const { providerId, modelId } = parsed

    // Validate provider if provided
    if (provider && provider.id !== providerId) {
      return {
        valid: false,
        error: {
          message: `Provider mismatch: expected '${provider.id}', got '${providerId}'`
        }
      }
    }

    // Validate model exists
    const model = this.getModelByUniqId(modelUniqId)
    if (!model) {
      return {
        valid: false,
        error: {
          message: `Model '${modelId}' not found in provider '${providerId}'`
        }
      }
    }

    return { valid: true }
  }

  /**
   * Get all available models grouped by provider
   */
  static getGroupedModels(): Record<string, Model[]> {
    const allModels = getAllModels()
    const grouped: Record<string, Model[]> = {}

    for (const model of allModels) {
      if (!grouped[model.provider]) {
        grouped[model.provider] = []
      }
      grouped[model.provider].push(model)
    }

    return grouped
  }

  /**
   * Search models by name or ID
   * @param query Search query
   * @returns Matching models
   */
  static searchModels(query: string): Model[] {
    if (!query) {
      return getAllModels()
    }

    const lowerQuery = query.toLowerCase()
    const allModels = getAllModels()

    return allModels.filter(
      m =>
        m.name.toLowerCase().includes(lowerQuery) ||
        m.id.toLowerCase().includes(lowerQuery) ||
        m.provider.toLowerCase().includes(lowerQuery) ||
        m.group?.toLowerCase().includes(lowerQuery)
    )
  }

  /**
   * Clear model cache (useful for testing or reloading)
   */
  static clearCache(): void {
    this.modelCache.clear()
  }
}
