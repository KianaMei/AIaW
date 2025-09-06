import { liveQuery, type Subscription } from 'dexie'
import { shallowRef, getCurrentScope, onScopeDispose, watch, type ShallowRef, type WatchOptions } from 'vue'

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
): ShallowRef<Value<T, I>> {
  const { onError, initialValue, ...rest } = options

  const value = shallowRef<T | I | undefined>(initialValue)

  let subscription: Subscription | undefined

  function start(...data) {
    subscription?.unsubscribe()

    const observable = liveQuery(() => querier(...data))

    subscription = observable.subscribe({
      next: result => {
        value.value = result
      },
      error: error => {
        onError?.(error)
      }
    })
  }

  function cleanup() {
    subscription?.unsubscribe()

    // Set to undefined to avoid calling unsubscribe multiple times on a same subscription
    subscription = undefined
  }

  watch(deps, start, { immediate: true, ...rest })

  tryOnScopeDispose(() => {
    cleanup()
  })

  return value as ShallowRef<Value<T, I>>
}

export function useLiveQuery<
  T,
  I = undefined,
>(
  querier: () => T | Promise<T>,
  options: UseDexieLiveQueryOptions<I> = {}
): ShallowRef<Value<T, I>> {
  const { onError, initialValue } = options

  const value = shallowRef<T | I | undefined>(initialValue)

  let subscription: Subscription | undefined

  function start() {
    subscription?.unsubscribe()

    const observable = liveQuery(querier)

    subscription = observable.subscribe({
      next: result => {
        value.value = result
      },
      error: error => {
        onError?.(error)
      }
    })
  }

  function cleanup() {
    subscription?.unsubscribe()

    // Set to undefined to avoid calling unsubscribe multiple times on a same subscription
    subscription = undefined
  }

  start()

  tryOnScopeDispose(() => {
    cleanup()
  })

  return value as ShallowRef<Value<T, I>>
}
