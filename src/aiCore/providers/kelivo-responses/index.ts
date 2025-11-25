import type { ProviderV2, LanguageModelV2, LanguageModelV2Middleware } from '@ai-sdk/provider'
import { customProvider, wrapLanguageModel } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { createKelivoResponsesOrchestratorMiddleware } from './orchestrator'

/**
 * Kelivo Responses Provider (P0 skeleton)
 *
 * Goals (P0):
 * - Provide a ProviderV2 that returns an OpenAI Responses model under the hood
 * - Keep behavior identical to existing path (no orchestration yet)
 * - Prepare hook points for future ToolLoop / SSE orchestration
 *
 * Important:
 * - Do NOT let downstream add duplicate middleware based on provider string
 *   We return the base responses model and rely on existing middlewares until
 *   the orchestrator is fully implemented.
 */

type KelivoResponsesOptions = any

function createBaseResponsesModel(options: KelivoResponsesOptions, modelId: string): LanguageModelV2 {
  // Reuse OpenAI provider responses mode for now; future work will replace this
  const openai = createOpenAI(options)
  const base = (openai as any).responses(modelId) as LanguageModelV2
  // Wrap with Kelivo orchestrator and existing Responses fix middleware
  const middleware: LanguageModelV2Middleware[] = [
    createKelivoResponsesOrchestratorMiddleware()
  ]
  return wrapLanguageModel({ model: base, middleware })
}

export function createKelivoResponsesProvider(options: KelivoResponsesOptions): ProviderV2 {
  // Build a custom provider with only languageModel implemented for now
  const provider = customProvider({
    fallbackProvider: {
      languageModel: (modelId: string) => {
        const model = createBaseResponsesModel(options, modelId)
        // P0: keep the model untouched; later we will wrap with orchestration middleware
        return model
      }
    }
  })

  return provider
}

export default createKelivoResponsesProvider
