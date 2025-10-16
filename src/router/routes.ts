import { RouteRecordRaw } from 'vue-router'
import { DexieDBURL, LitellmBaseURL } from 'src/utils/config'
import { i18n } from 'src/boot/i18n'

const { t } = i18n.global

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      {
        path: '/workspaces/:workspaceId/',
        component: () => import('src/pages/WorkspacePage.vue'),
        props: route => ({ id: route.params.workspaceId }),
        children: [
          { path: '', component: () => import('src/views/WorkspaceIndex.vue') },
          { path: 'settings', component: () => import('src/views/WorkspaceSettings.vue') },
          { path: 'dialogs/:dialogId', component: () => import('src/views/DialogView.vue'), props: route => ({ id: route.params.dialogId }) },
          { path: 'assistants/:assistantId', component: () => import('src/views/AssistantView.vue'), props: route => ({ id: route.params.assistantId }) },
          {
            path: 'assistants/:assistantId/plugins/:pluginId',
            component: () => import('src/views/PluginAdjust.vue'),
            props: route => ({ id: route.params.pluginId, assistantId: route.params.assistantId })
          }
        ]
      },
      {
        path: '/settings/',
        component: () => import('src/pages/SettingsPage.vue'),
        children: [
          { path: '', component: () => import('src/views/SettingsView.vue'), meta: { title: t('routes.settings') } },
          { path: 'shortcut-keys', component: () => import('src/views/ShortcutKeys.vue'), meta: { title: t('routes.shortcutKeys') } },
          { path: 'providers/:id', component: () => import('src/views/ProviderSettingV2.vue'), props: true }
        ]
      },
      {
        path: '/plugins/',
        component: () => import('src/pages/PluginsPage.vue'),
        children: [
          { path: '', component: () => import('src/views/PluginsMarket.vue'), meta: { title: t('routes.pluginsMarket') } },
          { path: ':pluginId', component: () => import('src/views/PluginSettings.vue'), props: route => ({ id: route.params.pluginId }) }
        ]
      },
      {
        path: '/assistants/',
        component: () => import('src/pages/AssistantsPage.vue'),
        children: [
          { path: '', component: () => import('src/views/AssistantsMarket.vue'), meta: { title: t('routes.assistantsMarket') } },
          { path: ':assistantId', component: () => import('src/views/AssistantView.vue'), props: route => ({ id: route.params.assistantId }) },
          {
            path: ':assistantId/plugins/:pluginId',
            component: () => import('src/views/PluginAdjust.vue'),
            props: route => ({ id: route.params.pluginId, assistantId: route.params.assistantId })
          }
        ]
      },
      { path: '/set-provider', component: () => import('src/pages/SetProvider.vue') },
      ...(DexieDBURL ? [
        { path: '/account', component: () => import('src/pages/AccountPage.vue'), meta: { title: t('routes.account') } }
      ] : []),
      ...(DexieDBURL && LitellmBaseURL ? [
        { path: '/model-pricing', component: () => import('src/pages/ModelPricing.vue'), meta: { title: t('routes.modelPricing') } }
      ] : []),
      { path: '/', component: () => import('src/pages/EmptyPage.vue') },

      // Always leave this as last one,
      // but you can also remove it
      {
        path: '/:catchAll(.*)*',
        component: () => import('pages/ErrorNotFound.vue'),
        props: {
          drawerToggle: true,
          timeout: 0
        }
      }
    ]
  }
]

export default routes

