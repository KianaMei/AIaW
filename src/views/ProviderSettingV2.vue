<template>
  <view-common-header
    @toggle-drawer="$emit('toggle-drawer')"
    back-to="/settings"
    :force-navigate="true"
  >
    <q-toolbar-title>
      {{ provider ? provider.name : $t('providerSetting.title') }}
    </q-toolbar-title>
  </view-common-header>

  <q-page-container v-if="provider">
    <q-page :style-fn="pageFhStyle">
      <q-list
        py-2
        max-w="1000px"
        mx-a
      >
        <!-- Provider Name -->
        <q-item>
          <q-item-section>
            <q-item-label>{{ $t('providerSetting.name') }}</q-item-label>
          </q-item-section>
          <q-item-section side>
            <a-input
              class="w-250px"
              filled
              dense
              v-model="localProvider.name"
              @update:model-value="debouncedUpdate"
            />
          </q-item-section>
        </q-item>

        <!-- Provider Logo -->
        <q-item
          clickable
          @click="pickAvatar"
        >
          <q-item-section>
            <q-item-label>{{ $t('providerSetting.logo') }}</q-item-label>
          </q-item-section>
          <q-item-section
            side
            text-on-sur
          >
            <a-avatar :avatar="localProvider.avatar" />
          </q-item-section>
        </q-item>

        <q-separator spaced />

        <!-- Provider Type -->
        <q-item>
          <q-item-section>
            <q-item-label>{{ $t('providerSetting.type') }}</q-item-label>
            <q-item-label caption>
              {{ $t('providerSetting.typeCaption') }}
            </q-item-label>
          </q-item-section>
          <q-item-section side>
            <q-select
              class="w-250px"
              v-model="localProvider.type"
              :options="providerTypeOptions"
              emit-value
              map-options
              filled
              dense
              :disable="isSystemProvider"
              @update:model-value="debouncedUpdate"
            />
          </q-item-section>
        </q-item>

        <!-- API Host -->
        <q-item>
          <q-item-section>
            <div class="row items-center no-wrap">
              <q-item-label class="q-mr-xs">{{ $t('providerSetting.apiHost') }}</q-item-label>
              <q-icon name="sym_o_help" size="16px" class="text-on-sur cursor-pointer">
                <q-tooltip>小贴士：地址以“/”结尾将不再自动追加“/v1”；以“#”结尾将强制按原样使用输入地址。</q-tooltip>
              </q-icon>
            </div>
            <q-item-label caption>
              {{ $t('providerSetting.apiHostCaption') }}
            </q-item-label>
          </q-item-section>
          <q-item-section side>
            <a-input
              class="w-250px"
              filled
              dense
              v-model="localProvider.apiHost"
              @update:model-value="debouncedUpdate"
              placeholder="https://api.example.com"
            />
          </q-item-section>
        </q-item>

        <!-- API Key -->
        <q-item v-if="!hideApiKey">
          <q-item-section>
            <q-item-label>{{ $t('providerSetting.apiKey') }}</q-item-label>
            <q-item-label caption>
              {{ $t('providerSetting.apiKeyCaption') }}
            </q-item-label>
          </q-item-section>
          <q-item-section side>
            <a-input
              class="w-250px"
              filled
              dense
              v-model="localProvider.apiKey"
              @update:model-value="debouncedUpdate"
              :type="showApiKey ? 'text' : 'password'"
              placeholder="sk-..."
            >
              <template #append>
                <q-icon
                  :name="showApiKey ? 'sym_o_visibility_off' : 'sym_o_visibility'"
                  class="cursor-pointer"
                  @click="showApiKey = !showApiKey"
                />
              </template>
            </a-input>
          </q-item-section>
        </q-item>

        <!-- Enabled Toggle -->
        <q-item>
          <q-item-section>
            <q-item-label>{{ $t('providerSetting.enabled') }}</q-item-label>
            <q-item-label caption>
              {{ $t('providerSetting.enabledCaption') }}
            </q-item-label>
          </q-item-section>
          <q-item-section side>
            <q-toggle
              v-model="localProvider.enabled"
              @update:model-value="debouncedUpdate"
            />
          </q-item-section>
        </q-item>

        <!-- Provider Actions -->
        <q-item
          v-if="!isSystemProvider"
          class="provider-actions"
        >
          <q-item-section>
            <div class="validation-group">
              <q-btn
                class="action-btn"
                :label="$t('providerSetting.validate')"
                icon="sym_o_verified"
                color="primary"
                unelevated
                @click="validateProvider"
                :loading="validating"
              />
              <q-badge
                v-if="validationResult"
                :color="validationResult.valid ? 'positive' : 'negative'"
                :label="validationResult.valid ? $t('providerSetting.valid') : $t('providerSetting.invalid')"
              >
                <q-tooltip v-if="!validationResult.valid">
                  {{ validationResult.error }}
                </q-tooltip>
              </q-badge>
            </div>
          </q-item-section>
          <q-item-section side>
            <q-btn
              class="action-btn"
              :label="$t('providerSetting.delete')"
              icon="sym_o_delete"
              color="negative"
              unelevated
              @click="deleteProvider"
            />
          </q-item-section>
        </q-item>

        <q-separator spaced />

        <!-- Models Section -->
        <q-item-label header>
          {{ $t('providerSetting.models') }}
          <q-btn
            flat
            dense
            round
            icon="sym_o_refresh"
            size="sm"
            @click="fetchModels"
            :loading="fetchingModels"
          >
            <q-tooltip>{{ $t('providerSetting.fetchModels') }}</q-tooltip>
          </q-btn>
        </q-item-label>

        <q-item>
          <q-item-section>
            <q-item-label caption>
              {{ $t('providerSetting.modelsCaption') }}
            </q-item-label>
            <models-list-input
              v-model="localProvider.models"
              :provider-id="props.id"
              @update:model-value="debouncedUpdate"
              class="mt-2"
            />
          </q-item-section>
        </q-item>
      </q-list>
    </q-page>
  </q-page-container>

  <error-not-found v-else />
</template>

<script setup lang="ts">
import { computed, ref, watch, toRaw } from 'vue'
import { useProvidersV2Store } from 'src/stores/providers-v2'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { useI18n } from 'vue-i18n'
import { ProviderV2, CustomProviderV2 } from 'src/utils/types'
import { ProviderService } from 'src/services/ProviderService'
import ViewCommonHeader from 'src/components/ViewCommonHeader.vue'
import AAvatar from 'src/components/AAvatar.vue'
import AInput from 'src/components/global/AInput.js'
import ModelsListInput from 'src/components/ModelsListInput.vue'
import PickAvatarDialog from 'src/components/PickAvatarDialog.vue'
import ErrorNotFound from 'src/pages/ErrorNotFound.vue'
import { pageFhStyle } from 'src/utils/functions'
import { useDebounceFn } from '@vueuse/core'

const props = defineProps<{
  id: string
}>()

defineEmits(['toggle-drawer'])

const providersStore = useProvidersV2Store()
const router = useRouter()
const $q = useQuasar()
const { t } = useI18n()

// Find provider
const provider = computed(() => {
  return providersStore.getProviderById(props.id)
})

const isSystemProvider = computed(() => {
  return provider.value?.isSystem === true
})

// Local editable copy
const localProvider = ref<ProviderV2>({
  id: '',
  name: '',
  type: 'openai-compatible',
  apiHost: '',
  apiKey: '',
  models: [],
  isSystem: false as const,
  enabled: true,
  settings: {},
  avatar: {
    type: 'icon',
    icon: 'sym_o_dashboard_customize',
    hue: 0
  }
})

// Watch for provider changes (both ID changes and data loading from IndexedDB)
// This ensures localProvider is updated both when switching providers and when data loads on refresh
watch(
  [() => props.id, () => provider.value],
  ([newId, currentProvider]) => {
    if (currentProvider) {
      console.log('[ProviderSettingV2] Provider loaded/changed:', currentProvider.id, currentProvider.name)
      localProvider.value = {
        ...currentProvider,
        // Ensure avatar has a default value
        avatar: currentProvider.avatar || {
          type: 'icon',
          icon: 'sym_o_dashboard_customize',
          hue: Math.floor(Math.random() * 360)
        }
      }
    } else {
      console.log('[ProviderSettingV2] Provider not found for ID:', newId)
    }
  },
  { immediate: true }
)

// Provider type options
const providerTypeOptions = [
  { label: 'OpenAI Compatible', value: 'openai-compatible' },
  { label: 'OpenAI', value: 'openai' },
  { label: 'OpenAI Response', value: 'openai-response' },
  { label: 'Anthropic', value: 'anthropic' },
  { label: 'Google', value: 'google' },
  { label: 'Azure', value: 'azure' },
  { label: 'DeepSeek', value: 'deepseek' },
  { label: 'Ollama', value: 'ollama' },
  { label: 'OpenRouter', value: 'openrouter' },
  { label: 'xAI', value: 'xai' },
  { label: 'Groq', value: 'groq' },
  { label: 'Together.ai', value: 'togetherai' },
  { label: 'Cohere', value: 'cohere' },
  { label: 'Mistral', value: 'mistral' }
]

// API key visibility
const showApiKey = ref(false)

// Hide API key for certain providers
const hideApiKey = computed(() => {
  return ['vertexai', 'aws-bedrock'].includes(localProvider.value.type)
})

// Debounced update function
const debouncedUpdate = useDebounceFn(async () => {
  if (!provider.value || isSystemProvider.value) return

  try {
    // Strip Vue proxies before persisting to IndexedDB to avoid DataCloneError
    const updates: Partial<CustomProviderV2> = {
      name: localProvider.value.name,
      type: localProvider.value.type,
      apiHost: (localProvider.value.apiHost || '').trim(),
      apiKey: (localProvider.value.apiKey || '').trim(),
      enabled: !!localProvider.value.enabled,
      // models may be string[] or Model[] in UI; persist the raw value
      models: toRaw(localProvider.value.models) as any,
      // deep-clone settings/avatar to remove any reactive refs
      settings: JSON.parse(JSON.stringify(toRaw(localProvider.value.settings || {}))) as any,
      avatar: JSON.parse(JSON.stringify(toRaw(localProvider.value.avatar || {}))) as any
    }

    await providersStore.updateCustomProvider(props.id, updates)

    $q.notify({
      message: t('providerSetting.updateSuccess'),
      type: 'positive',
      position: 'top'
    })
  } catch (error: any) {
    $q.notify({
      message: t('providerSetting.updateError', { error: error.message }),
      type: 'negative',
      position: 'top'
    })
  }
}, 500)

// Fetch models from provider
const fetchingModels = ref(false)
async function fetchModels() {
  console.log('[fetchModels] Started')
  if (!provider.value) {
    console.log('[fetchModels] No provider, returning')
    return
  }

  fetchingModels.value = true
  console.log('[fetchModels] Fetching for provider:', props.id)
  try {
    const result = await providersStore.fetchProviderModels(props.id)
    console.log('[fetchModels] Result:', result)
    // models is already string[], no need to map
    localProvider.value.models = result.models
    await debouncedUpdate()

    // Show different messages based on source
    if (result.source === 'remote') {
      $q.notify({
        message: t('providerSetting.fetchModelsSuccess', { count: result.models.length }),
        type: 'positive',
        position: 'top'
      })
    } else if (result.source === 'static' && result.error) {
      $q.notify({
        message: t('providerSetting.fetchModelsFallback', {
          count: result.models.length,
          error: result.error
        }),
        type: 'warning',
        position: 'top',
        timeout: 5000,
        html: true
      })
    } else {
      $q.notify({
        message: t('providerSetting.fetchModelsStatic', { count: result.models.length }),
        type: 'info',
        position: 'top'
      })
    }
  } catch (error: any) {
    $q.notify({
      message: t('providerSetting.fetchModelsError', { error: error.message }),
      type: 'negative',
      position: 'top'
    })
  } finally {
    fetchingModels.value = false
  }
}

// Validate provider credentials
const validating = ref(false)
const validationResult = ref<{ valid: boolean; error?: string } | null>(null)

async function validateProvider() {
  if (!provider.value) return

  validating.value = true
  validationResult.value = null

  try {
    const result = await ProviderService.validateProvider(provider.value)
    validationResult.value = result

    if (result.valid) {
      $q.notify({
        message: t('providerSetting.validateSuccess'),
        type: 'positive',
        position: 'top'
      })
    } else {
      $q.notify({
        message: t('providerSetting.validateError', { error: result.error || 'Unknown error' }),
        type: 'negative',
        position: 'top',
        timeout: 5000
      })
    }
  } catch (error: any) {
    validationResult.value = { valid: false, error: error.message }
    $q.notify({
      message: t('providerSetting.validateError', { error: error.message }),
      type: 'negative',
      position: 'top'
    })
  } finally {
    validating.value = false
  }
}

// Pick avatar
function pickAvatar() {
  $q.dialog({
    component: PickAvatarDialog,
    componentProps: {
      model: localProvider.value.avatar,
      defaultTab: 'icon'
    }
  }).onOk(avatar => {
    localProvider.value.avatar = avatar
    debouncedUpdate()
  })
}

// Delete provider
function deleteProvider() {
  $q.dialog({
    title: t('providerSetting.deleteConfirmTitle'),
    message: t('providerSetting.deleteConfirmMessage', { name: localProvider.value.name }),
    cancel: true,
    persistent: true
  }).onOk(async () => {
    try {
      await providersStore.deleteCustomProvider(props.id)
      $q.notify({
        message: t('providerSetting.deleteSuccess'),
        type: 'positive',
        position: 'top'
      })
      router.push('/settings/providers')
    } catch (error: any) {
      $q.notify({
        message: t('providerSetting.deleteError', { error: error.message }),
        type: 'negative',
        position: 'top'
      })
    }
  })
}
</script>

<style scoped>
.provider-actions .action-btn {
  min-width: 140px;
}

.provider-actions .validation-group {
  display: flex;
  align-items: center;
  gap: 12px;
}

.provider-actions .q-item__section--side {
  display: flex;
  align-items: center;
}
</style>
