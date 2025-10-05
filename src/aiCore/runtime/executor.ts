import type { ImageModelV2, LanguageModelV2, LanguageModelV2Middleware } from '@ai-sdk/provider'
import {
  experimental_generateImage as _generateImage,
  generateObject as _generateObject,
  generateText as _generateText,
  streamObject as _streamObject,
  streamText as _streamText,
  type LanguageModel
} from 'ai'

import { globalModelResolver } from '../models'
import type { RuntimeConfig, generateImageParams, generateObjectParams, generateTextParams, streamObjectParams, streamTextParams } from './types'
import { ImageGenerationError, ImageModelResolutionError } from './errors'

export class RuntimeExecutor<T extends string = string> {
  private config: RuntimeConfig<T>

  constructor(config: RuntimeConfig<T>) {
    this.config = config
  }

  private async resolveModel(modelOrId: LanguageModel, middlewares?: LanguageModelV2Middleware[]): Promise<LanguageModelV2> {
    if (typeof modelOrId === 'string') {
      return await globalModelResolver.resolveLanguageModel(
        modelOrId,
        this.config.providerId,
        this.config.providerSettings,
        middlewares
      )
    }
    return modelOrId
  }

  private async resolveImageModel(modelOrId: ImageModelV2 | string): Promise<ImageModelV2> {
    try {
      if (typeof modelOrId === 'string') {
        return await globalModelResolver.resolveImageModel(modelOrId, this.config.providerId)
      }
      return modelOrId
    } catch (error) {
      throw new ImageModelResolutionError(typeof modelOrId === 'string' ? modelOrId : modelOrId.modelId, this.config.providerId, error as Error)
    }
  }

  async streamText(
    params: streamTextParams,
    options?: { middlewares?: LanguageModelV2Middleware[] }
  ): Promise<ReturnType<typeof _streamText>> {
    const { model } = params
    const resolvedModel = await (typeof model === 'string' ? this.resolveModel(model, options?.middlewares) : Promise.resolve(model))
    return _streamText({ ...params, model: resolvedModel })
  }

  async generateText(
    params: generateTextParams,
    options?: { middlewares?: LanguageModelV2Middleware[] }
  ): Promise<ReturnType<typeof _generateText>> {
    const { model } = params
    const resolvedModel = await (typeof model === 'string' ? this.resolveModel(model, options?.middlewares) : Promise.resolve(model))
    return _generateText({ ...params, model: resolvedModel })
  }

  async generateObject(
    params: generateObjectParams,
    options?: { middlewares?: LanguageModelV2Middleware[] }
  ): Promise<ReturnType<typeof _generateObject>> {
    const { model } = params
    const resolvedModel = await (typeof model === 'string' ? this.resolveModel(model, options?.middlewares) : Promise.resolve(model))
    return _generateObject({ ...params, model: resolvedModel })
  }

  streamObject(
    params: streamObjectParams,
    options?: { middlewares?: LanguageModelV2Middleware[] }
  ): Promise<ReturnType<typeof _streamObject>> {
    const { model } = params
    return (typeof model === 'string'
      ? this.resolveModel(model, options?.middlewares).then((m) => _streamObject({ ...params, model: m }))
      : Promise.resolve(_streamObject(params)))
  }

  generateImage(params: generateImageParams): Promise<ReturnType<typeof _generateImage>> {
    try {
      const { model } = params
      return (typeof model === 'string'
        ? this.resolveImageModel(model).then((m) => _generateImage({ ...params, model: m }))
        : Promise.resolve(_generateImage(params)))
    } catch (error) {
      if (error instanceof Error) {
        const modelId = typeof params.model === 'string' ? params.model : params.model.modelId
        throw new ImageGenerationError(`Failed to generate image: ${error.message}`, this.config.providerId, modelId, error)
      }
      throw error
    }
  }

  static create<T extends string>(providerId: T, options: RuntimeConfig<T>['providerSettings']): RuntimeExecutor<T> {
    return new RuntimeExecutor({ providerId, providerSettings: options })
  }
}

export const createExecutor = RuntimeExecutor.create

