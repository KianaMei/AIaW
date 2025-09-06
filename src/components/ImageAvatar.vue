<template>
  <q-avatar>
    <img
      v-if="url"
      :src="url"
    >
  </q-avatar>
</template>

<script setup lang="ts">
import { useAvatarImage } from 'src/composables/avatar-image'
import { toRef } from 'vue'

const props = defineProps<{
  id: string
}>()

const url = useAvatarImage(toRef(props, 'id'))
</script>
