/* eslint-env node */

// Configuration for your app
// https://v2.quasar.dev/quasar-cli-vite/quasar-config-js

import { configure } from 'quasar/wrappers'
import { fileURLToPath } from 'node:url'
import { copyFileSync } from 'node:fs'

export default configure((ctx) => {
  return {
    boot: ['i18n', 'unocss', 'global-components', 'debug'],
    css: ['app.scss'],
    extras: ['roboto-font'],
    build: {
      target: { browser: ['es2022', 'firefox115', 'chrome115', 'safari15'], node: 'node20' },
      vueRouterMode: 'history',
      extendViteConf () {
        return { server: { watch: { ignored: ['**/src-tauri/**', '**/.venv/**', '/android/**'] } } }
      },
      afterBuild () {
        if (ctx.mode.pwa) copyFileSync('src/version.json', 'dist/pwa/version.json')
      },
      vitePlugins: [
        ['@intlify/unplugin-vue-i18n/vite', {
          ssr: ctx.modeName === 'ssr',
          include: [fileURLToPath(new URL('./src/i18n', import.meta.url))]
        }],
        ...(process.env.CI === 'true' || process.env.AIAW_CI_SKIP_LINT === '1' ? [] : [
          ['vite-plugin-checker', {
            ...(process.env.VUE_TSC_CHECK === '1' ? { vueTsc: { tsconfigPath: 'tsconfig.vue-tsc.json' } } : {}),
            eslint: { lintCommand: 'eslint --ignore-pattern "scripts/**" "./**/*.{js,ts,mjs,cjs,vue}"' }
          }, { server: false }]
        ]),
        ['unocss/vite']
      ]
    },
    devServer: { open: false, port: ctx.mode.pwa ? 9006 : 9005 },
    framework: {
      config: {},
      iconSet: 'material-symbols-outlined',
      lang: 'zh-CN',
      plugins: ['Notify', 'Dark', 'Dialog', 'Loading']
    },
    animations: [],
    ssr: { prodPort: 3000, middlewares: ['render'], pwa: false },
    pwa: { workboxMode: 'GenerateSW', extendGenerateSWOptions (cfg) { cfg.navigateFallbackDenylist = [/^\/budget\//] } },
    cordova: {},
    capacitor: { hideSplashscreen: true },
    electron: { preloadScripts: ['electron-preload'], inspectPort: 5858, bundler: 'packager', packager: {}, builder: { appId: 'aiaw' } },
    bex: { contentScripts: ['my-content-script'] }
  }
})
