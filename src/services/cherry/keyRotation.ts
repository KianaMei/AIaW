/**
 * Simple multi-key rotation (provider+model granularity) using localStorage.
 * Format: comma-separated apiKey string.
 */
export function getRotatedApiKey(providerId: string, apiKey?: string, modelId?: string): string | undefined {
  if (!apiKey) return apiKey
  const keys = apiKey.split(',').map((k) => k.trim()).filter(Boolean)
  if (keys.length <= 1) return keys[0]
  const storageKey = `provider:${providerId}:${modelId || '*'}:last_used_key`
  try {
    const lastUsed = localStorage.getItem(storageKey)
    const currentIndex = lastUsed ? keys.indexOf(lastUsed) : -1
    const nextIndex = (currentIndex + 1) % keys.length
    const nextKey = keys[nextIndex]
    localStorage.setItem(storageKey, nextKey)
    return nextKey
  } catch {
    return keys[0]
  }
}

