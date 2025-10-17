<template>
  <q-list>
    <VueDraggable
      v-model="dndList"
      item-key="id"
      handle=".drag-handle"
      :animation="150"
    >
      <template #item="{ element: provider }">
        <q-item
          :key="provider.id"
          class="drag-row"
          clickable
          :to="'/settings/providers/' + provider.id"
          active-class="route-active"
          item-rd
        >
          <q-item-section side class="drag-handle" style="cursor:grab; user-select:none; touch-action:none" @mousedown.stop>
            <q-icon name="sym_o_drag_indicator" />
          </q-item-section>
          <q-item-section avatar>
            <a-avatar size="md" :avatar="provider.avatar" />
          </q-item-section>
          <q-item-section>
            <q-item-label>{{ provider.name }}</q-item-label>
          </q-item-section>
          <q-menu context-menu>
            <q-list style="min-width: 120px">
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
        </q-item>
      </template>
    </VueDraggable>

    <q-item clickable @click="addItem" text-sec item-rd>
      <q-item-section avatar min-w-0>
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
import { VueDraggable } from 'vue-draggable-plus'
import { ref, watch } from 'vue'

const { t } = useI18n()

const providersStore = useProvidersStore()

const $q = useQuasar()

const router = useRouter()
async function addItem() {
  const id = await providersStore.addCustomProvider()
  router.push(`/settings/providers/${id}`)
}

const { perfs } = useUserPerfsStore()
function setAsDefault({ id }: CustomProviderV2) {
  // V2: Store provider ID directly, no "custom:" prefix
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

// ---------- DnD (no persistence yet) ----------
const dndList = ref<CustomProviderV2[]>([])
watch(() => providersStore.customProviders, (list) => {
  dndList.value = Array.isArray(list) ? [...list] : []
}, { immediate: true, deep: true })
</script>
