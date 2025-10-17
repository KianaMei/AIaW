<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide">
    <q-card :style="{ minWidth: onlyError ? '680px' : '300px', maxWidth: '90vw' }">
      <q-card-section>
        <div class="text-h6">
          {{ onlyError
            ? $t('errorInfoDialog.title')
            : (message.type === 'user' ? $t('messageInfoDialog.userMessageInfo') : $t('messageInfoDialog.assistantMessageInfo'))
          }}
        </div>
      </q-card-section>

      <q-card-section v-if="onlyError" p-0>
        <q-list>
          <q-item v-if="message.errorDetail?.providerName || message.errorDetail?.providerId">
            <q-item-section class="label-col">{{ $t('errorInfoDialog.provider') }}</q-item-section>
            <q-item-section>
              {{ message.errorDetail?.providerName || message.errorDetail?.providerId }}
            </q-item-section>
          </q-item>
          <q-item v-if="message.errorDetail?.modelId">
            <q-item-section class="label-col">{{ $t('errorInfoDialog.model') }}</q-item-section>
            <q-item-section>{{ message.errorDetail?.modelId }}</q-item-section>
          </q-item>
          <q-item v-if="message.errorDetail?.status">
            <q-item-section class="label-col">{{ $t('errorInfoDialog.status') }}</q-item-section>
            <q-item-section>
              {{ message.errorDetail?.status }} {{ message.errorDetail?.statusText }}
            </q-item-section>
          </q-item>
          <q-item v-if="message.errorDetail?.url">
            <q-item-section class="label-col">{{ $t('errorInfoDialog.url') }}</q-item-section>
            <q-item-section class="pre-wrap">{{ message.errorDetail?.url }}</q-item-section>
          </q-item>
          <q-item v-if="message.errorDetail?.requestId">
            <q-item-section class="label-col">{{ $t('errorInfoDialog.requestId') }}</q-item-section>
            <q-item-section class="pre-wrap">{{ message.errorDetail?.requestId }}</q-item-section>
          </q-item>
          <q-item v-if="message.errorDetail?.type">
            <q-item-section class="label-col">{{ $t('errorInfoDialog.type') }}</q-item-section>
            <q-item-section>{{ message.errorDetail?.type }}</q-item-section>
          </q-item>
          <q-item v-if="message.error">
            <q-item-section class="label-col">{{ $t('errorInfoDialog.message') }}</q-item-section>
            <q-item-section class="pre-wrap">{{ message.error }}</q-item-section>
          </q-item>
        </q-list>
        <q-separator />
        <q-expansion-item icon="sym_o_bug_report" :label="$t('errorInfoDialog.stack')" v-if="message.errorDetail?.stack">
          <q-card>
            <q-card-section>
              <pre class="err-box">{{ message.errorDetail?.stack }}</pre>
            </q-card-section>
          </q-card>
        </q-expansion-item>
        <q-expansion-item icon="sym_o_receipt_long" :label="$t('errorInfoDialog.headers')" v-if="message.errorDetail?.headers">
          <q-card>
            <q-card-section>
              <pre class="err-box">{{ formatResponse(message.errorDetail?.headers) }}</pre>
            </q-card-section>
          </q-card>
        </q-expansion-item>
        <q-expansion-item icon="sym_o_description" :label="$t('errorInfoDialog.response')" v-if="message.errorDetail?.responseBody">
          <q-card>
            <q-card-section>
              <pre class="err-box">{{ formatResponse(message.errorDetail?.responseBody) }}</pre>
            </q-card-section>
          </q-card>
        </q-expansion-item>
      </q-card-section>

      <q-card-section v-else p-0>
        <q-list>
          <q-item>
            <q-item-section>{{ $t('messageInfoDialog.id') }}</q-item-section>
            <q-item-section side>{{ message.id }}</q-item-section>
          </q-item>
          <q-item>
            <q-item-section>{{ $t('messageInfoDialog.createdAt') }}</q-item-section>
            <q-item-section side>{{ createdAt }}</q-item-section>
          </q-item>
          <q-item>
            <q-item-section>{{ $t('messageInfoDialog.textLength') }}</q-item-section>
            <q-item-section side>{{ length }}</q-item-section>
          </q-item>
          <q-item v-if="message.modelName">
            <q-item-section>{{ $t('messageInfoDialog.model') }}</q-item-section>
            <q-item-section side>{{ message.modelName }}</q-item-section>
          </q-item>
          <q-item v-if="message.usage">
            <q-item-section>{{ $t('messageInfoDialog.tokenUsage') }}</q-item-section>
            <q-item-section side>
              {{ $t('messageInfoDialog.prompt') }}{{ message.usage.inputTokens }} ，{{ $t('messageInfoDialog.completion') }}{{ message.usage.outputTokens }}
            </q-item-section>
          </q-item>
        </q-list>
      </q-card-section>

      <q-card-actions align="right">
        <q-btn
          v-if="onlyError"
          flat
          color="primary"
          :label="$t('errorInfoDialog.copy')"
          @click="copy"
        />
        <q-btn
          flat
          color="primary"
          :label="onlyError ? $t('errorInfoDialog.ok') : $t('messageInfoDialog.ok')"
          @click="onDialogOK"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { useDialogPluginComponent, copyToClipboard } from 'quasar'
import { idDateString } from 'src/utils/functions'
import { Message } from 'src/utils/types'
import { computed } from 'vue'

const props = defineProps<{
  message: Message
  onlyError?: boolean
}>()

const onlyError = computed(() => !!props.onlyError)

const length = computed(() => props.message.contents
  .filter(c => c.type === 'assistant-message' || c.type === 'user-message')
  .reduce((prev, cur: any) => prev + (cur.text?.length || 0), 0))
const createdAt = computed(() => idDateString(props.message.id))

defineEmits([
  ...useDialogPluginComponent.emits
])

const { dialogRef, onDialogHide, onDialogOK } = useDialogPluginComponent()

function copy() {
  const raw = props.message?.errorDetail || { message: props.message?.error }
  try {
    copyToClipboard(JSON.stringify(raw, null, 2))
  } catch {
    copyToClipboard(String(raw))
  }
}

function formatResponse(body: any) {
  if (!body) return ''
  try {
    return typeof body === 'string' ? body : JSON.stringify(body, null, 2)
  } catch {
    return String(body)
  }
}
</script>

<style scoped>
.err-box {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 50vh;
  overflow-y: auto;
}
.pre-wrap { white-space: pre-wrap; word-break: break-word }
.label-col { min-width: 96px; max-width: 160px }
</style>
