<template>
  <autocomplete-input
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    :options="modelOptions"
    :label="label"
    :dense="dense"
    :filled="filled"
    :outlined="outlined"
    :clearable="clearable"
  >
    <template #option="{ opt, selected, itemProps }">
      <q-item v-bind="itemProps" :active="selected">
        <q-item-section avatar>
          <a-avatar :avatar="getProviderAvatar(opt)" size="sm" />
        </q-item-section>
        <q-item-section>
          <q-item-label>{{ getModelName(opt) }}</q-item-label>
          <q-item-label caption>
            {{ getProviderName(opt) }}
          </q-item-label>
        </q-item-section>
        <q-item-section v-if="showGroup" side>
          <q-badge v-if="getModelGroup(opt)" :label="getModelGroup(opt)" color="primary" text-color="white" />
        </q-item-section>
      </q-item>
    </template>

    <template #prepend>
      <q-icon name="sym_o_neurology" />
    </template>

    <template #hint v-if="hint">
      {{ hint }}
    </template>
  </autocomplete-input>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useProvidersV2Store } from 'src/stores/providers-v2'
import AutocompleteInput from './AutocompleteInput.vue'
import AAvatar from './AAvatar.vue'

interface Props {
  modelValue?: string // Model unique ID (format: "provider:modelId")
  label?: string
  dense?: boolean
  filled?: boolean
  outlined?: boolean
  clearable?: boolean
  filterProvider?: string // Only show models from this provider
  showGroup?: boolean // Show model group badges
  hint?: string
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  label: '',
  dense: false,
  filled: true,
  outlined: false,
  clearable: true,
  filterProvider: '',
  showGroup: false,
  hint: ''
})

defineEmits<{
  'update:modelValue': [value: string]
}>()

const providersStore = useProvidersV2Store()

const filteredModels = computed(() => {
  const models = providersStore.availableModels
  if (props.filterProvider) {
    return models.filter(model => model.provider === props.filterProvider)
  }
  return models
})

const modelOptions = computed(() => {
  return filteredModels.value.map(model => model.id)
})

function resolveModel(modelId: string) {
  return filteredModels.value.find(model => model.id === modelId)
}

function resolveProviderId(modelId: string): string | undefined {
  if (props.filterProvider) return props.filterProvider
  const model = resolveModel(modelId)
  return model?.provider
}

function getModelName(modelId: string): string {
  const model = resolveModel(modelId)
  return model?.name || modelId
}

function getProviderName(modelId: string): string {
  const providerId = resolveProviderId(modelId)
  if (!providerId) return ''
  return providersStore.getProviderName(providerId)
}

function getModelGroup(modelId: string): string | undefined {
  return resolveModel(modelId)?.group
}

function getProviderAvatar(modelId: string): any {
  const providerId = resolveProviderId(modelId)
  if (!providerId) {
    return { type: 'icon', icon: 'sym_o_neurology' }
  }
  const provider = providersStore.getProviderById(providerId)
  if (!provider) {
    return { type: 'icon', icon: 'sym_o_neurology' }
  }
  if (!provider.isSystem) {
    return provider.avatar || { type: 'icon', icon: 'sym_o_dashboard_customize' }
  }
  return getSystemProviderAvatar(provider.id)
}

/**
 * Get avatar for system providers
 */
function getSystemProviderAvatar(providerId: string): any {
  const avatarMap: Record<string, any> = {
    openai: { type: 'svg', name: 'openai' },
    'openai-responses': { type: 'svg', name: 'openai', hue: 88 },
    anthropic: { type: 'svg', name: 'anthropic' },
    google: { type: 'svg', name: 'google-c' },
    azure: { type: 'svg', name: 'microsoft-c' },
    deepseek: { type: 'svg', name: 'deepseek-c' },
    xai: { type: 'svg', name: 'grok' },
    ollama: { type: 'svg', name: 'ollama' },
    groq: { type: 'svg', name: 'groq' },
    openrouter: { type: 'svg', name: 'openrouter' },
    mistral: { type: 'svg', name: 'mistral-c' },
    cohere: { type: 'svg', name: 'cohere-c' },
    togetherai: { type: 'svg', name: 'togetherai-c' },
    burncloud: { type: 'svg', name: 'burncloud-c' }
  }

  return avatarMap[providerId] || { type: 'icon', icon: 'sym_o_neurology' }
}
</script>

