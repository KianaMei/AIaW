<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide">
    <q-card class="column" :style="cardStyle">
      <q-card-section class="html-preview-toolbar row items-center no-wrap q-py-xs q-px-sm">
        <div class="toolbar-title text-subtitle2 ellipsis">{{ title }}</div>
        <q-space />
        <!-- View toggles -->
        <q-btn-toggle
          v-model="viewMode"
          dense
          rounded
          size="sm"
          toggle-color="primary"
          toggle-text-color="white"
          no-caps
          unelevated
          class="toolbar-toggle"
          :options="toggleOptions"
        />
        <q-separator spaced vertical />
        <!-- Capture dropdown -->
        <q-btn flat dense round size="sm" icon="sym_o_photo_camera" :title="$t('messageItem.capture')" class="toolbar-btn" >
          <q-menu>
            <q-list>
              <q-item clickable v-close-popup @click="capture('file')">
                <q-item-section avatar><q-icon name="sym_o_download" /></q-item-section>
                <q-item-section>{{ $t('messageItem.captureToFile') }}</q-item-section>
              </q-item>
              <q-item clickable v-close-popup @click="capture('clipboard')">
                <q-item-section avatar><q-icon name="sym_o_content_copy" /></q-item-section>
                <q-item-section>{{ $t('messageItem.captureToClipboard') }}</q-item-section>
              </q-item>
            </q-list>
          </q-menu>
        </q-btn>
        <!-- Save -->
        <q-btn flat dense round size="sm" icon="sym_o_save" class="toolbar-btn" :title="$t('messageItem.save')" @click="save" />
        <!-- External / Download -->
        <q-btn v-if="IsTauri" flat dense round size="sm" icon="sym_o_open_in_browser" class="toolbar-btn" :title="$t('editArtifact.openExternal')" @click="openExternal" />
        <q-btn flat dense round size="sm" icon="sym_o_download" class="toolbar-btn" :title="$t('editArtifact.download')" @click="download" />
        <q-btn flat dense round size="sm" icon="sym_o_close" class="toolbar-btn" @click="onDialogOK" />
      </q-card-section>
      <q-card-section class="q-pt-none column" style="flex:1; min-height: 0;">
        <div v-if="viewMode === 'split'" class="row no-wrap" style="gap: 8px; height: 100%; min-height: 0;">
          <div class="col" style="min-width: 0; height: 100%;">
            <code-jar :language="lang" :model-value="localHtml" @update:model-value="localHtml = $event" style="height: 100%;" />
          </div>
          <div class="col" style="min-width: 0; height: 100%; background: white;">
            <iframe ref="frameRef" :srcdoc="localHtml" sandbox="allow-scripts allow-same-origin allow-forms" style="width: 100%; height: 100%; border: none; background: white;" title="HTML Preview" />
          </div>
        </div>
        <div v-else-if="viewMode === 'code'" style="height: 100%; min-height: 0;">
          <code-jar :language="lang" :model-value="localHtml" @update:model-value="localHtml = $event" style="height: 100%;" />
        </div>
        <div v-else style="height: 100%; background: white;">
          <iframe ref="frameRef" :srcdoc="localHtml" sandbox="allow-scripts allow-same-origin allow-forms" style="width: 100%; height: 100%; border: none; background: white;" title="HTML Preview" />
        </div>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import CodeJar from 'src/components/CodeJar.vue'
import { useDialogPluginComponent, useQuasar } from 'quasar'
import { IsTauri, exportFile } from 'src/utils/platform-api'
import { invoke } from '@tauri-apps/api/core'
import { openPath } from '@tauri-apps/plugin-opener'
import { toBlob } from 'html-to-image'
import { db } from 'src/utils/db'
import { useI18n } from 'vue-i18n'

const props = defineProps<{
  html: string
  lang?: string
  messageId?: string
  textIndex?: number
  originalMd?: string
  title?: string
}>()

defineEmits([...useDialogPluginComponent.emits])
const { dialogRef, onDialogHide, onDialogOK } = useDialogPluginComponent()
const $q = useQuasar()
const { t } = useI18n()

import { ref, computed } from 'vue'
const localHtml = ref(props.html)
const lang = ref(props.lang || 'html')
const isSmall = computed(() => $q.screen.lt.md)
const viewMode = ref<'split' | 'code' | 'preview'>(isSmall.value ? 'preview' : 'split')
const toggleOptions = computed(() => [
  { label: t('messageItem.htmlPreviewSplit') as string, value: 'split', icon: 'sym_o_splitscreen_left' },
  { label: t('messageItem.htmlPreviewCode') as string, value: 'code', icon: 'sym_o_code' },
  { label: t('messageItem.htmlPreviewPreview') as string, value: 'preview', icon: 'sym_o_preview' }
])
const cardStyle = computed(() => ({
  width: isSmall.value ? '95vw' : '90vw',
  maxWidth: isSmall.value ? '95vw' : '1200px',
  height: isSmall.value ? '85vh' : '80vh'
}))
const title = computed(() => props.title || 'HTML')
const frameRef = ref<HTMLIFrameElement | null>(null)

async function openExternal() {
  try {
    const filePath = await invoke<string>('create_temp_html', { htmlContent: localHtml.value })
    await openPath(filePath)
  } catch (e) {
    console.error('openExternal failed', e)
  }
}

function download() {
  exportFile('html-artifact.html', localHtml.value)
}

async function capture(to: 'file' | 'clipboard') {
  try {
    const docEl = frameRef.value?.contentDocument?.documentElement as HTMLElement | undefined
    if (!docEl) return
    const blob = await toBlob(docEl)
    if (!blob) return
    if (to === 'file') {
      await exportFile('html-preview.png', blob)
    } else {
      const ClipboardItemCtor = (window as any).ClipboardItem
      await navigator.clipboard.write([new ClipboardItemCtor({ 'image/png': blob })])
      $q.notify({ type: 'positive', message: 'Copied image to clipboard' })
    }
  } catch (e) {
    console.error('capture failed', e)
  }
}

async function save() {
  // Only save back to message when context provided
  if (!props.messageId || props.textIndex == null || !props.originalMd) return
  const oldHtml = props.html
  const md = props.originalMd
  // Replace the matching html code fence
  const replaced = replaceHtmlFence(md, oldHtml, localHtml.value)
  if (replaced === md) return
  await db.messages.update(props.messageId, {
    [`contents.${props.textIndex}.text`]: replaced
  } as any)
  $q.notify({ type: 'positive', message: 'Saved' })
}

function replaceHtmlFence(md: string, oldHtml: string, newHtml: string): string {
  const fenceRe = /```([\w-]*)[^\n]*\n([\s\S]*?)```/g
  let match: RegExpExecArray | null
  let lastIndex = 0
  let out = ''
  while ((match = fenceRe.exec(md))) {
    const [full, lang, body] = match
    out += md.slice(lastIndex, match.index)
    if ((lang?.toLowerCase?.() || '') === 'html' && body === oldHtml) {
      out += '```html\n' + newHtml + '\n```'
    } else {
      out += full
    }
    lastIndex = match.index + full.length
  }
  out += md.slice(lastIndex)
  return out
}
</script>

<style scoped>
.html-preview-toolbar {
  align-items: center;
}
.toolbar-title {
  font-size: 16px;
  font-weight: 600;
  line-height: 28px;
}
.toolbar-toggle {
  height: 28px;
  align-items: center;
}
.toolbar-toggle :deep(.q-btn) {
  height: 28px;
  min-height: 28px;
  padding: 0 8px;
  border-radius: 14px;
}
.toolbar-toggle :deep(.q-btn__content) {
  line-height: 1;
}
.toolbar-toggle :deep(.q-btn--active) {
  transform: none;
  box-shadow: none;
  background: var(--a-pri) !important;
  color: var(--a-on-pri) !important;
}
.toolbar-toggle :deep(.q-btn--active),
.toolbar-toggle :deep(.q-btn--active .q-btn__content) {
  height: 28px;
}
.toolbar-btn {
  height: 28px;
  min-height: 28px;
  padding: 0 6px;
}
.toolbar-btn .q-icon, .toolbar-toggle .q-icon {
  font-size: 18px;
  line-height: 1;
}
.html-preview-toolbar :deep(.q-separator--vertical) {
  height: 28px;
}

/* Hover/active theming and mobile fine-tuning */
.toolbar-toggle :deep(.q-btn:not(.q-btn--active):hover) {
  background: var(--a-pri-dim, rgba(0,0,0,.06));
}

@media (max-width: 600px) {
  .toolbar-title { font-size: 14px; line-height: 26px; }
  .toolbar-toggle { height: 26px; }
  .toolbar-toggle :deep(.q-btn) { height: 26px; min-height: 26px; padding: 0 6px; border-radius: 13px; }
  .toolbar-btn { height: 26px; min-height: 26px; padding: 0 4px; }
  .html-preview-toolbar :deep(.q-separator--vertical) { height: 26px; }
  .toolbar-btn .q-icon, .toolbar-toggle .q-icon { font-size: 16px; }
}
</style>
