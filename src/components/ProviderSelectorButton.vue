<template>
  <q-btn
    outline
    no-caps
    dense
    class="provider-selector-btn"
    :class="{ 'w-250px': dense }"
  >
    <div class="row items-center gap-2 no-wrap full-width">
      <!-- Provider Avatar -->
      <a-avatar
        v-if="selectedProvider"
        :avatar="selectedProvider.avatar"
        size="sm"
      />

      <!-- Provider Name -->
      <span class="provider-text ellipsis">
        {{ selectedProvider?.name || placeholder }}
      </span>

      <!-- Dropdown Icon -->
      <q-icon
        name="sym_o_expand_more"
        size="18px"
        class="q-ml-auto"
      />
    </div>

    <!-- Provider Selection Menu -->
    <q-menu
      :offset="[0, 4]"
      max-height="70vh"
      class="provider-menu"
      fit
      anchor="bottom left"
      self="top left"
    >
      <q-card flat>
        <!-- Search Bar (if many providers) -->
        <q-card-section v-if="providerOptions.length > 5" class="q-pa-sm">
          <q-input
            v-model="searchText"
            placeholder="搜索服务商..."
            outlined
            dense
            clearable
            autofocus
            class="search-input-small"
          >
            <template v-slot:prepend>
              <q-icon name="sym_o_search" size="16px" />
            </template>
          </q-input>
        </q-card-section>

        <q-separator v-if="providerOptions.length > 5" />

        <!-- Provider List -->
        <div class="provider-list-container">
          <q-list dense class="q-py-sm">
            <q-item
              v-for="provider in filteredProviders"
              :key="provider.id"
              clickable
              v-ripple
              v-close-popup
              :active="provider.id === modelValue"
              active-class="bg-primary-1"
              @click="selectProvider(provider.id)"
              class="provider-item"
            >
              <q-item-section avatar>
                <a-avatar :avatar="provider.avatar" size="sm" />
              </q-item-section>
              <q-item-section>
                <q-item-label>{{ provider.name }}</q-item-label>
                <q-item-label caption v-if="showType">
                  {{ provider.isSystem ? '系统服务商' : '自定义服务商' }}
                </q-item-label>
              </q-item-section>
              <q-item-section side v-if="showStatus">
                <q-badge
                  :color="provider.enabled ? 'positive' : 'grey'"
                  :label="provider.enabled ? '已启用' : '已禁用'"
                />
              </q-item-section>
            </q-item>
          </q-list>

          <!-- Empty State -->
          <div v-if="filteredProviders.length === 0" class="text-center q-pa-md text-grey-6">
            没有找到匹配的服务商
          </div>
        </div>
      </q-card>
    </q-menu>
  </q-btn>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useProvidersV2Store } from 'src/stores/providers-v2'
import AAvatar from './AAvatar.vue'

interface Props {
  modelValue?: string // Provider ID
  placeholder?: string
  dense?: boolean
  onlyEnabled?: boolean // Only show enabled providers
  onlySystem?: boolean // Only show system providers
  onlyCustom?: boolean // Only show custom providers
  showType?: boolean // Show system/custom badge
  showStatus?: boolean // Show enabled/disabled badge
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  placeholder: '选择服务商',
  dense: false,
  onlyEnabled: false,
  onlySystem: false,
  onlyCustom: false,
  showType: false,
  showStatus: false
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const providersStore = useProvidersV2Store()
const searchText = ref('')

// Provider options with avatar info
const providerOptions = computed(() => {
  let providers = providersStore.allProviders

  if (props.onlyEnabled) {
    providers = providers.filter(p => p.enabled)
  }
  if (props.onlySystem) {
    providers = providers.filter(p => p.isSystem)
  }
  if (props.onlyCustom) {
    providers = providers.filter(p => !p.isSystem)
  }

  return providers.map(p => ({
    id: p.id,
    name: p.name,
    avatar: p.avatar,
    isSystem: p.isSystem,
    enabled: p.enabled
  }))
})

// Filtered providers based on search
const filteredProviders = computed(() => {
  if (!searchText.value) return providerOptions.value

  const search = searchText.value.toLowerCase()
  return providerOptions.value.filter(p =>
    p.name.toLowerCase().includes(search)
  )
})

// Currently selected provider
const selectedProvider = computed(() => {
  return providerOptions.value.find(p => p.id === props.modelValue)
})

function selectProvider(providerId: string) {
  emit('update:modelValue', providerId)
  searchText.value = '' // Reset search when selected
}
</script>

<style lang="scss" scoped>
.provider-selector-btn {
  text-align: left;
  padding: 8px 12px;
  border-radius: 10px;  // 更圆润的圆角，与项目风格一致
  height: 40px;

  // 模拟 q-select outlined 的边框样式
  border: 1px solid rgba(0, 0, 0, 0.24);

  &:hover {
    border-color: var(--q-primary);
  }

  &.w-250px {
    width: 250px;
  }

  .provider-text {
    flex: 1;
    min-width: 0;
    text-align: left;
  }

  // 确保按钮内容垂直居中
  :deep(.q-btn__content) {
    justify-content: flex-start;
  }
}

.provider-menu {
  min-width: 250px;  // 确保下拉菜单有最小宽度

  .provider-list-container {
    max-height: 400px;
    overflow-y: auto;
  }

  // 让 q-list 充满宽度
  .q-list {
    padding: 0;
  }

  .provider-item {
    // 给选项添加适当的内边距
    padding-left: 12px;
    padding-right: 12px;

    &:hover {
      background-color: var(--q-hover);
    }

    // 确保高亮背景充满整行
    &.bg-primary-1 {
      background-color: rgba(var(--q-primary-rgb), 0.1);
    }
  }
}

.search-input-small {
  :deep(.q-field__control) {
    height: 32px;
  }
}
</style>