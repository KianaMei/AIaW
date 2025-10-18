<template>
  <div
    v-if="mode === 'edit'"
    flex-1
    of-y-auto
  >
    <code-jar
      :language="props.artifact.language"
      :model-value="props.artifact.tmp"
      @update:model-value="update({ tmp: $event })"
    />
  </div>
  <div
    v-else
    flex-1
    of-y-auto
    bg-sur
  >
    <img
      v-if="artifact.language === 'svg'"
      :src="`data:image/svg+xml,${encodeURIComponent(artifact.tmp)}`"
    >
    <iframe
      v-else-if="artifact.language === 'html'"
      :srcdoc="artifact.tmp"
      sandbox="allow-scripts allow-same-origin allow-forms"
      style="width: 100%; height: 100%; border: none; background: white;"
      title="HTML Preview"
    />
    <md-preview
      v-else
      :model-value="artifact.tmp"
      v-bind="mdPreviewProps"
      bg-sur
    />
  </div>
  <div
    flex
    items-center
    p-2
  >
    <div>
      <div
        text-out
      >
        {{ artifact.versions[artifact.currIndex].date.toLocaleString() }}
      </div>
      <q-pagination
        :model-value="artifact.currIndex + 1"
        @update:model-value="setIndex($event - 1)"
        :max="artifact.versions.length"
        input
        :boundary-links="false"
      />
    </div>
    <q-space />
    <div mr-2>
      <a-input
        :model-value="artifact.language"
        @update:model-value="update({ language: $event as string })"
        :label="$t('editArtifact.language')"
        outlined
        dense
        class="w-100px"
      />
    </div>
    <q-btn
      v-if="mode === 'view'"
      icon="sym_o_edit"
      :title="$t('editArtifact.edit')"
      @click="mode = 'edit'"
      flat
      dense
      round
    />
    <q-btn
      v-if="viewable && mode === 'edit'"
      icon="sym_o_preview"
      :title="$t('editArtifact.preview')"
      @click="mode = 'view'"
      flat
      dense
      round
    />
    <q-btn
      v-if="artifact.language === 'html' && IsTauri"
      icon="sym_o_open_in_browser"
      :title="$t('editArtifact.openExternal')"
      @click="openInBrowser"
      flat
      dense
      round
    />
    <q-btn
      v-if="artifact.language === 'html'"
      icon="sym_o_download"
      :title="$t('editArtifact.download')"
      @click="downloadHtml"
      flat
      dense
      round
    />
    <div>
      <q-checkbox
        ml-2
        :label="$t('editArtifact.readable')"
        :model-value="artifact.readable"
        @update:model-value="update({ readable: $event })"
        dense
        text-on-sur-var
      /><br>
      <q-checkbox
        mt-2
        ml-2
        :label="$t('editArtifact.writable')"
        :model-value="artifact.writable"
        @update:model-value="update({ writable: $event })"
        dense
        text-on-sur-var
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import CodeJar from 'src/components/CodeJar.vue'
import { useListenKey } from 'src/composables/listen-key'
import { useUserPerfsStore } from 'src/stores/user-perfs'
import { db } from 'src/utils/db'
import { artifactUnsaved, saveArtifactChanges } from 'src/utils/functions'
import { Artifact } from 'src/utils/types'
import { computed, ref, toRef, watchEffect } from 'vue'
import { useMdPreviewProps } from 'src/composables/md-preview-props'
import { MdPreview } from 'md-editor-v3'

const props = defineProps<{
  artifact: Artifact
}>()

function update(changes: Partial<Artifact>) {
  db.artifacts.update(props.artifact.id, changes)
}
function setIndex(index: number) {
  update({
    currIndex: index,
    tmp: props.artifact.versions[index].text
  })
}
function save() {
  const { artifact } = props
  if (!artifactUnsaved(artifact)) return
  db.artifacts.update(artifact.id, saveArtifactChanges(artifact))
}
const { perfs } = useUserPerfsStore()
useListenKey(toRef(perfs, 'saveArtifactKey'), save)

const mode = ref<'edit' | 'view'>('edit')
const viewable = computed(() => ['markdown', 'md', 'svg', 'txt', 'html'].includes(props.artifact.language))
watchEffect(() => {
  mode.value = viewable.value ? 'view' : 'edit'
})

const mdPreviewProps = useMdPreviewProps()

import { IsTauri, exportFile } from 'src/utils/platform-api'
import { openPath } from '@tauri-apps/plugin-opener'
import { invoke } from '@tauri-apps/api/core'

async function openInBrowser() {
  try {
    const filePath = await invoke<string>('create_temp_html', { htmlContent: props.artifact.tmp })
    await openPath(filePath)
  } catch (error) {
    console.error('Failed to open HTML in browser:', error)
  }
}

function downloadHtml() {
  const fileName = `${props.artifact.id || 'html-artifact'}.html`
  exportFile(fileName, props.artifact.tmp)
}
</script>
