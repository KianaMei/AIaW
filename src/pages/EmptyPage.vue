<template>
  <q-header
    bg-sur-c-low
    text-on-sur
  >
    <q-toolbar>
      <q-btn
        flat
        dense
        round
        icon="sym_o_menu"
        @click="uiStateStore.mainDrawerOpen = !uiStateStore.mainDrawerOpen"
      />
    </q-toolbar>
  </q-header>
</template>

<script setup lang="ts">
import { useUiStateStore } from 'src/stores/ui-state'

const uiStateStore = useUiStateStore()
</script>
