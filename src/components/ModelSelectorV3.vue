<template>
  <autocomplete-input
    :model-value="modelValue"
    @update:model-value="handleModelChange"
    :options="modelOptionsFormatted"
    :label="label"
    :placeholder="placeholder"
    :dense="dense"
    :filled="filled"
    clearable
  >
    <template #option="{ opt, selected, itemProps }">
      <q-item
        v-bind="itemProps"
        :class="{ 'bg-primary-container': selected }"
      >
        <q-item-section
          avatar
          v-if="showAvatar"
        >
          <model-avatar :model-id="opt.value" />
        </q-item-section>
        <q-item-section>
          <q-item-label>{{ opt.label }}</q-item-label>
          <q-item-label
            caption
            v-if="showProvider"
          >
            {{ opt.provider }}
          </q-item-label>
        </q-item-section>
      </q-item>
    </template>

    <template
      #selected
      v-if="selectedModelDisplay"
    >
      <div
        flex
        items-center
        gap-2
      >
        <model-avatar
          v-if="showAvatar"
          :model-id="modelValue"
          size="sm"
        />
        <span>{{ selectedModelDisplay.name }}</span>
        <span
          v-if="showProvider"
          class="text-xs opacity-60"
        >
          | {{ selectedModelDisplay.provider }}
        </span>
      </div>
    </template>
  </autocomplete-input>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useProvidersV2Store } from 'src/stores/providers-v2'
import AutocompleteInput from './AutocompleteInput.vue'
import ModelAvatar from './ModelAvatar.vue'

interface Props {
  modelValue?: string
  label?: string
  placeholder?: string
  dense?: boolean
  filled?: boolean
  showAvatar?: boolean
  showProvider?: boolean
  grouped?: boolean
  providerId?: string // Filter by specific provider
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  label: '',
  placeholder: '',
  showAvatar: true,
  showProvider: true,
  grouped: false,
  dense: false,
  filled: true,
  providerId: ''
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const providersStore = useProvidersV2Store()

// Get available models
const availableModels = computed(() => {
  if (props.providerId) {
    return providersStore.getModelsByProvider(props.providerId)
  }
  return providersStore.availableModels
})

// Format options for autocomplete
const modelOptionsFormatted = computed(() => {
  if (props.grouped) {
    // Group by provider
    const grouped: Record<string, any[]> = {}

    for (const model of availableModels.value) {
      const providerName = providersStore.getProviderName(model.provider)
      const uniqId = `${model.provider}:${model.id}`

      if (!grouped[providerName]) {
        grouped[providerName] = []
      }

      grouped[providerName].push({
        label: model.name,
        value: uniqId,
        provider: providerName
      })
    }

    // Convert to grouped format
    return Object.entries(grouped).map(([providerName, models]) => ({
      label: providerName,
      children: models
    }))
  } else {
    // Flat list
    return availableModels.value.map(model => {
      const providerName = providersStore.getProviderName(model.provider)
      const uniqId = `${model.provider}:${model.id}`

      return {
        label: model.name,
        value: uniqId,
        provider: providerName
      }
    })
  }
})

// Selected model display info
const selectedModelDisplay = computed(() => {
  if (!props.modelValue) return null

  const model = providersStore.getModelByUniqId(props.modelValue)
  if (!model) return null

  const providerName = providersStore.getProviderName(model.provider)

  return {
    name: model.name,
    provider: providerName
  }
})

// Handle model change
function handleModelChange(value: string) {
  emit('update:modelValue', value)
}
</script>
