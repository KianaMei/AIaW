<template>
  <router-view />
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useFirstVisit } from './composables/first-visit'
import { useLoginDialogs } from './composables/login-dialogs'
import { useSetTheme } from './composables/set-theme'
import { useSubscriptionNotify } from './composables/subscription-notify'
import { useInitDefaultModels } from './composables/init-default-models'
import { onMounted } from 'vue'
import { checkUpdate, ready } from './utils/update'
import { useProvidersV2Store } from './stores/providers-v2'

defineOptions({
  name: 'App'
})

useSetTheme()
useLoginDialogs()
useFirstVisit()
useSubscriptionNotify()

// Initialize Cherry Studio Architecture - this loads system providers
useProvidersV2Store()

// Initialize default models if not configured
useInitDefaultModels()

const router = useRouter()
router.afterEach(to => {
  if (to.meta.title) {
    document.title = `${to.meta.title} - AI as Workspace`
  }
})

onMounted(() => {
  ready()
  checkUpdate()
})

</script>
