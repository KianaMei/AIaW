<template>
  <q-list>
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
        <q-icon name="sym_o_add_comment" />
      </q-item-section>
      <q-item-section>
        {{ $t('dialogList.createDialog') }}
      </q-item-section>
    </q-item>
    <q-item
      v-for="dialog in [...dialogs].reverse()"
      :key="dialog.id"
      clickable
      :to="{ path: `/workspaces/${workspace.id}/dialogs/${dialog.id}`, query: $route.query }"
      active-class="bg-sec-c text-on-sec-c"
      item-rd
      min-h="40px"
    >
      <q-item-section>
        {{ dialog.name }}
      </q-item-section>
      <q-item-section side>
        <q-badge class="dialog-count-badge">{{ branchMessageCount(dialog) }}</q-badge>
      </q-item-section>
      <q-menu
        context-menu
      >
        <q-list style="min-width: 100px">
          <menu-item
            icon="sym_o_edit"
            :label="$t('dialogList.renameTitle')"
            @click="renameItem(dialog)"
          />
          <menu-item
            icon="sym_o_auto_fix"
            :label="$t('dialogList.summarizeDialog')"
            @click.stop="generateTitle(dialog)"
          />
          <menu-item
            icon="sym_o_content_copy"
            :label="$t('dialogList.copyContent')"
            @click.stop="copyDialogContent(dialog)"
          />
          <menu-item
            icon="sym_o_move_item"
            :label="$t('dialogList.moveTo')"
            @click="moveItem(dialog)"
          />
          <menu-item
            icon="sym_o_delete"
            :label="$t('dialogList.delete')"
            @click="deleteItem(dialog)"
            hover:text-err
          />
        </q-list>
      </q-menu>
    </q-item>
  </q-list>
</template>

<script setup lang="ts">
import { useQuasar, copyToClipboard } from 'quasar'
import { db } from 'src/utils/db'
import { isPlatformEnabled } from 'src/utils/functions'
import { Dialog, Workspace } from 'src/utils/types'
import { dialogOptions } from 'src/utils/values'
import { inject, Ref, toRef } from 'vue'
import { useI18n } from 'vue-i18n'
import SelectWorkspaceDialog from './SelectWorkspaceDialog.vue'
import { useCreateDialog } from 'src/composables/create-dialog'
import MenuItem from './MenuItem.vue'
import { useUserPerfsStore } from 'src/stores/user-perfs'
import { useListenKey } from 'src/composables/listen-key'
import { generateText } from 'ai'
import { GenDialogTitle, DialogContent } from 'src/utils/templates'
import { engine } from 'src/utils/template-engine'
import { useGetModelV2 } from 'src/composables/get-model-v2'

const { t, locale } = useI18n()
const workspace: Ref<Workspace> = inject('workspace')
const dialogs: Ref<Dialog[]> = inject('dialogs')

const $q = useQuasar()
const { getSdkModelBy } = useGetModelV2()

const { createDialog } = useCreateDialog(workspace)
async function addItem() {
  await createDialog()
}

// Compute message count for the current branch of a dialog (follows msgRoute)
function branchMessageCount(dialog: Dialog): number {
  try {
    const tree = dialog.msgTree || {}
    const route = dialog.msgRoute || []
    let node = '$root'
    let count = 0
    let idx = 0
    while (true) {
      const children: string[] = tree[node] || []
      const r = route[idx] ?? 0
      if (!children[r]) break
      node = children[r]
      count++
      idx++
    }
    // Only count assistant messages (branch alternates: user, assistant, user, ...)
    return Math.floor(count / 2)
  } catch {
    return 0
  }
}

async function generateTitle(dialog: Dialog) {
  try {
    // 获取对话的消息
    const messages = await db.messages
      .where('dialogId')
      .equals(dialog.id)
      .toArray()
    
    if (messages.length === 0) {
      $q.notify({ message: '该对话没有消息', color: 'warning' })
      return
    }
    
    // 获取所有非输入状态的消息内容（提取文本）
    const contents = messages
      .filter(msg => msg.status !== 'inputing')
      .flatMap(msg => msg.contents || [])
      .filter(content => content.type === 'user-message' || content.type === 'assistant-message')
    
    if (contents.length === 0) {
      $q.notify({ message: '对话内容为空', color: 'warning' })
      return
    }
    
    // 获取系统模型
    const lm = await getSdkModelBy(perfs.systemProviderId, perfs.systemModelId)
    if (!lm) {
      $q.notify({ 
        message: t('dialogView.errors.systemModelNotConfigured', '系统模型未配置'), 
        color: 'negative' 
      })
      return
    }
    
    // 生成标题
    const { text } = await generateText({
      model: lm,
      prompt: await engine.parseAndRender(GenDialogTitle, {
        contents,
        lang: locale.value
      })
    })
    
    // 更新对话标题
    await db.dialogs.update(dialog.id, { name: text.trim() })
    $q.notify({ message: '标题已生成', color: 'positive', timeout: 1000 })
  } catch (e) {
    console.error('Generate title error:', e)
    $q.notify({ message: t('dialogView.summarizeFailed'), color: 'negative' })
  }
}

async function copyDialogContent(dialog: Dialog) {
  try {
    // 获取对话的消息
    const messages = await db.messages
      .where('dialogId')
      .equals(dialog.id)
      .toArray()
    
    if (messages.length === 0) {
      $q.notify({ message: '该对话没有消息', color: 'warning' })
      return
    }
    
    // 获取所有非输入状态的消息内容（提取文本）
    const contents = messages
      .filter(msg => msg.status !== 'inputing')
      .flatMap(msg => msg.contents || [])
      .filter(content => content.type === 'user-message' || content.type === 'assistant-message')
    
    // 复制到剪贴板
    await copyToClipboard(await engine.parseAndRender(DialogContent, {
      contents,
      title: dialog.name
    }))
    
    $q.notify({ message: '内容已复制', color: 'positive', timeout: 1000 })
  } catch (e) {
    console.error('Copy content error:', e)
    $q.notify({ message: '复制失败', color: 'negative' })
  }
}

function renameItem({ id, name }) {
  $q.dialog({
    title: t('dialogList.renameTitle'),
    prompt: {
      model: name,
      type: 'text',
      label: t('dialogList.title'),
      isValid: v => v.trim() && v !== name
    },
    cancel: true,
    ...dialogOptions
  }).onOk(newName => {
    db.dialogs.update(id, { name: newName.trim() })
  })
}
function moveItem({ id }) {
  $q.dialog({
    component: SelectWorkspaceDialog,
    componentProps: {
      accept: 'workspace'
    }
  }).onOk(workspaceId => {
    db.dialogs.update(id, { workspaceId })
  })
}
function deleteItem({ id, name }) {
  $q.dialog({
    title: t('dialogList.deleteConfirmTitle'),
    message: t('dialogList.deleteConfirmMessage', { name }),
    cancel: true,
    ok: {
      label: t('dialogList.deleteConfirmOk'),
      color: 'err',
      flat: true
    },
    ...dialogOptions
  }).onOk(() => {
    db.transaction('rw', db.dialogs, db.messages, db.items, async () => {
      await db.dialogs.delete(id)
      await db.messages.where('dialogId').equals(id).delete()
      await db.items.where('dialogId').equals(id).delete()
    })
  })
}

const { perfs } = useUserPerfsStore()

if (isPlatformEnabled(perfs.enableShortcutKey)) {
  useListenKey(toRef(perfs, 'createDialogKey'), addItem)
}
</script>

<style scoped>
.dialog-count-badge {
  font-size: 11px;
  line-height: 14px;
  height: 16px;
  padding: 0 6px;
  border-radius: 8px;
  background-color: var(--a-sur-c-high);
  color: var(--a-on-sur-var);
  border: 1px solid var(--a-sur-c-highest);
  box-shadow: none;
  font-weight: 500;
}
</style>
