<template>
  <q-list>
    <VueDraggable
      v-model="orderIds"
      :animation="150"
      handle=".drag-handle"
    >
      <template #item="{ element: id }">
        <q-item
          v-if="byId.get(id)"
          :key="id"
          clickable
          :to="`/settings/providers/${id}`"
          active-class="route-active"
          item-rd
        >
          <q-item-section side class="drag-handle" style="cursor:grab">
            <q-icon name="sym_o_drag_indicator" />
          </q-item-section>
          <q-item-section avatar>
            <a-avatar size="md" :avatar="byId.get(id)?.avatar" />
          </q-item-section>
          <q-item-section>
            <q-item-label>
              {{ byId.get(id)?.name }}
            </q-item-label>
          </q-item-section>
          <q-menu context-menu>
            <q-list style="min-width: 140px">
              <menu-item
                icon="sym_o_check_box"
                :label="$t('customProviders.setAsDefault')"
                @click="setAsDefault(byId.get(id))"
                :class="{ 'route-active': perfs.providerId === id }"
              />
              <menu-item
                icon="sym_o_delete"
                :label="$t('customProviders.delete')"
                @click="deleteItem(byId.get(id))"
                hover:text-err
              />
            </q-list>
          </q-menu>
        </q-item>
      </template>
    </VueDraggable>

    <q-item
      clickable
      @click="addItem"
      text-sec
      item-rd
    >
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
import { computed, ref, watch } from 'vue'
import { persistentReactive } from 'src/composables/persistent-reactive'

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

// ----- Drag ordering (persisted) -----
// Persisted orders used by model selector as well
const [orders] = persistentReactive('#providers-order', { system: [] as string[], custom: [] as string[] })

// Local list order (ids)
const orderIds = ref<string[]>([])
const byId = computed(() => new Map(providersStore.customProviders.map(p => [p.id, p])))

function rebuild(list: { id: string }[], saved: string[]) {
  const ids = list.map(i => i.id)
  const keep = saved.filter(id => ids.includes(id))
  const rest = ids.filter(id => !keep.includes(id))
  return [...keep, ...rest]
}

watch([() => providersStore.customProviders, () => orders.custom], () => {
  orderIds.value = rebuild(providersStore.customProviders, orders.custom)
}, { immediate: true, deep: true })

// Persist after drag
watch(orderIds, (val) => { orders.custom = [...val] })
</script>
