import { db } from 'src/utils/db'
import { genId } from 'src/utils/functions'
import { Dialog, Workspace, Assistant } from 'src/utils/types'
import { useProvidersStore } from 'src/stores/providers'
import { Ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'

export function useCreateDialog(workspace: Ref<Workspace>) {
  const router = useRouter()
  const { t } = useI18n()

  async function createDialog(props: Partial<Dialog> = {}) {
    const id = genId()
    const messageId = genId()
    // Determine default assistant and default model overrides
    // Rule: Always prefer the first GLOBAL assistant (workspaceId === '$root')
    let assistantId: string = undefined
    let providerIdOverride: string = undefined
    let modelIdOverride: string = undefined

    try {
      // 1) Prefer first GLOBAL assistant
      const globals: Assistant[] = await db.assistants
        .where('workspaceId').equals('$root')
        .toArray()
      const firstGlobal = globals && globals[0]
      if (firstGlobal) {
        assistantId = firstGlobal.id
        providerIdOverride = firstGlobal.providerId || undefined
        modelIdOverride = firstGlobal.modelId || undefined
      }
      // 2) If no global assistant exists, fallback to workspace default or first assistant (legacy behavior)
      if (!assistantId) {
        const fallbackId = workspace.value.defaultAssistantId
        if (fallbackId) {
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          const a: Assistant = await db.assistants.get(fallbackId)
          if (a) {
            assistantId = a.id
            providerIdOverride = a.providerId || undefined
            modelIdOverride = a.modelId || undefined
          }
        } else {
          const list: Assistant[] = await db.assistants
            .where('workspaceId')
            .anyOf(workspace.value.id, '$root')
            .toArray()
          const first = list && list[0]
          if (first) {
            assistantId = first.id
            providerIdOverride = first.providerId || undefined
            modelIdOverride = first.modelId || undefined
          }
        }
      }
    } catch {}

    await db.transaction('rw', db.dialogs, db.messages, () => {
      db.dialogs.add({
        id,
        workspaceId: workspace.value.id,
        name: t('createDialog.newDialog'),
        msgTree: { $root: [messageId], [messageId]: [] },
        msgRoute: [],
        assistantId,
        providerIdOverride,
        modelIdOverride,
        inputVars: {},
        ...props
      })
      db.messages.add({
        id: messageId,
        dialogId: id,
        type: 'user',
        contents: [{
          type: 'user-message',
          text: '',
          items: []
        }],
        status: 'inputing'
      })
    })
    router.push(`/workspaces/${workspace.value.id}/dialogs/${id}`)
  }
  return { createDialog }
}
