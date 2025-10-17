<template>
  <view-common-header @toggle-drawer="$emit('toggle-drawer')">
    <q-toolbar-title>
      {{ $t('providersList.title') }}
    </q-toolbar-title>
    <q-btn
      flat
      round
      dense
      icon="sym_o_add"
      @click="addProvider"
    >
      <q-tooltip>{{ $t('providersList.addProvider') }}</q-tooltip>
    </q-btn>
  </view-common-header>

  <q-page-container>
    <q-page :style-fn="pageFhStyle">
      <div class="max-w-1200px mx-a p-4">
        <!-- Search -->
        <q-input
          v-model="searchText"
          :placeholder="$t('providersList.searchPlaceholder')"
          filled
          dense
          class="mb-4"
        >
          <template #prepend>
            <q-icon name="sym_o_search" />
          </template>
        </q-input>

        <!-- System Providers -->
        <div class="mb-6">
          <h6 class="text-h6 mb-3">
            {{ $t('providersList.systemProviders') }}
          </h6>
          <q-list bordered separator>
            <VueDraggable
              v-model="systemOrderIds"
              :animation="150"
              handle=".drag-handle"
            >
              <template #item="{ element: id }">
                <q-item
                  v-if="systemById.get(id)"
                  :key="id"
                  clickable
                  :to="`/settings/providers/${id}`"
                  active-class="bg-primary-container"
                >
                  <q-item-section side class="drag-handle" style="cursor:grab">
                    <q-icon name="sym_o_drag_indicator" />
                  </q-item-section>
                  <q-item-section avatar>
                    <a-avatar :avatar="getProviderAvatar(systemById.get(id))" size="md" />
                  </q-item-section>
                  <q-item-section>
                    <q-item-label>{{ systemById.get(id)?.name }}</q-item-label>
                    <q-item-label caption>{{ systemById.get(id)?.type }}</q-item-label>
                  </q-item-section>
                  <q-item-section side>
                    <q-toggle
                      :model-value="systemById.get(id)?.enabled"
                      @update:model-value="toggleProvider(systemById.get(id))"
                      @click.stop
                    />
                  </q-item-section>
                </q-item>
              </template>
            </VueDraggable>
          </q-list>
        </div>

        <!-- Custom Providers -->
        <div v-if="filteredCustomProviders.length > 0">
          <h6 class="text-h6 mb-3">
            {{ $t('providersList.customProviders') }}
          </h6>
          <q-list bordered separator>
            <VueDraggable
              v-model="customOrderIds"
              :animation="150"
              handle=".drag-handle"
            >
              <template #item="{ element: id }">
                <q-item
                  v-if="customById.get(id)"
                  :key="id"
                  clickable
                  :to="`/settings/providers/${id}`"
                  active-class="bg-primary-container"
                >
                  <q-item-section side class="drag-handle" style="cursor:grab">
                    <q-icon name="sym_o_drag_indicator" />
                  </q-item-section>
                  <q-item-section avatar>
                    <a-avatar :avatar="customById.get(id)?.avatar" size="md" />
                  </q-item-section>
                  <q-item-section>
                    <q-item-label>{{ customById.get(id)?.name }}</q-item-label>
                    <q-item-label caption>{{ customById.get(id)?.type }}</q-item-label>
                  </q-item-section>
                  <q-item-section side>
                    <div flex items-center gap-2>
                      <q-toggle
                        :model-value="customById.get(id)?.enabled"
                        @update:model-value="toggleCustomProvider(customById.get(id))"
                        @click.stop
                      />
                      <q-btn
                        flat
                        round
                        dense
                        icon="sym_o_delete"
                        size="sm"
                        @click.stop="deleteProvider(customById.get(id))"
                      >
                        <q-tooltip>{{ $t('providersList.delete') }}</q-tooltip>
                      </q-btn>
                    </div>
                  </q-item-section>
                </q-item>
              </template>
            </VueDraggable>
          </q-list>
        </div>

        <!-- Empty State -->
        <div
          v-if="filteredCustomProviders.length === 0 && searchText"
          class="text-center py-8 text-secondary"
        >
          {{ $t('providersList.noResults') }}
        </div>
      </div>
    </q-page>
  </q-page-container>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useProvidersV2Store } from 'src/stores/providers-v2'
import { useQuasar } from 'quasar'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import ViewCommonHeader from 'src/components/ViewCommonHeader.vue'
import AAvatar from 'src/components/AAvatar.vue'
import AddProviderDialogV2 from 'src/components/AddProviderDialogV2.vue'
import { pageFhStyle } from 'src/utils/functions'
import type { SystemProvider, CustomProviderV2, Avatar } from 'src/utils/types'
import { VueDraggable } from 'vue-draggable-plus'
import { persistentReactive } from 'src/composables/persistent-reactive'

defineEmits(['toggle-drawer'])

const providersStore = useProvidersV2Store()
const $q = useQuasar()
const { t } = useI18n()
const router = useRouter()

const searchText = ref('')

// Persisted order (by provider id)
const [orders] = persistentReactive('#providers-order', {
  system: [] as string[],
  custom: [] as string[]
})

// Filtered providers
const filteredSystemProviders = computed(() => {
  const search = searchText.value.toLowerCase()
  if (!search) return providersStore.systemProviders

  return providersStore.systemProviders.filter(p =>
    p.name.toLowerCase().includes(search) ||
    p.id.toLowerCase().includes(search) ||
    p.type.toLowerCase().includes(search)
  )
})

const filteredCustomProviders = computed(() => {
  const search = searchText.value.toLowerCase()
  if (!search) return providersStore.customProviders

  return providersStore.customProviders.filter(p =>
    p.name.toLowerCase().includes(search) ||
    p.id.toLowerCase().includes(search) ||
    p.type.toLowerCase().includes(search)
  )
})

// Efficient lookup maps
const systemById = computed(() => new Map(filteredSystemProviders.value.map(p => [p.id, p])))
const customById = computed(() => new Map(filteredCustomProviders.value.map(p => [p.id, p])))

// Local order ids (bound to draggable)
const systemOrderIds = ref<string[]>([])
const customOrderIds = ref<string[]>([])

function rebuildOrder(list: { id: string }[], saved: string[]) {
  const idSet = new Set(list.map(i => i.id))
  // Keep only ids that still exist
  const kept = saved.filter(id => idSet.has(id))
  // Append new ids not in saved order
  const rest = list.map(i => i.id).filter(id => !kept.includes(id))
  return [...kept, ...rest]
}

// Initialize and sync when list changes or search changes
watch([filteredSystemProviders, () => orders.system], () => {
  systemOrderIds.value = rebuildOrder(filteredSystemProviders.value, orders.system)
}, { immediate: true })

watch([filteredCustomProviders, () => orders.custom], () => {
  customOrderIds.value = rebuildOrder(filteredCustomProviders.value, orders.custom)
}, { immediate: true })

// Persist on drag end (or whenever order arrays change)
watch(systemOrderIds, (val) => { orders.system = [...val] })
watch(customOrderIds, (val) => { orders.custom = [...val] })

// Get provider avatar
function getProviderAvatar(provider: SystemProvider | CustomProviderV2): Avatar {
  if ('avatar' in provider && provider.avatar) {
    return provider.avatar
  }

  // Default avatar based on provider ID
  const hue = (provider.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) * 137.5) % 360

  return {
    type: 'icon',
    icon: 'sym_o_cloud',
    hue
  }
}

// Toggle system provider
async function toggleProvider(provider: SystemProvider) {
  try {
    providersStore.updateSystemProvider(provider.id, {
      enabled: !provider.enabled
    })

    $q.notify({
      message: t('providersList.toggleSuccess'),
      type: 'positive',
      position: 'top'
    })
  } catch (error: any) {
    $q.notify({
      message: t('providersList.toggleError', { error: error.message }),
      type: 'negative',
      position: 'top'
    })
  }
}

// Toggle custom provider
async function toggleCustomProvider(provider: CustomProviderV2) {
  try {
    await providersStore.updateCustomProvider(provider.id, {
      enabled: !provider.enabled
    })

    $q.notify({
      message: t('providersList.toggleSuccess'),
      type: 'positive',
      position: 'top'
    })
  } catch (error: any) {
    $q.notify({
      message: t('providersList.toggleError', { error: error.message }),
      type: 'negative',
      position: 'top'
    })
  }
}

// Delete custom provider
function deleteProvider(provider: CustomProviderV2) {
  $q.dialog({
    title: t('providersList.deleteConfirmTitle'),
    message: t('providersList.deleteConfirmMessage', { name: provider.name }),
    cancel: true,
    persistent: true
  }).onOk(async () => {
    try {
      await providersStore.deleteCustomProvider(provider.id)

      $q.notify({
        message: t('providersList.deleteSuccess'),
        type: 'positive',
        position: 'top'
      })
    } catch (error: any) {
      $q.notify({
        message: t('providersList.deleteError', { error: error.message }),
        type: 'negative',
        position: 'top'
      })
    }
  })
}

// Add provider dialog
function addProvider() {
  $q.dialog({
    component: AddProviderDialogV2
  }).onOk(async (data: { name: string; type: string; avatar?: Avatar }) => {
    try {
      const id = await providersStore.addCustomProvider({
        name: data.name,
        type: data.type,
        apiHost: '',
        apiKey: '',
        models: [],
        enabled: true,
        settings: {},
        avatar: data.avatar
      })

      $q.notify({
        message: t('providersList.addSuccess'),
        type: 'positive',
        position: 'top'
      })

      // Navigate to the new provider
      router.push(`/settings/providers/${id}`)
    } catch (error: any) {
      $q.notify({
        message: t('providersList.addError', { error: error.message }),
        type: 'negative',
        position: 'top'
      })
    }
  })
}
</script>
