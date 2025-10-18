<template>
  <q-header
    bg-sur-c-low
    text-on-sur
  >
    <q-toolbar>
      <q-btn
        v-if="backTo"
        flat
        dense
        round
        icon="sym_o_arrow_back"
        @click="back"
      />
      <q-btn
        v-else
        flat
        dense
        round
        icon="sym_o_menu"
        @click="uiStore.toggleMainDrawer"
      />
      <slot />
      <q-btn
        flat
        dense
        round
        icon="sym_o_segment"
        @click="$emit('toggle-drawer')"
        @contextmenu.prevent="$emit('contextmenu')"
      />
    </q-toolbar>
  </q-header>
</template>

<script setup lang="ts">
import { useBack } from 'src/composables/back'
import { useDoubleBack } from 'src/composables/double-back'
import { useUiStateStore } from 'src/stores/ui-state'
import { useRouter } from 'vue-router'
import { inject, computed } from 'vue'

const uiStore = useUiStateStore()
const router = useRouter()
const { handleBackPress } = useDoubleBack()
const rightDrawerAbove = inject('rightDrawerAbove')

defineEmits(['toggle-drawer', 'contextmenu'])

const props = defineProps<{
  backTo?: string
  forceNavigate?: boolean
}>()

console.log('[ViewCommonHeader] Props received:', props)

// Use double-back detection in chat view, normal back in other views
const isChatView = computed(() => router.currentRoute.value.name === 'DialogView')
const normalBack = useBack(props.backTo, { forceNavigate: props.forceNavigate })

const back = () => {
  if (isChatView.value) {
    // In chat view, use double-back detection
    handleBackPress()
  } else {
    // In other views, use normal back navigation
    normalBack()
  }
}
</script>
<style scoped>

</style>
