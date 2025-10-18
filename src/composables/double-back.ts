import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { ref, onMounted } from 'vue'
import { IsCapacitor, IsTauri } from 'src/utils/platform-api'
import { useI18n } from 'vue-i18n'

/**
 * Double-back detection composable
 * Implements the behavior: first back stays in chat, second back within 2s shows exit confirmation
 */
export function useDoubleBack() {
  const router = useRouter()
  const $q = useQuasar()
  const { t } = useI18n()

  // Track last back press time
  const lastBackPressTime = ref(0)
  // Track if we're in a chat view (DialogView)
  const isInChatView = ref(false)

  /**
   * Handle back press - implements double-tap logic
   */
  const handleBackPress = async () => {
    const now = Date.now()
    const timeSinceLastPress = now - lastBackPressTime.value

    // Update position in route
    const isChatRoute = router.currentRoute.value.name === 'DialogView'

    // First back press: just update the time, don't navigate
    if (timeSinceLastPress > 2000) {
      lastBackPressTime.value = now
      console.log('[useDoubleBack] First back press - staying in chat')
      return
    }

    // Second back press within 2 seconds: show exit dialog
    console.log('[useDoubleBack] Second back press detected - showing exit confirmation')
    showExitDialog()
  }

  /**
   * Show exit confirmation dialog
   */
  const showExitDialog = () => {
    $q.dialog({
      title: t('dialog.exit.title', '退出程序'),
      message: t('dialog.exit.message', '确定要退出程序吗？'),
      persistent: true,
      ok: {
        label: t('common.confirm', '确认'),
        color: 'primary'
      },
      cancel: {
        label: t('common.cancel', '取消'),
        color: 'grey-7'
      }
    }).onOk(() => {
      exitApp()
    }).onCancel(() => {
      // Reset the timer on cancel
      lastBackPressTime.value = 0
    })
  }

  /**
   * Exit the application
   */
  const exitApp = () => {
    if (IsCapacitor) {
      // For Capacitor (mobile)
      import('@capacitor/app').then(({ App }) => {
        App.exitApp()
      })
    } else if (IsTauri) {
      // For Tauri (desktop)
      import('@tauri-apps/api/window').then(({ getCurrent }) => {
        getCurrent().close()
      })
    } else {
      // For web, just show a message (can't actually exit)
      $q.notify({
        type: 'warning',
        message: t('dialog.exit.webWarning', '网页版无法退出，请关闭标签页'),
        position: 'top'
      })
    }
  }

  /**
   * Register hardware back button listener (Capacitor)
   */
  const registerHardwareBackListener = async () => {
    if (!IsCapacitor) return

    try {
      const { App } = await import('@capacitor/app')

      App.addListener('backButton', async () => {
        // Only intercept in chat view
        if (router.currentRoute.value.name === 'DialogView') {
          handleBackPress()
        } else {
          // Let default behavior happen for other routes
          router.back()
        }
      })
    } catch (error) {
      console.error('[useDoubleBack] Failed to register hardware back listener:', error)
    }
  }

  onMounted(() => {
    // Register hardware back button listener for mobile
    registerHardwareBackListener()
  })

  return {
    handleBackPress,
    showExitDialog,
    exitApp
  }
}
