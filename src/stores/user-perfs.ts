import { MdPreviewProps } from 'md-editor-v3'
import { defineStore } from 'pinia'
import { Dark, extend } from 'quasar'
import { persistentReactive } from 'src/composables/persistent-reactive'
import { Avatar, Model, PlatformEnabled, Provider, ShortcutKey } from 'src/utils/types'
import { models } from 'src/utils/values'
import { watchEffect } from 'vue'

interface Perfs {
  darkMode: boolean | 'auto'
  themeHue: number
  /**
   * @deprecated Legacy field, use providerId instead. Only kept for SetProvider.vue compatibility.
   */
  provider: Provider
  /**
   * @deprecated Legacy field, use modelId instead. Only kept for migration.
   */
  model: Model
  /**
   * @deprecated Legacy field, use systemProviderId instead. Only kept for migration.
   */
  systemProvider: Provider
  /**
   * @deprecated Legacy field, use systemModelId instead. Only kept for migration.
   */
  systemModel: Model
  // Cherry Studio Architecture V2 fields
  providerId?: string // Provider ID
  modelId?: string // Model ID (just the ID, not "provider:modelId")
  systemProviderId?: string
  systemModelId?: string
  userAvatar: Avatar
  autoGenTitle: boolean
  sendKey: 'ctrl+enter' | 'shift+enter' | 'meta+enter' | 'enter'
  messageSelectionBtn: boolean
  codePasteOptimize: boolean
  dialogScrollBtn: PlatformEnabled
  enableShortcutKey: PlatformEnabled
  scrollUpKeyV2?: ShortcutKey
  scrollDownKeyV2?: ShortcutKey
  scrollTopKey?: ShortcutKey
  scrollBottomKey?: ShortcutKey
  switchPrevKeyV2?: ShortcutKey
  switchNextKeyV2?: ShortcutKey
  switchFirstKey?: ShortcutKey
  switchLastKey?: ShortcutKey
  regenerateCurrKey?: ShortcutKey
  editCurrKey?: ShortcutKey
  createDialogKey?: ShortcutKey
  focusDialogInputKey?: ShortcutKey
  saveArtifactKey?: ShortcutKey
  searchDialogKey?: ShortcutKey
  autoFocusDialogInput: PlatformEnabled
  artifactsEnabled: PlatformEnabled
  artifactsAutoExtract: boolean
  artifactsAutoName: boolean
  artifactsReserveOriginal: boolean
  mdPreviewTheme: MdPreviewProps['previewTheme']
  mdCodeTheme: MdPreviewProps['codeTheme']
  mdNoMermaid: MdPreviewProps['noMermaid']
  mdAutoFoldThreshold?: MdPreviewProps['autoFoldThreshold']
  streamingLockBottom: boolean
  messageCatalog: boolean
  showWarnings: boolean
  showErrorLog: boolean
  userInputDebounce: number
  expandReasoningContent: boolean
}

export const useUserPerfsStore = defineStore('user-perfs', () => {
  const defaultPerfs: Perfs = {
    darkMode: 'auto',
    themeHue: 300,
    provider: null,
    model: models.find(m => m.name === 'gpt-5'),
    systemProvider: null,
    systemModel: models.find(m => m.name === 'gpt-5-nano'),
    // Cherry Studio Architecture defaults
    providerId: undefined, // Will be set dynamically based on available providers
    modelId: undefined, // Will be set dynamically based on available models
    systemProviderId: undefined, // Will be set dynamically based on available providers
    systemModelId: undefined, // Will be set dynamically based on available models
    userAvatar: {
      type: 'text',
      text: 'U',
      hue: 300
    },
    autoGenTitle: true,
    sendKey: 'ctrl+enter',
    messageSelectionBtn: true,
    codePasteOptimize: true,
    dialogScrollBtn: 'always',
    enableShortcutKey: 'desktop-only',
    scrollUpKeyV2: { key: 'ArrowUp', withCtrl: true },
    scrollDownKeyV2: { key: 'ArrowDown', withCtrl: true },
    scrollTopKey: { key: 'ArrowUp', withShift: true },
    scrollBottomKey: { key: 'ArrowDown', withShift: true },
    switchPrevKeyV2: { key: 'ArrowLeft', withCtrl: true },
    switchNextKeyV2: { key: 'ArrowRight', withCtrl: true },
    switchFirstKey: { key: 'ArrowLeft', withShift: true },
    switchLastKey: { key: 'ArrowRight', withShift: true },
    regenerateCurrKey: null,
    editCurrKey: null,
    createDialogKey: null,
    focusDialogInputKey: null,
    saveArtifactKey: { key: 'KeyS', withCtrl: true },
    searchDialogKey: null,
    autoFocusDialogInput: 'desktop-only',
    artifactsEnabled: 'desktop-only',
    artifactsAutoExtract: false,
    artifactsAutoName: false,
    artifactsReserveOriginal: false,
    mdPreviewTheme: 'vuepress',
    mdCodeTheme: 'atom',
    mdNoMermaid: false,
    mdAutoFoldThreshold: null,
    streamingLockBottom: true,
    messageCatalog: true,
    showWarnings: false,
    showErrorLog: true,
    userInputDebounce: 30,
    expandReasoningContent: true
  }
  const [perfs, ready] = persistentReactive('#user-perfs', { ...defaultPerfs })

  // ============================================================
  // Migration: Legacy → V2 (One-time upgrade for existing users)
  // ============================================================
  // Convert old provider/model objects to new providerId/modelId strings
  // This runs once on app startup if new fields are missing
  if (!perfs.providerId && perfs.provider) {
    // IMPORTANT: Use provider instance ID, not type
    perfs.providerId = (perfs.provider as any)?.id || undefined
  }
  if (!perfs.modelId && perfs.model) {
    // Store only model ID (e.g., "gpt-5"), not "provider:modelId"
    perfs.modelId = (perfs.model as any)?.id || (perfs.model as any)?.name || undefined
  }
  if (!perfs.systemProviderId && perfs.systemProvider) {
    // IMPORTANT: Use provider instance ID, not type
    perfs.systemProviderId = (perfs.systemProvider as any)?.id || undefined
  }
  if (!perfs.systemModelId && perfs.systemModel) {
    // Store only model ID (e.g., "gpt-5-nano"), not "provider:modelId"
    perfs.systemModelId = (perfs.systemModel as any)?.id || (perfs.systemModel as any)?.name || undefined
  }

  watchEffect(() => {
    Dark.set(perfs.darkMode)
  })
  function restore() {
    Object.assign(perfs, extend(true, {}, defaultPerfs))
  }
  return { perfs, ready, restore }
})
