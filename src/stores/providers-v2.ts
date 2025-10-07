/**
 * ProvidersStore V2 - Cherry Studio Architecture
 * Clean V2 store with NO legacy conversion code
 */
import { defineStore } from 'pinia'
import { computed, Ref, ref, watch } from 'vue'
import { useLiveQuery } from 'src/composables/live-query'
import { db } from 'src/utils/db'
import { ProviderV2, SystemProvider, CustomProviderV2, Model } from 'src/utils/types'
import { ProviderService } from 'src/services/ProviderService'
import { ModelService } from 'src/services/ModelService'
import { getAllSystemProviders } from 'src/config/providers'
import { getAllModels } from 'src/config/models'
import { genId, removeDuplicates } from 'src/utils/functions'
import { useI18n } from 'vue-i18n'

export const useProvidersV2Store = defineStore('providers-v2', () => {
  const { t } = useI18n()

  // ====================
  // State - Direct V2 reads, NO conversion
  // ====================

  /**
   * System providers (read-only configuration)
   */
  const systemProvidersRevision = ref(0)
  const systemProviders = ref<SystemProvider[]>(getAllSystemProviders())

  watch(systemProvidersRevision, () => {
    systemProviders.value = getAllSystemProviders()
  })

  /**
   * Custom providers - Direct V2 format from DB
   * After DB migration v8, these are ALREADY in V2 format
   */
  const customProviders: Ref<CustomProviderV2[]> = useLiveQuery(
    () => db.providers.toArray(),
    { initialValue: [] }
  )

  // ====================
  // Computed Properties
  // ====================

  /**
   * All providers (system + custom)
   */
  const allProviders = computed<ProviderV2[]>(() => {
    return [...systemProviders.value, ...customProviders.value]
  })

  /**
   * Enabled providers only
   */
  const enabledProviders = computed<ProviderV2[]>(() => {
    return allProviders.value.filter(p => p.enabled !== false)
  })

  /**
   * All available models from all providers
   */
  const allModels = computed<Model[]>(() => {
    return getAllModels()
  })

  /**
   * Models from enabled providers only
   */
  const availableModels = computed<Model[]>(() => {
    const enabledProviderIds = new Set(enabledProviders.value.map(p => p.id))
    return allModels.value.filter(m => enabledProviderIds.has(m.provider))
  })

  /**
   * Model options for autocomplete (unique model IDs)
   */
  const modelOptions = computed<string[]>(() => {
    const systemModelIds = allModels.value.map(m => ModelService.getModelUniqId(m))
    const customModelIds: string[] = []

    for (const provider of customProviders.value) {
      if (provider.models && Array.isArray(provider.models) && provider.models.length > 0) {
        // models is string[] of model IDs
        customModelIds.push(...provider.models)
      }
    }

    return removeDuplicates([...systemModelIds, ...customModelIds])
  })

  /**
   * Models grouped by provider
   */
  const modelsByProvider = computed<Record<string, Model[]>>(() => {
    return ModelService.getGroupedModels()
  })

  // ====================
  // Provider Methods (Clean V2 API)
  // ====================

  /**
   * Get provider by ID
   */
  function getProviderById(id: string): ProviderV2 | undefined {
    return allProviders.value.find(p => p.id === id)
  }

  /**
   * Get provider name
   */
  function getProviderName(id: string): string {
    return getProviderById(id)?.name || id
  }

  /**
   * Add custom provider - Clean V2 API
   */
  async function addCustomProvider(props: Partial<Omit<CustomProviderV2, 'isSystem'>> = {}): Promise<string> {
    const newProvider: Omit<CustomProviderV2, 'isSystem'> = {
      id: props.id || genId(),
      name: props.name || t('stores.providers.newProvider'),
      type: props.type || 'openai-compatible',
      apiHost: props.apiHost || '',
      apiKey: props.apiKey || '',
      models: props.models || [],
      enabled: props.enabled !== false,
      settings: props.settings || {},
      avatar: props.avatar || {
        type: 'icon',
        icon: 'sym_o_dashboard_customize',
        hue: Math.floor(Math.random() * 360)
      }
    }

    return await ProviderService.createCustomProvider(newProvider)
  }

  /**
   * Update custom provider - Clean V2 API
   */
  async function updateCustomProvider(id: string, updates: Partial<CustomProviderV2>): Promise<void> {
    await ProviderService.updateCustomProvider(id, updates)
  }

  /**
   * Delete custom provider - Clean V2 API
   */
  async function deleteCustomProvider(id: string): Promise<void> {
    await ProviderService.deleteCustomProvider(id)
  }

  function updateSystemProvider(id: string, updates: Partial<SystemProvider>): void {
    ProviderService.updateSystemProvider(id, updates)
    systemProvidersRevision.value += 1
  }

  /**
   * Toggle provider enabled state
   */
  async function toggleProvider(id: string): Promise<void> {
    const provider = getProviderById(id)
    if (provider && !provider.isSystem) {
      await updateCustomProvider(id, { enabled: !provider.enabled })
    }
  }

  // ====================
  // Model Methods
  // ====================

  /**
   * Get model by unique ID
   * @param modelUniqId Format: "provider:modelId"
   */
  function getModelByUniqId(modelUniqId: string): Model | null {
    return ModelService.getModelByUniqId(modelUniqId)
  }

  /**
   * Get model display name
   * Format: "Model Name | Provider Name"
   */
  function getModelDisplayName(modelUniqId: string): string {
    const model = getModelByUniqId(modelUniqId)
    if (!model) return modelUniqId

    const providerName = getProviderName(model.provider)
    return ModelService.getModelDisplayName(model, providerName)
  }

  /**
   * Get models for a specific provider
   */
  function getModelsByProvider(providerId: string): Model[] {
    return ModelService.getModelsByProvider(providerId)
  }

  /**
   * Search models
   */
  function searchModels(query: string): Model[] {
    return ModelService.searchModels(query)
  }

  /**
   * Fetch models from provider API (for dynamic model listing)
   * @returns Array of model IDs with fallback to static models
   */
  async function fetchProviderModels(providerId: string): Promise<{
    models: string[]
    source: 'remote' | 'static' | 'cached'
    error?: string
  }> {
    const provider = getProviderById(providerId)
    if (!provider) {
      return { models: [], source: 'static', error: 'Provider not found' }
    }

    try {
      const remote = await ProviderService.listModels(provider)
      if (remote && remote.length) {
        return { models: remote, source: 'remote' }
      }
    } catch (e: any) {
      console.warn('[providers-v2] Remote model listing failed:', e)

      // Fallback to static models
      const models = getModelsByProvider(providerId)
      const staticModels = models.map(m => m.id)

      return {
        models: staticModels,
        source: 'static',
        error: e?.message || String(e)
      }
    }

    // No remote models, use static
    const models = getModelsByProvider(providerId)
    return { models: models.map(m => m.id), source: 'static' }
  }

  // ====================
  // Return - Clean V2 API only
  // ====================

  return {
    // State
    systemProviders,
    customProviders,
    allProviders,
    enabledProviders,
    allModels,
    availableModels,
    modelOptions,
    modelsByProvider,

    // Provider methods (Clean V2 API)
    getProviderById,
    getProviderName,
    addCustomProvider,
    updateCustomProvider,
    deleteCustomProvider,
    updateSystemProvider,
    toggleProvider,

    // Model methods
    getModelByUniqId,
    getModelDisplayName,
    getModelsByProvider,
    searchModels,
    fetchProviderModels
  }
})
