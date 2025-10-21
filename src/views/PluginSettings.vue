<template>
  <view-common-header
    @toggle-drawer="$emit('toggle-drawer')"
    back-to="."
  >
    <q-toolbar-title>
      {{ $t('pluginSettings.title') }}
    </q-toolbar-title>
  </view-common-header>
  <q-page-container v-if="plugin">
    <q-page
      bg-sur
      pb-2
    >
      <q-list v-if="pluginsStore.ready">
        <q-item-label header>
          {{ $t('pluginSettings.info') }}
        </q-item-label>
        <q-item>
          <q-item-section>{{ $t('pluginSettings.name') }}</q-item-section>
          <q-item-section side>
            {{ plugin.title }}
          </q-item-section>
        </q-item>
        <q-item>
          <q-item-section min-w="fit">
            {{ $t('pluginSettings.description') }}
          </q-item-section>
          <q-item-section side>
            <q-item-label caption>
              {{ plugin.description }}
            </q-item-label>
          </q-item-section>
        </q-item>
        <q-item v-if="plugin.author">
          <q-item-section>{{ $t('pluginSettings.author') }}</q-item-section>
          <q-item-section side>
            {{ plugin.author }}
          </q-item-section>
        </q-item>
        <q-item v-if="plugin.homepage">
          <q-item-section>{{ $t('pluginSettings.homepage') }}</q-item-section>
          <q-item-section side>
            <a
              pri-link
              :href="plugin.homepage"
              target="_blank"
            >
              {{ plugin.homepage }}
            </a>
          </q-item-section>
        </q-item>
        <q-item
          clickable
          @click="pickAvatar"
        >
          <q-item-section>{{ $t('pluginSettings.icon') }}</q-item-section>
          <q-item-section
            side
            text-on-sur
          >
            <a-avatar :avatar="data[id].avatar" />
          </q-item-section>
        </q-item>
        <template v-if="plugin.fileparsers.length">
          <q-separator spaced />
          <q-item>
            <q-item-section text-sec>
              {{ $t('pluginSettings.fileParsing') }}
            </q-item-section>
            <q-item-section side>
              <div>
                {{ $t('pluginSettings.enable') }}
              </div>
            </q-item-section>
          </q-item>
          <q-item
            v-for="fp of plugin.fileparsers"
            :key="fp.name"
          >
            <q-item-section avatar>
              <q-item-label>{{ fp.name }}</q-item-label>
              <q-item-label caption>
                {{ fp.description }}
              </q-item-label>
            </q-item-section>
            <q-item-section items-end>
              <list-input
                :label="$t('pluginSettings.mimeType')"
                class="xs:w-200px sm:w-250px"
                filled
                dense
                v-model="data[id].fileparsers[fp.name].mimeTypes"
                new-value-mode="add-unique"
              />
            </q-item-section>
            <q-item-section side>
              <q-checkbox v-model="data[id].fileparsers[fp.name].enabled" />
            </q-item-section>
          </q-item>
        </template>
        <q-separator spaced />
        <q-item-label header>
          {{ $t('pluginSettings.settings') }}
        </q-item-label>
        <json-input
          :schema="plugin.settings"
          v-model="data[id].settings"
          component="item"
          lazy
        />

        <!-- APIs overview: show Tools and Info Providers (MCP/others) -->
        <template v-if="plugin.apis?.length">
          <q-separator spaced />
          <!-- Filter -->
          <q-item>
            <q-item-section>{{ $t('pluginsMarket.search') }}</q-item-section>
            <q-item-section side class="xs:w-200px sm:w-300px">
              <q-input
                v-model="apiFilter"
                dense
                clearable
                standout
                :placeholder="$t('pluginsMarket.search')"
                input-class="text-body2"
              />
            </q-item-section>
          </q-item>

          <q-item-label header>
            {{ $t('pluginAdjust.toolCall') }} ({{ filteredToolApis.length }})
          </q-item-label>
          <q-expansion-item
            v-for="api in filteredToolApis"
            :key="api.name"
            expand-separator
            dense
            :label="api.name"
            :caption="api.description"
          >
            <q-list separator>
              <q-item v-if="schemaProps(api).length === 0">
                <q-item-section>
                  <q-item-label caption>-</q-item-label>
                </q-item-section>
              </q-item>
              <q-item v-for="p in schemaProps(api)" :key="p.key">
                <q-item-section avatar>
                  <code>{{ p.key }}</code>
                </q-item-section>
                <q-item-section>
                  <q-item-label>{{ p.title }}</q-item-label>
                  <q-item-label caption>{{ p.description }}</q-item-label>
                </q-item-section>
                <q-item-section side class="row items-center q-gutter-sm">
                  <q-chip size="sm" outline color="primary">{{ p.type }}</q-chip>
                  <q-badge v-if="p.required" color="negative" label="required" />
                  <q-badge v-else color="grey" label="optional" />
                </q-item-section>
              </q-item>
            </q-list>
          </q-expansion-item>

          <template v-if="infoApis.length">
            <q-separator spaced />
            <q-item-label header>
              {{ $t('pluginAdjust.infoProvider') }} ({{ filteredInfoApis.length }})
            </q-item-label>
            <q-expansion-item
              v-for="api in filteredInfoApis"
              :key="api.name"
              expand-separator
              dense
              :label="api.name"
              :caption="api.description"
            >
              <q-list separator>
                <q-item v-if="schemaProps(api).length === 0">
                  <q-item-section>
                    <q-item-label caption>-</q-item-label>
                  </q-item-section>
                </q-item>
                <q-item v-for="p in schemaProps(api)" :key="p.key">
                  <q-item-section avatar>
                    <code>{{ p.key }}</code>
                  </q-item-section>
                  <q-item-section>
                    <q-item-label>{{ p.title }}</q-item-label>
                    <q-item-label caption>{{ p.description }}</q-item-label>
                  </q-item-section>
                  <q-item-section side class="row items-center q-gutter-sm">
                    <q-chip size="sm" outline color="primary">{{ p.type }}</q-chip>
                    <q-badge v-if="p.required" color="negative" label="required" />
                    <q-badge v-else color="grey" label="optional" />
                  </q-item-section>
                </q-item>
              </q-list>
            </q-expansion-item>
          </template>
        </template>
      </q-list>
    </q-page>
  </q-page-container>
  <error-not-found v-else />
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { usePluginsStore } from 'src/stores/plugins'
import ViewCommonHeader from 'src/components/ViewCommonHeader.vue'
import AAvatar from 'src/components/AAvatar.vue'
import { useQuasar } from 'quasar'
import PickAvatarDialog from 'src/components/PickAvatarDialog.vue'
import ErrorNotFound from 'src/pages/ErrorNotFound.vue'
import ListInput from 'src/components/ListInput.vue'
import JsonInput from 'src/components/JsonInput.vue'
import { useSetTitle } from 'src/composables/set-title'

const props = defineProps<{
  id: string
}>()

defineEmits(['toggle-drawer'])

const pluginsStore = usePluginsStore()
const { data } = pluginsStore

const plugin = computed(() => pluginsStore.plugins.find(p => p.id === props.id))

const $q = useQuasar()
function pickAvatar() {
  $q.dialog({
    component: PickAvatarDialog,
    componentProps: {
      model: data[props.id].avatar,
      defaultTab: 'icon'
    }
  }).onOk(avatar => {
    data[props.id].avatar = avatar
  })
}

import { useI18n } from 'vue-i18n'
const { t } = useI18n()
useSetTitle(computed(() => plugin.value && `${t('pluginSettings.title')} - ${plugin.value.title}`))

// Derived API lists (tools / info)
const toolApis = computed(() => (plugin.value?.apis || []).filter(a => a.type === 'tool'))
const infoApis = computed(() => (plugin.value?.apis || []).filter(a => a.type === 'info'))

// Filtering
const apiFilter = ref('')
const matches = (api: any) => {
  const f = apiFilter.value?.toLowerCase().trim()
  if (!f) return true
  return (
    (api.name || '').toLowerCase().includes(f) ||
    (api.description || '').toLowerCase().includes(f)
  )
}
const filteredToolApis = computed(() => toolApis.value.filter(matches))
const filteredInfoApis = computed(() => infoApis.value.filter(matches))

// Extract a readable list from PluginSchema
function schemaProps(api: any) {
  const s = api?.parameters || {}
  const req = new Set((s.required || []) as string[])
  const props = s.properties || {}
  return Object.entries(props).map(([key, val]: [string, any]) => ({
    key,
    title: val?.title || key,
    type: val?.type || (val?.anyOf ? 'anyOf' : val?.oneOf ? 'oneOf' : 'object'),
    description: val?.description,
    required: req.has(key)
  }))
}
</script>
