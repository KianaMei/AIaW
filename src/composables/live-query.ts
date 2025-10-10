import { liveQuery, type Subscription } from 'dexie'
import { customRef, getCurrentScope, onScopeDispose, watch, type Ref, type WatchOptions } from 'vue'

type Value<T, I> = I extends undefined ? T | undefined : T | I;

type UseDexieLiveQueryWithDepsOptions<I, Immediate> = {
  onError?: (error) => void;
  initialValue?: I;
} & WatchOptions<Immediate>;

type UseDexieLiveQueryOptions<I> = {
  onError?: (error) => void;
  initialValue?: I;
};

function tryOnScopeDispose(fn: () => void) {
  if (getCurrentScope()) { onScopeDispose(fn) }
}

export function useLiveQueryWithDeps<
  T,
  I = undefined,
  Immediate extends Readonly<boolean> = true,
>(
  deps,
  querier: (...data) => T | Promise<T>,
  options: UseDexieLiveQueryWithDepsOptions<I, Immediate> = {}
): Ref<Value<T, I>> {
  const { onError, initialValue, ...rest } = options

  let subscription: Subscription | undefined
  let isMounted = true

  // Use customRef to have full control over when triggers happen
  const value = customRef<T | I | undefined>((track, trigger) => {
    let _value: T | I | undefined = initialValue

    return {
      get() {
        track()
        return _value
      },
      set(newValue) {
        // Defer trigger to next microtask; guard unmounted race conditions
        queueMicrotask(() => {
          if (!isMounted) return
          _value = newValue
          trigger()
        })
      }
    }
  })

  function start(...data) {
    subscription?.unsubscribe()

    const observable = liveQuery(() => querier(...data))

    subscription = observable.subscribe({
      next: result => {
        if (!isMounted) return
        // Defer updates to avoid patching during active unmounts/updates
        queueMicrotask(() => {
          if (isMounted) value.value = result
        })
      },
      error: error => {
        if (!isMounted) return
        queueMicrotask(() => { if (isMounted) onError?.(error) })
      }
    })
  }

  function cleanup() {
    isMounted = false
    subscription?.unsubscribe()
    subscription = undefined
  }

  watch(deps, start, { immediate: true, ...rest })

  tryOnScopeDispose(() => {
    cleanup()
  })

  return value as Ref<Value<T, I>>
}

export function useLiveQuery<
  T,
  I = undefined,
>(
  querier: () => T | Promise<T>,
  options: UseDexieLiveQueryOptions<I> = {}
): Ref<Value<T, I>> {
  const { onError, initialValue } = options

  let subscription: Subscription | undefined
  let isMounted = true

  // Use customRef to have full control over when triggers happen
  const value = customRef<T | I | undefined>((track, trigger) => {
    let _value: T | I | undefined = initialValue

    return {
      get() {
        track()
        return _value
      },
      set(newValue) {
        // Defer trigger to next microtask; guard unmounted race conditions
        queueMicrotask(() => {
          if (!isMounted) return
          _value = newValue
          trigger()
        })
      }
    }
  })

  function start() {
    subscription?.unsubscribe()

    const observable = liveQuery(querier)

    subscription = observable.subscribe({
      next: result => {
        if (!isMounted) return
        queueMicrotask(() => { if (isMounted) value.value = result })
      },
      error: error => {
        if (!isMounted) return
        queueMicrotask(() => { if (isMounted) onError?.(error) })
      }
    })
  }

  function cleanup() {
    isMounted = false
    subscription?.unsubscribe()
    subscription = undefined
  }

  start()

  tryOnScopeDispose(() => {
    cleanup()
  })

  return value as Ref<Value<T, I>>
}
