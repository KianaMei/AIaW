<template>
  <q-slider
    v-model="model"
    selection-color="transparent"
    color="white"
    track-size="20px"
    :min="0"
    :max="360"
  />
</template>

<script setup lang="ts">
const model = defineModel<number>()
</script>

<style lang="scss" scoped>
.q-slider :is(.q-slider__track) {
  background: linear-gradient(to right, #984061, #8F4E00, #566500, #006B5B, #006590, #684FA4, #984061);
}
</style>
