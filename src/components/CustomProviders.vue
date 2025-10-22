<template>
  <q-list>
    <VueDraggable
      v-model="localProviders"
      item-key="id"
      handle=".drag-handle-right"
      :animation="150"
      :force-fallback="true"
      :fallback-on-body="true"
      @end="onDragEnd"
    >
    <q-item
      v-for="(provider, index) in localProviders"
      :key="provider.id"
      clickable
      :to="'/settings/providers/' + provider.id"
      active-class="route-active"
      item-rd
      class="provider-item"
    >
      <!-- Provider Info & Avatar -->
      <q-item-section avatar>
        <a-avatar
          size="md"
          :avatar="provider.avatar"
        />
      </q-item-section>

      <q-item-section>
        <q-item-label>
          {{ provider.name }}
        </q-item-label>
      </q-item-section>

      <!-- Context Menu & Drag Handle -->
      <q-menu context-menu>
        <q-list style="min-width: 100px">
          <menu-item
            icon="sym_o_check_box"
            :label="$t('customProviders.setAsDefault')"
            @click="setAsDefault(provider)"
            :class="{ 'route-active': perfs.providerId === provider.id }"
          />
          <menu-item
            icon="sym_o_delete"
            :label="$t('customProviders.delete')"
            @click="deleteItem(provider)"
            hover:text-err
          />
        </q-list>
      </q-menu>

      <!-- Drag Handle - Right Side -->
      <q-item-section side>
        <div
          
          
          
          
          @click.stop
          class="drag-handle-right flex items-center justify-center cursor-grab active:cursor-grabbing"
          title="拖拽排序"
        >
          <svg width="24" height="24" viewBox="0 0 20 20" fill="currentColor" class="text-grey-6">
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
    </q-item>
    </VueDraggable>

    <!-- Add New Provider -->
    <q-item
      clickable
      @click="addItem"
      text-sec
      item-rd
    >
      <q-item-section
        avatar
        min-w-0
      >
        <q-icon name="sym_o_add" />
      </q-item-section>
      <q-item-section>
        {{ $t('customProviders.createProvider') }}
      </q-item-section>
    </q-item>
  </q-list>
</template>

<script setup lang="ts">
import { useQuasar } from 'quasar'
import AAvatar from './AAvatar.vue'
import { useProvidersV2Store as useProvidersStore } from 'src/stores/providers-v2'
import { useI18n } from 'vue-i18n'
import MenuItem from './MenuItem.vue'
import { useRouter } from 'vue-router'
import { CustomProviderV2 } from 'src/utils/types'
import { useUserPerfsStore } from 'src/stores/user-perfs'
import { ref, watch } from 'vue'
import { VueDraggable } from 'vue-draggable-plus'

const { t } = useI18n()

const providersStore = useProvidersStore()

const $q = useQuasar()

const router = useRouter()

// Touch-friendly local list for drag-reorder
const localProviders = ref<CustomProviderV2[]>([])
watch(
  () => providersStore.sortedCustomProviders,
  (list) => { localProviders.value = [...list] },
  { immediate: true }
)

async function addItem() {
  const id = await providersStore.addCustomProvider()
  router.push(`/settings/providers/${id}`)
}

const { perfs } = useUserPerfsStore()
function setAsDefault({ id }: CustomProviderV2) {
  perfs.providerId = id
}
function deleteItem({ id, name }: { id: string, name: string }) {
  $q.dialog({
    title: t('customProviders.deleteProvider'),
    message: t('customProviders.deleteConfirm', { name }),
    cancel: true,
    ok: {
      label: t('customProviders.delete'),
      color: 'err',
      flat: true
    }
  }).onOk(() => {
    providersStore.deleteCustomProvider(id)
  })
}

// Drag and drop handlers
function onDragEnd() {
  providersStore.reorderCustomProviders(localProviders.value)
  $q.notify({
    message: t('customProviders.reorderSuccess') || 'Order updated',
    type: 'positive',
    position: 'top',
    timeout: 1200
  })
}
</script>

<style scoped>
.drag-handle-right {
  opacity: 0.4;
  transition: opacity 0.2s ease, color 0.2s ease;
  padding: 4px 8px;
  border-radius: 4px;
  touch-action: none;
  -webkit-user-drag: none;
  user-select: none;
}

.drag-handle-right:hover {
  opacity: 1;
  color: var(--q-primary);
  background-color: rgba(0, 0, 0, 0.05);
}
</style>
