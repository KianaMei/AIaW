<template>
  <q-select
    :model-value="model"
    @input-value="model = $event"
    :options="filteredOptions"
    @filter="filterFn"
    use-input
    hide-selected
    fill-input
    :hide-dropdown-icon="hideDropdownIcon"
    :input-debounce="0"
  >
    <template
      v-if="$slots.option"
      #option="slot"
    >
      <slot
        name="option"
        v-bind="slot"
      />
    </template>
  </q-select>
</template>

<script setup lang="ts">
import { useFilterOptions } from 'src/composables/filter-options'
import { toRef } from 'vue'

const props = defineProps<{
  options: string[]
  // When true, hide the select's dropdown arrow icon (default: false)
  hideDropdownIcon?: boolean
}>()

const model = defineModel<string>()

const { filteredOptions, filterFn } = useFilterOptions(toRef(props, 'options'))
</script>
