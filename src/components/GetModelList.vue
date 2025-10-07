<template>
  <a
    v-if="canFetchModels"
    pri-link
    href="javascript:void(0)"
    @click="getModelList"
  >
    {{ $t('getModelList.getModelList') }}
  </a>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Provider } from 'src/utils/types'
import { dialogOptions } from 'src/utils/values'
import { useQuasar } from 'quasar'
import { useI18n } from 'vue-i18n'
import { useProvidersV2Store as useProvidersStore } from 'src/stores/providers-v2'

const props = defineProps<{
  provider?: Provider | null
  providerId?: string | null
}>()

const models = defineModel<string[]>()

const $q = useQuasar()
const { t } = useI18n()

const providersStore = useProvidersStore()

function normalizeProviderId(raw?: string | null): string | null {
  if (!raw) return null
  return raw.startsWith('custom:') ? raw.slice('custom:'.length) : raw
}

const resolvedProviderId = computed(() => {
  if (props.providerId) return normalizeProviderId(props.providerId)
  return normalizeProviderId(props.provider?.type)
})

const canFetchModels = computed(() => {
  const pid = resolvedProviderId.value
  if (!pid) return false
  return !!providersStore.getProviderById(pid)
})

async function getModelList() {
  const providerId = resolvedProviderId.value
  if (!providerId) {
    $q.notify({
      message: t('getModelList.getModelListFailed'),
      color: 'negative'
    })
    return
  }

  try {
    const result = await providersStore.fetchProviderModels(providerId)
    const modelList = [...new Set(result.models)].sort()

    if (modelList.length === 0) {
      $q.notify({
        message: t('getModelList.getModelListFailed'),
        color: 'negative'
      })
      return
    }

    $q.dialog({
      title: t('getModelList.selectModels'),
      options: {
        type: 'checkbox',
        model: models.value.filter(m => modelList.includes(m)),
        items: modelList.map(m => ({ label: m, value: m }))
      },
      cancel: true,
      ...dialogOptions
    }).onOk(val => {
      models.value = val
    })

    if (result.source === 'static' && result.error) {
      $q.notify({
        message: result.error,
        color: 'warning',
        position: 'top',
        timeout: 4000
      })
    }
  } catch (err) {
    console.error(err)
    $q.notify({
      message: t('getModelList.getModelListFailed'),
      color: 'negative'
    })
  }
}
</script>
