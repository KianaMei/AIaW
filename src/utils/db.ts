import Dexie from 'dexie'
import { defaultAvatar, genId } from './functions'
import { Workspace, Folder, Dialog, Message, Assistant, Artifact, StoredReactive, InstalledPlugin, AvatarImage, StoredItem, CustomProviderV2 } from './types'
import { AssistantDefaultPrompt, ExampleWsIndexContent } from './templates'
import dexieCloud, { DexieCloudTable } from 'dexie-cloud-addon'
import { DexieDBURL } from './config'
import { i18n } from 'src/boot/i18n'

type Db = Dexie & {
  workspaces: DexieCloudTable<Workspace | Folder, 'id'>
  dialogs: DexieCloudTable<Dialog, 'id'>
  messages: DexieCloudTable<Message, 'id'>
  assistants: DexieCloudTable<Assistant, 'id'>
  artifacts: DexieCloudTable<Artifact, 'id'>
  installedPluginsV2: DexieCloudTable<InstalledPlugin, 'id'>
  reactives: DexieCloudTable<StoredReactive, 'key'>
  avatarImages: DexieCloudTable<AvatarImage, 'id'>
  items: DexieCloudTable<StoredItem, 'id'>
  providers: DexieCloudTable<CustomProviderV2, 'id'>
}

const db = new Dexie('data', { addons: DexieDBURL ? [dexieCloud] : [] }) as Db

if (DexieDBURL) {
  db.cloud.configure({
    databaseUrl: DexieDBURL,
    requireAuth: false,
    customLoginGui: true,
    nameSuffix: false
  })
}
const schema = {
  workspaces: 'id, type, parentId',
  dialogs: 'id, workspaceId',
  messages: 'id, type, dialogId',
  assistants: 'id, workspaceId',
  canvases: 'id, workspaceId', // deprecated
  artifacts: 'id, workspaceId',
  installedPluginsV2: 'key, id',
  reactives: 'key',
  avatarImages: 'id',
  items: 'id, type, dialogId',
  providers: 'id'
}
db.version(6).stores(schema)

// Cherry Studio Architecture Migration - Version 7
db.version(7).stores(schema).upgrade(async tx => {
  console.log('[Migration v7] Starting Cherry Studio architecture migration...')

  try {
    // Import migration utilities
    const { migrateAssistantData, logMigration, needsMigration } = await import('./migration')

    // Migrate assistants table
    const assistants = await tx.table('assistants').toArray()
    let migratedCount = 0

    for (const assistant of assistants) {
      if (needsMigration(assistant)) {
        const { providerId, modelId } = migrateAssistantData(assistant)

        await tx.table('assistants').update(assistant.id, {
          providerId: providerId || 'openai',
          modelId: modelId || 'openai:gpt-4o'
        })

        logMigration('Assistant', {
          id: assistant.id,
          oldProvider: assistant.provider?.type,
          oldModel: assistant.model?.name
        }, {
          providerId,
          modelId
        })

        migratedCount++
      }
    }

    console.log(`[Migration v7] Migrated ${migratedCount} assistants`)

    // Migrate dialogs table (modelOverride -> modelIdOverride)
    const dialogs = await tx.table('dialogs').toArray()
    let dialogsMigratedCount = 0

    for (const dialog of dialogs) {
      if (dialog.modelOverride && !dialog.modelIdOverride) {
        // Find the assistant for this dialog to get provider info
        const assistant = assistants.find(a => a.id === dialog.assistantId)

        if (assistant && assistant.provider) {
          const { generateModelUniqId } = await import('./migration')
          const modelIdOverride = generateModelUniqId(dialog.modelOverride, assistant.provider)

          if (modelIdOverride) {
            await tx.table('dialogs').update(dialog.id, {
              modelIdOverride
            })
            dialogsMigratedCount++
          }
        }
      }
    }

    console.log(`[Migration v7] Migrated ${dialogsMigratedCount} dialogs`)
    console.log('[Migration v7] ✅ Migration completed successfully')
  } catch (error) {
    console.error('[Migration v7] ❌ Migration failed:', error)
    throw error
  }
})

// Provider V2 Migration - Version 8
// REAL DATA MIGRATION: Convert legacy CustomProvider to flat ProviderV2 format
// NO EXTERNAL DEPENDENCIES - conversion logic inlined for clean break from legacy
db.version(8).stores(schema).upgrade(async tx => {
  console.log('[Migration v8] 🔥 Starting REAL Provider data migration...')
  console.log('[Migration v8] Converting legacy nested subprovider format to flat V2 format')

  try {
    const providers = await tx.table('providers').toArray()
    console.log(`[Migration v8] Found ${providers.length} providers to check`)

    let migratedCount = 0
    const newProviders: any[] = []

    for (const oldProvider of providers) {
      // Check if this is legacy format (has subproviders)
      if (oldProvider.subproviders && Array.isArray(oldProvider.subproviders) && oldProvider.subproviders.length > 0) {
        console.log(`[Migration v8] Converting legacy provider: ${oldProvider.name}`)

        // Inline conversion: flatten each subprovider to independent provider
        for (const subprovider of oldProvider.subproviders) {
          if (!subprovider.provider) continue

          const providerType = subprovider.provider.type?.startsWith('custom:')
            ? 'openai-compatible'
            : (subprovider.provider.type || 'openai-compatible')

          newProviders.push({
            id: `${oldProvider.id}-${subprovider.id}`,
            name: `${oldProvider.name} (${subprovider.id})`,
            type: providerType,
            apiHost: subprovider.provider.settings?.apiHost || '',
            apiKey: subprovider.provider.settings?.apiKey || '',
            models: Object.keys(subprovider.modelMap || {}),
            enabled: true,
            settings: subprovider.provider.settings || {},
            avatar: oldProvider.avatar
          })
        }

        // Handle fallback provider if exists
        if (oldProvider.fallbackProvider) {
          const fallbackType = oldProvider.fallbackProvider.type?.startsWith('custom:')
            ? 'openai-compatible'
            : (oldProvider.fallbackProvider.type || 'openai-compatible')

          newProviders.push({
            id: `${oldProvider.id}-fallback`,
            name: `${oldProvider.name} (Fallback)`,
            type: fallbackType,
            apiHost: oldProvider.fallbackProvider.settings?.apiHost || '',
            apiKey: oldProvider.fallbackProvider.settings?.apiKey || '',
            models: [],
            enabled: true,
            settings: oldProvider.fallbackProvider.settings || {},
            avatar: oldProvider.avatar
          })
        }

        migratedCount++
      } else if (!oldProvider.type) {
        // Old format without type field - normalize to V2
        console.log(`[Migration v8] Normalizing provider without type: ${oldProvider.name}`)

        newProviders.push({
          id: oldProvider.id,
          name: oldProvider.name,
          type: 'openai-compatible',
          apiHost: oldProvider.apiHost || '',
          apiKey: oldProvider.apiKey || '',
          models: oldProvider.models || [],
          enabled: oldProvider.enabled !== false,
          settings: oldProvider.settings || {},
          avatar: oldProvider.avatar
        })

        migratedCount++
      } else {
        // Already in V2 format - keep as is
        newProviders.push(oldProvider)
      }
    }

    // CRITICAL: Clear old data and write new data
    if (migratedCount > 0) {
      console.log(`[Migration v8] Clearing ${providers.length} old providers`)
      await tx.table('providers').clear()

      console.log(`[Migration v8] Writing ${newProviders.length} new V2 providers`)
      await tx.table('providers').bulkAdd(newProviders)

      console.log(`[Migration v8] ✅ Migrated ${migratedCount} providers to V2 format`)
      console.log('[Migration v8] ✅ Database now contains ONLY V2 format - NO conversion layer needed!')
    } else {
      console.log('[Migration v8] All providers already in V2 format, no migration needed')
    }
  } catch (error) {
    console.error('[Migration v8] ❌ Migration failed:', error)
    throw error
  }
})

// Provider order initialization - Version 9
// One-time migration to assign a stable 'order' to custom providers
// so UI sorting does not fluctuate across renders.
db.version(9).stores(schema).upgrade(async tx => {
  try {
    console.log('[Migration v9] Initializing provider.order for custom providers without it...')
    const table: any = tx.table('providers')
    const providers: any[] = await table.toArray()
    const defined = providers.filter(p => typeof p?.order === 'number')
    const undefinedOnes = providers.filter(p => p?.order == null)
    if (undefinedOnes.length === 0) {
      console.log('[Migration v9] No providers need order initialization')
      return
    }

    // Start after current maximum (or 0), step by 100 for easy future insertions
    const maxOrder = defined.length ? Math.max(...defined.map(p => p.order as number)) : -100
    let nextOrder = maxOrder + 100

    // Deterministic assignment for legacy items: sort by display name then id
    undefinedOnes.sort((a, b) => ((a?.name || a?.id || '').localeCompare(b?.name || b?.id || '')))

    for (const p of undefinedOnes) {
      await table.update(p.id, { order: nextOrder })
      nextOrder += 100
    }
    console.log(`[Migration v9] Initialized order for ${undefinedOnes.length} providers`)
  } catch (e) {
    console.error('[Migration v9] Failed to initialize provider order:', e)
    throw e
  }
})

// Additional proactive normalization for users who skipped v8 upgrade somehow
async function normalizeProvidersOnce() {
  const flagKey = 'providersV2Normalized'
  try {
    if (localStorage.getItem(flagKey) === '1') return
  } catch {}

  try {
    const all = await db.table('providers').toArray()
    const needs = all.filter((p: any) => p && (('subproviders' in p) || ('provider' in p) || (Array.isArray(p?.models) && p.models.some((m: any) => typeof m !== 'string'))))
    for (const p of needs) {
      const normalized: any = {
        id: p.id,
        name: p.name || 'Custom Provider',
        type: p.type || p?.provider?.type || 'openai-compatible',
        apiHost: p.apiHost || p?.provider?.settings?.apiHost || '',
        apiKey: p.apiKey || p?.provider?.settings?.apiKey || '',
        models: Array.isArray(p.models) ? p.models.map((m: any) => (typeof m === 'string' ? m : m?.id)).filter(Boolean) : [],
        isSystem: false as const,
        enabled: p.enabled !== false,
        settings: p.settings || {},
        avatar: p.avatar || { type: 'icon', icon: 'sym_o_dashboard_customize', hue: Math.floor(Math.random() * 360) }
      }
      await db.table('providers').put(normalized)
    }
    try { localStorage.setItem(flagKey, '1') } catch {}
  } catch (e) {
    console.warn('[db.providers.normalize] Failed to normalize legacy providers', e)
  }
}

// Run normalization after DB is ready
;(async () => {
  try { await db.open() } catch {}
  await normalizeProvidersOnce()
})()

// Runtime guard: normalize provider records to V2 shape when reading from DB
// 常规情况下应由 v8 迁移扁平化完毕；此处仅作为安全兜底，避免远端同步等异常写入旧结构导致 UI 崩溃
let warnedLegacyOnce = false
// Reduce noise: only show a single, low-severity log in dev; debug otherwise
const __dev__ = (() => {
  try {
    // Vite / Quasar dev flag
    // @ts-ignore
    return typeof import.meta !== 'undefined' && !!(import.meta as any).env?.DEV
  } catch { return false }
})()

db.providers.hook('reading', (provider: any) => {
  if (!provider || typeof provider !== 'object') return provider

  // Ensure defaults for V2 custom provider records
  const ensureDefaults = (p: any) => {
    p.isSystem = false
    p.enabled = p.enabled !== false
    p.settings ||= {}
    // Normalize models: allow string[] only
    if (Array.isArray(p.models)) {
      p.models = p.models.map((m: any) => (typeof m === 'string' ? m : m?.id)).filter(Boolean)
    } else {
      p.models = []
    }
    p.type ||= 'openai-compatible'
    p.avatar ||= { type: 'icon', icon: 'sym_o_dashboard_customize', hue: Math.floor(Math.random() * 360) }
    // Ensure order field exists (for v10+ sorting)
    p.order ??= Date.now()
    return p
  }

  // Already V2-like
  if ('isSystem' in provider && !('subproviders' in provider)) {
    return ensureDefaults(provider)
  }

  // Legacy structure detected – best-effort normalization (non-destructive)
  if (!warnedLegacyOnce) {
    warnedLegacyOnce = true
    const log = __dev__ ? console.info : console.debug
    log('[db.providers.normalize] Legacy provider shape detected, applying runtime normalization', {
      id: provider?.id,
      name: provider?.name
    })
  }

  const normalized = ensureDefaults({
    id: provider?.id,
    name: provider?.name || 'Custom Provider',
    type: provider?.type || provider?.provider?.type || 'openai-compatible',
    apiHost: provider?.apiHost || provider?.provider?.settings?.apiHost || '',
    apiKey: provider?.apiKey || provider?.provider?.settings?.apiKey || '',
    models: provider?.models,
    modelConfigs: provider?.modelConfigs, // Preserve modelConfigs for v9+
    enabled: provider?.enabled,
    settings: provider?.settings,
    avatar: provider?.avatar,
    order: provider?.order // Preserve order if exists
  })

  return normalized
})

const defaultModelSettings = {
  temperature: 0.6,
  topP: 1,
  presencePenalty: 0,
  frequencyPenalty: 0,
  maxSteps: 4,
  maxRetries: 1
}

const { t } = i18n.global

db.on.populate.subscribe(() => {
  db.on.ready.subscribe((db: Db) => {
    const initialWorkspaceId = genId()
    const initialAssistantId = genId()
    db.workspaces.add({
      id: initialWorkspaceId,
      name: t('db.exampleWorkspace'),
      avatar: { type: 'icon', icon: 'sym_o_menu_book' },
      type: 'workspace',
      parentId: '$root',
      prompt: '',
      defaultAssistantId: initialAssistantId,
      indexContent: ExampleWsIndexContent,
      vars: {},
      listOpen: {
        assistants: true,
        artifacts: false,
        dialogs: true
      }
    } as Workspace)
    db.assistants.add({
      id: initialAssistantId,
      name: t('db.defaultAssistant'),
      avatar: defaultAvatar('AI'),
      workspaceId: initialWorkspaceId,
      prompt: '',
      promptTemplate: AssistantDefaultPrompt,
      promptVars: [],
      provider: null,
      model: null,
      modelSettings: { ...defaultModelSettings },
      plugins: {},
      promptRole: 'system',
      stream: true
    })
    db.reactives.add({
      key: '#user-data',
      value: {
        lastWorkspaceId: initialWorkspaceId
      }
    })
  }, false)
})

// Migration
db.assistants.hook('reading', assistant => {
  assistant.promptRole ??= 'system'
  assistant.stream ??= true

  // Migration to v1.8
  const { modelSettings } = assistant
  if ('maxTokens' in modelSettings) {
    modelSettings.maxOutputTokens = modelSettings.maxTokens as number
    delete modelSettings.maxTokens
  }

  // Migration to Cherry Studio architecture (v7)
  // Ensure new fields exist for assistants created before migration
  if (!assistant.providerId && assistant.provider) {
    import('./migration').then(({ mapOldTypeToProviderId }) => {
      assistant.providerId = mapOldTypeToProviderId(assistant.provider.type)
    })
  }

  if (!assistant.modelId && assistant.model && assistant.provider) {
    import('./migration').then(({ generateModelUniqId, extractModelId }) => {
      const uniq = generateModelUniqId(assistant.model, assistant.provider)
      assistant.modelId = uniq ? extractModelId(uniq) : undefined
    })
  }

  return assistant
})
// Migration to v1.4
db.workspaces.hook('reading', workspace => {
  if (workspace.type === 'workspace') {
    workspace.listOpen ??= {
      assistants: true,
      artifacts: false,
      dialogs: true
    }
  }
  return workspace
})

db.messages.hook('reading', message => {
  const usage = message.usage as any
  if (usage && 'promptTokens' in usage) {
    message.usage = {
      inputTokens: usage.promptTokens,
      outputTokens: usage.completionTokens,
      totalTokens: usage.totalTokens
    }
  }
  return message
})

// Normalize dialog overrides to Cherry-style separated fields when reading
db.dialogs.hook('reading', (dialog: any) => {
  if (dialog && typeof dialog === 'object' && dialog.modelIdOverride && typeof dialog.modelIdOverride === 'string') {
    if (dialog.modelIdOverride.includes(':')) {
      // Split provider:model into separate fields
      const [pid, ...rest] = dialog.modelIdOverride.split(':')
      const mid = rest.join(':')
      if (pid && mid) {
        dialog.providerIdOverride ||= pid
        dialog.modelIdOverride = mid
      }
    }
  }
  return dialog
})

export { schema, db, defaultModelSettings }
export type { Db }
