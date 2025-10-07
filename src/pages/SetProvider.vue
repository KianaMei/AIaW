<template><div /></template>

<script setup lang="ts">
import { Validator } from '@cfworker/json-schema'
import { until } from '@vueuse/core'
import { useQuasar } from 'quasar'
import { useUserPerfsStore } from 'src/stores/user-perfs'
import { ProviderSchema } from 'src/utils/types'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useOpenLastWorkspace } from 'src/composables/open-last-workspace'

const route = useRoute()
const userPerfsStore = useUserPerfsStore()
const $q = useQuasar()
const { t } = useI18n()

const { openLastWorkspace } = useOpenLastWorkspace()

until(() => userPerfsStore.ready).toBeTruthy().then(() => {
  try {
    const { perfs } = userPerfsStore

    // Preferred new format: direct providerId/modelId in query
    const providerIdParam = (route.query.providerId as string) || ''
    const modelIdParam = (route.query.modelId as string) || ''

    if (providerIdParam) {
      const bakProviderId = perfs.providerId
      const bakModelId = perfs.modelId

      perfs.providerId = providerIdParam
      if (modelIdParam) perfs.modelId = modelIdParam

      $q.notify({
        message: t('setProviderPage.providerSet', { baseURL: providerIdParam }),
        color: 'positive',
        actions: [{
          label: t('setProviderPage.restore'),
          handler: () => {
            perfs.providerId = bakProviderId
            perfs.modelId = bakModelId
          },
          color: 'white'
        }],
        timeout: 6000
      })
    } else if (route.query.provider) {
      // Legacy format: provider JSON string (with type/settings)
      const provider = JSON.parse(route.query.provider as string)
      if (!new Validator(ProviderSchema).validate(provider)) {
        throw new Error('Invalid provider schema')
      }
      const bak = perfs.provider
      perfs.provider = provider
      // Best-effort mapping to new fields
      perfs.providerId = (provider?.type as string) || perfs.providerId || 'openai'
      if (provider?.model) perfs.modelId = provider.model

      $q.notify({
        message: t('setProviderPage.providerSet', { baseURL: provider?.settings?.baseURL || perfs.providerId }),
        color: 'positive',
        actions: [{
          label: t('setProviderPage.restore'),
          handler: () => {
            perfs.provider = bak
          },
          color: 'white'
        }],
        timeout: 6000
      })
    } else {
      throw new Error('No providerId/modelId or provider JSON provided')
    }
  } catch (e) {
    console.error(e)
    $q.notify({
      message: t('setProviderPage.providerSetFailed'),
      color: 'negative'
    })
  } finally {
    openLastWorkspace()
  }
})
</script>
