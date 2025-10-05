<template>
  <div class="column gap-2">
    <provider-selector-v2
      v-model="currProviderId"
      :label="providerLabel || $t('pms.provider')"
      :only-enabled="true"
      :show-type="true"
      :show-status="true"
      filled
      dense
    />

    <model-selector-v2
      v-model="currModelId"
      :label="modelLabel || $t('pms.model')"
      :filter-provider="currProviderId || undefined"
      :hint="currProviderId ? '' : $t('pms.pickProviderFirst')"
      :clearable="true"
      :dense="dense"
      :filled="filled"
      :show-group="showGroup"
      :disable="!currProviderId"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import ProviderSelectorV2 from './ProviderSelectorV2.vue'
import ModelSelectorV2 from './ModelSelectorV2.vue'

interface Props {
  modelValue?: string // provider:modelId
  providerLabel?: string
  modelLabel?: string
  dense?: boolean
  filled?: boolean
  showGroup?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  dense: false,
  filled: true,
  showGroup: false
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const currProviderId = ref<string>('')
const currModelId = ref<string>('')

function parseUniqId(uniq?: string): { provider?: string; model?: string } {
  if (!uniq) return {}
  const idx = uniq.indexOf(':')
  if (idx === -1) return { model: uniq }
  return { provider: uniq.slice(0, idx), model: uniq.slice(idx + 1) }
}

// init from v-model
onMounted(() => {
  const { provider, model } = parseUniqId(props.modelValue)
  if (provider) currProviderId.value = provider
  if (model) currModelId.value = model
})

// reflect external changes
watch(() => props.modelValue, (val) => {
  const { provider, model } = parseUniqId(val)
  if (provider && provider !== currProviderId.value) currProviderId.value = provider
  if (model && model !== currModelId.value) currModelId.value = model
})

// when provider changes, clear model and wait user pick
watch(currProviderId, () => {
  currModelId.value = ''
})

// when model chosen, emit combined uniq id
watch(currModelId, (m) => {
  if (!m || !currProviderId.value) return
  emit('update:modelValue', `${currProviderId.value}:${m}`)
})
</script>

<i18n>
{
  "en-US": {
    "pms": {
      "provider": "Provider",
      "model": "Model",
      "pickProviderFirst": "Pick a provider first"
    }
  },
  "zh-CN": {
    "pms": {
      "provider": "供应商",
      "model": "模型",
      "pickProviderFirst": "请先选择供应商"
    }
  },
  "zh-TW": {
    "pms": {
      "provider": "供應商",
      "model": "模型",
      "pickProviderFirst": "請先選擇供應商"
    }
  }
}
</i18n>

