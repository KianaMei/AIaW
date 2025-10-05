import type { EmbeddingModelV2, ImageModelV2, LanguageModelV2, LanguageModelV2Middleware } from '@ai-sdk/provider'

import { globalRegistryManagement, DEFAULT_SEPARATOR } from '../providers/RegistryManagement'

export class ModelResolver {
  async resolveLanguageModel(
    modelId: string,
    fallbackProviderId: string,
    providerOptions?: any,
    middlewares?: LanguageModelV2Middleware[]
  ): Promise<LanguageModelV2> {
    let model: LanguageModelV2
    if (modelId.includes(DEFAULT_SEPARATOR)) {
      model = this.resolveNamespacedModel(modelId)
    } else {
      model = this.resolveTraditionalModel(fallbackProviderId, modelId)
    }

    if (middlewares && middlewares.length > 0) {
      // Lazy import to avoid hard dependency when not needed
      const { wrapLanguageModel } = await import('ai')
      model = wrapLanguageModel({ model, middleware: middlewares })
    }
    return model
  }

  async resolveTextEmbeddingModel(modelId: string, fallbackProviderId: string): Promise<EmbeddingModelV2<string>> {
    if (modelId.includes(DEFAULT_SEPARATOR)) return this.resolveNamespacedEmbeddingModel(modelId)
    return this.resolveTraditionalEmbeddingModel(fallbackProviderId, modelId)
  }

  async resolveImageModel(modelId: string, fallbackProviderId: string): Promise<ImageModelV2> {
    if (modelId.includes(DEFAULT_SEPARATOR)) return this.resolveNamespacedImageModel(modelId)
    return this.resolveTraditionalImageModel(fallbackProviderId, modelId)
  }

  private resolveNamespacedModel(modelId: string): LanguageModelV2 {
    return globalRegistryManagement.languageModel(modelId as any)
  }

  private resolveTraditionalModel(providerId: string, modelId: string): LanguageModelV2 {
    const fullModelId = `${providerId}${DEFAULT_SEPARATOR}${modelId}`
    return globalRegistryManagement.languageModel(fullModelId as any)
  }

  private resolveNamespacedEmbeddingModel(modelId: string): EmbeddingModelV2<string> {
    return globalRegistryManagement.textEmbeddingModel(modelId as any)
  }

  private resolveTraditionalEmbeddingModel(providerId: string, modelId: string): EmbeddingModelV2<string> {
    const fullModelId = `${providerId}${DEFAULT_SEPARATOR}${modelId}`
    return globalRegistryManagement.textEmbeddingModel(fullModelId as any)
  }

  private resolveNamespacedImageModel(modelId: string): ImageModelV2 {
    return globalRegistryManagement.imageModel(modelId as any)
  }

  private resolveTraditionalImageModel(providerId: string, modelId: string): ImageModelV2 {
    const fullModelId = `${providerId}${DEFAULT_SEPARATOR}${modelId}`
    return globalRegistryManagement.imageModel(fullModelId as any)
  }
}

export const globalModelResolver = new ModelResolver()

