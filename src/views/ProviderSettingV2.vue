<template>
  <view-common-header
    @toggle-drawer="$emit('toggle-drawer')"
    back-to="."
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
        <q-item clickable @click="pickAvatar">
          <q-item-section>
            <q-item-label>{{ $t('providerSetting.logo') }}</q-item-label>
          </q-item-section>
          <q-item-section side text-on-sur>
            <a-avatar :avatar="localProvider.avatar" />
          </q-item-section>
        </q-item>

        <q-separator spaced />

        <!-- Provider Type -->
        <q-item>
          <q-item-section>
            <q-item-label>{{ $t('providerSetting.type') }}</q-item-label>
            <q-item-label caption>{{ $t('providerSetting.typeCaption') }}</q-item-label>
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
            <q-item-label>{{ $t('providerSetting.apiHost') }}</q-item-label>
            <q-item-label caption>{{ $t('providerSetting.apiHostCaption') }}</q-item-label>
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
            <q-item-label caption>{{ $t('providerSetting.apiKeyCaption') }}</q-item-label>
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
            <q-item-label caption>{{ $t('providerSetting.enabledCaption') }}</q-item-label>
          </q-item-section>
          <q-item-section side>
            <q-toggle
              v-model="localProvider.enabled"
              @update:model-value="debouncedUpdate"
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
            <models-input v-model="localProvider.models" class="mt-2" />
          </q-item-section>
        </q-item>

        <q-separator spaced />

        <!-- Delete Provider (Custom only) -->
        <q-item v-if="!isSystemProvider">
          <q-item-section>
            <q-btn
              :label="$t('providerSetting.delete')"
              icon="sym_o_delete"
              flat
              color="negative"
              @click="deleteProvider"
            />
          </q-item-section>
        </q-item>
      </q-list>
    </q-page>
  </q-page-container>

  <error-not-found v-else />
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useProvidersV2Store } from 'src/stores/providers-v2'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { useI18n } from 'vue-i18n'
import { ProviderV2, CustomProviderV2 } from 'src/utils/types'
import ViewCommonHeader from 'src/components/ViewCommonHeader.vue'
import AAvatar from 'src/components/AAvatar.vue'
import AInput from 'src/components/AInput.vue'
import ModelsInput from 'src/components/ModelsInput.vue'
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
  settings: {}
})

// Watch for provider changes
watch(
  provider,
  (newProvider) => {
    if (newProvider) {
      localProvider.value = { ...newProvider }
    }
  },
  { immediate: true, deep: true }
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
    await providersStore.updateCustomProvider(props.id, {
      name: localProvider.value.name,
      type: localProvider.value.type,
      apiHost: localProvider.value.apiHost,
      apiKey: localProvider.value.apiKey,
      enabled: localProvider.value.enabled,
      models: localProvider.value.models,
      settings: localProvider.value.settings,
      avatar: localProvider.value.avatar
    } as Partial<CustomProviderV2>)

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
  if (!provider.value) return

  fetchingModels.value = true
  try {
    const models = await providersStore.fetchProviderModels(props.id)
    localProvider.value.models = models.map(id => ({ id, name: id }))
    await debouncedUpdate()

    $q.notify({
      message: t('providerSetting.fetchModelsSuccess', { count: models.length }),
      type: 'positive',
      position: 'top'
    })
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
