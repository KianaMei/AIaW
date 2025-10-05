import type { EmbeddingModelV2, ImageModelV2, LanguageModelV2, ProviderV2 } from '@ai-sdk/provider'
import { createProviderRegistry, type ProviderRegistryProvider } from 'ai'

type PROVIDERS = Record<string, ProviderV2>

// Use ':' to match AIaW modelId convention (provider:modelId)
export const DEFAULT_SEPARATOR = ':' as const

export class RegistryManagement<SEPARATOR extends string = typeof DEFAULT_SEPARATOR> {
  private providers: PROVIDERS = {}
  private aliases: Set<string> = new Set()
  private separator: SEPARATOR
  private registry: ProviderRegistryProvider<PROVIDERS, SEPARATOR> | null = null

  constructor(options: { separator: SEPARATOR } = { separator: DEFAULT_SEPARATOR as SEPARATOR }) {
    this.separator = options.separator
  }

  registerProvider(id: string, provider: ProviderV2, aliases?: string[]): this {
    this.providers[id] = provider
    if (aliases && aliases.length) {
      aliases.forEach((alias) => {
        this.providers[alias] = provider
        this.aliases.add(alias)
      })
    }
    this.rebuildRegistry()
    return this
  }

  getProvider(id: string): ProviderV2 | undefined {
    return this.providers[id]
  }

  registerProviders(providers: Record<string, ProviderV2>): this {
    Object.assign(this.providers, providers)
    this.rebuildRegistry()
    return this
  }

  unregisterProvider(id: string): this {
    const provider = this.providers[id]
    if (!provider) return this
    if (!this.aliases.has(id)) {
      const aliasesToRemove: string[] = []
      this.aliases.forEach((alias) => {
        if (this.providers[alias] === provider) aliasesToRemove.push(alias)
      })
      aliasesToRemove.forEach((alias) => {
        delete this.providers[alias]
        this.aliases.delete(alias)
      })
    } else {
      this.aliases.delete(id)
    }
    delete this.providers[id]
    this.rebuildRegistry()
    return this
  }

  private rebuildRegistry(): void {
    if (Object.keys(this.providers).length === 0) {
      this.registry = null
      return
    }
    this.registry = createProviderRegistry<PROVIDERS, SEPARATOR>(this.providers, {
      separator: this.separator
    })
  }

  languageModel(id: `${string}${SEPARATOR}${string}`): LanguageModelV2 {
    if (!this.registry) throw new Error('No providers registered')
    return this.registry.languageModel(id)
  }

  textEmbeddingModel(id: `${string}${SEPARATOR}${string}`): EmbeddingModelV2<string> {
    if (!this.registry) throw new Error('No providers registered')
    return this.registry.textEmbeddingModel(id)
  }

  imageModel(id: `${string}${SEPARATOR}${string}`): ImageModelV2 {
    if (!this.registry) throw new Error('No providers registered')
    return this.registry.imageModel(id)
  }

  transcriptionModel(id: `${string}${SEPARATOR}${string}`): any {
    if (!this.registry) throw new Error('No providers registered')
    return this.registry.transcriptionModel(id)
  }

  speechModel(id: `${string}${SEPARATOR}${string}`): any {
    if (!this.registry) throw new Error('No providers registered')
    return this.registry.speechModel(id)
  }

  getRegisteredProviders(): string[] {
    return Object.keys(this.providers)
  }

  hasProviders(): boolean {
    return Object.keys(this.providers).length > 0
  }

  clear(): this {
    this.providers = {}
    this.aliases.clear()
    this.registry = null
    return this
  }

  resolveProviderId(id: string): string {
    if (!this.aliases.has(id)) return id
    const targetProvider = this.providers[id]
    for (const [realId, provider] of Object.entries(this.providers)) {
      if (provider === targetProvider && !this.aliases.has(realId)) return realId
    }
    return id
  }

  isAlias(id: string): boolean {
    return this.aliases.has(id)
  }

  getAllAliases(): Record<string, string> {
    const result: Record<string, string> = {}
    this.aliases.forEach((alias) => {
      result[alias] = this.resolveProviderId(alias)
    })
    return result
  }
}

export const globalRegistryManagement = new RegistryManagement()

