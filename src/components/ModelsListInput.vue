<template>
  <div class="models-list-input">
    <!-- Header with count and actions -->
    <div class="models-header">
      <div class="models-count">
        <q-icon name="sym_o_neurology" size="18px" class="q-mr-xs" />
        <span class="text-caption text-weight-medium">
          models ({{ selectedModels.length }})
        </span>
      </div>
      <div class="models-actions">
        <q-btn
          flat
          dense
          round
          icon="sym_o_search"
          size="sm"
          @click="showSearch = !showSearch"
        />
        <q-btn
          class="action-btn"
          color="primary"
          unelevated
          icon="sym_o_add"
          label="添加模型"
          size="sm"
          :loading="fetchingModels"
          @click="showAddDialog = true"
        />
        <q-btn
          class="action-btn"
          color="negative"
          outline
          icon="sym_o_delete_sweep"
          label="全部清除"
          size="sm"
          :disable="selectedModels.length === 0"
          @click="clearAllModels"
        />
      </div>
    </div>

    <!-- Search bar (collapsible) -->
    <div v-if="showSearch" class="q-mb-sm">
      <q-input
        v-model="searchText"
        outlined
        dense
        :placeholder="$t('selectModel.search')"
        clearable
      >
        <template v-slot:prepend>
          <q-icon name="sym_o_search" />
        </template>
      </q-input>
    </div>

    <!-- Selected models list -->
    <div class="models-list">
      <q-list dense separator>
        <q-item
          v-for="modelId in filteredSelectedModels"
          :key="`${modelId}-${capabilitiesRefreshKey}`"
          class="model-item"
        >
          <q-item-section avatar>
            <q-avatar size="32px">
              <img v-if="iconForSelected(modelId)" :src="iconForSelected(modelId)" />
              <q-icon v-else name="sym_o_neurology" size="20px" />
            </q-avatar>
          </q-item-section>

          <q-item-section>
            <q-item-label>{{ getModelName(modelId) }}</q-item-label>
            <q-item-label caption>{{ modelId }}</q-item-label>
          </q-item-section>

          <!-- Capability badges -->
          <q-item-section side>
            <div class="capability-badges">
              <div
                v-for="cap in getModelCapabilities(modelId)"
                :key="cap.icon"
                class="capability-dot"
                :class="`cap-${cap.color}`"
              >
                <q-icon :name="cap.icon" size="11px" color="white" />
                <q-tooltip>{{ cap.label }}</q-tooltip>
              </div>
            </div>
          </q-item-section>

          <!-- Settings icon -->
          <q-item-section side style="min-width: 40px">
            <q-btn
              flat
              dense
              round
              icon="sym_o_settings"
              size="sm"
              @click="showModelSettings(modelId)"
            >
              <q-tooltip>模型设置</q-tooltip>
            </q-btn>
          </q-item-section>

          <!-- Remove button -->
          <q-item-section side style="min-width: 40px">
            <q-btn
              flat
              dense
              round
              icon="sym_o_remove"
              size="sm"
              color="negative"
              @click="removeModel(modelId)"
            >
              <q-tooltip>移除模型</q-tooltip>
            </q-btn>
          </q-item-section>
        </q-item>

        <!-- Empty state -->
        <q-item v-if="selectedModels.length === 0">
          <q-item-section class="text-center text-grey-6">
            <div class="q-py-md">
              <q-icon name="sym_o_neurology" size="48px" class="q-mb-sm" />
              <div>暂无选择的模型</div>
              <div class="text-caption">点击上方"添加模型"按钮选择模型</div>
            </div>
          </q-item-section>
        </q-item>
      </q-list>
    </div>

    <!-- Add models dialog -->
    <q-dialog v-model="showAddDialog">
      <q-card style="min-width: 500px">
        <q-card-section>
          <div class="text-h6">添加模型</div>
        </q-card-section>

        <q-card-section>
          <q-input
            v-model="addSearchText"
            outlined
            dense
            placeholder="搜索模型..."
            clearable
            autofocus
            :disable="fetchingModels"
          >
            <template v-slot:prepend>
              <q-icon name="sym_o_search" />
            </template>
          </q-input>

          <!-- Manual add -->
          <div class="row items-center q-gutter-sm q-mt-sm">
            <q-input v-model="manualModelId" dense outlined placeholder="手动输入模型 ID (例如: ep-20250611114552-z45kg)" class="col">
              <template v-slot:prepend>
                <q-icon name="sym_o_edit" />
              </template>
            </q-input>
            <q-btn
              color="primary"
              unelevated
              :disable="!manualModelId"
              label="添加"
              @click="addManualModel"
            />
          </div>
        </q-card-section>

        <q-card-section class="q-pt-none" style="max-height: 400px; overflow-y: auto">
          <!-- Loading state -->
          <div v-if="fetchingModels" class="text-center q-pa-md">
            <q-spinner color="primary" size="40px" />
            <div class="text-caption q-mt-md">正在获取模型列表...</div>
          </div>

          <!-- Models list -->
          <q-list v-else dense separator>
            <q-item
              v-for="model in filteredAvailableModels"
              :key="model.value"
              clickable
              v-ripple
              @click="addModel(model.value)"
              :disable="selectedModels.includes(model.value) || addingModelIds.has(model.value)"
            >
              <q-item-section avatar>
                <q-avatar size="32px">
                  <img v-if="iconForName(model.label) || iconForName(model.value)" :src="iconForName(model.label) || iconForName(model.value)" />
                  <q-icon v-else name="sym_o_neurology" size="20px" />
                </q-avatar>
              </q-item-section>

              <q-item-section>
                <q-item-label>{{ model.label }}</q-item-label>
                <q-item-label caption>{{ model.value }}</q-item-label>
              </q-item-section>

              <q-item-section side>
                <q-spinner
                  v-if="addingModelIds.has(model.value)"
                  color="primary"
                  size="20px"
                />
                <q-icon
                  v-else-if="selectedModels.includes(model.value)"
                  name="sym_o_check"
                  color="positive"
                />
              </q-item-section>
            </q-item>

            <!-- Empty state -->
            <q-item v-if="filteredAvailableModels.length === 0">
              <q-item-section class="text-center text-grey-6 q-pa-md">
                未找到模型
              </q-item-section>
            </q-item>
          </q-list>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="关闭" color="primary" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useProvidersV2Store } from 'src/stores/providers-v2'
import { ModelService } from 'src/services/ModelService'
import { useQuasar } from 'quasar'
import ModelSettingsDialog from './ModelSettingsDialog.vue'
import { Model } from 'src/utils/types'

const providersStore = useProvidersV2Store()
const $q = useQuasar()

const props = defineProps<{
  providerId?: string // Provider ID for fetching models
}>()

const model = defineModel<string[]>({ default: [] })

const showSearch = ref(false)
const searchText = ref('')
const showAddDialog = ref(false)
const addSearchText = ref('')
const fetchingModels = ref(false)
const fetchedModels = ref<string[]>([]) // Models fetched from API - no cache, refreshed every time
const addingModelIds = ref<Set<string>>(new Set()) // Track models being added to prevent duplicates
const capabilitiesRefreshKey = ref(0) // Force refresh key for capabilities

// Selected models
const selectedModels = computed(() => model.value || [])

// Filtered selected models (for search)
const filteredSelectedModels = computed(() => {
  if (!searchText.value) return selectedModels.value

  const search = searchText.value.toLowerCase()
  return selectedModels.value.filter(id => {
    const name = getModelName(id)
    return id.toLowerCase().includes(search) || name.toLowerCase().includes(search)
  })
})

// Available models - combine fetched models AND selected models to ensure we have data for both
const availableModels = computed(() => {
  // Add dependency on customProviders to trigger re-computation when providers update
  // This ensures the component updates when modelConfigs change
  const _trigger = providersStore.customProviders.length

  // Combine fetched models and currently selected models to ensure we have full coverage
  const allModelIds = new Set([...fetchedModels.value, ...selectedModels.value])
  const modelIds = Array.from(allModelIds)

  // Get provider to pass to ModelService
  const provider = props.providerId ? providersStore.getProviderById(props.providerId) : null

  return modelIds.map(modelId => {
    // Try to get full model info with provider context
    const modelInfo = provider
      ? ModelService.getModelByUniqId(`${props.providerId}:${modelId}`, provider)
      : ModelService.getModelByUniqId(`${props.providerId}:${modelId}`)

    if (!modelInfo) {
      // Fallback: just use the ID
      return { label: modelId, value: modelId, inputTypes: null }
    }
    return {
      label: modelInfo.name,
      value: modelInfo.id,
      inputTypes: modelInfo.inputTypes
    }
  })
})

// ---- Model icon mapping (by name/prefix) ----
function iconForName(modelName?: string): string | null {
  if (!modelName) return null
  const name = modelName.toLowerCase()
  if (name.includes('gpt') || name.includes('o1') || name.includes('o3') || name.includes('o4')) return '/icons/providers/openai.svg'
  if (name.includes('claude')) return '/icons/providers/anthropic.svg'
  if (name.includes('gemini')) return '/icons/providers/google.svg'
  if (name.includes('deepseek')) return '/icons/providers/deepseek.svg'
  if (name.includes('grok')) return '/icons/providers/xai.svg'
  return null
}

function iconForSelected(modelId: string): string | null {
  const obj = availableModels.value.find(m => m.value === modelId)
  return (obj && iconForName(obj.label)) || iconForName(modelId)
}

// Filtered available models (for add dialog)
const filteredAvailableModels = computed(() => {
  if (!addSearchText.value) return availableModels.value

  const search = addSearchText.value.toLowerCase()
  return availableModels.value.filter(m => {
    return m.label.toLowerCase().includes(search) || m.value.toLowerCase().includes(search)
  })
})

// Fetch models when dialog opens - ALWAYS fetch, no cache
watch(showAddDialog, async (isOpen) => {
  if (isOpen && props.providerId) {
    // Clear previous results and fetch fresh data every time
    fetchedModels.value = []
    await fetchProviderModels()
  }
})

// Fetch models from provider API
async function fetchProviderModels() {
  if (!props.providerId) return

  // Prevent duplicate requests
  if (fetchingModels.value) {
    // console.log('[fetchProviderModels] Already fetching, skipping duplicate request')
    return
  }

  fetchingModels.value = true
  try {
    const result = await providersStore.fetchProviderModels(props.providerId)
    // Ensure we have a valid array, or use empty array
    fetchedModels.value = Array.isArray(result.models) ? result.models : []

    if (result.source === 'static' && result.error) {
      $q.notify({
        message: `使用静态模型列表（${result.models.length}个）\n原因: ${result.error}`,
        type: 'warning',
        position: 'top',
        timeout: 4000,
        html: true
      })
    }
  } catch (error: any) {
    // On error, keep fetchedModels as empty array (set in watch)
    $q.notify({
      message: `获取模型失败: ${error.message}`,
      type: 'negative',
      position: 'top'
    })
  } finally {
    fetchingModels.value = false
  }
}

// Manual add model id
const manualModelId = ref('')
function addManualModel() {
  const id = manualModelId.value.trim()
  if (!id) return
  addModel(id)
  manualModelId.value = ''
}

// Get model display name
function getModelName(modelId: string): string {
  const model = availableModels.value.find(m => m.value === modelId)
  return model ? model.label : modelId
}

// Get model capabilities with proper icons
function getModelCapabilities(modelId: string): Array<{ icon: string; color: string; label: string }> {
  const caps: Array<{ icon: string; color: string; label: string }> = []

  // Get provider to pass to ModelService
  const provider = props.providerId ? providersStore.getProviderById(props.providerId) : null

  // Get model info directly to ensure we have the latest inputTypes
  const modelInfo = provider
    ? ModelService.getModelByUniqId(`${props.providerId}:${modelId}`, provider)
    : null

  // console.log('[getModelCapabilities] Model ID:', modelId)
  // console.log('[getModelCapabilities] Model info:', modelInfo)
  // console.log('[getModelCapabilities] InputTypes:', modelInfo?.inputTypes)

  if (!modelInfo || !modelInfo.inputTypes) {
    // console.log('[getModelCapabilities] No inputTypes found, returning empty caps')
    return caps
  }

  const userInputTypes = modelInfo.inputTypes.user || []
  // console.log('[getModelCapabilities] User input types:', userInputTypes)

  // Vision capability - supports image input (check for 'image/*' pattern)
  if (userInputTypes.some(type => type.startsWith('image/'))) {
    // console.log('[getModelCapabilities] ✅ Adding vision capability')
    caps.push({ icon: 'sym_o_visibility', color: 'green', label: '视觉能力' })
  }

  // Audio capability - supports audio input (check for 'audio/*' pattern)
  if (userInputTypes.some(type => type.startsWith('audio/'))) {
    caps.push({ icon: 'sym_o_mic', color: 'blue', label: '语音能力' })
  }

  // Video capability - supports video input (check for 'video/*' pattern)
  if (userInputTypes.some(type => type.startsWith('video/'))) {
    caps.push({ icon: 'sym_o_videocam', color: 'purple', label: '视频能力' })
  }

  // console.log('[getModelCapabilities] Final caps:', caps)
  return caps
}

// Add model
function addModel(modelId: string) {
  // Prevent adding if already selected or currently being added
  if (selectedModels.value.includes(modelId) || addingModelIds.value.has(modelId)) {
    return
  }

  // Mark as being added to prevent duplicate rapid clicks
  addingModelIds.value.add(modelId)

  // Use Set to ensure uniqueness, then convert back to array
  const uniqueModels = new Set([...selectedModels.value, modelId])
  model.value = Array.from(uniqueModels)

  // Remove from adding state after a short delay (after Vue reactivity updates)
  setTimeout(() => {
    addingModelIds.value.delete(modelId)
  }, 100)
}

// Remove model
function removeModel(modelId: string) {
  model.value = selectedModels.value.filter(id => id !== modelId)
}

// Clear all models at once
function clearAllModels() {
  if (selectedModels.value.length === 0) return
  model.value = []
}

// Show model settings
async function showModelSettings(modelId: string) {
  // console.log('[showModelSettings] ======= DIALOG OPENING =======')
  // console.log('[showModelSettings] Model ID:', modelId)
  // console.log('[showModelSettings] Provider ID:', props.providerId)

  if (!props.providerId) {
    $q.notify({
      message: '无法获取 Provider 信息',
      type: 'negative',
      position: 'top'
    })
    return
  }

  // Get provider first
  const provider = providersStore.getProviderById(props.providerId)
  // console.log('[showModelSettings] Provider:', provider)
  // console.log('[showModelSettings] Provider.models type:', typeof provider?.models, Array.isArray(provider?.models))
  // console.log('[showModelSettings] Provider.models:', provider?.models)

  if (!provider) {
    $q.notify({
      message: `找不到 Provider: ${props.providerId}`,
      type: 'negative',
      position: 'top'
    })
    return
  }

  // Get model info
  const modelUniqId = `${props.providerId}:${modelId}`
  // console.log('[showModelSettings] Looking for model:', modelUniqId)

  const modelInfo = ModelService.getModelByUniqId(modelUniqId, provider)
  // console.log('[showModelSettings] Model info:', modelInfo)
  // console.log('[showModelSettings] Model inputTypes:', modelInfo?.inputTypes)

  if (!modelInfo) {
    $q.notify({
      message: `无法获取模型信息: ${modelUniqId}`,
      type: 'negative',
      position: 'top'
    })
    return
  }

  const providerName = provider.name || props.providerId

  // Show dialog
  $q.dialog({
    component: ModelSettingsDialog,
    componentProps: {
      modelInfo,
      providerId: props.providerId,
      providerName
    }
  }).onOk(async (updatedModel: Model) => {
    try {
      if (updatedModel.id && updatedModel.id !== modelId) {
        await providersStore.renameProviderModel(props.providerId, modelId, updatedModel.id, updatedModel)
      } else {
        await providersStore.updateProviderModel(props.providerId, updatedModel)
      }

      // Force refresh by clearing cache
      ModelService.clearCache()
      capabilitiesRefreshKey.value++

      $q.notify({
        message: '模型设置已保存',
        color: 'positive',
        position: 'top',
        timeout: 2000
      })
    } catch (error: any) {
      $q.notify({
        message: `保存失败: ${error.message}`,
        type: 'negative',
        position: 'top'
      })
    }
  })
}
</script>

<style scoped>
.models-list-input {
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 4px;
  padding: 12px;
}

.models-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0 10px;
  margin-bottom: 4px;
}

.models-count {
  display: flex;
  align-items: center;
  gap: 4px;
}

.models-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.action-btn {
  min-width: 120px;
}

.models-list {
  max-height: 400px;
  overflow-y: auto;
}

.model-item {
  padding: 8px 0;
}

.capability-badges {
  display: flex;
  gap: 4px;
  align-items: center;
}

.capability-dot {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  cursor: help;
  transition: transform 0.2s, box-shadow 0.2s;
}

.capability-dot:hover {
  transform: scale(1.1);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.cap-green {
  background-color: #4caf50;
}

.cap-blue {
  background-color: #2196f3;
}

.cap-purple {
  background-color: #9c27b0;
}

.cap-orange {
  background-color: #ff9800;
}
</style>
