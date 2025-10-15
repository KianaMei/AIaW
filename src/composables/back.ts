import { useRouter } from 'vue-router'

export function useBack(defaultTo = '/', options?: { forceNavigate?: boolean }) {
  const router = useRouter()
  return () => {
    console.log('[useBack] Called with:', { defaultTo, forceNavigate: options?.forceNavigate, hasHistory: !!history.state.back })

    // If forceNavigate is true, always navigate to defaultTo instead of using browser history
    if (options?.forceNavigate) {
      console.log('[useBack] Force navigating to:', defaultTo)
      return defaultTo && router.push(defaultTo)
    }

    // Otherwise use the original logic: browser back if available, else navigate to defaultTo
    if (history.state.back) {
      console.log('[useBack] Using browser back')
      return router.back()
    } else {
      console.log('[useBack] No history, replacing to:', defaultTo)
      return defaultTo && router.replace(defaultTo)
    }
  }
}
