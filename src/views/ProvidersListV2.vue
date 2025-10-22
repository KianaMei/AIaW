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
            <q-item
              v-for="provider in filteredSystemProviders"
              :key="provider.id"
              clickable
              :to="`/settings/providers/${provider.id}`"
              active-class="bg-primary-container"
            >
              <q-item-section avatar>
                <a-avatar :avatar="getProviderAvatar(provider)" size="md" />
              </q-item-section>
              <q-item-section>
                <q-item-label>{{ provider.name }}</q-item-label>
                <q-item-label caption>{{ provider.type }}</q-item-label>
              </q-item-section>
              <q-item-section side>
                <q-toggle
                  :model-value="provider.enabled"
                  @update:model-value="toggleProvider(provider)"
                  @click.stop
                />
              </q-item-section>
            </q-item>
          </q-list>
        </div>
        <!-- Custom Providers -->
        <div v-if="filteredCustomProviders.length > 0">
          <h6 class="text-h6 mb-3">
            {{ $t('providersList.customProviders') }}
          </h6>
          <q-list bordered separator>
            <VueDraggable
              v-if="!searchText"
              v-model="displayCustomProviders"
              item-key="id"
              handle=".drag-handle"
              :animation="150"
              :force-fallback="true"
              :fallback-on-body="true"
              @end="onDragEnd"
            >
            <q-item
              v-for="(provider, index) in displayCustomProviders"
              :key="provider.id"
              :class="{ 'opacity-50 scale-95': draggedIndex === index }"
              class="transition-all duration-200"
            >
              <!-- Drag Handle -->
              <q-item-section avatar class="min-w-0">
                <div
                  class="drag-handle flex items-center justify-center cursor-grab active:cursor-grabbing"
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" class="text-grey-6">
                    <!-- 六点拖拽图标 -->
                    <circle cx="8" cy="6" r="2" />
                    <circle cx="8" cy="10" r="2" />
                    <circle cx="8" cy="14" r="2" />
                    <circle cx="12" cy="6" r="2" />
                    <circle cx="12" cy="10" r="2" />
                    <circle cx="12" cy="14" r="2" />
                  </svg>
                </div>
              </q-item-section>

              <!-- Provider Info -->
              <q-item-section
                clickable
                :to="`/settings/providers/${provider.id}`"
                active-class="bg-primary-container"
                class="cursor-pointer"
              >
                <div class="flex items-center gap-2">
                  <a-avatar :avatar="provider.avatar" size="md" />
                  <div>
                    <q-item-label>{{ provider.name }}</q-item-label>
                    <q-item-label caption>{{ provider.type }}</q-item-label>
                  </div>
                </div>
              </q-item-section>

              <!-- Actions -->
              <q-item-section side>
                <div flex items-center gap-2>
                  <q-toggle
                    :model-value="provider.enabled"
                    @update:model-value="toggleCustomProvider(provider)"
                    @click.stop
                  />
                  <q-btn
                    flat
                    round
                    dense
                    icon="sym_o_delete"
                    size="sm"
                    @click.stop="deleteProvider(provider)"
                  >
                    <q-tooltip>{{ $t('providersList.delete') }}</q-tooltip>
                  </q-btn>
                </div>
              </q-item-section>
            </q-item>
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
import { VueDraggable } from 'vue-draggable-plus'
import { useProvidersV2Store } from 'src/stores/providers-v2'
import { useQuasar } from 'quasar'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import ViewCommonHeader from 'src/components/ViewCommonHeader.vue'
import AAvatar from 'src/components/AAvatar.vue'
import AddProviderDialogV2 from 'src/components/AddProviderDialogV2.vue'
import { pageFhStyle } from 'src/utils/functions'
import type { SystemProvider, CustomProviderV2, Avatar } from 'src/utils/types'

defineEmits(['toggle-drawer'])

const providersStore = useProvidersV2Store()
const $q = useQuasar()
const { t } = useI18n()
const router = useRouter()

const searchText = ref('')
const draggedIndex = ref<number | null>(null)

// Local copy of custom providers for drag-and-drop
const displayCustomProviders = ref<CustomProviderV2[]>([])

// Update display list when custom providers change
const filteredCustomProviders = computed(() => {

  const search = searchText.value.toLowerCase()
  if (!search) return providersStore.sortedCustomProviders

  return providersStore.sortedCustomProviders.filter(p =>
    p.name.toLowerCase().includes(search) ||
    p.id.toLowerCase().includes(search) ||
    p.type.toLowerCase().includes(search)
  )
})

// Keep a local reorderable list in sync with store order (for Draggable)
watch(
  () => providersStore.sortedCustomProviders,
  (list) => { displayCustomProviders.value = [...list] },
  { immediate: true }
)


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

// Drag and drop handlers
function onDragEnd() {
  // Persist new order
  providersStore.reorderCustomProviders(displayCustomProviders.value)
  $q.notify({
    message: t('providersList.reorderSuccess') || 'Order updated',
    type: 'positive',
    position: 'top',
    timeout: 1200
  })
}
</script>

<style scoped>
.drag-handle {
  opacity: 0.5;
  transition: opacity 0.2s ease, color 0.2s ease;
  padding: 0 8px;
  /* Improve touch dragging on Android */
  touch-action: none;
  -webkit-user-drag: none;
  user-select: none;
}

.drag-handle:hover {
  opacity: 1;
  color: var(--q-primary);
}

.transition-all {
  transition: all 0.2s ease;
}

.duration-200 {
  transition-duration: 200ms;
}

.opacity-50 {
  opacity: 0.5;
}

.scale-95 {
  transform: scale(0.95);
}
</style>
