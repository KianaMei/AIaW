<template>
  <autocomplete-input
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    :options="modelOptions"
    :label="label || $t('modelSelector.selectModel')"
    :dense="dense"
    :filled="filled"
    :outlined="outlined"
    :clearable="clearable"
  >
    <template #option="{ opt, selected, itemProps }">
      <q-item
        v-bind="itemProps"
        :active="selected"
      >
        <q-item-section avatar>
          <a-avatar
            :avatar="getProviderAvatar(opt)"
            size="sm"
          />
        </q-item-section>
        <q-item-section>
          <q-item-label>{{ getModelName(opt) }}</q-item-label>
          <q-item-label caption>{{ getProviderName(opt) }}</q-item-label>
        </q-item-section>
        <q-item-section
          v-if="showGroup"
          side
        >
          <q-badge
            v-if="getModelGroup(opt)"
            :label="getModelGroup(opt)"
            color="primary"
            text-color="white"
          />
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
import { ModelService } from 'src/services/ModelService'
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
  dense: false,
  filled: true,
  outlined: false,
  clearable: true,
  showGroup: false
})

defineEmits<{
  'update:modelValue': [value: string]
}>()

const providersStore = useProvidersV2Store()

/**
 * All available model options (only model IDs, not provider:modelId format)
 */
const modelOptions = computed(() => {
  let models = providersStore.availableModels

  // Filter by provider if specified (REQUIRED for two-level selector)
  if (props.filterProvider) {
    models = models.filter(m => m.provider === props.filterProvider)
  }

  // Return only model IDs (not provider:modelId)
  return models.map(m => m.id)
})

/**
 * Get model name from model ID
 */
function getModelName(modelId: string): string {
  // Find model in the filtered provider
  const models = providersStore.availableModels.filter(m =>
    props.filterProvider ? m.provider === props.filterProvider : true
  )
  const model = models.find(m => m.id === modelId)
  return model?.name || modelId
}

/**
 * Get provider name (from filterProvider prop)
 */
function getProviderName(_modelId: string): string {
  if (!props.filterProvider) return ''
  return providersStore.getProviderName(props.filterProvider)
}

/**
 * Get model group from model ID
 */
function getModelGroup(modelId: string): string | undefined {
  // Find model in the filtered provider
  const models = providersStore.availableModels.filter(m =>
    props.filterProvider ? m.provider === props.filterProvider : true
  )
  const model = models.find(m => m.id === modelId)
  return model?.group
}

/**
 * Get provider avatar for model
 */
function getProviderAvatar(modelUniqId: string): any {
  const model = providersStore.getModelByUniqId(modelUniqId)
  if (!model) return { type: 'icon', icon: 'sym_o_neurology' }

  const provider = providersStore.getProviderById(model.provider)
  if (!provider) return { type: 'icon', icon: 'sym_o_neurology' }

  // System providers have predefined avatars
  // For custom providers, use their avatar
  return provider.isSystem
    ? getSystemProviderAvatar(provider.id)
    : { type: 'icon', icon: 'sym_o_dashboard_customize' }
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

<i18n>
{
  "en-US": {
    "modelSelector": {
      "selectModel": "Select Model"
    }
  },
  "zh-CN": {
    "modelSelector": {
      "selectModel": "选择模型"
    }
  },
  "zh-TW": {
    "modelSelector": {
      "selectModel": "選擇模型"
    }
  }
}
</i18n>
