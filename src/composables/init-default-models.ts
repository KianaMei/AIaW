/**
 * Initialize default models for user preferences
 * Automatically sets the first available provider and model if not configured
 */

import { watch } from 'vue'
import { useUserPerfsStore } from 'src/stores/user-perfs'
import { useProvidersV2Store } from 'src/stores/providers-v2'

export function useInitDefaultModels() {
  const { perfs } = useUserPerfsStore()
  const providersStore = useProvidersV2Store()

  // Watch for enabled providers and initialize defaults if needed
  const stopWatcher = watch(
    () => providersStore.enabledProviders,
    (providers) => {
      if (!providers || providers.length === 0) {
        return
      }

      // Initialize default provider and model if not set
      if (!perfs.providerId || !perfs.modelId) {
        const firstProvider = providers[0]
        if (firstProvider) {
          // Set default provider if not configured
          if (!perfs.providerId) {
            perfs.providerId = firstProvider.id
            console.log('[init-default-models] Set default provider:', firstProvider.id)
          }

          // Set default model if not configured
          if (!perfs.modelId) {
            // Try to get models for this provider
            const models = providersStore.getModelsByProvider(firstProvider.id)
            if (models && models.length > 0) {
              perfs.modelId = models[0].id
              console.log('[init-default-models] Set default model:', models[0].id)
            } else if (firstProvider.models && firstProvider.models.length > 0) {
              // Fallback to provider's model list
              perfs.modelId = firstProvider.models[0]
              console.log('[init-default-models] Set default model from provider list:', firstProvider.models[0])
            }
          }
        }
      }

      // Initialize system provider and model if not set
      if (!perfs.systemProviderId || !perfs.systemModelId) {
        // IMPORTANT: System provider should be independent from current dialog provider
        // Get system provider by ID if already set, or use first available provider
        const systemProvider = perfs.systemProviderId
          ? providersStore.getProviderById(perfs.systemProviderId)
          : providers[0]

        if (systemProvider) {
          // Set system provider if not configured
          if (!perfs.systemProviderId) {
            perfs.systemProviderId = systemProvider.id
            console.log('[init-default-models] Set system provider:', systemProvider.id)
          }

          // Set system model if not configured
          if (!perfs.systemModelId) {
            // Try to get models for the SYSTEM provider (not current dialog provider!)
            const models = providersStore.getModelsByProvider(systemProvider.id)

            if (models && models.length > 0) {
              // Look for a smaller/cheaper model for system tasks
              const systemModel = models.find(m =>
                m.id.includes('mini') ||
                m.id.includes('nano') ||
                m.id.includes('3.5') ||
                m.id.includes('flash') ||
                m.id.includes('haiku')
              ) || models[0]

              perfs.systemModelId = systemModel.id
              console.log('[init-default-models] Set system model:', systemModel.id)
            } else if (systemProvider.models && systemProvider.models.length > 0) {
              // Fallback to provider's model list
              const modelId = systemProvider.models.find(id =>
                id.includes('mini') ||
                id.includes('nano') ||
                id.includes('3.5') ||
                id.includes('flash') ||
                id.includes('haiku')
              ) || systemProvider.models[0]

              perfs.systemModelId = modelId
              console.log('[init-default-models] Set system model from provider list:', modelId)
            }
          }
        }
      }

      // Stop watching after initialization
      if (perfs.providerId && perfs.modelId && perfs.systemProviderId && perfs.systemModelId) {
        console.log('[init-default-models] All models configured, stopping watcher')
        stopWatcher()
      }
    },
    { immediate: true }
  )

  return {
    stopWatcher
  }
}