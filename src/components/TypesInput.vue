<template>
  <template v-if="type === 'string'">
    <q-select
      v-if="options"
      v-model="model"
      :options
      :label
      v-bind="inputProps"
      :class="$attrs.class"
    />
    <component
      :is="inputComponent"
      v-else
      v-model="model"
      :label
      v-bind="inputProps"
      :class="$attrs.class"
    />
  </template>
  <template v-else-if="type === 'array'">
    <q-select
      v-if="options"
      v-model="model"
      multiple
      :options
      :label
      v-bind="inputProps"
      :class="$attrs.class"
    />
    <q-select
      v-else
      v-model="model"
      use-input
      use-chips
      multiple
      hide-dropdown-icon
      input-debounce="0"
      new-value-mode="add"
      class="input-item"
      :label
      v-bind="inputProps"
      :class="$attrs.class"
    />
  </template>

  <template v-else-if="type === 'number'">
    <!-- 如果有 minimum/maximum，使用滑动条 -->
    <div
      v-if="inputProps?.minimum !== undefined || inputProps?.maximum !== undefined"
      :class="$attrs.class"
      class="number-slider-container"
    >
      <div class="row items-center gap-3 no-wrap">
        <q-slider
          :model-value="model ?? inputProps?.default ?? inputProps?.minimum ?? 0"
          @update:model-value="model = $event"
          :min="inputProps?.minimum ?? 0"
          :max="inputProps?.maximum ?? 100"
          :step="inputProps?.step ?? 1"
          :label-value="`${model ?? inputProps?.default ?? 0}`"
          label
          color="primary"
          style="flex: 1; min-width: 0"
        />
        <component
          :is="inputComponent"
          :model-value="model ?? inputProps?.default ?? ''"
          @update:model-value="model = $event ? Number($event) : undefined"
          type="number"
          dense
          filled
          borderless
          :min="inputProps?.minimum"
          :max="inputProps?.maximum"
          :step="inputProps?.step"
          :placeholder="`${inputProps?.default ?? ''}`"
          style="width: 70px; flex-shrink: 0"
          class="text-center"
        />
      </div>
    </div>
    <!-- 否则使用普通数字输入框 -->
    <component
      v-else
      :is="inputComponent"
      :model-value="model"
      @update:model-value="model = $event ? Number($event) : undefined"
      :label
      v-bind="inputProps"
      type="number"
      :class="$attrs.class"
    />
  </template>
  <q-toggle
    v-else-if="type === 'boolean'"
    v-model="model"
    left-label
    :label
    :class="$attrs.class"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import LazyInput from './LazyInput.vue'
import { QInput } from 'quasar'

const props = defineProps<{
  type: 'string' | 'array' | 'number' | 'boolean'
  options?: string[]
  label?: string
  inputProps?: Record<string, any>
  lazy?: boolean
}>()
const model = defineModel<any>()

if (props.type === 'array' && !model.value) {
  model.value = []
}

// 为带有默认值的 number 类型初始化
if (props.type === 'number' && model.value === undefined && props.inputProps?.default !== undefined) {
  model.value = props.inputProps.default
}

const inputComponent = computed(() => props.lazy ? LazyInput : QInput)
</script>

<style scoped>
/* 隐藏数字输入框的上下箭头 */
:deep(input[type="number"]::-webkit-inner-spin-button),
:deep(input[type="number"]::-webkit-outer-spin-button) {
  -webkit-appearance: none;
  margin: 0;
}

:deep(input[type="number"]) {
  -moz-appearance: textfield;
}
</style>
