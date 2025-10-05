<template>
  <q-avatar :size="sizeValue" :class="avatarClass">
    <q-icon
      v-if="modelIcon"
      :name="modelIcon"
      :size="iconSize"
    />
    <span v-else class="text-xs">{{ modelInitial }}</span>
  </q-avatar>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useProvidersV2Store } from 'src/stores/providers-v2'

interface Props {
  modelId?: string
  size?: 'xs' | 'sm' | 'md' | 'lg'
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md'
})

const providersStore = useProvidersV2Store()

// Get model info
const model = computed(() => {
  if (!props.modelId) return null
  return providersStore.getModelByUniqId(props.modelId)
})

// Get provider info
const provider = computed(() => {
  if (!model.value) return null
  return providersStore.getProviderById(model.value.provider)
})

// Size mapping
const sizeMap = {
  xs: '16px',
  sm: '24px',
  md: '32px',
  lg: '48px'
}

const iconSizeMap = {
  xs: '12px',
  sm: '16px',
  md: '20px',
  lg: '28px'
}

const sizeValue = computed(() => sizeMap[props.size])
const iconSize = computed(() => iconSizeMap[props.size])

// Model icon (based on provider or model type)
const modelIcon = computed(() => {
  if (!model.value) return 'sym_o_neurology'

  // Map provider to icon
  const providerIconMap: Record<string, string> = {
    openai: 'sym_o_auto_awesome',
    anthropic: 'sym_o_psychology',
    google: 'sym_o_google',
    ollama: 'sym_o_terminal',
    deepseek: 'sym_o_explore'
  }

  return providerIconMap[model.value.provider] || 'sym_o_neurology'
})

// Model initial (fallback)
const modelInitial = computed(() => {
  if (!model.value) return 'M'
  return model.value.name.charAt(0).toUpperCase()
})

// Avatar class (color based on provider)
const avatarClass = computed(() => {
  if (!provider.value) return 'bg-surface-container'

  // Generate color based on provider ID
  const hue = (provider.value.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) * 137.5) % 360

  return `bg-[hsl(${hue},50%,45%)] text-white`
})
</script>
