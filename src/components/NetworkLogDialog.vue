<template>
  <q-dialog
    ref="dialogRef"
    @hide="onDialogHide"
  >
    <q-card style="width: min(95vw, 900px); max-height: 90vh">
      <q-card-section class="row items-center q-gutter-sm">
        <div class="text-h6">
          Network Logs
        </div>
        <q-space />
        <q-btn
          flat
          dense
          icon="sym_o_delete"
          :title="'Clear'"
          @click="clear"
        />
      </q-card-section>
      <q-separator />
      <q-card-section style="height: 65vh; overflow:auto">
        <q-table
          :rows="rows"
          :columns="cols"
          row-key="id"
          dense
          flat
          :pagination="{ rowsPerPage: 0 }"
        >
          <template #body-cell-url="p">
            <q-td :props="p">
              <div
                class="ellipsis"
                style="max-width: 520px"
              >{{ p.row.url }}</div>
            </q-td>
          </template>
        </q-table>
      </q-card-section>
      <q-separator />
      <q-card-actions align="right">
        <q-btn
          flat
          color="primary"
          label="Close"
          @click="onDialogCancel"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useDialogPluginComponent } from 'quasar'

const rows = ref<any[]>([])
const cols = [
  { name: 'time', label: 'Time', field: 'time', align: 'left' },
  { name: 'method', label: 'Method', field: 'method', align: 'left' },
  { name: 'status', label: 'Status', field: 'status', align: 'left' },
  { name: 'url', label: 'URL', field: 'url', align: 'left' }
]

function ingest(detail: any) {
  const d = {
    id: `${detail.ts}-${Math.random().toString(36).slice(2, 6)}`,
    time: new Date(detail.ts).toLocaleTimeString(),
    method: detail.method,
    status: detail.status || (detail.error ? 'ERR' : ''),
    url: detail.url
  }
  rows.value.unshift(d)
  if (rows.value.length > 1000) rows.value.pop()
}

function clear() {
  rows.value = []
}

onMounted(() => {
  const g: any = window as any
  if (g.__AIAW_HTTP_LOGS) {
    for (const e of g.__AIAW_HTTP_LOGS) ingest(e)
  }
  const handler = (ev: Event) => ingest((ev as CustomEvent).detail)
  window.addEventListener('aiaw-http-log', handler)
  onBeforeUnmount(() => window.removeEventListener('aiaw-http-log', handler))
})

defineEmits([...useDialogPluginComponent.emits])
const { dialogRef, onDialogHide, onDialogCancel } = useDialogPluginComponent()
</script>
