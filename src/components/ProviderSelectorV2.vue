<template>
  <q-select
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    :options="providerOptions"
    :label="label"
    :dense="dense"
    :filled="filled"
    :outlined="outlined"
    :clearable="clearable"
    option-value="id"
    option-label="name"
    emit-value
    map-options
  >
    <template #option="{ opt, selected, itemProps }">
      <q-item v-bind="itemProps" :active="selected">
        <q-item-section avatar>
          <a-avatar :avatar="opt.avatar" size="sm" />
        </q-item-section>
        <q-item-section>
          <q-item-label>{{ opt.name }}</q-item-label>
          <q-item-label caption v-if="showType">
            {{ opt.isSystem ? '系统服务商' : '自定义服务商' }}
          </q-item-label>
        </q-item-section>
        <q-item-section side v-if="showStatus">
          <q-badge :color="opt.enabled ? 'positive' : 'grey'" :label="opt.enabled ? '已启用' : '已禁用'" />
        </q-item-section>
      </q-item>
    </template>

    <template #prepend>
      <q-icon name="sym_o_cloud" />
    </template>

    <template #hint v-if="hint">
      {{ hint }}
    </template>
  </q-select>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useProvidersV2Store } from 'src/stores/providers-v2'
import AAvatar from './AAvatar.vue'

interface Props {
  modelValue?: string // Provider ID
  label?: string
  dense?: boolean
  filled?: boolean
  outlined?: boolean
  clearable?: boolean
  onlyEnabled?: boolean // Only show enabled providers
  onlySystem?: boolean // Only show system providers
  onlyCustom?: boolean // Only show custom providers
  showType?: boolean // Show system/custom badge
  showStatus?: boolean // Show enabled/disabled badge
  hint?: string
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  label: '',
  dense: false,
  filled: true,
  outlined: false,
  clearable: true,
  onlyEnabled: false,
  onlySystem: false,
  onlyCustom: false,
  showType: false,
  showStatus: false,
  hint: ''
})

defineEmits<{
  'update:modelValue': [value: string]
}>()

const providersStore = useProvidersV2Store()

// Provider options with avatar info
const providerOptions = computed(() => {
  let providers = providersStore.allProviders

  if (props.onlyEnabled) {
    providers = providers.filter(p => p.enabled)
  }
  if (props.onlySystem) {
    providers = providers.filter(p => p.isSystem)
  }
  if (props.onlyCustom) {
    providers = providers.filter(p => !p.isSystem)
  }

  return providers.map(p => ({
    id: p.id,
    name: p.name,
    isSystem: p.isSystem,
    enabled: p.enabled,
    avatar: getProviderAvatar(p)
  }))
})

function getProviderAvatar(provider: any): any {
  if (!provider.isSystem && provider.avatar) {
    return provider.avatar
  }
  if (!provider.isSystem) {
    return { type: 'icon', icon: 'sym_o_dashboard_customize' }
  }
  const avatarMap: Record<string, any> = {
    openai: { type: 'svg', name: 'openai' },
    'openai-responses': { type: 'svg', name: 'openai', hue: 88 },
    anthropic: { type: 'svg', name: 'anthropic' },
    google: { type: 'svg', name: 'google-c' },
    azure: { type: 'svg', name: 'microsoft-c' },
    'openai-compatible': { type: 'svg', name: 'openai', hue: 160 },
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
  return avatarMap[provider.id] || { type: 'icon', icon: 'sym_o_cloud' }
}
</script>

