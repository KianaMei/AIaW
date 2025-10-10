<template>
  <div class="column gap-2">
    <provider-selector-v2
      :model-value="providerId"
      @update:modelValue="onProviderChange"
      :label="providerLabel || '供应商'"
      :only-enabled="true"
      :show-type="true"
      :show-status="true"
      filled
      dense
    />

    <model-selector-v2
      :model-value="modelId"
      @update:modelValue="onModelChange"
      :label="modelLabel || '模型'"
      :filter-provider="providerId || undefined"
      :hint="providerId ? '' : '请先选择供应商'"
      :clearable="true"
      :dense="dense"
      :filled="filled"
      :show-group="showGroup"
      :disable="!providerId"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import ProviderSelectorV2 from './ProviderSelectorV2.vue'
import ModelSelectorV2 from './ModelSelectorV2.vue'

interface Props {
  providerId?: string
  modelId?: string
  providerLabel?: string
  modelLabel?: string
  dense?: boolean
  filled?: boolean
  showGroup?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  providerId: '',
  modelId: '',
  providerLabel: '',
  modelLabel: '',
  dense: false,
  filled: true,
  showGroup: false
})

const emit = defineEmits<{
  'update:providerId': [value: string]
  'update:modelId': [value: string]
}>()
const providerId = ref<string>(props.providerId || '')
const modelId = ref<string>(props.modelId || '')

// init
onMounted(() => {
  providerId.value = props.providerId || ''
  modelId.value = props.modelId || ''
})

// sync in
watch(() => props.providerId, (v) => {
  if (typeof v === 'string') providerId.value = v
})
watch(() => props.modelId, (v) => {
  if (typeof v === 'string') modelId.value = v
})

function onProviderChange(v: string) {
  providerId.value = v
  emit('update:providerId', v)
  // clear model until re-picked
  modelId.value = ''
  emit('update:modelId', '')
}

function onModelChange(v: string) {
  modelId.value = v
  emit('update:modelId', v)
}
</script>
