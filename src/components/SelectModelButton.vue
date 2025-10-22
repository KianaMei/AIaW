<template>
  <q-btn
    flat
    no-caps
    dense
    class="select-model-btn"
    ref="btnRef"
    @click="toggleMenu"
  >
    <div class="row items-center gap-2 no-wrap">
      <!-- Model Icon -->
      <q-avatar size="20px">
        <img v-if="currentModelIcon" :src="currentModelIcon" />
        <q-icon v-else name="sym_o_neurology" size="18px" />
      </q-avatar>

      <!-- Model Name | Provider Name -->
      <span class="model-text">
        {{ modelDisplayName }}
      </span>

      <!-- Dropdown Icon -->
      <q-icon
        name="sym_o_expand_more"
        size="18px"
      />
    </div>
  </q-btn>

  <!-- Model Selection Menu (Dropdown) -->
  <q-card
    v-if="isMenuOpen"
    ref="menuRef"
    flat
    class="custom-model-menu"
    :style="menuStyle"
  >
    <q-card-section class="q-pa-sm">
      <!-- Search Bar (smaller) -->
      <q-input
        v-model="searchText"
        :placeholder="$t('selectModel.search')"
        outlined
        dense
        clearable
        :autofocus="$q.platform.is.desktop"
        class="search-input-small"
      >
        <template v-slot:prepend>
          <q-icon name="sym_o_search" size="16px" />
        </template>
      </q-input>
    </q-card-section>

    <q-separator />

    <!-- Provider Tabs (larger) with independent scrolling -->
    <div
      v-if="!searchText && providersWithModels.length > 0"
      class="provider-tabs-container"
      ref="providerTabsContainer"
      @wheel.prevent="handleProviderWheel"
    >
      <q-tabs
        v-model="selectedProviderId"
        dense
        class="text-grey-7 provider-tabs"
        active-color="primary"
        indicator-color="primary"
        align="left"
        narrow-indicator
        inline-label
      >
        <q-tab
          v-for="provider in providersWithModels"
          :key="provider.id"
          :name="provider.id"
          no-caps
          class="provider-tab-custom"
        >
          <div class="row items-center no-wrap gap-2">
            <span>{{ provider.name }}</span>
            <q-avatar size="36px">
              <a-avatar :avatar="getProviderAvatar(provider)" size="md" />
            </q-avatar>
          </div>
        </q-tab>
      </q-tabs>
    </div>

    <q-separator v-if="!searchText" />

    <q-card-section
      class="q-pt-sm q-pb-sm model-list-container"
    >
      <!-- Search Results (all providers) -->
      <div v-if="searchText">
        <div v-for="(group, groupIndex) in filteredModelGroups" :key="`group-${group.providerId}`">
          <div class="text-caption text-weight-medium q-mb-sm q-mt-sm text-grey-7">
            {{ group.providerName }}
          </div>
          <q-list dense>
            <q-item
              v-for="model in group.models"
              :key="`model-${model.uniqId}`"
              clickable
              v-ripple
              @click="selectModel(group.providerId, model.id); isMenuOpen = false"
              class="model-item"
              :active="model.uniqId === currentModelUniqId"
              active-class="bg-primary-1"
            >
              <q-item-section avatar class="model-icon">
                <q-avatar size="18px">
                  <img v-if="getModelIcon(model.name)" :src="getModelIcon(model.name)" />
                  <q-icon v-else name="sym_o_neurology" size="16px" />
                </q-avatar>
              </q-item-section>
              <q-item-section>
                <q-item-label class="model-name">{{ model.name }}</q-item-label>
              </q-item-section>
            </q-item>
          </q-list>
          <q-separator v-if="groupIndex < filteredModelGroups.length - 1" class="q-my-sm" />
        </div>

        <!-- Empty State -->
        <div v-if="filteredModelGroups.length === 0" class="text-center q-pa-md text-grey-6">
          {{ $t('selectModel.noResults') }}
        </div>
      </div>

      <!-- Selected Provider Models -->
      <div v-else>
        <q-list dense>
          <q-item
            v-for="model in currentProviderModels"
            :key="`model-${model.uniqId}`"
            clickable
            v-ripple
            @click="selectModel(selectedProviderId, model.id); isMenuOpen = false"
            class="model-item"
            :active="model.uniqId === currentModelUniqId"
            active-class="bg-primary-1"
          >
            <q-item-section avatar class="model-icon">
              <q-avatar size="18px">
                <img v-if="getModelIcon(model.name)" :src="getModelIcon(model.name)" />
                <q-icon v-else name="sym_o_neurology" size="16px" />
              </q-avatar>
            </q-item-section>
            <q-item-section>
              <q-item-label class="model-name">{{ model.name }}</q-item-label>
            </q-item-section>
            <q-item-section side v-if="model.inputTypes">
              <div class="row gap-1">
                <q-icon
                  v-if="model.inputTypes.user?.includes('image')"
                  name="sym_o_visibility"
                  size="18px"
                  color="green"
                >
                  <q-tooltip>视觉能力</q-tooltip>
                </q-icon>
                <q-icon
                  v-if="model.inputTypes.user?.includes('audio')"
                  name="sym_o_mic"
                  size="18px"
                  color="blue"
                >
                  <q-tooltip>语音能力</q-tooltip>
                </q-icon>
              </div>
            </q-item-section>
          </q-item>
        </q-list>

        <!-- Empty State for Provider -->
        <div v-if="currentProviderModels.length === 0" class="text-center q-pa-md text-grey-6">
          该供应商暂无可用模型
        </div>
      </div>
    </q-card-section>
  </q-card>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { useQuasar } from 'quasar'
import { useProvidersV2Store } from 'src/stores/providers-v2'
import { useUiStateStore } from 'src/stores/ui-state'
import AAvatar from './AAvatar.vue'
import type { Model, ProviderV2 } from 'src/utils/types'

interface Props {
  providerId?: string
  modelId?: string
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:providerId': [value: string]
  'update:modelId': [value: string]
}>()

const { t } = useI18n()
const $q = useQuasar()
const providersStore = useProvidersV2Store()
const uiStore = useUiStateStore()

const searchText = ref('')
const selectedProviderId = ref('')
const providerTabsContainer = ref<HTMLElement | null>(null)

// Button root element ref
const btnRef = ref<any>(null)
const menuStyle = ref<Record<string, string>>({})
const isMenuOpen = ref(false)
const menuRef = ref<any>(null)

function getMainPageRect(): DOMRect {
  // Compute remaining area after subtracting visible drawers
  const vw = window.innerWidth
  const vh = window.innerHeight

  let leftEdge = 0
  let rightEdge = vw

  const drawers = Array.from(document.querySelectorAll('.q-drawer')) as HTMLElement[]
  for (const d of drawers) {
    const r = d.getBoundingClientRect()
    if (r.width <= 1 || r.height <= 1 || r.right <= 0 || r.left >= vw) continue
    const center = (r.left + r.right) / 2
    if (center < vw / 2) {
      leftEdge = Math.max(leftEdge, Math.floor(r.right))
    } else {
      rightEdge = Math.min(rightEdge, Math.floor(r.left))
    }
  }

  if (rightEdge - leftEdge < 100) {
    const page = document.querySelector('.q-page-container') || document.querySelector('.q-page')
    const rect = page?.getBoundingClientRect?.()
    if (rect && rect.width > 0) return rect as DOMRect
    return new DOMRect(0, 0, vw, vh)
  }

  return new DOMRect(leftEdge, 0, rightEdge - leftEdge, vh)
}

function updateMenuStyle() {
  nextTick(() => {
    const mainRect = getMainPageRect()
    const menuWidth = mainRect.width * 0.85  // 修改为 85% 宽度
    const menuLeft = mainRect.left + (mainRect.width * 0.075)  // 左边距 7.5% 使其居中

    const btnEl = btnRef.value?.$el || btnRef.value
    if (!btnEl) return
    const btnRect = btnEl.getBoundingClientRect()
    const menuTop = btnRect.bottom + 8 // Position it 8px below the button

    menuStyle.value = {
      position: 'fixed',
      top: `${menuTop}px`,
      left: `${menuLeft}px`,
      width: `${Math.max(320, Math.floor(menuWidth))}px`,
      maxWidth: `${Math.floor(mainRect.width)}px`
    }
  })
}

function onResize() {
  if (isMenuOpen.value) {
    updateMenuStyle()
  }
}

onMounted(() => {
  window.addEventListener('resize', onResize)
  window.addEventListener('click', handleClickOutside, true)
})
onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize)
  window.removeEventListener('click', handleClickOutside, true)
})

watch(() => uiStore.mainDrawerOpen, () => {
  // Give the drawer animation time to complete
  setTimeout(() => {
    if (isMenuOpen.value) {
      updateMenuStyle()
    }
  }, 300)
})

function toggleMenu() {
  isMenuOpen.value = !isMenuOpen.value
  if (isMenuOpen.value) {
    updateMenuStyle()
  }
}

function handleClickOutside(event: MouseEvent) {
  const menuEl = menuRef.value?.$el || menuRef.value
  if (
    isMenuOpen.value &&
    menuEl &&
    !menuEl.contains(event.target as Node) &&
    btnRef.value &&
    !btnRef.value.$el.contains(event.target as Node)
  ) {
    isMenuOpen.value = false
  }
}

// Scroll selected provider tab into view
function scrollToSelectedProvider() {
  if (!providerTabsContainer.value) return

  const currentIndex = providersWithModels.value.findIndex(p => p.id === selectedProviderId.value)
  if (currentIndex === -1) return

  // Find the selected tab element
  const tabs = providerTabsContainer.value.querySelectorAll('.q-tab')
  const selectedTab = tabs[currentIndex] as HTMLElement
  if (!selectedTab) return

  // Scroll the selected tab into view (centered if possible)
  selectedTab.scrollIntoView({
    behavior: 'smooth',
    block: 'nearest',
    inline: 'center'
  })
}

// Handle mouse wheel for provider tabs - switch between providers
function handleProviderWheel(event: WheelEvent) {
  // Switch to next/previous provider based on scroll direction
  const currentIndex = providersWithModels.value.findIndex(p => p.id === selectedProviderId.value)
  if (currentIndex === -1) return

  const direction = event.deltaY > 0 ? 1 : -1 // 向下滚动为 1，向上为 -1
  const newIndex = currentIndex + direction

  // Check bounds
  if (newIndex >= 0 && newIndex < providersWithModels.value.length) {
    selectedProviderId.value = providersWithModels.value[newIndex].id

    // Auto scroll to keep selected provider in view
    setTimeout(() => {
      scrollToSelectedProvider()
    }, 10)
  }
}

// Current model display name
const modelDisplayName = computed(() => {
  if (!props.providerId || !props.modelId) {
    return t('selectModel.selectModel')
  }

  const provider = providersStore.getProviderById(props.providerId)
  const model = providersStore.getModelByUniqId(`${props.providerId}:${props.modelId}`)

  if (!model || !provider) {
    return `${props.modelId}`
  }

  return `${model.name} | ${provider.name}`
})

// Current model icon
const currentModelIcon = computed(() => {
  if (!props.modelId) return null

  const model = providersStore.getModelByUniqId(`${props.providerId}:${props.modelId}`)
  if (!model) return null

  return getModelIcon(model.name)
})

const currentModelUniqId = computed(() => {
  if (!props.providerId || !props.modelId) return ''
  return `${props.providerId}:${props.modelId}`
})

// Enabled providers list (ordered by persisted UI order)
const enabledProviders = computed(() => {
  return providersStore.enabledProviders || []
})

// Providers with models (filter out empty providers)
const providersWithModels = computed(() => {
  return enabledProviders.value.filter(provider => {
    const models = providersStore.getModelsByProvider(provider.id)
    return models && models.length > 0
  })
})

// Initialize selected provider from props or first enabled provider with models
watch(() => props.providerId, (newVal) => {
  if (newVal) {
    selectedProviderId.value = newVal
    // Scroll to selected provider when props change
    setTimeout(() => {
      scrollToSelectedProvider()
    }, 100)
  }
}, { immediate: true })

// Ensure selected provider has models, otherwise switch to first one
watch(() => providersWithModels.value, (providers) => {
  if (!providers || providers.length === 0) {
    selectedProviderId.value = ''
    return
  }

  // If no provider selected, or current provider doesn't have models, select first one
  const currentHasModels = providers.some(p => p.id === selectedProviderId.value)
  if (!selectedProviderId.value || !currentHasModels) {
    selectedProviderId.value = providers[0].id
  }
}, { immediate: true })

// Current provider models
const currentProviderModels = computed(() => {
  if (!selectedProviderId.value) return []

  const models = providersStore.getModelsByProvider(selectedProviderId.value)
  return models.map(m => ({
    ...m,
    uniqId: `${selectedProviderId.value}:${m.id}`
  }))
})

// Get model icon based on model name
function getModelIcon(modelName: string): string | null {
  const name = modelName.toLowerCase()

  // OpenAI models
  if (name.includes('gpt') || name.includes('o1') || name.includes('o3') || name.includes('o4')) {
    return '/icons/providers/openai.svg'
  }

  // Anthropic/Claude models
  if (name.includes('claude')) {
    return '/icons/providers/anthropic.svg'
  }

  // Google/Gemini models
  if (name.includes('gemini')) {
    return '/icons/providers/google.svg'
  }

  // DeepSeek models
  if (name.includes('deepseek')) {
    return '/icons/providers/deepseek.svg'
  }

  // xAI/Grok models
  if (name.includes('grok')) {
    return '/icons/providers/xai.svg'
  }

  // Default: return null to use default icon
  return null
}

// Get provider avatar
function getProviderAvatar(provider: ProviderV2): any {
  if (!provider.isSystem && provider.avatar) {
    return provider.avatar
  }

  if (!provider.isSystem) {
    return { type: 'icon', icon: 'sym_o_dashboard_customize' }
  }

  const avatarMap: Record<string, any> = {
    openai: { type: 'svg', name: 'openai' },
    'openai-responses': { type: 'svg', name: 'openai', hue: 88 },
    anthropic: { type: 'svg', name: 'anthropic' },
    google: { type: 'svg', name: 'google-c' },
    azure: { type: 'svg', name: 'microsoft-c' },
    'openai-compatible': { type: 'svg', name: 'openai', hue: 160 },
    deepseek: { type: 'svg', name: 'deepseek-c' },
    xai: { type: 'svg', name: 'grok' },
    ollama: { type: 'svg', name: 'ollama' },
    groq: { type: 'svg', name: 'groq' },
    openrouter: { type: 'svg', name: 'openrouter' },
    mistral: { type: 'svg', name: 'mistral-c' },
    cohere: { type: 'svg', name: 'cohere-c' },
    togetherai: { type: 'svg', name: 'togetherai-c' },
    burncloud: { type: 'svg', name: 'burncloud-c' }
  }

  return avatarMap[provider.id] || { type: 'icon', icon: 'sym_o_cloud' }
}

// Group models by provider (for search results)
interface ModelGroup {
  providerId: string
  providerName: string
  models: Array<Model & { uniqId: string }>
}

const filteredModelGroups = computed<ModelGroup[]>(() => {
  const groups: ModelGroup[] = []
  const search = searchText.value.toLowerCase().trim()

  if (!search) return []

  const providers = providersStore.enabledProviders
  if (!providers || !Array.isArray(providers)) return []

  for (const provider of providers) {
    if (!provider || !provider.id) continue

    const models = providersStore.getModelsByProvider(provider.id)
    if (!models || !Array.isArray(models)) continue

    const filteredModels = models
      .filter(m => {
        if (!m) return false
        const name = m.name?.toLowerCase() || ''
        const id = m.id?.toLowerCase() || ''
        return name.includes(search) || id.includes(search)
      })
      .map(m => ({
        ...m,
        uniqId: `${provider.id}:${m.id}`
      }))

    if (filteredModels.length > 0) {
      groups.push({
        providerId: provider.id,
        providerName: provider.name || provider.id,
        models: filteredModels
      })
    }
  }

  return groups
})

function selectModel(providerId: string, modelId: string) {
  emit('update:providerId', providerId)
  emit('update:modelId', modelId)
}
</script>

<style scoped>
.select-model-btn {
  border-radius: 8px;
  padding: 4px 8px;
  /* Avoid covering toolbar actions by not forcing full width */
  width: auto;
  max-width: min(70vw, 480px);
  flex: 0 1 auto;
  justify-content: space-between;
  overflow: hidden;
}

.select-model-btn :deep(.q-btn__content) {
  width: 100%;
  justify-content: space-between;
}

.model-text {
  font-size: 13px;
  font-weight: 500;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: left;
}

.bg-primary-1 {
  background-color: rgba(var(--q-primary-rgb), 0.1);
}

/* Smaller search input */
.search-input-small :deep(.q-field__control) {
  min-height: 36px;
  font-size: 13px;
}

.search-input-small :deep(.q-field__prepend) {
  padding-right: 6px;
}

/* Provider tabs container - fixed height with independent scroll, 隐藏滚动条 */
.provider-tabs-container {
  max-height: 80px;
  overflow-x: auto;
  overflow-y: hidden;
  scroll-behavior: smooth;
  -ms-overflow-style: none;  /* IE/旧 Edge */
  scrollbar-width: none;     /* Firefox */
}

.provider-tabs-container::-webkit-scrollbar {
  width: 0;
  height: 0;
  background: transparent;
}

/* Larger provider tabs - 不换行，强制单行 */
.provider-tabs {
  width: auto !important;
  display: inline-flex;
  flex-wrap: nowrap !important;
  white-space: nowrap;
}

.provider-tabs :deep(.q-tab) {
  min-height: 50px;
  height: 50px;
  font-size: 14px;
  font-weight: 500;
  padding: 0 24px !important;
  margin-right: 8px;
}

.provider-tabs :deep(.q-tab__label) {
  font-size: 14px;
}

.provider-tab-custom {
  /* padding 在上面统一设置了 */
}

.provider-tab-custom .q-avatar {
  flex-shrink: 0;
}

.provider-tab-custom span {
  font-size: 14px;
  font-weight: 500;
}

/* Model list container - fixed height with independent scroll */
.model-list-container {
  max-height: 400px !important;
  overflow-y: auto !important;
  overflow-x: hidden;
  scrollbar-width: thin;
}

.model-list-container::-webkit-scrollbar {
  width: 6px;
}

.model-list-container::-webkit-scrollbar-thumb {
  background-color: rgba(128, 128, 128, 0.3);
  border-radius: 3px;
}

.model-list-container::-webkit-scrollbar-thumb:hover {
  background-color: rgba(128, 128, 128, 0.5);
}

/* 响应式下拉菜单宽度 */
.custom-model-menu {
  z-index: 6001; /* Higher than q-menu default */
  overflow: hidden;
  border-radius: 4px;
  box-shadow: 0 1px 5px rgba(0,0,0,0.2), 0 2px 2px rgba(0,0,0,0.14), 0 3px 1px -2px rgba(0,0,0,0.12);
  max-height: 70vh;
  display: flex;
  flex-direction: column;
}

/* 移动端适配 */
@media (max-width: 600px) {
  .custom-model-menu {
    max-width: calc(100vw - 16px);
  }

  /* 移动端按钮更大，更易点击 */
  .select-model-btn {
    padding: 6px 12px;
    max-width: 65vw; /* leave room for the right toolbar button */
  }

  /* 移动端文字稍大 */
  .model-text {
    font-size: 14px;
  }

  /* 移动端 Provider Tab 更大 */
  .provider-tabs :deep(.q-tab) {
    min-height: 52px;
    height: 52px;
    font-size: 14px;
    padding: 0 20px !important;
  }

  .provider-tab-custom span {
    font-size: 14px;
  }

  .provider-tab-custom .q-avatar {
    width: 40px !important;
    height: 40px !important;
  }

  /* 移动端模型列表项更大 */
  .model-item {
    min-height: 44px !important;
  }

  .model-name {
    font-size: 13px;
  }

  /* 移动端图标稍大 */
  .model-item :deep(.q-item__section--avatar) {
    width: 32px;
    min-width: 32px;
  }

  .model-item .q-avatar {
    width: 22px !important;
    height: 22px !important;
  }

  /* 移动端能力图标更大 */
  .model-item :deep(.q-icon) {
    font-size: 18px !important;
  }
}
.model-item :deep(.q-item__section--main) {
  min-width: 0;
}
.model-name {
  font-size: 13px;
}

/* Compact icon column for model rows */
.model-item :deep(.q-item__section--avatar) {
  width: 26px;
  min-width: 26px;
  padding-right: 4px;
}
</style>
