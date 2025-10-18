<template>
  <q-select
    :model-value="model"
    @update:model-value="onUpdate"
    @input-value="onInputValue"
    :options="filteredOptions"
    @filter="filterFn"
    :use-input="useInput"
    hide-selected
    fill-input
    :label="label"
    :placeholder="placeholder"
    :dense="dense"
    :filled="filled"
    :outlined="outlined"
    :clearable="clearable"
    :hide-dropdown-icon="hideDropdownIcon"
    :input-debounce="0"
    :emit-value="emitValue"
    :map-options="mapOptions"
    :option-label="optionLabel"
    :option-value="optionValue"
  >
    <template
      v-if="$slots.option"
      #option="slot"
    >
      <slot name="option" v-bind="slot" />
    </template>
  </q-select>
  </template>

<script setup lang="ts">
import { useFilterOptions } from 'src/composables/filter-options'
import { toRef } from 'vue'

type AnyOption = string | Record<string, any>

const props = withDefaults(defineProps<{
  options: AnyOption[]
  // Visuals
  label?: string
  placeholder?: string
  dense?: boolean
  filled?: boolean
  outlined?: boolean
  clearable?: boolean
  // Behavior
  useInput?: boolean
  hideDropdownIcon?: boolean
  emitValue?: boolean
  mapOptions?: boolean
  optionLabel?: string
  optionValue?: string
}>(), {
  label: '',
  placeholder: '',
  dense: false,
  filled: true,
  outlined: false,
  clearable: true,
  useInput: true,
  hideDropdownIcon: false,
  emitValue: false,
  mapOptions: false,
  optionLabel: 'label',
  optionValue: 'value'
})

const model = defineModel<any>()

const { filteredOptions, filterFn } = useFilterOptions(
  toRef(props, 'options'),
  { optionLabel: props.optionLabel, groupKey: 'options' }
)

function onUpdate(v: any) {
  model.value = v
}

function onInputValue(v: any) {
  model.value = v
}
</script>
