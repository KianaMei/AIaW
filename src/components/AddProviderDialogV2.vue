<template>
  <q-dialog
    ref="dialogRef"
    @hide="onDialogHide"
  >
    <q-card class="q-dialog-plugin" style="min-width: 400px">
      <q-card-section>
        <div class="text-h6">{{ $t('addProvider.title') }}</div>
      </q-card-section>

      <q-card-section class="q-pt-none">
        <!-- Provider Name -->
        <q-input
          v-model="name"
          :label="$t('addProvider.name')"
          :hint="$t('addProvider.nameHint')"
          filled
          dense
          autofocus
          class="mb-4"
          :rules="[val => val && val.length > 0 || $t('addProvider.nameRequired')]"
        />

        <!-- Provider Type -->
        <q-select
          v-model="type"
          :options="providerTypeOptions"
          :label="$t('addProvider.type')"
          :hint="$t('addProvider.typeHint')"
          filled
          dense
          emit-value
          map-options
          class="mb-4"
        />

        <!-- Avatar -->
        <div class="mb-4">
          <div class="text-caption text-secondary mb-2">{{ $t('addProvider.avatar') }}</div>
          <div flex items-center gap-4>
            <a-avatar
              :avatar="avatar"
              size="lg"
              class="cursor-pointer"
              @click="pickAvatar"
            />
            <div class="text-caption">
              {{ $t('addProvider.clickToChange') }}
            </div>
          </div>
        </div>
      </q-card-section>

      <q-card-actions align="right">
        <q-btn
          flat
          :label="$t('common.cancel')"
          @click="onCancelClick"
        />
        <q-btn
          unelevated
          :label="$t('common.create')"
          color="primary"
          @click="onCreate"
          :disable="!name"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useDialogPluginComponent, useQuasar } from 'quasar'
import { useI18n } from 'vue-i18n'
import AAvatar from './AAvatar.vue'
import PickAvatarDialog from './PickAvatarDialog.vue'
import type { Avatar } from 'src/utils/types'

defineEmits([
  ...useDialogPluginComponent.emits
])

const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent()
const $q = useQuasar()
const { t } = useI18n()

const name = ref('')
const type = ref('openai-compatible')
const avatar = ref<Avatar>({
  type: 'icon',
  icon: 'sym_o_cloud',
  hue: Math.floor(Math.random() * 360)
})

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

function pickAvatar() {
  $q.dialog({
    component: PickAvatarDialog,
    componentProps: {
      model: avatar.value,
      defaultTab: 'icon'
    }
  }).onOk(newAvatar => {
    avatar.value = newAvatar
  })
}

function onCreate() {
  onDialogOK({
    name: name.value,
    type: type.value,
    avatar: avatar.value
  })
}

function onCancelClick() {
  onDialogCancel()
}
</script>
