<template>
  <q-btn
    flat
    no-caps
    dense
    class="select-model-btn"
  >
    <div class="row items-center gap-2 no-wrap">
      <!-- Model Icon -->
      <q-icon
        name="sym_o_neurology"
        size="20px"
      />

      <!-- Model Name | Provider Name -->
      <span class="model-text">
        {{ modelDisplayName }}
      </span>

      <!-- Dropdown Icon -->
      <q-icon
        name="sym_o_expand_more"
        size="18px"
      />
    </div>

    <!-- Model Selection Menu (Dropdown) -->
    <q-menu
      fit
      :offset="[0, 8]"
      max-height="70vh"
      style="min-width: 400px; max-width: 500px"
    >
      <q-card flat>
        <q-card-section class="q-pb-sm">
          <!-- Search Bar -->
          <q-input
            v-model="searchText"
            :placeholder="$t('selectModel.search')"
            outlined
            dense
            clearable
            autofocus
          >
            <template v-slot:prepend>
              <q-icon name="sym_o_search" />
            </template>
          </q-input>
        </q-card-section>

        <q-separator />

        <q-card-section class="q-pt-sm q-pb-sm" style="max-height: 50vh; overflow-y: auto">
          <!-- Pinned Models (if any) -->
          <div v-if="pinnedModels.length > 0 && !searchText">
            <div class="text-caption text-weight-medium q-mb-sm text-grey-7">
              {{ $t('selectModel.pinned') }}
            </div>
            <q-list dense>
              <q-item
                v-for="item in pinnedModels"
                :key="`pinned-${item.uniqId}`"
                clickable
                v-ripple
                v-close-popup
                :active="item.uniqId === currentModelUniqId"
                active-class="bg-primary-1"
                @click="selectModel(item.providerId, item.modelId)"
              >
                <q-item-section avatar>
                  <q-avatar size="24px">
                    <q-icon name="sym_o_neurology" />
                  </q-avatar>
                </q-item-section>
                <q-item-section>
                  <q-item-label>{{ item.modelName }}</q-item-label>
                  <q-item-label caption>{{ item.providerName }}</q-item-label>
                </q-item-section>
              </q-item>
            </q-list>
            <q-separator class="q-my-md" />
          </div>

          <!-- Models by Provider -->
          <div v-for="(group, groupIndex) in filteredModelGroups" :key="`group-${group.providerId}`">
            <div class="text-caption text-weight-medium q-mb-sm q-mt-sm text-grey-7">
              {{ group.providerName }}
            </div>
            <q-list dense>
              <q-item
                v-for="model in group.models"
                :key="`model-${model.uniqId}`"
                clickable
                v-ripple
                v-close-popup
                :active="model.uniqId === currentModelUniqId"
                active-class="bg-primary-1"
                @click="selectModel(group.providerId, model.id)"
              >
                <q-item-section avatar>
                  <q-avatar size="24px">
                    <q-icon name="sym_o_neurology" />
                  </q-avatar>
                </q-item-section>
                <q-item-section>
                  <q-item-label>{{ model.name }}</q-item-label>
                </q-item-section>
              </q-item>
            </q-list>
            <q-separator v-if="groupIndex < filteredModelGroups.length - 1" class="q-my-sm" />
          </div>

          <!-- Empty State -->
          <div v-if="filteredModelGroups.length === 0" class="text-center q-pa-md text-grey-6">
            {{ $t('selectModel.noResults') }}
          </div>
        </q-card-section>
      </q-card>
    </q-menu>
  </q-btn>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useQuasar } from 'quasar'
import { useProvidersV2Store } from 'src/stores/providers-v2'
import type { Model } from 'src/utils/types'

interface Props {
  providerId?: string
  modelId?: string
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:providerId': [value: string]
  'update:modelId': [value: string]
}>()

const { t } = useI18n()
const $q = useQuasar()
const providersStore = useProvidersV2Store()

const searchText = ref('')

// Current model display name
const modelDisplayName = computed(() => {
  if (!props.providerId || !props.modelId) {
    return t('selectModel.selectModel')
  }

  const provider = providersStore.getProviderById(props.providerId)
  const model = providersStore.getModelByUniqId(`${props.providerId}:${props.modelId}`)

  if (!model || !provider) {
    return `${props.modelId}`
  }

  return `${model.name} | ${provider.name}`
})

const currentModelUniqId = computed(() => {
  if (!props.providerId || !props.modelId) return ''
  return `${props.providerId}:${props.modelId}`
})

// Pinned models (can be implemented later)
const pinnedModels = computed(() => {
  return []
})

// Group models by provider
interface ModelGroup {
  providerId: string
  providerName: string
  models: Array<Model & { uniqId: string }>
}

const filteredModelGroups = computed<ModelGroup[]>(() => {
  try {
    const groups: ModelGroup[] = []
    const search = searchText.value.toLowerCase().trim()

    const providers = providersStore.enabledProviders
    console.log('[SelectModelButton] enabledProviders:', providers)
    if (!providers || !Array.isArray(providers)) {
      console.log('[SelectModelButton] No providers or not array')
      return []
    }

    for (const provider of providers) {
      if (!provider || !provider.id) continue

      const models = providersStore.getModelsByProvider(provider.id)
      console.log(`[SelectModelButton] Models for provider ${provider.id} (${provider.name}):`, models)
      console.log(`[SelectModelButton] Provider object:`, provider)
      if (!models || !Array.isArray(models)) continue

      const filteredModels = models
        .filter(m => {
          if (!m) return false
          if (!search) return true
          const name = m.name?.toLowerCase() || ''
          const id = m.id?.toLowerCase() || ''
          return name.includes(search) || id.includes(search)
        })
        .map(m => ({
          ...m,
          uniqId: `${provider.id}:${m.id}`
        }))

      if (filteredModels.length > 0) {
        groups.push({
          providerId: provider.id,
          providerName: provider.name || provider.id,
          models: filteredModels
        })
      }
    }

    console.log('[SelectModelButton] Final groups:', groups)
    return groups
  } catch (error) {
    console.error('[SelectModelButton] Error filtering models:', error)
    return []
  }
})

function selectModel(providerId: string, modelId: string) {
  emit('update:providerId', providerId)
  emit('update:modelId', modelId)
  // Menu will auto-close with v-close-popup directive
}
</script>

<style scoped>
.select-model-btn {
  border-radius: 8px;
  padding: 4px 8px;
}

.model-text {
  font-size: 13px;
  font-weight: 500;
  max-width: 300px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bg-primary-1 {
  background-color: rgba(var(--q-primary-rgb), 0.1);
}
</style>
