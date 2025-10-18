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
  emitUniqId?: boolean // If true, emit 'provider:modelId' as value
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
  hint: '',
  emitUniqId: false
})

defineEmits<{
  'update:modelValue': [value: string]
}>()

const providersStore = useProvidersV2Store()

const filteredModels = computed(() => {
  // Only show user-selected models. If no provider is specified, return empty
  // and rely on the UI hint to ask the user to pick a provider first.
  if (!props.filterProvider) return []
  return providersStore.getModelsByProvider(props.filterProvider)
})

const modelOptions = computed(() => {
  return filteredModels.value.map(model => props.emitUniqId ? `${model.provider}:${model.id}` : model.id)
})

function resolveModel(modelIdOrUniq: string) {
  if (props.emitUniqId && modelIdOrUniq?.includes(':')) {
    const parts = modelIdOrUniq.split(':')
    const id = parts.slice(1).join(':')
    return filteredModels.value.find(model => model.id === id)
  }
  return filteredModels.value.find(model => model.id === modelIdOrUniq)
}

function resolveProviderId(modelIdOrUniq: string): string | undefined {
  if (props.filterProvider) return props.filterProvider
  const model = resolveModel(modelIdOrUniq)
  return model?.provider
}

function getModelName(modelIdOrUniq: string): string {
  const model = resolveModel(modelIdOrUniq)
  return model?.name || modelId
}

function getProviderName(modelIdOrUniq: string): string {
  const providerId = resolveProviderId(modelIdOrUniq)
  if (!providerId) return ''
  return providersStore.getProviderName(providerId)
}

function getModelGroup(modelIdOrUniq: string): string | undefined {
  return resolveModel(modelIdOrUniq)?.group
}

function getProviderAvatar(modelIdOrUniq: string): any {
  const providerId = resolveProviderId(modelIdOrUniq)
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
