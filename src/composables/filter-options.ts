import { MaybeRef, ref, unref } from 'vue'

type AnyOption = string | Record<string, any>

interface FilterConfig {
  optionLabel?: string
  groupKey?: string // key to nested options for grouped lists (e.g., 'options')
}

export function useFilterOptions(options: MaybeRef<AnyOption[]>, config: FilterConfig = {}) {
  const filteredOptions = ref<AnyOption[]>([])
  const optionLabel = config.optionLabel ?? 'label'
  const groupKey = config.groupKey ?? 'options'

  function toLabel(v: AnyOption): string {
    if (typeof v === 'string') return v
    const lbl = v?.[optionLabel]
    return typeof lbl === 'string' ? lbl : String(lbl ?? '')
  }

  function filterList(list: AnyOption[], q: string): AnyOption[] {
    // strings only
    if (!list || list.length === 0) return []
    const lower = q.toLowerCase()

    return list.map(item => {
      if (typeof item === 'string') {
        return item
      }
      // grouped
      const children = Array.isArray(item?.[groupKey]) ? (item[groupKey] as AnyOption[]) : undefined
      if (children) {
        const filteredChildren = filterList(children, q)
        if (filteredChildren.length > 0) {
          return { ...item, [groupKey]: filteredChildren }
        }
        return null
      }
      // leaf object option
      const lbl = toLabel(item)
      return lbl.toLowerCase().includes(lower) ? item : null
    }).filter(Boolean) as AnyOption[]
  }

  function filterFn(val, update, abort) {
    if (!val) {
      // when no query, show full list to keep UX consistent with QSelect
      update(() => { filteredOptions.value = unref(options) as AnyOption[] })
      return
    }
    update(() => {
      const list = unref(options) as AnyOption[]
      filteredOptions.value = filterList(list, val)
    })
  }

  // initialize with whole list
  filteredOptions.value = unref(options) as AnyOption[]

  return {
    filteredOptions,
    filterFn
  }
}
