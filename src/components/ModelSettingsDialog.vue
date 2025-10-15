<template>
  <q-dialog
    ref="dialogRef"
    @hide="onDialogHide"
  >
    <q-card style="min-width: 550px; max-width: 650px">
      <!-- 标题栏 -->
      <q-card-section class="row items-center q-pb-sm">
        <q-icon name="sym_o_settings" size="24px" class="q-mr-sm text-primary" />
        <div class="text-h6">模型设置</div>
        <q-space />
        <q-btn icon="sym_o_close" flat round dense @click="onDialogCancel" />
      </q-card-section>

      <q-separator />

      <q-card-section class="q-pt-md scroll-area" style="max-height: 70vh">
        <!-- 模型基本信息 -->
        <div class="info-section q-mb-lg">
          <div class="section-title">
            <q-icon name="sym_o_info" size="20px" class="q-mr-xs" />
            基本信息
          </div>

          <div class="row q-col-gutter-sm">
            <div class="col-6">
              <q-input
                :model-value="modelInfo.id"
                label="模型 ID"
                outlined
                dense
                readonly
                filled
              >
                <template v-slot:append>
                  <q-icon name="sym_o_content_copy" class="cursor-pointer" @click="copyToClipboard(modelInfo.id)">
                    <q-tooltip>复制</q-tooltip>
                  </q-icon>
                </template>
              </q-input>
            </div>
            <div class="col-6">
              <q-input
                v-model="editedModel.name"
                label="显示名称"
                outlined
                dense
                hint="可选：自定义"
              />
            </div>
          </div>
        </div>

        <!-- 输入类型配置 -->
        <div class="input-types-section">
          <div class="section-title">
            <q-icon name="sym_o_upload_file" size="20px" class="q-mr-xs" />
            输入类型支持
            <q-icon name="sym_o_help" size="16px" class="q-ml-xs text-grey-6 cursor-pointer">
              <q-tooltip max-width="300px" class="text-caption">
                配置模型支持的输入文件类型。这决定了粘贴文件时是否能直接发送给模型。
              </q-tooltip>
            </q-icon>
          </div>

          <!-- 快速预设 -->
          <div class="preset-buttons q-mb-lg">
            <div class="text-body2 text-weight-medium q-mb-sm">快速预设</div>
            <div class="row q-gutter-sm">
              <q-btn
                unelevated
                size="sm"
                color="grey-3"
                text-color="grey-8"
                icon="sym_o_text_fields"
                label="纯文本"
                @click="applyPreset('textOnly')"
                class="preset-btn"
              />
              <q-btn
                unelevated
                size="sm"
                color="blue-1"
                text-color="blue-8"
                icon="sym_o_image"
                label="支持图片"
                @click="applyPreset('commonVision')"
                class="preset-btn"
              />
              <q-btn
                unelevated
                size="sm"
                color="purple-1"
                text-color="purple-8"
                icon="sym_o_auto_awesome"
                label="Claude 多模态"
                @click="applyPreset('claudePdf')"
                class="preset-btn"
              />
              <q-btn
                unelevated
                size="sm"
                color="orange-1"
                text-color="orange-8"
                icon="sym_o_magic_button"
                label="Gemini 多模态"
                @click="applyPreset('gemini2')"
                class="preset-btn"
              />
            </div>
          </div>

          <!-- 自定义配置 -->
          <div class="custom-config">
            <div class="text-body2 text-weight-medium q-mb-sm">自定义配置</div>

            <!-- User input types -->
            <q-card flat bordered class="config-card q-mb-sm">
              <q-card-section class="q-pa-md">
                <div class="row items-center q-mb-sm">
                  <q-icon name="sym_o_person" size="18px" class="q-mr-xs text-blue-7" />
                  <div class="text-body2 text-weight-medium">用户消息</div>
                </div>
                <q-option-group
                  v-model="userInputTypes"
                  :options="inputTypeOptions"
                  type="checkbox"
                  dense
                  class="custom-checkbox-group"
                />
              </q-card-section>
            </q-card>

            <!-- Assistant input types -->
            <q-card flat bordered class="config-card q-mb-sm">
              <q-card-section class="q-pa-md">
                <div class="row items-center q-mb-sm">
                  <q-icon name="sym_o_smart_toy" size="18px" class="q-mr-xs text-purple-7" />
                  <div class="text-body2 text-weight-medium">助手消息</div>
                </div>
                <q-option-group
                  v-model="assistantInputTypes"
                  :options="inputTypeOptions"
                  type="checkbox"
                  dense
                  class="custom-checkbox-group"
                />
                <div class="text-caption text-grey-6 q-mt-sm">
                  <q-icon name="sym_o_lightbulb" size="14px" class="q-mr-xs" />
                  Claude 等模型支持在 assistant 消息中包含图片
                </div>
              </q-card-section>
            </q-card>

            <!-- Tool input types -->
            <q-card flat bordered class="config-card">
              <q-card-section class="q-pa-md">
                <div class="row items-center q-mb-sm">
                  <q-icon name="sym_o_build" size="18px" class="q-mr-xs text-orange-7" />
                  <div class="text-body2 text-weight-medium">工具结果</div>
                </div>
                <q-option-group
                  v-model="toolInputTypes"
                  :options="inputTypeOptions"
                  type="checkbox"
                  dense
                  class="custom-checkbox-group"
                />
                <div class="text-caption text-grey-6 q-mt-sm">
                  <q-icon name="sym_o_lightbulb" size="14px" class="q-mr-xs" />
                  部分模型支持在工具调用结果中返回图片
                </div>
              </q-card-section>
            </q-card>
          </div>
        </div>
      </q-card-section>

      <q-separator />

      <q-card-actions align="right" class="q-px-md q-py-sm">
        <q-btn
          flat
          label="取消"
          color="grey-7"
          @click="onDialogCancel"
          padding="xs md"
        />
        <q-btn
          unelevated
          label="保存"
          color="primary"
          @click="onSave"
          padding="xs md"
          icon-right="sym_o_check"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { useDialogPluginComponent, useQuasar } from 'quasar'
import { ref } from 'vue'
import { Model } from 'src/utils/types'
import { InputTypes } from 'src/config/models'

const props = defineProps<{
  modelInfo: Model
  providerId: string
  providerName: string
}>()

defineEmits([
  ...useDialogPluginComponent.emits
])

const $q = useQuasar()

// 编辑中的模型数据
const editedModel = ref<Model>({
  ...props.modelInfo,
  name: props.modelInfo.name || props.modelInfo.id
})

// 输入类型选项
const inputTypeOptions = [
  { label: '图片 (image/*)', value: 'image/*' },
  { label: '音频 (audio/*)', value: 'audio/*' },
  { label: '视频 (video/*)', value: 'video/*' },
  { label: 'PDF (application/pdf)', value: 'application/pdf' },
]

// 当前选中的输入类型
const userInputTypes = ref<string[]>([...(editedModel.value.inputTypes?.user || [])])
const assistantInputTypes = ref<string[]>([...(editedModel.value.inputTypes?.assistant || [])])
const toolInputTypes = ref<string[]>([...(editedModel.value.inputTypes?.tool || [])])

// 应用预设配置
function applyPreset(presetName: keyof typeof InputTypes) {
  const preset = InputTypes[presetName]
  userInputTypes.value = [...preset.user]
  assistantInputTypes.value = [...preset.assistant]
  toolInputTypes.value = [...preset.tool]
}

// 复制到剪贴板
function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text)
  $q.notify({
    message: '已复制到剪贴板',
    color: 'positive',
    position: 'top',
    timeout: 1000
  })
}

// 保存
function onSave() {
  const updatedModel: Model = {
    ...editedModel.value,
    inputTypes: {
      user: userInputTypes.value,
      assistant: assistantInputTypes.value,
      tool: toolInputTypes.value
    }
  }

  onDialogOK(updatedModel)
}

const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent()
</script>

<style scoped>
.cursor-pointer {
  cursor: pointer;
}

.section-title {
  display: flex;
  align-items: center;
  font-size: 15px;
  font-weight: 600;
  color: #1976d2;
  margin-bottom: 12px;
}

.info-section {
  background: var(--q-dark);
  background: rgba(0, 0, 0, 0.02);
  border-radius: 8px;
  padding: 16px;
}

.preset-btn {
  border-radius: 6px;
  text-transform: none;
  font-weight: 500;
  transition: all 0.2s;
}

.preset-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.config-card {
  border-radius: 8px;
  border: 1px solid #e0e0e0;
  transition: all 0.2s;
}

.config-card:hover {
  border-color: #1976d2;
  box-shadow: 0 2px 8px rgba(25, 118, 210, 0.1);
}

.custom-checkbox-group :deep(.q-checkbox) {
  margin-bottom: 4px;
}

.scroll-area {
  overflow-y: auto;
}

/* 滚动条样式 */
.scroll-area::-webkit-scrollbar {
  width: 6px;
}

.scroll-area::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.scroll-area::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.scroll-area::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}
</style>
