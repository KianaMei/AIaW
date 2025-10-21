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
    let assistantId: string = workspace.value.defaultAssistantId
    let providerIdOverride: string = undefined
    let modelIdOverride: string = undefined

    try {
      if (assistantId) {
        // Read the assistant to fetch its provider/model defaults
        // safe outside transaction (read-only)
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        const a: Assistant = await db.assistants.get(assistantId)
        if (a) {
          providerIdOverride = a.providerId || undefined
          modelIdOverride = a.modelId || undefined
        }
      } else {
        // Fallback: pick the first assistant in current workspace or $root
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
    } catch {}

    // Final fallback: if no provider/model resolved from assistant, choose first enabled provider & its first model
    if (!providerIdOverride || !modelIdOverride) {
      try {
        const providersStore = useProvidersStore()
        const providers = providersStore.enabledProviders || []
        const withModels = providers.filter(p => (providersStore.getModelsByProvider(p.id) || []).length > 0)
        if (withModels.length > 0) {
          const pid = withModels[0].id
          const models = providersStore.getModelsByProvider(pid)
          if (models && models.length > 0) {
            providerIdOverride ||= pid
            modelIdOverride ||= models[0].id
          }
        }
      } catch {}
    }

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
